import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-route-placeholder',
  standalone: true,
  template: `
    <section class="route-placeholder surface-ground border-round-xl p-5 md:p-6 shadow-1 border-1 surface-border">
      <header class="mb-4">
        <p class="text-xs font-semibold uppercase text-primary mb-2 tracking-wide">{{ navBadgeLabel() }}</p>
        <h1 class="text-2xl md:text-3xl font-bold text-color m-0 leading-tight">{{ title() }}</h1>
        <p class="text-color-secondary mt-2 mb-0 max-w-prose leading-relaxed">{{ subtitle() }}</p>
      </header>
      <div class="surface-100 border-round-lg p-4 border-1 surface-border">
        <p class="text-sm text-color-secondary m-0 font-mono">
          Route reserve — wire domain module when backend/UI está listo.
        </p>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .route-placeholder {
        max-width: 52rem;
      }
    `
  ]
})
export class RoutePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly data = toSignal(
    this.route.data.pipe(
      startWith(this.route.snapshot.data),
      map((d) => ({
        navTitle: String(d['navTitle'] ?? 'SMS'),
        navSubtitle: String(d['navSubtitle'] ?? ''),
        navBadge: String(d['navBadge'] ?? 'Roadmap')
      }))
    ),
    {
      initialValue: {
        navTitle: 'SMS',
        navSubtitle: '',
        navBadge: 'Roadmap'
      }
    }
  );

  readonly title = computed(() => this.data().navTitle);
  readonly subtitle = computed(() => this.data().navSubtitle);
  readonly navBadgeLabel = computed(() => this.data().navBadge);
}
