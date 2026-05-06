import { Image, type ImageContentFit } from 'expo-image';
import React, { memo, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type OptimizedImageProps = {
  source: { uri: string } | string;
  style?: StyleProp<ViewStyle>;
  placeholderColor?: string;
  contentFit?: ImageContentFit;
  /** Prioridad de decodificación en listas largas: 'low' reduce trabajo fuera de viewport. */
  priority?: 'low' | 'normal' | 'high';
  recyclingKey?: string;
  /** @deprecated compat con API antigua de RN Image */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
};

function uriFromSource(source: OptimizedImageProps['source']): string | null {
  if (typeof source === 'string' && source.length > 0) return source;
  if (source && typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
    return source.uri || null;
  }
  return null;
}

export const OptimizedImage = memo(function OptimizedImage({
  source,
  style,
  placeholderColor = '#1e293b',
  contentFit,
  priority = 'normal',
  recyclingKey,
  resizeMode,
}: OptimizedImageProps) {
  const uri = useMemo(() => uriFromSource(source), [source]);
  const fit = contentFit ?? (resizeMode === 'contain' ? 'contain' : 'cover');

  if (!uri) return null;

  const key = recyclingKey ?? uri;

  return (
    <Image
      source={uri}
      style={[{ backgroundColor: placeholderColor }, style]}
      contentFit={fit}
      cachePolicy="memory-disk"
      priority={priority}
      recyclingKey={key}
      transition={180}
    />
  );
});
