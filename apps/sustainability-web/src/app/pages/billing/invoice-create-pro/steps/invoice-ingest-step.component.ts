import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { UiBadgeComponent } from '../../../../ui/atoms/ui-badge/ui-badge.component';

@Component({
  selector: 'app-invoice-ingest-step',
  standalone: true,
  imports: [CommonModule, TranslateModule, FileUploadModule, ButtonModule, UiBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-ingest-step.component.html'
})
export class InvoiceIngestStepComponent {
  @Input() file: File | null = null;

  @Output() readonly fileSelected = new EventEmitter<{ files: File[] }>();
  @Output() readonly fileRemoved = new EventEmitter<void>();

  protected formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
