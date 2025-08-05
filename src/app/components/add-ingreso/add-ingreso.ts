import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IngresosService, CreateIngresoRequest } from '../../services/ingresosService';
import { CarteraService, Cartera } from '../../services/carteraService';
import { CategoriasService, Categoria } from '../../services/categoriasService';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-ingreso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-ingreso.html',
  styleUrls: ['./add-ingreso.css']
})
export class AddIngreso implements OnInit, OnDestroy {
  @Output() closeModal = new EventEmitter<void>();
  @Output() ingresoCreated = new EventEmitter<void>();

  ingreso: CreateIngresoRequest = {
    cartera_id: '',
    categoria_id: '',
    monto: 0,
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0]
  };

  carteras: Cartera[] = [];
  categorias: Categoria[] = [];
  isLoading = false;
  error = '';
  private destroy$ = new Subject<void>();

  constructor(
    private ingresosService: IngresosService,
    private carteraService: CarteraService,
    private categoriasService: CategoriasService
  ) {}

  ngOnInit() {
    this.loadCarteras();
    this.loadCategorias();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCarteras() {
    this.carteraService.getCarteras()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (carteras) => {
          this.carteras = carteras;
        },
        error: (error) => {
          console.error('Error al cargar carteras:', error);
        }
      });
  }

  private loadCategorias() {
    this.categoriasService.getCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categorias) => {
          // Filtrar solo categorías de ingreso
          this.categorias = categorias.filter(cat => cat.tipo === 'ingreso');
        },
        error: (error) => {
          console.error('Error al cargar categorías:', error);
        }
      });
  }

  onSubmit() {
    if (!this.isFormValid()) {
      this.error = 'Por favor, completa todos los campos requeridos';
      return;
    }

    this.isLoading = true;
    this.error = '';

    const ingresoData: CreateIngresoRequest = {
      ...this.ingreso,
      categoria_id: this.ingreso.categoria_id || undefined
    };

    this.ingresosService.createIngreso(ingresoData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ingresoCreated.emit();
        },
        error: (error) => {
          console.error('Error al crear ingreso:', error);
          this.error = 'Error al crear el ingreso. Por favor, inténtalo de nuevo.';
          this.isLoading = false;
        }
      });
  }

  private isFormValid(): boolean {
    return !!(
      this.ingreso.cartera_id &&
      this.ingreso.monto > 0 &&
      this.ingreso.fecha
    );
  }

  onCancel() {
    this.closeModal.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }
}