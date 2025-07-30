import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login-user',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterModule, FormsModule],
  templateUrl: './login-user.html',
  styleUrl: './login-user.css'
})
export class LoginUser {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showPassword: boolean = false;
  isLoading: boolean = false;
  loginError: string = '';

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.isValidForm()) {
      this.isLoading = true;
      this.loginError = '';
      
      console.log('Login attempt:', {
        email: this.email,
        password: this.password,
        rememberMe: this.rememberMe
      });
      
      // Simular proceso de login
      setTimeout(() => {
        this.isLoading = false;
        // Aquí implementarás la lógica de autenticación real
        // Por ahora, simular un error para demostración
        this.loginError = 'Credenciales incorrectas. Por favor, verifica tu email y contraseña.';
      }, 2000);
    }
  }

  isValidForm(): boolean {
    return this.isValidEmail(this.email) && this.password.length >= 6;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  loginWithGoogle(): void {
    console.log('Login with Google');
    this.isLoading = true;
    // Implementar login con Google
    setTimeout(() => {
      this.isLoading = false;
    }, 1500);
  }

  loginWithGitHub(): void {
    console.log('Login with GitHub');
    this.isLoading = true;
    // Implementar login con GitHub
    setTimeout(() => {
      this.isLoading = false;
    }, 1500);
  }

  loginWithApple(): void {
    console.log('Login with Apple');
    this.isLoading = true;
    // Implementar login con Apple
    setTimeout(() => {
      this.isLoading = false;
    }, 1500);
  }
}
