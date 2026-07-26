# store/models.py
from django.db import models
from django.utils.text import slugify
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="Usuário")
    is_seller = models.BooleanField(default=False, verbose_name="É Vendedor")

    class Meta:
        verbose_name = "Perfil"
        verbose_name_plural = "Perfis"

    def __str__(self):
        return f"Perfil de {self.user.username}"


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Nome da Categoria")
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name="Categoria Pai"
    )

    class Meta:
        verbose_name_plural = "Categorias"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        full_path = [self.name]
        k = self.parent
        while k is not None:
            full_path.append(k.name)
            k = k.parent
        return ' -> '.join(full_path[::-1])


class Product(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nome do Produto")
    description = models.TextField(verbose_name="Descrição")
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Preço")
    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name="Imagem do Produto")
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name="Categoria"
    )
    seller = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products_listed',
        verbose_name="Vendedor"
    )
    stock = models.PositiveIntegerField(default=0, verbose_name="Estoque")
    tracking_code = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        verbose_name="Código de Rastreamento"
    )
    is_featured = models.BooleanField(default=False, verbose_name="Destaque na Home")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado Em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado Em")

    class Meta:
        verbose_name_plural = "Produtos"
        ordering = ['name']

    def __str__(self):
        return self.name


class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Usuário")
    session_key = models.CharField(max_length=40, null=True, blank=True, unique=True, verbose_name="Chave de Sessão")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado Em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado Em")

    class Meta:
        verbose_name_plural = "Carrinhos"
        ordering = ['-created_at']

    def __str__(self):
        if self.user:
            return f"Carrinho de {self.user.username}"
        return f"Carrinho de Sessão {self.session_key[:10]}..."

    def get_total_price(self):
        return sum(item.get_total_price() for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items', verbose_name="Carrinho")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="Produto")
    quantity = models.PositiveIntegerField(default=1, verbose_name="Quantidade")
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Adicionado Em")

    class Meta:
        verbose_name_plural = "Itens do Carrinho"
        unique_together = ('cart', 'product')

    def __str__(self):
        return f"{self.quantity} x {self.product.name} no carrinho de {self.cart}"

    def get_total_price(self):
        return self.quantity * self.product.price


class StoreSettings(models.Model):
    """Modelo de Configurações Globais do Site (WhatsApp, Email, etc.)"""
    site_title = models.CharField(max_length=100, default="Jeci Store", verbose_name="Nome do Site")
    contact_email = models.EmailField(default="contato@jecistore.com.br", verbose_name="E-mail de Contato")
    whatsapp_number = models.CharField(
        max_length=20,
        default="5561998504516",
        verbose_name="Número do WhatsApp (Sem espaços/símbolos)",
        help_text="Exemplo: 5561998504516 (código do país + DDD + número)"
    )
    whatsapp_display = models.CharField(
        max_length=30,
        default="(61) 99850-4516",
        verbose_name="WhatsApp Formatado (Para Exibição)",
        help_text="Exemplo: (61) 99850-4516"
    )
    business_hours = models.CharField(
        max_length=100,
        default="Segunda a Sexta, das 9h às 18h",
        verbose_name="Horário de Atendimento"
    )

    class Meta:
        verbose_name = "Configuração da Loja"
        verbose_name_plural = "Configurações da Loja"

    def __str__(self):
        return "Configurações Gerais da Loja"

    def save(self, *args, **kwargs):
        # Garante que haverá apenas 1 registro de configuração no banco de dados (padronização Singleton)
        if not self.pk and StoreSettings.objects.exists():
            self.pk = StoreSettings.objects.first().pk
        super().save(*args, **kwargs)