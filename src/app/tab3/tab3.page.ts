import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { ThemeService } from '../services/theme.service';
import { User, UserRole } from '../models/user.model';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  currentUser: User | null = null;
  isEditing = false;

  editForm = { firstName: '', lastName: '' };

  constructor(
    private authService: FirebaseAuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    public themeSvc: ThemeService,
  ) {}

  ngOnInit() {
    this.loadUser();
  }

  ionViewWillEnter() {
    this.loadUser();
  }

  loadUser() {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.editForm.firstName = this.currentUser.firstName;
      this.editForm.lastName = this.currentUser.lastName;
    }
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}`.toUpperCase();
  }

  getRoleLabel(): string {
    switch (this.currentUser?.role) {
      case UserRole.SUPER_ADMIN: return 'Super Admin';
      case UserRole.ADMIN:       return 'Admin';
      case UserRole.SALES_TEAM:  return 'Sales Team';
      case UserRole.USER:        return 'User';
      default:                   return '';
    }
  }

  getRoleColor(): string {
    switch (this.currentUser?.role) {
      case UserRole.SUPER_ADMIN: return 'danger';
      case UserRole.ADMIN:       return 'warning';
      case UserRole.SALES_TEAM:  return 'success';
      case UserRole.USER:        return 'primary';
      default:                   return 'medium';
    }
  }

  startEdit() {
    this.editForm.firstName = this.currentUser?.firstName ?? '';
    this.editForm.lastName = this.currentUser?.lastName ?? '';
    this.isEditing = true;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  async saveProfile() {
    if (!this.editForm.firstName.trim() || !this.editForm.lastName.trim()) {
      this.showToast('First and last name are required.', 'warning');
      return;
    }

    const loading = await this.loadingController.create({ message: 'Saving...' });
    await loading.present();

    const result = await this.authService.updateUserProfile(
      this.editForm.firstName.trim(),
      this.editForm.lastName.trim()
    );

    await loading.dismiss();
    this.isEditing = false;
    this.loadUser();
    this.showToast(result.message, result.success ? 'success' : 'danger');
  }

  async onThemeToggle(event: any) {
    await this.themeSvc.setTheme(event.detail.checked ? 'dark' : 'light');
  }

  async openChangePassword() {
    const alert = await this.alertController.create({
      header: 'Change Password',
      inputs: [
        { name: 'current', type: 'password', placeholder: 'Current password' },
        { name: 'newPass', type: 'password', placeholder: 'New password' },
        { name: 'confirm', type: 'password', placeholder: 'Confirm new password' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Change',
          handler: async (data) => {
            if (!data.current || !data.newPass || !data.confirm) {
              this.showToast('All fields are required.', 'warning');
              return false;
            }
            if (data.newPass !== data.confirm) {
              this.showToast('New passwords do not match.', 'warning');
              return false;
            }
            if (data.newPass.length < 6) {
              this.showToast('Password must be at least 6 characters.', 'warning');
              return false;
            }

            const loading = await this.loadingController.create({ message: 'Updating password...' });
            await loading.present();
            const result = await this.authService.changePassword(data.current, data.newPass);
            await loading.dismiss();
            this.showToast(result.message, result.success ? 'success' : 'danger');
            return result.success;
          }
        }
      ]
    });
    await alert.present();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Logout',
          role: 'destructive',
          handler: async () => {
            await this.authService.logout();
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
