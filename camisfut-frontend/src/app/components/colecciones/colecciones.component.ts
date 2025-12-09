import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-colecciones',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './colecciones.component.html',
  styleUrl: './colecciones.component.css'
})
export class ColeccionesComponent implements OnInit {
  isLoggedIn: boolean = false;
  userName: string = '';

  coleccionesDestacadas = [
    {
      nombre: 'Champions League',
      descripcion: 'Camisetas históricas de equipos champions',
      imagen: 'img/champions2.jpg',
      filtro: 'champions'
    },
    {
      nombre: 'Selecciones Nacionales',
      descripcion: 'Representa a tu país con orgullo',
      imagen: 'img/selecciones.jpg',
      filtro: 'selecciones'
    },
    {
      nombre: 'Retros',
      descripcion: 'Revive la época dorada del fútbol',
      imagen: 'img/retro.jpg',
      filtro: 'vintage'
    },
    {
      nombre: 'Fans Version',
      descripcion: 'Camisetas diseñadas al detalle por aficionados',
      imagen: 'img/fansVersion.jpg',
      filtro: 'fanVersion'
    }
  ];

  coleccionesExtra = [
    {
      nombre: 'Premier League',
      imagen: 'img/premier.png',
      filtro: 'premier'
    },
    {
      nombre: 'La Liga',
      imagen: 'img/laliga.jpg',
      filtro: 'laLiga'
    },
    {
      nombre: 'Serie A',
      imagen: 'img/seriea.jpg',
      filtro: 'serieA'
    },
    {
      nombre: 'Bundesliga',
      imagen: 'img/bundesliga.jpg',
      filtro: 'bundesliga'
    },
    {
      nombre: 'Ligue 1',
      imagen: 'img/ligue1.jpg',
      filtro: 'ligue1'
    }
  ];

  constructor(
    private authService: AuthService,
    private carritoService: CarritoService // AÑADIR ESTO
  ) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });

    this.authService.user$.subscribe(user => {
      this.userName = user?.nombre || '';
    });
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

  get totalItemsCarrito(): number {
    return this.carritoService.getTotalItems();
  }
}
