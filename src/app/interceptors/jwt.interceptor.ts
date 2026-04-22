import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const PROTECTED_URLS = [
  'localhost:8081',
  'localhost:8083',
  'sfmconnect-test-api.sfmtechnologies.net'
];

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const shouldAttach = PROTECTED_URLS.some(url => req.url.includes(url));

  if (token && shouldAttach) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req);
};