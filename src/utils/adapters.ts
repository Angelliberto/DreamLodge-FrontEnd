// app/src/utils/adapters.ts
import { CulturalItem } from '../types/ObraItem';
import { StandardResource } from '../types/StandarResource'; // Tu tipo de Libros
import { UnifiedArtwork } from '../types/artwork'; // Tu tipo de Arte

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// 🎮 VIDEOJUEGOS (IGDB)
export const adaptIGDB = (game: any): CulturalItem => ({
  id: `game-${game.id}`,
  originalId: game.id,
  source: 'IGDB',
  category: 'videojuegos',
  title: game.name,
  imageUrl: game.cover?.url 
    ? `https:${game.cover.url.replace('t_thumb', 't_720p')}` 
    : 'https://via.placeholder.com/400x600?text=No+Cover',
  creator: game.involved_companies?.[0]?.company?.name || 'Desarrollador desconocido',
  year: game.first_release_date 
    ? new Date(game.first_release_date * 1000).getFullYear().toString() 
    : undefined,
  rating: game.rating ? Math.round(game.rating / 10) : undefined,
  description: game.summary,
  metadata: {
    genres: game.genres?.map((g: any) => g.name) || [],
    label: 'IGDB'
  }
});

// 🎬 CINE (TMDB)
export const adaptTMDB = (movie: any, genreMap: Record<number, string>): CulturalItem => {
  const genres = movie.genre_ids?.map((id: number) => genreMap[id]).filter(Boolean) || [];
  return {
    id: `movie-${movie.id}`,
    originalId: movie.id,
    source: 'TMDB',
    category: 'cine',
    title: movie.title,
    imageUrl: movie.poster_path 
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}` 
      : 'https://via.placeholder.com/400x600?text=No+Poster',
    creator: 'Cine', 
    year: movie.release_date ? movie.release_date.split('-')[0] : undefined,
    rating: movie.vote_average ? parseFloat(movie.vote_average.toFixed(1)) : undefined,
    description: movie.overview,
    metadata: {
      genres: genres,
      label: 'TMDB'
    }
  };
};

// 🎵 MÚSICA (Spotify)
export const adaptSpotifyAlbum = (album: any): CulturalItem => {
  const image = album.images?.[0]?.url || 'https://via.placeholder.com/400x400?text=No+Cover';
  return {
    id: `music-${album.id}`,
    originalId: album.id,
    source: 'Spotify',
    category: 'música',
    title: album.name,
    imageUrl: image,
    creator: album.artists ? album.artists.map((a: any) => a.name).join(', ') : 'Varios Artistas',
    year: album.release_date ? album.release_date.split('-')[0] : undefined,
    description: `Álbum con ${album.total_tracks} canciones.`,
    rating: undefined,
    metadata: {
      duration: `${album.total_tracks} tracks`,
      label: 'Spotify',
      contextLink: album.external_urls?.spotify
    }
  };
};

// 📚 LIBROS (Desde tu StandardResource)
export const adaptBookFromStandard = (book: StandardResource): CulturalItem => ({
    id: `book-${book.id}`,
    originalId: book.id,
    source: 'GoogleBooks',
    category: 'literatura',
    title: book.title,
    imageUrl: book.imageUrl,
    creator: book.subtitle || 'Autor desconocido',
    year: undefined, // StandardResource no tiene año explícito en tu tipo actual
    description: 'Toca para ver detalles',
    metadata: {
        label: 'Google Books',
        contextLink: book.detailsUrl
    }
});

// 🎨 ARTE (Desde tu UnifiedArtwork)
export const adaptArtFromUnified = (art: UnifiedArtwork): CulturalItem => ({
    id: `art-${art.source}-${art.id}`,
    originalId: art.id,
    source: art.source === 'MET' ? 'MetMuseum' : 'ChicagoArt',
    category: 'arte-visual',
    title: art.title,
    imageUrl: art.imageUrl,
    creator: art.artist,
    year: undefined, 
    description: 'Obra maestra clásica',
    metadata: {
        label: art.source
    }
});