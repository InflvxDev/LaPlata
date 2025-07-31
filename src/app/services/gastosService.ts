import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, BehaviorSubject, firstValueFrom } from 'rxjs';
import { SupabaseService } from '../libs/supabaseClient';
import { CarteraService } from './carteraService';

export interface Gasto {
  id: string;
  user_id: string;
  cartera_id: string;
  categoria_id: string | null;
  monto: number;
  descripcion: string | null;
  fecha: string;
  created_at: string;
  // Datos relacionados (joins) - pueden ser objetos o arrays
  cartera?: { nombre: string } | { nombre: string }[];
  categoria?: { nombre: string } | { nombre: string }[];
}

export interface CreateGastoRequest {
  cartera_id: string;
  categoria_id?: string;
  monto: number;
  descripcion?: string;
  fecha?: string;
}

export interface UpdateGastoRequest {
  cartera_id?: string;
  categoria_id?: string;
  monto?: number;
  descripcion?: string;
  fecha?: string;
}

export interface GastoStats {
  total: number;
  totalMesActual: number;
  totalMesAnterior: number;
  porcentajeCambio: number;
  gastosPorCategoria: { categoria: string; total: number }[];
}

// Interfaces para queries específicas
interface GastoConCategoria {
  monto: number;
  categoria: { nombre: string } | { nombre: string }[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class GastosService {
  private supabase: SupabaseClient;
  private gastosSubject = new BehaviorSubject<Gasto[]>([]);
  public gastos$ = this.gastosSubject.asObservable();

  constructor(private carteraService: CarteraService, private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  // Obtener todos los gastos del usuario
  getGastos(): Observable<Gasto[]> {
    return from(
      this.supabase
        .from('gastos')
        .select(`
          *,
          cartera:cartera_id(nombre),
          categoria:categoria_id(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          this.gastosSubject.next(data || []);
          return data || [];
        })
    );
  }

  // Obtener gastos por rango de fechas
  getGastosByDateRange(fechaInicio: string, fechaFin: string): Observable<Gasto[]> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('gastos')
          .select(`
            *,
            cartera:cartera_id(nombre),
            categoria:categoria_id(nombre)
          `)
          .eq('user_id', user.id)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin)
          .order('fecha', { ascending: false })
          .then(({ data, error }) => {
            if (error) throw error;
            return data || [];
          });
      })
    );
  }

  // Obtener un gasto por ID
  getGastoById(id: string): Observable<Gasto | null> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('gastos')
          .select(`
            *,
            cartera:cartera_id(nombre),
            categoria:categoria_id(nombre)
          `)
          .eq('id', id)
          .eq('user_id', user.id)
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          });
      })
    );
  }

  // Crear nuevo gasto
  createGasto(gasto: CreateGastoRequest): Observable<Gasto> {
    return from(
      this.supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        const gastoData = {
          ...gasto,
          user_id: user.id,
          fecha: gasto.fecha || new Date().toISOString().split('T')[0]
        };

        const { data, error } = await this.supabase
          .from('gastos')
          .insert([gastoData])
          .select(`
            *,
            cartera:cartera_id(nombre),
            categoria:categoria_id(nombre)
          `)
          .single();

        if (error) throw error;
        
        // Actualizar saldo de la cartera (restar el gasto)
        await this.updateCarteraSaldo(gasto.cartera_id, gasto.monto, 'subtract');
        
        this.refreshGastos();
        return data;
      })
    );
  }

  // Actualizar gasto
  updateGasto(id: string, updates: UpdateGastoRequest): Observable<Gasto> {
    return from(
      this.supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        const { data: oldData, error: selectError } = await this.supabase
          .from('gastos')
          .select('cartera_id, monto')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
          
        if (selectError) throw selectError;
        
        const { data, error } = await this.supabase
          .from('gastos')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id)
          .select(`
            *,
            cartera:cartera_id(nombre),
            categoria:categoria_id(nombre)
          `)
          .single();
          
        if (error) throw error;
        
        // Actualizar saldos de carteras si cambió el monto o la cartera
        if (updates.monto !== undefined || updates.cartera_id !== undefined) {
          // Sumar el monto anterior a la cartera anterior (revertir el gasto)
          await this.updateCarteraSaldo(oldData.cartera_id, oldData.monto, 'add');
          
          // Restar el nuevo monto de la nueva cartera
          const newCarteraId = updates.cartera_id || oldData.cartera_id;
          const newMonto = updates.monto || oldData.monto;
          await this.updateCarteraSaldo(newCarteraId, newMonto, 'subtract');
        }
        
        this.refreshGastos();
        return data;
      })
    );
  }

  // Eliminar gasto
  deleteGasto(id: string): Observable<void> {
    return from(
      this.supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        const { data, error: selectError } = await this.supabase
          .from('gastos')
          .select('cartera_id, monto')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
          
        if (selectError) throw selectError;
        
        const { error } = await this.supabase
          .from('gastos')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        // Sumar el monto a la cartera (revertir el gasto)
        await this.updateCarteraSaldo(data.cartera_id, data.monto, 'add');
        
        this.refreshGastos();
      })
    );
  }

  // Obtener estadísticas de gastos
  getGastosStats(): Observable<GastoStats> {
    const now = new Date();
    const mesActual = now.toISOString().slice(0, 7); // YYYY-MM
    const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1).toISOString().slice(0, 7);

    // Calcular fechas correctas para el mes actual y anterior
    const fechaInicioMesActual = `${mesActual}-01`;
    const fechaFinMesActual = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10); // Último día del mes actual
    
    const fechaInicioMesAnterior = `${mesAnterior}-01`;
    const fechaFinMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10); // Último día del mes anterior

    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return Promise.all([
          // Total general
          this.supabase
            .from('gastos')
            .select('monto')
            .eq('user_id', user.id)
            .then(({ data }) => data?.reduce((sum, item) => sum + Number(item.monto), 0) || 0),
          
          // Total mes actual
          this.supabase
            .from('gastos')
            .select('monto')
            .eq('user_id', user.id)
            .gte('fecha', fechaInicioMesActual)
            .lte('fecha', fechaFinMesActual)
            .then(({ data }) => data?.reduce((sum, item) => sum + Number(item.monto), 0) || 0),
          
          // Total mes anterior
          this.supabase
            .from('gastos')
            .select('monto')
            .eq('user_id', user.id)
            .gte('fecha', fechaInicioMesAnterior)
            .lte('fecha', fechaFinMesAnterior)
            .then(({ data }) => data?.reduce((sum, item) => sum + Number(item.monto), 0) || 0),
          
          // Gastos por categoría
          this.supabase
            .from('gastos')
            .select(`
              monto,
              categoria:categoria_id(nombre)
            `)
            .eq('user_id', user.id)
            .then(({ data, error }) => {
              if (error) throw error;
              const typedData = data as GastoConCategoria[] | null;
              const grouped = (typedData || []).reduce((acc: any, item: GastoConCategoria) => {
                // Manejar tanto objetos como arrays del join
                let categoriaNombre = 'Sin categoría';
                if (item.categoria) {
                  if (Array.isArray(item.categoria)) {
                    categoriaNombre = item.categoria[0]?.nombre || 'Sin categoría';
                  } else {
                    categoriaNombre = item.categoria.nombre || 'Sin categoría';
                  }
                }
                acc[categoriaNombre] = (acc[categoriaNombre] || 0) + Number(item.monto);
                return acc;
              }, {});
              
              return Object.entries(grouped).map(([categoria, total]) => ({
                categoria,
                total: total as number
              }));
            })
        ]).then(([total, totalMesActual, totalMesAnterior, gastosPorCategoria]) => {
          const porcentajeCambio = totalMesAnterior > 0 
            ? ((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100 
            : 0;

          return {
            total,
            totalMesActual,
            totalMesAnterior,
            porcentajeCambio,
            gastosPorCategoria
          };
        });
      })
    );
  }

  // Obtener gastos recientes
  getGastosRecientes(limit: number = 5): Observable<Gasto[]> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('gastos')
          .select(`
            *,
            categoria:categoria_id(nombre),
            cartera:cartera_id(nombre)
          `)
          .eq('user_id', user.id)
          .order('fecha', { ascending: false })
          .limit(limit)
          .then(({ data, error }) => {
            if (error) throw error;
            return data || [];
          });
      })
    );
  }

  // Obtener gastos por categoría en un período
  getGastosPorCategoria(fechaInicio?: string, fechaFin?: string): Observable<{ categoria: string; total: number; porcentaje: number }[]> {
    let query = this.supabase
      .from('gastos')
      .select(`
        monto,
        categoria:categoria_id(nombre)
      `);

    if (fechaInicio) query = query.gte('fecha', fechaInicio);
    if (fechaFin) query = query.lte('fecha', fechaFin);

    return from(
      query.then(({ data, error }) => {
        if (error) throw error;
        
        const typedData = data as GastoConCategoria[] | null;
        const grouped = (typedData || []).reduce((acc: any, item: GastoConCategoria) => {
          // Manejar tanto objetos como arrays del join
          let categoriaNombre = 'Sin categoría';
          if (item.categoria) {
            if (Array.isArray(item.categoria)) {
              categoriaNombre = item.categoria[0]?.nombre || 'Sin categoría';
            } else {
              categoriaNombre = item.categoria.nombre || 'Sin categoría';
            }
          }
          acc[categoriaNombre] = (acc[categoriaNombre] || 0) + Number(item.monto);
          return acc;
        }, {});
        
        const total = Object.values(grouped).reduce((sum: number, value: any) => sum + value, 0) as number;
        
        return Object.entries(grouped).map(([categoria, amount]) => ({
          categoria,
          total: amount as number,
          porcentaje: total > 0 ? ((amount as number) / total) * 100 : 0
        })).sort((a, b) => b.total - a.total);
      })
    );
  }

  // Actualizar saldo de cartera
  private async updateCarteraSaldo(carteraId: string, monto: number, operation: 'add' | 'subtract'): Promise<void> {
    const { data: cartera, error } = await this.supabase
      .from('cartera')
      .select('saldo_total')
      .eq('id', carteraId)
      .single();
      
    if (error) throw error;
    
    const nuevoSaldo = operation === 'add' 
      ? Number(cartera.saldo_total) + Number(monto)
      : Number(cartera.saldo_total) - Number(monto);
      
    await firstValueFrom(this.carteraService.updateSaldo(carteraId, nuevoSaldo));
  }

  // Refrescar la lista de gastos
  private refreshGastos(): void {
    this.getGastos().subscribe();
  }
}