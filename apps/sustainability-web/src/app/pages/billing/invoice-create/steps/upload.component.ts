import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

import { toInvoiceDynamoId } from '../../../../core/models/api/appsync-api.models';
import { InvoiceStateService } from '../../../../services/state/invoice-state.service';
import { AppSyncApiService } from '../../../../services/infrastructure/appsync-api.service';
import { S3StorageService } from '../../../../services/infrastructure/s3-storage.service';
import { AuthService } from '../../../../services/infrastructure/auth.service';
import { NotificationService } from '../../../../services/ui/notification.service';
import { WorkflowStateService } from '../../../../services/state/workflow-state.service';

@Component({
  selector: 'app-invoice-upload',
  standalone: true,
  imports: [CommonModule, FileUploadModule, ButtonModule, ToastModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class InvoiceUploadComponent implements OnInit {
  private readonly stateService = inject(InvoiceStateService);
  private readonly appsyncApi = inject(AppSyncApiService);
  private readonly s3Storage = inject(S3StorageService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly workflow = inject(WorkflowStateService);

  @Output() readonly onComplete = new EventEmitter<void>();

  isLoading = false;
  selectedFile: File | null = null;

  async ngOnInit(): Promise<void> {
    await this.auth.ensureSession();
    const saved = this.stateService.getSnapshot();
    this.selectedFile = saved.file;
  }

  onFileSelect(event: { files?: File[] }): void {
    const file = event.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.notifications.show('info', 'Archivo seleccionado', file.name);
    }
  }

  /** Evita envío HTML nativo (recarga completa) — `ngSubmit` requiere NgForm / FormsModule. */
  onFormSubmit(event: Event): void {
    event.preventDefault();
    void this.processAndContinue();
  }

  async processAndContinue(): Promise<void> {
    if (!this.selectedFile) {
      return;
    }

    this.isLoading = true;
    this.workflow.resetIdentification();
    this.workflow.setPhase('uploading');

    try {
      const uuid = crypto.randomUUID();
      const finalId = toInvoiceDynamoId(uuid);

      const { uploadURL, key, invoiceId } = await this.appsyncApi.getPresignedUrl(
        this.selectedFile.name,
        this.selectedFile.type,
        finalId
      );

      const uploadResult = await this.s3Storage.putObject(uploadURL, this.selectedFile);

      if (!uploadResult.success) {
        throw new Error('La subida a S3 falló.');
      }

      this.stateService.setInvoiceId(invoiceId);
      this.stateService.setStorageKey(key);
      this.stateService.setIngestPayload(this.selectedFile);

      this.workflow.setPhase('awaiting_ai');

      this.notifications.success('Subida exitosa', 'Continuando al paso de validación…');

      this.onComplete.emit();
    } catch (error: unknown) {
      this.workflow.setPhase('error');
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.notifications.error('Error de proceso', message);
    } finally {
      this.isLoading = false;
    }
  }
}
