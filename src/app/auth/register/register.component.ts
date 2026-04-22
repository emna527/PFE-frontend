import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  form = this.fb.group({
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    nomComplet:      ['', Validators.required],
    tel:             ['', Validators.required],
    telegram:        ['', Validators.required],
    areaName:        ['', Validators.required]
  }, { validators: this.passwordsMatch });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  passwordsMatch(group: any) {
    const pass    = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { passwordMismatch: true };
  }

  onRegister() {
    if (this.form.valid) {
      const userData = {
        nomComplet: this.form.value.nomComplet,
        email:      this.form.value.email,
        password:   this.form.value.password,
        tel:        this.form.value.tel,
        telegram:   this.form.value.telegram,
        areaName:   this.form.value.areaName,
        role:       'USER'
      };
      this.authService.register(userData).subscribe({
        next: () => {
          alert('Votre demande a été envoyée. En attente d\'approbation par l\'administrateur.');
          this.router.navigate(['/login']);
        },
        error: (err: any) => {
          alert(err.error?.error || 'Erreur lors de l\'inscription');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}