from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('upload-excel/', views.upload_excel, name='upload_excel'),
    path('search/', views.global_search, name='global_search'),
    path('reports/trial-balance/', views.trial_balance, name='trial_balance'),
    path('reports/ledger/<uuid:ledger_id>/', views.ledger_statement, name='ledger_statement'),

    # --- NEW: Voucher Detail View ---
    path('voucher/<uuid:voucher_id>/', views.voucher_detail, name='voucher_detail'),
    # ... existing urls ...
    path('voucher/<uuid:voucher_id>/', views.voucher_detail, name='voucher_detail'),
    
    # --- NEW: PDF Path ---
    path('voucher/<uuid:voucher_id>/pdf/', views.voucher_pdf, name='voucher_pdf'),
]