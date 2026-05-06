import { Component } from '@angular/core';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { UserRole } from '../models/user.model';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  constructor(public authSvc: FirebaseAuthService) {}

  get isSuperAdmin(): boolean {
    return this.authSvc.currentUser?.role === UserRole.SUPER_ADMIN;
  }
}
