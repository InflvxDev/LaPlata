import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GastosService, Gasto, UpdateGastoRequest } from '../../services/gastosService';
import { CarteraService, Cartera } from '../../services/carteraService';
import { CategoriasService, Categoria } from '../../services/categoriasService';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-detalles-gasto',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './detalles-gasto.html',
  styleUrl: './detalles-gasto.css'
})
export class DetallesGasto implements OnInit, OnDestroy {
  @Input() gasto!: Gasto;
  @Output() closeModal = new EventEmitter<void>();
  @Output() gastoUpdated = new EventEmitter<void>();
  @Output() gastoDeleted = new EventEmitter<void>();

  gastoForm: FormGroup;
  carteras$ = new BehaviorSubject<Cartera[]>([]);
  categorias$ = new BehaviorSubject<Categoria[]>([]);
  isLoadingCarteras$ = new BehaviorSubject<boolean>(true);
  isLoadingCategorias$ = new BehaviorSubject<boolean>(true);
  isLoading = false;
  isDeleting = false;
  errorMessage = '';
  isClosing = false;
  showDeleteConfirm = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private gastosService: GastosService,
    private carteraService: CarteraService,
    private categoriasService: CategoriasService
  ) {
    this.gastoForm = this.fb.group({
      cartera_id: ['', [Validators.required]],
      categoria_id: [''],
      monto: [0, [Validators.required, Validators.min(0.01)]],
      descripcion: [''],
      fecha: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadCarteras();
    this.loadCategorias();
    
    if (this.gasto) {
      this.gastoForm.patchValue({
        cartera_id: this.gasto.cartera_id,
        categoria_id: this.gasto.categoria_id || '',
        monto: this.gasto.monto,
        descripcion: this.gasto.descripcion || '',
        fecha: this.gasto.fecha
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCarteras(): void {
    this.isLoadingCarteras$.next(true);
    this.carteraService.getCarteras()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (carteras) => {
          this.carteras$.next(carteras);
          this.isLoadingCarteras$.next(false);
        },
        error: (error) => {
          console.error('Error loading carteras:', error);
          this.isLoadingCarteras$.next(false);
        }
      });
  }

  loadCategorias(): void {
    this.isLoadingCategorias$.next(true);
    this.categoriasService.getCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categorias) => {
          this.categorias$.next(categorias.filter(cat => cat.tipo === 'gasto'));
          this.isLoadingCategorias$.next(false);
        },
        error: (error) => {
          console.error('Error loading categorias:', error);
          this.isLoadingCategorias$.next(false);
        }
      });
  }

  onSubmit(): void {
    if (this.gastoForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const updateData: UpdateGastoRequest = {
        cartera_id: this.gastoForm.value.cartera_id,
        categoria_id: this.gastoForm.value.categoria_id || null,
        monto: Number(this.gastoForm.value.monto),
        descripcion: this.gastoForm.value.descripcion?.trim() || null,
        fecha: this.gastoForm.value.fecha
      };

      this.gastosService.updateGasto(this.gasto.id, updateData).subscribe({
        next: () => {
          this.isLoading = false;
          this.gastoUpdated.emit();
          this.closeWithAnimation();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al actualizar el gasto. Inténtalo de nuevo.';
          console.error('Error updating gasto:', error);
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

      this.gastosService.deleteGasto(this.gasto.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.gastoDeleted.emit();
          this.closeWithAnimation();
        },
        error: (error) => {
          this.isDeleting = false;
          this.errorMessage = 'Error al eliminar el gasto. Inténtalo de nuevo.';
          console.error('Error deleting gasto:', error);
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

  getCarteraNombre(carteraId: string): string {
    const carteras = this.carteras$.value;
    const cartera = carteras.find(c => c.id === carteraId);
    return cartera ? cartera.nombre : 'Cartera no encontrada';
  }

  getCategoriaNombre(categoriaId: string | null): string {
    if (!categoriaId) return 'Sin categoría';
    const categorias = this.categorias$.value;
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : 'Categoría no encontrada';
  }
}