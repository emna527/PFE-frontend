import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const userGuard: CanActivateFn = () => {
  const router = inject(Router);
  const role = localStorage.getItem('role');

  if (role === 'ADMIN') {
    // Admins don't belong here — send them to their dashboard
    router.navigate(['/energy-dashboard']);
    return false;
  }

  return true;
};