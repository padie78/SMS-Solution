import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    ReactiveFormsModule,
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

  // Opciones para el formulario
  serviceTypes = [
    { label: 'Electricity', value: 'electricity' },
    { label: 'Water', value: 'water' },
    { label: 'Gas', value: 'gas' }
  ];

  // Formulario reactivo
  uploadForm = new FormGroup({
    serviceType: new FormControl('', [Validators.required]),
    meterId: new FormControl(''),
    description: new FormControl('')
  });

  selectedFile: File | null = null;

  onFileSelect(event: any) {
    this.selectedFile = event.files[0];
  }

  processAndContinue() {
    if (this.uploadForm.valid && this.selectedFile) {
      // Unimos los datos del formulario con el archivo
      const payload = {
        ...this.uploadForm.value,
        file: this.selectedFile
      };
      
      console.log('Iniciando procesamiento con IA para:', payload);
      this.onComplete.emit(payload);
    }
  }
}