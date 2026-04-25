import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

// PrimeNG Modules
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// AWS Amplify Auth 
import { signIn, getCurrentUser } from 'aws-amplify/auth';

// State & AWS Services
import { InvoiceStateService } from '../../../../core/services/invoice-state.service';
import { AppSyncService } from '../../../../core/services/appsync.service';

@Component({
  selector: 'app-invoice-upload',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    FileUploadModule, 
    ButtonModule,
    InputTextModule,
    DropdownModule,
    InputTextareaModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class InvoiceUploadComponent implements OnInit {
  private stateService = inject(InvoiceStateService);
  private appsyncService = inject(AppSyncService);
  private messageService = inject(MessageService);
  
  @Output() onComplete = new EventEmitter<void>();

  isLoading = false;
  selectedFile: File | null = null;

  // --- DATA ESTRUCTURAL ---
  serviceTypes = [
    { label: 'Electricity', value: 'electricity' },
    { label: 'Water', value: 'water' },
    { label: 'Gas', value: 'gas' }
  ];

  buildings = [
    { label: 'Main Headquarters', value: 'bld-01' },
    { label: 'Warehouse North', value: 'bld-02' },
    { label: 'Manufacturing Plant', value: 'bld-03' }
  ];

  costCenters = [
    { label: 'Operations', value: 'cc-ops' },
    { label: 'Administration', value: 'cc-adm' },
    { label: 'Logistics', value: 'cc-log' }
  ];

  private allMeters = [
    { label: 'Main Meter - A1', value: 'MTR-A1', buildingId: 'bld-01' },
    { label: 'Server Room Meter', value: 'MTR-SR', buildingId: 'bld-01' },
    { label: 'HVAC System North', value: 'MTR-HVAC-N', buildingId: 'bld-02' },
    { label: 'Production Line 1', value: 'MTR-PL1', buildingId: 'bld-03' }
  ];

  filteredMeters: any[] = [];

  // --- FORMULARIO ---
  uploadForm = new FormGroup({
    serviceType: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    building: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    meterId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    costCenter: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    internalNote: new FormControl('')
  });

  async ngOnInit() {
    await this.ensureAuthenticated();

    this.uploadForm.get('building')?.valueChanges.subscribe(val => {
      this.filterMeters(val);
    });

    const savedState = this.stateService.getSnapshot();
    if (savedState) {
      this.uploadForm.patchValue({
        building: savedState.building,
        serviceType: savedState.serviceType,
        meterId: savedState.meterId,
        costCenter: savedState.costCenter,
        internalNote: savedState.internalNote
      });
      this.filterMeters(savedState.building);
      this.selectedFile = savedState.file;
    }
  }

  private async ensureAuthenticated() {
    try {
      await getCurrentUser();
    } catch {
      try {
        await signIn({
          username: 'diego_liascovich',
          password: 'DLpdp1980!',
          options: { authFlowType: 'USER_PASSWORD_AUTH' }
        });
      } catch (err) {
        console.error('❌ Auth Error:', err);
      }
    }
  }

  private filterMeters(buildingId: string | null) {
    this.filteredMeters = buildingId ? this.allMeters.filter(m => m.buildingId === buildingId) : [];
    const currentMeter = this.uploadForm.get('meterId')?.value;
    if (!this.filteredMeters.find(m => m.value === currentMeter)) {
      this.uploadForm.get('meterId')?.setValue('');
    }
  }

  onFileSelect(event: any) {
    if (event.files && event.files.length > 0) {
      this.selectedFile = event.files[0];
      this.messageService.add({ severity: 'info', summary: 'Archivo seleccionado', detail: this.selectedFile?.name });
    }
  }

  /**
   * Proceso de subida sincronizado con la Key real de S3
   */
  async processAndContinue() {
    if (this.uploadForm.valid && this.selectedFile) {
      this.isLoading = true;
      
      try {
        // 1. Obtener URL firmada
        console.log('📡 Solicitando Presigned URL...');
        const uploadUrl = await this.appsyncService.getPresignedUrl(
          this.selectedFile.name, 
          this.selectedFile.type
        );

        // 2. Subida a S3 y captura de la KEY REAL (Path completo: uploads/ID/timestamp-file.pdf)
        console.log('📤 Subiendo a S3...');
        const uploadResult = await this.appsyncService.uploadFileToS3(uploadUrl, this.selectedFile);
        
        if (!uploadResult.success || !uploadResult.key) {
          throw new Error("La subida a S3 falló o no devolvió una Key válida.");
        }

        // 3. Persistencia en el Estado Global (UN SOLO BLOQUE)
        console.log('💾 Persistiendo estado con Key:', uploadResult.key);
        
        // Guardamos metadatos del formulario y referencia al archivo
        this.stateService.setStep1Data(this.uploadForm.value, this.selectedFile);
        
        // Seteamos la Key real (la ruta completa en S3) para que la IA la encuentre
        this.stateService.setStorageKey(uploadResult.key); 

        this.messageService.add({ 
          severity: 'success', 
          summary: 'Subida exitosa', 
          detail: 'Archivo listo para análisis de IA.' 
        });
        
        // 4. Continuar al Step 2
        this.onComplete.emit();

      } catch (error: any) {
        console.error('❌ Error en el Pipeline:', error);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error de proceso', 
          detail: error.message || 'Error al sincronizar con el almacenamiento cloud' 
        });
      } finally {
        this.isLoading = false;
      }
    } else {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Formulario incompleto', 
        detail: 'Por favor completa todos los campos y selecciona un PDF.' 
      });
    }
  }
}