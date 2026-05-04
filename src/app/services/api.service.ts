import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, LoginCredentials, SignupData, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // Authentication endpoints
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials);
  }

  signup(signupData: SignupData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/signup`, signupData);
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-email`, { token });
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, { headers: this.getHeaders() });
  }

  // User management endpoints
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`, { headers: this.getHeaders() });
  }

  getPendingUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/pending-users`, { headers: this.getHeaders() });
  }

  approveUser(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/approve-user/${userId}`, {}, { headers: this.getHeaders() });
  }

  rejectUser(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/reject-user/${userId}`, {}, { headers: this.getHeaders() });
  }

  // Generic API methods
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() });
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, data, { headers: this.getHeaders() });
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${endpoint}`, data, { headers: this.getHeaders() });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() });
  }
}
