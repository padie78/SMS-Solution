import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
// Importaciones críticas para el Formulario
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

// PrimeNG
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'app-invoice-upload',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, // <--- VITAL: Sin esto el HTML no entiende [formGroup]
    FileUploadModule, 
    ButtonModule,
    InputTextModule,
    DropdownModule
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class InvoiceUploadComponent {
  @Output() onComplete = new EventEmitter<any>();

  // 1. Definición de opciones para el combo de servicios
  serviceTypes = [
    { label: 'Electricity', value: 'electricity' },
    { label: 'Water', value: 'water' },
    { label: 'Gas', value: 'gas' }
  ];

  // 2. Aquí va el bloque que consultaste (Inicialización del Formulario)
  uploadForm = new FormGroup({
    serviceType: new FormControl('', [Validators.required]),
    meterId: new FormControl(''),
    description: new FormControl('')
  });

  selectedFile: File | null = null;

  // Maneja la selección del archivo PDF
  onFileSelect(event: any) {
    this.selectedFile = event.files[0];
  }

  // Lógica para enviar los datos al siguiente paso (Validación IA)
  processAndContinue() {
    if (this.uploadForm.valid && this.selectedFile) {
      const payload = {
        ...this.uploadForm.value,
        file: this.selectedFile
      };
      
      console.log('Iniciando procesamiento con IA...', payload);
      this.onComplete.emit(payload);
    }
  }
}