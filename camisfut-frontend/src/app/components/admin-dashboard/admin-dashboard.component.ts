import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../models/producto';

type ProductoAdmin = Producto & {
  esModificado?: boolean;
  eliminado?: boolean;
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  productos: ProductoAdmin[] = [];
  productosFiltrados: ProductoAdmin[] = [];

  productoForm: any = {
    id: 0,
    nombre: '',
    descripcion: '',
    precio: 0,
    club: '',
    tipo: 'nuevas',
    categoria: 'clubes',
    liga: '',
    retro: false,
    stock: 0,
    imagenes: ['default.jpg'],
    tallasDisponibles: ['S', 'M', 'L', 'XL']
  };

  // Estados
  loading: boolean = true;
  error: string = '';
  successMessage: string = '';
  mostrarModal: boolean = false;
  modoEdicion: 'crear' | 'editar' = 'crear';

  // Filtros
  terminoBusqueda: string = '';
  filtroTipo: string = 'todos';
  filtroCategoria: string = 'todos';
  filtroStock: string = 'todos';

  // Estadísticas
  estadisticas = {
    total: 0,
    nuevas: 0,
    vintage: 0,
    fanVersion: 0,
    sinStock: 0,
    modificados: 0
  };

  // Herramientas Admin
  mostrarHerramientas: boolean = false;
  jsonExport: string = '';

  // Suscripciones
  private subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private adminService: AdminService,
    private productoService: ProductoService
  ) {}

  ngOnInit() {
    // Verificar si está logueado
    if (!this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin']);
      return;
    }

    this.cargarProductosReales();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /**
   * Cargar productos REALES del backend
   */
  cargarProductosReales() {
    this.loading = true;
    this.error = '';

    // Primero obtener productos del backend
    this.subscriptions.add(
      this.productoService.getProductos().subscribe({
        next: (productosBackend) => {
          console.log(`📦 ${productosBackend.length} productos cargados del backend`);

          // Luego obtener modificaciones del admin
          this.subscriptions.add(
            this.adminService.getProductosFiltrados().subscribe({
              next: (productosModificados) => {
                // Combinar productos backend con modificaciones
                const productosCombinados = this.combinarProductos(
                  productosBackend as ProductoAdmin[],
                  productosModificados as ProductoAdmin[]
                );

                this.productos = productosCombinados;
                this.productosFiltrados = [...productosCombinados];
                this.calcularEstadisticas();
                this.loading = false;

                console.log(`✅ ${productosCombinados.length} productos totales (backend + admin)`);
              },
              error: (error) => {
                // Si falla adminService, usar solo backend
                console.warn('⚠️ Usando solo productos del backend');
                this.productos = productosBackend as ProductoAdmin[];
                this.productosFiltrados = [...productosBackend] as ProductoAdmin[];
                this.calcularEstadisticas();
                this.loading = false;
              }
            })
          );
        },
        error: (error) => {
          console.error('❌ Error cargando productos del backend:', error);
          this.error = 'Error al conectar con el catálogo. Verifica que el backend esté funcionando.';
          this.loading = false;

          // Intentar cargar solo modificaciones como fallback
          this.cargarSoloModificaciones();
        }
      })
    );
  }

  /**
   * Cargar solo modificaciones (fallback)
   */
  private cargarSoloModificaciones() {
    this.subscriptions.add(
      this.adminService.getProductosFiltrados().subscribe({
        next: (productos) => {
          this.productos = productos as ProductoAdmin[];
          this.productosFiltrados = [...productos] as ProductoAdmin[];
          this.calcularEstadisticas();
          this.loading = false;
          console.log(`⚠️ ${productos.length} productos cargados solo de modificaciones`);
        },
        error: (error) => {
          this.error = 'No se pudieron cargar los productos';
          this.loading = false;
        }
      })
    );
  }

  /**
   * Combinar productos backend con modificaciones
   */
  private combinarProductos(backend: ProductoAdmin[], modificaciones: ProductoAdmin[]): ProductoAdmin[] {
    const productosMap = new Map<number, ProductoAdmin>();

    // Primero añadir todos los productos del backend
    backend.forEach(producto => {
      productosMap.set(producto.id, { ...producto, esModificado: false });
    });

    // Luego sobrescribir con modificaciones del admin
    modificaciones.forEach(modificacion => {
      if (modificacion.id) {
        const productoExistente = productosMap.get(modificacion.id);
        productosMap.set(modificacion.id, {
          ...(productoExistente || {}),
          ...modificacion,
          esModificado: true // Marcar como modificado
        } as ProductoAdmin);
      }
    });

    return Array.from(productosMap.values());
  }

  /**
   * Calcular estadísticas avanzadas
   */
  calcularEstadisticas() {
    const productosActivos = this.productos.filter(p => !p.eliminado);

    this.estadisticas = {
      total: productosActivos.length,
      nuevas: productosActivos.filter(p => p.tipo === 'nuevas').length,
      vintage: productosActivos.filter(p => p.tipo === 'vintage').length,
      fanVersion: productosActivos.filter(p => p.tipo === 'fanVersion').length,
      sinStock: productosActivos.filter(p => p.stock === 0).length,
      modificados: productosActivos.filter(p => p.esModificado).length
    };
  }

  /**
   * Filtrar productos avanzado
   */
  filtrarProductos() {
    this.productosFiltrados = this.productos.filter(producto => {
      // Filtrar productos eliminados
      if (producto.eliminado) {
        return false;
      }

      // Filtrar por búsqueda
      if (this.terminoBusqueda) {
        const termino = this.terminoBusqueda.toLowerCase();
        const enNombre = producto.nombre.toLowerCase().includes(termino);
        const enClub = producto.club.toLowerCase().includes(termino);
        const enDescripcion = (producto.descripcion || '').toLowerCase().includes(termino);

        if (!enNombre && !enClub && !enDescripcion) {
          return false;
        }
      }

      // Filtrar por tipo
      if (this.filtroTipo !== 'todos' && producto.tipo !== this.filtroTipo) {
        return false;
      }

      // Filtrar por categoría
      if (this.filtroCategoria !== 'todos' && producto.categoria !== this.filtroCategoria) {
        return false;
      }

      // Filtrar por stock
      if (this.filtroStock !== 'todos') {
        if (this.filtroStock === 'conStock' && producto.stock <= 0) {
          return false;
        }
        if (this.filtroStock === 'sinStock' && producto.stock > 0) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Abrir modal para crear producto
   */
  abrirCrearProducto() {
    this.modoEdicion = 'crear';
    this.productoForm = {
      id: 0,
      nombre: '',
      descripcion: '',
      precio: 0,
      club: '',
      tipo: 'nuevas',
      categoria: 'clubes',
      liga: '',
      retro: false,
      stock: 0,
      imagenes: ['default.jpg'],
      tallasDisponibles: ['S', 'M', 'L', 'XL']
    };
    this.error = '';
    this.successMessage = '';
    this.mostrarModal = true;
  }

  /**
   * Abrir modal para editar producto
   */
  abrirEditarProducto(producto: ProductoAdmin) {
    this.modoEdicion = 'editar';
    this.productoForm = {
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      club: producto.club,
      tipo: producto.tipo,
      categoria: producto.categoria,
      liga: producto.liga || '',
      retro: producto.retro,
      stock: producto.stock,
      imagenes: [...producto.imagenes],
      tallasDisponibles: [...(producto.tallasDisponibles || ['S', 'M', 'L', 'XL'])]
    };
    this.error = '';
    this.successMessage = '';
    this.mostrarModal = true;
  }

  /**
   * Guardar producto (crear o editar)
   */
  guardarProducto() {
    // Validaciones avanzadas
    if (!this.productoForm.nombre.trim()) {
      this.error = 'El nombre es requerido';
      return;
    }

    if (this.productoForm.nombre.length < 3) {
      this.error = 'El nombre debe tener al menos 3 caracteres';
      return;
    }

    if (!this.productoForm.precio || this.productoForm.precio <= 0) {
      this.error = 'El precio debe ser mayor a 0';
      return;
    }

    if (this.productoForm.precio > 1000) {
      this.error = 'El precio no puede ser mayor a 1000€';
      return;
    }

    if (this.productoForm.stock < 0) {
      this.error = 'El stock no puede ser negativo';
      return;
    }

    if (!this.productoForm.club.trim()) {
      this.error = 'El club es requerido';
      return;
    }

    this.loading = true;
    this.error = '';

    if (this.modoEdicion === 'crear') {
      // Crear nuevo producto
      this.subscriptions.add(
        this.adminService.crearProducto(this.productoForm).subscribe({
          next: (producto) => {
            this.successMessage = `✅ Producto "${producto.nombre}" creado exitosamente`;
            this.mostrarModal = false;
            this.loading = false;
            this.cargarProductosReales(); // Recargar productos actualizados
          },
          error: (error) => {
            this.error = '❌ Error al crear producto: ' + (error.message || 'Error desconocido');
            this.loading = false;
          }
        })
      );
    } else {
      // Actualizar producto existente
      this.subscriptions.add(
        this.adminService.actualizarProducto(this.productoForm.id, this.productoForm).subscribe({
          next: (producto) => {
            if (producto) {
              this.successMessage = `✅ Producto "${producto.nombre}" actualizado exitosamente`;
              this.mostrarModal = false;
              this.cargarProductosReales(); // Recargar productos actualizados
            } else {
              this.error = '❌ Producto no encontrado';
            }
            this.loading = false;
          },
          error: (error) => {
            this.error = '❌ Error al actualizar producto: ' + (error.message || 'Error desconocido');
            this.loading = false;
          }
        })
      );
    }
  }

  /**
   * Eliminar producto (marcar como eliminado)
   */
  eliminarProducto(producto: ProductoAdmin) {
    if (confirm(`¿Estás seguro de eliminar "${producto.nombre}"?\n\nEl producto se ocultará del catálogo público pero podrás restaurarlo después.`)) {
      this.loading = true;

      this.subscriptions.add(
        this.adminService.eliminarProducto(producto.id).subscribe({
          next: (exito) => {
            if (exito) {
              this.successMessage = `🗑️ Producto "${producto.nombre}" eliminado (oculto del catálogo)`;
              this.cargarProductosReales();
            } else {
              this.error = '❌ Error al eliminar producto';
            }
            this.loading = false;
          },
          error: (error) => {
            this.error = '❌ Error al eliminar producto: ' + (error.message || 'Error desconocido');
            this.loading = false;
          }
        })
      );
    }
  }

  /**
   * Restaurar producto eliminado
   */
  restaurarProducto(producto: ProductoAdmin) {
    this.loading = true;

    this.subscriptions.add(
      this.adminService.restaurarProducto(producto.id).subscribe({
        next: (exito) => {
          if (exito) {
            this.successMessage = `↩️ Producto "${producto.nombre}" restaurado exitosamente`;
            this.cargarProductosReales();
          } else {
            this.error = '❌ Error al restaurar producto';
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = '❌ Error al restaurar producto';
          this.loading = false;
        }
      })
    );
  }

  /**
   * Funciones para imágenes
   */
  agregarImagen() {
    this.productoForm.imagenes.push('default.jpg');
  }

  removerImagen(index: number) {
    if (this.productoForm.imagenes.length > 1) {
      this.productoForm.imagenes.splice(index, 1);
    } else {
      this.error = '⚠️ Debe haber al menos una imagen';
    }
  }

  /**
   * Funciones para tallas
   */
  agregarTalla(talla: string) {
    if (!this.productoForm.tallasDisponibles.includes(talla)) {
      this.productoForm.tallasDisponibles.push(talla);
    }
  }

  removerTalla(talla: string) {
    if (this.productoForm.tallasDisponibles.length > 1) {
      const index = this.productoForm.tallasDisponibles.indexOf(talla);
      if (index > -1) {
        this.productoForm.tallasDisponibles.splice(index, 1);
      }
    } else {
      this.error = '⚠️ Debe haber al menos una talla disponible';
    }
  }

  /**
   * Cerrar modal
   */
  cerrarModal() {
    this.mostrarModal = false;
    this.error = '';
    this.successMessage = '';
  }

  /**
   * Cerrar sesión
   */
  logout() {
    this.adminService.logout();
    this.router.navigate(['/admin']);
  }

  /**
   * Limpiar todas las modificaciones
   */
  limpiarModificaciones() {
    if (confirm('¿Limpiar TODAS las modificaciones?\n\nSe restaurarán los productos originales del catálogo.\nEsta acción no se puede deshacer.')) {
      this.adminService.limpiarModificaciones();
      this.successMessage = '🧹 Todas las modificaciones han sido eliminadas';
      this.cargarProductosReales();
    }
  }

  /**
   * Exportar modificaciones
   */
  exportarModificaciones() {
    this.jsonExport = this.adminService.exportarModificaciones();
    this.mostrarHerramientas = true;
    this.successMessage = '📤 Modificaciones listas para exportar';
  }

  /**
   * Importar modificaciones
   */
  importarModificaciones() {
    if (this.jsonExport.trim()) {
      const exito = this.adminService.importarModificaciones(this.jsonExport);
      if (exito) {
        this.successMessage = '📥 Modificaciones importadas exitosamente';
        this.cargarProductosReales();
      } else {
        this.error = '❌ Error al importar modificaciones (JSON inválido)';
      }
    } else {
      this.error = '⚠️ Primero pega el JSON de modificaciones';
    }
  }

  /**
   * Sincronizar con backend (simulado)
   */
  sincronizar() {
    this.loading = true;
    this.successMessage = '🔄 Sincronizando modificaciones...';

    this.subscriptions.add(
      this.adminService.sincronizarConBackend().subscribe({
        next: (exito) => {
          if (exito) {
            this.successMessage = '✅ Modificaciones sincronizadas correctamente';
          } else {
            this.error = '❌ Error en sincronización';
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = '❌ Error en sincronización';
          this.loading = false;
        }
      })
    );
  }

  /**
   * Refrescar productos
   */
  refrescarProductos() {
    this.cargarProductosReales();
    this.successMessage = '🔄 Productos actualizados';
  }

  /**
   * Mostrar/ocultar herramientas
   */
  toggleHerramientas() {
    this.mostrarHerramientas = !this.mostrarHerramientas;
  }

  /**
   * Obtener badge para producto modificado
   */
  getModificadoBadge(producto: ProductoAdmin): string {
    if (producto.eliminado) {
      return 'Eliminado';
    }
    if (producto.esModificado) {
      return 'Modificado';
    }
    return 'Original';
  }

  /**
   * Obtener clase CSS para badge
   */
  getBadgeClass(producto: ProductoAdmin): string {
    if (producto.eliminado) {
      return 'bg-danger';
    }
    if (producto.esModificado) {
      return 'bg-warning text-dark';
    }
    return 'bg-secondary';
  }

  /**
   * Verificar si un producto está eliminado
   */
  estaEliminado(producto: ProductoAdmin): boolean {
    return !!producto.eliminado;
  }

  /**
   * Verificar si un producto está modificado
   */
  estaModificado(producto: ProductoAdmin): boolean {
    return !!producto.esModificado;
  }
}
