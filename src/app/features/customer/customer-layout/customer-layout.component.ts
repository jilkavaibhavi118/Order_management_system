import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { ToastModule } from 'primeng/toast';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ButtonModule, PopoverModule, ToastModule],
  templateUrl: './customer-layout.component.html',
  styleUrl: './customer-layout.component.scss'
})
export class CustomerLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  protected readonly cartCount = computed(() => this.cartService.totalItems);
  protected readonly isAuthenticated = computed(() => this.authService.isAuthenticatedState());
  protected readonly accountName = computed(() => this.authService.currentUserName() || 'Account');
  protected readonly accountInitial = computed(() => this.accountName().trim().charAt(0).toUpperCase() || 'U');

  protected logout(popover: Popover): void {
    popover.hide();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
