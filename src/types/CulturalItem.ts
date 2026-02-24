// src/types/CulturalItem.ts

export type CulturalCategory = 'cine' | 'musica' | 'literatura' | 'arte-visual' | 'videojuegos';

export interface CulturalItem {
  // Identifiers
  id: string;                // Unique global ID (e.g., "movie-550")
  originalId: string | number; // ID in the original API
  source: 'IGDB' | 'TMDB' | 'GoogleBooks' | 'MetMuseum' | 'ChicagoArt' | 'Spotify';
  _id?: string | any;        // MongoDB ObjectId (present when coming from database)
  
  // Main Data
  title: string;
  category: CulturalCategory;
  imageUrl: string;          // High quality URL
  
  // Creative Details
  creator: string;           // Director, Author, Developer or Artist
  year?: string;             // Release year (string for flexibility)
  
  // Additional Data
  description?: string;
  rating?: number;           // Normalized to 0-10 scale
  
  // Specific Metadata (What makes each type unique)
  metadata: {
    genres?: string[];       // Genres (Action, Impressionism, Jazz)
    tags?: string[];         // Descriptive tags
    platforms?: string[];    // Platforms, labels, publishers, etc.
    other?: string[];        // Other additional information
    duration?: string;       // "120 min", "350 págs", "12 tracks"
    label?: string;          // "Nintendo", "Sony Music", "Oil on canvas"
    contextLink?: string;    // Link to original website or app
  };
}
