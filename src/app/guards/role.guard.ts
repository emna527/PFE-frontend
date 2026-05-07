import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    const role = localStorage.getItem('role');

    if (role !== 'ADMIN') {
      // Logged-in users who aren't admins belong on their zone dashboard
      this.router.navigate(['/zone-dashboard']);
      return false;
    }

    return true;
  }
}