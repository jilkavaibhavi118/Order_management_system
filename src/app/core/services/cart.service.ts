import { Injectable, signal } from '@angular/core';
import { CartItem, Product } from '../models/product.model';

const CART_STORAGE_KEY = 'customer-cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly cartItems = signal<CartItem[]>(this.readCart());

  private readCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
      if (!Array.isArray(saved)) return [];
      return saved.filter((item): item is CartItem =>
        !!item && typeof item === 'object' &&
        typeof item.product?.id === 'string' &&
        Number.isFinite(item.quantity) && item.quantity > 0
      );
    } catch {
      return [];
    }
  }

  private save(items: CartItem[]): void {
    this.cartItems.set(items);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }

  addToCart(product: Product, maxQuantity = Number.POSITIVE_INFINITY): boolean {
    const items = this.cartItems();
    const existing = items.find((item) => item.product.id === product.id);
    if ((existing?.quantity ?? 0) >= maxQuantity) {
      return false;
    }

    if (existing) {
      this.save(
        items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return true;
    }

    this.save([...items, { product, quantity: 1 }]);
    return true;
  }

  quantityForProduct(productId: string): number {
    return this.cartItems().find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  updateQuantity(productId: string, quantity: number): void {
    this.save(
      this.cartItems()
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  removeFromCart(productId: string): void {
    this.save(this.cartItems().filter((item) => item.product.id !== productId));
  }

  clear(): void {
    this.save([]);
  }

  get totalItems(): number {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  get total(): number {
    return this.cartItems().reduce(
      (sum, item) => sum + Number(item.product.sellPrice ?? 0) * item.quantity,
      0
    );
  }
}
