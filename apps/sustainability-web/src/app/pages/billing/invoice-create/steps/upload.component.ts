import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

// PrimeNG Modules
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';

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
    InputTextareaModule
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class InvoiceUploadComponent {
  @Output() onComplete = new EventEmitter<any>();

  // Opciones para los selectores
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

  // Inicialización del Formulario con los campos manuales necesarios
  uploadForm = new FormGroup({
    serviceType: new FormControl('', [Validators.required]),
    meterId: new FormControl('', [Validators.required]),
    building: new FormControl('', [Validators.required]),
    costCenter: new FormControl('', [Validators.required]),
    internalNote: new FormControl('')
  });

  selectedFile: File | null = null;

  onFileSelect(event: any) {
    if (event.files && event.files.length > 0) {
      this.selectedFile = event.files[0];
    }
  }

  processAndContinue() {
    if (this.uploadForm.valid && this.selectedFile) {
      const payload = {
        ...this.uploadForm.value,
        file: this.selectedFile
      };
      
      console.log('Enviando a procesamiento IA:', payload);
      this.onComplete.emit(payload);
    }
  }
}