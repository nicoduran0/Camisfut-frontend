import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, RegisterRequest } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-inicio-sesion',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './inicio-sesion.component.html',
  styleUrl: './inicio-sesion.component.css'
})
export class InicioSesionComponent {
  formularioActivo: string = 'login';
  mostrarExito: boolean = false;
  mensajeExito: string = '';
  tipoAccion: string = '';
  loading: boolean = false;
  error: string = '';

  loginData = {
    email: '',
    password: ''
  };

  registerData = {
    nombre: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private carritoService: CarritoService
  ) {}

  get totalItemsCarrito(): number {
    return this.carritoService.getTotalItems();
  }

  cambiarFormulario(tipo: string) {
    this.formularioActivo = tipo;
    this.error = '';
  }

  onLoginSubmit() {
    if (!this.loginData.email || !this.loginData.password) {
      this.error = 'Por favor, completa todos los campos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        this.loading = false;
        this.mostrarMensajeExito('login', response.user.nombre);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error al iniciar sesión';
        console.error('Error completo:', error);
      }
    });
  }

  onRegisterSubmit() {
    if (!this.registerData.nombre || !this.registerData.email || !this.registerData.password || !this.registerData.confirmPassword) {
      this.error = 'Por favor, completa todos los campos';
      return;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;
    this.error = '';

    const registerRequest: RegisterRequest = {
      nombre: this.registerData.nombre,
      email: this.registerData.email,
      password: this.registerData.password
    };

    this.authService.register(registerRequest).subscribe({
      next: (response) => {
        this.loading = false;
        this.mostrarMensajeExito('registro', this.registerData.nombre);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error al registrar usuario';
        console.error('Error completo:', error);
      }
    });
  }

  mostrarMensajeExito(tipo: string, nombre: string) {
    this.tipoAccion = tipo;
    this.mostrarExito = true;

    if (tipo === 'login') {
      this.mensajeExito = `¡Bienvenido de nuevo, ${nombre}!`;
    } else {
      this.mensajeExito = `¡Cuenta creada exitosamente, ${nombre}!`;
    }

    setTimeout(() => {
      this.router.navigate(['/inicio']);
    }, 2000);
  }

  cerrarMensaje() {
    this.mostrarExito = false;
    this.router.navigate(['/inicio']);
  }
}
