import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginCredentials,
  LoginRequest,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
  RegisterRequest
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly accessTokenKey = 'orderflow-access-token';
  private readonly userIdKey = 'orderflow-user-id';
  private readonly http = inject(HttpClient);
  readonly isAuthenticating = signal(false);
  readonly currentUserName = signal('');
  readonly accessToken = signal(this.readStoredToken());
  readonly currentUserId = signal(this.readStoredUserId());

  setCurrentUser(response: LoginResponse, email: string): void {
    const emailName = email.split('@')[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toLocaleUpperCase() + part.slice(1))
      .join(' ');

    this.currentUserName.set(response.data?.name || response.name || emailName || email);
  }

  logout(): void {
    this.currentUserName.set('');
    this.accessToken.set(null);
    this.currentUserId.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.accessTokenKey);
      window.sessionStorage.removeItem(this.accessTokenKey);
      window.localStorage.removeItem(this.userIdKey);
      window.sessionStorage.removeItem(this.userIdKey);
      window.localStorage.removeItem('customer-token');
      window.sessionStorage.removeItem('customer-token');
      window.localStorage.removeItem('customer-user-id');
      window.sessionStorage.removeItem('customer-user-id');
      window.localStorage.removeItem('customer-user-name');
      window.sessionStorage.removeItem('customer-user-name');
    }
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    const request: LoginRequest = {
      email: credentials.email,
      password: credentials.password
    };

    return this.sendRequest<LoginResponse>('login', request).pipe(
      tap(response => {
        const token =
          response.data?.token ??
          response.data?.accessToken ??
          response.token ??
          response.accessToken;
        if (!token?.trim()) {
          throw new Error('The login response did not include an access token.');
        }

        const userId = response.data?.userId ?? response.userId ?? null;
        const userName = response.data?.name ?? response.name ?? this.nameFromEmail(credentials.email);
        this.storeAuth(token, userId, credentials.rememberMe, credentials.email, userName);
      })
    );
  }

  register(credentials: RegisterCredentials): Observable<RegisterResponse> {
    const request: RegisterRequest = {
      name: credentials.fullName,
      email: credentials.email,
      password: credentials.password
    };

    return this.sendRequest<RegisterResponse>('register', request);
  }

  private sendRequest<TResponse>(
    endpoint: 'login' | 'register',
    request: LoginRequest | RegisterRequest
  ): Observable<TResponse> {
    this.isAuthenticating.set(true);

    return this.http.post<TResponse>(`${environment.apiUrl}/api/Auth/${endpoint}`, request).pipe(
      finalize(() => this.isAuthenticating.set(false))
    );
  }

  private storeAuth(
    token: string,
    userId: string | null,
    rememberMe: boolean,
    email: string,
    userName: string
  ): void {
    this.accessToken.set(token);
    this.currentUserId.set(userId);
    this.currentUserName.set(userName);
    if (typeof window === 'undefined') {
      return;
    }

    const persistentStorage = rememberMe ? window.localStorage : window.sessionStorage;
    const temporaryStorage = rememberMe ? window.sessionStorage : window.localStorage;
    persistentStorage.setItem(this.accessTokenKey, token);
    if (userId) {
      persistentStorage.setItem(this.userIdKey, userId);
    } else {
      persistentStorage.removeItem(this.userIdKey);
    }
    temporaryStorage.removeItem(this.accessTokenKey);
    temporaryStorage.removeItem(this.userIdKey);

    // Keep customer-panel authentication compatible with the shared login.
    persistentStorage.setItem('customer-token', token);
    if (userId) {
      persistentStorage.setItem('customer-user-id', userId);
    } else {
      persistentStorage.removeItem('customer-user-id');
    }
    persistentStorage.setItem('customer-user-name', userName || this.nameFromEmail(email));
    temporaryStorage.removeItem('customer-token');
    temporaryStorage.removeItem('customer-user-id');
    temporaryStorage.removeItem('customer-user-name');
  }

  private nameFromEmail(email: string): string {
    return email.split('@')[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toLocaleUpperCase() + part.slice(1))
      .join(' ') || email;
  }

  private readStoredToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(this.accessTokenKey)
      ?? window.localStorage.getItem(this.accessTokenKey);
  }

  private readStoredUserId(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(this.userIdKey)
      ?? window.localStorage.getItem(this.userIdKey);
  }
}
