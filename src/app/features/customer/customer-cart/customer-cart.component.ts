import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { InventoryRecord } from '../../../core/models/product.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-customer-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, CardModule, InputNumberModule, TagModule],
  templateUrl: './customer-cart.component.html',
  styleUrl: './customer-cart.component.scss'
})
export class CustomerCartComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly productService = inject(ProductService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly items = this.cartService.cartItems;
  protected readonly checkoutBusy = signal(false);
  protected readonly totalItems = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  protected readonly totalAmount = computed(() =>
    this.items().reduce((sum, item) => sum + Number(item.product.sellPrice ?? 0) * item.quantity, 0)
  );

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      const returnUrl = this.route.snapshot.queryParamMap.get('checkout') === 'true'
        ? '/cart?checkout=true'
        : '/cart';
      void this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }
    if (this.route.snapshot.queryParamMap.get('checkout') === 'true') {
      this.checkout();
    }
  }

  protected updateQuantity(productId: string, quantity: number): void {
    this.cartService.updateQuantity(productId, Number.isFinite(quantity) ? quantity : 1);
  }

  protected remove(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  protected artClass(category: string): string {
    const normalized = category?.toLowerCase() || '';
    return normalized.includes('electronic')
      ? 'art-electronics'
      : normalized.includes('accessor')
        ? 'art-accessories'
        : 'art-general';
  }

  protected getProductImageUrl(product: { imageUrl?: string | null }): string | null {
    const imageUrl = product.imageUrl?.trim();
    if (!imageUrl) {
      return null;
    }
    if (/^(https?:|data:|blob:)/i.test(imageUrl)) {
      return imageUrl;
    }
    return imageUrl.startsWith('/')
      ? `${environment.apiUrl}${imageUrl}`
      : `${environment.apiUrl}/${imageUrl}`;
  }

  protected hideBrokenImage(event: Event): void {
    (event.currentTarget as HTMLImageElement).style.display = 'none';
  }

  protected checkout(): void {
    const cartItems = this.items();
    if (cartItems.length === 0 || this.checkoutBusy()) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/cart?checkout=true' }
      });
      return;
    }

    const customerId = this.authService.getUserId();
    if (!customerId) {
      this.showCheckoutError('Your login did not provide a customer account ID. Sign out and sign in again, or contact support.');
      return;
    }

    this.checkoutBusy.set(true);
    forkJoin(cartItems.map((item) => this.productService.getInventoryForProduct(item.product.id))).subscribe({
      next: (inventories) => {
        const warehouseId = this.findWarehouseForCart(cartItems, inventories);
        if (!warehouseId) {
          this.checkoutBusy.set(false);
          this.showCheckoutError('No single warehouse currently has enough stock for every item in your cart.');
          return;
        }

        this.orderService.createOrder({
          customerId,
          warehouseId,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity
          }))
        }).subscribe({
          next: () => {
            this.cartService.clear();
            this.checkoutBusy.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Order placed',
              detail: 'Your order has been submitted successfully.',
              life: 3000
            });
            void this.router.navigate(['/my-orders']);
          },
          error: () => {
            this.checkoutBusy.set(false);
            this.showCheckoutError('We couldn’t place your order. Your cart is unchanged; please try again.');
          }
        });
      },
      error: () => {
        this.checkoutBusy.set(false);
        this.showCheckoutError('We couldn’t verify current inventory. Your cart is unchanged; please try again.');
      }
    });
  }

  private findWarehouseForCart(
    cartItems: ReturnType<CartService['cartItems']>,
    inventories: Array<{ warehouses: InventoryRecord[] }>
  ): string | null {
    const warehouseAvailability = cartItems.map((item, index) => {
      const quantities = new Map<string, number>();
      for (const warehouse of inventories[index]?.warehouses ?? []) {
        const warehouseId = warehouse.warehouseId;
        const quantity =
          warehouse.availableQuantity ??
          warehouse.quantityOnHand ??
          warehouse.stockQuantity ??
          warehouse.quantity;

        if (warehouseId && typeof quantity === 'number' && Number.isFinite(quantity)) {
          quantities.set(warehouseId, quantity);
        }
      }
      return { required: item.quantity, quantities };
    });

    const firstItemWarehouses = warehouseAvailability[0]?.quantities.keys() ?? [];
    for (const warehouseId of firstItemWarehouses) {
      if (warehouseAvailability.every(({ required, quantities }) => (quantities.get(warehouseId) ?? 0) >= required)) {
        return warehouseId;
      }
    }
    return null;
  }

  private showCheckoutError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Unable to place order',
      detail,
      life: 5000
    });
  }
}
