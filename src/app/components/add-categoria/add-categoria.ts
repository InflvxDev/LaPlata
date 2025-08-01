import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CategoriasService, CreateCategoriaRequest, TipoMovimiento } from '../../services/categoriasService';

@Component({
  selector: 'app-add-categoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-categoria.html',
  styleUrls: ['./add-categoria.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddCategoria {
  @Output() closeModal = new EventEmitter<void>();
  @Output() categoriaCreated = new EventEmitter<void>();

  categoriaForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  tiposMovimiento: { value: TipoMovimiento; label: string; icon: string }[] = [
    { value: 'ingreso', label: 'Ingreso', icon: 'trending_up' },
    { value: 'gasto', label: 'Gasto', icon: 'trending_down' }
  ];

  constructor(
    private fb: FormBuilder,
    private categoriasService: CategoriasService
  ) {
    this.categoriaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      tipo: ['', [Validators.required]]
    });
  }

  get nombre() { return this.categoriaForm.get('nombre'); }
  get tipo() { return this.categoriaForm.get('tipo'); }

  onSubmit() {
    if (this.categoriaForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const categoriaData: CreateCategoriaRequest = {
        nombre: this.nombre?.value.trim(),
        tipo: this.tipo?.value
      };

      this.categoriasService.createCategoria(categoriaData).subscribe({
        next: () => {
          this.isLoading = false;
          this.categoriaCreated.emit();
          this.onClose();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error al crear categoría:', error);
          this.errorMessage = 'Error al crear la categoría. Por favor, inténtalo de nuevo.';
        }
      });
    }
  }

  onClose() {
    this.closeModal.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}