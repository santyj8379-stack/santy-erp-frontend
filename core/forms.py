from django import forms
from django.contrib.auth.models import User, Group
from django.contrib.auth.forms import UserChangeForm # We only need the Change form

# Define our new "Role" choices
ROLE_CHOICES = (
    ('normal_user', 'Normal User'),
    ('admin', 'Admin'),
    ('super_admin', 'Super Admin'),
)

# We have DELETED the broken CustomUserCreationForm

class CustomUserChangeForm(UserChangeForm):
    # Add our "Role" field to the user editing form
    role = forms.ChoiceField(choices=ROLE_CHOICES, required=False)

    class Meta(UserChangeForm.Meta):
        model = User
        fields = '__all__' # This form is fine

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # This part reads the user's current group and sets the dropdown
        if self.instance.pk:
            if self.instance.is_superuser:
                self.fields['role'].initial = 'super_admin'
            elif self.instance.groups.filter(name='Admin').exists():
                self.fields['role'].initial = 'admin'
            elif self.instance.groups.filter(name='Normal User').exists():
                self.fields['role'].initial = 'normal_user'
            else:
                self.fields['role'].initial = 'normal_user'