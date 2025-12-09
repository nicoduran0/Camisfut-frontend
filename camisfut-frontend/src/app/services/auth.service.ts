import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

export interface User {
  id: string;
  nombre: string;
  email: string;
  roles?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  rol?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8081/api';

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  private userSubject = new BehaviorSubject<User | null>(this.getStoredUser());

  isLoggedIn$: Observable<boolean> = this.isLoggedInSubject.asObservable();
  user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  loginOld(userName: string): void {
    localStorage.setItem('usuarioLogueado', 'true');
    localStorage.setItem('nombreUsuario', userName);
    this.isLoggedInSubject.next(true);
  }

  register(registerData: RegisterRequest): Observable<any> {
    console.log('🚀 Enviando registro a:', `${this.apiUrl}/usuarios/registrar`);
    console.log('📦 Datos:', registerData);

    return this.http.post<any>(`${this.apiUrl}/usuarios/registrar`, registerData).pipe(
      tap(response => {
        console.log('✅ Respuesta del registro:', response);
        console.log('✅ Usuario registrado exitosamente');
        console.log('💡 Por favor, inicia sesión con tus credenciales');
      }),
      catchError(error => {
        console.error('❌ Error en registro:', error);
        throw error;
      })
    );
  }

  login(loginData: LoginRequest): Observable<AuthResponse> {
    console.log('🚀 Enviando login a:', `${this.apiUrl}/auth/login`);
    console.log('📦 Datos:', loginData);

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, loginData).pipe(
      tap(response => {
        console.log('✅ Respuesta del login:', response);

        if (!response.token) {
          console.error('❌ No se recibió token en la respuesta');
          throw new Error('No se recibió token de autenticación');
        }

        if (!response.user || !response.user.id) {
          console.error('❌ No se recibió información del usuario');
          throw new Error('No se recibió información del usuario');
        }

        if (typeof response.token !== 'string' || response.token.length < 10) {
          console.error('❌ Token inválido recibido:', response.token);
          throw new Error('Token de autenticación inválido');
        }

        if (!response.user.nombre || !response.user.email) {
          console.warn('⚠️ Información del usuario incompleta:', response.user);
        }

        this.setAuthData(response.token, response.user);

        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('userData');

        console.log('🔐 Token guardado:', storedToken?.substring(0, 20) + '...');
        console.log('👤 Usuario guardado:', storedUser);
        console.log('✅ Login completado exitosamente');

        console.log('✅ Sesión iniciada correctamente');
      }),
      catchError(error => {
        console.error('❌ Error en login:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error status text:', error.statusText);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error completo:', JSON.stringify(error, null, 2));

        if (error.status === 401) {
          console.error('❌ Credenciales incorrectas');
        } else if (error.status === 403) {
          console.error('❌ Acceso denegado');
        } else if (error.status === 0) {
          console.error('❌ No se pudo conectar al servidor. Verifica que el backend esté corriendo.');
        }

        throw error;
      })
    );
  }


  logout(): void {
    console.log('👋 Cerrando sesión...');

    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => console.log('✅ Logout notificado al backend'),
        error: (err) => console.warn('⚠️ Error notificando logout al backend:', err.message)
      });
    }

    this.clearSessionData();
    this.router.navigate(['/inicio']);
  }


  // Método para limpiar todos los datos de sesión
  private clearSessionData(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('usuarioLogueado');
    localStorage.removeItem('nombreUsuario');

    this.isLoggedInSubject.next(false);
    this.userSubject.next(null);

    console.log('🧹 Sesión limpiada completamente');
  }

  private hasToken(): boolean {
    const token = localStorage.getItem('authToken');
    const hasToken = !!token && token !== 'temp-token-' && token.length > 20;
    console.log('🔍 Verificando token almacenado:', hasToken ? 'Sí' : 'No');
    return hasToken || localStorage.getItem('usuarioLogueado') === 'true';
  }

  private getStoredUser(): User | null {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('👤 Usuario recuperado de localStorage:', user.nombre);
        return user;
      } catch (error) {
        console.error('❌ Error parseando userData:', error);
        return null;
      }
    }

    const oldUserName = localStorage.getItem('nombreUsuario');
    if (oldUserName) {
      console.log('👤 Usuario recuperado del sistema antiguo:', oldUserName);
      return {
        id: 'temp',
        nombre: oldUserName,
        email: ''
      };
    }

    return null;
  }

  private setAuthData(token: string, user: User): void {
    if (!token || !user || !user.id) {
      console.error('❌ Datos de autenticación incompletos:', { token: !!token, user: !!user, userId: user?.id });
      return;
    }

    console.log('💾 Guardando datos de autenticación...');
    console.log('🔐 Token (primeros 20 chars):', token.substring(0, 20) + '...');
    console.log('👤 Usuario ID:', user.id);
    console.log('👤 Usuario Nombre:', user.nombre);

    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));

    localStorage.setItem('usuarioLogueado', 'true');
    localStorage.setItem('nombreUsuario', user.nombre);

    this.isLoggedInSubject.next(true);
    this.userSubject.next(user);

    console.log('✅ Datos de autenticación guardados correctamente');

    setTimeout(() => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('userData');
      console.log('🔍 Verificación post-guardado:');
      console.log('🔐 Token almacenado:', storedToken ? 'Sí (' + storedToken.substring(0, 20) + '...)' : 'No');
      console.log('👤 Usuario almacenado:', storedUser ? 'Sí' : 'No');
    }, 100);
  }

  getToken(): string | null {
    const token = localStorage.getItem('authToken');
    console.log('🔑 Token obtenido:', token ? 'Sí (' + token.substring(0, 20) + '...)' : 'No');
    return token;
  }

  getCurrentUser(): User | null {
    const user = this.userSubject.value;
    console.log('👤 Usuario actual:', user?.nombre || 'No autenticado');
    return user;
  }

  get isLoggedIn(): boolean {
    const loggedIn = this.isLoggedInSubject.value;
    console.log('🔐 Estado login:', loggedIn ? 'SÍ' : 'NO');
    return loggedIn;
  }

  get userName(): string {
    const name = this.userSubject.value?.nombre || localStorage.getItem('nombreUsuario') || '';
    console.log('👤 Nombre usuario:', name || 'No disponible');
    return name;
  }

  // Método para obtener el ID del usuario como número
  getUserIdAsNumber(): number | null {
    const user = this.getCurrentUser();
    if (!user || !user.id) return null;

    const id = parseInt(user.id);
    if (isNaN(id)) return null;

    return id;
  }

  // Método para verificar si el usuario tiene un rol específico
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.roles) return false;

    return user.roles.includes(role);
  }

  // Método para debug: mostrar todos los datos de autenticación
  debugAuth(): void {
    console.group('🔍 DEBUG AUTENTICACIÓN');
    console.log('🔐 Token:', localStorage.getItem('authToken')?.substring(0, 30) + '...');
    console.log('👤 User Data:', localStorage.getItem('userData'));
    console.log('👤 Usuario antiguo:', localStorage.getItem('nombreUsuario'));
    console.log('🔐 Estado login subject:', this.isLoggedInSubject.value);
    console.log('👤 Usuario subject:', this.userSubject.value);
    console.groupEnd();
  }
}
