/**
 * URL pública para abrir la obra en su fuente (TMDB, Spotify, etc.).
 * Prioriza metadata.contextLink; si falta, deriva desde source + originalId.
 * Videojuegos (IGDB): ficha en igdb.com (mismo criterio que artworkLinks.js).
 */
export type ArtworkLike = {
  id?: string;
  title?: string;
  originalId?: string | number | null;
  source?: string;
  metadata?: {
    contextLink?: string;
    mediaType?: string;
  };
};

export function buildArtworkConsumptionUrl(artwork: ArtworkLike | null | undefined): string {
  if (!artwork || typeof artwork !== 'object') return '';

  const source = String(artwork.source || '');
  const oid = artwork.originalId;
  const strId = oid != null && oid !== '' ? String(oid) : '';

  if (source === 'IGDB' && strId) {
    return `https://www.igdb.com/games/${encodeURIComponent(strId)}`;
  }

  const raw =
    artwork.metadata && typeof artwork.metadata.contextLink === 'string'
      ? artwork.metadata.contextLink.trim()
      : '';
  if (raw && /^https?:\/\//i.test(raw)) return raw;

  if (source === 'TMDB' && strId) {
    const mediaType = artwork.metadata && artwork.metadata.mediaType;
    if (mediaType === 'series') {
      return `https://www.themoviedb.org/tv/${encodeURIComponent(strId)}`;
    }
    return `https://www.themoviedb.org/movie/${encodeURIComponent(strId)}`;
  }

  if (source === 'Spotify' && strId) {
    return `https://open.spotify.com/album/${encodeURIComponent(strId)}`;
  }

  if (source === 'GoogleBooks') {
    const bid =
      strId ||
      String(artwork.id || '')
        .replace(/^book-/i, '')
        .trim();
    if (bid) {
      return `https://books.google.com/books?id=${encodeURIComponent(bid)}&hl=es`;
    }
  }

  if (source === 'MetMuseum' && strId) {
    return `https://www.metmuseum.org/art/collection/search/${encodeURIComponent(strId)}`;
  }

  if (source === 'ChicagoArt' && strId) {
    return `https://www.artic.edu/artworks/${encodeURIComponent(strId)}`;
  }

  return '';
}

const SOURCE_LABELS: Record<string, string> = {
  Spotify: 'Abrir en Spotify',
  TMDB: 'Abrir en TMDB',
  GoogleBooks: 'Abrir en Google Books',
  IGDB: 'Abrir en IGDB',
  MetMuseum: 'Abrir en The Met',
  ChicagoArt: 'Abrir en Art Institute of Chicago',
};

/** Hex para no depender de clases Tailwind dinámicas (purge). */
const SOURCE_BUTTON_BG: Record<string, string> = {
  Spotify: '#16a34a',
  TMDB: '#0369a1',
  GoogleBooks: '#d97706',
  IGDB: '#6d28d9',
  MetMuseum: '#7f1d1d',
  ChicagoArt: '#9f1239',
};

export function getExternalSourceActionLabel(source: string | undefined): string {
  const key = String(source || '').trim();
  return SOURCE_LABELS[key] || 'Abrir en la fuente';
}

export function getExternalSourceButtonBg(source: string | undefined): string {
  const key = String(source || '').trim();
  return SOURCE_BUTTON_BG[key] || '#475569';
}
