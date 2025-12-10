import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';
import { ValoracionesService, Valoracion } from '../../services/valoraciones.service';

@Component({
  selector: 'app-opiniones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './opiniones.component.html',
  styleUrls: ['./opiniones.component.css']
})
export class OpinionesComponent implements OnInit, OnDestroy {
  // Variables para autenticación y carrito
  isLoggedIn: boolean = false;
  userName: string = '';

  // Variables para valoraciones
  valoraciones: Valoracion[] = [];
  valoracionesFiltradas: Valoracion[] = [];
  nuevaValoracion = {
    puntuacion: 5,
    comentario: ''
  };

  // Estados y mensajes
  loading: boolean = false;
  cargandoValoraciones: boolean = true;
  error: string = '';
  success: string = '';
  promedioGeneral: number = 0;
  usuarioYaOpinio: boolean = false;

  // Filtros
  filtroPuntuacion: number = 0; // 0 = todas
  filtroOrden: string = 'recientes';

  constructor(
    private authService: AuthService,
    private carritoService: CarritoService,
    private valoracionesService: ValoracionesService
  ) {}

  ngOnInit() {
    // Suscribirse a cambios de autenticación
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.verificarSiUsuarioYaOpinio();
      } else {
        this.resetForm();
        this.usuarioYaOpinio = false;
      }
    });

    // Obtener información del usuario
    this.authService.user$.subscribe(user => {
      this.userName = user?.nombre || '';
    });

    // Cargar valoraciones al iniciar
    this.cargarValoraciones();
  }

  /**
   * Verificar si el usuario ya publicó una opinión
   */
  verificarSiUsuarioYaOpinio(): void {
    this.valoracionesService.usuarioYaTieneOpinionGeneral().subscribe({
      next: (yaOpinio) => {
        this.usuarioYaOpinio = yaOpinio;
        if (yaOpinio) {
          this.buscarOpinionDelUsuario();
        }
      },
      error: (error) => {
        console.error('Error verificando opinión del usuario:', error);
        this.usuarioYaOpinio = false;
      }
    });
  }

  /**
   * Buscar la opinión específica del usuario actual
   */
  buscarOpinionDelUsuario(): void {
    const userId = this.authService.getUserIdAsNumber();
    if (!userId) return;

    const opinionUsuario = this.valoraciones.find(v =>
      v.idUsuario === userId && (!v.idProducto || v.idProducto === 0)
    );

    if (opinionUsuario) {
      this.nuevaValoracion = {
        puntuacion: opinionUsuario.puntuacion,
        comentario: opinionUsuario.comentario
      };
    }
  }

  /**
   * Cargar valoraciones desde el backend
   */
  cargarValoraciones(): void {
    this.cargandoValoraciones = true;
    this.error = '';

    this.valoracionesService.getValoraciones().subscribe({
      next: (valoraciones) => {
        this.valoraciones = valoraciones;
        this.aplicarFiltros();
        this.calcularPromedio();
        this.cargandoValoraciones = false;
        console.log(`✅ Cargadas ${valoraciones.length} valoraciones`);

        // Si el usuario está logueado, verificar si ya opinó
        if (this.isLoggedIn) {
          this.verificarSiUsuarioYaOpinio();
        }
      },
      error: (error) => {
        console.error('❌ Error cargando valoraciones:', error);
        this.error = 'Error al cargar las opiniones. Por favor, intenta de nuevo más tarde.';
        this.cargandoValoraciones = false;
      }
    });
  }

  /**
   * Aplicar filtros a las valoraciones
   */
  aplicarFiltros(): void {
    let valoracionesFiltradas = [...this.valoraciones];

    // Filtrar por puntuación
    if (this.filtroPuntuacion > 0) {
      valoracionesFiltradas = valoracionesFiltradas.filter(
        v => v.puntuacion === this.filtroPuntuacion
      );
    }

    // Ordenar
    if (this.filtroOrden === 'recientes') {
      valoracionesFiltradas.sort((a, b) => {
        const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
        const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
        return fechaB - fechaA;
      });
    } else if (this.filtroOrden === 'antiguas') {
      valoracionesFiltradas.sort((a, b) => {
        const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
        const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
        return fechaA - fechaB;
      });
    } else if (this.filtroOrden === 'mejores') {
      valoracionesFiltradas.sort((a, b) => b.puntuacion - a.puntuacion);
    } else if (this.filtroOrden === 'peores') {
      valoracionesFiltradas.sort((a, b) => a.puntuacion - b.puntuacion);
    }

    this.valoracionesFiltradas = valoracionesFiltradas;
  }

  /**
   * Calcular promedio general de puntuaciones
   */
  calcularPromedio(): void {
    if (this.valoraciones.length === 0) {
      this.promedioGeneral = 0;
      return;
    }

    const totalPuntos = this.valoraciones.reduce((sum, v) => sum + v.puntuacion, 0);
    this.promedioGeneral = Number((totalPuntos / this.valoraciones.length).toFixed(1));
  }

  /**
   * Enviar nueva valoración
   */
  enviarValoracion(): void {
    // Validaciones
    if (!this.isLoggedIn) {
      this.error = 'Debes iniciar sesión para enviar una opinión.';
      return;
    }

    if (!this.nuevaValoracion.comentario.trim()) {
      this.error = 'Por favor, escribe un comentario.';
      return;
    }

    if (this.nuevaValoracion.puntuacion < 1 || this.nuevaValoracion.puntuacion > 5) {
      this.error = 'La puntuación debe estar entre 1 y 5 estrellas.';
      return;
    }

    if (this.nuevaValoracion.comentario.length > 500) {
      this.error = 'El comentario no puede exceder los 500 caracteres.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Enviar opinión general
    this.valoracionesService.crearValoracionOpinionGeneral({
      puntuacion: this.nuevaValoracion.puntuacion,
      comentario: this.nuevaValoracion.comentario.trim()
    }).subscribe({
      next: (valoracionCreada) => {
        console.log('✅ Opinión creada:', valoracionCreada);

        // Si ya había opiniones, reemplazar la existente del usuario
        if (this.usuarioYaOpinio) {
          const userId = this.authService.getUserIdAsNumber();
          const index = this.valoraciones.findIndex(v =>
            v.idUsuario === userId && (!v.idProducto || v.idProducto === 0)
          );

          if (index !== -1) {
            // Actualizar la opinión existente
            this.valoraciones[index] = {
              ...valoracionCreada,
              usuario: { nombre: this.userName }
            };
            this.success = '¡Tu opinión ha sido actualizada con éxito!';
          }
        } else {
          // Añadir nueva opinión
          this.valoraciones.unshift({
            ...valoracionCreada,
            usuario: { nombre: this.userName }
          });
          this.usuarioYaOpinio = true;
          this.success = '¡Tu opinión ha sido publicada con éxito!';
        }

        // Aplicar filtros y recalcular promedio
        this.aplicarFiltros();
        this.calcularPromedio();

        this.loading = false;

        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error enviando opinión:', error);
        this.error = error.message || 'Error al enviar la opinión. Inténtalo de nuevo.';
        this.loading = false;
      }
    });
  }

  /**
   * Resetear formulario
   */
  resetForm(): void {
    this.nuevaValoracion = {
      puntuacion: 5,
      comentario: ''
    };
    this.error = '';
  }

  /**
   * Redondear promedio para mostrar estrellas
   */
  redondearPromedio(promedio: number): number {
    return Math.round(promedio);
  }

  /**
   * Obtener descripción de la puntuación
   */
  getDescripcionPuntuacion(puntuacion: number): string {
    switch(puntuacion) {
      case 1: return 'Malo';
      case 2: return 'Regular';
      case 3: return 'Bueno';
      case 4: return 'Muy bueno';
      case 5: return 'Excelente';
      default: return '';
    }
  }

  /**
   * Generar estrellas HTML
   */
  generarEstrellas(puntuacion: number): string {
    const estrellasLlenas = '★'.repeat(puntuacion);
    const estrellasVacias = '☆'.repeat(5 - puntuacion);
    return estrellasLlenas + estrellasVacias;
  }

  /**
   * Generar estrellas solo llenas (para display)
   */
  generarEstrellasLlenas(puntuacion: number): string {
    return '★'.repeat(puntuacion);
  }

  /**
   * Formatear fecha amigable
   */
  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'Fecha no disponible';

    let fechaObj: Date;
    if (typeof fecha === 'string') {
      fechaObj = new Date(fecha);
    } else if (fecha instanceof Date) {
      fechaObj = fecha;
    } else {
      return 'Fecha inválida';
    }

    if (isNaN(fechaObj.getTime())) {
      return 'Fecha inválida';
    }

    const ahora = new Date();
    const diferenciaMs = ahora.getTime() - fechaObj.getTime();
    const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));

    if (diferenciaDias === 0) {
      const diferenciaHoras = Math.floor(diferenciaMs / (1000 * 60 * 60));
      if (diferenciaHoras === 0) {
        const diferenciaMinutos = Math.floor(diferenciaMs / (1000 * 60));
        return `Hace ${diferenciaMinutos} minuto${diferenciaMinutos !== 1 ? 's' : ''}`;
      }
      return `Hace ${diferenciaHoras} hora${diferenciaHoras !== 1 ? 's' : ''}`;
    }

    if (diferenciaDias === 1) return 'Ayer';
    if (diferenciaDias < 7) return `Hace ${diferenciaDias} días`;
    if (diferenciaDias < 30) {
      const semanas = Math.floor(diferenciaDias / 7);
      return `Hace ${semanas} semana${semanas !== 1 ? 's' : ''}`;
    }
    if (diferenciaDias < 365) {
      const meses = Math.floor(diferenciaDias / 30);
      return `Hace ${meses} mes${meses !== 1 ? 'es' : ''}`;
    }

    const años = Math.floor(diferenciaDias / 365);
    return `Hace ${años} año${años !== 1 ? 's' : ''}`;
  }

  /**
   * Cambiar puntuación en el formulario
   */
  cambiarPuntuacion(puntuacion: number): void {
    this.nuevaValoracion.puntuacion = puntuacion;
  }

  /**
   * Cambiar filtro de puntuación
   */
  cambiarFiltroPuntuacion(puntuacion: number): void {
    this.filtroPuntuacion = puntuacion;
    this.aplicarFiltros();
  }

  /**
   * Cambiar orden
   */
  cambiarOrden(orden: string): void {
    this.filtroOrden = orden;
    this.aplicarFiltros();
  }

  /**
   * Obtener estadísticas de puntuaciones
   */
  getEstadisticasPuntuaciones(): { puntuacion: number, cantidad: number, porcentaje: number }[] {
    const estadisticas = [];

    for (let i = 5; i >= 1; i--) {
      const cantidad = this.valoraciones.filter(v => v.puntuacion === i).length;
      const porcentaje = this.valoraciones.length > 0
        ? (cantidad / this.valoraciones.length) * 100
        : 0;

      estadisticas.push({
        puntuacion: i,
        cantidad: cantidad,
        porcentaje: porcentaje
      });
    }

    return estadisticas;
  }

  /**
   * Cerrar sesión
   */
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

  /**
   * Obtener total de items en carrito
   */
  get totalItemsCarrito(): number {
    return this.carritoService.getTotalItems();
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones si las hubiera
  }
}
