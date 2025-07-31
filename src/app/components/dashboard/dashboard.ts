import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../services/supabaseLoginService';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {
  isDropdownOpen = false;
  userName = 'Usuario';

  constructor(
    private router: Router,
    private supabaseAuth: SupabaseAuthService
  ) {
    this.loadUserData();
  }

  private loadUserData() {
    this.supabaseAuth.currentUser$.subscribe(user => {
      if (user) {
        // Intentar obtener el nombre del usuario desde los metadatos
        const name = user.user_metadata?.['name'];
        const displayName = user.user_metadata?.['display_name'];
        const emailName = user.email?.split('@')[0];
        
        this.userName = name || displayName || emailName || 'Usuario';
      } else {
        this.userName = 'Usuario';
      }
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  async logout() {
    try {
      const result = await this.supabaseAuth.logout();
      if (result.success) {
        this.router.navigate(['/login']);
      } else {
        console.error('Error al cerrar sesión:', result.message);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}