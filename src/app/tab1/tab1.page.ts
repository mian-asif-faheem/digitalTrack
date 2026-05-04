import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { User, UserRole } from '../models/user.model';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  currentUser: User | null = null;
  pendingUsersCount: number = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadPendingUsersCount();
  }

  ionViewWillEnter() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadPendingUsersCount();
  }

  loadPendingUsersCount() {
    if (this.isAdmin()) {
      this.pendingUsersCount = this.authService.getPendingUsers().length;
    }
  }

  getRoleDisplayName(): string {
    if (!this.currentUser) return '';
    
    switch (this.currentUser.role) {
      case UserRole.USER:
        return 'User';
      case UserRole.SALES_TEAM:
        return 'Sales Team';
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.SUPER_ADMIN:
        return 'Super Admin';
      default:
        return this.currentUser.role;
    }
  }

  getRoleColor(): string {
    if (!this.currentUser) return 'medium';
    
    switch (this.currentUser.role) {
      case UserRole.USER:
        return 'primary';
      case UserRole.SALES_TEAM:
        return 'secondary';
      case UserRole.ADMIN:
        return 'warning';
      case UserRole.SUPER_ADMIN:
        return 'danger';
      default:
        return 'medium';
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isSalesTeam(): boolean {
    return this.authService.hasRole([UserRole.SALES_TEAM]);
  }

  navigateToAnalytics() {
    this.router.navigate(['/tabs/tab2']);
  }

  navigateToProfile() {
    this.router.navigate(['/tabs/tab3']);
  }

  navigateToUserManagement() {
    this.router.navigate(['/admin/user-management']);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: async () => {
            await this.authService.logout();
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }
}
