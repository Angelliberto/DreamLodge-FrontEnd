// src/services/external_api/aicart.ts
import { ArtSource, UnifiedArtwork, UnifiedArtworkDetail } from '../../types/artwork';

const CMA_URL = 'https://openaccess-api.clevelandart.org/api/artworks';
const MET_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';

// A. Cleveland (Es rápida, pedimos normal)
const fetchCmaList = async (limit: number): Promise<UnifiedArtwork[]> => {
    try {
        const res = await fetch(`${CMA_URL}?has_image=1&limit=${limit}&sort=random`);
        const json = await res.json();
        return (json.data || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            artist: item.creators?.[0]?.description || 'Unknown',
            imageUrl: item.images?.web?.url,
            source: 'CMA'
        })).filter((i: UnifiedArtwork) => i.imageUrl);
    } catch (e) { return []; }
};

// B. Met Museum (OPTIMIZADA)
const fetchMetList = async (limit: number): Promise<UnifiedArtwork[]> => {
    try {
        // Límite de seguridad: máximo 4 obras del Met para no saturar la red
        const safeLimit = limit > 4 ? 4 : limit;

        const searchRes = await fetch(`${MET_URL}/search?hasImages=true&isHighlight=true&q=*`);
        const searchJson = await searchRes.json();
        
        if (!searchJson.objectIDs) return [];
        
        // Seleccionamos IDs aleatorios
        const shuffled = searchJson.objectIDs.sort(() => 0.5 - Math.random());
        const selectedIds = shuffled.slice(0, safeLimit);

        // Lanzamos las peticiones de detalle en paralelo
        const promises = selectedIds.map(async (id: number) => {
            try {
                const r = await fetch(`${MET_URL}/objects/${id}`);
                const d = await r.json();
                if (!d.primaryImageSmall && !d.primaryImage) return null;
                
                return {
                    id: d.objectID,
                    title: d.title,
                    artist: d.artistDisplayName || 'Unknown',
                    imageUrl: d.primaryImageSmall || d.primaryImage,
                    source: 'MET'
                } as UnifiedArtwork;
            } catch { return null; }
        });

        const results = await Promise.all(promises);
        return results.filter((i): i is UnifiedArtwork => i !== null);
    } catch (e) { return []; }
};

// --- FUNCIÓN MAESTRA ---
export const fetchUnifiedArtFeed = async (): Promise<UnifiedArtwork[]> => {
    // Pedimos menos obras (5 de cada) para que la carga inicial sea rápida
    const [cmaData, metData] = await Promise.all([
        fetchCmaList(5),
        fetchMetList(5)
    ]);
    const combined = [...cmaData, ...metData];
    return combined.sort(() => 0.5 - Math.random());
};

// --- DETALLES (Se mantiene igual) ---
export const fetchUnifiedDetails = async (id: string | number, source: ArtSource): Promise<UnifiedArtworkDetail> => {
    if (source === 'CMA') {
        const res = await fetch(`${CMA_URL}/${id}`);
        const json = await res.json();
        const d = json.data;
        return {
            id: d.id, title: d.title, artist: d.creators?.[0]?.description || 'Unknown',
            imageUrl: d.images?.web?.url, source: 'CMA', date: d.creation_date,
            description: d.description || 'No description.', medium: d.technique,
            dimensions: d.measurements, culture: d.culture?.[0] || '',
            department: d.department, moreInfoUrl: d.url
        };
    } else {
        const res = await fetch(`${MET_URL}/objects/${id}`);
        const d = await res.json();
        return {
            id: d.objectID, title: d.title, artist: d.artistDisplayName || 'Unknown',
            imageUrl: d.primaryImage, source: 'MET', date: d.objectDate,
            description: d.creditLine || '', medium: d.medium,
            dimensions: d.dimensions, culture: d.culture || '',
            department: d.department, moreInfoUrl: d.objectURL
        };
    }
};