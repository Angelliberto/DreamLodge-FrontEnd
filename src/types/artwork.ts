// src/types/unified.ts

export type ArtSource = 'CMA' | 'MET';

// 1. Tipo Básico para la lista (Grid)
export interface UnifiedArtwork {
  id: string | number; // String o Number porque cada API usa uno distinto
  title: string;
  artist: string;
  imageUrl: string;
  source: ArtSource; // 🔑 Clave para saber a quién pedir los detalles después
}

// 2. Tipo Detallado
export interface UnifiedArtworkDetail extends UnifiedArtwork {
  date: string;
  description: string;
  medium: string;       // Material/Técnica
  dimensions: string;
  culture: string;      // Ej: French, Japanese
  department: string;
  moreInfoUrl: string;  // Link original
}