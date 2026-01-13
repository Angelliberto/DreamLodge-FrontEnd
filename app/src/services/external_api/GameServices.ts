// src/services/external_api/GameServices.ts

import { getBackendEndpoint } from '../../config/api';

export const searchGames = async (searchTerm: string) => {
  try {
    
    const response = await fetch(getBackendEndpoint('/igdb/search'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ search: searchTerm })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(" Error del Backend:", response.status, errorText);
        throw new Error("Error al conectar con el servidor");
    }

    const data = await response.json();
    console.log(`✅ Recibidos ${data.length} juegos`);
    return data;

  } catch (error) {
    console.error(" Error en searchGames:", error);
    return [];
  }
};