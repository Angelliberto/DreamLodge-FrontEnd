// app/src/services/external_api/googleBooks.ts

// Asegúrate de que esta ruta sea correcta para tu StandardResource
import type { StandardResource } from '../../types/StandarResource'; 

const API_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

// --- Tipos de Respuesta y Tipos de Display ---

export interface BookDetailsDisplay {
    title: string;
    authors: string;
    publisher: string;
    publishedDate: string;
    description: string;
    imageUrl: string;
    pageCount: number;
    categories: string; // Géneros/Categorías
    infoLink: string;
}

export type GoogleBookVolumeInfo = {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    categories?: string[];
    publisher?: string;
    pageCount?: number;
    imageLinks?: {
        thumbnail: string;
        smallThumbnail: string;
    };
    infoLink?: string; 
};

export type GoogleBookItem = {
    id: string; 
    volumeInfo: GoogleBookVolumeInfo;
};

export type GoogleBooksApiResponse = {
    kind: "books#volumes";
    totalItems: number;
    items?: GoogleBookItem[]; 
};

// --- Funciones de Lógica ---

/**
 * Función de transformación: Convierte GoogleBookItem a StandardResource para la lista.
 */
const transformBookToStandardResource = (book: GoogleBookItem): StandardResource => {
    const { id, volumeInfo } = book;
    
    // Usamos el thumbnail y aseguramos HTTPS
    const imageUrl = volumeInfo.imageLinks?.thumbnail 
        ? volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')
        : 'https://via.placeholder.com/150'; 

    const authors = volumeInfo.authors?.join(', ') || 'Autor Desconocido';
        
    return {
        id: id,
        title: volumeInfo.title || 'Título Desconocido',
        subtitle: authors, 
        type: 'Book',
        imageUrl: imageUrl,
        detailsUrl: volumeInfo.infoLink || `https://books.google.com/books?id=${id}`,
    };
};

/**
 * Busca libros en la API de Google Books.
 */
export const searchBooks = async (query: string): Promise<StandardResource[]> => {
    if (!query.trim()) return [];

    const url = `${API_BASE_URL}?q=${encodeURIComponent(query.trim())}&maxResults=20`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP de Google Books: ${response.status} - ${response.statusText}`);
        }
        
        const data: GoogleBooksApiResponse = await response.json();

        if (!data.items) {
            return []; 
        }

        // Mapeamos los resultados al tipo estandarizado
        return data.items
            .filter(item => item.volumeInfo.title) 
            .map(transformBookToStandardResource);
        
    } catch (error) {
        console.error('Error al buscar libros en Google Books:', error);
        throw error;
    }
};

/**
 * Obtiene los detalles completos de un libro usando su ID de volumen.
 */
export const getBookDetails = async (bookId: string): Promise<GoogleBookItem> => {
    const url = `${API_BASE_URL}/${bookId}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        return data as GoogleBookItem; // Casteamos a GoogleBookItem
    } catch (error) {
        console.error(`Error al obtener detalles del libro ${bookId}:`, error);
        throw error;
    }
};