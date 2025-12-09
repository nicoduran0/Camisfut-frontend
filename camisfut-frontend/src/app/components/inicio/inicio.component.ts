import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  userName: string = '';
  totalItemsCarrito: number = 0;

  // Suscripciones para limpiar al destruir
  private authSubscription?: Subscription;
  private userSubscription?: Subscription;
  private carritoSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private carritoService: CarritoService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('🔄 InicioComponent inicializando...');

    this.isLoggedIn = this.authService.isLoggedIn;
    this.userName = this.authService.userName;
    this.totalItemsCarrito = this.carritoService.getTotalItems();

    console.log('📊 Estado inicial:');
    console.log('🔐 Login:', this.isLoggedIn);
    console.log('👤 Usuario:', this.userName);
    console.log('🛒 Items en carrito:', this.totalItemsCarrito);

    this.authSubscription = this.authService.isLoggedIn$.subscribe(loggedIn => {
      console.log('🔄 Estado login actualizado:', loggedIn);
      this.isLoggedIn = loggedIn;
      // Actualizar nombre también
      this.userName = this.authService.userName;
    });

    this.userSubscription = this.authService.user$.subscribe(user => {
      console.log('🔄 Usuario actualizado:', user?.nombre || 'No autenticado');
      this.userName = user?.nombre || '';
    });

    this.carritoSubscription = this.carritoService.carritoItems$.subscribe(items => {
      console.log('🔄 Carrito actualizado:', items.length, 'items');
      this.totalItemsCarrito = this.carritoService.getTotalItems();
      console.log('🛒 Total items:', this.totalItemsCarrito);
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.carritoSubscription) {
      this.carritoSubscription.unsubscribe();
    }
    console.log('🧹 InicioComponent destruido');
  }

  logout(): void {
    console.log('👋 Cerrando sesión...');

    this.closeDropdown();

    this.authService.logout();

    this.isLoggedIn = false;
    this.userName = '';

    setTimeout(() => {
      console.log('↪️ Redirigiendo a inicio...');
      this.router.navigate(['/inicio']).then(() => {
        // Recargar para asegurar que todos los navbars se actualicen
        window.location.reload();
      });
    }, 300);
  }

  closeDropdown(): void {
    // Método para cerrar el dropdown manualmente
    const dropdownElement = document.getElementById('userDropdown');
    if (dropdownElement) {
      // Bootstrap 5
      const dropdown = (window as any).bootstrap?.Dropdown?.getInstance(dropdownElement);
      if (dropdown) {
        dropdown.hide();
      } else {
        // Fallback: simular clic
        dropdownElement.click();
      }
    }
  }

  // Método auxiliar para debug
  debugInfo(): void {
    console.group('🔍 DEBUG Info');
    console.log('isLoggedIn:', this.isLoggedIn);
    console.log('userName:', this.userName);
    console.log('totalItemsCarrito:', this.totalItemsCarrito);
    console.log('Carrito items:', this.carritoService.obtenerItems());
    console.groupEnd();
  }
}
