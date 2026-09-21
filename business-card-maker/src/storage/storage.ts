import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CardProject } from '@/types/card';
import type { LanguageCode } from '@/i18n';
import type { FontId } from '@/types/card';

const PROJECTS_KEY = 'bcm:projects:v1';
const SETTINGS_KEY = 'bcm:settings:v1';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppSettings {
  language: LanguageCode;
  themeMode: ThemeMode;
  defaultFont: FontId;
  snapToGrid: boolean;
  /** Set once the user has explicitly chosen a language. */
  languageChosen: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  themeMode: 'system',
  defaultFont: 'montserrat',
  snapToGrid: true,
  languageChosen: false,
};

export async function loadProjects(): Promise<CardProject[]> {
  try {
    const raw = await AsyncStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCardProject);
  } catch {
    return [];
  }
}

export async function saveProjects(projects: CardProject[]): Promise<void> {
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function clearProjects(): Promise<void> {
  await AsyncStorage.removeItem(PROJECTS_KEY);
}

function isCardProject(value: unknown): value is CardProject {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CardProject>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    !!candidate.front &&
    !!candidate.back &&
    Array.isArray(candidate.front.elements) &&
    Array.isArray(candidate.back.elements)
  );
}
