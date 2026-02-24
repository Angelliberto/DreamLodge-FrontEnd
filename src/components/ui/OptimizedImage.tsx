// Optimized image component with aggressive lazy loading
import React, { useState } from 'react';
import { Image, ImageProps, View, ActivityIndicator } from 'react-native';

interface OptimizedImageProps extends ImageProps {
  placeholderColor?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  placeholderColor = '#1e293b',
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Helper to get URI from source (handles both object and array)
  const getSourceUri = () => {
    if (!source) return null;
    if (Array.isArray(source)) {
      return source[0]?.uri || null;
    }
    if (typeof source === 'object' && 'uri' in source) {
      return source.uri || null;
    }
    return null;
  };

  if (!getSourceUri()) {
    return null;
  }

  return (
    <View style={style}>
      {loading && (
        <View
          style={[
            style,
            {
              position: 'absolute',
              backgroundColor: placeholderColor,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <ActivityIndicator size="small" color="#64748b" />
        </View>
      )}
      <Image
        {...props}
        source={source}
        style={style}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        // Progressive loading optimizations
        progressiveRenderingEnabled={true}
      />
    </View>
  );
};
