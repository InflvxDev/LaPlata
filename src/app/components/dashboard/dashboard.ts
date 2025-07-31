import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../services/supabaseLoginService';
import { DashboardService, DashboardStats } from '../../services/dashboardService';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  isDropdownOpen = false;
  userName = 'Usuario';
  dashboardStats: DashboardStats | null = null;
  isLoading = true;

  constructor(
    private router: Router,
    private supabaseAuth: SupabaseAuthService,
    private dashboardService: DashboardService
  ) {
    this.loadUserData();
  }

  ngOnInit() {
    this.loadDashboardData();
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

  private loadDashboardData() {
    this.isLoading = true;
    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del dashboard:', error);
        this.isLoading = false;
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