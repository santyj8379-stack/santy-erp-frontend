import uuid
from django.db import models
from django.contrib.auth.models import User

# --- 1. Our Abstract Base Model (Updated) ---
class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # [FUTURE PROOFING]
    # This ID links back to the original Tally/Excel row.
    # unique=True ensures we never import the same transaction twice.
    tally_guid = models.CharField(max_length=100, null=True, blank=True, unique=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

# --- 2. Core Domain Models ---

class MstGroup(BaseModel):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    is_primary = models.BooleanField(default=False)
    def __str__(self): return self.name

class MstLedger(BaseModel):
    parent = models.ForeignKey(MstGroup, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    is_debit = models.BooleanField(default=True)
    def __str__(self): return self.name

class MstUom(BaseModel):
    symbol = models.CharField(max_length=10)
    formal_name = models.CharField(max_length=100)
    def __str__(self): return self.symbol

class MstStockGroup(BaseModel):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    def __str__(self): return self.name

class MstStockItem(BaseModel):
    name = models.CharField(max_length=255)
    group = models.ForeignKey(MstStockGroup, on_delete=models.PROTECT)
    uom = models.ForeignKey(MstUom, on_delete=models.PROTECT)
    opening_balance_qty = models.DecimalField(max_digits=15, decimal_places=0, default=0)
    opening_balance_rate = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    opening_balance_val = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    def __str__(self): return self.name

class MstVoucherType(BaseModel):
    name = models.CharField(max_length=100)
    parent_name = models.CharField(max_length=100, blank=True)
    def __str__(self): return self.name

class TrnVoucher(BaseModel):
    date = models.DateField()
    voucher_number = models.CharField(max_length=100)
    vouchertype = models.ForeignKey(MstVoucherType, on_delete=models.PROTECT)
    party_ledger = models.ForeignKey(MstLedger, on_delete=models.PROTECT)
    narration = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    def __str__(self): return f"{self.voucher_number} - {self.date}"

class TrnAccounting(BaseModel):
    voucher = models.ForeignKey(TrnVoucher, on_delete=models.CASCADE)
    ledger = models.ForeignKey(MstLedger, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    is_debit = models.BooleanField()
    def __str__(self): return f"{self.ledger.name} - {self.amount}"

class TrnInventory(BaseModel):
    voucher = models.ForeignKey(TrnVoucher, on_delete=models.CASCADE)
    stock_item = models.ForeignKey(MstStockItem, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=15, decimal_places=0)
    rate = models.DecimalField(max_digits=15, decimal_places=2)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    is_inwards = models.BooleanField()
    def __str__(self): return f"{self.stock_item.name} - {self.quantity}"

# --- 3. The Catch-All Custom Field Model ---
class CustomField(BaseModel):
    # e.g., "Truck Number", "Dispatch ID", "Cheque No"
    field_key = models.CharField(max_length=100)
    
    # e.g., "MH-12-9999", "DSP/001", "556677"
    field_value = models.CharField(max_length=255)

    # Generic Link to ANY table (Ledger, Voucher, Item)
    parent_id = models.UUIDField()
    parent_type = models.CharField(max_length=100) # e.g., "TrnVoucher" or "MstLedger"

    def __str__(self):
        return f"{self.field_key}: {self.field_value}"