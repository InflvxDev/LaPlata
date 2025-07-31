import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { SupabaseService } from '../libs/supabaseClient';

export interface Cartera {
  id: string;
  user_id: string;
  nombre: string;
  saldo_total: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCarteraRequest {
  nombre: string;
  saldo_total?: number;
}

export interface UpdateCarteraRequest {
  nombre?: string;
  saldo_total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarteraService {
  private supabase: SupabaseClient;
  private carterasSubject = new BehaviorSubject<Cartera[]>([]);
  public carteras$ = this.carterasSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  // Obtener todas las carteras del usuario
  getCarteras(): Observable<Cartera[]> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('cartera')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (error) throw error;
            this.carterasSubject.next(data || []);
            return data || [];
          });
      })
    );
  }

  // Obtener una cartera por ID
  getCarteraById(id: string): Observable<Cartera | null> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('cartera')
          .select('*')
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

  // Crear nueva cartera
  createCartera(cartera: CreateCarteraRequest): Observable<Cartera> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        const carteraData = {
          ...cartera,
          user_id: user.id,
          saldo_total: cartera.saldo_total || 0
        };

        return this.supabase
          .from('cartera')
          .insert([carteraData])
          .select()
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            this.refreshCarteras();
            return data;
          });
      })
    );
  }

  // Actualizar cartera
  updateCartera(id: string, updates: UpdateCarteraRequest): Observable<Cartera> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('cartera')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            this.refreshCarteras();
            return data;
          });
      })
    );
  }

  // Eliminar cartera
  deleteCartera(id: string): Observable<void> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('cartera')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) throw error;
            this.refreshCarteras();
          });
      })
    );
  }

  // Obtener saldo total de todas las carteras
  getSaldoTotal(): Observable<number> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('cartera')
          .select('saldo_total')
          .eq('user_id', user.id)
          .then(({ data, error }) => {
            if (error) throw error;
            const total = data?.reduce((sum, cartera) => sum + Number(cartera.saldo_total), 0) || 0;
            return total;
          });
      })
    );
  }

  // Actualizar saldo de una cartera (usado internamente por otros servicios)
  updateSaldo(carteraId: string, nuevoSaldo: number): Observable<void> {
    return from(
      this.supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        return this.supabase
          .from('cartera')
          .update({ saldo_total: nuevoSaldo })
          .eq('id', carteraId)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) throw error;
            this.refreshCarteras();
          });
      })
    );
  }

  // Refrescar la lista de carteras
  private refreshCarteras(): void {
    this.getCarteras().subscribe();
  }
}