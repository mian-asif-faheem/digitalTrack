import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User, UserRole, LoginCredentials, SignupData, AuthResponse } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthRealService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private apiService: ApiService) {
    this.loadCurrentUser();
  }

  private loadCurrentUser() {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verify token with backend and get current user
      this.apiService.getCurrentUser().subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        },
        error: (error) => {
          console.error('Failed to load current user:', error);
          this.logout();
        }
      });
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.apiService.login(credentials).toPromise();
      
      if (response && response.success && response.token) {
        // Store the JWT token
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        
        this.currentUserSubject.next(response.user!);
        this.isAuthenticatedSubject.next(true);
      }
      
      return response || { success: false, message: 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.error?.message || 'Login failed. Please try again.'
      };
    }
  }

  async signup(signupData: SignupData): Promise<AuthResponse> {
    try {
      const response = await this.apiService.signup(signupData).toPromise();
      return response || { success: false, message: 'Signup failed' };
    } catch (error: any) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: error.error?.message || 'Signup failed. Please try again.'
      };
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    try {
      await this.apiService.verifyEmail(token).toPromise();
      return true;
    } catch (error) {
      console.error('Email verification error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await this.apiService.logout().toPromise();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  hasRole(roles: UserRole[]): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser ? roles.includes(currentUser.role) : false;
  }

  isAdmin(): boolean {
    return this.hasRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  }

  isSuperAdmin(): boolean {
    return this.hasRole([UserRole.SUPER_ADMIN]);
  }

  // Admin functions
  async getPendingUsers(): Promise<User[]> {
    try {
      const users = await this.apiService.getPendingUsers().toPromise();
      return users || [];
    } catch (error) {
      console.error('Error fetching pending users:', error);
      return [];
    }
  }

  async approveUser(userId: string): Promise<boolean> {
    try {
      await this.apiService.approveUser(userId).toPromise();
      return true;
    } catch (error) {
      console.error('Error approving user:', error);
      return false;
    }
  }

  async rejectUser(userId: string): Promise<boolean> {
    try {
      await this.apiService.rejectUser(userId).toPromise();
      return true;
    } catch (error) {
      console.error('Error rejecting user:', error);
      return false;
    }
  }
}
