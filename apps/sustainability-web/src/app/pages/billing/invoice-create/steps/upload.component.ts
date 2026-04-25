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

// State & AWS Services - Rutas corregidas para 3 niveles desde steps/
import { InvoiceStateService } from '../../../../core/services/invoice-state.service';
import { AppSyncService } from '../../../../core/services/appsync.service';

/**
 * Interfaz para el tipado del estado y evitar errores de 'unknown'
 */
interface InvoiceStateSnapshot {
  file: File | null;
  building?: string;
  serviceType?: string;
  meterId?: string;
  costCenter?: string;
  internalNote?: string;
  [key: string]: any;
}

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

  // --- MOCK DATA PARA SMS SYSTEM ---
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

  // --- FORMULARIO REACTIVO ---
  uploadForm = new FormGroup({
    serviceType: new FormControl('', [Validators.required]),
    building: new FormControl('', [Validators.required]),
    meterId: new FormControl('', [Validators.required]),
    costCenter: new FormControl('', [Validators.required]),
    internalNote: new FormControl('')
  });

  async ngOnInit() {
    // 1. Asegurar sesión activa (USER_PASSWORD_AUTH para desarrollo/scripts)
    await this.ensureAuthenticated();

    // 2. Reactividad para filtrado de medidores por edificio
    this.uploadForm.get('building')?.valueChanges.subscribe(val => {
      this.filterMeters(val);
    });

    // 3. Restauración de estado persistido (si el usuario vuelve atrás)
    const savedState = this.stateService.getSnapshot() as InvoiceStateSnapshot;
    if (savedState && (savedState.building || savedState.file)) {
      this.uploadForm.patchValue({
        building: savedState.building,
        serviceType: savedState.serviceType,
        meterId: savedState.meterId,
        costCenter: savedState.costCenter,
        internalNote: savedState.internalNote
      });
      this.filterMeters(savedState.building || null);
      this.selectedFile = savedState.file;
    }
  }

  private async ensureAuthenticated() {
    try {
      await getCurrentUser();
      console.log('✅ AWS Auth: Session Active');
    } catch {
      console.log('🔐 Initiating login with USER_PASSWORD_AUTH...');
      try {
        await signIn({
          username: 'diego_liascovich',
          password: 'DLpdp1980!',
          options: { authFlowType: 'USER_PASSWORD_AUTH' }
        });
        console.log('🚀 AWS Auth: Login Success');
      } catch (err) {
        console.error('❌ AWS Auth Error:', err);
      }
    }
  }

  private filterMeters(buildingId: string | null) {
    this.filteredMeters = buildingId ? this.allMeters.filter(m => m.buildingId === buildingId) : [];
    
    // Validar que el medidor seleccionado siga siendo válido para el edificio
    const currentMeter = this.uploadForm.get('meterId')?.value;
    if (!this.filteredMeters.find(m => m.value === currentMeter)) {
      this.uploadForm.get('meterId')?.setValue('');
    }
  }

  onFileSelect(event: any) {
    if (event.files && event.files.length > 0) {
      this.selectedFile = event.files[0];
      this.messageService.add({ severity: 'info', summary: 'File Selected', detail: this.selectedFile?.name });
    }
  }

  /**
   * Pipeline: AppSync (Presigned URL) -> S3 (Binary Put) -> Next Step
   */
  async processAndContinue() {
    if (this.uploadForm.valid && this.selectedFile) {
      this.isLoading = true;
      
      try {
        // 1. Obtener URL firmada
        console.log('📡 Fetching Presigned URL...');
        const uploadUrl = await this.appsyncService.getPresignedUrl(
          this.selectedFile.name, 
          this.selectedFile.type
        );

        // 2. Subida directa a S3 (PUT binario)
        console.log('📤 Uploading to S3...');
        await this.appsyncService.uploadFileToS3(uploadUrl, this.selectedFile);

        // 3. Persistir en el State local para que el Step 2 (IA) sepa qué procesar
        this.stateService.setStep1Data(this.uploadForm.value, this.selectedFile);
        
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'File uploaded to S3' });
        
        // 4. Navegar al siguiente paso del Stepper
        this.onComplete.emit();

      } catch (error) {
        console.error('❌ Pipeline Failed:', error);
        this.messageService.add({ severity: 'error', summary: 'Upload Error', detail: 'Failed to upload to S3' });
      } finally {
        this.isLoading = false;
      }
    } else {
      this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Please complete all fields and select a file' });
    }
  }
}