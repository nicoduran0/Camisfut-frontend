import { Routes } from '@angular/router';
import { CatalogoComponent } from './components/catalogo/catalogo.component';
import { CarritoComponent } from './components/carrito/carrito.component';
import { InicioSesionComponent } from './components/inicio-sesion/inicio-sesion.component';
import { ColeccionesComponent } from './components/colecciones/colecciones.component';
import { NosotrosComponent } from './components/nosotros/nosotros.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { OpinionesComponent } from './components/opiniones/opiniones.component';
import { PagoComponent } from './components/pago/pago.component';
import { DetalleProductoComponent } from './components/detalle-producto/detalle-producto.component';
import { MisPedidosComponent } from './components/mis-pedidos/mis-pedidos.component';

import { AdminLoginComponent } from './components/admin-login/admin-login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  { path: 'catalogo', component: CatalogoComponent },
  { path: 'carrito', component: CarritoComponent },
  { path: 'inicio-sesion', component: InicioSesionComponent },
  { path: 'colecciones', component: ColeccionesComponent },
  { path: 'nosotros', component: NosotrosComponent },
  { path: 'opiniones', component: OpinionesComponent },
  { path: 'pago', component: PagoComponent },
  { path: 'producto/:id', component: DetalleProductoComponent },
  { path: 'mis-pedidos', component: MisPedidosComponent },


  { path: 'admin', component: AdminLoginComponent },
  { path: 'admin/login', redirectTo: '/admin', pathMatch: 'full' },
  { path: 'admin/dashboard', component: AdminDashboardComponent },

  { path: 'administrador', redirectTo: '/admin', pathMatch: 'full' },
  { path: 'admin-panel', redirectTo: '/admin/dashboard', pathMatch: 'full' }
];
