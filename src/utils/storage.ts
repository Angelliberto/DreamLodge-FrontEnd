// Storage utility that works on web and mobile
// Uses SecureStore for mobile (with size limit handling) and localStorage for web
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Maximum size for SecureStore (2048 bytes) - values larger than this will show warnings
// but we'll still attempt to store them (some devices may allow slightly larger values)
const SECURE_STORE_MAX_SIZE = 2048;

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
      // Use SecureStore for mobile
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error: any) {
        // Suppress size warnings - they're expected for large data
        if (error?.message?.includes('larger than 2048 bytes')) {
          // Try to read anyway - some devices may still work
          return null;
        }
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
        // Try compressing JSON data
        const compressed = compressJson(value);
        const compressedSize = getStringByteSize(compressed);
        
        if (compressedSize < sizeInBytes) {
          finalValue = compressed;
          console.warn(`Compressed ${key} from ${sizeInBytes} to ${compressedSize} bytes`);
        }
        
        // Warn but still attempt to store (some devices may allow it)
        if (getStringByteSize(finalValue) > SECURE_STORE_MAX_SIZE) {
          console.warn(
            `Value for ${key} is ${getStringByteSize(finalValue)} bytes (limit: ${SECURE_STORE_MAX_SIZE}). ` +
            `SecureStore may not store this successfully. Consider splitting the data.`
          );
        }
      }
      
      // Use SecureStore for mobile (will show warnings for large values but attempt to store)
      try {
        await SecureStore.setItemAsync(key, finalValue);
      } catch (error: any) {
        // If it fails due to size, provide helpful error
        if (error?.message?.includes('larger than 2048 bytes')) {
          throw new Error(
            `Cannot store ${key}: value is too large (${getStringByteSize(finalValue)} bytes). ` +
            `SecureStore limit is ${SECURE_STORE_MAX_SIZE} bytes. Consider storing less data or splitting it.`
          );
        }
        console.error('Error writing to SecureStore:', error);
        throw error;
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
      // Use SecureStore for mobile
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        // Ignore errors - key might not exist
        console.warn('Error removing from SecureStore (key may not exist):', error);
      }
    }
  }
};
