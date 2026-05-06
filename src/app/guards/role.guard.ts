import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: FirebaseAuthService,
    private router: Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    await this.authService.waitForAuthReady();

    const requiredRoles = route.data['roles'] as UserRole[];

    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return false;
    }

    if (requiredRoles && !this.authService.hasRole(requiredRoles)) {
      this.router.navigate(['/tabs/tab1']);
      return false;
    }

    return true;
  }
}
