import { Image } from 'expo-image';
import { InteractionManager, Platform } from 'react-native';

/**
 * Precarga URLs en segundo plano tras las animaciones de navegación (patrón tipo feed social).
 */
export function prefetchImageUris(uris: (string | undefined | null)[], limit = 28): void {
  const unique = [...new Set(uris.filter((u): u is string => typeof u === 'string' && u.length > 4))].slice(
    0,
    limit
  );
  if (!unique.length) return;

  const run = () => {
    for (const uri of unique) {
      void Image.prefetch(uri).catch(() => undefined);
    }
  };

  if (Platform.OS === 'web') {
    run();
    return;
  }
  InteractionManager.runAfterInteractions(run);
}
