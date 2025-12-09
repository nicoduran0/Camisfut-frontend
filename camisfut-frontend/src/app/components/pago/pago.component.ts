import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CarritoService, CarritoItem } from '../../services/carrito.service';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pago.component.html',
  styleUrl: './pago.component.css'
})
export class PagoComponent implements OnInit {
  isLoggedIn: boolean = false;
  userName: string = '';
  numeroPedido: string = '';

  carritoItems: CarritoItem[] = [];
  loading: boolean = false;
  pagoExitoso: boolean = false;
  pedidoCreado: any = null;

  // Método de pago seleccionado
  metodoPagoSeleccionado: string | null = 'tarjeta';
  aceptaTerminos: boolean = false;

  mostrarNotificacion: boolean = false;
  mensajeNotificacion: string = '';
  tipoNotificacion: 'error' | 'success' | 'info' = 'error';

  datosEnvio = {
    nombre: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
    telefono: ''
  };

  datosPago = {
    tarjeta: '',
    nombreTitular: '',
    fechaVencimiento: '',
    cvv: ''
  };

  constructor(
    private authService: AuthService,
    private carritoService: CarritoService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      if (!loggedIn) {
        this.mostrarMensaje('Debes iniciar sesión para realizar un pedido', 'error');
        setTimeout(() => {
          this.router.navigate(['/inicio-sesion'], {
            queryParams: { returnUrl: '/pago' }
          });
        }, 1500);
      }
    });

    this.authService.user$.subscribe(user => {
      this.userName = user?.nombre || '';
      if (user?.nombre && !this.datosEnvio.nombre) {
        this.datosEnvio.nombre = user.nombre;
      }
    });

    this.carritoItems = this.carritoService.obtenerItems();

    if (this.carritoItems.length === 0) {
      this.mostrarMensaje('Tu carrito está vacío', 'info');
      setTimeout(() => {
        this.router.navigate(['/carrito']);
      }, 1500);
    }

    this.generarNumeroPedido();
  }

  // Método para seleccionar método de pago
  seleccionarMetodoPago(metodo: string): void {
    this.metodoPagoSeleccionado = metodo;
  }

  // Obtener nombre amigable del método de pago
  getNombreMetodoPago(): string {
    switch (this.metodoPagoSeleccionado) {
      case 'tarjeta': return 'Tarjeta de crédito/débito';
      case 'paypal': return 'PayPal';
      case 'applepay': return 'Apple Pay';
      case 'googlepay': return 'Google Pay';
      default: return '';
    }
  }

  // Mostrar notificación
  mostrarMensaje(mensaje: string, tipo: 'error' | 'success' | 'info' = 'error') {
    this.mensajeNotificacion = mensaje;
    this.tipoNotificacion = tipo;
    this.mostrarNotificacion = true;

    setTimeout(() => {
      this.mostrarNotificacion = false;
    }, 4000);
  }

  generarNumeroPedido() {
    const timestamp = Date.now().toString();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.numeroPedido = 'CF' + timestamp.slice(-6) + randomNum;
  }

  get totalItemsCarrito(): number {
    return this.carritoService.getTotalItems();
  }

  get subtotal(): number {
    return this.carritoService.getSubtotal();
  }

  get envio(): number {
    return this.carritoService.getEnvio();
  }

  get impuestos(): number {
    return this.carritoService.getImpuestos();
  }

  get total(): number {
    return this.carritoService.getTotalCompleto();
  }

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

  // ========== MÉTODO PRINCIPAL ==========
  procesarPago() {
    console.log('🔄 Iniciando proceso de pago...');

    // Validar que el usuario esté autenticado
    if (!this.isLoggedIn) {
      this.mostrarMensaje('Debes iniciar sesión para realizar un pedido', 'error');
      setTimeout(() => {
        this.router.navigate(['/inicio-sesion'], {
          queryParams: { returnUrl: '/pago' }
        });
      }, 1500);
      return;
    }

    // Validar que haya items en el carrito
    if (this.carritoItems.length === 0) {
      this.mostrarMensaje('Tu carrito está vacío', 'error');
      this.router.navigate(['/carrito']);
      return;
    }

    // Validar método de pago seleccionado
    if (!this.metodoPagoSeleccionado) {
      this.mostrarMensaje('Por favor, selecciona un método de pago', 'error');
      return;
    }

    // Validar términos y condiciones
    if (!this.aceptaTerminos) {
      this.mostrarMensaje('Debes aceptar los términos y condiciones', 'error');
      return;
    }

    // Validar datos de envío
    if (!this.validarDatosEnvio()) {
      return;
    }

    // Validar datos de pago si es tarjeta
    if (this.metodoPagoSeleccionado === 'tarjeta' && !this.validarDatosTarjeta()) {
      return;
    }

    this.loading = true;
    this.mostrarMensaje('Procesando tu pedido...', 'info');

    console.log('✅ Datos validados, creando pedido...');

    this.carritoService.procesarPedido().subscribe({
      next: (pedidoCreado) => {
        console.log('✅ Pedido creado exitosamente en backend:', pedidoCreado);

        // Guardar información del pedido creado
        this.pedidoCreado = pedidoCreado;

        // Generar número de pedido local
        this.generarNumeroPedido();

        // Marcar pago como exitoso
        this.pagoExitoso = true;
        this.loading = false;

        // Mostrar mensaje de éxito con datos del pedido real
        const mensajeExito = `¡Pedido #${pedidoCreado.id} procesado exitosamente!\n\n` +
          `📦 Estado: ${pedidoCreado.estado}\n` +
          `💰 Total: ${pedidoCreado.total}€\n` +
          `📅 Fecha: ${new Date(pedidoCreado.fecha).toLocaleDateString('es-ES')}\n\n` +
          `Serás redirigido a "Mis Pedidos" en 5 segundos...`;

        this.mostrarMensaje(mensajeExito, 'success');

        // Redirigir a mis pedidos después de 5 segundos
        setTimeout(() => {
          this.router.navigate(['/mis-pedidos']);
        }, 5000);
      },
      error: (error) => {
        console.error('❌ Error creando pedido:', error);
        this.loading = false;

        // El mensaje de error ya se muestra en el servicio, pero podemos agregar contexto
        if (error.status === 401) {
          this.mostrarMensaje('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'error');
          setTimeout(() => {
            this.router.navigate(['/inicio-sesion']);
          }, 2000);
        } else if (error.status === 400) {
          this.mostrarMensaje('Error en los datos del pedido. Verifica tu carrito.', 'error');
        } else {
          this.mostrarMensaje('Error al procesar el pedido. Inténtalo de nuevo.', 'error');
        }
      }
    });
  }

  validarDatosEnvio(): boolean {
    const camposRequeridos = ['nombre', 'direccion', 'ciudad', 'codigoPostal', 'telefono'];
    const camposFaltantes = camposRequeridos.filter(campo => !this.datosEnvio[campo as keyof typeof this.datosEnvio]);

    if (camposFaltantes.length > 0) {
      this.mostrarMensaje('Por favor, completa todos los datos de envío', 'error');
      return false;
    }

    // Validar formato de teléfono
    const telefonoLimpio = this.datosEnvio.telefono.replace(/\D/g, '');
    if (telefonoLimpio.length < 9) {
      this.mostrarMensaje('Por favor, introduce un número de teléfono válido', 'error');
      return false;
    }

    // Validar código postal (5 dígitos en España)
    const cpLimpio = this.datosEnvio.codigoPostal.replace(/\D/g, '');
    if (cpLimpio.length !== 5) {
      this.mostrarMensaje('Por favor, introduce un código postal válido (5 dígitos)', 'error');
      return false;
    }

    return true;
  }

  validarDatosTarjeta(): boolean {
    const camposRequeridos = ['tarjeta', 'nombreTitular', 'fechaVencimiento', 'cvv'];
    const camposFaltantes = camposRequeridos.filter(campo => !this.datosPago[campo as keyof typeof this.datosPago]);

    if (camposFaltantes.length > 0) {
      this.mostrarMensaje('Por favor, completa todos los datos de pago', 'error');
      return false;
    }

    // Validar formato de tarjeta
    const tarjetaLimpia = this.datosPago.tarjeta.replace(/\s/g, '');
    if (tarjetaLimpia.length !== 16 || !/^\d+$/.test(tarjetaLimpia)) {
      this.mostrarMensaje('Por favor, introduce un número de tarjeta válido (16 dígitos)', 'error');
      return false;
    }

    // Validar CVV
    if (this.datosPago.cvv.length !== 3 || !/^\d+$/.test(this.datosPago.cvv)) {
      this.mostrarMensaje('Por favor, introduce un CVV válido (3 dígitos)', 'error');
      return false;
    }

    // Validar fecha de vencimiento (formato MM/AA)
    const fechaRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!fechaRegex.test(this.datosPago.fechaVencimiento)) {
      this.mostrarMensaje('Por favor, introduce una fecha de vencimiento válida (MM/AA)', 'error');
      return false;
    }

    // Validar que la fecha no esté vencida
    const [mes, año] = this.datosPago.fechaVencimiento.split('/');
    const ahora = new Date();
    const añoActual = ahora.getFullYear() % 100; // Últimos 2 dígitos
    const mesActual = ahora.getMonth() + 1; // Enero = 1

    if (parseInt(año) < añoActual ||
      (parseInt(año) === añoActual && parseInt(mes) < mesActual)) {
      this.mostrarMensaje('La tarjeta está vencida', 'error');
      return false;
    }

    return true;
  }

  formatTarjeta(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})/g, '$1 ').trim();
    value = value.substring(0, 19);
    this.datosPago.tarjeta = value;
  }

  formatFechaVencimiento(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    value = value.substring(0, 5);
    this.datosPago.fechaVencimiento = value;
  }

  formatTelefono(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 0) {
      value = value.substring(0, 9);
    }
    this.datosEnvio.telefono = value;
  }

  formatCodigoPostal(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.substring(0, 5);
    this.datosEnvio.codigoPostal = value;
  }

  volverAlCarrito() {
    this.router.navigate(['/carrito']);
  }

  // Método para redirigir inmediatamente a mis pedidos después del éxito
  irAMisPedidos() {
    if (this.pagoExitoso) {
      this.router.navigate(['/mis-pedidos']);
    }
  }

  // Método para continuar comprando después del éxito
  continuarComprando() {
    if (this.pagoExitoso) {
      this.router.navigate(['/catalogo']);
    }
  }
}
