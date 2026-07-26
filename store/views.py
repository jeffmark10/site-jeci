# store/views.py
from urllib.parse import quote
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from functools import wraps

from .models import Product, Category, Cart, CartItem
from .forms import ContactForm, ProductForm


# --- Helpers ---

def get_descendant_category_ids(category):
    category_ids = [category.id]
    for child in category.children.all():
        category_ids.extend(get_descendant_category_ids(child))
    return category_ids


def get_categories_tree():
    return Category.objects.filter(parent__isnull=True).prefetch_related('children')


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
                        else:
                            messages.warning(
                                request,
                                f"Não foi possível migrar todas as unidades de '{item.product.name}' (estoque insuficiente)."
                            )
                session_cart.delete()
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


def seller_required(function):
    @wraps(function)
    def wrap(request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, "Você precisa estar logado para acessar esta área.")
            return redirect('login')

        if not getattr(request.user, 'profile', None) or not request.user.profile.is_seller:
            messages.warning(request, "Você não tem permissão de vendedor.")
            return redirect('store:user_profile')

        return function(request, *args, **kwargs)
    return wrap


# --- Views Principais ---

def home_view(request):
    featured_products = Product.objects.filter(is_featured=True, stock__gt=0).select_related('category')[:4]
    return render(request, 'home.html', {
        'featured_products': featured_products,
        'page_title': 'Bem-vindo à Jeci Store!',
        'categories': get_categories_tree(),
    })


def product_list_view(request, category_slug=None):
    # Otimização: select_related para evitar múltiplas buscas de categoria por produto
    products = Product.objects.filter(stock__gt=0).select_related('category')
    current_category = None

    search_query = request.GET.get('q', '').strip()
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')
    sort_by = request.GET.get('sort_by', 'name')

    if category_slug:
        current_category = get_object_or_404(Category, slug=category_slug)
        category_ids = get_descendant_category_ids(current_category)
        products = products.filter(category__id__in=category_ids)

    if search_query:
        products = products.filter(
            Q(name__icontains=search_query) | Q(description__icontains=search_query)
        ).distinct()
        if not products.exists():
            messages.info(request, f"Nenhum produto encontrado para '{search_query}'.")

    if min_price:
        try:
            products = products.filter(price__gte=float(min_price))
        except ValueError:
            messages.error(request, "Valor mínimo inválido.")

    if max_price:
        try:
            products = products.filter(price__lte=float(max_price))
        except ValueError:
            messages.error(request, "Valor máximo inválido.")

    ordering_map = {
        'price_asc': 'price',
        'price_desc': '-price',
        'name_desc': '-name',
        'created_at': '-created_at',
        'name': 'name',
    }
    products = products.order_by(ordering_map.get(sort_by, 'name'))

    paginator = Paginator(products, 8)
    page_number = request.GET.get('page')
    try:
        products_page = paginator.page(page_number)
    except (PageNotAnInteger, EmptyPage):
        products_page = paginator.page(1 if not page_number or not page_number.isdigit() else paginator.num_pages)

    return render(request, 'product_list.html', {
        'products': products_page,
        'current_category': current_category,
        'page_title': current_category.name if current_category else 'Nossos Produtos',
        'categories': get_categories_tree(),
        'search_query': search_query,
        'min_price': min_price,
        'max_price': max_price,
        'sort_by': sort_by,
    })


def product_detail_view(request, pk):
    product = get_object_or_404(Product.objects.select_related('category', 'seller'), pk=pk)
    return render(request, 'product_detail.html', {
        'product': product,
        'page_title': product.name,
        'categories': get_categories_tree(),
    })


def about_view(request):
    return render(request, 'about.html', {
        'page_title': 'Sobre a Jeci Store',
        'categories': get_categories_tree(),
    })


def contact_view(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            messages.success(request, 'Sua mensagem foi enviada com sucesso!')
            return redirect('store:contact')
        else:
            messages.error(request, 'Por favor, corrija os erros no formulário.')
    else:
        form = ContactForm()

    return render(request, 'contact.html', {
        'page_title': 'Fale Conosco',
        'categories': get_categories_tree(),
        'form': form,
    })


# --- Carrinho ---

def add_to_cart(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    cart = get_or_create_cart(request)
    
    try:
        quantity = int(request.POST.get('quantity', 1))
    except (ValueError, TypeError):
        quantity = 1

    if quantity <= 0:
        messages.error(request, "A quantidade deve ser positiva.")
        return redirect('store:product_detail', pk=product_id)

    if product.stock < quantity:
        messages.error(request, f"Apenas {product.stock} unidades disponíveis.")
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


def view_cart(request):
    cart = get_or_create_cart(request)
    # Prefetch de itens e produtos para carregar o carrinho em 1 consulta única
    cart_items = cart.items.select_related('product')
    return render(request, 'cart.html', {
        'cart': cart,
        'cart_items': cart_items,
        'page_title': 'Seu Carrinho',
        'categories': get_categories_tree(),
    })


def update_cart_item(request, item_id):
    cart_item = get_object_or_404(CartItem.objects.select_related('product'), id=item_id)
    cart = get_or_create_cart(request)

    if cart_item.cart != cart:
        messages.error(request, "Ação não permitida.")
        return redirect('store:view_cart')

    if request.method == 'POST':
        try:
            new_quantity = int(request.POST.get('quantity', 1))
            if new_quantity <= 0:
                cart_item.delete()
                messages.info(request, f"'{cart_item.product.name}' removido do carrinho.")
            elif new_quantity > cart_item.product.stock:
                messages.error(request, f"Estoque insuficiente (máximo: {cart_item.product.stock}).")
            else:
                cart_item.quantity = new_quantity
                cart_item.save()
                messages.success(request, "Quantidade atualizada com sucesso.")
        except (ValueError, TypeError):
            messages.error(request, "Quantidade inválida.")

    return redirect('store:view_cart')


def remove_from_cart(request, item_id):
    cart_item = get_object_or_404(CartItem, id=item_id)
    cart = get_or_create_cart(request)

    if cart_item.cart == cart:
        product_name = cart_item.product.name
        cart_item.delete()
        messages.info(request, f"'{product_name}' removido do carrinho.")
    return redirect('store:view_cart')


def checkout_whatsapp_view(request):
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

def signup_view(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Conta criada com sucesso! Faça login.')
            return redirect('login')
        else:
            messages.error(request, 'Por favor, corrija os erros abaixo.')
    else:
        form = UserCreationForm()

    return render(request, 'registration/signup.html', {
        'page_title': 'Registrar-se',
        'form': form,
        'categories': get_categories_tree(),
    })


@login_required
def user_profile_view(request):
    return render(request, 'registration/user_profile.html', {
        'page_title': f'Perfil de {request.user.username}',
        'categories': get_categories_tree(),
    })


# --- Erros ---

def custom_404_view(request, exception):
    return render(request, '404.html', {'categories': get_categories_tree()}, status=404)


def custom_500_view(request):
    return render(request, '500.html', {'categories': get_categories_tree()}, status=500)


# --- Vendedores ---

@seller_required
def add_product_view(request):
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save(commit=False)
            product.seller = request.user
            product.save()
            messages.success(request, f"Produto '{product.name}' adicionado com sucesso!")
            return redirect('store:my_products')
        else:
            messages.error(request, "Erro ao preencher o formulário.")
    else:
        form = ProductForm()

    return render(request, 'store/seller/seller_add_product.html', {
        'page_title': 'Adicionar Novo Produto',
        'form': form,
        'categories': get_categories_tree(),
    })


@seller_required
def my_products_view(request):
    products = Product.objects.filter(seller=request.user).select_related('category').order_by('-created_at')
    paginator = Paginator(products, 10)
    page_number = request.GET.get('page')

    try:
        products_page = paginator.page(page_number)
    except (PageNotAnInteger, EmptyPage):
        products_page = paginator.page(1)

    return render(request, 'store/seller/seller_my_products.html', {
        'page_title': 'Meus Produtos',
        'products': products_page,
        'categories': get_categories_tree(),
    })


@seller_required
def edit_product_view(request, pk):
    product = get_object_or_404(Product, pk=pk, seller=request.user)
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES, instance=product)
        if form.is_valid():
            form.save()
            messages.success(request, f"Produto '{product.name}' atualizado!")
            return redirect('store:my_products')
    else:
        form = ProductForm(instance=product)

    return render(request, 'store/seller/seller_edit_product.html', {
        'page_title': f'Editar: {product.name}',
        'form': form,
        'product': product,
        'categories': get_categories_tree(),
    })


@seller_required
def delete_product_view(request, pk):
    product = get_object_or_404(Product, pk=pk, seller=request.user)
    if request.method == 'POST':
        name = product.name
        product.delete()
        messages.info(request, f"Produto '{name}' excluído.")
    return redirect('store:my_products')