import { Book, Film, Gamepad2, Music, Palette } from 'lucide-react-native';
import { CulturalCategory } from '@/types/CulturalItem';

export const FILTER_CATEGORIES: { key: CulturalCategory; label: string; icon: any }[] = [
  { key: 'cine', label: 'Cine', icon: Film },
  { key: 'musica', label: 'Musica', icon: Music },
  { key: 'literatura', label: 'Literatura', icon: Book },
  { key: 'arte-visual', label: 'Arte-Visual', icon: Palette },
  { key: 'videojuegos', label: 'Videojuegos', icon: Gamepad2 },
];
