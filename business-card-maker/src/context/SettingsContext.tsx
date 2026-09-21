import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import * as Localization from 'expo-localization';

import {
  formatDate,
  formatNumber,
  isRTLLanguage,
  resolveDeviceLanguage,
  translate,
  type LanguageCode,
  type TKey,
  type TranslateParams,
} from '@/i18n';
import { darkTheme, lightTheme, type AppTheme } from '@/theme/colors';
import { defaultFontFor } from '@/theme/fonts';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
  type ThemeMode,
} from '@/storage/storage';
import type { FontId } from '@/types/card';

interface SettingsContextValue {
  ready: boolean;
  settings: AppSettings;
  theme: AppTheme;
  isRTL: boolean;
  /** `row` in LTR, `row-reverse` in RTL. */
  rowDirection: 'row' | 'row-reverse';
  /** Natural text alignment for the active language. */
  textAlign: 'left' | 'right';
  t: (key: TKey | string, params?: TranslateParams) => string;
  n: (value: number) => string;
  d: (value: number) => string;
  setLanguage: (language: LanguageCode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setDefaultFont: (font: FontId) => void;
  setSnapToGrid: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSettings();
      if (cancelled) return;
      if (!stored.languageChosen) {
        // First launch: follow the device locale.
        const locales = Localization.getLocales().map(
          (locale) => locale.languageTag,
        );
        const language = resolveDeviceLanguage(locales);
        stored.language = language;
        stored.defaultFont = defaultFontFor(language);
      }
      setSettings(stored);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const setLanguage = useCallback(
    (language: LanguageCode) => {
      update({ language, languageChosen: true, defaultFont: defaultFontFor(language) });
    },
    [update],
  );

  const setThemeMode = useCallback(
    (themeMode: ThemeMode) => update({ themeMode }),
    [update],
  );
  const setDefaultFont = useCallback(
    (defaultFont: FontId) => update({ defaultFont }),
    [update],
  );
  const setSnapToGrid = useCallback(
    (snapToGrid: boolean) => update({ snapToGrid }),
    [update],
  );

  const value = useMemo<SettingsContextValue>(() => {
    const resolvedMode =
      settings.themeMode === 'system'
        ? systemScheme === 'dark'
          ? 'dark'
          : 'light'
        : settings.themeMode;
    const isRTL = isRTLLanguage(settings.language);
    return {
      ready,
      settings,
      theme: resolvedMode === 'dark' ? darkTheme : lightTheme,
      isRTL,
      rowDirection: isRTL ? 'row-reverse' : 'row',
      textAlign: isRTL ? 'right' : 'left',
      t: (key, params) => translate(settings.language, key, params),
      n: (value) => formatNumber(value, settings.language),
      d: (value) => formatDate(value, settings.language),
      setLanguage,
      setThemeMode,
      setDefaultFont,
      setSnapToGrid,
    };
  }, [
    ready,
    settings,
    systemScheme,
    setLanguage,
    setThemeMode,
    setDefaultFont,
    setSnapToGrid,
  ]);

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return context;
}

export function useTheme(): AppTheme {
  return useSettings().theme;
}
