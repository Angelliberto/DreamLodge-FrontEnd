// src/services/external_api/UnifiedService.ts
import { CulturalItem } from '../../types/CulturalItem';
import { searchGames } from './GameServices';
import { fetchUnifiedArtFeed } from './aicart';
import { searchBooks } from './books';
import { getMovieGenres, getPopularMovies, searchMovies } from './movies';
import { searchSpotifyAlbums } from './music';
import { cache } from '../../utils/cache';

// Import adapters
import {
  adaptArtFromUnified,
  adaptBookFromStandard,
  adaptIGDB,
  adaptSpotifyAlbum,
  adaptTMDB
} from '../../utils/adapters';

export const globalSearch = async (query: string): Promise<CulturalItem[]> => {
  // Check cache first (only for empty searches or with query)
  const cacheKey = `globalSearch:${query || 'empty'}`;
  const cached = cache.get<CulturalItem[]>(cacheKey);
  if (cached) {
    return cached;
  }
  const results: CulturalItem[] = [];
  
  try {
    // OPTIMIZATION: Start the genres request but don't wait for it (no await)
    // This allows the rest of the requests to start immediately
    const genrePromise = getMovieGenres();

    // Array of promises that will execute simultaneously
    const promises = [];

    // 1. MOVIES (TMDB)
    // The logic to wait for genres happens only within the movie thread
    const moviePromise = (query ? searchMovies(query) : getPopularMovies())
        .then(async (data) => {
            try {
                // Wait for genres here, in parallel with games/books loading
                const genreData = await genrePromise;
                const genreMap: Record<number, string> = {};
                if(genreData.genres) {
                    genreData.genres.forEach(g => { genreMap[g.id] = g.name; });
                }
                return data.map(m => adaptTMDB(m, genreMap));
            } catch (e) { return []; }
        })
        .catch(e => { console.error("Error Movies", e); return []; });
    
    promises.push(moviePromise);

    // 2. VIDEO GAMES (IGDB) - Minimum 2 letters to search
    if (query.length > 1) {
      promises.push(
        searchGames(query)
          .then(data => data.map(adaptIGDB))
          .catch(e => { console.error("Error Games", e); return []; })
      );
    }

    // 3. MUSIC (Spotify)
    if (query.length > 1) {
      promises.push(
        searchSpotifyAlbums(query)
          .then(data => data.map(adaptSpotifyAlbum))
          .catch(e => { console.error("Error Music", e); return []; })
      );
    }

    // 4. BOOKS (Google Books)
    if (query.length > 1) {
      promises.push(
        searchBooks(query)
          .then(data => data.map(adaptBookFromStandard)) // Make sure your searchBooks returns StandardResource
          .catch(e => { console.error("Error Books", e); return []; })
      );
    }

    // 5. ART (Filler)
    // If there's no search, art is the main focus. If there's a search, we request less.
    // We only request art if it's NOT a very specific games/movies search, or to fill.
    // To optimize speed, you can comment this line if the search has text.
    promises.push(
      fetchUnifiedArtFeed()
        .then(data => data.map(adaptArtFromUnified))
        .catch(e => { console.error("Error Art", e); return []; })
    );

    // TOTAL PARALLEL EXECUTION
    // Wait for all to finish (or fail and return [])
    const allResults = await Promise.all(promises);
    
    // Flatten results
    allResults.forEach(group => {
        if(Array.isArray(group)) results.push(...group);
    });

    // Deterministic shuffle based on query to be consistent with cache
    // Use a simple hash of the query as seed for shuffle
    const seed = query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    let currentSeed = seed;
    for (let i = results.length - 1; i > 0; i--) {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        const j = Math.floor(seededRandom(currentSeed) * (i + 1));
        [results[i], results[j]] = [results[j], results[i]];
    }

    // Save to cache (5 minutes for empty searches, 2 minutes for searches with text)
    const cacheTime = query ? 2 * 60 * 1000 : 5 * 60 * 1000;
    cache.set(cacheKey, results, cacheTime);

    return results;

  } catch (error) {
    console.error("Critical error in Global Search:", error);
    return [];
  }
};