import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../services/supabaseLoginService';
import { DashboardService, DashboardStats } from '../../services/dashboardService';
import { AddCartera } from '../add-cartera/add-cartera';
import { Subject, takeUntil, filter, switchMap, timeout, catchError, of, startWith, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AddCartera],
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
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private supabaseAuth: SupabaseAuthService,
    private dashboardService: DashboardService
  ) {
    this.loadUserData();
  }

  ngOnInit() {
    // Verificar si ya hay un usuario autenticado
    const currentUser = this.supabaseAuth.getCurrentUser();
    if (currentUser) {
      this.loadDashboardData();
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