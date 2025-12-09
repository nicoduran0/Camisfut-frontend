import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CarritoService, CarritoItem } from '../../services/carrito.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carrito.component.html',
  styleUrl: './carrito.component.css'
})
export class CarritoComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  userName = '';
  carritoItems: CarritoItem[] = [];
  mostrarModalVaciar = false;
  private carritoSubscription: any;

  constructor(
    private authService: AuthService,
    public carritoService: CarritoService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(loggedIn => this.isLoggedIn = loggedIn);
    this.authService.user$.subscribe(user => this.userName = user?.nombre || '');
    this.carritoSubscription = this.carritoService.carritoItems$.subscribe(items => this.carritoItems = items);
  }

  ngOnDestroy() {
    this.carritoSubscription?.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
  }

  onErrorImagen(event: any, index: number): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';

    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-imagen-carrito';
    placeholder.innerHTML = '<i class="bi bi-image"></i>';

    img.parentNode?.insertBefore(placeholder, img.nextSibling);
  }

  get totalArticulos(): number {
    return this.carritoService.getTotalItems();
  }

  get subtotal(): number {
    return this.carritoService.getSubtotal();
  }

  get total(): number {
    return this.subtotal;
  }

  cambiarCantidad(index: number, cambio: number): void {
    const item = this.carritoItems[index];
    if (!item) return;

    const nuevaCantidad = item.cantidad + cambio;
    if (nuevaCantidad < 1) {
      this.eliminarItem(index);
    } else {
      this.carritoService.actualizarCantidad(item.id, nuevaCantidad);
    }
  }

  eliminarItem(index: number): void {
    const item = this.carritoItems[index];
    if (item) this.carritoService.eliminarItem(item.id);
  }

  abrirModalVaciar(): void {
    if (this.carritoItems.length > 0) this.mostrarModalVaciar = true;
  }

  cerrarModalVaciar(): void {
    this.mostrarModalVaciar = false;
  }

  vaciarCarrito(): void {
    this.carritoService.vaciarCarrito();
    this.cerrarModalVaciar();
  }

  procederPago(): void {
    if (this.carritoItems.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    if (!this.isLoggedIn) {
      alert('Debes iniciar sesión para proceder al pago');
      this.router.navigate(['/inicio-sesion']);
      return;
    }
    this.router.navigate(['/pago']);
  }
}
