import React from 'react';
import { Text, View } from 'react-native';

import { ARTISTIC_GENRE_KEYS, ArtisticDescriptionPayload } from '@/api/client';

const GENRE_SECTION_LABELS: Record<(typeof ARTISTIC_GENRE_KEYS)[number], string> = {
  cine: 'Cine/Series',
  musica: 'Música',
  literatura: 'Literatura',
  videojuegos: 'Videojuegos',
  'arte-visual': 'Arte visual'
};

type Props = {
  artisticProfile: ArtisticDescriptionPayload;
};

export function GenreRecommendationsBlock({ artisticProfile }: Props) {
  if (
    artisticProfile.genreRecommendations &&
    ARTISTIC_GENRE_KEYS.some((k) => (artisticProfile.genreRecommendations?.[k]?.length ?? 0) > 0)
  ) {
    return (
      <View className="mb-5">
        <Text className="mb-2 text-sm text-slate-400">
          Géneros y estilos que podrían encajar contigo
        </Text>
        {ARTISTIC_GENRE_KEYS.map((key) => {
          const list = artisticProfile.genreRecommendations?.[key];
          if (!list?.length) return null;
          return (
            <View key={key} className="mb-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {GENRE_SECTION_LABELS[key]}
              </Text>
              <Text className="leading-6 text-slate-300">{list.join(' · ')}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  if (artisticProfile.recommendations && artisticProfile.recommendations.length > 0) {
    return (
      <View className="mb-5">
        <Text className="mb-2 text-sm text-slate-400">
          Géneros y estilos (perfil anterior)
        </Text>
        <Text className="text-slate-300">{artisticProfile.recommendations.join(', ')}.</Text>
      </View>
    );
  }

  return null;
}
