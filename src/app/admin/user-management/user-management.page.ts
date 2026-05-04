import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.page.html',
  styleUrls: ['./user-management.page.scss'],
  standalone: false,
})
export class UserManagementPage implements OnInit {
  pendingUsers: User[] = [];
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadPendingUsers();
  }

  ionViewWillEnter() {
    this.loadPendingUsers();
  }

  async loadPendingUsers() {
    this.pendingUsers = await this.authService.getPendingUsers();
  }

  async approveUser(user: User) {
    const alert = await this.alertController.create({
      header: 'Approve User',
      message: `Are you sure you want to approve ${user.firstName} ${user.lastName}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Approve',
          handler: async () => {
            const success = await this.authService.approveUser(user.id);
            if (success) {
              this.showToast('User approved successfully', 'success');
              this.loadPendingUsers();
            } else {
              this.showToast('Failed to approve user', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async rejectUser(user: User) {
    const alert = await this.alertController.create({
      header: 'Reject User',
      message: `Are you sure you want to reject ${user.firstName} ${user.lastName}? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reject',
          cssClass: 'danger',
          handler: async () => {
            const success = await this.authService.rejectUser(user.id);
            if (success) {
              this.showToast('User rejected successfully', 'success');
              this.loadPendingUsers();
            } else {
              this.showToast('Failed to reject user', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.USER:
        return 'User';
      case UserRole.SALES_TEAM:
        return 'Sales Team';
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.SUPER_ADMIN:
        return 'Super Admin';
      default:
        return role;
    }
  }

  getRoleColor(role: UserRole): string {
    switch (role) {
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

  getEmailVerifiedCount(): number {
    return this.pendingUsers.filter(u => u.isEmailVerified).length;
  }

  getSalesTeamCount(): number {
    return this.pendingUsers.filter(u => u.role === UserRole.SALES_TEAM).length;
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
