import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IncidentCenterBoardComponent } from '../../../ui/organisms/incident-center-board/incident-center-board.component';

@Component({
  selector: 'app-incident-center-page',
  standalone: true,
  imports: [IncidentCenterBoardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-fade-in max-w-[1600px] mx-auto space-y-6 pb-12">
      <header class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs font-bold text-emerald-700 m-0">SMS · Live operations</p>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight mt-1 m-0">Incident Center</h1>
          <p class="text-slate-500 text-sm max-w-3xl leading-relaxed mt-2 m-0">
            Fallos de activo y excesos de emisiones — cola operativa y triage ESG con el mismo ritmo visual que el
            dashboard global.
          </p>
        </div>
      </header>
      <app-incident-center-board />
    </div>
  `
})
export class IncidentCenterPageComponent {}
