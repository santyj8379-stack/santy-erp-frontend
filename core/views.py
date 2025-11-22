from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db.models import Sum, Q, Count
from .models import MstLedger, MstGroup, MstVoucherType, TrnVoucher, TrnAccounting, CustomField
from .utils import render_to_pdf
import pandas as pd
import io
from datetime import datetime

# --- 1. Dashboard View (Updated with Analytics) ---
def dashboard(request):
    # A. Summary Stats
    total_vouchers = TrnVoucher.objects.count()
    
    # Calculate total money moved (Sum of all accounting entries)
    total_volume = TrnAccounting.objects.aggregate(Sum('amount'))['amount__sum'] or 0
    
    # B. Pie Chart Data: Vouchers by Type
    # This counts how many of each type exist (e.g., {'Receipt': 5, 'Payment': 2})
    voucher_counts = TrnVoucher.objects.values('vouchertype__name').annotate(count=Count('id'))
    
    # Prepare lists for Chart.js
    chart_labels = [item['vouchertype__name'] for item in voucher_counts]
    chart_data = [item['count'] for item in voucher_counts]

    # C. Recent Activity (Last 5 Vouchers)
    recent_vouchers = TrnVoucher.objects.all().order_by('-created_at')[:5]

    context = {
        'total_vouchers': total_vouchers,
        'total_volume': total_volume,
        'chart_labels': chart_labels,
        'chart_data': chart_data,
        'recent_vouchers': recent_vouchers
    }
    return render(request, 'dashboard.html', context)

# --- 2. Excel Import Wizard ---
def upload_excel(request):
    TALLY_TRANSACTION_FIELDS = [
        'Date', 'Voucher Type', 'Voucher No', 'Ledger Name', 'Amount', 'Dr/Cr'
    ]

    if request.method == 'POST':
        # STEP A: User Uploads File
        if 'file' in request.FILES:
            excel_file = request.FILES['file']
            if excel_file.name.endswith('.csv'):
                df = pd.read_csv(excel_file)
            else:
                df = pd.read_excel(excel_file)

            # Clean columns and save to session
            df.columns = df.columns.str.strip()
            request.session['import_data'] = df.to_json()
            
            context = {
                'db_fields': TALLY_TRANSACTION_FIELDS,
                'file_columns': list(df.columns)
            }
            return render(request, 'map_columns.html', context)

        # STEP B: User Maps Columns & Confirms
        elif 'mapping' in request.POST:
            import_data_json = request.session.get('import_data')
            if not import_data_json:
                messages.error(request, "Session expired. Please upload file again.")
                return redirect('upload_excel')

            # FIX: Wrap the string in StringIO to silence the FutureWarning
            df = pd.read_json(io.StringIO(import_data_json))
            success_count = 0
            
            try:
                # 1. Get Field Mappings
                map_date = request.POST.get('Date')
                map_vtype = request.POST.get('Voucher Type')
                map_vno = request.POST.get('Voucher No')
                map_ledger = request.POST.get('Ledger Name')
                map_amount = request.POST.get('Amount')
                map_drcr = request.POST.get('Dr/Cr')

                # Define columns that should NOT be treated as custom fields
                mapped_cols = [map_date, map_vtype, map_vno, map_ledger, map_amount, map_drcr]

                # Ensure default group exists
                default_group, _ = MstGroup.objects.get_or_create(name="Primary")

                for index, row in df.iterrows():
                    # 2. Parse Date
                    date_str = str(row[map_date])
                    try:
                        # Attempt various date formats
                        for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d', '%d/%m/%Y'):
                            try:
                                voucher_date = datetime.strptime(date_str, fmt).date()
                                break
                            except ValueError:
                                continue
                        else:
                            voucher_date = datetime.now().date() # Fallback
                    except:
                        voucher_date = datetime.now().date()

                    # 3. Create Masters (Voucher Type & Ledger)
                    v_type_name = str(row[map_vtype]).strip()
                    vch_type_obj, _ = MstVoucherType.objects.get_or_create(name=v_type_name)

                    ledger_name = str(row[map_ledger]).strip()
                    ledger_obj, _ = MstLedger.objects.get_or_create(
                        name=ledger_name,
                        defaults={'parent': default_group, 'is_debit': True}
                    )

                    # 4. Create Voucher Header
                    voucher_no = str(row[map_vno])
                    tally_guid_val = f"{voucher_no}_{index}" # Simple Unique ID

                    voucher_obj, created = TrnVoucher.objects.get_or_create(
                        voucher_number=voucher_no,
                        defaults={
                            'date': voucher_date,
                            'vouchertype': vch_type_obj,
                            'party_ledger': ledger_obj, # Placeholder party
                            'tally_guid': tally_guid_val,
                            'narration': "Imported via Wizard"
                        }
                    )

                    # 5. Create Accounting Entry
                    try:
                        amount = float(row[map_amount])
                    except:
                        amount = 0.0
                        
                    drcr_type = str(row[map_drcr]).lower()
                    is_debit_bool = True if 'dr' in drcr_type else False

                    TrnAccounting.objects.create(
                        voucher=voucher_obj,
                        ledger=ledger_obj,
                        amount=amount,
                        is_debit=is_debit_bool,
                        tally_guid=f"{tally_guid_val}_acc"
                    )

                    # 6. Handle Custom Fields (Fixed to prevent duplicates)
                    for col_name in df.columns:
                        if col_name not in mapped_cols:
                            val = str(row[col_name]).strip()
                            if val and val.lower() not in ['nan', 'none', '']:
                                # FIX: Use get_or_create instead of create
                                CustomField.objects.get_or_create(
                                    field_key=col_name,
                                    field_value=val,
                                    parent_id=voucher_obj.id,
                                    parent_type="TrnVoucher"
                                )

                    success_count += 1

                messages.success(request, f"Successfully imported {success_count} transactions!")
                return redirect('dashboard')

            except Exception as e:
                # PRINT ERROR TO TERMINAL FOR DEBUGGING
                print(f"\n❌ IMPORT ERROR: {str(e)}\n") 
                messages.error(request, f"Import Failed: {str(e)}")
                return redirect('upload_excel')

    return render(request, 'upload_excel.html')

# --- 3. Reports: Trial Balance ---
def trial_balance(request):
    ledgers = MstLedger.objects.all()
    report_data = []
    total_debit = 0
    total_credit = 0

    for ledger in ledgers:
        entries = TrnAccounting.objects.filter(ledger=ledger)
        debit_sum = entries.filter(is_debit=True).aggregate(Sum('amount'))['amount__sum'] or 0
        credit_sum = entries.filter(is_debit=False).aggregate(Sum('amount'))['amount__sum'] or 0
        
        if debit_sum > 0 or credit_sum > 0:
            report_data.append({
                'ledger_id': ledger.id,
                'ledger_name': ledger.name,
                'debit': debit_sum,
                'credit': credit_sum
            })
            total_debit += debit_sum
            total_credit += credit_sum

    context = {
        'data': report_data,
        'total_debit': total_debit,
        'total_credit': total_credit,
        'is_balanced': total_debit == total_credit
    }
    return render(request, 'trial_balance.html', context)

# --- 4. Reports: Ledger Statement ---
def ledger_statement(request, ledger_id):
    # 1. Get the Ledger Object (or 404 if not found)
    ledger = get_object_or_404(MstLedger, id=ledger_id)
    
    # 2. Get all transactions for this ledger, sorted by date
    # select_related optimizes the query to fetch Voucher details in one go
    entries = TrnAccounting.objects.filter(ledger=ledger).select_related('voucher', 'voucher__vouchertype').order_by('voucher__date')

    statement_data = []
    running_balance = 0

    for entry in entries:
        # Determine Dr/Cr columns
        debit_amount = entry.amount if entry.is_debit else 0
        credit_amount = entry.amount if not entry.is_debit else 0

        # Calculate Running Balance
        # Logic: Debit adds to balance, Credit subtracts (Simplified view)
        running_balance += (debit_amount - credit_amount)

        statement_data.append({
            'id': entry.voucher.id,
            'date': entry.voucher.date,
            'voucher_no': entry.voucher.voucher_number,
            'voucher_type': entry.voucher.vouchertype.name,
            'narration': entry.voucher.narration, # Captured from Tally/Excel
            'debit': debit_amount,
            'credit': credit_amount,
            'balance': running_balance
        })

    context = {
        'ledger': ledger,
        'entries': statement_data,
        'closing_balance': running_balance
    }
    return render(request, 'ledger_statement.html', context)

# --- 5. Global Search (Fixed) ---
def global_search(request):
    query = request.GET.get('q', '').strip()
    results = []
    
    if query:
        # 1. Find Voucher IDs from DIRECT MATCHES (Number, Narration)
        # We use set() to automatically handle duplicates
        matched_ids = set(TrnVoucher.objects.filter(
            Q(voucher_number__icontains=query) | 
            Q(narration__icontains=query)
        ).values_list('id', flat=True))

        # 2. Find Voucher IDs from AMOUNT matches
        try:
            amount_val = float(query)
            amount_ids = TrnAccounting.objects.filter(amount=amount_val).values_list('voucher_id', flat=True)
            matched_ids.update(amount_ids)
        except ValueError:
            pass

        # 3. Find Voucher IDs from LEDGER NAME matches
        ledger_ids = TrnAccounting.objects.filter(ledger__name__icontains=query).values_list('voucher_id', flat=True)
        matched_ids.update(ledger_ids)

        # 4. Find Voucher IDs from CUSTOM FIELDS (Truck No, GSTIN, etc.)
        custom_ids = CustomField.objects.filter(
            field_value__icontains=query,
            parent_type='TrnVoucher'
        ).values_list('parent_id', flat=True)
        
        # Ensure UUIDs are converted to strings for matching if necessary, 
        # but Django usually handles UUID matching fine.
        matched_ids.update(custom_ids)

        # 5. FETCH FINAL RESULTS
        # Now we do ONE clean query to get the actual objects sorted by date
        results = TrnVoucher.objects.filter(id__in=list(matched_ids)).order_by('-date')

    context = {
        'query': query,
        'results': results
    }
    return render(request, 'search_results.html', context)

# --- 6. Voucher Detail View (Updated with Total Calculation) ---
def voucher_detail(request, voucher_id):
    voucher = get_object_or_404(TrnVoucher, id=voucher_id)
    entries = TrnAccounting.objects.filter(voucher=voucher)
    
    # Calculate Total Logic: Sum of all Debits
    total_amount = entries.filter(is_debit=True).aggregate(Sum('amount'))['amount__sum'] or 0
    
    custom_fields = CustomField.objects.filter(parent_id=voucher.id, parent_type='TrnVoucher')

    context = {
        'voucher': voucher,
        'entries': entries,
        'custom_fields': custom_fields,
        'total_amount': total_amount  # <--- Passing the calculated total
    }
    return render(request, 'voucher_detail.html', context)

# --- 7. PDF Download View (Updated with Total Calculation) ---
def voucher_pdf(request, voucher_id):
    voucher = get_object_or_404(TrnVoucher, id=voucher_id)
    entries = TrnAccounting.objects.filter(voucher=voucher)
    
    # Calculate Total Logic: Sum of all Debits
    total_amount = entries.filter(is_debit=True).aggregate(Sum('amount'))['amount__sum'] or 0
    
    custom_fields = CustomField.objects.filter(parent_id=voucher.id, parent_type='TrnVoucher')

    context = {
        'voucher': voucher,
        'entries': entries,
        'custom_fields': custom_fields,
        'is_pdf': True,
        'total_amount': total_amount # <--- Passing the calculated total
    }
    
    return render_to_pdf('voucher_detail.html', context)