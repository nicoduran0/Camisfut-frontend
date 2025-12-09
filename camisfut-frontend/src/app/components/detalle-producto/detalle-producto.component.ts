import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../models/producto';
import { CarritoService } from '../../services/carrito.service';
import { AuthService, User } from '../../services/auth.service';
import { Subscription } from 'rxjs';

interface ProductoConStock extends Producto {
  stock: number;
}

@Component({
  selector: 'app-detalle-producto',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle-producto.component.html',
  styleUrl: './detalle-producto.component.css'
})
export class DetalleProductoComponent implements OnInit, OnDestroy {
  producto: ProductoConStock | null = null;
  loading: boolean = true;
  error: string = '';
  tallaSeleccionada: string = '';
  agregando: boolean = false;

  // Propiedades para autenticación
  isLoggedIn: boolean = false;
  userName: string = '';
  totalItemsCarrito: number = 0;

  // Suscripciones
  private authSubscription!: Subscription;
  private carritoSubscription!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private productoService: ProductoService,
    public carritoService: CarritoService,
    private authService: AuthService  // Inyectar AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.cargarProducto(id);
    });

    // Suscribirse al estado de autenticación
    this.authSubscription = this.authService.isLoggedIn$.subscribe(
      isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
      }
    );

    // Suscribirse a los datos del usuario
    this.authSubscription.add(
      this.authService.user$.subscribe(user => {
        if (user) {
          this.userName = user.nombre || user.email || 'Usuario';
        } else {
          this.userName = '';
        }
      })
    );

    // Suscribirse al carrito para actualizar el contador
    this.carritoSubscription = this.carritoService.carritoItems$.subscribe(items => {
      this.totalItemsCarrito = this.carritoService.getTotalItems();
    });

    // Inicializar valores
    this.isLoggedIn = this.authService.isLoggedIn;
    this.userName = this.authService.userName;
    this.totalItemsCarrito = this.carritoService.getTotalItems();
  }

  ngOnDestroy() {
    // Limpiar suscripciones
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.carritoSubscription) {
      this.carritoSubscription.unsubscribe();
    }
  }

  cargarProducto(id: number) {
    this.loading = true;
    this.error = '';
    this.producto = null;

    this.productoService.getProducto(id).subscribe({
      next: (producto: Producto) => {
        // Asegurar que el producto tenga stock
        const productoConStock: ProductoConStock = {
          ...producto,
          stock: producto.stock ?? 0
        };

        this.producto = productoConStock;
        this.loading = false;
        console.log('✅ Producto cargado:', productoConStock);
      },
      error: (error) => {
        console.error('❌ Error cargando producto:', error);
        this.error = 'Producto no encontrado';
        this.loading = false;
      }
    });
  }

  seleccionarTalla(talla: string) {
    if (this.tallaSeleccionada === talla) {
      this.tallaSeleccionada = '';
    } else {
      this.tallaSeleccionada = talla;
    }
  }

  agregarAlCarrito() {
    if (!this.producto || !this.tallaSeleccionada || this.agregando) {
      return;
    }

    this.agregando = true;

    const itemCarrito = {
      nombre: this.producto.nombre,
      club: this.producto.club,
      precio: this.producto.precio,
      talla: this.tallaSeleccionada,
      imagen: this.producto.imagenes[0] || 'default.jpg'
    };

    try {
      const resultado = this.carritoService.agregarItem({
        id: this.producto.id,
        nombre: this.producto.nombre,
        club: this.producto.club || '',
        precio: this.producto.precio,
        talla: this.tallaSeleccionada,
        imagen: this.producto.imagenes && this.producto.imagenes.length > 0
          ? this.producto.imagenes[0]
          : 'default.jpg' // ← Usa la primera imagen del array
      }, 1);

      if (resultado) {
        console.log('✅ Producto añadido al carrito:', this.producto.nombre);
        setTimeout(() => {
          this.agregando = false;
          this.tallaSeleccionada = '';
          // Actualizar contador
          this.totalItemsCarrito = this.carritoService.getTotalItems();
        }, 500);
      } else {
        console.error('❌ Error añadiendo al carrito');
        this.agregando = false;
      }
    } catch (error) {
      console.error('❌ Error en agregarItem:', error);
      this.agregando = false;
    }
  }

  obtenerNombreImagen(rutaCompleta: string): string {
    return rutaCompleta.split('/').pop() || rutaCompleta;
  }

  onErrorImagen(event: any) {
    const img = event.target;
    img.style.display = 'none';
    const placeholder = img.nextElementSibling;
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  }


  logout() {
    this.authService.logout();
  }
}
