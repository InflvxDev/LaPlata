import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
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

  constructor(private carteraService: CarteraService) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
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
      this.supabase
        .from('ingresos')
        .select(`
          *,
          cartera:cartera_id(nombre),
          categoria:categoria_id(nombre)
        `)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
    );
  }

  // Obtener un ingreso por ID
  getIngresoById(id: string): Observable<Ingreso | null> {
    return from(
      this.supabase
        .from('ingresos')
        .select(`
          *,
          cartera:cartera_id(nombre),
          categoria:categoria_id(nombre)
        `)
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        })
    );
  }

  // Crear nuevo ingreso
  createIngreso(ingreso: CreateIngresoRequest): Observable<Ingreso> {
    return from(
      this.supabase
        .from('ingresos')
        .insert([{
          ...ingreso,
          fecha: ingreso.fecha || new Date().toISOString().split('T')[0]
        }])
        .select(`
          *,
          cartera:cartera_id(nombre),
          categoria:categoria_id(nombre)
        `)
        .single()
        .then(async ({ data, error }) => {
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
      this.supabase
        .from('ingresos')
        .select('cartera_id, monto')
        .eq('id', id)
        .single()
        .then(async ({ data: oldData, error: selectError }) => {
          if (selectError) throw selectError;
          
          const { data, error } = await this.supabase
            .from('ingresos')
            .update(updates)
            .eq('id', id)
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
      this.supabase
        .from('ingresos')
        .select('cartera_id, monto')
        .eq('id', id)
        .single()
        .then(async ({ data, error: selectError }) => {
          if (selectError) throw selectError;
          
          const { error } = await this.supabase
            .from('ingresos')
            .delete()
            .eq('id', id);
            
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

    return from(
      Promise.all([
        // Total general
        this.supabase
          .from('ingresos')
          .select('monto')
          .then(({ data }) => data?.reduce((sum, item) => sum + Number(item.monto), 0) || 0),
        
        // Total mes actual
        this.supabase
          .from('ingresos')
          .select('monto')
          .gte('fecha', `${mesActual}-01`)
          .lt('fecha', `${mesActual}-32`)
          .then(({ data }) => data?.reduce((sum, item) => sum + Number(item.monto), 0) || 0),
        
        // Total mes anterior
        this.supabase
          .from('ingresos')
          .select('monto')
          .gte('fecha', `${mesAnterior}-01`)
          .lt('fecha', `${mesAnterior}-32`)
          .then(({ data }) => data?.reduce((sum, item) => sum + Number(item.monto), 0) || 0),
        
        // Ingresos por categoría
        this.supabase
          .from('ingresos')
          .select(`
            monto,
            categoria:categoria_id(nombre)
          `)
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