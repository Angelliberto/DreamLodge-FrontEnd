// app/src/utils/adapters.ts
import { CulturalItem } from '../types/CulturalItem';
import { StandardResource } from '../types/StandarResource'; // Your Books type
import { UnifiedArtwork } from '../types/artwork'; // Your Art type

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Helper to format tags: capitalize first letter of each word
const formatTag = (tag: string): string => {
  return tag
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper to format array of tags
const formatTags = (tags: string[]): string[] => {
  if (!tags || tags.length === 0) return [];
  return tags.map(formatTag).filter(tag => tag.length > 0);
};

// Helper to get decade from a year
const getDecadeTag = (year?: string): string | null => {
  if (!year) return null;
  const yearNum = parseInt(year);
  if (isNaN(yearNum)) return null;
  const decade = Math.floor(yearNum / 10) * 10;
  return `${decade}s`;
};

// Helper to get era tag based on year
const getEraTag = (year?: string): string | null => {
  if (!year) return null;
  const yearNum = parseInt(year);
  if (isNaN(yearNum)) return null;
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearNum;
  
  if (age <= 2) return 'Reciente';
  if (age <= 10) return 'Moderno';
  if (age <= 30) return 'Clásico';
  if (age <= 50) return 'Vintage';
  return 'Antiguo';
};

// VIDEO GAMES (IGDB)
export const adaptIGDB = (game: any): CulturalItem => {
  const year = game.first_release_date 
    ? new Date(game.first_release_date * 1000).getFullYear().toString() 
    : undefined;
  
  const genres: string[] = [];
  const tags: string[] = [];
  const platforms: string[] = [];
  const other: string[] = [];
  
  // Genres
  if (game.genres && Array.isArray(game.genres)) {
    genres.push(...game.genres.map((g: any) => g.name));
  }
  
  // Platforms
  if (game.platforms && Array.isArray(game.platforms)) {
    platforms.push(...game.platforms.map((p: any) => p.name || p.abbreviation).filter(Boolean));
  }
  
  // Rating tags - only the highest to avoid redundancy
  if (game.rating) {
    const rating = Math.round(game.rating / 10);
    if (rating >= 9) {
      tags.push('Excelente');
    } else if (rating >= 8) {
      tags.push('Alta Calificación');
    }
  }
  
  // Year/Era
  if (year) {
    const decade = getDecadeTag(year);
    if (decade) tags.push(decade);
    const era = getEraTag(year);
    if (era) tags.push(era);
  }
  
  // Game modes
  if (game.game_modes && Array.isArray(game.game_modes)) {
    const modes = game.game_modes.map((m: any) => m.name).filter(Boolean);
    tags.push(...modes);
  }
  
  // Developer/Publisher
  if (game.involved_companies && Array.isArray(game.involved_companies)) {
    const companies = game.involved_companies
      .map((c: any) => c.company?.name)
      .filter(Boolean);
    other.push(...companies);
  }
  
  // Combine everything in genres for FeedScreen (compatibility)
  const allForFeed = [...genres, ...tags, ...platforms];
  
  return {
    id: `game-${game.id}`,
    originalId: game.id,
    source: 'IGDB',
    category: 'videojuegos',
    title: game.name,
    imageUrl: game.cover?.url 
      ? `https:${game.cover.url.replace('t_thumb', 't_720p')}` 
      : 'https://via.placeholder.com/400x600?text=No+Cover',
        creator: game.involved_companies?.[0]?.company?.name || 'Desarrollador Desconocido',
    year: year,
    rating: game.rating ? Math.round(game.rating / 10) : undefined,
    description: game.summary,
    metadata: {
      genres: formatTags(allForFeed), // For FeedScreen
      tags: formatTags(tags),
      platforms: formatTags(platforms),
      other: formatTags(other),
      label: 'IGDB'
    }
  };
};

// MOVIES (TMDB)
export const adaptTMDB = (movie: any, genreMap: Record<number, string>): CulturalItem => {
  const genres = movie.genre_ids?.map((id: number) => genreMap[id]).filter(Boolean) || [];
  const year = movie.release_date ? movie.release_date.split('-')[0] : undefined;
  
  const tags: string[] = [];
  const platforms: string[] = [];
  const other: string[] = [];
  
  // Rating tags - only the highest to avoid redundancy
  if (movie.vote_average) {
    const rating = parseFloat(movie.vote_average.toFixed(1));
    if (rating >= 9) {
      tags.push('Excelente');
    } else if (rating >= 8) {
      tags.push('Alta Calificación');
    } else if (rating >= 7.5) {
      tags.push('Bien Valorada');
    }
  }
  
  // Popularity
  if (movie.popularity && movie.popularity > 50) {
    tags.push('Popular');
  }
  
  // Year/Era
  if (year) {
    const decade = getDecadeTag(year);
    if (decade) tags.push(decade);
    const era = getEraTag(year);
    if (era) tags.push(era);
  }
  
  // Original language
  if (movie.original_language && movie.original_language !== 'en') {
    const languageMap: Record<string, string> = {
      'es': 'Español',
      'fr': 'Francés',
      'de': 'Alemán',
      'it': 'Italiano',
      'ja': 'Japonés',
      'ko': 'Coreano',
      'zh': 'Chino',
      'pt': 'Portugués',
      'ru': 'Ruso'
    };
    const lang = languageMap[movie.original_language] || movie.original_language.toUpperCase();
    other.push(lang);
  }
  
  // Adult
  if (movie.adult) {
    tags.push('Para Adultos');
  }
  
  // Combine everything in genres for FeedScreen (compatibility)
  const allForFeed = [...genres, ...tags, ...other];
  
  return {
    id: `movie-${movie.id}`,
    originalId: movie.id,
    source: 'TMDB',
    category: 'cine',
    title: movie.title,
    imageUrl: movie.poster_path 
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}` 
      : 'https://via.placeholder.com/400x600?text=No+Poster',
    creator: 'Películas', 
    year: year,
    rating: movie.vote_average ? parseFloat(movie.vote_average.toFixed(1)) : undefined,
    description: movie.overview,
    metadata: {
      genres: formatTags(allForFeed), // For FeedScreen
      tags: formatTags(tags),
      platforms: formatTags(platforms),
      other: formatTags(other),
      label: 'TMDB'
    }
  };
};

// MUSIC (Spotify)
export const adaptSpotifyAlbum = (album: any): CulturalItem => {
  const image = album.images?.[0]?.url || 'https://via.placeholder.com/400x400?text=No+Cover';
  
  const genres: string[] = [];
  const tags: string[] = [];
  const platforms: string[] = [];
  const other: string[] = [];
  
  // Album genres
  if (album.genres && album.genres.length > 0) {
    genres.push(...album.genres);
  }
  
  // Descriptive tags
  if (album.album_type) {
    const albumTypeMap: Record<string, string> = {
      'album': 'Álbum',
      'single': 'Sencillo',
      'compilation': 'Compilación'
    };
    const albumTypeTag = albumTypeMap[album.album_type] || album.album_type;
    if (albumTypeTag) tags.push(albumTypeTag);
  }
  
  if (album.popularity && album.popularity > 70) {
    tags.push('Popular');
  }
  
  // Don't add 'Reciente' here if it will be added by getEraTag (avoid redundancy)
  
  // Platforms (record labels)
  if (album.label) {
    platforms.push(album.label);
  }
  
  // Combine everything in genres for FeedScreen (compatibility)
  const allForFeed = [...genres, ...tags, ...platforms];
  
  return {
    id: `music-${album.id}`,
    originalId: album.id,
    source: 'Spotify',
    category: 'musica',
    title: album.name,
    imageUrl: image,
    creator: album.artists ? album.artists.map((a: any) => a.name).join(', ') : 'Varios Artistas',
    year: album.release_date ? album.release_date.split('-')[0] : undefined,
        description: `Álbum con ${album.total_tracks} canciones.`,
    rating: undefined,
    metadata: {
      genres: formatTags(allForFeed), // For FeedScreen
      tags: formatTags(tags),
      platforms: formatTags(platforms),
      other: formatTags(other),
      duration: `${album.total_tracks} canciones`,
      label: 'Spotify',
      contextLink: album.external_urls?.spotify
    }
  };
};

// BOOKS (From your StandardResource)
// Note: Can receive complete Google Books data as optional second parameter
export const adaptBookFromStandard = (book: StandardResource, fullBookData?: any): CulturalItem => {
    const genres: string[] = [];
    const tags: string[] = [];
    const platforms: string[] = [];
    const other: string[] = [];
    
    // If we have complete book data, extract more information
    if (fullBookData?.volumeInfo) {
        const volInfo = fullBookData.volumeInfo;
        
        // Categories/Genres
        if (volInfo.categories && Array.isArray(volInfo.categories)) {
            genres.push(...volInfo.categories);
        }
        
        // Language
        if (volInfo.language && volInfo.language !== 'en') {
            const languageMap: Record<string, string> = {
                'es': 'Español',
                'fr': 'Francés',
                'de': 'Alemán',
                'it': 'Italiano',
                'ja': 'Japonés',
                'ko': 'Coreano',
                'zh': 'Chino',
                'pt': 'Portugués',
                'ru': 'Ruso'
            };
            const lang = languageMap[volInfo.language] || volInfo.language.toUpperCase();
            other.push(lang);
        }
        
        // Year/Era
        if (volInfo.publishedDate) {
            const year = volInfo.publishedDate.split('-')[0];
            const decade = getDecadeTag(year);
            if (decade) tags.push(decade);
            const era = getEraTag(year);
            if (era) tags.push(era);
        }
        
        // Publisher (platform)
        if (volInfo.publisher) {
            platforms.push(volInfo.publisher);
        }
        
        // Content type
        if (volInfo.printType) {
            tags.push(formatTag(volInfo.printType));
        }
    }
    
    // Combine everything in genres for FeedScreen (compatibility)
    const allForFeed = [...genres, ...tags, ...platforms, ...other];
    
    return {
        id: `book-${book.id}`,
        originalId: book.id,
        source: 'GoogleBooks',
        category: 'literatura',
        title: book.title,
        imageUrl: book.imageUrl,
        creator: book.subtitle || 'Autor Desconocido',
        year: fullBookData?.volumeInfo?.publishedDate?.split('-')[0],
        description: fullBookData?.volumeInfo?.description || 'Toca para ver detalles',
        metadata: {
            genres: formatTags(allForFeed), // For FeedScreen
            tags: formatTags(tags),
            platforms: formatTags(platforms),
            other: formatTags(other),
            label: 'Google Books',
            contextLink: book.detailsUrl
        }
    };
};

// ART (From your UnifiedArtwork)
// Note: Can receive complete artwork data as optional second parameter
export const adaptArtFromUnified = (art: UnifiedArtwork, fullArtData?: any): CulturalItem => {
    const genres: string[] = [];
    const tags: string[] = [];
    const platforms: string[] = [];
    const other: string[] = [];
    
    // If we have complete artwork data, extract more information
    if (fullArtData) {
        // Culture (genre/style)
        if (fullArtData.culture) {
            const culture = Array.isArray(fullArtData.culture) 
                ? fullArtData.culture[0] 
                : fullArtData.culture;
            if (culture) genres.push(culture);
        }
        
        // Medium/Technique (tags)
        if (fullArtData.medium) {
            tags.push(fullArtData.medium);
        }
        if (fullArtData.technique) {
            tags.push(fullArtData.technique);
        }
        
        // Department (platform/museum)
        if (fullArtData.department) {
            platforms.push(fullArtData.department);
        }
        
        // Period/Era based on date
        if (fullArtData.creation_date || fullArtData.objectDate) {
            const dateStr = fullArtData.creation_date || fullArtData.objectDate;
            // Try to extract year
            const yearMatch = dateStr?.match(/\d{4}/);
            if (yearMatch) {
                const year = yearMatch[0];
                const decade = getDecadeTag(year);
                if (decade) tags.push(decade);
                const era = getEraTag(year);
                if (era) tags.push(era);
            }
        }
        
        // Artistic period (if available)
        if (fullArtData.period) {
            tags.push(fullArtData.period);
        }
    }
    
    // Source (platform)
    platforms.push(art.source);
    
    // Combine everything in genres for FeedScreen (compatibility)
    const allForFeed = [...genres, ...tags, ...platforms, ...other];
    
    return {
        id: `art-${art.source}-${art.id}`,
        originalId: art.id,
        source: art.source === 'MET' ? 'MetMuseum' : 'ChicagoArt',
        category: 'arte-visual',
        title: art.title,
        imageUrl: art.imageUrl,
        creator: art.artist,
        year: fullArtData?.creation_date || fullArtData?.objectDate, 
        description: fullArtData?.description || 'Obra maestra clásica',
        metadata: {
            genres: formatTags(allForFeed), // For FeedScreen
            tags: formatTags(tags),
            platforms: formatTags(platforms),
            other: formatTags(other),
            label: art.source
        }
    };
};