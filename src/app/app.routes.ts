import { Component } from '@angular/core';
import { RouterLink, Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

@Component({
  selector: 'app-dashboard-unavailable',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main>
      <h1>Admin panel is not available</h1>
      <p>The admin dashboard has not been added to this application yet.</p>
      <a routerLink="/shop">Continue to the customer shop</a>
    </main>
  `
})
class DashboardUnavailableComponent {}

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/customer/customer-layout/customer-layout.component').then(
        (module) => module.CustomerLayoutComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'shop'
      },
      {
        path: 'shop',
        loadComponent: () =>
          import('./features/customer/customer-shop/customer-shop.component').then(
            (module) => module.CustomerShopComponent
          )
      },
      {
        path: 'product/:id',
        loadComponent: () => import('./features/customer/product-details/product-details.component').then(m => m.ProductDetailsComponent)
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/customer/customer-profile/customer-profile.component').then(m => m.CustomerProfileComponent)
      },
      {
        path: 'cart',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/customer/customer-cart/customer-cart.component').then(
            (module) => module.CustomerCartComponent
          )
      },
      {
        path: 'my-orders/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/customer/customer-order-details/customer-order-details.component').then(
            (module) => module.CustomerOrderDetailComponent
          )
      },
      {
        path: 'my-orders',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/customer/customer-orders/customer-orders.component').then(
            (module) => module.CustomerOrdersComponent
          )
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/customer/login/login.component').then((module) => module.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/customer/register/register.component').then(
        (module) => module.RegisterComponent
      )
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    component: DashboardUnavailableComponent
  },
  {
    path: '**',
    redirectTo: 'shop'
  }
];
