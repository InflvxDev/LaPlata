import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseAuthService, LoginData } from '../../services';

@Component({
  selector: 'app-login-user',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterModule, FormsModule],
  templateUrl: './login-user.html',
  styleUrl: './login-user.css'
})
export class LoginUser implements OnInit {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private authService: SupabaseAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Verificar si hay un mensaje de query params (ej: desde registro)
    this.route.queryParams.subscribe(params => {
      if (params['message']) {
        this.successMessage = params['message'];
      }
    });

    // Verificar si el usuario ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Método para limpiar mensajes
  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  async onSubmit(): Promise<void> {
    if (!this.isValidForm()) {
      this.errorMessage = 'Por favor, completa todos los campos correctamente';
      return;
    }

    this.clearMessages();
    this.isLoading = true;

    try {
      const loginData: LoginData = {
        email: this.email,
        password: this.password
      };

      const response = await this.authService.login(loginData);

      if (response.success) {
        this.successMessage = response.message;
        
        // Redirigir al dashboard después de un breve delay
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      } else {
        this.errorMessage = response.message;
      }
    } catch (error) {
      this.errorMessage = 'Error inesperado. Por favor, intenta nuevamente.';
      console.error('Error en login:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async forgotPassword(): Promise<void> {
    if (!this.email) {
      this.errorMessage = 'Por favor, ingresa tu email para recuperar la contraseña';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Por favor, ingresa un email válido';
      return;
    }

    this.clearMessages();
    this.isLoading = true;

    try {
      const response = await this.authService.resetPassword(this.email);
      
      if (response.success) {
        this.successMessage = response.message;
      } else {
        this.errorMessage = response.message;
      }
    } catch (error) {
      this.errorMessage = 'Error al enviar email de recuperación';
      console.error('Error en recuperación:', error);
    } finally {
      this.isLoading = false;
    }
  }

  isValidForm(): boolean {
    return this.isValidEmail(this.email) && this.password.length >= 6;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Método para validar email en tiempo real
  validateEmail(): boolean {
    return this.isValidEmail(this.email);
  }

  // Método para validar contraseña en tiempo real
  validatePassword(): boolean {
    return this.password.length >= 6;
  }

  loginWithGoogle(): void {
    console.log('Login with Google');
    this.isLoading = true;
    // TODO: Implementar login con Google usando Supabase
    // supabase.auth.signInWithOAuth({ provider: 'google' })
    setTimeout(() => {
      this.isLoading = false;
      this.errorMessage = 'Login con Google no implementado aún';
    }, 1500);
  }
}
