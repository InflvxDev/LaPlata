import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CarteraService, Cartera, UpdateCarteraRequest } from '../../services/carteraService';

@Component({
  selector: 'app-detalles-cartera',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './detalles-cartera.html',
  styleUrl: './detalles-cartera.css'
})
export class DetallesCartera implements OnInit {
  @Input() cartera!: Cartera;
  @Output() closeModal = new EventEmitter<void>();
  @Output() carteraUpdated = new EventEmitter<void>();
  @Output() carteraDeleted = new EventEmitter<void>();

  carteraForm: FormGroup;
  isLoading = false;
  isDeleting = false;
  errorMessage = '';
  isClosing = false;
  showDeleteConfirm = false;

  constructor(
    private fb: FormBuilder,
    private carteraService: CarteraService
  ) {
    this.carteraForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      saldo_total: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    if (this.cartera) {
      this.carteraForm.patchValue({
        nombre: this.cartera.nombre,
        saldo_total: this.cartera.saldo_total
      });
    }
  }

  onSubmit(): void {
    if (this.carteraForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const updateData: UpdateCarteraRequest = {
        nombre: this.carteraForm.value.nombre.trim(),
        saldo_total: Number(this.carteraForm.value.saldo_total)
      };

      this.carteraService.updateCartera(this.cartera.id, updateData).subscribe({
        next: () => {
          this.isLoading = false;
          this.carteraUpdated.emit();
          this.closeWithAnimation();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al actualizar la cartera. Inténtalo de nuevo.';
          console.error('Error updating cartera:', error);
        }
      });
    }
  }

  onDelete(): void {
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.isDeleting) {
      this.isDeleting = true;
      this.errorMessage = '';

      this.carteraService.deleteCartera(this.cartera.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.carteraDeleted.emit();
          this.closeWithAnimation();
        },
        error: (error) => {
          this.isDeleting = false;
          this.errorMessage = 'Error al eliminar la cartera. Inténtalo de nuevo.';
          console.error('Error deleting cartera:', error);
          this.showDeleteConfirm = false;
        }
      });
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  onCancel(): void {
    this.closeWithAnimation();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget && !this.showDeleteConfirm) {
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
