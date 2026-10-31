import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../../core/auth/auth.service';
import { OrderPage, OrderSummary } from '../../../core/models/product.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, CardModule, DatePickerModule, SelectModule, SkeletonModule, TagModule],
  templateUrl: './customer-orders.component.html',
  styleUrl: './customer-orders.component.scss'
})
export class CustomerOrdersComponent {
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);

  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly orderSearch = signal('');
  protected readonly statusFilter = signal('');
  protected readonly dateFilter = signal('');
  protected readonly availableStatuses = computed(() =>
    [...new Set(this.orders().map((order) => order.status).filter((status): status is string => !!status))]
      .sort((a, b) => a.localeCompare(b))
  );
  protected readonly today = new Date();
  protected readonly statusOptions = computed(() => [
    { label: 'All statuses', value: '' },
    ...this.availableStatuses().map((status) => ({ label: status, value: status }))
  ]);
  protected readonly dateValue = computed(() => {
    const value = this.dateFilter();
    return value ? new Date(`${value}T00:00:00`) : null;
  });
  protected readonly visibleOrders = computed(() => {
    const query = this.orderSearch().trim().toLowerCase();
    const status = this.statusFilter().toLowerCase();
    const date = this.dateFilter();
    return this.orders().filter((order) => {
      const matchesId =
        !query || `${order.orderNumber ?? ''} ${order.id}`.toLowerCase().includes(query);
      const matchesStatus = !status || order.status?.toLowerCase() === status;
      const matchesDate = !date || order.createdAt?.slice(0, 10) === date;
      return matchesId && matchesStatus && matchesDate;
    });
  });
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = 50;
  protected readonly totalCount = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));
  protected readonly placeholders = [1, 2, 3];

  ngOnInit(): void {
    this.loadOrders();
  }

  protected loadOrders(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.page.set(page);

    const customerId = this.authService.getUserId();
    if (!customerId) {
      this.orders.set([]);
      this.totalCount.set(0);
      this.loading.set(false);
      this.errorMessage.set('We could not identify your customer account. Sign out and sign in again.');
      return;
    }

    this.orderService.getOrders(page, this.pageSize).subscribe({
      next: (result: OrderPage) => {
        const orders = result.orders.filter(
          (order) => order.customerId?.toLowerCase() === customerId.toLowerCase()
        );
        this.orders.set(orders);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.orders.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
        this.errorMessage.set('Please check your connection and try again.');
      }
    });
  }

  protected setDate(value: Date | null): void {
    if (!value) {
      this.dateFilter.set('');
      return;
    }
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    this.dateFilter.set(`${value.getFullYear()}-${month}-${day}`);
  }

  protected clearFilters(): void {
    this.orderSearch.set('');
    this.statusFilter.set('');
    this.dateFilter.set('');
  }

  protected badgeTone(status?: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    const severity = this.statusSeverity(status);
    return severity === 'warn' ? 'warning' : severity === 'secondary' ? 'neutral' : severity;
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
}
