export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  club: string;
  equipo?: string;
  tipo: string;
  categoria: string;
  liga?: string;
  retro: boolean;
  destacado?: boolean;
  stock: number;
  imagenes: string[];
  tallasDisponibles?: string[];
  fechaCreacion?: Date;
  fechaActualizacion?: Date;

  categoriasIds?: number[];

  eliminado?: boolean;
  esModificado?: boolean;
}

export interface FiltrosProducto {
  tipo?: string;
  categoria?: string;
  liga?: string;
  precioMin?: number;
  precioMax?: number;
  terminoBusqueda?: string;
  retro?: boolean;
  destacado?: boolean;
  eliminado?: boolean;
  esModificado?: boolean;
}

export interface ProductosResponse {
  productos: Producto[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface ProductoRequest {
  nombre: string;
  descripcion?: string;
  precio: number;
  club: string;
  tipo: string;
  categoria: string;
  liga?: string;
  retro: boolean;
  imagenes: string[];
  tallasDisponibles?: string[];
  stock?: number;
}

export function crearProductoVacio(): Producto {
  return {
    id: 0,
    nombre: '',
    precio: 0,
    club: '',
    tipo: 'nuevas',
    categoria: 'clubes',
    retro: false,
    imagenes: [],
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    stock: 0
  };
}

export function mapearProductoDesdeBackend(datos: any): Producto {
  const categoriasIds = datos.categoriasIds || [];

  let tipo = 'nuevas';
  if (categoriasIds.includes(2)) tipo = 'vintage';
  if (categoriasIds.includes(3)) tipo = 'fanVersion';

  let categoria = 'clubes';
  if (categoriasIds.includes(10)) categoria = 'selecciones';

  let liga = '';
  if (categoriasIds.includes(4)) liga = 'laLiga';
  else if (categoriasIds.includes(5)) liga = 'premier';
  else if (categoriasIds.includes(6)) liga = 'serieA';
  else if (categoriasIds.includes(7)) liga = 'bundesliga';
  else if (categoriasIds.includes(8)) liga = 'ligue1';

  const retro = tipo === 'vintage';


  const esChampions = categoriasIds.includes(11);

  // Extraer club del nombre
  const extraerClub = (nombre: string): string => {
    const nombreLower = nombre.toLowerCase();

    // Clubes de La Liga
    if (nombreLower.includes('real madrid')) return 'Real Madrid';
    if (nombreLower.includes('barcelona')) return 'Barcelona';
    if (nombreLower.includes('atlético') || nombreLower.includes('atletico')) return 'Atlético Madrid';
    if (nombreLower.includes('sevilla')) return 'Sevilla';
    if (nombreLower.includes('athletic')) return 'Athletic Club';

    // Premier League
    if (nombreLower.includes('manchester city')) return 'Manchester City';
    if (nombreLower.includes('manchester united')) return 'Manchester United';
    if (nombreLower.includes('liverpool')) return 'Liverpool';
    if (nombreLower.includes('arsenal')) return 'Arsenal';
    if (nombreLower.includes('chelsea')) return 'Chelsea';

    // Serie A
    if (nombreLower.includes('inter milan')) return 'Inter Milan';
    if (nombreLower.includes('ac milan')) return 'AC Milan';
    if (nombreLower.includes('juventus')) return 'Juventus';
    if (nombreLower.includes('napoli')) return 'Napoli';
    if (nombreLower.includes('roma')) return 'Roma';

    // Bundesliga
    if (nombreLower.includes('bayern')) return 'Bayern Munich';
    if (nombreLower.includes('borussia dortmund')) return 'Borussia Dortmund';
    if (nombreLower.includes('leverkusen')) return 'Bayer Leverkusen';
    if (nombreLower.includes('rb leipzig')) return 'RB Leipzig';
    if (nombreLower.includes('frankfurt')) return 'Eintracht Frankfurt';

    // Ligue 1
    if (nombreLower.includes('psg')) return 'Paris Saint-Germain';
    if (nombreLower.includes('lyon')) return 'Lyon';
    if (nombreLower.includes('monaco')) return 'Monaco';
    if (nombreLower.includes('marseille')) return 'Marseille';
    if (nombreLower.includes('lille')) return 'Lille';

    // Selecciones
    if (nombreLower.includes('argentina')) return 'Argentina';
    if (nombreLower.includes('francia')) return 'Francia';
    if (nombreLower.includes('brasil')) return 'Brasil';
    if (nombreLower.includes('españa') || nombreLower.includes('espana')) return 'España';
    if (nombreLower.includes('inglaterra')) return 'Inglaterra';
    if (nombreLower.includes('japan') || nombreLower.includes('japón')) return 'Japón';

    // Otros
    if (nombreLower.includes('ajax')) return 'Ajax';

    return 'Desconocido';
  };

  const club = extraerClub(datos.nombre || '');

  return {
    id: datos.id || datos.ID || 0,
    nombre: datos.nombre || datos.Nombre || '',
    descripcion: datos.descripcion || datos.Descripcion || `Camiseta oficial ${datos.nombre || ''}`,
    precio: datos.precio || datos.Precio || 0,
    club: datos.club || datos.Club || datos.equipo || club,
    tipo: datos.tipo || datos.Tipo || tipo,
    categoria: datos.categoria || datos.Categoria || categoria,
    liga: datos.liga || datos.Liga || liga,
    retro: Boolean(datos.retro || datos.Retro || retro),
    destacado: Boolean(datos.destacado || datos.Destacado || esChampions),
    imagenes: Array.isArray(datos.imagenes)
      ? datos.imagenes
      : (datos.imagen ? [datos.imagen] : (datos.imagen_url ? [datos.imagen_url] : [])),
    tallasDisponibles: datos.tallasDisponibles || datos.tallas || ['S', 'M', 'L', 'XL'],
    stock: datos.stock || datos.Stock || 0,
    fechaCreacion: datos.fechaCreacion ? new Date(datos.fechaCreacion) : undefined,
    fechaActualizacion: datos.fechaActualizacion ? new Date(datos.fechaActualizacion) : undefined,
    categoriasIds: categoriasIds,
    // Propiedades admin (no vienen del backend)
    eliminado: false,
    esModificado: false
  };
}

/**
 * Función para crear un producto para admin
 */
export function crearProductoAdminVacio(): Producto {
  return {
    id: 0,
    nombre: '',
    precio: 0,
    club: '',
    tipo: 'nuevas',
    categoria: 'clubes',
    retro: false,
    imagenes: ['default.jpg'],
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    stock: 0,
    esModificado: true,
    fechaCreacion: new Date()
  };
}

/**
 * Verificar si un producto está eliminado
 */
export function estaEliminado(producto: Producto): boolean {
  return !!producto.eliminado;
}

/**
 * Verificar si un producto está modificado
 */
export function estaModificado(producto: Producto): boolean {
  return !!producto.esModificado;
}

/**
 * Marcar producto como eliminado
 */
export function marcarComoEliminado(producto: Producto): Producto {
  return {
    ...producto,
    eliminado: true,
    stock: 0,
    esModificado: true
  };
}

/**
 * Restaurar producto eliminado
 */
export function restaurarProducto(producto: Producto): Producto {
  const { eliminado, ...resto } = producto;
  return {
    ...resto,
    esModificado: true
  };
}
