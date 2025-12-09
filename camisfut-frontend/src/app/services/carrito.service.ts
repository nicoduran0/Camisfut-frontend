import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError } from 'rxjs';
import { PedidoService } from './pedido.service';

export interface CarritoItem {
  id: number;
  productoId: number;
  nombre: string;
  club: string;
  precio: number;
  talla: string;
  imagen: string;
  cantidad: number;
  fechaAgregado: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private carritoItemsSubject = new BehaviorSubject<CarritoItem[]>(this.getStoredCarrito());
  carritoItems$: Observable<CarritoItem[]> = this.carritoItemsSubject.asObservable();

  // Inyectar PedidoService
  private pedidoService = inject(PedidoService);

  constructor() {}

  // ============== MÉTODOS PÚBLICOS ==============

  // Añadir item al carrito
  agregarItem(itemData: {
    id: number;
    nombre: string;
    club: string;
    precio: number;
    talla: string;
    imagen: string;
  }, cantidad: number = 1): CarritoItem | null {
    console.log('🚀 Añadiendo al carrito:', itemData);

    try {
      const itemsActuales = this.carritoItemsSubject.value;

      // Buscar si ya existe el mismo producto con la misma talla
      const itemExistenteIndex = itemsActuales.findIndex(
        i => i.productoId === itemData.id && i.talla === itemData.talla
      );

      let nuevoItem: CarritoItem;

      if (itemExistenteIndex !== -1) {
        // Actualizar cantidad si ya existe
        itemsActuales[itemExistenteIndex].cantidad += cantidad;
        nuevoItem = itemsActuales[itemExistenteIndex];

        console.log(`✅ Cantidad actualizada: ${nuevoItem.nombre} (Talla: ${nuevoItem.talla}) - Total: ${nuevoItem.cantidad} unidad(es)`);
      } else {
        nuevoItem = {
          id: this.generarNuevoId(itemsActuales),
          productoId: itemData.id,
          nombre: itemData.nombre,
          club: itemData.club,
          precio: itemData.precio,
          talla: itemData.talla,
          imagen: itemData.imagen,
          cantidad: cantidad,
          fechaAgregado: new Date()
        };

        itemsActuales.push(nuevoItem);
        console.log(`✅ Nuevo item añadido: ${nuevoItem.nombre} (Talla: ${nuevoItem.talla}) - ProductoID: ${nuevoItem.productoId}`);
      }

      this.carritoItemsSubject.next([...itemsActuales]);
      this.guardarEnLocalStorage(itemsActuales);

      return nuevoItem;

    } catch (error) {
      console.error('❌ Error añadiendo al carrito:', error);
      return null;
    }
  }

  // Eliminar item del carrito
  eliminarItem(id: number): boolean {
    console.log(`🗑️ Eliminando item ID: ${id}`);

    const itemsActuales = this.carritoItemsSubject.value;
    const index = itemsActuales.findIndex(item => item.id === id);

    if (index !== -1) {
      const itemEliminado = itemsActuales[index];
      itemsActuales.splice(index, 1);

      this.carritoItemsSubject.next([...itemsActuales]);
      this.guardarEnLocalStorage(itemsActuales);

      console.log(`✅ Item eliminado: ${itemEliminado.nombre}`);
      return true;
    }

    console.warn(`⚠️ Item con ID ${id} no encontrado`);
    return false;
  }

  // Actualizar cantidad de un item
  actualizarCantidad(id: number, nuevaCantidad: number): boolean {
    if (nuevaCantidad < 1) {
      return this.eliminarItem(id);
    }

    const itemsActuales = this.carritoItemsSubject.value;
    const item = itemsActuales.find(item => item.id === id);

    if (item) {
      item.cantidad = nuevaCantidad;
      this.carritoItemsSubject.next([...itemsActuales]);
      this.guardarEnLocalStorage(itemsActuales);
      console.log(`✅ Cantidad actualizada: ${item.nombre} - ${nuevaCantidad} unidad(es)`);
      return true;
    }

    return false;
  }

  // Vaciar carrito
  vaciarCarrito(): void {
    console.log('🧹 Vaciando carrito');
    this.carritoItemsSubject.next([]);
    this.guardarEnLocalStorage([]);
  }

  // Obtener items actuales
  obtenerItems(): CarritoItem[] {
    return [...this.carritoItemsSubject.value];
  }

  // Obtener total de items
  getTotalItems(): number {
    return this.carritoItemsSubject.value.reduce((total, item) => total + item.cantidad, 0);
  }

  // Calcular subtotal
  getSubtotal(): number {
    return this.carritoItemsSubject.value.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  }

  // Calcular total (con impuestos y envío opcionales)
  getTotal(impuestos: number = 0, envio: number = 0): number {
    return this.getSubtotal() + impuestos + envio;
  }

  // ============== MÉTODO PARA PROCESAR PEDIDO ==============

  /**
   * Procesar pedido y enviar al backend
   * @returns Observable con la respuesta del pedido creado
   */
  procesarPedido(): Observable<any> {
    console.log('🔄 Procesando pedido desde carrito...');

    const items = this.obtenerItems();
    const total = this.getSubtotal();

    if (items.length === 0) {
      console.error('❌ Carrito vacío, no se puede procesar pedido');
      throw new Error('El carrito está vacío');
    }

    console.log('📦 Items del carrito para pedido:', items);
    console.log('💰 Total del pedido:', total);

    // Convertir items del carrito a estructura que espera el backend
    const carritoItems = items.map(item => ({
      productoId: item.productoId,
      cantidad: item.cantidad,
      precio: item.precio,
      nombre: item.nombre,
      talla: item.talla
    }));

    // Usar el PedidoService para crear el pedido en el backend
    return this.pedidoService.crearPedido(carritoItems, total).pipe(
      tap(pedidoCreado => {
        console.log('✅ Pedido creado exitosamente:', pedidoCreado);
        // Limpiar carrito después de crear el pedido
        this.vaciarCarrito();
        console.log('🧹 Carrito vaciado después del pedido');

        // Mostrar mensaje de éxito
        this.mostrarMensajeExito(pedidoCreado);
      }),
      catchError(error => {
        console.error('❌ Error procesando pedido:', error);
        this.mostrarMensajeError(error);
        throw error;
      })
    );
  }

  // ============== MÉTODOS PRIVADOS ==============

  private getStoredCarrito(): CarritoItem[] {
    const carritoGuardado = localStorage.getItem('carritoCamisFut');
    if (carritoGuardado) {
      try {
        const items = JSON.parse(carritoGuardado);

        // Convertir y asegurar que todos tengan productoId
        return items.map((item: any) => ({
          ...item,
          productoId: item.productoId || item.id || 1,
          fechaAgregado: new Date(item.fechaAgregado)
        }));
      } catch (error) {
        console.error('❌ Error parseando carrito guardado:', error);
        return [];
      }
    }
    return [];
  }

  private guardarEnLocalStorage(items: CarritoItem[]): void {
    try {
      localStorage.setItem('carritoCamisFut', JSON.stringify(items));
      console.log('💾 Carrito guardado en localStorage:', items.length, 'items');
    } catch (error) {
      console.error('❌ Error guardando carrito:', error);
    }
  }

  private generarNuevoId(items: CarritoItem[]): number {
    if (items.length === 0) return 1;
    const maxId = Math.max(...items.map(item => item.id));
    return maxId + 1;
  }

  private mostrarMensajeExito(pedidoCreado: any): void {
    const mensaje = `¡Pedido #${pedidoCreado.id} creado exitosamente!\n\n` +
      `📦 Estado: ${pedidoCreado.estado}\n` +
      `💰 Total: ${pedidoCreado.total}€\n` +
      `📅 Fecha: ${new Date(pedidoCreado.fecha).toLocaleDateString('es-ES')}\n\n` +
      `Puedes ver el seguimiento en "Mis Pedidos".`;

    alert(mensaje);
  }

  private mostrarMensajeError(error: any): void {
    let mensajeError = 'Error al procesar el pedido. ';

    if (error.status === 401) {
      mensajeError += 'No estás autenticado. Por favor, inicia sesión.';
    } else if (error.status === 400) {
      mensajeError += 'Datos inválidos. Verifica tu carrito.';
    } else if (error.status === 500) {
      mensajeError += 'Error del servidor. Por favor, inténtalo más tarde.';
    } else {
      mensajeError += 'Por favor, inténtalo de nuevo.';
    }

    alert(mensajeError);
  }

  get items(): CarritoItem[] {
    return this.obtenerItems();
  }

  get totalItems(): number {
    return this.getTotalItems();
  }

  get subtotal(): number {
    return this.getSubtotal();
  }


  /**
   * Verificar si el carrito está vacío
   */
  estaVacio(): boolean {
    return this.carritoItemsSubject.value.length === 0;
  }

  /**
   * Obtener cantidad de un producto específico
   */
  getCantidadProducto(productoId: number, talla: string): number {
    const item = this.carritoItemsSubject.value.find(
      i => i.productoId === productoId && i.talla === talla
    );
    return item ? item.cantidad : 0;
  }

  /**
   * Calcular impuestos (21% IVA en España)
   */
  getImpuestos(ivaPorcentaje: number = 0.21): number {
    return this.getSubtotal() * ivaPorcentaje;
  }

  /**
   * Calcular envío (ejemplo: gratuito sobre 50€, 5.99€ bajo 50€)
   */
  getEnvio(minimoGratis: number = 50, costoEnvio: number = 5.99): number {
    return this.getSubtotal() >= minimoGratis ? 0 : costoEnvio;
  }

  /**
   * Calcular total completo con IVA y envío
   */
  getTotalCompleto(): number {
    const subtotal = this.getSubtotal();
    const iva = this.getImpuestos();
    const envio = this.getEnvio();
    return subtotal + iva + envio;
  }
}
