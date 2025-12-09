import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PedidoService, PedidoFrontend } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mis-pedidos.component.html',
  styleUrls: ['./mis-pedidos.component.css']
})
export class MisPedidosComponent implements OnInit, OnDestroy {
  pedidos: PedidoFrontend[] = [];
  loading: boolean = true;
  error: string = '';
  infoMessage: string = '';

  isLoggedIn: boolean = false;
  userName: string = '';
  totalItemsCarrito: number = 0;

  private authSubscription: Subscription = new Subscription();
  private pedidosKey = 'pedidos_eliminados';

  constructor(
    private pedidoService: PedidoService,
    private authService: AuthService,
    private carritoService: CarritoService,
    private router: Router
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isLoggedIn;
    this.userName = this.authService.userName;

    this.authSubscription = this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;

      if (!loggedIn) {
        this.error = 'Debes iniciar sesión para ver tus pedidos';
        this.loading = false;
        this.pedidos = [];
        return;
      }

      this.userName = this.authService.userName;
      this.cargarPedidos();
    });

    this.totalItemsCarrito = this.carritoService.getTotalItems();
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Método para cerrar sesión
  logout() {
    this.authService.logout();
  }

  cargarPedidos() {
    if (!this.isLoggedIn) {
      this.error = 'Debes iniciar sesión para ver tus pedidos';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = '';
    this.infoMessage = '';

    console.log('🔄 Cargando pedidos del usuario...');

    this.pedidoService.getPedidosUsuarioConNombresReales().subscribe({
      next: (pedidos: PedidoFrontend[]) => {
        console.log('✅ Pedidos cargados, total:', pedidos.length);

        // Filtrar pedidos eliminados del localStorage
        const pedidosEliminados = this.obtenerPedidosEliminados();
        const pedidosFiltrados = pedidos.filter(pedido =>
          !pedidosEliminados.includes(pedido.id)
        );

        console.log(`📊 Pedidos después de filtrar eliminados: ${pedidosFiltrados.length}`);

        console.log('\n🔍 ===== DEPURACIÓN DETALLADA DE PEDIDOS =====');
        pedidosFiltrados.forEach((pedido, i) => {
          console.log(`\n📦 Pedido ${i + 1} (ID: ${pedido.id}):`);
          console.log('  Estado:', pedido.estado);
          console.log('  Total:', pedido.total);
          console.log('  Fecha:', pedido.fecha);
          console.log('  Tiene detalles?', pedido.detalles ? 'Sí' : 'No');
          console.log('  Número de detalles:', pedido.detalles?.length || 0);
          console.log('  Tiene items?', pedido.items ? 'Sí' : 'No');
          console.log('  Número de items:', pedido.items?.length || 0);
        });
        console.log('🔍 ===== FIN DEPURACIÓN =====\n');

        // Transformar fechas
        this.pedidos = pedidosFiltrados.map(pedido => ({
          ...pedido,
          fecha: this.asegurarFechaEsDate(pedido.fecha)
        }));

        // Ordenar pedidos por fecha
        this.pedidos.sort((a, b) => {
          const fechaA = new Date(a.fecha).getTime();
          const fechaB = new Date(b.fecha).getTime();
          return fechaB - fechaA;
        });

        // Aplicar corrección de nombres si es necesario
        this.corregirNombresDeProductos();

        // Actualizar información de mensajes
        if (this.pedidos.length === 0) {
          this.infoMessage = 'No tienes pedidos todavía. ¡Empieza a comprar!';
        } else {
          this.infoMessage = `Tienes ${this.pedidos.length} pedido${this.pedidos.length !== 1 ? 's' : ''}`;
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando pedidos:', error);
        this.error = 'No se pudieron cargar tus pedidos. Intenta más tarde.';
        this.loading = false;
      }
    });
  }

  /**
   * NUEVO MÉTODO: Corregir nombres de productos que aparecen como "null"
   */
  private corregirNombresDeProductos(): void {
    console.log('🔄 Corrigiendo nombres de productos...');

    this.pedidos.forEach(pedido => {
      if (pedido.items && pedido.items.length > 0) {
        console.log(`  Procesando pedido ${pedido.id} con ${pedido.items.length} items`);

        pedido.items.forEach((item, index) => {
          const nombreOriginal = item.nombre;
          const productoId = item.productoId;
          const club = item.club;

          // Si el nombre contiene "null", está vacío o es muy genérico
          const necesitaCorreccion =
            !nombreOriginal ||
            nombreOriginal.trim() === '' ||
            nombreOriginal.includes('null') ||
            nombreOriginal.includes('#null') ||
            nombreOriginal === 'Producto no disponible' ||
            nombreOriginal === 'Producto desconocido' ||
            nombreOriginal === 'Producto genérico' ||
            nombreOriginal.startsWith('Camiseta #') && nombreOriginal.includes('#null');

          if (necesitaCorreccion) {
            console.log(`    Item ${index + 1}: Necesita corrección`);

            // ESTRATEGIA 1: Si tenemos club, usar el club
            if (club && club.trim() !== '' && club !== 'Sin club') {
              let nuevoNombre = `Camiseta ${club}`;

              // Agregar temporada si está disponible en el nombre original
              if (nombreOriginal && nombreOriginal.match(/\d{2}\/\d{2}/)) {
                const temporada = nombreOriginal.match(/(\d{2}\/\d{2})/)?.[0];
                if (temporada) {
                  nuevoNombre += ` ${temporada}`;
                }
              }

              // Agregar tipo si está disponible
              if (item.tipo === 'vintage') {
                nuevoNombre += ' Vintage';
              } else if (item.tipo === 'nuevas') {
                nuevoNombre += ' Nueva';
              } else if (item.tipo === 'fanVersion') {
                nuevoNombre += ' Fan Version';
              }

              item.nombre = nuevoNombre;
              console.log(`      ✅ Corregido usando club: "${nuevoNombre}"`);
            }
            // ESTRATEGIA 2: Si tenemos producto ID válido
            else if (productoId && productoId > 0) {
              item.nombre = `Camiseta #${productoId}`;
              console.log(`      ✅ Corregido usando ID: "${item.nombre}"`);
            }
            // ESTRATEGIA 3: Usar información del pedido
            else if (pedido.total > 0) {
              // Crear nombre basado en el precio
              if (pedido.total > 100) {
                item.nombre = 'Camiseta premium';
              } else if (pedido.total > 50) {
                item.nombre = 'Camiseta estándar';
              } else {
                item.nombre = 'Camiseta básica';
              }
              console.log(`      ✅ Corregido usando precio: "${item.nombre}"`);
            }
            // ESTRATEGIA 4: Nombre por defecto
            else {
              item.nombre = 'Camiseta de fútbol';
              console.log(`      ✅ Corregido a nombre por defecto: "${item.nombre}"`);
            }
          }

          // Asegurar valores por defecto para otros campos
          if (!item.club || item.club.trim() === '') {
            item.club = 'Sin club';
          }
          if (!item.talla || item.talla.trim() === '') {
            item.talla = 'M';
          }
          if (!item.imagen || item.imagen.trim() === '') {
            item.imagen = 'default.jpg';
          }
        });
      }
    });

    console.log('✅ Corrección de nombres completada');
  }

  /**
   * CANCELAR PEDIDO con modal atractivo
   */
  cancelarPedido(pedido: PedidoFrontend) {
    if (pedido.estado !== 'pendiente') {
      this.mostrarModal('No se puede cancelar',
        'Solo puedes cancelar pedidos que estén en estado "Pendiente".',
        'warning');
      return;
    }

    this.mostrarModalConfirmacion(
      'Cancelar pedido',
      `¿Estás seguro de que quieres cancelar el pedido <strong>#${pedido.id}</strong>?`,
      'Una vez cancelado, no podrás revertir esta acción.',
      'cancelar',
      () => {
        console.log('✅ Cancelando pedido localmente:', pedido.id);

        // Cambiar estado localmente
        pedido.estado = 'cancelado';

        // Mostrar mensaje de éxito
        this.mostrarModal('Pedido cancelado',
          `El pedido <strong>#${pedido.id}</strong> ha sido cancelado exitosamente.`,
          'success');

        // Recargar después de 2 segundos
        setTimeout(() => {
          this.cargarPedidos();
        }, 2000);
      }
    );
  }

  /**
   * ELIMINAR PEDIDO con modal atractivo
   */
  eliminarPedido(pedido: PedidoFrontend) {
    if (pedido.estado !== 'cancelado' && pedido.estado !== 'pendiente') {
      this.mostrarModal('No se puede eliminar',
        'Solo puedes eliminar pedidos cancelados o pendientes.',
        'warning');
      return;
    }

    const estadoTexto = pedido.estado === 'cancelado' ? 'cancelado' : 'pendiente';

    this.mostrarModalConfirmacion(
      'Eliminar pedido',
      `¿Estás seguro de que quieres eliminar el pedido <strong>#${pedido.id}</strong>?`,
      `Este pedido está <span class="badge ${this.obtenerClaseEstado(pedido.estado)}">${this.obtenerEstadoTraducido(pedido.estado).toUpperCase()}</span>. Esta acción eliminará el pedido de tu vista permanentemente.`,
      'eliminar',
      () => {
        console.log('🗑️ Eliminando pedido:', pedido.id);

        // 1. Guardar en localStorage para recordar que fue eliminado
        this.guardarPedidoEliminado(pedido.id);

        // 2. Eliminar del array local inmediatamente
        this.pedidos = this.pedidos.filter(p => p.id !== pedido.id);

        // 3. Actualizar mensaje informativo
        if (this.pedidos.length === 0) {
          this.infoMessage = 'No tienes pedidos todavía. ¡Empieza a comprar!';
        } else {
          this.infoMessage = `Tienes ${this.pedidos.length} pedido${this.pedidos.length !== 1 ? 's' : ''}`;
        }

        // 4. Mostrar modal de éxito
        this.mostrarModal('Pedido eliminado',
          `El pedido <strong>#${pedido.id}</strong> ha sido eliminado de tu vista.<br><br>
         <small class="text-muted">Recarga la página si quieres restaurarlo.</small>`,
          'success');
      }
    );
  }

  /**
   * MÉTODO PARA MOSTRAR MODAL DE CONFIRMACIÓN ATRACTIVO
   */
  private mostrarModalConfirmacion(
    titulo: string,
    mensaje: string,
    detalle: string,
    tipo: 'cancelar' | 'eliminar',
    onConfirm: () => void
  ): void {
    // Crear elementos del modal
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.id = 'confirmacionModal';
    modalDiv.tabIndex = -1;
    modalDiv.setAttribute('aria-labelledby', 'confirmacionModalLabel');
    modalDiv.setAttribute('aria-hidden', 'true');

    // Determinar colores según tipo
    const tipoConfig = {
      cancelar: { color: 'warning', icon: 'bi-exclamation-triangle', btnText: 'Sí, cancelar' },
      eliminar: { color: 'danger', icon: 'bi-trash', btnText: 'Sí, eliminar' }
    };

    const config = tipoConfig[tipo];

    modalDiv.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header bg-${config.color} text-white">
          <h5 class="modal-title" id="confirmacionModalLabel">
            <i class="bi ${config.icon} me-2"></i>${titulo}
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="text-center mb-4">
            <div class="mb-3">
              <i class="bi ${config.icon} display-1 text-${config.color}"></i>
            </div>
            <h4 class="mb-3">${mensaje}</h4>
            ${detalle ? `<p class="text-muted">${detalle}</p>` : ''}
          </div>
          <div class="alert alert-light border">
            <div class="d-flex">
              <i class="bi bi-info-circle text-primary me-2"></i>
              <div>
                <small class="text-muted">
                  Esta acción ${tipo === 'eliminar' ? 'ocultará el pedido de tu vista' : 'cambiará el estado del pedido a "Cancelado"'}.
                </small>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer justify-content-center border-top-0">
          <button type="button" class="btn btn-outline-secondary btn-lg px-4" data-bs-dismiss="modal">
            <i class="bi bi-x-circle me-2"></i>No, volver
          </button>
          <button type="button" class="btn btn-${config.color} btn-lg px-4" id="confirmActionBtn">
            <i class="bi ${config.icon} me-2"></i>${config.btnText}
          </button>
        </div>
      </div>
    </div>
  `;

    // Agregar al body
    document.body.appendChild(modalDiv);

    // Crear e inicializar el modal de Bootstrap
    const modal = new (window as any).bootstrap.Modal(modalDiv);
    modal.show();

    // Configurar evento del botón de confirmación
    const confirmBtn = modalDiv.querySelector('#confirmActionBtn');
    confirmBtn?.addEventListener('click', () => {
      modal.hide();
      setTimeout(() => {
        document.body.removeChild(modalDiv);
        onConfirm();
      }, 300);
    });

    // Limpiar cuando se cierre el modal
    modalDiv.addEventListener('hidden.bs.modal', () => {
      setTimeout(() => {
        if (document.body.contains(modalDiv)) {
          document.body.removeChild(modalDiv);
        }
      }, 300);
    });
  }

  /**
   * MÉTODO PARA MOSTRAR MODAL INFORMATIVO
   */
  private mostrarModal(titulo: string, mensaje: string, tipo: 'success' | 'warning' | 'info' | 'danger' = 'info'): void {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.tabIndex = -1;

    const tipoConfig = {
      success: { icon: 'bi-check-circle', color: 'success' },
      warning: { icon: 'bi-exclamation-triangle', color: 'warning' },
      info: { icon: 'bi-info-circle', color: 'info' },
      danger: { icon: 'bi-x-circle', color: 'danger' }
    };

    const config = tipoConfig[tipo];

    modalDiv.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header bg-${config.color} text-white">
          <h5 class="modal-title">
            <i class="bi ${config.icon} me-2"></i>${titulo}
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body text-center py-4">
          <i class="bi ${config.icon} display-1 text-${config.color} mb-3"></i>
          <div class="fs-5">${mensaje}</div>
        </div>
        <div class="modal-footer justify-content-center border-top-0">
          <button type="button" class="btn btn-${config.color} px-4" data-bs-dismiss="modal">
            <i class="bi bi-check me-2"></i>Aceptar
          </button>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(modalDiv);
    const modal = new (window as any).bootstrap.Modal(modalDiv);
    modal.show();

    modalDiv.addEventListener('hidden.bs.modal', () => {
      setTimeout(() => {
        if (document.body.contains(modalDiv)) {
          document.body.removeChild(modalDiv);
        }
      }, 300);
    });
  }

  /**
   * Método para guardar pedidos eliminados en localStorage
   */
  private guardarPedidoEliminado(pedidoId: number): void {
    try {
      const eliminados = this.obtenerPedidosEliminados();
      if (!eliminados.includes(pedidoId)) {
        eliminados.push(pedidoId);
        localStorage.setItem(this.pedidosKey, JSON.stringify(eliminados));
        console.log(`💾 Guardado en localStorage: pedido ${pedidoId} eliminado`);
      }
    } catch (error) {
      console.error('❌ Error guardando pedido eliminado:', error);
    }
  }

  /**
   * Método para obtener lista de pedidos eliminados
   */
  private obtenerPedidosEliminados(): number[] {
    try {
      const data = localStorage.getItem(this.pedidosKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error obteniendo pedidos eliminados:', error);
      return [];
    }
  }

  /**
   * LIMPIAR pedidos eliminados (opcional - para testing)
   */
  limpiarPedidosEliminados(): void {
    if (confirm('¿Quieres restaurar todos los pedidos eliminados?')) {
      localStorage.removeItem(this.pedidosKey);
      alert('Pedidos eliminados restaurados. Recarga la página para verlos.');
      this.cargarPedidos();
    }
  }

  private asegurarFechaEsDate(fecha: any): Date {
    try {
      if (fecha instanceof Date) {
        return fecha;
      }

      if (typeof fecha === 'string') {
        const date = new Date(fecha);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      if (typeof fecha === 'number') {
        return new Date(fecha);
      }

      return new Date();
    } catch (error) {
      console.warn('⚠️ Error convirtiendo fecha:', error);
      return new Date();
    }
  }

  formatearFecha(fecha: any): string {
    try {
      const fechaObj = this.asegurarFechaEsDate(fecha);

      if (isNaN(fechaObj.getTime())) {
        return 'Fecha no disponible';
      }

      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  }

  obtenerEstadoTraducido(estado: string): string {
    const estados: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'procesando': 'En proceso',
      'enviado': 'Enviado',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado'
    };

    return estados[estado] || estado;
  }

  obtenerClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'pendiente': 'bg-secondary',
      'procesando': 'bg-warning text-dark',
      'enviado': 'bg-primary',
      'entregado': 'bg-success',
      'cancelado': 'bg-danger'
    };

    return clases[estado] || 'bg-secondary';
  }

  verDetalles(pedido: PedidoFrontend) {
    const fechaDate = this.asegurarFechaEsDate(pedido.fecha);

    let detallesMensaje = `📦 **Pedido #${pedido.id}**\n\n`;
    detallesMensaje += `📅 Fecha: ${this.formatearFecha(pedido.fecha)}\n`;
    detallesMensaje += `📋 Estado: ${this.obtenerEstadoTraducido(pedido.estado)}\n`;
    detallesMensaje += `💰 Total: ${pedido.total.toFixed(2)}€\n`;

    if (pedido.direccion) {
      detallesMensaje += `📍 Dirección: ${pedido.direccion}\n`;
    }

    if (pedido.metodoPago) {
      detallesMensaje += `💳 Método de pago: ${pedido.metodoPago}\n`;
    }

    if (pedido.items && pedido.items.length > 0) {
      detallesMensaje += '\n**Productos:**\n';
      pedido.items.forEach((item, index) => {
        const precio = item.precio || 0;
        const subtotal = item.subtotal || 0;
        detallesMensaje += `${index + 1}. ${item.nombre}\n`;
        detallesMensaje += `   - Cantidad: ${item.cantidad} x ${precio.toFixed(2)}€ = ${subtotal.toFixed(2)}€\n`;
        if (item.talla && item.talla !== 'M') detallesMensaje += `   - Talla: ${item.talla}\n`;
        if (item.club && item.club !== 'Sin club') detallesMensaje += `   - Club: ${item.club}\n`;
      });
    } else if (pedido.detalles && pedido.detalles.length > 0) {
      detallesMensaje += '\n**Productos:**\n';
      pedido.detalles.forEach((detalle, index) => {
        const cantidad = detalle.cantidad || 1;
        const precioUnitario = detalle.subtotal / cantidad;
        detallesMensaje += `${index + 1}. Producto #${detalle.idProducto || detalle.productoId || '??'} - ${cantidad} x ${precioUnitario.toFixed(2)}€ = ${detalle.subtotal.toFixed(2)}€\n`;
      });
    }

    alert(detallesMensaje);
  }

  verDetallesCompletos(pedidoId: number) {
    console.log('Ver detalles completos del pedido:', pedidoId);
    alert(`Esta funcionalidad está en desarrollo. Pedido ID: ${pedidoId}`);
  }

  repetirPedido(pedido: PedidoFrontend) {
    if (!pedido.items || pedido.items.length === 0) {
      alert('No se pueden repetir los productos de este pedido.');
      return;
    }

    if (confirm(`¿Quieres agregar los ${pedido.items.length} productos de este pedido a tu carrito?`)) {
      pedido.items.forEach(item => {
        this.carritoService.agregarItem({
          id: item.productoId || item.id,
          nombre: item.nombre,
          club: item.club || '',
          precio: item.precio,
          talla: item.talla || 'M',
          imagen: item.imagen || 'default.jpg'
        }, item.cantidad);
      });

      alert(`¡${pedido.items.length} productos añadidos al carrito!`);
      this.router.navigate(['/carrito']);
    }
  }

  recargar() {
    this.cargarPedidos();
  }

  irAlCatalogo() {
    this.router.navigate(['/catalogo']);
  }

  obtenerProgresoPedido(estado: string): number {
    const progresos: { [key: string]: number } = {
      'pendiente': 0,
      'procesando': 33,
      'enviado': 66,
      'entregado': 100,
      'cancelado': 0
    };

    return progresos[estado] || 0;
  }

  obtenerTextoProgreso(estado: string): string[] {
    const textos: { [key: string]: string[] } = {
      'pendiente': ['Pedido realizado'],
      'procesando': ['Pedido realizado', 'En proceso'],
      'enviado': ['Pedido realizado', 'En proceso', 'Enviado'],
      'entregado': ['Pedido realizado', 'En proceso', 'Enviado', 'Entregado'],
      'cancelado': ['Pedido cancelado']
    };

    return textos[estado] || ['Estado desconocido'];
  }
}
