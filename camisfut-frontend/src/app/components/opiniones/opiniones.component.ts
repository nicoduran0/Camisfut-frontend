import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-opiniones',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './opiniones.component.html',
  styleUrls: ['./opiniones.component.css']
})
export class OpinionesComponent implements OnInit {
  isLoggedIn: boolean = false;
  userName: string = '';

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

  get totalItemsCarrito(): number {
    return this.carritoService.getTotalItems();
  }
}
