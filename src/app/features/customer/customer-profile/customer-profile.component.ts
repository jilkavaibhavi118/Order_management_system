import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-customer-profile', standalone: true, imports: [CommonModule, RouterLink, ButtonModule, TagModule],
  templateUrl: './customer-profile.component.html',
  styleUrl: './customer-profile.component.scss'
})
export class CustomerProfileComponent {
  private readonly auth=inject(AuthService); private readonly router=inject(Router);
  get name():string{return this.auth.currentUserName()||'Customer'}
  get email():string{return this.auth.currentUserEmail()}
  get userId():string{return this.auth.getUserId()||''}
  get initials():string{return this.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'C'}
  logout():void{this.auth.logout();void this.router.navigate(['/login'])}
}
