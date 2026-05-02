import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../../services/infrastructure/auth.service';
import { NotificationService } from '../../../services/ui/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-md mx-auto">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
          <p class="text-sm text-slate-600">
            Necesitás autenticarte para consultar métricas y subir facturas.
          </p>
        </div>

        <form class="space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700" for="username">Usuario</label>
            <input
              id="username"
              type="text"
              pInputText
              class="w-full"
              autocomplete="username"
              formControlName="username"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700" for="password">Contraseña</label>
            <p-password
              inputId="password"
              [feedback]="false"
              [toggleMask]="true"
              [inputStyle]="{ width: '100%' }"
              formControlName="password"
            ></p-password>
          </div>

          <p-button
            type="submit"
            label="Entrar"
            styleClass="w-full rounded-xl"
            [loading]="isLoading"
            [disabled]="form.invalid || isLoading"
          ></p-button>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  isLoading = false;

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isLoading) return;
    this.isLoading = true;
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.signInWithPassword(username, password);
      this.notifications.success('Sesión iniciada');
      await this.router.navigateByUrl('/dashboard');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      this.notifications.error('Login fallido', msg);
    } finally {
      this.isLoading = false;
    }
  }
}

