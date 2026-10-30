import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../../core/auth/auth.service';
import { OrderSummary } from '../../../core/models/product.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-customer-order-details',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, ButtonModule, CardModule, SkeletonModule, TagModule],
  templateUrl: './customer-order-details.component.html',
  styleUrl: './customer-order-details.component.scss'
})
export class CustomerOrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);

  protected readonly order = signal<OrderSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.loading.set(false);
      this.errorMessage.set('The order ID is missing from this page.');
      return;
    }

    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        const customerId = this.authService.getUserId();
        if (
          !customerId ||
          !order.customerId ||
          order.customerId.toLowerCase() !== customerId.toLowerCase()
        ) {
          this.loading.set(false);
          this.errorMessage.set('This order is not available in your account.');
          return;
        }

        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Please check your connection and try again.');
      }
    });
  }

  protected statusSeverity(status?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'success';
      case 'cancelled':
      case 'rejected':
        return 'danger';
      case 'processing':
      case 'shipped':
        return 'info';
      case 'pending':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  protected printReceipt(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
