import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { UiBadgeComponent } from '../../../../ui/atoms/ui-badge/ui-badge.component';

@Component({
  selector: 'app-invoice-review-step',
  standalone: true,
  imports: [CommonModule, TranslateModule, DividerModule, TagModule, UiBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-review-step.component.html'
})
export class InvoiceReviewStepComponent {
  @Input() file: File | null = null;
  @Input() dynamoPreviewJson = '';

  protected formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
