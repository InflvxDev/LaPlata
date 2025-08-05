import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GastosService, CreateGastoRequest } from '../../services/gastosService';
import { CarteraService, Cartera } from '../../services/carteraService';
import { CategoriasService, Categoria } from '../../services/categoriasService';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-gasto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-gasto.html',
  styleUrls: ['./add-gasto.css']
})
export class AddGasto implements OnInit, OnDestroy {
  @Output() closeModal = new EventEmitter<void>();
  @Output() gastoCreated = new EventEmitter<void>();

  gasto: CreateGastoRequest = {
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
    private gastosService: GastosService,
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
          // Filtrar solo categorías de gasto
          this.categorias = categorias.filter(cat => cat.tipo === 'gasto');
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

    const gastoData: CreateGastoRequest = {
      ...this.gasto,
      categoria_id: this.gasto.categoria_id || undefined
    };

    this.gastosService.createGasto(gastoData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.gastoCreated.emit();
        },
        error: (error) => {
          console.error('Error al crear gasto:', error);
          this.error = 'Error al crear el gasto. Por favor, inténtalo de nuevo.';
          this.isLoading = false;
        }
      });
  }

  private isFormValid(): boolean {
    return !!(
      this.gasto.cartera_id &&
      this.gasto.monto > 0 &&
      this.gasto.fecha
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