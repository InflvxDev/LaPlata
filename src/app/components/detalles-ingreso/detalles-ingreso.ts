import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IngresosService, Ingreso, UpdateIngresoRequest } from '../../services/ingresosService';
import { CarteraService, Cartera } from '../../services/carteraService';
import { CategoriasService, Categoria } from '../../services/categoriasService';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-detalles-ingreso',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './detalles-ingreso.html',
  styleUrl: './detalles-ingreso.css'
})
export class DetallesIngreso implements OnInit, OnDestroy {
  @Input() ingreso!: Ingreso;
  @Output() closeModal = new EventEmitter<void>();
  @Output() ingresoUpdated = new EventEmitter<void>();
  @Output() ingresoDeleted = new EventEmitter<void>();

  ingresoForm: FormGroup;
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
    private ingresosService: IngresosService,
    private carteraService: CarteraService,
    private categoriasService: CategoriasService
  ) {
    this.ingresoForm = this.fb.group({
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
    
    if (this.ingreso) {
      this.ingresoForm.patchValue({
        cartera_id: this.ingreso.cartera_id,
        categoria_id: this.ingreso.categoria_id || '',
        monto: this.ingreso.monto,
        descripcion: this.ingreso.descripcion || '',
        fecha: this.ingreso.fecha
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
          this.categorias$.next(categorias.filter(cat => cat.tipo === 'ingreso'));
          this.isLoadingCategorias$.next(false);
        },
        error: (error) => {
          console.error('Error loading categorias:', error);
          this.isLoadingCategorias$.next(false);
        }
      });
  }

  onSubmit(): void {
    if (this.ingresoForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const updateData: UpdateIngresoRequest = {
        cartera_id: this.ingresoForm.value.cartera_id,
        categoria_id: this.ingresoForm.value.categoria_id || null,
        monto: Number(this.ingresoForm.value.monto),
        descripcion: this.ingresoForm.value.descripcion?.trim() || null,
        fecha: this.ingresoForm.value.fecha
      };

      this.ingresosService.updateIngreso(this.ingreso.id, updateData).subscribe({
        next: () => {
          this.isLoading = false;
          this.ingresoUpdated.emit();
          this.closeWithAnimation();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al actualizar el ingreso. Inténtalo de nuevo.';
          console.error('Error updating ingreso:', error);
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

      this.ingresosService.deleteIngreso(this.ingreso.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.ingresoDeleted.emit();
          this.closeWithAnimation();
        },
        error: (error) => {
          this.isDeleting = false;
          this.errorMessage = 'Error al eliminar el ingreso. Inténtalo de nuevo.';
          console.error('Error deleting ingreso:', error);
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