import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CategoriasService, Categoria, UpdateCategoriaRequest, TipoMovimiento } from '../../services/categoriasService';

@Component({
  selector: 'app-detalles-categoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './detalles-categoria.html',
  styleUrls: ['./detalles-categoria.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetallesCategoria implements OnInit {
  @Input() categoria!: Categoria;
  @Output() closeModal = new EventEmitter<void>();
  @Output() categoriaUpdated = new EventEmitter<void>();
  @Output() categoriaDeleted = new EventEmitter<void>();

  categoriaForm: FormGroup;
  isLoading = false;
  isDeleting = false;
  errorMessage = '';
  showDeleteConfirmation = false;

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

  ngOnInit() {
    if (this.categoria) {
      this.categoriaForm.patchValue({
        nombre: this.categoria.nombre,
        tipo: this.categoria.tipo
      });
    }
  }

  get nombre() { return this.categoriaForm.get('nombre'); }
  get tipo() { return this.categoriaForm.get('tipo'); }

  onSubmit() {
    if (this.categoriaForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const updates: UpdateCategoriaRequest = {
        nombre: this.nombre?.value.trim(),
        tipo: this.tipo?.value
      };

      this.categoriasService.updateCategoria(this.categoria.id, updates).subscribe({
        next: () => {
          this.isLoading = false;
          this.categoriaUpdated.emit();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error al actualizar categoría:', error);
          this.errorMessage = 'Error al actualizar la categoría. Por favor, inténtalo de nuevo.';
        }
      });
    }
  }

  onDelete() {
    this.showDeleteConfirmation = true;
  }

  confirmDelete() {
    if (!this.isDeleting) {
      this.isDeleting = true;
      this.errorMessage = '';

      this.categoriasService.deleteCategoria(this.categoria.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.categoriaDeleted.emit();
        },
        error: (error) => {
          this.isDeleting = false;
          console.error('Error al eliminar categoría:', error);
          this.errorMessage = 'Error al eliminar la categoría. Por favor, inténtalo de nuevo.';
          this.showDeleteConfirmation = false;
        }
      });
    }
  }

  cancelDelete() {
    this.showDeleteConfirmation = false;
  }

  onClose() {
    this.closeModal.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTipoIcon(tipo: TipoMovimiento): string {
    return tipo === 'ingreso' ? 'trending_up' : 'trending_down';
  }

  getTipoLabel(tipo: TipoMovimiento): string {
    return tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
  }
}