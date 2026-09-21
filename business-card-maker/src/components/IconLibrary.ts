import type { ComponentType } from 'react';
import {
  AtSign,
  Award,
  Briefcase,
  Building2,
  Camera,
  Check,
  Circle,
  Clock,
  Code2,
  Coffee,
  Compass,
  CreditCard,
  Crown,
  Facebook,
  Feather,
  Gem,
  Globe,
  Hammer,
  Heart,
  Home,
  Instagram,
  Laptop,
  Leaf,
  Lightbulb,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Mountain,
  Music,
  Palette,
  Phone,
  Printer,
  Scissors,
  Send,
  Shield,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Target,
  Truck,
  Twitter,
  Utensils,
  Wifi,
  Wrench,
  Youtube,
  Zap,
} from 'lucide-react-native';

export interface LucideIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export type IconComponent = ComponentType<LucideIconProps>;

/**
 * A curated set — explicit imports keep the bundle small, unlike importing the
 * whole Lucide package just to resolve a name at runtime.
 */
export const ICON_LIBRARY: Record<string, IconComponent> = {
  phone: Phone,
  smartphone: Smartphone,
  mail: Mail,
  'at-sign': AtSign,
  globe: Globe,
  'map-pin': MapPin,
  home: Home,
  building: Building2,
  briefcase: Briefcase,
  store: Store,
  'credit-card': CreditCard,
  'shopping-bag': ShoppingBag,
  printer: Printer,
  truck: Truck,
  wrench: Wrench,
  hammer: Hammer,
  laptop: Laptop,
  code: Code2,
  wifi: Wifi,
  zap: Zap,
  target: Target,
  compass: Compass,
  shield: Shield,
  award: Award,
  crown: Crown,
  gem: Gem,
  star: Star,
  sparkles: Sparkles,
  heart: Heart,
  leaf: Leaf,
  feather: Feather,
  mountain: Mountain,
  lightbulb: Lightbulb,
  palette: Palette,
  camera: Camera,
  music: Music,
  scissors: Scissors,
  coffee: Coffee,
  utensils: Utensils,
  stethoscope: Stethoscope,
  clock: Clock,
  check: Check,
  circle: Circle,
  send: Send,
  'message-circle': MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

export const ICON_NAMES: string[] = Object.keys(ICON_LIBRARY);

export function getIcon(name: string): IconComponent {
  return ICON_LIBRARY[name] ?? Circle;
}
