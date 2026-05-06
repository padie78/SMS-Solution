import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { SmsLocationNode } from '../../../core/models/sms-location-node.model';
import { LocationIconAtomComponent } from '../../atoms/location-icon-atom/location-icon-atom.component';
import { LocationStatusBadgeComponent } from '../../atoms/location-status-badge/location-status-badge.component';

@Component({
  selector: 'sms-tree-node-template',
  standalone: true,
  imports: [CommonModule, LocationIconAtomComponent, LocationStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .row {
        width: 100%;
        border-radius: 0.9rem;
        padding: 0.35rem 0.4rem;
        transition:
          background-color 120ms ease,
          box-shadow 120ms ease,
          border-color 120ms ease;
        border: 1px solid transparent;
      }

      :host-context(.p-highlight) .row {
        background: rgba(226, 232, 240, 0.55);
        border-color: rgba(148, 163, 184, 0.55);
      }

      .row:hover {
        background: rgba(241, 245, 249, 0.9);
      }

      .title {
        line-height: 1.1;
      }

      .meta {
        line-height: 1.1;
      }

      .accent {
        width: 0.35rem;
        height: 2rem;
        border-radius: 999px;
      }

      .accent--ORG {
        background: rgba(79, 70, 229, 0.75); /* indigo */
      }
      .accent--REGION {
        background: rgba(37, 99, 235, 0.75); /* blue */
      }
      .accent--BRANCH {
        background: rgba(13, 148, 136, 0.75); /* teal */
      }
      .accent--BUILDING {
        background: rgba(245, 158, 11, 0.75); /* amber */
      }
      .accent--COST_CENTER {
        background: rgba(217, 119, 6, 0.75); /* amber/darker */
      }
      .accent--ASSET {
        background: rgba(16, 185, 129, 0.75); /* emerald */
      }
      .accent--METER {
        background: rgba(234, 179, 8, 0.75); /* yellow */
      }

      .qa {
        opacity: 0;
        pointer-events: none;
        transform: translateX(2px);
        transition:
          opacity 120ms ease,
          transform 120ms ease;
      }

      :host-context(.p-treenode-content:hover) .qa,
      :host-context(.p-treenode:hover) .qa,
      :host-context(.p-treenode-content:focus-within) .qa,
      :host-context(.p-highlight) .qa,
      :host-context(.p-treenode-content.p-highlight) .qa {
        opacity: 1;
        pointer-events: auto;
        transform: translateX(0);
      }

      .qa-btn {
        width: 2rem;
        height: 2rem;
        border-radius: 0.75rem;
        border: 1px solid rgb(226 232 240);
        background: rgba(255, 255, 255, 0.9);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .qa-btn:hover {
        background: rgb(248 250 252);
        border-color: rgb(203 213 225);
      }
    `
  ],
  template: `
    <div class="row flex align-items-center gap-3">
      <div
        class="accent shrink-0"
        [ngClass]="{
          'accent--ORG': node.type === 'ORGANIZATION',
          'accent--REGION': node.type === 'REGION',
          'accent--BRANCH': node.type === 'BRANCH',
          'accent--BUILDING': node.type === 'BUILDING',
          'accent--COST_CENTER': node.type === 'COST_CENTER',
          'accent--ASSET': node.type === 'ASSET',
          'accent--METER': node.type === 'METER'
        }"
        aria-hidden="true"
      ></div>

      <div class="inline-flex align-items-center justify-content-center w-8 h-8 rounded-xl bg-white border border-slate-200 shrink-0">
        <sms-icon-atom [type]="node.type" />
      </div>

      <div class="flex flex-column flex-1 min-w-0 gap-1">
        <div class="title text-slate-900 font-black white-space-nowrap overflow-hidden text-overflow-ellipsis">
          {{ node.name }}
        </div>
        <div class="meta flex align-items-center gap-2 min-w-0">
          <span class="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
            {{ node.type }}
          </span>
          <span class="text-[11px] font-mono font-bold text-slate-500 white-space-nowrap overflow-hidden text-overflow-ellipsis">
            {{ node.location_id }}
          </span>
        </div>
      </div>

      <div class="flex align-items-center gap-2 shrink-0">
        <sms-status-badge [status]="node.status" />
      </div>

      <div class="qa flex align-items-center gap-1 shrink-0" aria-label="Quick actions">
        <button
          type="button"
          class="qa-btn"
          (click)="onCreateChild($event)"
          aria-label="Crear hijo"
          title="Crear hijo"
        >
          <i class="pi pi-plus text-xs text-slate-700" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="qa-btn"
          (click)="onEdit($event)"
          aria-label="Editar"
          title="Editar"
        >
          <i class="pi pi-pencil text-xs text-slate-700" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="qa-btn"
          (click)="onDelete($event)"
          aria-label="Eliminar"
          title="Eliminar"
        >
          <i class="pi pi-trash text-xs text-rose-600" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `
})
export class LocationTreeNodeTemplateComponent {
  @Input({ required: true }) node!: SmsLocationNode;

  @Output() createChild = new EventEmitter<SmsLocationNode>();
  @Output() edit = new EventEmitter<SmsLocationNode>();
  @Output() delete = new EventEmitter<SmsLocationNode>();

  onCreateChild(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.createChild.emit(this.node);
  }

  onEdit(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.edit.emit(this.node);
  }

  onDelete(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.delete.emit(this.node);
  }
}

