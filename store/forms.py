# store/forms.py
from django import forms
from .models import Product


class ContactForm(forms.Form):
    """Formulário de contato para os usuários enviarem mensagens."""
    name = forms.CharField(
        max_length=100,
        label="Seu Nome",
        widget=forms.TextInput(attrs={
            'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200',
            'placeholder': 'Seu nome completo'
        })
    )
    email = forms.EmailField(
        label="Seu E-mail",
        widget=forms.EmailInput(attrs={
            'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200',
            'placeholder': 'seu.email@exemplo.com'
        })
    )
    message = forms.CharField(
        label="Sua Mensagem",
        widget=forms.Textarea(attrs={
            'rows': 6,
            'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200',
            'placeholder': 'Escreva sua mensagem aqui...'
        })
    )


class ProductForm(forms.ModelForm):
    """Formulário para vendedores criarem ou editarem produtos."""
    class Meta:
        model = Product
        fields = ['name', 'description', 'price', 'image', 'category', 'stock', 'is_featured', 'tracking_code']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200',
                'placeholder': 'Nome do Produto'
            }),
            'description': forms.Textarea(attrs={
                'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200',
                'rows': 6,
                'placeholder': 'Descrição detalhada do produto'
            }),
            'price': forms.NumberInput(attrs={
                'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200',
                'step': '0.01',
                'min': '0'
            }),
            'stock': forms.NumberInput(attrs={
                'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200',
                'min': '0'
            }),
            'category': forms.Select(attrs={
                'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200'
            }),
            'image': forms.ClearableFileInput(attrs={
                'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200'
            }),
            'is_featured': forms.CheckboxInput(attrs={
                'class': 'form-checkbox h-5 w-5 text-pink-600 ml-2'
            }),
            'tracking_code': forms.TextInput(attrs={
                'class': 'shadow-sm appearance-none border border-stone-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200',
                'placeholder': 'Ex: ABC123XYZ'
            }),
        }
        labels = {
            'name': "Nome do Produto",
            'description': "Descrição",
            'price': "Preço (R$)",
            'image': "Imagem do Produto",
            'category': "Categoria",
            'stock': "Estoque",
            'is_featured': "Destacar na Página Inicial?",
            'tracking_code': "Código de Rastreamento (Opcional)"
        }