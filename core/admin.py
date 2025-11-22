from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User, Group

# Import ONLY our custom CHANGE form
from .forms import CustomUserChangeForm 

# Import our models
from .models import (
    MstGroup, MstLedger, MstUom, MstStockGroup, MstStockItem,
    MstVoucherType, TrnVoucher, TrnAccounting, TrnInventory,
    CustomField
)

# --- 1. Define the New Custom User Admin ---
class CustomUserAdmin(UserAdmin):
    # Use the default "add" form
    # Use our custom "change" form
    form = CustomUserChangeForm
    
    # Fieldset for the "Change user" page (add 'role')
    fieldsets = (
        (None, {'fields': ('username', 'password', 'role')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    # This logic runs when we SAVE the "Change" page
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        
        role = form.cleaned_data.get('role')

        if role:
            obj.groups.clear()
            
            if role == 'super_admin':
                obj.is_staff = True
                obj.is_superuser = True
            elif role == 'admin':
                obj.is_staff = True
                obj.is_superuser = False
                admin_group, _ = Group.objects.get_or_create(name='Admin')
                obj.groups.add(admin_group)
            elif role == 'normal_user':
                obj.is_staff = True
                obj.is_superuser = False
                user_group, _ = Group.objects.get_or_create(name='Normal User')
                obj.groups.add(user_group)
            
            obj.save()


# --- (The rest of the file is the same as before) ---
class BaseAdmin(admin.ModelAdmin):
    readonly_fields = ('id', 'created_at', 'created_by')
    
    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

class TrnAccountingInline(admin.TabularInline):
    model = TrnAccounting
    fields = ['ledger', 'amount', 'is_debit'] 
    extra = 1 

class TrnInventoryInline(admin.TabularInline):
    model = TrnInventory
    fields = ['stock_item', 'quantity', 'rate', 'amount', 'is_inwards']
    extra = 1

class TrnVoucherAdmin(BaseAdmin):
    list_display = ('voucher_number', 'date', 'party_ledger', 'total_amount', 'created_at', 'created_by')
    inlines = [
        TrnAccountingInline,
        TrnInventoryInline,
    ]

class MstLedgerAdmin(BaseAdmin):
    list_display = ('name', 'parent', 'opening_balance', 'created_by')
    search_fields = ('name', 'parent__name')
    list_filter = ('parent',)

class MstStockItemAdmin(BaseAdmin):
    list_display = ('name', 'group', 'uom', 'opening_balance_qty', 'created_by')
    search_fields = ('name', 'group__name')
    list_filter = ('group', 'uom')

# --- Unregister the default User admin and register our new one ---
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

# Register all our other models
admin.site.register(MstGroup, BaseAdmin)
admin.site.register(MstLedger, MstLedgerAdmin)
admin.site.register(MstUom, BaseAdmin)
admin.site.register(MstStockGroup, BaseAdmin)
admin.site.register(MstStockItem, MstStockItemAdmin)
admin.site.register(MstVoucherType, BaseAdmin)
admin.site.register(TrnAccounting, BaseAdmin)
admin.site.register(TrnInventory, BaseAdmin)
admin.site.register(TrnVoucher, TrnVoucherAdmin)
admin.site.register(CustomField, BaseAdmin)