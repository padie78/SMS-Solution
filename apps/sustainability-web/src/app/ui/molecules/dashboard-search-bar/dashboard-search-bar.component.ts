import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'ui-dashboard-search-bar',
  standalone: true,
  imports: [InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/25 focus-within:border-emerald-300/80"
    >
      <i class="pi pi-search text-slate-400 text-sm" aria-hidden="true"></i>
      <input
        type="search"
        pInputText
        class="flex-1 min-w-0 bg-transparent border-none text-sm text-slate-800 placeholder:text-slate-400 shadow-none outline-none"
        [placeholder]="placeholder"
        [value]="value"
        (input)="valueChange.emit($any($event.target).value)"
      />
    </div>
  `
})
export class DashboardSearchBarComponent {
  @Input() placeholder = 'Buscar en recomendaciones…';
  @Input() value = '';

  @Output() readonly valueChange = new EventEmitter<string>();
}
