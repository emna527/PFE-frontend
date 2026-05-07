import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    const role = auth.getRole();
    if (role === 'ADMIN') {
      router.navigate(['/admin-dashboard']);
    } else {
      router.navigate(['/user-dashboard']);
    }
    return false;
  }

  return true;
};