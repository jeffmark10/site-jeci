# store/admin.py
from django.contrib import admin
from .models import Product, Category, Cart, CartItem, Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_seller')
    list_filter = ('is_seller',)
    search_fields = ('user__username', 'user__email')
    raw_id_fields = ('user',)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'slug')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    list_filter = ('parent',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'stock', 'is_featured', 'seller', 'created_at')
    list_filter = ('is_featured', 'category', 'created_at', 'stock')
    search_fields = ('name', 'description', 'seller__username', 'tracking_code')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('seller', 'category')

    def save_model(self, request, obj, form, change):
        if not change and not obj.seller:
            obj.seller = request.user
        super().save_model(request, obj, form, change)


class CartItemInline(admin.TabularInline):
    model = CartItem
    raw_id_fields = ('product',)
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'session_key', 'created_at', 'updated_at', 'get_total_price_display')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__username', 'session_key')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [CartItemInline]

    def get_total_price_display(self, obj):
        return f"R$ {obj.get_total_price():.2f}"
    get_total_price_display.short_description = "Valor Total"


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product', 'quantity', 'added_at', 'get_total_price_display')
    list_filter = ('added_at', 'product__category')
    search_fields = ('product__name', 'cart__user__username', 'cart__session_key')
    readonly_fields = ('added_at',)
    raw_id_fields = ('cart', 'product')

    def get_total_price_display(self, obj):
        return f"R$ {obj.get_total_price():.2f}"
    get_total_price_display.short_description = "Total do Item"