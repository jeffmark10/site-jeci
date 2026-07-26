# store/urls.py
from django.urls import path
from . import views

app_name = 'store'

urlpatterns = [
    # Produtos e Páginas Estáticas
    path('produtos/', views.ProductListView.as_view(), name='product_list'),
    path('produtos/categoria/<slug:category_slug>/', views.ProductListView.as_view(), name='product_list_by_category'),
    path('produtos/<int:pk>/', views.ProductDetailView.as_view(), name='product_detail'),
    path('sobre/', views.AboutView.as_view(), name='about'),
    path('contato/', views.ContactView.as_view(), name='contact'),

    # Carrinho de Compras
    path('carrinho/adicionar/<int:product_id>/', views.AddToCartView.as_view(), name='add_to_cart'),
    path('carrinho/', views.ViewCartView.as_view(), name='view_cart'),
    path('carrinho/atualizar/<int:item_id>/', views.UpdateCartItemView.as_view(), name='update_cart_item'),
    path('carrinho/remover/<int:item_id>/', views.RemoveFromCartView.as_view(), name='remove_from_cart'),
    path('carrinho/finalizar-whatsapp/', views.CheckoutWhatsappView.as_view(), name='checkout_whatsapp'),

    # Autenticação e Perfil
    path('registrar/', views.SignUpView.as_view(), name='signup'),
    path('perfil/', views.UserProfileView.as_view(), name='user_profile'),

    # Área do Vendedor
    path('vendedor/adicionar-produto/', views.AddProductView.as_view(), name='add_product'),
    path('vendedor/meus-produtos/', views.MyProductsView.as_view(), name='my_products'),
    path('vendedor/editar-produto/<int:pk>/', views.EditProductView.as_view(), name='edit_product'),
    path('vendedor/excluir-produto/<int:pk>/', views.DeleteProductView.as_view(), name='delete_product'),
]