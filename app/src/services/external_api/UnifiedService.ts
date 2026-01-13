// src/services/external_api/UnifiedService.ts
import { CulturalItem } from '../../types/ObraItem';
import { searchGames } from './GameServices';
import { fetchUnifiedArtFeed } from './aicart';
import { searchBooks } from './books';
import { getMovieGenres, getPopularMovies, searchMovies } from './movies';
import { searchSpotifyAlbums } from './music';

// Importamos adaptadores
import {
  adaptArtFromUnified,
  adaptBookFromStandard,
  adaptIGDB,
  adaptSpotifyAlbum,
  adaptTMDB
} from '../../utils/adapters';

export const globalSearch = async (query: string): Promise<CulturalItem[]> => {
  const results: CulturalItem[] = [];
  
  try {
    // ⚡️ OPTIMIZACIÓN: Iniciamos la petición de géneros PERO NO ESPERAMOS (no await)
    // Esto permite que el resto de las peticiones salgan inmediatamente.
    const genrePromise = getMovieGenres();

    // Array de promesas que se ejecutarán simultáneamente
    const promises = [];

    // 1. CINE (TMDB)
    // La lógica de esperar géneros ocurre solo dentro del hilo de cine
    const moviePromise = (query ? searchMovies(query) : getPopularMovies())
        .then(async (data) => {
            try {
                // Esperamos los géneros aquí, en paralelo a que carguen los juegos/libros
                const genreData = await genrePromise;
                const genreMap: Record<number, string> = {};
                if(genreData.genres) {
                    genreData.genres.forEach(g => { genreMap[g.id] = g.name; });
                }
                return data.map(m => adaptTMDB(m, genreMap));
            } catch (e) { return []; }
        })
        .catch(e => { console.error("Error Cine", e); return []; });
    
    promises.push(moviePromise);

    // 2. VIDEOJUEGOS (IGDB) - Mínimo 2 letras para buscar
    if (query.length > 1) {
      promises.push(
        searchGames(query)
          .then(data => data.map(adaptIGDB))
          .catch(e => { console.error("Error Juegos", e); return []; })
      );
    }

    // 3. MÚSICA (Spotify)
    if (query.length > 1) {
      promises.push(
        searchSpotifyAlbums(query)
          .then(data => data.map(adaptSpotifyAlbum))
          .catch(e => { console.error("Error Música", e); return []; })
      );
    }

    // 4. LIBROS (Google Books)
    if (query.length > 1) {
      promises.push(
        searchBooks(query)
          .then(data => data.map(adaptBookFromStandard)) // Asegúrate que tu searchBooks devuelva StandardResource
          .catch(e => { console.error("Error Libros", e); return []; })
      );
    }

    // 5. ARTE (Relleno)
    // Si no hay búsqueda, el arte es el protagonista. Si hay búsqueda, pedimos menos.
    // Solo pedimos arte si NO es una búsqueda muy específica de juegos/cine, o para rellenar.
    // Para optimizar velocidad, puedes comentar esta línea si la búsqueda tiene texto.
    promises.push(
      fetchUnifiedArtFeed()
        .then(data => data.map(adaptArtFromUnified))
        .catch(e => { console.error("Error Arte", e); return []; })
    );

    // EJECUCIÓN PARALELA TOTAL
    // Esperamos a que todos terminen (o fallen y devuelvan [])
    const allResults = await Promise.all(promises);
    
    // Aplanamos resultados
    allResults.forEach(group => {
        if(Array.isArray(group)) results.push(...group);
    });

    // Mezcla Aleatoria (Fisher-Yates Shuffle) para que el feed se vea variado
    for (let i = results.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [results[i], results[j]] = [results[j], results[i]];
    }

    return results;

  } catch (error) {
    console.error("Error crítico en Global Search:", error);
    return [];
  }
};