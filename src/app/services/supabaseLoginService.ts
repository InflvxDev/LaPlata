import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { supabase } from '../libs/supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User | null;
  session?: Session | null;
  error?: AuthError | null;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseAuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public session$ = this.sessionSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor() {
    this.initializeAuth();
  }

  /**
   * Inicializa la autenticación y escucha cambios de estado
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Obtener sesión actual
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error al obtener sesión:', error);
        return;
      }

      this.sessionSubject.next(session);
      this.currentUserSubject.next(session?.user ?? null);

      // Escuchar cambios de autenticación
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        this.sessionSubject.next(session);
        this.currentUserSubject.next(session?.user ?? null);
      });
    } catch (error) {
      console.error('Error al inicializar autenticación:', error);
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    this.loadingSubject.next(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            display_name: userData.name
          }
        }
      });

      this.loadingSubject.next(false);

      if (error) {
        return {
          success: false,
          message: this.getErrorMessage(error),
          error
        };
      }

      if (data.user && !data.user.email_confirmed_at) {
        return {
          success: true,
          message: 'Registro exitoso. Por favor, verifica tu email para activar tu cuenta.',
          user: data.user,
          session: data.session
        };
      }

      return {
        success: true,
        message: 'Registro exitoso. ¡Bienvenido!',
        user: data.user,
        session: data.session
      };
    } catch (error) {
      this.loadingSubject.next(false);
      return {
        success: false,
        message: 'Error inesperado durante el registro',
        error: error as AuthError
      };
    }
  }

  /**
   * Inicia sesión con email y contraseña
   */
  async login(loginData: LoginData): Promise<AuthResponse> {
    this.loadingSubject.next(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      this.loadingSubject.next(false);

      if (error) {
        return {
          success: false,
          message: this.getErrorMessage(error),
          error
        };
      }

      return {
        success: true,
        message: '¡Inicio de sesión exitoso!',
        user: data.user,
        session: data.session
      };
    } catch (error) {
      this.loadingSubject.next(false);
      return {
        success: false,
        message: 'Error inesperado durante el inicio de sesión',
        error: error as AuthError
      };
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async logout(): Promise<AuthResponse> {
    this.loadingSubject.next(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      this.loadingSubject.next(false);

      if (error) {
        return {
          success: false,
          message: this.getErrorMessage(error),
          error
        };
      }

      return {
        success: true,
        message: 'Sesión cerrada exitosamente'
      };
    } catch (error) {
      this.loadingSubject.next(false);
      return {
        success: false,
        message: 'Error al cerrar sesión',
        error: error as AuthError
      };
    }
  }

  /**
   * Envía email de recuperación de contraseña
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    this.loadingSubject.next(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      this.loadingSubject.next(false);

      if (error) {
        return {
          success: false,
          message: this.getErrorMessage(error),
          error
        };
      }

      return {
        success: true,
        message: 'Se ha enviado un enlace de recuperación a tu email'
      };
    } catch (error) {
      this.loadingSubject.next(false);
      return {
        success: false,
        message: 'Error al enviar email de recuperación',
        error: error as AuthError
      };
    }
  }

  /**
   * Actualiza la contraseña del usuario
   */
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    this.loadingSubject.next(true);
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      this.loadingSubject.next(false);

      if (error) {
        return {
          success: false,
          message: this.getErrorMessage(error),
          error
        };
      }

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente',
        user: data.user
      };
    } catch (error) {
      this.loadingSubject.next(false);
      return {
        success: false,
        message: 'Error al actualizar contraseña',
        error: error as AuthError
      };
    }
  }

  /**
   * Actualiza el perfil del usuario
   */
  async updateProfile(updates: { name?: string; email?: string }): Promise<AuthResponse> {
    this.loadingSubject.next(true);
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: updates.email,
        data: {
          name: updates.name,
          display_name: updates.name
        }
      });

      this.loadingSubject.next(false);

      if (error) {
        return {
          success: false,
          message: this.getErrorMessage(error),
          error
        };
      }

      return {
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: data.user
      };
    } catch (error) {
      this.loadingSubject.next(false);
      return {
        success: false,
        message: 'Error al actualizar perfil',
        error: error as AuthError
      };
    }
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Obtiene la sesión actual
   */
  getCurrentSession(): Session | null {
    return this.sessionSubject.value;
  }

  /**
   * Convierte errores de Supabase en mensajes legibles
   */
  private getErrorMessage(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Credenciales de inicio de sesión inválidas';
      case 'Email not confirmed':
        return 'Email no confirmado. Por favor, verifica tu email';
      case 'User already registered':
        return 'El usuario ya está registrado';
      case 'Password should be at least 6 characters':
        return 'La contraseña debe tener al menos 6 caracteres';
      case 'Unable to validate email address: invalid format':
        return 'Formato de email inválido';
      case 'Email rate limit exceeded':
        return 'Límite de emails excedido. Intenta más tarde';
      case 'Signup is disabled':
        return 'El registro está deshabilitado';
      default:
        return error.message || 'Error desconocido';
    }
  }
}
