// src/services/external_api/GameServices.ts

// Ajusta esto a tu IP local si pruebas en móvil real, o localhost si es web/simulador
const API_URL = "http://localhost:3000/api/igdb/search"; 

export const searchGames = async (searchTerm: string) => {
  try {
    console.log(`🔎 Buscando "${searchTerm}" en nuestro backend...`);
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ search: searchTerm })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error del Backend:", response.status, errorText);
        throw new Error("Error al conectar con el servidor");
    }

    const data = await response.json();
    console.log(`✅ Recibidos ${data.length} juegos`);
    return data;

  } catch (error) {
    console.error("❌ Error en searchGames:", error);
    return [];
  }
};