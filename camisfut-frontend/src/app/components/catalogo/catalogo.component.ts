import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';
import { ProductoService } from '../../services/producto.service';
import { AdminService } from '../../services/admin.service';
import { Producto, FiltrosProducto } from '../../models/producto';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  userName: string = '';
  totalItemsCarrito: number = 0;

  precioMaximo: number = 150;
  tallaSeleccionada: { [key: number]: string } = {};
  terminoBusqueda: string = '';

  filtrosActivos = {
    tipo: {
      nuevas: false,
      vintage: false,
      fanVersion: false
    },
    categoria: {
      clubes: false,
      selecciones: false,
      champions: false
    },
    liga: {
      laLiga: false,
      premier: false,
      serieA: false,
      bundesliga: false,
      ligue1: false
    }
  };

  camisetas: Producto[] = [];
  productosFiltrados: Producto[] = [];

  loading: boolean = true;
  error: string = '';
  mostrarNotificacion: boolean = false;
  mensajeNotificacion: string = '';
  notificacionTipo: 'success' | 'error' | 'info' = 'info';
  productoAgregando: number | null = null;

  private subscriptions: Subscription = new Subscription();

  private readonly mapeoFiltros = {
    tipo: {
      nuevas: 1,      // ID 1: Nuevas
      vintage: 2,     // ID 2: Vintage
      fanVersion: 3   // ID 3: Fan Version
    },
    liga: {
      laLiga: 4,        // ID 4: La Liga
      premier: 5,       // ID 5: Premier League
      serieA: 6,        // ID 6: Serie A
      bundesliga: 7,    // ID 7: Bundesliga
      ligue1: 8         // ID 8: Ligue 1
    },
    categoria: {
      clubes: 9,        // ID 9: Clubes
      selecciones: 10,  // ID 10: Selecciones
      champions: 11     // ID 11: Champions League
    }
  };

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private carritoService: CarritoService,
    private productoService: ProductoService,
    private adminService: AdminService // AÑADIR ESTO
  ) {}

  ngOnInit() {
    // Suscripciones de autenticación
    this.subscriptions.add(
      this.authService.isLoggedIn$.subscribe(loggedIn => {
        this.isLoggedIn = loggedIn;
      })
    );

    this.subscriptions.add(
      this.authService.user$.subscribe(user => {
        this.userName = user?.nombre || '';
      })
    );

    this.subscriptions.add(
      this.carritoService.carritoItems$.subscribe(items => {
        this.totalItemsCarrito = this.carritoService.getTotalItems();
      })
    );

    this.isLoggedIn = this.authService.isLoggedIn;
    this.userName = this.authService.userName;
    this.totalItemsCarrito = this.carritoService.getTotalItems();

    this.cargarProductosCombinados();

    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        const filtro = params['filtro'];
        if (filtro) {
          console.log(`🔍 Aplicando filtro desde colección: ${filtro}`);
          this.aplicarFiltroDesdeColeccion(filtro);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  cargarProductosCombinados() {
    this.loading = true;
    this.error = '';

    console.log('🔄 Cargando productos combinados...');

    this.subscriptions.add(
      this.productoService.getProductos().subscribe({
        next: (productosBackend) => {
          console.log(`📦 ${productosBackend.length} productos cargados del backend`);

          this.subscriptions.add(
            this.adminService.getProductosFiltrados().subscribe({
              next: (productosModificados) => {
                const productosCombinados = this.combinarProductosParaCatalogo(
                  productosBackend,
                  productosModificados
                );

                this.camisetas = productosCombinados;
                this.productosFiltrados = [...productosCombinados];
                this.loading = false;

                console.log(`✅ ${productosCombinados.length} productos en catálogo (backend + admin)`);
                console.log(`📊 Productos originales: ${productosBackend.length}`);
                console.log(`📊 Modificaciones aplicadas: ${productosModificados.length}`);

                // DEBUG: Verificar campos importantes
                console.log('📊 Tipos de productos únicos:', [...new Set(productosCombinados.map(p => p.tipo))]);
                console.log('📊 Categorías únicas:', [...new Set(productosCombinados.map(p => p.categoria))]);
                console.log('📊 Ligas únicas:', [...new Set(productosCombinados.filter(p => p.liga).map(p => p.liga))]);

                // Verificar que los productos tengan categoriasIds
                const productosConIds = productosCombinados.filter(p => p.categoriasIds && p.categoriasIds.length > 0);
                console.log(`📊 Productos con categoriasIds: ${productosConIds.length}/${productosCombinados.length}`);

                if (productosCombinados.length > 0) {
                  console.log('📋 Ejemplo de producto combinado:', {
                    id: productosCombinados[0].id,
                    nombre: productosCombinados[0].nombre,
                    precio: productosCombinados[0].precio,
                    stock: productosCombinados[0].stock,
                    tipo: productosCombinados[0].tipo
                  });
                }

                const tiposDistribucion = productosCombinados.reduce((acc, p) => {
                  acc[p.tipo] = (acc[p.tipo] || 0) + 1;
                  return acc;
                }, {} as {[key: string]: number});
                console.log('📈 Distribución por tipo:', tiposDistribucion);

                this.aplicarFiltros();
              },
              error: (error) => {
                console.warn('⚠️ Mostrando solo productos del backend (error admin)');
                this.camisetas = productosBackend;
                this.productosFiltrados = [...productosBackend];
                this.loading = false;
                this.aplicarFiltros();
                this.mostrarMensaje('Catálogo cargado (sin modificaciones)', 'info');
              }
            })
          );
        },
        error: (error) => {
          console.error('❌ Error cargando productos del backend:', error);

          // Intentar cargar solo modificaciones como fallback
          this.cargarSoloModificaciones();
        }
      })
    );
  }

  private cargarSoloModificaciones() {
    console.log('⚠️ Intentando cargar solo modificaciones...');

    this.subscriptions.add(
      this.adminService.getProductosFiltrados().subscribe({
        next: (productos) => {
          this.camisetas = productos;
          this.productosFiltrados = [...productos];
          this.loading = false;

          console.log(`✅ ${productos.length} productos cargados solo de modificaciones`);
          this.aplicarFiltros();
          this.mostrarMensaje('Catálogo cargado desde modificaciones locales', 'info');
        },
        error: (error) => {
          console.error('❌ Error también cargando modificaciones:', error);
          this.error = 'No se pudieron cargar los productos. Inténtalo más tarde.';
          this.loading = false;
          this.mostrarMensaje('Error al cargar el catálogo', 'error');
        }
      })
    );
  }

  private combinarProductosParaCatalogo(
    backend: Producto[],
    modificaciones: Producto[]
  ): Producto[] {
    const productosMap = new Map<number, Producto>();

    backend.forEach(producto => {
      productosMap.set(producto.id, producto);
    });

    modificaciones.forEach(modificacion => {
      const estaEliminado = (modificacion as any).eliminado;

      if (estaEliminado) {
        productosMap.delete(modificacion.id);
        console.log(`🗑️ Producto ${modificacion.id} eliminado del catálogo`);
      }
      else if (productosMap.has(modificacion.id)) {
        const productoOriginal = productosMap.get(modificacion.id)!;
        const productoCombinado = {
          ...productoOriginal,
          ...modificacion
        };
        productosMap.set(modificacion.id, productoCombinado);
        console.log(`✏️ Producto ${modificacion.id} modificado: ${productoOriginal.nombre} → ${productoCombinado.nombre}`);
      }
      else {
        productosMap.set(modificacion.id, modificacion);
        console.log(`➕ Producto ${modificacion.id} añadido: ${modificacion.nombre}`);
      }
    });

    const productosArray = Array.from(productosMap.values());
    productosArray.sort((a, b) => a.id - b.id);

    return productosArray;
  }

  refrescarProductos() {
    console.log('🔄 Refrescando productos...');
    this.cargarProductosCombinados();
    this.mostrarMensaje('Catálogo actualizado', 'success');
  }

  agregarAlCarrito(index: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const producto = this.productosFiltrados[index];
    const talla = this.tallaSeleccionada[index]; // Obtener talla para ESTE producto

    if (!talla) {
      this.mostrarMensaje(`Selecciona una talla para "${producto.nombre}"`, 'info');
      return;
    }

    if (!this.isLoggedIn) {
      this.mostrarMensaje('Debes iniciar sesión para añadir productos al carrito', 'error');
      return;
    }

    if (producto.stock !== undefined && producto.stock <= 0) {
      this.mostrarMensaje(`"${producto.nombre}" está agotado`, 'error');
      return;
    }

    this.productoAgregando = index;

    const resultado = this.carritoService.agregarItem({
      id: producto.id,
      nombre: producto.nombre,
      club: producto.club || '',
      precio: producto.precio,
      talla: talla,
      imagen: producto.imagenes && producto.imagenes.length > 0
        ? producto.imagenes[0]
        : 'default.jpg'
    }, 1);

    if (resultado) {
      this.mostrarMensaje(`¡${producto.nombre} añadida al carrito!`, 'success');

      // Actualizar contador del carrito
      this.totalItemsCarrito = this.carritoService.getTotalItems();

      setTimeout(() => {
        delete this.tallaSeleccionada[index];
        this.productoAgregando = null;
      }, 500);
    } else {
      this.mostrarMensaje('Error al añadir al carrito', 'error');
      this.productoAgregando = null;
    }
  }

  aplicarFiltros() {
    console.log('🔍 Aplicando filtros usando categoriasIds...');
    console.log('🔍 Término búsqueda:', this.terminoBusqueda);
    console.log('🔍 Precio máximo:', this.precioMaximo);
    console.log('🔍 Filtros tipo:', this.filtrosActivos.tipo);
    console.log('🔍 Filtros categoría:', this.filtrosActivos.categoria);
    console.log('🔍 Filtros liga:', this.filtrosActivos.liga);

    this.productosFiltrados = this.camisetas.filter(producto => {
      const categoriasIds = producto.categoriasIds || [];

      if (producto.precio > this.precioMaximo) {
        return false;
      }

      if (this.terminoBusqueda !== '') {
        const termino = this.terminoBusqueda.toLowerCase();
        const enNombre = producto.nombre.toLowerCase().includes(termino);
        const enClub = producto.club?.toLowerCase().includes(termino) || false;
        const enDescripcion = producto.descripcion?.toLowerCase().includes(termino) || false;

        if (!enNombre && !enClub && !enDescripcion) {
          return false;
        }
      }

      const tiposSeleccionados = Object.keys(this.filtrosActivos.tipo).filter(
        key => this.filtrosActivos.tipo[key as keyof typeof this.filtrosActivos.tipo]
      );

      if (tiposSeleccionados.length > 0) {
        let pasaTipo = false;

        for (const tipoSeleccionado of tiposSeleccionados) {
          const idCategoria = this.mapeoFiltros.tipo[tipoSeleccionado as keyof typeof this.mapeoFiltros.tipo];
          if (categoriasIds.includes(idCategoria)) {
            pasaTipo = true;
            break;
          }
        }

        if (!pasaTipo) {
          return false;
        }
      }

      const ligasSeleccionadas = Object.keys(this.filtrosActivos.liga).filter(
        key => this.filtrosActivos.liga[key as keyof typeof this.filtrosActivos.liga]
      );

      if (ligasSeleccionadas.length > 0) {
        let pasaLiga = false;

        for (const ligaSeleccionada of ligasSeleccionadas) {
          const idCategoria = this.mapeoFiltros.liga[ligaSeleccionada as keyof typeof this.mapeoFiltros.liga];
          if (categoriasIds.includes(idCategoria)) {
            pasaLiga = true;
            break;
          }
        }

        if (!pasaLiga) {
          return false;
        }
      }

      const categoriasSeleccionadas = Object.keys(this.filtrosActivos.categoria).filter(
        key => this.filtrosActivos.categoria[key as keyof typeof this.filtrosActivos.categoria]
      );

      if (categoriasSeleccionadas.length > 0) {
        let pasaCategoria = false;

        for (const categoriaSeleccionada of categoriasSeleccionadas) {
          const idCategoria = this.mapeoFiltros.categoria[categoriaSeleccionada as keyof typeof this.mapeoFiltros.categoria];

          // Para "champions", verificar si tiene ID 11
          if (categoriaSeleccionada === 'champions') {
            if (categoriasIds.includes(11)) {
              pasaCategoria = true;
              break;
            }
          }
          else if (categoriasIds.includes(idCategoria)) {
            pasaCategoria = true;
            break;
          }
        }

        if (!pasaCategoria) {
          return false;
        }
      }

      return true;
    });

    console.log(`📊 Productos después de filtrar: ${this.productosFiltrados.length} de ${this.camisetas.length}`);
  }

  aplicarFiltroDesdeColeccion(filtro: string) {
    console.log(`🎯 Aplicando filtro desde colección: ${filtro}`);

    // Limpiar todos los filtros primero
    this.limpiarFiltros();

    // Mapeo de nombres de colección a filtros
    const coleccionToFiltro: {[key: string]: {tipo?: string, liga?: string, categoria?: string}} = {
      'champions': { categoria: 'champions' },
      'selecciones': { categoria: 'selecciones' },
      'clubes': { categoria: 'clubes' },
      'vintage': { tipo: 'vintage' },
      'retro': { tipo: 'vintage' },
      'nuevas': { tipo: 'nuevas' },
      'fanversion': { tipo: 'fanVersion' },
      'fan': { tipo: 'fanVersion' },
      'premier': { liga: 'premier' },
      'premier league': { liga: 'premier' },
      'laliga': { liga: 'laLiga' },
      'la liga': { liga: 'laLiga' },
      'seriea': { liga: 'serieA' },
      'serie a': { liga: 'serieA' },
      'bundesliga': { liga: 'bundesliga' },
      'ligue1': { liga: 'ligue1' },
      'ligue 1': { liga: 'ligue1' }
    };

    const filtroLower = filtro.toLowerCase();
    const filtroConfig = coleccionToFiltro[filtroLower];

    if (filtroConfig) {
      if (filtroConfig.tipo) {
        this.filtrosActivos.tipo[filtroConfig.tipo as keyof typeof this.filtrosActivos.tipo] = true;
      }

      if (filtroConfig.liga) {
        this.filtrosActivos.liga[filtroConfig.liga as keyof typeof this.filtrosActivos.liga] = true;
      }

      if (filtroConfig.categoria) {
        this.filtrosActivos.categoria[filtroConfig.categoria as keyof typeof this.filtrosActivos.categoria] = true;
      }
    } else {
      console.warn(`⚠️ Filtro desconocido: ${filtro}`);
    }

    this.aplicarFiltros();
  }

  mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') {
    this.mensajeNotificacion = mensaje;
    this.notificacionTipo = tipo;
    this.mostrarNotificacion = true;

    setTimeout(() => {
      this.mostrarNotificacion = false;
    }, 3000);
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

  seleccionarTalla(index: number, talla: string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.tallaSeleccionada[index] === talla) {
      delete this.tallaSeleccionada[index];
    } else {
      this.tallaSeleccionada[index] = talla;
    }
  }

  onPrecioChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.precioMaximo = parseInt(input.value);
    this.aplicarFiltros();
  }

  onBuscarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.terminoBusqueda = input.value.toLowerCase();
    this.aplicarFiltros();
  }

  onFiltroChange(tipo: string, filtro: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const isChecked = input.checked;

    console.log(`🔘 Cambio en filtro: ${tipo}.${filtro} = ${isChecked}`);

    if (tipo === 'tipo') {
      this.filtrosActivos.tipo[filtro as keyof typeof this.filtrosActivos.tipo] = isChecked;
    } else if (tipo === 'categoria') {
      this.filtrosActivos.categoria[filtro as keyof typeof this.filtrosActivos.categoria] = isChecked;
    } else if (tipo === 'liga') {
      this.filtrosActivos.liga[filtro as keyof typeof this.filtrosActivos.liga] = isChecked;
    }

    this.aplicarFiltros();
  }

  limpiarFiltros() {
    console.log('🧹 Limpiando todos los filtros');

    this.precioMaximo = 150;
    this.terminoBusqueda = '';
    this.tallaSeleccionada = {};

    this.filtrosActivos = {
      tipo: {
        nuevas: false,
        vintage: false,
        fanVersion: false
      },
      categoria: {
        clubes: false,
        selecciones: false,
        champions: false
      },
      liga: {
        laLiga: false,
        premier: false,
        serieA: false,
        bundesliga: false,
        ligue1: false
      }
    };

    const slider = document.getElementById('rango-precio') as HTMLInputElement;
    if (slider) {
      slider.value = '150';
    }

    this.productosFiltrados = [...this.camisetas];

    console.log(`📊 Mostrando ${this.productosFiltrados.length} productos`);
  }

  logout(): void {
    this.authService.logout();
  }

  closeDropdown(): void {
    const dropdownElement = document.querySelector('[data-bs-toggle="dropdown"]');
    if (dropdownElement) {
      const dropdown = (window as any).bootstrap?.Dropdown?.getInstance(dropdownElement);
      if (dropdown) {
        dropdown.hide();
      }
    }
  }
}
