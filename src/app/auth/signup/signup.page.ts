import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { SignupData, UserRole } from '../../models/user.model';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false,
})
export class SignupPage implements OnInit {
  signupData: SignupData = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: UserRole.USER
  };

  confirmPassword: string = '';
  userRoles = UserRole;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/tabs']);
    }
  }

  async signup() {
    if (!this.validateForm()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating account...'
    });
    await loading.present();

    try {
      const response = await this.authService.signup(this.signupData);
      await loading.dismiss();

      if (response.success) {
        this.showAlert('Success', response.message, () => {
          this.router.navigate(['/login']);
        });
      } else {
        this.showAlert('Signup Failed', response.message);
      }
    } catch (error) {
      await loading.dismiss();
      this.showAlert('Error', 'An unexpected error occurred');
    }
  }

  private validateForm(): boolean {
    if (!this.signupData.email || !this.signupData.password || 
        !this.signupData.firstName || !this.signupData.lastName) {
      this.showAlert('Error', 'Please fill in all required fields');
      return false;
    }

    if (this.signupData.password !== this.confirmPassword) {
      this.showAlert('Error', 'Passwords do not match');
      return false;
    }

    if (this.signupData.password.length < 6) {
      this.showAlert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.signupData.email)) {
      this.showAlert('Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private async showAlert(header: string, message: string, handler?: () => void) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: [{
        text: 'OK',
        handler: handler
      }]
    });
    await alert.present();
  }
}
