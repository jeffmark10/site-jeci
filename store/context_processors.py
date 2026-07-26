# store/context_processors.py
from .models import Cart, StoreSettings


def cart_items_count(request):
    """Torna a contagem de itens do carrinho disponível em todos os templates."""
    cart_count = 0
    if request.user.is_authenticated:
        if hasattr(request.user, 'cart'):
            cart_count = request.user.cart.items.count()
    elif 'cart_id' in request.session:
        try:
            cart = Cart.objects.get(id=request.session['cart_id'])
            cart_count = cart.items.count()
        except Cart.DoesNotExist:
            del request.session['cart_id']
            pass
    return {'cart_items_count': cart_count}


def store_settings(request):
    """Torna os dados de contato e configurações globais visíveis em qualquer página do site."""
    settings_obj = StoreSettings.objects.first()
    if not settings_obj:
        settings_obj = StoreSettings()  # Instância padrão caso a tabela ainda esteja vazia
    return {'store_settings': settings_obj}