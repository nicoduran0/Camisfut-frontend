// COPIA Y PEGA ESTO COMPLETO en valoraciones.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, switchMap, first } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Valoracion {
  id?: number;
  idProducto?: number;
  idUsuario?: number;
  puntuacion: number;
  comentario: string;
  usuario?: {
    id?: number;
    nombre?: string;
    email?: string;
  };
  producto?: {
    id?: number;
    nombre?: string;
  };
  fechaCreacion?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ValoracionesService {
  private apiUrl = 'http://localhost:8081/api/valoraciones';

  // Cache del ID que funciona
  private productoOpinionesId: number | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getValoraciones(): Observable<Valoracion[]> {
    return this.http.get<Valoracion[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('❌ Error obteniendo valoraciones:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Método inteligente que encuentra un producto que funcione
   */
  crearValoracionOpinionGeneral(valoracion: {
    puntuacion: number;
    comentario: string;
  }): Observable<Valoracion> {
    const userId = this.authService.getUserIdAsNumber();

    if (!userId) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    // Si ya sabemos qué ID funciona, úsalo
    if (this.productoOpinionesId !== null) {
      return this.crearConId(this.productoOpinionesId, userId, valoracion);
    }

    // Si no, primero intenta con ID 1
    return this.crearConId(1, userId, valoracion).pipe(
      catchError(error => {
        console.log('⚠️ ID 1 falló, buscando ID alternativo...');

        // Busca en valoraciones existentes qué ID usan otros
        return this.getValoraciones().pipe(
          switchMap(valoraciones => {
            // Encuentra un ID usado en otras valoraciones
            const idsUsados = valoraciones
              .map(v => v.idProducto)
              .filter((id): id is number => id !== undefined && id !== null)
              .filter((id, index, self) => self.indexOf(id) === index);

            if (idsUsados.length > 0) {
              // Usa el primer ID que encuentre
              const idAlternativo = idsUsados[0];
              this.productoOpinionesId = idAlternativo;
              console.log(`✨ Encontrado ID alternativo: ${idAlternativo}`);
              return this.crearConId(idAlternativo, userId, valoracion);
            }

            // Si no hay valoraciones, prueba IDs comunes
            return this.probarIdsComunes(userId, valoracion);
          })
        );
      })
    );
  }

  /**
   * Prueba IDs comunes (2-10)
   */
  private probarIdsComunes(
    userId: number,
    valoracion: { puntuacion: number; comentario: string; }
  ): Observable<Valoracion> {
    const ids = [2, 3, 4, 5, 6, 7, 8, 9, 10];

    return from(ids).pipe(
      switchMap(productoId =>
        this.crearConId(productoId, userId, valoracion).pipe(
          catchError(error => {
            // Si falla, continuar con el siguiente ID
            return throwError(() => error);
          })
        )
      ),
      first(), // Toma el primero que funcione
      catchError(error => {
        return throwError(() => new Error(
          'No se pudo crear la opinión. ' +
          'Asegúrate de que haya productos en el sistema y que tengas permisos.'
        ));
      })
    );
  }

  /**
   * Crea valoración con un ID específico
   */
  private crearConId(
    productoId: number,
    userId: number,
    valoracion: { puntuacion: number; comentario: string; }
  ): Observable<Valoracion> {
    const payload = {
      puntuacion: valoracion.puntuacion,
      comentario: valoracion.comentario,
      idUsuario: userId,
      idProducto: productoId
    };

    console.log(`🔄 Intentando con producto ID ${productoId}`);

    return this.http.post<Valoracion>(this.apiUrl, payload, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error(`❌ Error con ID ${productoId}:`, error.status);
        return throwError(() => error);
      })
    );
  }

  // Resto de métodos (mantén los que ya tienes)
  crearValoracionProducto(productoId: number, valoracion: {
    puntuacion: number;
    comentario: string;
  }): Observable<Valoracion> {
    const userId = this.authService.getUserIdAsNumber();

    if (!userId) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const payload = {
      ...valoracion,
      idUsuario: userId,
      idProducto: productoId
    };

    return this.http.post<Valoracion>(this.apiUrl, payload, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error(`❌ Error valorando producto ${productoId}:`, error);

        if (error.status === 400) {
          return throwError(() => new Error('Ya has valorado este producto.'));
        }

        return throwError(() => error);
      })
    );
  }

  actualizarValoracion(id: number, valoracion: Partial<Valoracion>): Observable<Valoracion> {
    return this.http.put<Valoracion>(`${this.apiUrl}/${id}`, valoracion, {
      headers: this.getHeaders()
    });
  }

  eliminarValoracion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  getOpinionesGenerales(): Observable<Valoracion[]> {
    return this.getValoraciones();
  }

  usuarioYaTieneOpinionGeneral(): Observable<boolean> {
    const userId = this.authService.getUserIdAsNumber();

    return new Observable<boolean>(observer => {
      if (!userId) {
        observer.next(false);
        observer.complete();
        return;
      }

      this.getValoraciones().subscribe({
        next: (valoraciones) => {
          const yaTieneOpinion = valoraciones.some(v => v.idUsuario === userId);
          observer.next(yaTieneOpinion);
          observer.complete();
        },
        error: (error) => {
          console.error('Error verificando opinión:', error);
          observer.next(false);
          observer.complete();
        }
      });
    });
  }
}
