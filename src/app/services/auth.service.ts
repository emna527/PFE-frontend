import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private baseUrl     = 'http://localhost:8081/api/auth';
  private resetUrl    = 'http://localhost:8081/api/auth/password-reset';

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials);
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, userData);
  }

  //Envoyer le code OTP par email
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.resetUrl}/send-code`, { email });
  }

  //Vérifier le code OTP
  verifyResetCode(email: string, code: string): Observable<any> {
    return this.http.post(`${this.resetUrl}/verify-code`, { email, code });
  }

  // Réinitialiser le mot de passe
  resetPassword(email: string, code: string,
                newPassword: string, confirmPassword: string): Observable<any> {
    return this.http.post(`${this.resetUrl}/reset`,
      { email, code, newPassword, confirmPassword });
  }

  getRole(): string | null     { return localStorage.getItem('role'); }
  // ✅après — corrigé
getToken(): string | null {
  return localStorage.getItem('token');
}

getZoneId(): number | null {
  const z = localStorage.getItem('zoneId');
  return z ? +z : null;
}
  getSiteName(): string | null { return localStorage.getItem('siteName'); }
  isLoggedIn(): boolean        { return !!localStorage.getItem('token'); }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('zoneId');
    localStorage.removeItem('siteName');
  }
}