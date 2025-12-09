import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, retry, throwError } from 'rxjs';
import { Producto, FiltrosProducto, mapearProductoDesdeBackend } from '../models/producto';

interface ProductosPaginadosResponse {
  productos: any[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private apiUrl = 'http://localhost:8081/api/productos/all';

  private datosEjemplo: Producto[] = this.crearDatosEjemplo();

  constructor(private http: HttpClient) {}

  private mapearDesdeBackend(datos: any): Producto {
    console.log('📥 Datos recibidos del backend:', datos);
    return mapearProductoDesdeBackend(datos);
  }

  private crearDatosEjemplo(): Producto[] {
    return [
      {
        id: 1,
        nombre: "Real Madrid 23/24 Local",
        precio: 89.99,
        club: "Real Madrid",
        tipo: "nuevas",
        categoria: "clubes",
        retro: false,
        imagenes: ["camiseta_del_madrid1.jpg"],
        liga: "laLiga",
        descripcion: "Camiseta oficial Real Madrid temporada 23/24",
        stock: 10,
        categoriasIds: [1, 4, 9]
      },
      {
        id: 2,
        nombre: "Barcelona 2024/25 Local",
        precio: 87.99,
        club: "Barcelona",
        tipo: "nuevas",
        categoria: "clubes",
        retro: false,
        imagenes: ["barcelona_24_25.jpeg"],
        liga: "laLiga",
        descripcion: "Nueva camiseta Barcelona temporada 2024/25",
        stock: 8,
        categoriasIds: [1, 4, 9]
      },
      {
        id: 3,
        nombre: "Manchester City 2024/25 Local",
        precio: 89.99,
        club: "Manchester City",
        tipo: "nuevas",
        categoria: "clubes",
        retro: false,
        imagenes: ["camiseta_del_city.jpg"],
        liga: "premier",
        descripcion: "Camiseta Manchester City Premier League",
        stock: 12,
        categoriasIds: [1, 5, 9]
      },
      {
        id: 4,
        nombre: "Real Madrid 2002 Champions",
        precio: 104.99,
        club: "Real Madrid",
        tipo: "vintage",
        categoria: "clubes",
        retro: true,
        imagenes: ["real_madrid_2002.jpeg"],
        liga: "laLiga",
        descripcion: "Camiseta retro Real Madrid Champions 2002",
        stock: 3,
        categoriasIds: [2, 4, 9, 11]
      },
      {
        id: 5,
        nombre: "Argentina Campeón Mundial 2022",
        precio: 94.99,
        club: "Argentina",
        tipo: "nuevas",
        categoria: "selecciones",
        retro: false,
        imagenes: ["argentina_2022.jpeg"],
        descripcion: "Camiseta Argentina campeona del mundo 2022",
        stock: 15,
        categoriasIds: [1, 10]
      },
      {
        id: 6,
        nombre: "Barcelona 90s Retro",
        precio: 79.99,
        club: "Barcelona",
        tipo: "vintage",
        categoria: "clubes",
        retro: true,
        imagenes: ["camiseta_del_barca.jpg"],
        liga: "laLiga",
        descripcion: "Camiseta retro Barcelona años 90",
        stock: 5,
        categoriasIds: [2, 4, 9]
      },
      {
        id: 7,
        nombre: "Liverpool 2024/25 Local",
        precio: 87.99,
        club: "Liverpool",
        tipo: "nuevas",
        categoria: "clubes",
        retro: false,
        imagenes: ["liverpool_24_25.jpeg"],
        liga: "premier",
        descripcion: "Camiseta Liverpool temporada 2024/25",
        stock: 9,
        categoriasIds: [1, 5, 9]
      },
      {
        id: 8,
        nombre: "AC Milan 2024/25 Local",
        precio: 87.99,
        club: "AC Milan",
        tipo: "nuevas",
        categoria: "clubes",
        retro: false,
        imagenes: ["AC_Milan_24_25.jpeg"],
        liga: "serieA",
        descripcion: "Camiseta AC Milan Serie A 2024/25",
        stock: 7,
        categoriasIds: [1, 6, 9]
      },
      {
        id: 9,
        nombre: "Bayern Munich 2024/25 Local",
        precio: 88.99,
        club: "Bayern Munich",
        tipo: "nuevas",
        categoria: "clubes",
        retro: false,
        imagenes: ["bayern_2024.jpeg"],
        liga: "bundesliga",
        descripcion: "Camiseta Bayern Munich Bundesliga",
        stock: 11,
        categoriasIds: [1, 7, 9]
      },
      {
        id: 10,
        nombre: "PSG 2024/25 Local",
        precio: 89.99,
        club: "Paris Saint-Germain",
        tipo: "nuevas",
        categoria: "clubes",
        retro: false,
        imagenes: ["camisetas_del_psg.jpg"],
        liga: "ligue1",
        descripcion: "Camiseta PSG Ligue 1 2024/25",
        stock: 6,
        categoriasIds: [1, 8, 9]
      }
    ];
  }

  /**
   * Obtener todos los productos
   */
  getProductos(): Observable<Producto[]> {
    console.log('🔄 Solicitando productos desde:', this.apiUrl);

    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        console.log('✅ Respuesta recibida del backend:', response);

        // DEBUG: Ver estructura
        console.log('🔍 Tipo de respuesta:', typeof response);
        console.log('🔍 Es array?:', Array.isArray(response));

        // Verificar si es array directo
        if (Array.isArray(response)) {
          console.log(`✅ Recibido array con ${response.length} productos`);
          return response.map(item => this.mapearDesdeBackend(item));
        }

        // Verificar si es objeto paginado
        if (response && typeof response === 'object' && 'productos' in response) {
          const resp = response as ProductosPaginadosResponse;
          if (Array.isArray(resp.productos)) {
            console.log(`✅ Recibido objeto paginado con ${resp.productos.length} productos`);
            return resp.productos.map(item => this.mapearDesdeBackend(item));
          }
        }

        // Formato inesperado, usar datos de ejemplo
        console.warn('⚠️ Formato de respuesta inesperado, usando datos de ejemplo');
        return this.datosEjemplo;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo productos:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Mensaje:', error.message);
        console.warn('⚠️ Usando datos de ejemplo por fallo en backend');
        return of(this.datosEjemplo);
      }),
      retry(2)
    );
  }

  /**
   * Obtener un producto por ID
   */
  getProducto(id: number): Observable<Producto> {
    console.log(`🔄 Solicitando producto ID ${id} desde el backend`);

    return this.http.get<any>(`http://localhost:8081/api/productos/${id}`).pipe(
      map(response => {
        console.log(`✅ Respuesta para producto ${id}:`, response);
        return this.mapearDesdeBackend(response);
      }),
      catchError(error => {
        console.error(`❌ Error obteniendo producto ID ${id}:`, error);

        // Buscar en datos de ejemplo como fallback
        const productoEjemplo = this.datosEjemplo.find(p => p.id === id);
        if (productoEjemplo) {
          console.warn(`⚠️ Usando datos de ejemplo para producto ${id}`);
          return of(productoEjemplo);
        }

        // Crear un producto fallback si no existe en ejemplos
        const productoFallback: Producto = {
          id: id,
          nombre: `Camiseta #${id}`,
          descripcion: 'Información no disponible',
          precio: 0,
          club: 'Sin club',
          tipo: 'nuevas',
          categoria: 'clubes',
          retro: false,
          stock: 0,
          imagenes: ['default.jpg']
        };

        console.warn(`⚠️ Creando producto fallback para ID ${id}`);
        return of(productoFallback);
      })
    );
  }

  /**
   * Obtener productos con filtros
   */
  getProductosFiltrados(filtros: FiltrosProducto): Observable<Producto[]> {
    let params = new HttpParams();

    // Agregar filtros como query parameters
    Object.keys(filtros).forEach(key => {
      const value = filtros[key as keyof FiltrosProducto];
      if (value !== undefined && value !== null && value !== '') {
        params = params.append(key, value.toString());
      }
    });

    console.log('🔍 Filtrando productos con:', filtros);

    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response.map(item => this.mapearDesdeBackend(item));
        }
        return [];
      }),
      catchError(error => {
        console.error('❌ Error filtrando productos:', error);

        // Como fallback, filtrar datos de ejemplo localmente
        if (this.datosEjemplo.length > 0) {
          const filtrados = this.filtrarLocalmente(this.datosEjemplo, filtros);
          console.warn(`⚠️ Usando filtrado local: ${filtrados.length} productos`);
          return of(filtrados);
        }

        return of([]);
      })
    );
  }

  /**
   * Buscar productos por término
   */
  buscarProductos(termino: string): Observable<Producto[]> {
    return this.http.get<any[]>(`${this.apiUrl}/buscar`, {
      params: { q: termino }
    }).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response.map(item => this.mapearDesdeBackend(item));
        }
        return [];
      }),
      catchError(error => {
        console.error('❌ Error buscando productos:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener productos por categoría
   */
  getProductosPorCategoria(categoria: string): Observable<Producto[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categoria/${categoria}`).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response.map(item => this.mapearDesdeBackend(item));
        }
        return [];
      }),
      catchError(error => {
        console.error(`❌ Error obteniendo productos por categoría ${categoria}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Obtener productos destacados
   */
  getProductosDestacados(): Observable<Producto[]> {
    return this.http.get<any[]>(`${this.apiUrl}/destacados`).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response.map(item => this.mapearDesdeBackend(item));
        }
        return [];
      }),
      catchError(error => {
        console.error('❌ Error obteniendo productos destacados:', error);
        return of([]);
      })
    );
  }

  /**
   * Método auxiliar para filtrar localmente
   */
  private filtrarLocalmente(productos: Producto[], filtros: FiltrosProducto): Producto[] {
    return productos.filter(producto => {
      // Filtrar por tipo
      if (filtros.tipo && producto.tipo !== filtros.tipo) return false;

      // Filtrar por categoría
      if (filtros.categoria && producto.categoria !== filtros.categoria) return false;

      // Filtrar por liga
      if (filtros.liga && producto.liga !== filtros.liga) return false;

      // Filtrar por precio
      if (filtros.precioMin && producto.precio < filtros.precioMin) return false;
      if (filtros.precioMax && producto.precio > filtros.precioMax) return false;

      // Filtrar por término de búsqueda
      if (filtros.terminoBusqueda) {
        const termino = filtros.terminoBusqueda.toLowerCase();
        const nombreMatch = producto.nombre.toLowerCase().includes(termino);
        const clubMatch = producto.club.toLowerCase().includes(termino);
        const descMatch = producto.descripcion?.toLowerCase().includes(termino) ?? false;

        if (!nombreMatch && !clubMatch && !descMatch) return false;
      }

      // Filtrar por retro
      if (filtros.retro !== undefined && producto.retro !== filtros.retro) return false;

      // Filtrar por destacado
      if (filtros.destacado !== undefined && producto.destacado !== filtros.destacado) return false;

      return true;
    });
  }
}
