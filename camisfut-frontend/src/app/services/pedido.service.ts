import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProductoService } from './producto.service';

export interface ItemPedido {
  id: number;
  productoId: number;
  nombre: string;
  descripcion?: string;
  club?: string;
  tipo?: string;
  categoria?: string;
  temporada?: string;
  liga?: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  talla?: string;
  imagen?: string;
  retro?: boolean;
}

export interface PedidoFrontend {
  id: number;
  idUsuario: number;
  fecha: Date;
  estado: string;
  total: number;
  detalles?: any[];
  items?: ItemPedido[];
  direccion?: any;
  metodoPago?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private apiUrl = 'http://localhost:8081/api/pedidos';

  private productosCache = new Map<number, any>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private productoService: ProductoService
  ) {}

  /**
   * Obtener pedidos con nombres reales de productos
   */
  getPedidosUsuarioConNombresReales(): Observable<PedidoFrontend[]> {
    console.log('🔍 PedidoService: Obteniendo pedidos con NOMBRES REALES');

    const userId = this.authService.getCurrentUser()?.id;
    const token = this.authService.getToken();

    if (!userId || !token) {
      console.warn('⚠️ Usuario no autenticado o sin token');
      return of([]);
    }

    console.log(`🔄 Solicitando pedidos para usuario ID: ${userId}`);

    return this.http.get<any[]>(this.apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      tap(response => {
        console.log('✅ Respuesta del backend recibida (COMPLETA):');
        console.log(JSON.stringify(response, null, 2));
      }),
      map((pedidos: any[]) => {
        if (!Array.isArray(pedidos)) {
          console.error('❌ La respuesta no es un array:', typeof pedidos);
          return [];
        }

        // Filtrar solo los pedidos del usuario actual
        const pedidosUsuario = pedidos.filter(pedido => {
          if (!pedido || !pedido.idUsuario) {
            return false;
          }
          return pedido.idUsuario.toString() === userId.toString();
        });

        console.log(`✅ Encontrados ${pedidosUsuario.length} pedidos para el usuario`);

        // Transformar a formato básico primero
        const pedidosTransformados = pedidosUsuario.map(pedido => {
          console.log('📋 Procesando pedido ID:', pedido.id);
          console.log('📊 Estructura COMPLETA del pedido:');
          console.log(JSON.stringify(pedido, null, 2));

          const fecha = this.parsearFecha(pedido.fecha);

          // Verificar estructura de detalles - EXPLORAR TODAS LAS POSIBLES CLAVES
          if (pedido.detalles && pedido.detalles.length > 0) {
            console.log('📦 Detalles del pedido (array):', pedido.detalles);
            console.log('🔍 Explorando claves del primer detalle:');
            if (pedido.detalles[0]) {
              const primerDetalle = pedido.detalles[0];
              console.log('   Claves disponibles:', Object.keys(primerDetalle));
              console.log('   Valores:');
              Object.keys(primerDetalle).forEach(key => {
                console.log(`   - ${key}: ${primerDetalle[key]} (tipo: ${typeof primerDetalle[key]})`);
              });
            }
          } else {
            console.log('⚠️ No hay detalles en este pedido o detalles es undefined');
            // Explorar otras posibles estructuras
            console.log('🔍 Explorando otras posibles estructuras de datos:');
            Object.keys(pedido).forEach(key => {
              if (Array.isArray(pedido[key])) {
                console.log(`   - ${key}: ES un array con ${pedido[key].length} elementos`);
                if (pedido[key].length > 0) {
                  console.log(`     Primer elemento:`, pedido[key][0]);
                }
              }
            });
          }

          return {
            id: pedido.id || 0,
            idUsuario: pedido.idUsuario || 0,
            fecha: fecha,
            estado: pedido.estado || 'pendiente',
            total: pedido.total || 0,
            detalles: pedido.detalles || [],
            items: [], // Se llenará después
            direccion: pedido.direccion || { ciudad: 'No especificada' },
            metodoPago: pedido.metodoPago || 'No especificado'
          };
        });

        return pedidosTransformados;
      }),
      // ENRIQUECER pedidos con nombres reales
      switchMap(pedidos => this.enriquecerPedidosConProductos(pedidos)),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error obteniendo pedidos con nombres:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Error completo:', error);
        return of([]);
      })
    );
  }

  /**
   * Método para enriquecer pedidos con información real de productos
   */
  private enriquecerPedidosConProductos(pedidos: PedidoFrontend[]): Observable<PedidoFrontend[]> {
    if (!pedidos || pedidos.length === 0) {
      return of(pedidos);
    }

    // Recopilar todos los IDs de productos únicos de todos los pedidos
    const todosProductoIds: number[] = [];

    console.log('🔍 DEPURACIÓN EXTENDIDA: Buscando IDs de productos en detalles...');

    pedidos.forEach((pedido, index) => {
      console.log(`\n📦 Pedido ${index + 1} (ID: ${pedido.id}):`);

      if (pedido.detalles && pedido.detalles.length > 0) {
        console.log(`   Tiene ${pedido.detalles.length} detalles`);

        pedido.detalles.forEach((detalle: any, detalleIndex: number) => {
          console.log(`\n   Detalle ${detalleIndex + 1}:`);

          // EXPLORAR TODAS LAS CLAVES POSIBLES
          console.log('   Claves del detalle:', Object.keys(detalle));

          // Buscar cualquier campo que pueda contener el ID del producto
          let productoId = null;
          const posiblesClaves = ['idProducto', 'productoId', 'id_producto', 'producto_id', 'productId', 'product_id', 'idProduct', 'producto'];

          for (const clave of posiblesClaves) {
            if (detalle[clave] !== undefined && detalle[clave] !== null) {
              productoId = detalle[clave];
              console.log(`     ✅ Encontrado en clave "${clave}": ${productoId}`);
              break;
            }
          }

          // Si no encontramos en las claves conocidas, buscar cualquier número que parezca un ID
          if (!productoId) {
            console.log('   🔍 Buscando ID en todos los valores...');
            Object.keys(detalle).forEach(key => {
              const valor = detalle[key];
              if (typeof valor === 'number' && valor > 0 && valor < 1000) { // Asumiendo IDs razonables
                console.log(`     Posible ID en "${key}": ${valor}`);
                productoId = valor;
              }
            });
          }

          console.log(`     ID extraído final: ${productoId}`);

          if (productoId && !isNaN(productoId) && !todosProductoIds.includes(productoId)) {
            todosProductoIds.push(productoId);
            console.log(`     ✅ ID ${productoId} agregado a la lista`);
          } else if (!productoId) {
            console.warn(`     ⚠️ No se encontró ID de producto en el detalle`);
            console.log(`     Detalle completo:`, detalle);
          }
        });
      } else {
        console.log(`   ⚠️ No tiene detalles`);
      }
    });

    console.log(`\n🔍 IDs de productos a obtener: [${todosProductoIds.join(', ')}]`);
    console.log(`🔍 Total IDs encontrados: ${todosProductoIds.length}`);

    if (todosProductoIds.length === 0) {
      console.log('⚠️ No se encontraron IDs de productos. Creando items básicos...');

      // Intentar una estrategia alternativa: quizás los detalles están en otra estructura
      return of(this.crearItemsBasicosExplorandoEstructura(pedidos));
    }

    // Obtener información de todos los productos
    const solicitudesProductos = todosProductoIds.map(productoId =>
      this.obtenerProductoConCache(productoId)
    );

    return forkJoin(solicitudesProductos).pipe(
      map(productos => {
        // Crear mapa de productos por ID
        const productosMap = new Map<number, any>();
        productos.forEach(producto => {
          if (producto && producto.id) {
            productosMap.set(producto.id, producto);
          }
        });

        console.log(`✅ Obtenidos ${productosMap.size} productos para enriquecer`);

        // Enriquecer cada pedido
        return pedidos.map(pedido => this.enriquecerUnPedido(pedido, productosMap));
      }),
      catchError(error => {
        console.error('❌ Error obteniendo productos para enriquecer:', error);
        // Si falla, usar items básicos
        return of(this.crearItemsBasicosExplorandoEstructura(pedidos));
      })
    );
  }

  /**
   * Explorar estructura alternativa para encontrar productos
   */
  private crearItemsBasicosExplorandoEstructura(pedidos: PedidoFrontend[]): PedidoFrontend[] {
    console.log('🔄 Explorando estructura alternativa para crear items...');

    return pedidos.map(pedido => {
      const items: ItemPedido[] = [];

      // Si hay detalles en la estructura estándar
      if (pedido.detalles && pedido.detalles.length > 0) {
        console.log(`   Pedido ${pedido.id} tiene detalles estándar`);

        pedido.detalles.forEach((detalle: any, index: number) => {
          // Buscar ID de producto de cualquier forma posible
          let productoId = null;
          const posiblesClaves = ['idProducto', 'productoId', 'id_producto', 'producto_id', 'productId', 'product_id'];

          for (const clave of posiblesClaves) {
            if (detalle[clave] !== undefined && detalle[clave] !== null) {
              productoId = detalle[clave];
              break;
            }
          }

          const cantidad = detalle.cantidad || 1;
          const subtotal = detalle.subtotal || 0;
          const precioUnitario = cantidad > 0 ? subtotal / cantidad : 0;

          items.push({
            id: detalle.id || index,
            productoId: productoId ? Number(productoId) : 0,
            nombre: productoId ? `Producto ${productoId}` : 'Producto desconocido',
            cantidad: cantidad,
            precio: precioUnitario,
            subtotal: subtotal,
            imagen: 'default.jpg',
            club: 'Sin club',
            talla: 'M'
          });
        });
      } else {
        console.log(`   Pedido ${pedido.id} no tiene detalles. ID: ${pedido.id}, Total: ${pedido.total}`);

        // Crear un item genérico basado en el pedido
        if (pedido.total > 0) {
          items.push({
            id: 1,
            productoId: 0,
            nombre: `Pedido ${pedido.id}`,
            cantidad: 1,
            precio: pedido.total,
            subtotal: pedido.total,
            imagen: 'default.jpg',
            club: 'Sin club',
            talla: 'M'
          });
        }
      }

      return {
        ...pedido,
        items: items
      };
    });
  }

  /**
   * Enriquecer un solo pedido con información de productos
   */
  private enriquecerUnPedido(pedido: PedidoFrontend, productosMap: Map<number, any>): PedidoFrontend {
    if (!pedido.detalles || pedido.detalles.length === 0) {
      console.log(`⚠️ Pedido ${pedido.id} no tiene detalles`);
      return {
        ...pedido,
        items: []
      };
    }

    console.log(`🔄 Enriqueciendo pedido ${pedido.id} con ${pedido.detalles.length} detalles`);

    // Crear items enriquecidos a partir de detalles
    const itemsEnriquecidos: ItemPedido[] = pedido.detalles.map((detalle: any, index: number) => {
      let productoId = null;
      const posiblesClaves = ['idProducto', 'productoId', 'id_producto', 'producto_id', 'productId', 'product_id'];

      for (const clave of posiblesClaves) {
        if (detalle[clave] !== undefined && detalle[clave] !== null) {
          productoId = detalle[clave];
          break;
        }
      }

      const cantidad = detalle.cantidad || 1;
      const subtotal = detalle.subtotal || 0;
      const precioUnitario = cantidad > 0 ? subtotal / cantidad : 0;

      console.log(`   Procesando detalle ${index + 1}:`);
      console.log(`     - Producto ID encontrado: ${productoId}`);
      console.log(`     - Cantidad: ${cantidad}`);
      console.log(`     - Subtotal: ${subtotal}`);

      // Buscar producto en el mapa
      const producto = productoId ? productosMap.get(Number(productoId)) : null;

      // Si tenemos información del producto, usarla
      if (producto) {
        console.log(`     ✅ Producto encontrado en cache: ${producto.nombre}`);

        // Extraer temporada del nombre si es posible
        let temporada: string | undefined;
        if (producto.nombre) {
          const match = producto.nombre.match(/(\d{2}\/\d{2})/);
          if (match) {
            temporada = match[1];
          }
        }

        return {
          id: detalle.id || index,
          productoId: Number(productoId),
          nombre: producto.nombre || `Camiseta #${productoId}`,
          descripcion: producto.descripcion || 'Camiseta oficial',
          club: producto.club || 'Sin club',
          tipo: producto.tipo || 'nuevas',
          categoria: producto.categoria || 'clubes',
          temporada: temporada,
          liga: producto.liga,
          cantidad: cantidad,
          precio: precioUnitario,
          subtotal: subtotal,
          talla: detalle.talla || 'M',
          imagen: producto.imagenes && producto.imagenes.length > 0
            ? producto.imagenes[0]
            : 'default.jpg',
          retro: producto.retro || false
        };
      }

      // Si no tenemos información del producto
      console.log(`     ⚠️ Producto ${productoId} no encontrado en cache, usando fallback`);

      return {
        id: detalle.id || index,
        productoId: productoId ? Number(productoId) : 0,
        nombre: productoId ? `Producto ${productoId}` : 'Producto desconocido',
        cantidad: cantidad,
        precio: precioUnitario,
        subtotal: subtotal,
        talla: detalle.talla || 'M',
        imagen: 'default.jpg',
        club: 'Sin club'
      };
    });

    console.log(`✅ Pedido ${pedido.id} enriquecido con ${itemsEnriquecidos.length} items`);

    return {
      ...pedido,
      items: itemsEnriquecidos
    };
  }

  /**
   * Crear items básicos para pedidos
   */
  private crearItemsBasicosParaPedidos(pedidos: PedidoFrontend[]): PedidoFrontend[] {
    console.log('🔄 Creando items básicos como fallback');

    return pedidos.map(pedido => {
      if (!pedido.detalles || pedido.detalles.length === 0) {
        return {
          ...pedido,
          items: []
        };
      }

      console.log(`   Pedido ${pedido.id} tiene ${pedido.detalles.length} detalles`);

      const itemsBasicos: ItemPedido[] = pedido.detalles.map((detalle: any, index: number) => {
        // Intentar obtener el ID del producto de diferentes formas
        let productoId = null;
        const posiblesClaves = ['idProducto', 'productoId', 'id_producto', 'producto_id', 'productId', 'product_id'];

        for (const clave of posiblesClaves) {
          if (detalle[clave] !== undefined && detalle[clave] !== null) {
            productoId = detalle[clave];
            break;
          }
        }

        const cantidad = detalle.cantidad || 1;
        const subtotal = detalle.subtotal || 0;
        const precioUnitario = cantidad > 0 ? subtotal / cantidad : 0;

        return {
          id: detalle.id || index,
          productoId: productoId ? Number(productoId) : 0,
          nombre: productoId ? `Producto ${productoId}` : 'Producto desconocido',
          cantidad: cantidad,
          subtotal: subtotal,
          precio: precioUnitario,
          imagen: 'default.jpg',
          club: detalle.club || 'Sin club',
          talla: detalle.talla || 'M'
        };
      });

      return {
        ...pedido,
        items: itemsBasicos
      };
    });
  }

  /**
   * Obtener producto con cache
   */
  private obtenerProductoConCache(productoId: number): Observable<any> {
    // Verificar cache primero
    if (this.productosCache.has(productoId)) {
      const productoCache = this.productosCache.get(productoId);
      console.log(`🔄 Producto ${productoId} obtenido de cache: ${productoCache?.nombre}`);
      return of(productoCache);
    }

    // Obtener del servicio de productos
    console.log(`🔄 Solicitando producto ${productoId} del servicio...`);
    return this.productoService.getProducto(productoId).pipe(
      map(producto => {
        if (!producto) {
          throw new Error(`Producto ${productoId} no encontrado`);
        }

        // Guardar en cache
        this.productosCache.set(productoId, producto);
        console.log(`✅ Producto ${productoId} obtenido: ${producto.nombre}`);
        return producto;
      }),
      catchError(error => {
        console.error(`❌ Error obteniendo producto ${productoId}:`, error);
        // Crear producto fallback
        const productoFallback = {
          id: productoId,
          nombre: `Producto ${productoId}`,
          descripcion: 'Información no disponible',
          club: 'Sin club',
          precio: 0,
          tipo: 'nuevas',
          categoria: 'clubes',
          imagenes: ['default.jpg']
        };
        this.productosCache.set(productoId, productoFallback);
        return of(productoFallback);
      })
    );
  }

  /**
   * Parsear fecha a Date object de forma segura
   */
  private parsearFecha(fechaInput: any): Date {
    try {
      if (fechaInput instanceof Date) {
        return fechaInput;
      }

      if (typeof fechaInput === 'string') {
        const fecha = new Date(fechaInput);
        if (!isNaN(fecha.getTime())) {
          return fecha;
        }
      }

      // Si es timestamp
      if (typeof fechaInput === 'number') {
        return new Date(fechaInput);
      }

      // Si es objeto con timestamp
      if (fechaInput && typeof fechaInput === 'object' && fechaInput.timestamp) {
        return new Date(fechaInput.timestamp);
      }
    } catch (error) {
      console.warn('⚠️ Error parseando fecha:', error);
    }

    // Fallback: fecha actual
    return new Date();
  }

  /**
   * Obtener pedidos del usuario actual - SOLO DATOS REALES
   */
  getPedidosUsuario(): Observable<PedidoFrontend[]> {
    console.log('🔍 PedidoService: Obteniendo pedidos REALES');

    const userId = this.authService.getCurrentUser()?.id;
    const token = this.authService.getToken();

    if (!userId || !token) {
      console.warn('⚠️ Usuario no autenticado o sin token');
      return of([]);
    }

    return this.http.get<any[]>(this.apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      map((pedidos: any[]) => {
        if (!Array.isArray(pedidos)) {
          return [];
        }

        // Filtrar solo los pedidos del usuario actual
        const pedidosUsuario = pedidos.filter(pedido => {
          if (!pedido || !pedido.idUsuario) {
            return false;
          }
          return pedido.idUsuario.toString() === userId.toString();
        });

        return pedidosUsuario.map(pedido => {
          const fecha = this.parsearFecha(pedido.fecha);

          // Crear items básicos
          const items = (pedido.detalles || []).map((detalle: any) => ({
            id: detalle.id,
            productoId: detalle.idProducto || detalle.productoId,
            nombre: detalle.idProducto ? `Producto ${detalle.idProducto}` : 'Producto genérico',
            cantidad: detalle.cantidad || 1,
            subtotal: detalle.subtotal || 0,
            precio: detalle.subtotal / (detalle.cantidad || 1),
            imagen: 'default.jpg',
            club: '',
            talla: 'M'
          }));

          return {
            id: pedido.id || 0,
            idUsuario: pedido.idUsuario || 0,
            fecha: fecha,
            estado: pedido.estado || 'pendiente',
            total: pedido.total || 0,
            detalles: pedido.detalles || [],
            items: items,
            direccion: pedido.direccion || { ciudad: 'No especificada' },
            metodoPago: pedido.metodoPago || 'No especificado'
          };
        });
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error obteniendo pedidos REALES:', error.status);
        return of([]);
      })
    );
  }

  /**
   * Crear pedido REAL en el backend
   */
  crearPedido(carritoItems: any[], total: number): Observable<any> {
    const userId = this.authService.getCurrentUser()?.id;
    const token = this.authService.getToken();

    if (!userId || !token) {
      return throwError(() => new Error('Usuario no autenticado. Por favor, inicia sesión.'));
    }

    // Validar que hay items
    if (carritoItems.length === 0) {
      return throwError(() => new Error('El carrito está vacío'));
    }

    // Convertir items del carrito a detalles
    const detalles = carritoItems.map(item => ({
      idProducto: item.productoId || item.id || 1,
      cantidad: item.cantidad || 1,
      subtotal: item.precio * (item.cantidad || 1)
    }));

    const pedidoDTO = {
      idUsuario: parseInt(userId),
      total: total,
      estado: 'pendiente',
      detalles: detalles
    };

    return this.http.post<any>(this.apiUrl, pedidoDTO, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error creando pedido:', error.status);

        let mensajeError = 'Error al crear el pedido';

        if (error.status === 401 || error.status === 403) {
          mensajeError = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        }

        return throwError(() => new Error(mensajeError));
      })
    );
  }

  /**
   * Verificar estado del servicio
   */
  getEstado(): string {
    const userId = this.authService.getCurrentUser()?.id;
    const token = this.authService.getToken();

    if (!userId) return 'No autenticado';
    if (!token) return 'Sin token';

    return `Usuario: ${userId}, Token: ${token ? 'Presente' : 'Ausente'}`;
  }

  /**
   * Limpiar cache de productos
   */
  limpiarCache(): void {
    this.productosCache.clear();
    console.log('🧹 Cache de productos limpiado');
  }
}
