import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User, UserRole, LoginCredentials, SignupData, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Mock database - In a real app, this would be replaced with actual backend calls
  private users: User[] = [
    {
      id: '1',
      email: 'admin@digitaltrack.com',
      password: 'admin123', // In real app, this would be hashed
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      email: 'superadmin@digitaltrack.com',
      password: 'superadmin123',
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  private pendingUsers: User[] = [];

  constructor() {
    this.loadCurrentUser();
  }

  private loadCurrentUser() {
    try {
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const user = this.users.find(u => 
        u.email === credentials.email && u.password === credentials.password
      );

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      if (!user.isEmailVerified) {
        return {
          success: false,
          message: 'Please verify your email before logging in'
        };
      }

      if (!user.isApproved) {
        return {
          success: false,
          message: 'Your account is pending approval by an administrator'
        };
      }

      // Remove password from user object before storing
      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;

      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      this.currentUserSubject.next(userWithoutPassword);
      this.isAuthenticatedSubject.next(true);

      return {
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        token: this.generateToken(user.id)
      };
    } catch (error) {
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  async signup(signupData: SignupData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = this.users.find(u => u.email === signupData.email) ||
                          this.pendingUsers.find(u => u.email === signupData.email);

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      const newUser: User = {
        id: this.generateId(),
        email: signupData.email,
        password: signupData.password, // In real app, this would be hashed
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        role: signupData.role || UserRole.USER,
        isEmailVerified: false,
        isApproved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.pendingUsers.push(newUser);

      // Simulate email verification (in real app, send actual email)
      setTimeout(() => {
        this.verifyEmail(newUser.id);
      }, 2000);

      return {
        success: true,
        message: 'Account created successfully. Please check your email for verification.'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Signup failed. Please try again.'
      };
    }
  }

  async verifyEmail(userId: string): Promise<boolean> {
    const userIndex = this.pendingUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.pendingUsers[userIndex].isEmailVerified = true;
      this.pendingUsers[userIndex].updatedAt = new Date();
      return true;
    }
    return false;
  }

  async logout(): Promise<void> {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
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
  getPendingUsers(): User[] {
    return this.pendingUsers.filter(u => u.isEmailVerified && !u.isApproved);
  }

  async approveUser(userId: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !this.isAdmin()) {
      return false;
    }

    const userIndex = this.pendingUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const user = this.pendingUsers[userIndex];
      user.isApproved = true;
      user.approvedBy = currentUser.id;
      user.approvedAt = new Date();
      user.updatedAt = new Date();

      // Move user from pending to approved users
      this.users.push(user);
      this.pendingUsers.splice(userIndex, 1);
      return true;
    }
    return false;
  }

  async rejectUser(userId: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !this.isAdmin()) {
      return false;
    }

    const userIndex = this.pendingUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.pendingUsers.splice(userIndex, 1);
      return true;
    }
    return false;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateToken(userId: string): string {
    // In a real app, use proper JWT token generation
    return btoa(userId + ':' + Date.now());
  }
}
