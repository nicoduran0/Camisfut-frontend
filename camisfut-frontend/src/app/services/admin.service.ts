import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Producto } from '../models/producto';
import { ProductoService } from './producto.service';

// Tipo extendido para productos con propiedades de admin
type ProductoAdmin = Producto & {
  eliminado?: boolean;
  esModificado?: boolean;
  fechaCreacion?: Date;
};

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private productosAdminKey = 'camisfut_admin_modificaciones';
  private sessionKey = 'camisfut_admin_session';

  // BehaviorSubject para manejar productos modificados
  private productosModificadosSubject = new BehaviorSubject<ProductoAdmin[]>([]);
  productosModificados$ = this.productosModificadosSubject.asObservable();

  constructor(
    private productoService: ProductoService
  ) {
    this.cargarModificaciones();
  }

  /**
   * LOGIN de administrador
   */
  login(email: string, password: string): boolean {
    // Credenciales para admin
    const credencialesValidas = {
      email: 'admin@camisfut.com',
      password: 'admin123'
    };

    if (email === credencialesValidas.email && password === credencialesValidas.password) {
      const sessionData = {
        email: email,
        loggedIn: true,
        timestamp: new Date().getTime()
      };

      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
      return true;
    }

    return false;
  }

  /**
   * Verificar si está logueado
   */
  isLoggedIn(): boolean {
    const sessionData = localStorage.getItem(this.sessionKey);
    if (!sessionData) return false;

    try {
      const session = JSON.parse(sessionData);
      return session.loggedIn === true;
    } catch {
      return false;
    }
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    localStorage.removeItem(this.sessionKey);
  }

  /**
   * Cargar modificaciones guardadas
   */
  private cargarModificaciones(): void {
    try {
      const modificacionesData = localStorage.getItem(this.productosAdminKey);
      if (modificacionesData) {
        const modificaciones: ProductoAdmin[] = JSON.parse(modificacionesData);
        // Convertir fechas string a Date
        const modificacionesConFechas = modificaciones.map(mod => ({
          ...mod,
          fechaCreacion: mod.fechaCreacion ? new Date(mod.fechaCreacion) : undefined
        }));
        this.productosModificadosSubject.next(modificacionesConFechas);
      }
    } catch (error) {
      console.error('Error cargando modificaciones:', error);
    }
  }

  /**
   * Guardar modificaciones
   */
  private guardarModificaciones(modificaciones: ProductoAdmin[]): void {
    try {
      localStorage.setItem(this.productosAdminKey, JSON.stringify(modificaciones));
      this.productosModificadosSubject.next(modificaciones);
    } catch (error) {
      console.error('Error guardando modificaciones:', error);
    }
  }

  /**
   * Obtener TODOS los productos (backend + modificaciones)
   */
  getProductos(): Observable<ProductoAdmin[]> {
    return new Observable<ProductoAdmin[]>(observer => {
      // Primero obtener productos del backend
      this.productoService.getProductos().subscribe({
        next: (productosBackend) => {
          // Obtener modificaciones locales
          const modificaciones = this.productosModificadosSubject.value;

          // Combinar: usar modificaciones sobre backend
          const productosCombinados = this.combinarProductos(productosBackend, modificaciones);

          observer.next(productosCombinados);
          observer.complete();
        },
        error: (error) => {
          console.error('Error obteniendo productos del backend:', error);
          // Usar solo modificaciones si falla el backend
          observer.next(this.productosModificadosSubject.value);
          observer.complete();
        }
      });
    });
  }

  /**
   * Combinar productos backend con modificaciones
   */
  private combinarProductos(backend: Producto[], modificaciones: ProductoAdmin[]): ProductoAdmin[] {
    const productosMap = new Map<number, ProductoAdmin>();

    backend.forEach(producto => {
      productosMap.set(producto.id, { ...producto, esModificado: false });
    });

    modificaciones.forEach(modificacion => {
      const index = productosMap.has(modificacion.id);

      if (index) {
        // Actualizar producto existente
        productosMap.set(modificacion.id, {
          ...(productosMap.get(modificacion.id)!),
          ...modificacion,
          esModificado: true
        });
      } else {
        // Añadir nuevo producto
        productosMap.set(modificacion.id, {
          ...modificacion,
          esModificado: true
        });
      }
    });

    return Array.from(productosMap.values());
  }

  /**
   * Obtener producto por ID
   */
  getProducto(id: number): Observable<ProductoAdmin | null> {
    return new Observable<ProductoAdmin | null>(observer => {
      this.getProductos().subscribe({
        next: (productos) => {
          const producto = productos.find(p => p.id === id);
          observer.next(producto || null);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Crear nuevo producto
   */
  crearProducto(productoData: any): Observable<ProductoAdmin> {
    return new Observable<ProductoAdmin>(observer => {
      this.getProductos().subscribe({
        next: (productosActuales) => {
          // Generar nuevo ID (más alto que todos los existentes)
          const maxId = productosActuales.length > 0
            ? Math.max(...productosActuales.map(p => p.id))
            : 0;

          const nuevoProducto: ProductoAdmin = {
            id: maxId + 1,
            nombre: productoData.nombre || 'Nuevo Producto',
            descripcion: productoData.descripcion || '',
            precio: productoData.precio || 0,
            club: productoData.club || '',
            tipo: productoData.tipo || 'nuevas',
            categoria: productoData.categoria || 'clubes',
            liga: productoData.liga || '',
            retro: productoData.retro || false,
            stock: productoData.stock || 0,
            imagenes: productoData.imagenes || ['default.jpg'],
            tallasDisponibles: productoData.tallasDisponibles || ['S', 'M', 'L', 'XL'],
            fechaCreacion: new Date(),
            esModificado: true
          };

          // Guardar como modificación
          const modificaciones = this.productosModificadosSubject.value;
          modificaciones.push(nuevoProducto);
          this.guardarModificaciones(modificaciones);

          observer.next(nuevoProducto);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Actualizar producto existente
   */
  actualizarProducto(id: number, productoData: any): Observable<ProductoAdmin | null> {
    return new Observable<ProductoAdmin | null>(observer => {
      this.getProductos().subscribe({
        next: (productos) => {
          const productoOriginal = productos.find(p => p.id === id);

          if (!productoOriginal) {
            observer.next(null);
            observer.complete();
            return;
          }

          // Crear producto actualizado
          const productoActualizado: ProductoAdmin = {
            ...productoOriginal,
            ...productoData,
            id: id,
            esModificado: true
          };

          // Guardar como modificación
          const modificaciones = this.productosModificadosSubject.value;
          const index = modificaciones.findIndex(p => p.id === id);

          if (index !== -1) {
            modificaciones[index] = productoActualizado;
          } else {
            modificaciones.push(productoActualizado);
          }

          this.guardarModificaciones(modificaciones);

          observer.next(productoActualizado);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Eliminar producto
   */
  eliminarProducto(id: number): Observable<boolean> {
    return new Observable<boolean>(observer => {
      const modificaciones = this.productosModificadosSubject.value;

      const index = modificaciones.findIndex(p => p.id === id);

      if (index !== -1) {
        // Marcar como eliminado
        modificaciones[index] = {
          ...modificaciones[index],
          eliminado: true,
          stock: 0
        };
      } else {
        // Crear nueva modificación para marcar como eliminado
        const productoEliminado: ProductoAdmin = {
          id: id,
          nombre: `ELIMINADO_${id}`,
          descripcion: 'Producto eliminado',
          precio: 0,
          club: 'ELIMINADO',
          tipo: 'nuevas',
          categoria: 'clubes',
          liga: '',
          retro: false,
          stock: 0,
          imagenes: ['default.jpg'],
          tallasDisponibles: [],
          eliminado: true,
          esModificado: true
        };
        modificaciones.push(productoEliminado);
      }

      this.guardarModificaciones(modificaciones);
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Obtener productos filtrados
   */
  getProductosFiltrados(): Observable<Producto[]> {
    return new Observable<Producto[]>(observer => {
      this.getProductos().subscribe({
        next: (productos) => {
          // Filtrar productos eliminados y convertir a Producto
          const productosFiltrados = productos
            .filter(p => !p.eliminado)
            .map(p => {
              // Remover propiedades específicas de admin para el catálogo
              const { eliminado, esModificado, ...productoBase } = p;
              return productoBase as Producto;
            });

          observer.next(productosFiltrados);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Restaurar producto eliminado
   */
  restaurarProducto(id: number): Observable<boolean> {
    const modificaciones = this.productosModificadosSubject.value;
    const index = modificaciones.findIndex(p => p.id === id);

    if (index !== -1 && modificaciones[index].eliminado) {
      // Eliminar la modificación de eliminación
      modificaciones.splice(index, 1);
      this.guardarModificaciones(modificaciones);
      return of(true);
    }

    return of(false);
  }

  /**
   * Exportar modificaciones
   */
  exportarModificaciones(): string {
    return JSON.stringify(this.productosModificadosSubject.value, null, 2);
  }

  /**
   * Importar modificaciones
   */
  importarModificaciones(jsonData: string): boolean {
    try {
      const modificaciones: ProductoAdmin[] = JSON.parse(jsonData);
      this.guardarModificaciones(modificaciones);
      return true;
    } catch (error) {
      console.error('Error importando modificaciones:', error);
      return false;
    }
  }

  /**
   * Limpiar todas las modificaciones
   */
  limpiarModificaciones(): void {
    this.guardarModificaciones([]);
  }

  /**
   * Sincronizar con backend
   */
  sincronizarConBackend(): Observable<boolean> {
    console.log('🔄 Sincronizando modificaciones con backend...');

    return new Observable<boolean>(observer => {
      setTimeout(() => {
        console.log('✅ Modificaciones sincronizadas (simulado)');
        observer.next(true);
        observer.complete();
      }, 1500);
    });
  }

  /**
   * Obtener solo modificaciones
   */
  getModificaciones(): ProductoAdmin[] {
    return this.productosModificadosSubject.value;
  }

  /**
   * Verificar si un producto está modificado
   */
  estaModificado(id: number): boolean {
    const modificaciones = this.productosModificadosSubject.value;
    return modificaciones.some(p => p.id === id);
  }

  /**
   * Verificar si un producto está eliminado
   */
  estaEliminado(id: number): boolean {
    const modificaciones = this.productosModificadosSubject.value;
    const modificacion = modificaciones.find(p => p.id === id);
    return modificacion?.eliminado || false;
  }
}
