import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FirebaseAuthService } from '../services/firebase-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: FirebaseAuthService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    await this.authService.waitForAuthReady();

    if (this.authService.isAuthenticated()) {
      return true;
    }

    this.router.navigateByUrl('/login', { replaceUrl: true });
    return false;
  }
}
