/**
 * Detalle de álbum Spotify (pistas, géneros): token vía backend `/spotify/token`.
 * La búsqueda global de álbumes vive en el servidor (`globalSearch`).
 */
import { getBackendEndpoint } from '../config/api';

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1/';

let cachedToken: string | null = null;
let tokenExpiration = 0;

export const getAppAccessToken = async (): Promise<string | null> => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiration - 5 * 60 * 1000) {
    return cachedToken;
  }
  try {
    const response = await fetch(getBackendEndpoint('/spotify/token'), { method: 'GET' });
    if (!response.ok) return null;
    const tokenData = await response.json();
    if (tokenData.access_token) {
      cachedToken = tokenData.access_token;
      tokenExpiration = now + tokenData.expires_in * 1000;
      return cachedToken;
    }
    return null;
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    return null;
  }
};

export const makeSpotifyRequest = async (
  endpoint: string,
  accessToken: string
): Promise<any> => {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Spotify API Error: ${response.status}`);
  return response.json();
};

export const getAlbumDetailsAndTracks = async (
  albumId: string,
  accessToken: string
): Promise<any> => {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}/albums/${albumId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.json();
};

export const getArtistGenres = async (
  artistId: string,
  accessToken: string
): Promise<string[]> => {
  try {
    const artistData = await makeSpotifyRequest(`/artists/${artistId}`, accessToken);
    return artistData?.genres || [];
  } catch (error) {
    console.error(`Error getting genres for artist ${artistId}:`, error);
    return [];
  }
};

function formatTag(tag: string): string {
  return tag
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export const getAlbumGenres = async (
  albumData: any,
  tracks: any[],
  accessToken: string
): Promise<{
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

    if (albumData?.genres?.length) {
      genres.push(...albumData.genres);
    }

    if (tracks?.length) {
      const artistIds = new Set<string>();
      tracks.forEach((track: any) => {
        track.artists?.forEach((artist: any) => {
          if (artist.id) artistIds.add(artist.id);
        });
      });
      if (artistIds.size > 0) {
        const allGenresArrays = await Promise.all(
          Array.from(artistIds).map((id) => getArtistGenres(id, accessToken))
        );
        genres.push(...allGenresArrays.flat());
      }
    }

    if (albumData) {
      if (albumData.album_type) {
        const albumTypeMap: Record<string, string> = {
          album: 'Album',
          single: 'Single',
          compilation: 'Compilation',
        };
        const albumTypeTag = albumTypeMap[albumData.album_type] || albumData.album_type;
        if (albumTypeTag) tags.push(albumTypeTag);
      }
      if (albumData.popularity && albumData.popularity > 70) {
        tags.push('Popular');
      }
      if (albumData.release_date) {
        const releaseYear = new Date(albumData.release_date).getFullYear();
        if (new Date().getFullYear() - releaseYear <= 2) {
          tags.push('Recent');
        }
      }
    }

    if (albumData?.label) platforms.push(albumData.label);

    albumData?.copyrights?.forEach((copyright: any) => {
      if (copyright.text && !other.includes(copyright.text)) {
        other.push(copyright.text);
      }
    });

    const uniq = (arr: string[]) =>
      Array.from(new Set(arr))
        .map((t) => formatTag(t))
        .filter((t) => t.length > 0);

    return {
      genres: uniq(genres),
      tags: uniq(tags),
      platforms: uniq(platforms),
      other: uniq(other),
    };
  } catch (error) {
    console.error('Error getting album genres:', error);
    return { genres: [], tags: [], platforms: [], other: [] };
  }
};

export const getAlbumTracks = async (
  albumId: string
): Promise<{
  tracks: any[];
  album: any;
  genres: string[];
  tags: string[];
  platforms: string[];
  other: string[];
}> => {
  try {
    const token = await getAppAccessToken();
    if (!token) {
      return {
        tracks: [],
        album: null,
        genres: [],
        tags: [],
        platforms: [],
        other: [],
      };
    }
    const albumData = await getAlbumDetailsAndTracks(albumId, token);
    const tracks = albumData?.tracks?.items || [];
    const categorized = await getAlbumGenres(albumData, tracks, token);
    return {
      tracks,
      album: albumData || null,
      genres: categorized.genres,
      tags: categorized.tags,
      platforms: categorized.platforms,
      other: categorized.other,
    };
  } catch (error) {
    console.error('Error getting album tracks:', error);
    return {
      tracks: [],
      album: null,
      genres: [],
      tags: [],
      platforms: [],
      other: [],
    };
  }
};
