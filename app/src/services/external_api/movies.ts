import { TMDB_API_KEY } from '../../config/api';

const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = TMDB_API_KEY; 

const API_HEADERS = {
  accept: 'application/json',
  Authorization: `Bearer ${API_KEY}`,
};

export type MovieResult = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
};

export type GenreListResponse = {
  genres: { id: number; name: string }[];
};

// 1. Obtener Géneros (Para traducir IDs a Nombres)
export const getMovieGenres = async (): Promise<GenreListResponse> => {
  const url = `${API_BASE_URL}/genre/movie/list?language=es-ES`;
  const response = await fetch(url, { headers: API_HEADERS });
  return await response.json();
};

// 2. Buscar Películas por Texto
export const searchMovies = async (query: string): Promise<MovieResult[]> => {
  const url = `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=es-ES&page=1`;
  try {
    const response = await fetch(url, { headers: API_HEADERS });
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Error searching movies:", error);
    return [];
  }
};

// 3. Obtener Populares (Para cuando no hay búsqueda)
export const getPopularMovies = async (): Promise<MovieResult[]> => {
  const url = `${API_BASE_URL}/discover/movie?include_adult=false&language=es-ES&sort_by=popularity.desc`;
  const response = await fetch(url, { headers: API_HEADERS });
  const data = await response.json();
  return data.results || [];
};