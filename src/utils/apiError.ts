/** Mensaje legible desde respuestas tipo axios para Alertas. */
export function getApiAlertMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: unknown } } }).response?.data;
    const m = data?.message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return fallback;
}
