import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { InventoryRecord, Product } from '../../../core/models/product.model';
import { environment } from '../../../../environments/environment';
import { CategoryOption } from '../../../core/models/order.model';


@Component({
  selector: 'app-customer-shop',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    ProgressSpinnerModule,
    SelectModule,
    SkeletonModule,
    TagModule
  ],
  templateUrl: './customer-shop.component.html',
  styleUrl: './customer-shop.component.scss'
})
export class CustomerShopComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly cartService = inject(CartService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private pendingAction: { type: 'addToCart' | 'buyNow'; productId: string } | null = null;

  protected readonly products = signal<Product[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly stockQuantities = signal<Record<string, number>>({});
  protected readonly lowStockProducts = signal<Record<string, boolean>>({});
  protected readonly stockLoading = signal<Record<string, boolean>>({});
  protected readonly stockErrors = signal<Record<string, boolean>>({});
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly detailsVisible = signal(false);
  protected readonly detailsLoading = signal(false);
  protected readonly detailsError = signal('');
  protected readonly buyingProducts = signal<Record<string, boolean>>({});
  protected readonly buyConfirmationVisible = signal(false);
  protected readonly buyConfirmationProduct = signal<Product | null>(null);
  protected readonly loadingPlaceholders = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly sortOrder = signal<'featured' | 'name' | 'price-asc' | 'price-desc'>('featured');

  protected readonly categoryOptions = computed<CategoryOption[]>(() => [
    { label: 'All Categories', value: '' },
    ...Array.from(
      new Map(
        this.products()
          .filter((product) => product.category)
          .map((product) => [product.category.trim().toLowerCase(), product.category.trim()])
      ).entries()
    )
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ]);

  protected readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.selectedCategory();

    const matches = this.products().filter((product) => {
      const matchesSearch =
        !term || product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term);
      const matchesCategory =
        !category || product.category.trim().toLowerCase() === category;
      return product.isActive && matchesSearch && matchesCategory;
    });

    switch (this.sortOrder()) {
      case 'name':
        return matches.sort((a, b) => a.name.localeCompare(b.name));
      case 'price-asc':
        return matches.sort((a, b) => (a.sellPrice ?? 0) - (b.sellPrice ?? 0));
      case 'price-desc':
        return matches.sort((a, b) => (b.sellPrice ?? 0) - (a.sellPrice ?? 0));
      default:
        return matches;
    }
  });

  ngOnInit(): void {
    const requestedUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    let params = new URLSearchParams();
    if (requestedUrl?.startsWith('/shop')) {
      params = new URLSearchParams(requestedUrl.split('?')[1] ?? '');
    }
    const addToCartId = this.route.snapshot.queryParamMap.get('addToCart') ?? params.get('addToCart');
    const buyNowId = this.route.snapshot.queryParamMap.get('buyNow') ?? params.get('buyNow');
    const actionId = addToCartId ?? buyNowId;

    if (actionId && this.authService.isAuthenticated()) {
      this.pendingAction = {
        type: addToCartId ? 'addToCart' : 'buyNow',
        productId: actionId
      };
    } else if (actionId) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    }

    this.loadProducts();
  }

  protected getCategoryCount(categoryValue: string): number {
    if (!categoryValue) {
      return this.products().length;
    }
    return this.products().filter(
      (p) => p.category?.trim().toLowerCase() === categoryValue.toLowerCase()
    ).length;
  }

  protected getProductImageUrl(product: Product): string | null {
    const imageUrl = product.imageUrl?.trim();
    return imageUrl ? this.resolveProductImageUrl(imageUrl) : null;
  }

  private resolveProductImageUrl(imageUrl: string): string {
    if (/^(https?:|data:|blob:)/i.test(imageUrl)) {
      return imageUrl;
    }
    if (imageUrl.startsWith('/')) {
      return `${environment.apiUrl}${imageUrl}`;
    }
    return `${environment.apiUrl}/${imageUrl}`;
  }

  protected hideBrokenImage(event: Event): void {
    (event.currentTarget as HTMLImageElement).style.display = 'none';
  }

  protected loadProducts(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.stockQuantities.set({});
    this.lowStockProducts.set({});
    this.stockErrors.set({});
    this.stockLoading.set({});

    this.productService.getProducts().subscribe({
      next: (products) => {
        const activeProducts = (products ?? []).filter((product) => product.isActive);
        this.products.set(activeProducts);
        this.loading.set(false);
        activeProducts.forEach((product) => this.loadProductStock(product));
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Please check your connection and try again.');
      }
    });
  }

  protected addToCart(product: Product): void {
    if (!this.authService.isAuthenticated()) {
      this.redirectToLogin(`/shop?addToCart=${encodeURIComponent(product.id)}`);
      return;
    }

    if (!this.canPurchase(product) || !this.canAddToCart(product)) {
      return;
    }

    const stock = this.stockQuantities()[product.id] ?? 0;
    if (!this.cartService.addToCart(product, stock)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Stock limit reached',
        detail: `Only ${stock} unit${stock === 1 ? '' : 's'} available in inventory.`,
        life: 3000
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Added to Cart',
      detail: `${product.name} is now in your cart.`,
      life: 2500
    });
  }

  protected openDetails(product: Product): void {
    this.selectedProduct.set(product);
    this.detailsVisible.set(true);
    this.loadProductDetails(product);
  }

  protected loadProductDetails(product: Product): void {
    this.detailsLoading.set(true);
    this.detailsError.set('');
    this.productService.getProductById(product.id).subscribe({
      next: (details) => {
        this.selectedProduct.set(details);
        this.detailsLoading.set(false);
      },
      error: () => {
        this.detailsLoading.set(false);
        this.detailsError.set('We could not load the latest details. Please try again.');
      }
    });
  }

  protected requestBuyNow(product: Product): void {
    if (this.isBuying(product)) {
      return;
    }
    if (!this.authService.isAuthenticated()) {
      this.redirectToLogin(`/shop?buyNow=${encodeURIComponent(product.id)}`);
      return;
    }
    if (!this.canPurchase(product)) return;

    this.buyConfirmationProduct.set(product);
    this.buyConfirmationVisible.set(true);
  }

  protected cancelBuyNow(): void {
    this.buyConfirmationVisible.set(false);
    this.buyConfirmationProduct.set(null);
  }

  protected confirmBuyNow(): void {
    const product = this.buyConfirmationProduct();
    if (!product) {
      return;
    }
    this.buyConfirmationVisible.set(false);
    this.buyNow(product);
  }

  protected buyNow(product: Product): void {
    if (!this.canPurchase(product) || this.isBuying(product)) {
      return;
    }

    const customerId = this.authService.getUserId();
    if (!customerId) {
      this.showOrderError('Your account ID is missing from the login session. Sign out and sign in again.');
      return;
    }

    this.buyingProducts.update((state) => ({ ...state, [product.id]: true }));
    this.productService.getInventoryForProduct(product.id).subscribe({
      next: (inventory) => {
        const warehouseId = this.findWarehouseWithStock(inventory.warehouses ?? [], 1);
        if (!warehouseId) {
          this.buyingProducts.update((state) => ({ ...state, [product.id]: false }));
          this.showOrderError('No warehouse has an available unit of this product right now.');
          return;
        }

        this.orderService.createOrder({
          customerId,
          warehouseId,
          items: [{ productId: product.id, quantity: 1 }]
        }).subscribe({
          next: () => {
            this.buyingProducts.update((state) => ({ ...state, [product.id]: false }));
            this.detailsVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Order placed',
              detail: `${product.name} has been ordered successfully.`,
              life: 3000
            });
            void this.router.navigate(['/my-orders']);
          },
          error: () => {
            this.buyingProducts.update((state) => ({ ...state, [product.id]: false }));
            this.showOrderError('We could not place the order. Please try again.');
          }
        });
      },
      error: () => {
        this.buyingProducts.update((state) => ({ ...state, [product.id]: false }));
        this.showOrderError('We could not verify current inventory. Please try again.');
      }
    });
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('');
  }

  protected formatPrice(value?: number | null): string {
    return Number(value ?? 0).toLocaleString('en-IN');
  }

  protected isStockLoading(product: Product): boolean {
    return !!this.stockLoading()[product.id];
  }

  protected stockError(product: Product): boolean {
    return !!this.stockErrors()[product.id];
  }

  protected isOutOfStock(product: Product): boolean {
    return !this.isStockLoading(product) && !this.stockError(product) && this.stockQuantities()[product.id] === 0;
  }

  protected isLowStock(product: Product): boolean {
    return !!this.lowStockProducts()[product.id] && !this.isOutOfStock(product);
  }

  protected canPurchase(product: Product): boolean {
    return !this.isStockLoading(product) &&
      !this.stockError(product) &&
      (this.stockQuantities()[product.id] ?? 0) > 0;
  }

  protected canAddToCart(product: Product): boolean {
    return this.canPurchase(product) &&
      this.cartService.quantityForProduct(product.id) < (this.stockQuantities()[product.id] ?? 0);
  }

  protected isBuying(product: Product): boolean {
    return !!this.buyingProducts()[product.id];
  }

  protected cartQuantity(product: Product): number {
    return this.cartService.quantityForProduct(product.id);
  }

  protected unitPrice(product: Product): number {
    const price = Number(product.sellPrice ?? 0);
    return Number.isFinite(price) && price >= 0 ? price : 0;
  }

  protected availabilityText(product: Product): string {
    const quantity = this.stockQuantities()[product.id];
    if (quantity === undefined) {
      return 'Checking stock';
    }
    return quantity === 0 ? 'Out of stock' : `${quantity} in stock`;
  }

  protected artClass(product: Product): string {
    const category = product.category?.toLowerCase() || '';
    if (category.includes('electronic')) {
      return 'art-electronics';
    }
    if (category.includes('accessor')) {
      return 'art-accessories';
    }
    return 'art-general';
  }

  private loadProductStock(product: Product): void {
    this.stockLoading.update((values) => ({ ...values, [product.id]: true }));

    this.productService.getInventoryForProduct(product.id).subscribe({
      next: (inventory) => {
        const total = inventory.totalQuantity;
        if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
          this.stockErrors.update((values) => ({ ...values, [product.id]: true }));
          this.stockLoading.update((values) => ({ ...values, [product.id]: false }));
          return;
        }

        this.stockQuantities.update((values) => ({ ...values, [product.id]: total }));
        this.lowStockProducts.update((values) => ({ ...values, [product.id]: inventory.isLowStock }));
        this.stockLoading.update((values) => ({ ...values, [product.id]: false }));
        this.resumePendingAction(product);
      },
      error: () => {
        this.stockErrors.update((values) => ({ ...values, [product.id]: true }));
        this.stockLoading.update((values) => ({ ...values, [product.id]: false }));
      }
    });
  }

  private findWarehouseWithStock(warehouses: InventoryRecord[], quantity: number): string | null {
    return warehouses.find((warehouse) => {
      const available =
        warehouse.availableQuantity ??
        warehouse.quantityOnHand ??
        warehouse.stockQuantity ??
        warehouse.quantity;
      return warehouse.warehouseId &&
        typeof available === 'number' &&
        Number.isFinite(available) &&
        available >= quantity;
    })?.warehouseId ?? null;
  }

  private showOrderError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Unable to place order',
      detail,
      life: 5000
    });
  }

  private redirectToLogin(returnUrl: string): void {
    void this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  private resumePendingAction(product: Product): void {
    const action = this.pendingAction;
    if (!action || action.productId !== product.id || !this.canPurchase(product)) {
      return;
    }

    this.pendingAction = null;
    void this.router.navigate(['/shop'], { replaceUrl: true });

    if (action.type === 'addToCart') {
      this.addToCart(product);
    } else {
      this.requestBuyNow(product);
    }
  }
}
