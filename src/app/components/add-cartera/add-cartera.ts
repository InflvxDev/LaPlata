import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CarteraService, CreateCarteraRequest } from '../../services/carteraService';

@Component({
  selector: 'app-add-cartera',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-cartera.html',
  styleUrl: './add-cartera.css'
})
export class AddCartera {
  @Output() closeModal = new EventEmitter<void>();
  @Output() carteraCreated = new EventEmitter<void>();

  carteraForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  isClosing = false;

  constructor(
    private fb: FormBuilder,
    private carteraService: CarteraService
  ) {
    this.carteraForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      saldo_total: [0, [Validators.required, Validators.min(0)]]
    });
  }

  onSubmit(): void {
    if (this.carteraForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const carteraData: CreateCarteraRequest = {
        nombre: this.carteraForm.value.nombre.trim(),
        saldo_total: Number(this.carteraForm.value.saldo_total)
      };

      this.carteraService.createCartera(carteraData).subscribe({
        next: () => {
          this.isLoading = false;
          this.carteraCreated.emit();
          this.closeWithAnimation();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al crear la cartera. Inténtalo de nuevo.';
          console.error('Error creating cartera:', error);
        }
      });
    }
  }

  onCancel(): void {
    this.closeWithAnimation();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeWithAnimation();
    }
  }

  private closeWithAnimation(): void {
    this.isClosing = true;
    // Esperar a que termine la animación antes de cerrar
    setTimeout(() => {
      this.closeModal.emit();
    }, 300);
  }
}
