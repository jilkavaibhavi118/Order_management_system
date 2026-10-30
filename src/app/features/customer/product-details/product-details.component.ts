import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InventoryRecord, Product, ProductInventory } from '../../../core/models/product.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, ButtonModule],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss'
})
export class ProductDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly products = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly stock = signal<number | null>(null);
  readonly stockLoading = signal(true);
  readonly stockError = signal(false);
  readonly inventory = signal<ProductInventory | null>(null);
  readonly quantity = signal(1);
  readonly selectedTab = signal<'description' | 'inventory'>('description');
  readonly relatedProducts = signal<Product[]>([]);
  readonly relatedLoading = signal(true);
  readonly relatedError = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.loading.set(false);
      this.error.set('Product not found.');
      return;
    }

    this.products.getProductById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);

        this.products.getProducts().subscribe({
          next: (products) => {
            this.relatedProducts.set(
              products.filter(
                (candidate) =>
                  candidate.id !== product.id &&
                  candidate.isActive &&
                  candidate.category === product.category
              )
            );
            this.relatedLoading.set(false);
          },
          error: () => {
            this.relatedError.set('Related products could not be loaded.');
            this.relatedLoading.set(false);
          }
        });

        this.products.getInventoryForProduct(id).subscribe({
          next: (inventory) => {
            this.inventory.set(inventory);
            this.stock.set(inventory.totalQuantity);
            this.stockLoading.set(false);
          },
          error: () => {
            this.stockError.set(true);
            this.stockLoading.set(false);
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load this product. Please return to the catalog and try again.');
      }
    });
  }

  incrementQty(): void {
    if (this.canIncrementQty()) {
      this.quantity.update((value) => value + 1);
    }
  }

  decrementQty(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  canIncrementQty(): boolean {
    const item = this.product();
    const availableStock = this.stock();
    return Boolean(
      item?.isActive &&
        !this.stockLoading() &&
        !this.stockError() &&
        availableStock !== null &&
        this.cart.quantityForProduct(item.id) + this.quantity() < availableStock
    );
  }

  imageUrl(product: Product): string | null {
    const source = product.imageUrl?.trim();
    if (!source) {
      return null;
    }

    if (/^(https?:|data:|blob:)/i.test(source)) {
      return source;
    }

    if (source.startsWith('/')) {
      return `${environment.apiUrl}${source}`;
    }

    return `${environment.apiUrl}/${source}`;
  }

  hideBrokenImage(event: Event): void {
    const element = event.currentTarget as HTMLImageElement;
    element.style.display = 'none';
  }

  warehouseQuantity(warehouse: InventoryRecord): number | null {
    return warehouse.availableQuantity ?? warehouse.quantityOnHand ?? warehouse.stockQuantity ?? warehouse.quantity ?? null;
  }

  canBuy(): boolean {
    const item = this.product();
    const availableStock = this.stock();
    return Boolean(
      item?.isActive &&
        !this.stockLoading() &&
        !this.stockError() &&
        availableStock !== null &&
        availableStock > 0 &&
        this.cart.quantityForProduct(item.id) + this.quantity() <= availableStock
    );
  }

  addToCart(): boolean {
    const item = this.product();
    if (!item || !this.canBuy()) {
      return false;
    }

    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/product/${item.id}` }
      });
      return false;
    }

    const cartQuantity = this.cart.quantityForProduct(item.id);
    const nextQuantity = cartQuantity + this.quantity();
    if (nextQuantity <= (this.stock() ?? 0)) {
      this.cart.updateQuantity(item.id, nextQuantity);
      this.messages.add({ severity: 'success', summary: 'Added to cart', detail: item.name });
      return true;
    } else {
      this.messages.add({ severity: 'warn', summary: 'Stock limit reached', detail: 'No additional units are available.' });
      return false;
    }
  }

  buyNow(): void {
    if (this.addToCart()) {
      void this.router.navigate(['/cart'], { queryParams: { checkout: true } });
    }
  }
}
