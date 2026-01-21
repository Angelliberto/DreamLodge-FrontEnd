// app/src/types/CulturalItem.ts

export type CulturalCategory = 'cine' | 'música' | 'literatura' | 'arte-visual' | 'videojuegos';

export interface CulturalItem {
  // Identificadores
  id: string;                // ID único global (ej: "movie-550")
  originalId: string | number; // ID en la API original
  source: 'IGDB' | 'TMDB' | 'GoogleBooks' | 'MetMuseum' | 'ChicagoArt' | 'Spotify';
  
  // Datos Principales
  title: string;
  category: CulturalCategory;
  imageUrl: string;          // URL de alta calidad
  
  // Detalles Creativos
  creator: string;           // Director, Autor, Desarrollador o Artista
  year?: string;             // Año de lanzamiento (string para flexibilidad)
  
  // Datos Adicionales
  description?: string;
  rating?: number;           // Normalizado a escala 0-10
  
  // Metadatos Específicos (Lo que hace único a cada tipo)
  metadata: {
    genres?: string[];       // Géneros (Acción, Impresionismo, Jazz)
    duration?: string;       // "120 min", "350 págs", "12 tracks"
    label?: string;          // "Nintendo", "Sony Music", "Oleo sobre lienzo"
    contextLink?: string;    // Link a la web original o app
  };
}