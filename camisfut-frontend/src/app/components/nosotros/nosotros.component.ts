import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './nosotros.component.html',
  styleUrl: './nosotros.component.css'
})
export class NosotrosComponent implements OnInit {
  isLoggedIn: boolean = false;
  userName: string = '';

  contactoData = {
    nombre: '',
    email: '',
    asunto: '',
    mensaje: ''
  };

  mostrarExito: boolean = false;

  constructor(
    private authService: AuthService,
    private carritoService: CarritoService
  ) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });

    this.authService.user$.subscribe(user => {
      this.userName = user?.nombre || '';
    });
  }

  logout(): void {
    this.authService.logout();
  }

  /**
   * Cerrar dropdown manualmente
   */
  closeDropdown(): void {
    const dropdownElement = document.querySelector('[data-bs-toggle="dropdown"]');
    if (dropdownElement) {
      const dropdown = (window as any).bootstrap?.Dropdown?.getInstance(dropdownElement);
      if (dropdown) {
        dropdown.hide();
      }
    }
  }

  get totalItemsCarrito(): number {
    return this.carritoService.getTotalItems();
  }

  enviarMensaje() {
    if (!this.contactoData.nombre || !this.contactoData.email || !this.contactoData.asunto || !this.contactoData.mensaje) {
      alert('Por favor, completa todos los campos del formulario');
      return;
    }

    console.log('Datos de contacto:', this.contactoData);

    // Mostrar mensaje de éxito
    this.mostrarExito = true;

    // Limpiar formulario después de enviar
    this.contactoData = {
      nombre: '',
      email: '',
      asunto: '',
      mensaje: ''
    };

    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
      this.mostrarExito = false;
    }, 5000);
  }

  cerrarMensaje() {
    this.mostrarExito = false;
  }
}
