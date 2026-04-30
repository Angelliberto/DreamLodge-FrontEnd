import React from 'react';
import { Star } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { AB5C_SUBFACET_ORDER, DIMENSION_NAMES } from '@/constants/oceanTestCopy';
import { SubfacetsBlock } from './SubfacetsBlock';

type ScoreLabel = {
  label: string;
  description: string;
};

type Props = {
  selectedDimension: string;
  normalizedDimensions: Record<string, number>;
  isDeep: boolean;
  subfacets?: Record<string, Record<string, number[]>>;
  subfacetsShowAll: boolean;
  setSubfacetsShowAll: React.Dispatch<React.SetStateAction<boolean>>;
  getScoreLabel: (score: number) => ScoreLabel;
};

export function SelectedDimensionDetailsBlock({
  selectedDimension,
  normalizedDimensions,
  isDeep,
  subfacets,
  subfacetsShowAll,
  setSubfacetsShowAll,
  getScoreLabel
}: Props) {
  if (!selectedDimension || normalizedDimensions[selectedDimension] === undefined) {
    return null;
  }

  const dim = DIMENSION_NAMES[selectedDimension];
  const scoreVal = normalizedDimensions[selectedDimension];
  const scoreLabel = getScoreLabel(scoreVal);

  return (
    <View>
      <View className="flex-row items-center gap-2 mb-4">
        <Star size={24} color={dim.color} />
        <Text className="text-xl font-bold text-white">
          {dim.es}
        </Text>
      </View>

      <Text className="text-slate-300 mb-4 leading-6">
        {dim.descripcion}
      </Text>

      <View
        className="mb-2 overflow-hidden rounded-xl border border-slate-600/35 bg-slate-900/45"
        style={{ borderLeftWidth: 4, borderLeftColor: dim.color }}
      >
        <View className="flex-row items-center gap-4 p-4">
          <View>
            <Text className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Puntuación
            </Text>
            <Text className="text-3xl font-bold text-white">
              {scoreVal.toFixed(1)}
              <Text className="text-lg font-semibold text-slate-500">/5</Text>
            </Text>
          </View>
          <View className="min-w-0 flex-1 border-l border-slate-600/50 pl-4">
            <View className="mb-1.5 self-start rounded-md bg-slate-800/90 px-2.5 py-1">
              <Text className="text-xs font-semibold" style={{ color: dim.color }}>
                {scoreLabel.label}
              </Text>
            </View>
            <Text className="text-sm leading-5 text-slate-300">
              {scoreLabel.description} en {dim.es.toLowerCase()}.
            </Text>
          </View>
        </View>
      </View>

      {isDeep && subfacets && subfacets[selectedDimension] && (
        <SubfacetsBlock
          selectedDimension={selectedDimension}
          subfacets={subfacets}
          subfacetsShowAll={subfacetsShowAll}
          setSubfacetsShowAll={setSubfacetsShowAll}
        />
      )}

      {!isDeep && (
        <View className="mt-4 p-4 bg-slate-700/50 rounded-xl">
          <Text className="text-slate-300 text-sm">
            Realiza el <Text className="font-bold underline">Análisis Profundo</Text> para ver las{' '}
            {AB5C_SUBFACET_ORDER.openness.length} facetas AB5C por rasgo (modelo IPIP).
          </Text>
        </View>
      )}
    </View>
  );
}
