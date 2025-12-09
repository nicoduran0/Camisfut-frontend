import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  // Datos del formulario
  adminData = {
    email: '',
    password: ''
  };

  // Estados
  error: string = '';
  loading: boolean = false;

  constructor(
    private router: Router,
    private adminService: AdminService
  ) {}

  /**
   * Enviar formulario de login
   */
  onSubmit() {
    // Validar campos
    if (!this.adminData.email || !this.adminData.password) {
      this.error = 'Por favor, completa todos los campos';
      return;
    }

    // Mostrar loading
    this.loading = true;
    this.error = '';

    // Simular delay de red (opcional, pero da mejor experiencia)
    setTimeout(() => {
      // Intentar login
      const loginExitoso = this.adminService.login(
        this.adminData.email,
        this.adminData.password
      );

      if (loginExitoso) {
        // Redirigir al dashboard
        this.router.navigate(['/admin/dashboard']);
      } else {
        // Mostrar error
        this.error = 'Credenciales incorrectas. Usa: admin@camisfut.com / admin123';
        this.loading = false;
      }
    }, 800);
  }

  /**
   * Ir al inicio público
   */
  irAlInicio() {
    this.router.navigate(['/inicio']);
  }
}
