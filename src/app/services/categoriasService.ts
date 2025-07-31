import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export type TipoMovimiento = 'ingreso' | 'gasto';

export interface Categoria {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
  user_id: string;
  created_at: string;
}

export interface CreateCategoriaRequest {
  nombre: string;
  tipo: TipoMovimiento;
}

export interface UpdateCategoriaRequest {
  nombre?: string;
  tipo?: TipoMovimiento;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private supabase: SupabaseClient;
  private categoriasSubject = new BehaviorSubject<Categoria[]>([]);
  public categorias$ = this.categoriasSubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // Obtener todas las categorías del usuario
  getCategorias(): Observable<Categoria[]> {
    return from(
      this.supabase
        .from('categorias')
        .select('*')
        .order('tipo', { ascending: true })
        .order('nombre', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw error;
          this.categoriasSubject.next(data || []);
          return data || [];
        })
    );
  }

  // Obtener categorías por tipo
  getCategoriasByTipo(tipo: TipoMovimiento): Observable<Categoria[]> {
    return from(
      this.supabase
        .from('categorias')
        .select('*')
        .eq('tipo', tipo)
        .order('nombre', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
    );
  }

  // Obtener una categoría por ID
  getCategoriaById(id: string): Observable<Categoria | null> {
    return from(
      this.supabase
        .from('categorias')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        })
    );
  }

  // Crear nueva categoría
  createCategoria(categoria: CreateCategoriaRequest): Observable<Categoria> {
    return from(
      this.supabase
        .from('categorias')
        .insert([categoria])
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          this.refreshCategorias();
          return data;
        })
    );
  }

  // Actualizar categoría
  updateCategoria(id: string, updates: UpdateCategoriaRequest): Observable<Categoria> {
    return from(
      this.supabase
        .from('categorias')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          this.refreshCategorias();
          return data;
        })
    );
  }

  // Eliminar categoría
  deleteCategoria(id: string): Observable<void> {
    return from(
      this.supabase
        .from('categorias')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw error;
          this.refreshCategorias();
        })
    );
  }

  // Obtener categorías de ingresos
  getCategoriasIngresos(): Observable<Categoria[]> {
    return this.getCategoriasByTipo('ingreso');
  }

  // Obtener categorías de gastos
  getCategoriasGastos(): Observable<Categoria[]> {
    return this.getCategoriasByTipo('gasto');
  }

  // Crear categorías por defecto para un nuevo usuario
  createCategoriasDefault(): Observable<Categoria[]> {
    const categoriasDefault = [
      // Categorías de ingresos
      { nombre: 'Salario', tipo: 'ingreso' as TipoMovimiento },
      { nombre: 'Freelance', tipo: 'ingreso' as TipoMovimiento },
      { nombre: 'Inversiones', tipo: 'ingreso' as TipoMovimiento },
      { nombre: 'Otros ingresos', tipo: 'ingreso' as TipoMovimiento },
      
      // Categorías de gastos
      { nombre: 'Alimentación', tipo: 'gasto' as TipoMovimiento },
      { nombre: 'Transporte', tipo: 'gasto' as TipoMovimiento },
      { nombre: 'Vivienda', tipo: 'gasto' as TipoMovimiento },
      { nombre: 'Entretenimiento', tipo: 'gasto' as TipoMovimiento },
      { nombre: 'Salud', tipo: 'gasto' as TipoMovimiento },
      { nombre: 'Educación', tipo: 'gasto' as TipoMovimiento },
      { nombre: 'Servicios', tipo: 'gasto' as TipoMovimiento },
      { nombre: 'Otros gastos', tipo: 'gasto' as TipoMovimiento }
    ];

    return from(
      this.supabase
        .from('categorias')
        .insert(categoriasDefault)
        .select()
        .then(({ data, error }) => {
          if (error) throw error;
          this.refreshCategorias();
          return data || [];
        })
    );
  }

  // Refrescar la lista de categorías
  private refreshCategorias(): void {
    this.getCategorias().subscribe();
  }
}