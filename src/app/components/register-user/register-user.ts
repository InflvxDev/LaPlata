import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  // Método para manejar el envío del formulario
  onSubmit() {
    if (this.isValidForm()) {
      this.isLoading = true;
      // Aquí iría la lógica para registrar al usuario
      setTimeout(() => {
        this.isLoading = false;
        // Redirección o mensaje de éxito
      }, 1500);
    }
  }
}
