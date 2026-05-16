import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { AB5C_SUBFACET_ORDER, DIMENSION_NAMES, SUBFACET_INFO } from '@/constants/oceanTestCopy';
import { averageKeyedLikert, likertMeanToBarPercent } from '@/utils/oceanScoring';

const SUBFACETS_PREVIEW_COUNT = 3;

export function facetLikertMeanFromArrays(values: number[]): number {
  const m = averageKeyedLikert(values);
  if (!Number.isFinite(m)) return 3;
  return Math.min(5, Math.max(1, m));
}

export type Props = {
  selectedDimension: string;
  subfacets: Record<string, Record<string, number[]>>;
  subfacetsShowAll: boolean;
  setSubfacetsShowAll: React.Dispatch<React.SetStateAction<boolean>>;
};

export function SubfacetsBlock({
  selectedDimension,
  subfacets,
  subfacetsShowAll,
  setSubfacetsShowAll
}: Props) {
  const order = AB5C_SUBFACET_ORDER[selectedDimension] || [];
  const entries = Object.entries(subfacets[selectedDimension] as Record<string, number[]>);
  const sorted = [...entries].sort(([a], [b]) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const dimColor = DIMENSION_NAMES[selectedDimension].color;
  const total = sorted.length;
  const hasMore = total > SUBFACETS_PREVIEW_COUNT;
  const visible = subfacetsShowAll ? sorted : sorted.slice(0, SUBFACETS_PREVIEW_COUNT);
  const restCount = total - SUBFACETS_PREVIEW_COUNT;

  return (
    <View className="rounded-xl border border-slate-600/40 bg-slate-900/40 p-4">
      <Text className="text-white font-semibold text-base mb-1">Facetas AB5C</Text>
      <Text className="text-slate-500 text-xs mb-3 leading-5">
        Media de ítems IPIP tras recodificar negativos (6 − R; Likert 1–5 por ítem). Puntuación = media Likert del
        conjunto de ítems de la faceta (estilo habitual en documentación Mini-IPIP / IPIP correlativos).
      </Text>
      <View className="gap-1">
        {visible.map(([subfacet, scores]: [string, number[]]) => {
          const likertMean = facetLikertMeanFromArrays(scores);
          const info = SUBFACET_INFO[subfacet];
          const subfacetName = info?.label ?? subfacet;
          const subfacetDesc = info?.descripcion;
          const pct = likertMeanToBarPercent(likertMean);

          return (
            <View
              key={subfacet}
              className="overflow-hidden rounded-xl border border-slate-600/35 bg-slate-800/60"
            >
              <View className="flex-row" style={{ borderLeftWidth: 4, borderLeftColor: dimColor }}>
                <View className="flex-1 p-3">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1 pr-1">
                      <Text className="text-base font-semibold leading-snug text-white">
                        {subfacetName}
                      </Text>
                      {subfacetDesc ? (
                        <Text className="mt-1.5 text-xs leading-5 text-slate-400">
                          {subfacetDesc}
                        </Text>
                      ) : null}
                    </View>
                    <View className="shrink-0 items-end rounded-lg border border-slate-600/50 bg-slate-900/80 px-2 py-1.5">
                      <Text className="text-lg font-bold leading-none text-white">
                        {likertMean.toFixed(2)}
                      </Text>
                      <Text className="text-[10px] text-slate-500">media 1–5</Text>
                    </View>
                  </View>
                  <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-700/90">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: dimColor
                      }}
                    />
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
      {hasMore ? (
        <TouchableOpacity
          className="mt-2 rounded-xl border border-slate-600/60 bg-slate-800/70 py-3.5"
          onPress={() => setSubfacetsShowAll((v) => !v)}
          activeOpacity={0.75}
        >
          <Text className="text-center text-sm font-semibold text-purple-300">
            {subfacetsShowAll
              ? 'Mostrar menos'
              : `Ver ${restCount} ${restCount === 1 ? 'faceta más' : 'facetas más'}`}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
