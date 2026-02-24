// src/services/external_api/music.ts
import { getBackendEndpoint } from '../../config/api';
import { SPOTIFY_API_BASE_URL } from './constants';

// --- IN-MEMORY CACHE ---
let cachedToken: string | null = null;
let tokenExpiration: number = 0;

/**
 * Get Token with cache. If we already have a valid one, don't call the server.
 */
export const getAppAccessToken = async (): Promise<string | null> => {
    const now = Date.now();
    
    // If token exists and has more than 5 minutes of life left, use it
    if (cachedToken && now < tokenExpiration - (5 * 60 * 1000)) {
        return cachedToken;
    }

    try {
        console.log("Renewing Spotify token...");
        const response = await fetch(getBackendEndpoint('/spotify/token'), { method: 'GET' });

        if (!response.ok) return null;

        const tokenData = await response.json();

        if (tokenData.access_token) {
            cachedToken = tokenData.access_token;
            // Spotify tokens last 1 hour (3600s). Save expiration.
            tokenExpiration = now + (tokenData.expires_in * 1000); 
            return cachedToken;
        }
        return null;
    } catch (error) {
        console.error('Error getting Spotify token:', error);
        return null;
    }
};

export const makeSpotifyRequest = async (endpoint: string, accessToken: string): Promise<any> => {
    try {
        const response = await fetch(`${SPOTIFY_API_BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error(`Spotify API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error in Spotify request ${endpoint}:`, error);
        throw error; 
    }
};

export const getAlbumDetailsAndTracks = async (albumId: string, accessToken: string): Promise<any> => {
    const response = await fetch(`${SPOTIFY_API_BASE_URL}/albums/${albumId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    return await response.json();
};

/**
 * Get genres of an artist from Spotify
 */
export const getArtistGenres = async (artistId: string, accessToken: string): Promise<string[]> => {
    try {
        const artistData = await makeSpotifyRequest(`/artists/${artistId}`, accessToken);
        return artistData?.genres || [];
    } catch (error) {
        console.error(`Error getting genres for artist ${artistId}:`, error);
        return [];
    }
};

/**
 * Get genres and descriptive tags from the album and all songs
 * Returns an object with genres, tags, and other categories separated
 */
export const getAlbumGenres = async (albumData: any, tracks: any[], accessToken: string): Promise<{
    genres: string[];
    tags: string[];
    platforms: string[];
    other: string[];
}> => {
    try {
        const genres: string[] = [];
        const tags: string[] = [];
        const platforms: string[] = [];
        const other: string[] = [];

        // 1. Album genres
        if (albumData?.genres && albumData.genres.length > 0) {
            genres.push(...albumData.genres);
        }

        // 2. Get genres from ALL artists of ALL songs (always, not only if album has no genres)
        if (tracks && tracks.length > 0) {
            // Get all unique artists from all songs
            const artistIds = new Set<string>();
            tracks.forEach((track: any) => {
                if (track.artists && Array.isArray(track.artists)) {
                    track.artists.forEach((artist: any) => {
                        if (artist.id) {
                            artistIds.add(artist.id);
                        }
                    });
                }
            });

            if (artistIds.size > 0) {
                // Get genres from all artists in parallel
                const genrePromises = Array.from(artistIds).map((artistId: string) => 
                    getArtistGenres(artistId, accessToken)
                );
                
                const allGenresArrays = await Promise.all(genrePromises);
                
                // Combine all genres and remove duplicates
                const allGenres = allGenresArrays.flat();
                genres.push(...allGenres);
            }
        }

        // 3. Descriptive tags from album
        if (albumData) {
            // Album type
            if (albumData.album_type) {
                const albumTypeMap: Record<string, string> = {
                    'album': 'Album',
                    'single': 'Single',
                    'compilation': 'Compilation'
                };
                const albumTypeTag = albumTypeMap[albumData.album_type] || albumData.album_type;
                if (albumTypeTag) tags.push(albumTypeTag);
            }

            // Popularity
            if (albumData.popularity && albumData.popularity > 70) {
                tags.push('Popular');
            }

            // Recent
            if (albumData.release_date) {
                const releaseYear = new Date(albumData.release_date).getFullYear();
                const currentYear = new Date().getFullYear();
                if (currentYear - releaseYear <= 2) {
                    tags.push('Recent');
                }
            }
        }

        // 4. Platforms (record label)
        if (albumData?.label) {
            platforms.push(albumData.label);
        }

        // 5. Other information (markets, copyright, etc.)
        if (albumData?.copyrights && albumData.copyrights.length > 0) {
            albumData.copyrights.forEach((copyright: any) => {
                if (copyright.text && !other.includes(copyright.text)) {
                    other.push(copyright.text);
                }
            });
        }

        // Format: capitalize first letter of each word
        const formatTag = (tag: string): string => {
            return tag
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        };

        // Remove duplicates and format
        const uniqueGenres = Array.from(new Set(genres))
            .map(tag => formatTag(tag))
            .filter(tag => tag.length > 0);
        
        const uniqueTags = Array.from(new Set(tags))
            .map(tag => formatTag(tag))
            .filter(tag => tag.length > 0);
        
        const uniquePlatforms = Array.from(new Set(platforms))
            .map(tag => formatTag(tag))
            .filter(tag => tag.length > 0);
        
        const uniqueOther = Array.from(new Set(other))
            .map(tag => formatTag(tag))
            .filter(tag => tag.length > 0);

        return {
            genres: uniqueGenres,
            tags: uniqueTags,
            platforms: uniquePlatforms,
            other: uniqueOther
        };
    } catch (error) {
        console.error('Error getting album genres:', error);
        return { genres: [], tags: [], platforms: [], other: [] };
    }
};

/**
 * Get songs from a Spotify album and complete album data
 */
export const getAlbumTracks = async (albumId: string): Promise<{ 
    tracks: any[]; 
    album: any; 
    genres: string[];
    tags: string[];
    platforms: string[];
    other: string[];
}> => {
    try {
        const token = await getAppAccessToken();
        if (!token) return { 
            tracks: [], 
            album: null, 
            genres: [], 
            tags: [], 
            platforms: [], 
            other: [] 
        };

        const albumData = await getAlbumDetailsAndTracks(albumId, token);
        const tracks = albumData?.tracks?.items || [];
        
        // Get genres, tags, platforms and other information
        const categorized = await getAlbumGenres(albumData, tracks, token);
        
        return {
            tracks: tracks,
            album: albumData || null,
            genres: categorized.genres,
            tags: categorized.tags,
            platforms: categorized.platforms,
            other: categorized.other
        };
    } catch (error) {
        console.error('Error getting album tracks:', error);
        return { 
            tracks: [], 
            album: null, 
            genres: [], 
            tags: [], 
            platforms: [], 
            other: [] 
        };
    }
};

/**
 * Optimized search using cached token
 * Gets complete album details to include genres
 */
export const searchSpotifyAlbums = async (query: string): Promise<any[]> => {
    try {
        const token = await getAppAccessToken();
        if (!token) return [];

        // Search albums
        const endpoint = `/search?q=${encodeURIComponent(query)}&type=album&limit=6`;
        const data = await makeSpotifyRequest(endpoint, token);
        const albums = data?.albums?.items || [];

        // If search albums don't have genres, get complete details
        // Only for the first 3 to not overload the API
        const albumsWithGenres = await Promise.all(
            albums.slice(0, 3).map(async (album: any) => {
                // If it already has genres, return it as is
                if (album.genres && album.genres.length > 0) {
                    return album;
                }
                
                // If it doesn't have genres, get complete details
                try {
                    const fullAlbum = await getAlbumDetailsAndTracks(album.id, token);
                    return {
                        ...album,
                        genres: fullAlbum.genres || []
                    };
                } catch (err) {
                    // If it fails, return the original album
                    return album;
                }
            })
        );

        // Combine albums with genres and the rest unmodified
        return [...albumsWithGenres, ...albums.slice(3)];
    } catch (error) {
        console.error('Error searching albums:', error);
        return [];
    }
};