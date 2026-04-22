import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  showPassword = false;
  loginError   = '';

  forgotForm = this.fb.group({
    forgotEmail: ['', [Validators.required, Validators.email]]
  });

  verifyForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  resetForm = this.fb.group({
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  showForgot   = false;
  fpStep       = 1;
  fpLoading    = false;
  fpSentEmail  = '';
  fpError      = '';
  fpSuccess    = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  submit() {
    if (!this.form.valid) return;
    this.loginError = '';
    this.auth.login(this.form.value).subscribe({
      next: (res: any) => {
        localStorage.setItem('token',    res.token);
        localStorage.setItem('role',     res.role);
        localStorage.setItem('zoneId',   res.zoneId   ?? '');
        localStorage.setItem('siteName', res.siteName ?? '');
        if (res.role === 'ADMIN') {
          this.router.navigateByUrl('/admin-dashboard', { replaceUrl: true });
        } else {
          this.router.navigateByUrl('/zone-dashboard', { replaceUrl: true });
        }
      },
      error: (err: any) => {
    if (err.status === 403) {
        this.loginError = err.error?.error || 'Accès refusé.';
    } else if (err.status === 401) {
        this.loginError = 'Email ou mot de passe incorrect.';
    } else {
        this.loginError = err.error?.error || 'Erreur lors du login.';
    }
}
    });
  }

  openForgot() {
    this.showForgot = true;
    this.fpStep     = 1;
    this.fpError    = '';
    this.fpSuccess  = '';
    this.loginError = '';
    this.forgotForm.reset();
    this.verifyForm.reset();
    this.resetForm.reset();
  }

  backToLogin() {
    this.showForgot = false;
    this.fpStep     = 1;
    this.fpError    = '';
    this.fpSuccess  = '';
  }

  submitForgot() {
  if (this.forgotForm.invalid) return;
  this.fpLoading = true;
  this.fpError   = '';
  const email    = this.forgotForm.value.forgotEmail!;

  this.auth.forgotPassword(email).subscribe({
    next: (res: any) => {
      this.fpLoading = false;
      if (res && res.success === false) {
        this.snackBar.open(res.message || 'Cet email n\'existe pas.', '✕', {
          duration: 4000,
          panelClass: ['snack-error'],
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        return;
      }
      this.fpSentEmail = email;
      this.fpStep      = 2;
    },
    error: (err: any) => {
      this.fpLoading = false;
      this.snackBar.open(err.error?.message || 'Erreur lors de l\'envoi du code.', '✕', {
        duration: 4000,
        panelClass: ['snack-error'],
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
    }
  });
}

  submitVerify() {
    if (this.verifyForm.invalid) return;
    this.fpLoading = true;
    this.fpError   = '';
    const code     = this.verifyForm.value.code!;

    this.auth.verifyResetCode(this.fpSentEmail, code).subscribe({
      next: () => {
        this.fpLoading = false;
        this.fpStep    = 3;
      },
      error: (err: any) => {
        this.fpLoading = false;
        this.fpError   = err.error?.message || 'Code incorrect ou expiré.';
      }
    });
  }

  submitReset() {
    if (this.resetForm.invalid) return;
    const { newPassword, confirmPassword } = this.resetForm.value;
    if (newPassword !== confirmPassword) {
      this.fpError = 'Les mots de passe ne correspondent pas.';
      return;
    }
    this.fpLoading = true;
    this.fpError   = '';

    this.auth.resetPassword(
      this.fpSentEmail,
      this.verifyForm.value.code!,
      newPassword!,
      confirmPassword!
    ).subscribe({
      next: () => {
        this.fpLoading  = false;
        this.fpSuccess  = 'Mot de passe modifié avec succès !';
        setTimeout(() => this.backToLogin(), 2000);
      },
      error: (err: any) => {
        this.fpLoading = false;
        this.fpError   = err.error?.message || 'Erreur lors de la réinitialisation.';
      }
    });
  }
}