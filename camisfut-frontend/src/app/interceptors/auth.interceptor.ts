import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  console.log(`🛠️ Interceptor procesando: ${req.url}`);
  console.log(`🔐 Token disponible: ${token ? 'Sí' : 'No'}`);

  if (token && token.startsWith('temp-token-')) {
    console.warn('⚠️ Token temporal detectado, no se añade a la petición');

    if (req.url.includes('/api/pedidos') || req.url.includes('/api/')) {
      console.error('❌ Intentando acceder a endpoint protegido con token temporal');

    }

    return next(req);
  }

  if (token) {
    console.log('✅ Añadiendo token JWT real a la petición');

    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(cloned);
  }

  return next(req);
};
