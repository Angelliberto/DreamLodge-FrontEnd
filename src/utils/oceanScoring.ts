/**
 * IPIP: ítems Likert 1–5, ítems con clave − usan 6 − R.
 * La app guarda y muestra la media de ítems recodificados en [1, 5] (métrica habitual IPIP / Mini-IPIP).
 */

export const OCEAN_RESPONSE_SCALE = {
  IPIP_1_5: 'ipip_1_5',
  LEGACY_NEG2_POS2: 'legacy_neg2_pos2',
} as const;

export type OceanResponseScale = (typeof OCEAN_RESPONSE_SCALE)[keyof typeof OCEAN_RESPONSE_SCALE];

/** Qué representa `trait.total` y las facetas en Mongo. */
export const OCEAN_SCORE_METRIC = {
  /** Media Likert 1–5 (canonical IPIP en la app desde ahora). */
  IPIP_MEAN_1_5: 'ipip_mean_1_5',
  /** Compatibilidad: valores guardados como ((media−1)/4)*5 en rango ~0–5. */
  DISPLAY_AFFINE_05: 'display_affine_05',
} as const;

export type OceanScoreMetric = (typeof OCEAN_SCORE_METRIC)[keyof typeof OCEAN_SCORE_METRIC];

/** Recodificación IPIP estándar para ítems con clave − (1–5). */
export function scoreIPIPItem(raw1to5: number, keying?: 'positive' | 'negative'): number {
  if (keying === 'negative') return 6 - raw1to5;
  return raw1to5;
}

export function averageKeyedLikert(values: number[]): number {
  if (!values.length) return NaN;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Convierte totales antiguos guardados en escala afín 0–5 → media Likert equivalente [1, 5].
 */
export function affineStored05ToLikertMean(display: number): number {
  const n = Number(display);
  if (!Number.isFinite(n)) return NaN;
  return (n / 5) * 4 + 1;
}

/** Barra horizontal: 1 → 0 %, 5 → 100 %. */
export function likertMeanToBarPercent(mean1to5: number): number {
  const m = Number(mean1to5);
  if (!Number.isFinite(m)) return 0;
  return Math.min(100, Math.max(0, ((m - 1) / 4) * 100));
}

/**
 * Media de facet desde arrays de ítems del cliente → valor a persistir (siempre Likert 1–5).
 */
export function facetMeanForPersistence(values: number[], responseScale: OceanResponseScale): number {
  const m = averageKeyedLikert(values);
  if (!Number.isFinite(m)) return NaN;
  if (responseScale === OCEAN_RESPONSE_SCALE.IPIP_1_5) return m;
  /** Legado −2…+2 por ítem: media ∈ [−2, 2] → desplazar a Likert centrado ~1–5 */
  const shifted = m + 3;
  return Math.min(5, Math.max(1, shifted));
}
