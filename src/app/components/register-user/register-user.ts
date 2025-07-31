import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseAuthService, RegisterData } from '../../services';

@Component({
  selector: 'app-register-user',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './register-user.html',
  styleUrl: './register-user.css'
})
export class RegisterUser {
  // Propiedades básicas para el formulario de registro
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  name: string = '';
  termsAccepted: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private authService: SupabaseAuthService,
    private router: Router
  ) {}

  // Método para alternar la visibilidad de la contraseña
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Método para alternar la visibilidad de la confirmación de contraseña
  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Método para validar el formulario
  isValidForm(): boolean {
    return (
      this.email?.length > 0 &&
      this.password?.length >= 6 &&
      this.password === this.confirmPassword &&
      this.name?.length > 0 &&
      this.termsAccepted
    );
  }

  // Método para limpiar mensajes
  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Método para manejar el envío del formulario
  async onSubmit() {
    if (!this.isValidForm()) {
      this.errorMessage = 'Por favor, completa todos los campos correctamente';
      return;
    }

    this.clearMessages();
    this.isLoading = true;

    try {
      const registerData: RegisterData = {
        email: this.email,
        password: this.password,
        name: this.name
      };

      const response = await this.authService.register(registerData);

      if (response.success) {
        this.successMessage = response.message;
        
        // Si el registro fue exitoso, redirigir después de un breve delay
        setTimeout(() => {
          if (response.user?.email_confirmed_at) {
            // Usuario confirmado, ir al dashboard
            this.router.navigate(['/dashboard']);
          } else {
            // Usuario necesita confirmar email, ir al login
            this.router.navigate(['/login'], { 
              queryParams: { message: 'Por favor, verifica tu email antes de iniciar sesión' }
            });
          }
        }, 2000);
      } else {
        this.errorMessage = response.message;
      }
    } catch (error) {
      this.errorMessage = 'Error inesperado. Por favor, intenta nuevamente.';
      console.error('Error en registro:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Método para validar email en tiempo real
  validateEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  // Método para validar contraseña en tiempo real
  validatePassword(): boolean {
    return this.password.length >= 6;
  }

  // Método para validar confirmación de contraseña
  validateConfirmPassword(): boolean {
    return this.password === this.confirmPassword && this.confirmPassword.length > 0;
  }
}
