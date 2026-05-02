import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { AuthService } from '../../services/infrastructure/auth.service';
import { SetupApiService } from '../../services/infrastructure/setup-api.service';
import { NotificationService } from '../../services/ui/notification.service';
import { SetupContextService } from '../../services/state/setup-context.service';
import {
  SETUP_PAGE_REGISTRY,
  type SetupFieldDef,
  type SetupPageKey,
  type SetupPageRegistryEntry
} from './setup-pages.registry';

@Component({
  selector: 'app-setup-mutation-shell',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">{{ entry.title }}</h1>
        <p class="text-slate-500 mt-2 text-sm leading-relaxed">{{ entry.subtitle }}</p>
        <p *ngIf="orgHint" class="text-xs font-mono text-emerald-700 mt-3">
          Organización (JWT): {{ orgHint }}
        </p>
      </header>
      <section class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
          <ng-container *ngFor="let f of entry.fields">
            <div *ngIf="f.type !== 'checkbox'" class="flex flex-col gap-1.5">
              <label [for]="f.key" class="text-[10px] font-bold uppercase tracking-wider text-slate-600">{{
                f.label
              }}</label>
              <input
                *ngIf="f.type === 'text'"
                [id]="f.key"
                type="text"
                pInputText
                class="w-full rounded-xl"
                [formControlName]="f.key"
              />
              <input
                *ngIf="f.type === 'number'"
                [id]="f.key"
                type="number"
                pInputText
                class="w-full rounded-xl"
                [formControlName]="f.key"
              />
            </div>
            <label *ngIf="f.type === 'checkbox'" class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" [formControlName]="f.key" class="rounded border-slate-300" />
              <span class="text-sm text-slate-700">{{ f.label }}</span>
            </label>
          </ng-container>
          <div class="pt-4 flex justify-end">
            <p-button
              type="submit"
              label="Guardar en AppSync"
              icon="pi pi-cloud-upload"
              [loading]="submitting"
              styleClass="p-button-emerald font-bold rounded-xl"
            ></p-button>
          </div>
        </form>
      </section>
    </div>
  `
})
export class SetupMutationShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SetupApiService);
  private readonly ctx = inject(SetupContextService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  pageKey!: SetupPageKey;
  entry!: SetupPageRegistryEntry;
  form!: FormGroup;
  submitting = false;
  orgHint: string | null = null;

  ngOnInit(): void {
    this.pageKey = this.route.snapshot.data['setupPage'] as SetupPageKey;
    const reg = SETUP_PAGE_REGISTRY[this.pageKey];
    if (!reg) {
      throw new Error(`Unknown setup page: ${this.pageKey}`);
    }
    this.entry = reg;

    const controls: Record<string, FormControl> = {};
    for (const f of reg.fields) {
      const initial =
        f.default !== undefined
          ? f.default
          : f.type === 'checkbox'
            ? false
            : f.type === 'number'
              ? null
              : '';
      controls[f.key] = new FormControl(initial);
    }
    this.form = this.fb.group(controls);
    this.hydrateContextDefaults(reg.fields);
    void this.hydrateAuthDefaults();
  }

  private hydrateContextDefaults(fields: SetupFieldDef[]): void {
    const keys = new Set(fields.map((f) => f.key));
    const patch: Record<string, string> = {};
    if (keys.has('branchId') && this.ctx.branchId()) {
      patch['branchId'] = this.ctx.branchId();
    }
    if (keys.has('buildingId') && this.ctx.buildingId()) {
      patch['buildingId'] = this.ctx.buildingId();
    }
    if (Object.keys(patch).length) {
      this.form.patchValue(patch);
    }
  }

  private async hydrateAuthDefaults(): Promise<void> {
    const org = await this.auth.getOrganizationIdClaim();
    this.orgHint = org;
    if (this.pageKey === 'user') {
      const uid = await this.auth.getCurrentUserId();
      if (uid && !String(this.form.get('userId')?.value ?? '').trim()) {
        this.form.patchValue({ userId: uid });
        this.cdr.markForCheck();
      }
    }
  }

  async onSubmit(): Promise<void> {
    this.submitting = true;
    try {
      const raw = this.form.getRawValue() as Record<string, unknown>;
      const result = await this.entry.submit(this.api, this.ctx, raw);
      if (result.success) {
        this.notifications.success('Configuración', result.message ?? 'Guardado correctamente');
      } else {
        this.notifications.error('No se guardó', result.message ?? 'success = false');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      this.notifications.error('AppSync', msg);
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }
}
