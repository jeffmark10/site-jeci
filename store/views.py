# store/views.py
from urllib.parse import quote
from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse_lazy
from django.contrib import messages
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views.generic import (
    ListView, DetailView, TemplateView, FormView, CreateView, UpdateView, DeleteView, View
)
from django.db.models import Q

from .models import Product, Category, Cart, CartItem
from .forms import ContactForm, ProductForm


# Dentro de store/views.py -> CheckoutWhatsappView
from .models import StoreSettings

class CheckoutWhatsappView(View):
    def get(self, request):
        cart = get_or_create_cart(request)
        cart_items = cart.items.select_related('product').all()

        if not cart_items.exists():
            messages.warning(request, "Seu carrinho está vazio.")
            return redirect('store:view_cart')

        # Pega o número do WhatsApp configurado no Admin
        settings_obj = StoreSettings.objects.first()
        whatsapp_number = settings_obj.whatsapp_number if settings_obj else "5561998504516"

        message_parts = [
            "Olá, gostaria de finalizar meu pedido na Jeci Store!",
            "Itens no carrinho:"
        ]
        # ... restante do código do checkout ...
        encoded_message = quote("\n".join(message_parts))
        return redirect(f"https://wa.me/{whatsapp_number}?text={encoded_message}")

# --- Helpers e Mixins ---

def get_descendant_category_ids(category):
    category_ids = [category.id]
    for child in category.children.all():
        category_ids.extend(get_descendant_category_ids(child))
    return category_ids


def get_or_create_cart(request):
    session_key = request.session.session_key
    if not session_key:
        request.session.save()
        session_key = request.session.session_key

    if request.user.is_authenticated:
        user_cart, _ = Cart.objects.get_or_create(user=request.user)

        if 'cart_id' in request.session:
            try:
                session_cart = Cart.objects.get(id=request.session['cart_id'], session_key=session_key)
                for item in session_cart.items.all():
                    user_cart_item, created = CartItem.objects.get_or_create(
                        cart=user_cart,
                        product=item.product,
                        defaults={'quantity': item.quantity}
                    )
                    if not created:
                        new_qty = user_cart_item.quantity + item.quantity
                        if new_qty <= item.product.stock:
                            user_cart_item.quantity = new_qty
                            user_cart_item.save()
            except Cart.DoesNotExist:
                pass
            finally:
                del request.session['cart_id']

        return user_cart
    else:
        cart_id = request.session.get('cart_id')
        cart = None
        if cart_id:
            try:
                cart = Cart.objects.get(id=cart_id, session_key=session_key)
            except Cart.DoesNotExist:
                pass

        if not cart:
            cart = Cart.objects.create(session_key=session_key)
            request.session['cart_id'] = cart.id

        return cart


class CategoryTreeMixin:
    """Injeta a árvore de categorias automaticamente no contexto de qualquer view."""
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['categories'] = Category.objects.filter(parent__isnull=True).prefetch_related('children')
        return context


class SellerRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """Garante que o usuário está logado e possui o perfil de vendedor."""
    def test_func(self):
        return hasattr(self.request.user, 'profile') and self.request.user.profile.is_seller

    def handle_no_permission(self):
        if not self.request.user.is_authenticated:
            messages.error(self.request, "Você precisa estar logado para acessar esta área.")
            return redirect('login')
        messages.warning(self.request, "Você não tem permissão de vendedor.")
        return redirect('store:user_profile')


# --- Views Principais ---

class HomeView(CategoryTreeMixin, ListView):
    model = Product
    template_name = 'home.html'
    context_object_name = 'featured_products'

    def get_queryset(self):
        return Product.objects.filter(is_featured=True, stock__gt=0).select_related('category')[:4]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Bem-vindo à Jeci Store!'
        return context


class ProductListView(CategoryTreeMixin, ListView):
    model = Product
    template_name = 'product_list.html'
    context_object_name = 'products'
    paginate_by = 8

    def get_queryset(self):
        queryset = Product.objects.filter(stock__gt=0).select_related('category')
        
        category_slug = self.kwargs.get('category_slug')
        if category_slug:
            self.current_category = get_object_or_404(Category, slug=category_slug)
            category_ids = get_descendant_category_ids(self.current_category)
            queryset = queryset.filter(category__id__in=category_ids)
        else:
            self.current_category = None

        search_query = self.request.GET.get('q', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) | Q(description__icontains=search_query)
            ).distinct()

        min_price = self.request.GET.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass

        max_price = self.request.GET.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass

        ordering_map = {
            'price_asc': 'price',
            'price_desc': '-price',
            'name_desc': '-name',
            'created_at': '-created_at',
            'name': 'name',
        }
        sort_by = self.request.GET.get('sort_by', 'name')
        return queryset.order_by(ordering_map.get(sort_by, 'name'))

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            'current_category': getattr(self, 'current_category', None),
            'page_title': self.current_category.name if getattr(self, 'current_category', None) else 'Nossos Produtos',
            'search_query': self.request.GET.get('q', '').strip(),
            'min_price': self.request.GET.get('min_price'),
            'max_price': self.request.GET.get('max_price'),
            'sort_by': self.request.GET.get('sort_by', 'name'),
        })
        return context


class ProductDetailView(CategoryTreeMixin, DetailView):
    model = Product
    template_name = 'product_detail.html'
    context_object_name = 'product'

    def get_queryset(self):
        return Product.objects.select_related('category', 'seller')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = self.object.name
        return context


class AboutView(CategoryTreeMixin, TemplateView):
    template_name = 'about.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Sobre a Jeci Store'
        return context


class ContactView(CategoryTreeMixin, FormView):
    template_name = 'contact.html'
    form_class = ContactForm
    success_url = reverse_lazy('store:contact')

    def form_valid(self, form):
        messages.success(self.request, 'Sua mensagem foi enviada com sucesso!')
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, 'Por favor, corrija os erros no formulário.')
        return super().form_invalid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Fale Conosco'
        return context


# --- Carrinho de Compras ---

class AddToCartView(View):
    def post(self, request, product_id):
        product = get_object_or_404(Product, id=product_id)
        cart = get_or_create_cart(request)
        
        try:
            quantity = int(request.POST.get('quantity', 1))
        except (ValueError, TypeError):
            quantity = 1

        if quantity <= 0 or product.stock < quantity:
            messages.error(request, "Quantidade inválida ou estoque insuficiente.")
            return redirect('store:product_detail', pk=product_id)

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, defaults={'quantity': quantity}
        )
        if not created:
            if cart_item.quantity + quantity > product.stock:
                messages.error(request, "Quantidade solicitada ultrapassa o estoque disponível.")
                return redirect('store:product_detail', pk=product_id)
            cart_item.quantity += quantity
            cart_item.save()

        messages.success(request, f"{quantity}x {product.name} adicionado ao carrinho!")
        return redirect('store:product_detail', pk=product_id)


class ViewCartView(CategoryTreeMixin, TemplateView):
    template_name = 'cart.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        cart = get_or_create_cart(self.request)
        context.update({
            'cart': cart,
            'cart_items': cart.items.select_related('product'),
            'page_title': 'Seu Carrinho',
        })
        return context


class UpdateCartItemView(View):
    def post(self, request, item_id):
        cart_item = get_object_or_404(CartItem.objects.select_related('product'), id=item_id)
        cart = get_or_create_cart(request)

        if cart_item.cart == cart:
            try:
                new_quantity = int(request.POST.get('quantity', 1))
                if new_quantity <= 0:
                    cart_item.delete()
                    messages.info(request, f"'{cart_item.product.name}' removido do carrinho.")
                elif new_quantity <= cart_item.product.stock:
                    cart_item.quantity = new_quantity
                    cart_item.save()
                    messages.success(request, "Quantidade atualizada.")
                else:
                    messages.error(request, "Estoque insuficiente.")
            except (ValueError, TypeError):
                messages.error(request, "Quantidade inválida.")

        return redirect('store:view_cart')


class RemoveFromCartView(View):
    def post(self, request, item_id):
        cart_item = get_object_or_404(CartItem, id=item_id)
        cart = get_or_create_cart(request)

        if cart_item.cart == cart:
            product_name = cart_item.product.name
            cart_item.delete()
            messages.info(request, f"'{product_name}' removido do carrinho.")
        return redirect('store:view_cart')


class CheckoutWhatsappView(View):
    def get(self, request):
        cart = get_or_create_cart(request)
        cart_items = cart.items.select_related('product').all()

        if not cart_items.exists():
            messages.warning(request, "Seu carrinho está vazio.")
            return redirect('store:view_cart')

        whatsapp_number = "5561998504516"
        message_parts = [
            "Olá, gostaria de finalizar meu pedido na Jeci Store!",
            "Itens no carrinho:"
        ]
        tracking_codes = []

        for item in cart_items:
            message_parts.append(f"- {item.quantity}x {item.product.name} (R${item.product.price:.2f})")
            if item.product.tracking_code:
                tracking_codes.append(f"  Código de Rastreamento: {item.product.tracking_code}")

        if tracking_codes:
            message_parts.append("\nCódigos de Rastreamento:")
            message_parts.extend(tracking_codes)

        message_parts.append(f"\nValor Total: R${cart.get_total_price():.2f}")
        message_parts.append("\nPor favor, me ajude a prosseguir com o pagamento e envio.")

        encoded_message = quote("\n".join(message_parts))
        return redirect(f"https://wa.me/{whatsapp_number}?text={encoded_message}")


# --- Autenticação e Perfil ---

class SignUpView(CategoryTreeMixin, FormView):
    template_name = 'registration/signup.html'
    form_class = UserCreationForm
    success_url = reverse_lazy('login')

    def form_valid(self, form):
        form.save()
        messages.success(self.request, 'Conta criada com sucesso! Faça login.')
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Registrar-se'
        return context


class UserProfileView(LoginRequiredMixin, CategoryTreeMixin, TemplateView):
    template_name = 'registration/user_profile.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = f'Perfil de {self.request.user.username}'
        return context


# --- Área do Vendedor ---

class AddProductView(SellerRequiredMixin, CategoryTreeMixin, CreateView):
    model = Product
    form_class = ProductForm
    template_name = 'store/seller/seller_add_product.html'
    success_url = reverse_lazy('store:my_products')

    def form_valid(self, form):
        form.instance.seller = self.request.user
        messages.success(self.request, f"Produto '{form.instance.name}' adicionado com sucesso!")
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Adicionar Novo Produto'
        return context


class MyProductsView(SellerRequiredMixin, CategoryTreeMixin, ListView):
    model = Product
    template_name = 'store/seller/seller_my_products.html'
    context_object_name = 'products'
    paginate_by = 10

    def get_queryset(self):
        return Product.objects.filter(seller=self.request.user).select_related('category').order_by('-created_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Meus Produtos'
        return context


class EditProductView(SellerRequiredMixin, CategoryTreeMixin, UpdateView):
    model = Product
    form_class = ProductForm
    template_name = 'store/seller/seller_edit_product.html'
    success_url = reverse_lazy('store:my_products')

    def get_queryset(self):
        return Product.objects.filter(seller=self.request.user)

    def form_valid(self, form):
        messages.success(self.request, f"Produto '{form.instance.name}' atualizado!")
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = f'Editar: {self.object.name}'
        return context


class DeleteProductView(SellerRequiredMixin, DeleteView):
    model = Product
    success_url = reverse_lazy('store:my_products')

    def get_queryset(self):
        return Product.objects.filter(seller=self.request.user)

    def delete(self, request, *args, **kwargs):
        obj = self.get_object()
        messages.info(request, f"Produto '{obj.name}' excluído com sucesso.")
        return super().delete(request, *args, **kwargs)