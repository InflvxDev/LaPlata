import { Injectable } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { CarteraService } from './carteraService';
import { CategoriasService } from './categoriasService';
import { IngresosService } from './ingresosService';
import { GastosService } from './gastosService';

export interface DashboardStats {
  saldoTotal: number;
  totalIngresos: number;
  totalGastos: number;
  ingresosMesActual: number;
  gastosMesActual: number;
  balanceMensual: number;
  porcentajeIngresos: number;
  porcentajeGastos: number;
  carteras: any[];
  gastosRecientes: any[];
  ingresosPorCategoria: any[];
  gastosPorCategoria: any[];
}

export interface ResumenFinanciero {
  periodo: string;
  ingresos: number;
  gastos: number;
  balance: number;
  ahorro: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  
  constructor(
    private carteraService: CarteraService,
    private categoriasService: CategoriasService,
    private ingresosService: IngresosService,
    private gastosService: GastosService
  ) {}

  // Obtener estadísticas completas del dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return combineLatest([
      this.carteraService.getSaldoTotal(),
      this.carteraService.getCarteras(),
      this.ingresosService.getIngresosStats(),
      this.gastosService.getGastosStats(),
      this.gastosService.getGastosRecientes()
    ]).pipe(
      map(([saldoTotal, carteras, ingresosStats, gastosStats, gastosRecientes]) => {
        const balanceMensual = ingresosStats.totalMesActual - gastosStats.totalMesActual;
        const totalMovimientos = ingresosStats.totalMesActual + gastosStats.totalMesActual;
        
        return {
          saldoTotal,
          totalIngresos: ingresosStats.total,
          totalGastos: gastosStats.total,
          ingresosMesActual: ingresosStats.totalMesActual,
          gastosMesActual: gastosStats.totalMesActual,
          balanceMensual,
          porcentajeIngresos: totalMovimientos > 0 ? (ingresosStats.totalMesActual / totalMovimientos) * 100 : 0,
          porcentajeGastos: totalMovimientos > 0 ? (gastosStats.totalMesActual / totalMovimientos) * 100 : 0,
          carteras,
          gastosRecientes,
          ingresosPorCategoria: ingresosStats.ingresosPorCategoria,
          gastosPorCategoria: gastosStats.gastosPorCategoria
        };
      })
    );
  }

  // Obtener resumen financiero por períodos
  getResumenFinanciero(): Observable<ResumenFinanciero[]> {
    const now = new Date();
    const periodos = [];
    
    // Generar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const año = fecha.getFullYear();
      const mes = fecha.getMonth() + 1;
      const mesStr = mes.toString().padStart(2, '0');
      
      periodos.push({
        periodo: `${año}-${mesStr}`,
        nombre: fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      });
    }

    const observables = periodos.map(periodo => {
      const fechaInicio = `${periodo.periodo}-01`;
      const fechaFin = `${periodo.periodo}-31`;
      
      return combineLatest([
        this.ingresosService.getIngresosByDateRange(fechaInicio, fechaFin),
        this.gastosService.getGastosByDateRange(fechaInicio, fechaFin)
      ]).pipe(
        map(([ingresos, gastos]) => {
          const totalIngresos = ingresos.reduce((sum, item) => sum + Number(item.monto), 0);
          const totalGastos = gastos.reduce((sum, item) => sum + Number(item.monto), 0);
          const balance = totalIngresos - totalGastos;
          const ahorro = balance > 0 ? balance : 0;
          
          return {
            periodo: periodo.nombre,
            ingresos: totalIngresos,
            gastos: totalGastos,
            balance,
            ahorro
          };
        })
      );
    });

    return combineLatest(observables);
  }

  // Inicializar datos por defecto para nuevo usuario
  initializeUserData(): Observable<any> {
    return this.categoriasService.createCategoriasDefault();
  }

  // Obtener métricas de rendimiento
  getMetricasRendimiento(): Observable<any> {
    const now = new Date();
    const mesActual = now.toISOString().slice(0, 7);
    const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1).toISOString().slice(0, 7);

    return combineLatest([
      this.ingresosService.getIngresosStats(),
      this.gastosService.getGastosStats()
    ]).pipe(
      map(([ingresosStats, gastosStats]) => {
        const ahorroMesActual = ingresosStats.totalMesActual - gastosStats.totalMesActual;
        const ahorroMesAnterior = ingresosStats.totalMesAnterior - gastosStats.totalMesAnterior;
        
        const cambioAhorro = ahorroMesAnterior !== 0 
          ? ((ahorroMesActual - ahorroMesAnterior) / Math.abs(ahorroMesAnterior)) * 100 
          : 0;

        return {
          ingresos: {
            actual: ingresosStats.totalMesActual,
            anterior: ingresosStats.totalMesAnterior,
            cambio: ingresosStats.porcentajeCambio
          },
          gastos: {
            actual: gastosStats.totalMesActual,
            anterior: gastosStats.totalMesAnterior,
            cambio: gastosStats.porcentajeCambio
          },
          ahorro: {
            actual: ahorroMesActual,
            anterior: ahorroMesAnterior,
            cambio: cambioAhorro
          },
          ratioAhorro: ingresosStats.totalMesActual > 0 
            ? (ahorroMesActual / ingresosStats.totalMesActual) * 100 
            : 0
        };
      })
    );
  }

  // Obtener alertas y notificaciones
  getAlertas(): Observable<any[]> {
    return this.getDashboardStats().pipe(
      map(stats => {
        const alertas = [];

        // Alerta de saldo bajo
        if (stats.saldoTotal < 1000) {
          alertas.push({
            tipo: 'warning',
            titulo: 'Saldo Bajo',
            mensaje: 'Tu saldo total está por debajo de $1,000',
            icono: 'warning'
          });
        }

        // Alerta de gastos altos
        if (stats.gastosMesActual > stats.ingresosMesActual) {
          alertas.push({
            tipo: 'danger',
            titulo: 'Gastos Excesivos',
            mensaje: 'Tus gastos del mes superan tus ingresos',
            icono: 'trending_down'
          });
        }

        // Alerta de buen ahorro
        if (stats.balanceMensual > stats.ingresosMesActual * 0.2) {
          alertas.push({
            tipo: 'success',
            titulo: 'Excelente Ahorro',
            mensaje: 'Estás ahorrando más del 20% de tus ingresos',
            icono: 'savings'
          });
        }

        return alertas;
      })
    );
  }
}