// app/src/types/StandardResource.ts

// Asegúrate de incluir 'Book' en los tipos de recurso
export type ResourceType = "Book" | "Movie" | "Album"; 

/**
 * Interfaz unificada para mostrar cualquier tipo de dato (Libro, Película, Álbum).
 */
export interface StandardResource {
  id: string;         
  title: string;      
  subtitle: string;   // Usado para Autor, Artista o Director/Año.
  type: ResourceType; 
  imageUrl: string;   
  detailsUrl: string; 
}