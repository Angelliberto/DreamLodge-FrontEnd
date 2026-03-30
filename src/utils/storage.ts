// Storage utility that works on web and mobile
// Uses SecureStore for mobile (with size limit handling) and localStorage for web
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Maximum size for SecureStore (2048 bytes) - values larger than this will show warnings
// but we'll still attempt to store them (some devices may allow slightly larger values)
const SECURE_STORE_MAX_SIZE = 2048;
// Chunk size with some margin to ensure we stay under the limit
const CHUNK_SIZE = 1800;

/**
 * Calculate approximate byte size of a string
 */
function getStringByteSize(str: string): number {
  // Use TextEncoder if available (web), otherwise estimate
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  // Fallback: estimate using character length (UTF-8 can be 1-4 bytes per char)
  // This is an approximation - most common chars are 1 byte
  return str.length * 1.5; // Conservative estimate
}

/**
 * Compress large data by removing unnecessary whitespace from JSON
 */
function compressJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed); // Removes extra whitespace
  } catch {
    // If not JSON, return as-is
    return value;
  }
}

/**
 * Split a string into chunks that fit within SecureStore size limits
 */
function splitIntoChunks(value: string): string[] {
  const chunks: string[] = [];
  
  // Use TextEncoder for accurate byte size if available
  if (typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    const totalBytes = bytes.length;
    
    // Split into chunks at byte boundaries
    for (let i = 0; i < totalBytes; i += CHUNK_SIZE) {
      const chunkBytes = bytes.slice(i, i + CHUNK_SIZE);
      const decoder = new TextDecoder();
      chunks.push(decoder.decode(chunkBytes));
    }
  } else {
    // Fallback: split by character boundaries (less accurate but safe)
    let currentChunk = '';
    let currentSize = 0;
    
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      const charSize = getStringByteSize(char);
      
      if (currentSize + charSize > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = char;
        currentSize = charSize;
      } else {
        currentChunk += char;
        currentSize += charSize;
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
  }
  
  return chunks;
}

/**
 * Store data in chunks for SecureStore
 */
async function storeChunked(key: string, value: string): Promise<void> {
  const chunks = splitIntoChunks(value);
  
  if (chunks.length === 1) {
    // Single chunk, store normally
    await SecureStore.setItemAsync(key, chunks[0]);
    // Remove any existing chunk metadata and old chunks
    try {
      await SecureStore.deleteItemAsync(`${key}_meta`);
    } catch {
      // Ignore if metadata doesn't exist
    }
    // Clean up any old chunks
    let oldChunkIndex = 0;
    while (true) {
      try {
        await SecureStore.deleteItemAsync(`${key}_chunk_${oldChunkIndex}`);
        oldChunkIndex++;
      } catch {
        break; // No more chunks to delete
      }
    }
  } else {
    // Multiple chunks - store each chunk and metadata
    // First, delete the single value if it exists
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore if it doesn't exist
    }
    
    // Store metadata first
    const metadata = JSON.stringify({ chunkCount: chunks.length });
    await SecureStore.setItemAsync(`${key}_meta`, metadata);
    
    // Store each chunk
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
    }
    
    // Clean up any old chunks that might exist
    // (in case we're overwriting with fewer chunks)
    let oldChunkIndex = chunks.length;
    while (true) {
      try {
        await SecureStore.deleteItemAsync(`${key}_chunk_${oldChunkIndex}`);
        oldChunkIndex++;
      } catch {
        break; // No more chunks to delete
      }
    }
  }
}

/**
 * Retrieve chunked data from SecureStore
 */
async function retrieveChunked(key: string): Promise<string | null> {
  // First, check if there's metadata (indicating chunked storage)
  try {
    const metadataStr = await SecureStore.getItemAsync(`${key}_meta`);
    if (metadataStr) {
      const metadata = JSON.parse(metadataStr);
      const chunkCount = metadata.chunkCount;
      
      // Retrieve all chunks
      const chunks: string[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (chunk === null) {
          // Missing chunk - return null
          return null;
        }
        chunks.push(chunk);
      }
      
      return chunks.join('');
    }
  } catch (error) {
    // No metadata or error reading - try reading as single value
  }
  
  // Try reading as single value (non-chunked)
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/**
 * Remove chunked data from SecureStore
 */
async function removeChunked(key: string): Promise<void> {
  // Try to get metadata to see if it's chunked
  try {
    const metadataStr = await SecureStore.getItemAsync(`${key}_meta`);
    if (metadataStr) {
      const metadata = JSON.parse(metadataStr);
      const chunkCount = metadata.chunkCount;
      
      // Delete all chunks
      for (let i = 0; i < chunkCount; i++) {
        try {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        } catch {
          // Ignore errors for individual chunks
        }
      }
      
      // Delete metadata
      try {
        await SecureStore.deleteItemAsync(`${key}_meta`);
      } catch {
        // Ignore
      }
    }
  } catch {
    // No metadata or error - try deleting as single value
  }
  
  // Also try deleting as single value (in case it wasn't chunked)
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore if it doesn't exist
  }
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    } else {
      // Use SecureStore for mobile with chunking support
      try {
        return await retrieveChunked(key);
      } catch (error: any) {
        console.error('Error reading from SecureStore:', error);
        return null;
      }
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
        throw error;
      }
    } else {
      // Try to compress JSON data if it's too large
      const sizeInBytes = getStringByteSize(value);
      let finalValue = value;
      
      if (sizeInBytes > SECURE_STORE_MAX_SIZE) {
        // Try compressing JSON data first
        const compressed = compressJson(value);
        const compressedSize = getStringByteSize(compressed);
        
        if (compressedSize < sizeInBytes) {
          finalValue = compressed;
          console.log(`Compressed ${key} from ${sizeInBytes} to ${compressedSize} bytes`);
        }
      }
      
      // Use chunked storage for values that exceed the limit
      const finalSize = getStringByteSize(finalValue);
      if (finalSize > SECURE_STORE_MAX_SIZE) {
        // Store using chunking mechanism
        try {
          await storeChunked(key, finalValue);
          console.log(`Stored ${key} in ${Math.ceil(finalSize / CHUNK_SIZE)} chunks (${finalSize} bytes total)`);
        } catch (error: any) {
          console.error('Error writing chunked data to SecureStore:', error);
          throw error;
        }
      } else {
        // Store normally for small values
        try {
          // First, clean up any existing chunks
          await removeChunked(key);
          // Then store as single value
          await SecureStore.setItemAsync(key, finalValue);
        } catch (error: any) {
          console.error('Error writing to SecureStore:', error);
          throw error;
        }
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    } else {
      // Use SecureStore for mobile with chunking support
      try {
        await removeChunked(key);
      } catch (error) {
        // Ignore errors - key might not exist
        console.warn('Error removing from SecureStore (key may not exist):', error);
      }
    }
  }
};
