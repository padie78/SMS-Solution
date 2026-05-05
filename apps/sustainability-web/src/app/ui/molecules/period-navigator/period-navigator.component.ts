import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import type { DashboardScale } from '../../../features/dashboard/services/dashboard-temporal-control.service';

interface DropdownOption<T extends string | number> {
  readonly label: string;
  readonly value: T;
}

@Component({
  selector: 'ui-period-navigator',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarModule, DropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (scale) {
      @case ('DAY') {
        <p-calendar
          [ngModel]="referenceDate"
          (ngModelChange)="onDatePicked($event)"
          [showIcon]="true"
          dateFormat="dd M yy"
          styleClass="w-full border-round-xl"
          appendTo="body"
        />
      }
      @case ('WEEK') {
        <p-calendar
          [ngModel]="referenceDate"
          (ngModelChange)="onDatePicked($event)"
          [showIcon]="true"
          dateFormat="dd M yy"
          styleClass="w-full border-round-xl"
          appendTo="body"
        />
      }
      @case ('MONTH') {
        <p-dropdown
          [options]="monthOptions()"
          optionLabel="label"
          optionValue="value"
          [ngModel]="monthIndex()"
          (ngModelChange)="monthChange.emit($event)"
          styleClass="w-full border-round-xl"
          appendTo="body"
        />
      }
      @case ('QUARTER') {
        <div class="flex gap-2 w-full">
          <p-dropdown
            [options]="quarterOptions"
            optionLabel="label"
            optionValue="value"
            [ngModel]="quarterIndex()"
            (ngModelChange)="quarterChange.emit($event)"
            styleClass="w-full border-round-xl"
            appendTo="body"
          />
          <p-dropdown
            [options]="yearOptions()"
            optionLabel="label"
            optionValue="value"
            [ngModel]="year()"
            (ngModelChange)="yearChange.emit($event)"
            styleClass="w-full border-round-xl"
            appendTo="body"
          />
        </div>
      }
      @case ('YEAR') {
        <p-dropdown
          [options]="yearOptions()"
          optionLabel="label"
          optionValue="value"
          [ngModel]="year()"
          (ngModelChange)="yearChange.emit($event)"
          styleClass="w-full border-round-xl"
          appendTo="body"
        />
      }
    }
  `
})
export class PeriodNavigatorComponent {
  @Input({ required: true }) scale!: DashboardScale;
  @Input({ required: true }) referenceDate!: Date;

  @Output() readonly referenceDateChange = new EventEmitter<Date>();
  @Output() readonly monthChange = new EventEmitter<number>();
  @Output() readonly quarterChange = new EventEmitter<number>();
  @Output() readonly yearChange = new EventEmitter<number>();

  private readonly now = signal(new Date());
  readonly quarterOptions: DropdownOption<number>[] = [
    { label: 'T1 (Ene–Mar)', value: 0 },
    { label: 'T2 (Abr–Jun)', value: 1 },
    { label: 'T3 (Jul–Sep)', value: 2 },
    { label: 'T4 (Oct–Dic)', value: 3 }
  ];

  readonly monthIndex = computed(() => this.referenceDate?.getMonth() ?? this.now().getMonth());
  readonly year = computed(() => this.referenceDate?.getFullYear() ?? this.now().getFullYear());
  readonly quarterIndex = computed(() => Math.floor((this.referenceDate?.getMonth() ?? 0) / 3));

  readonly monthOptions = computed((): DropdownOption<number>[] => {
    const base = new Date(2026, 0, 1);
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(base);
      d.setMonth(i);
      const label = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(d);
      return { label: label[0]?.toUpperCase() + label.slice(1), value: i };
    });
  });

  readonly yearOptions = computed((): DropdownOption<number>[] => {
    const current = this.year();
    const start = current - 4;
    const end = current + 1;
    const out: DropdownOption<number>[] = [];
    for (let y = start; y <= end; y += 1) {
      out.push({ label: String(y), value: y });
    }
    return out;
  });

  onDatePicked(value: Date | string | null): void {
    if (!(value instanceof Date)) return;
    this.referenceDateChange.emit(value);
  }
}

