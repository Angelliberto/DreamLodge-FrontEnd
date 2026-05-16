import { Book, Film, Gamepad2, Music, Palette } from 'lucide-react-native';
import { CulturalCategory } from '@/types/CulturalItem';
import type { CategoryTabIcon } from './CategoryIconTabBar';

/** Categoría activa al abrir búsqueda / tras refrescar el feed. */
export const DEFAULT_FILTER_CATEGORIES: CulturalCategory[] = ['cine'];

export const FILTER_CATEGORIES: { key: CulturalCategory; label: string; icon: CategoryTabIcon }[] = [
  { key: 'cine', label: 'Cine/Series', icon: Film },
  { key: 'musica', label: 'Musica', icon: Music },
  { key: 'literatura', label: 'Literatura', icon: Book },
  { key: 'arte-visual', label: 'Arte-Visual', icon: Palette },
  { key: 'videojuegos', label: 'Videojuegos', icon: Gamepad2 },
];
