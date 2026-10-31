import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('orderflow-access-token');
    sessionStorage.removeItem('orderflow-access-token');
    localStorage.removeItem('orderflow-user-id');
    sessionStorage.removeItem('orderflow-user-id');
    localStorage.removeItem('customer-token');
    sessionStorage.removeItem('customer-token');
    localStorage.removeItem('customer-user-id');
    sessionStorage.removeItem('customer-user-id');
    localStorage.removeItem('customer-user-name');
    sessionStorage.removeItem('customer-user-name');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('orderflow-access-token');
    sessionStorage.removeItem('orderflow-access-token');
    localStorage.removeItem('orderflow-user-id');
    sessionStorage.removeItem('orderflow-user-id');
    localStorage.removeItem('customer-token');
    sessionStorage.removeItem('customer-token');
    localStorage.removeItem('customer-user-id');
    sessionStorage.removeItem('customer-user-id');
    localStorage.removeItem('customer-user-name');
    sessionStorage.removeItem('customer-user-name');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('uses the API profile name for the header when present', () => {
    service.setCurrentUser({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: 'Vaibhavi Jilka',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'test-token'
      },
      errors: []
    }, 'vaibhavi.jilka@example.com');

    expect(service.currentUserName()).toBe('Vaibhavi Jilka');
  });

  it('derives a readable header name from the login email when no profile name is returned', () => {
    service.setCurrentUser({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: '',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'test-token'
      },
      errors: []
    }, 'vaibhavi.jilka@example.com');

    expect(service.currentUserName()).toBe('Vaibhavi Jilka');
  });

  it('clears the current user name on logout', () => {
    service.setCurrentUser({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: 'Vaibhavi Jilka',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'test-token'
      },
      errors: []
    }, 'vaibhavi.jilka@example.com');

    service.logout();

    expect(service.currentUserName()).toBe('');
    expect(service.accessToken()).toBeNull();
  });

  it('stores the login token in persistent storage when remember me is enabled', () => {
    service.login({
      email: 'vaibhavi.jilka@example.com',
      password: 'password',
      rememberMe: true
    }).subscribe();

    httpTestingController.expectOne(`${environment.apiUrl}/api/Auth/login`).flush({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: 'Vaibhavi Jilka',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'access-token'
      },
      errors: []
    });

    expect(service.accessToken()).toBe('access-token');
    expect(service.currentUserId()).toBe('user-id');
    expect(localStorage.getItem('orderflow-access-token')).toBe('access-token');
    expect(localStorage.getItem('orderflow-user-id')).toBe('user-id');
    expect(sessionStorage.getItem('orderflow-access-token')).toBeNull();
  });

  it('stores the login token for the current browser session when remember me is disabled', () => {
    service.login({
      email: 'vaibhavi.jilka@example.com',
      password: 'password',
      rememberMe: false
    }).subscribe();

    httpTestingController.expectOne(`${environment.apiUrl}/api/Auth/login`).flush({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: 'Vaibhavi Jilka',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'access-token'
      },
      errors: []
    });

    expect(service.accessToken()).toBe('access-token');
    expect(service.currentUserId()).toBe('user-id');
    expect(sessionStorage.getItem('orderflow-access-token')).toBe('access-token');
    expect(sessionStorage.getItem('orderflow-user-id')).toBe('user-id');
    expect(localStorage.getItem('orderflow-access-token')).toBeNull();
  });

  it('stores a top-level access token and keeps the customer panel signed in', () => {
    service.login({
      email: 'vaibhavi.jilka@example.com',
      password: 'password',
      rememberMe: false
    }).subscribe();

    httpTestingController.expectOne(`${environment.apiUrl}/api/Auth/login`).flush({
      success: true,
      message: 'Logged in',
      token: 'access-token',
      name: 'Vaibhavi Jilka'
    });

    expect(service.accessToken()).toBe('access-token');
    expect(service.currentUserName()).toBe('Vaibhavi Jilka');
    expect(sessionStorage.getItem('customer-token')).toBe('access-token');
    expect(sessionStorage.getItem('customer-user-name')).toBe('Vaibhavi Jilka');
  });

  it('rejects a successful login response without a token', () => {
    let loginError: unknown;
    service.login({
      email: 'vaibhavi.jilka@example.com',
      password: 'password',
      rememberMe: false
    }).subscribe({ error: error => loginError = error });

    httpTestingController.expectOne(`${environment.apiUrl}/api/Auth/login`).flush({
      success: true,
      message: 'Logged in'
    });

    expect(loginError).toBeInstanceOf(Error);
    expect((loginError as Error).message).toContain('access token');
    expect(service.accessToken()).toBeNull();
  });
});
