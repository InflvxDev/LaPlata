import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../services/supabaseLoginService';
import { DashboardService, DashboardStats } from '../../services/dashboardService';
import { AddCartera } from '../add-cartera/add-cartera';
import { DetallesCartera } from '../detalles-cartera/detalles-cartera';
import { AddCategoria } from '../add-categoria/add-categoria';
import { DetallesCategoria } from '../detalles-categoria/detalles-categoria';
import { AddIngreso } from '../add-ingreso/add-ingreso';
import { AddGasto } from '../add-gasto/add-gasto';
import { DetallesIngreso } from '../detalles-ingreso/detalles-ingreso';
import { DetallesGasto } from '../detalles-gasto/detalles-gasto';
import { Cartera } from '../../services/carteraService';
import { Categoria } from '../../services/categoriasService';
import { IngresosService, Ingreso } from '../../services/ingresosService';
import { GastosService, Gasto } from '../../services/gastosService';
import { Subject, takeUntil, filter, switchMap, timeout, catchError, of, startWith, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AddCartera, DetallesCartera, AddCategoria, DetallesCategoria, AddIngreso, AddGasto, DetallesIngreso, DetallesGasto],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit, OnDestroy {
  isDropdownOpen = false;
  userName = 'Usuario';
  dashboardStats$ = new BehaviorSubject<DashboardStats | null>(null);
  isLoading$ = new BehaviorSubject<boolean>(true);
  showAddCarteraModal = false;
  showDetallesCarteraModal = false;
  selectedCartera: Cartera | null = null;
  showAddCategoriaModal = false;
  showDetallesCategoriaModal = false;
  selectedCategoria: Categoria | null = null;
  
  // Propiedades para ingresos
  ingresos$ = new BehaviorSubject<Ingreso[]>([]);
  isLoadingIngresos$ = new BehaviorSubject<boolean>(true);
  showAddIngresoModal = false;
  showDetallesIngresoModal = false;
  selectedIngreso: Ingreso | null = null;
  
  // Propiedades para gastos
  gastos$ = new BehaviorSubject<Gasto[]>([]);
  isLoadingGastos$ = new BehaviorSubject<boolean>(true);
  showAddGastoModal = false;
  showDetallesGastoModal = false;
  selectedGasto: Gasto | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private supabaseAuth: SupabaseAuthService,
    private dashboardService: DashboardService,
    private ingresosService: IngresosService,
    private gastosService: GastosService
  ) {
    this.loadUserData();
  }

  ngOnInit() {
    // Verificar si ya hay un usuario autenticado
    const currentUser = this.supabaseAuth.getCurrentUser();
    if (currentUser) {
      this.loadDashboardData();
      this.loadIngresos();
      this.loadGastos();
    } else {
      // Esperar a que el usuario esté autenticado antes de cargar los datos
      this.supabaseAuth.currentUser$
        .pipe(
          takeUntil(this.destroy$),
          filter(user => user !== null), // Solo proceder cuando el usuario esté autenticado
          startWith(null) // Emitir valor inicial para debugging
        )
        .subscribe((user) => {
          if (user) {
            this.loadDashboardData();
            this.loadIngresos();
            this.loadGastos();
          }
        });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserData() {
    this.supabaseAuth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          // Intentar obtener el nombre del usuario desde los metadatos
          const name = user.user_metadata?.['name'];
          const displayName = user.user_metadata?.['display_name'];
          const emailName = user.email?.split('@')[0];
          
          this.userName = name || displayName || emailName || 'Usuario';
        } else {
          this.userName = 'Usuario';
        }
      });
  }

  private loadDashboardData() {
    this.isLoading$.next(true);
    
    this.dashboardService.getDashboardStats()
      .pipe(
        takeUntil(this.destroy$),
        timeout(5000), // Timeout de 5 segundos
        catchError(error => {
          console.error('Error al cargar datos del dashboard:', error);
          // Retornar datos por defecto en caso de error
          return of({
            saldoTotal: 0,
            totalIngresos: 0,
            totalGastos: 0,
            ingresosMesActual: 0,
            gastosMesActual: 0,
            balanceMensual: 0,
            porcentajeIngresos: 0,
            porcentajeGastos: 0,
            carteras: [],
            categorias: [],
            gastosRecientes: [],
            ingresosPorCategoria: [],
            gastosPorCategoria: []
          });
        })
      )
      .subscribe({
        next: (stats) => {
          this.dashboardStats$.next(stats);
          this.isLoading$.next(false);
        },
        error: (error) => {
          console.error('Error al cargar datos del dashboard:', error);
          this.isLoading$.next(false);
        }
      });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  openAddCarteraModal() {
    this.showAddCarteraModal = true;
  }

  closeAddCarteraModal() {
    this.showAddCarteraModal = false;
  }

  onCarteraCreated() {
    // Recargar los datos del dashboard cuando se crea una nueva cartera
    this.loadDashboardData();
    this.closeAddCarteraModal();
  }

  openDetallesCarteraModal(cartera: Cartera) {
    this.selectedCartera = cartera;
    this.showDetallesCarteraModal = true;
  }

  closeDetallesCarteraModal() {
    this.showDetallesCarteraModal = false;
    this.selectedCartera = null;
  }

  onCarteraUpdated() {
    // Recargar los datos del dashboard cuando se actualiza una cartera
    this.loadDashboardData();
    this.closeDetallesCarteraModal();
  }

  onCarteraDeleted() {
    // Recargar los datos del dashboard cuando se elimina una cartera
    this.loadDashboardData();
    this.closeDetallesCarteraModal();
  }

  // Métodos para categorías
  openAddCategoriaModal() {
    this.showAddCategoriaModal = true;
  }

  closeAddCategoriaModal() {
    this.showAddCategoriaModal = false;
  }

  onCategoriaCreated() {
    // Recargar los datos del dashboard cuando se crea una nueva categoría
    this.loadDashboardData();
    this.closeAddCategoriaModal();
  }

  openDetallesCategoriaModal(categoria: Categoria) {
    this.selectedCategoria = categoria;
    this.showDetallesCategoriaModal = true;
  }

  closeDetallesCategoriaModal() {
    this.showDetallesCategoriaModal = false;
    this.selectedCategoria = null;
  }

  onCategoriaUpdated() {
    // Recargar los datos del dashboard cuando se actualiza una categoría
    this.loadDashboardData();
    this.closeDetallesCategoriaModal();
  }

  onCategoriaDeleted() {
    // Recargar los datos del dashboard cuando se elimina una categoría
    this.loadDashboardData();
    this.closeDetallesCategoriaModal();
  }

  // Métodos para ingresos
  private loadIngresos() {
    this.isLoadingIngresos$.next(true);
    
    this.ingresosService.getIngresos()
      .pipe(
        takeUntil(this.destroy$),
        timeout(5000),
        catchError(error => {
          console.error('Error al cargar ingresos:', error);
          return of([]);
        })
      )
      .subscribe({
        next: (ingresos) => {
          // Mostrar solo los últimos 5 ingresos
          this.ingresos$.next(ingresos.slice(0, 5));
          this.isLoadingIngresos$.next(false);
        },
        error: (error) => {
          console.error('Error al cargar ingresos:', error);
          this.isLoadingIngresos$.next(false);
        }
      });
  }

  openAddIngresoModal() {
    this.showAddIngresoModal = true;
  }

  closeAddIngresoModal() {
    this.showAddIngresoModal = false;
  }

  onIngresoCreated() {
    this.loadIngresos();
    this.loadDashboardData(); // Recargar stats del dashboard
    this.closeAddIngresoModal();
  }

  openDetallesIngresoModal(ingreso: Ingreso) {
    this.selectedIngreso = ingreso;
    this.showDetallesIngresoModal = true;
  }

  closeDetallesIngresoModal() {
    this.showDetallesIngresoModal = false;
    this.selectedIngreso = null;
  }

  onIngresoUpdated() {
    this.loadIngresos();
    this.loadDashboardData(); // Recargar stats del dashboard
    this.closeDetallesIngresoModal();
  }

  onIngresoDeleted() {
    this.loadIngresos();
    this.loadDashboardData(); // Recargar stats del dashboard
    this.closeDetallesIngresoModal();
  }

  // Métodos para gastos
  private loadGastos() {
    this.isLoadingGastos$.next(true);
    
    this.gastosService.getGastos()
      .pipe(
        takeUntil(this.destroy$),
        timeout(5000),
        catchError(error => {
          console.error('Error al cargar gastos:', error);
          return of([]);
        })
      )
      .subscribe({
        next: (gastos) => {
          // Mostrar solo los últimos 5 gastos
          this.gastos$.next(gastos.slice(0, 5));
          this.isLoadingGastos$.next(false);
        },
        error: (error) => {
          console.error('Error al cargar gastos:', error);
          this.isLoadingGastos$.next(false);
        }
      });
  }

  openAddGastoModal() {
    this.showAddGastoModal = true;
  }

  closeAddGastoModal() {
    this.showAddGastoModal = false;
  }

  onGastoCreated() {
    this.loadGastos();
    this.loadDashboardData(); // Recargar stats del dashboard
    this.closeAddGastoModal();
  }

  openDetallesGastoModal(gasto: Gasto) {
    this.selectedGasto = gasto;
    this.showDetallesGastoModal = true;
  }

  closeDetallesGastoModal() {
    this.showDetallesGastoModal = false;
    this.selectedGasto = null;
  }

  onGastoUpdated() {
    this.loadGastos();
    this.loadDashboardData(); // Recargar stats del dashboard
    this.closeDetallesGastoModal();
  }

  onGastoDeleted() {
    this.loadGastos();
    this.loadDashboardData(); // Recargar stats del dashboard
    this.closeDetallesGastoModal();
  }

  // Método auxiliar para obtener el nombre de la categoría
  getCategoriaNombre(categoria: any): string {
    if (!categoria) return 'Sin categoría';
    
    if (Array.isArray(categoria)) {
      return categoria[0]?.nombre || 'Sin categoría';
    }
    
    return categoria.nombre || 'Sin categoría';
  }

  async logout() {
    try {
      const result = await this.supabaseAuth.logout();
      if (result.success) {
        this.router.navigate(['/login']);
      } else {
        console.error('Error al cerrar sesión:', result.message);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}