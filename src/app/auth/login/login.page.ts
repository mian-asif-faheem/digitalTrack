import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../models/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  credentials: LoginCredentials = {
    email: '',
    password: ''
  };

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

  async login() {
    if (!this.credentials.email || !this.credentials.password) {
      this.showAlert('Error', 'Please enter both email and password');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Logging in...'
    });
    await loading.present();

    try {
      const response = await this.authService.login(this.credentials);
      await loading.dismiss();

      if (response.success) {
        this.router.navigate(['/tabs']);
      } else {
        this.showAlert('Login Failed', response.message);
      }
    } catch (error) {
      await loading.dismiss();
      this.showAlert('Error', 'An unexpected error occurred');
    }
  }

  fillCredentials(email: string, password: string) {
    this.credentials.email = email;
    this.credentials.password = password;
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
