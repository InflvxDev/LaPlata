import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, BehaviorSubject, firstValueFrom } from 'rxjs';
import { SupabaseService } from '../libs/supabaseClient';
import { CarteraService } from './carteraService';

export interface Ingreso {
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

export interface CreateIngresoRequest {
  cartera_id: string;
  categoria_id?: string;
  monto: number;
  descripcion?: string;
  fecha?: string;
}

export interface UpdateIngresoRequest {
  cartera_id?: string;
  categoria_id?: string;
  monto?: number;
  descripcion?: string;
  fecha?: string;
}

export interface IngresoStats {
  total: number;
  totalMesActual: number;
  totalMesAnterior: number;
  porcentajeCambio: number;
  ingresosPorCategoria: { categoria: string; total: number }[];
}

// Interfaces para queries específicas
interface IngresoConCategoria {
  monto: number;
  categoria: { nombre: string } | { nombre: string }[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class IngresosService {
  private supabase: SupabaseClient;
  private ingresosSubject = new BehaviorSubject<Ingreso[]>([]);
  public ingresos$ = this.ingresosSubject.asObservable();

  constructor(private carteraService: CarteraService, private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  // Obtener todos los ingresos del usuario
  getIngresos(): Observable<Ingreso[]> {
    return from(
      this.supabase
        .from('ingresos')
        .select(`
          *,
          cartera:cartera_id(nombre),
          categoria:categoria_id(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          this.ingresosSubject.next(data || []);
          return data || [];
        })
    );
  }

  // Obtener ingresos por rango de fechas
  getIngresosByDateRange(fechaInicio: string, fechaFin: string): Observable<Ingreso[]> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('ingresos')
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

  // Obtener un ingreso por ID
  getIngresoById(id: string): Observable<Ingreso | null> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('ingresos')
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

  // Crear nuevo ingreso
  createIngreso(ingreso: CreateIngresoRequest): Observable<Ingreso> {
    return from(
      this.supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        const ingresoData = {
          ...ingreso,
          user_id: user.id,
          fecha: ingreso.fecha || new Date().toISOString().split('T')[0]
        };

        const { data, error } = await this.supabase
          .from('ingresos')
          .insert([ingresoData])
          .select(`
            *,
            cartera:cartera_id(nombre),
            categoria:categoria_id(nombre)
          `)
          .single();

        if (error) throw error;
        
        // Actualizar saldo de la cartera
        await this.updateCarteraSaldo(ingreso.cartera_id, ingreso.monto, 'add');
        
        this.refreshIngresos();
        return data;
      })
    );
  }

  // Actualizar ingreso
  updateIngreso(id: string, updates: UpdateIngresoRequest): Observable<Ingreso> {
    return from(
      this.supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        const { data: oldData, error: selectError } = await this.supabase
          .from('ingresos')
          .select('cartera_id, monto')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
          
        if (selectError) throw selectError;
        
        const { data, error } = await this.supabase
          .from('ingresos')
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
          // Restar el monto anterior de la cartera anterior
          await this.updateCarteraSaldo(oldData.cartera_id, oldData.monto, 'subtract');
          
          // Sumar el nuevo monto a la nueva cartera
          const newCarteraId = updates.cartera_id || oldData.cartera_id;
          const newMonto = updates.monto || oldData.monto;
          await this.updateCarteraSaldo(newCarteraId, newMonto, 'add');
        }
        
        this.refreshIngresos();
        return data;
      })
    );
  }

  // Eliminar ingreso
  deleteIngreso(id: string): Observable<void> {
    return from(
      this.supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        const { data, error: selectError } = await this.supabase
          .from('ingresos')
          .select('cartera_id, monto')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
          
        if (selectError) throw selectError;
        
        const { error } = await this.supabase
          .from('ingresos')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        // Restar el monto de la cartera
        await this.updateCarteraSaldo(data.cartera_id, data.monto, 'subtract');
        
        this.refreshIngresos();
      })
    );
  }

  // Obtener estadísticas de ingresos
  getIngresosStats(): Observable<IngresoStats> {
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
            .from('ingresos')
            .select('monto')
            .eq('user_id', user.id)
            .then(({ data }) => data?.reduce((sum, item) => sum + Number(item.monto), 0) || 0),
          
          // Total mes actual
          this.supabase
            .from('ingresos')
            .select('monto')
            .eq('user_id', user.id)
            .gte('fecha', fechaInicioMesActual)
            .lte('fecha', fechaFinMesActual)
            .then(({ data }) => data?.reduce((sum, item) => sum + Number(item.monto), 0) || 0),
          
          // Total mes anterior
          this.supabase
            .from('ingresos')
            .select('monto')
            .eq('user_id', user.id)
            .gte('fecha', fechaInicioMesAnterior)
            .lte('fecha', fechaFinMesAnterior)
            .then(({ data }) => data?.reduce((sum, item) => sum + Number(item.monto), 0) || 0),
          
          // Ingresos por categoría
          this.supabase
            .from('ingresos')
            .select(`
              monto,
              categoria:categoria_id(nombre)
            `)
            .eq('user_id', user.id)
            .then(({ data, error }) => {
              if (error) throw error;
              const typedData = data as IngresoConCategoria[] | null;
              const grouped = (typedData || []).reduce((acc: any, item: IngresoConCategoria) => {
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
        ]).then(([total, totalMesActual, totalMesAnterior, ingresosPorCategoria]) => {
          const porcentajeCambio = totalMesAnterior > 0 
            ? ((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100 
            : 0;

          return {
            total,
            totalMesActual,
            totalMesAnterior,
            porcentajeCambio,
            ingresosPorCategoria
          };
        });
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

  // Refrescar la lista de ingresos
  private refreshIngresos(): void {
    this.getIngresos().subscribe();
  }
}