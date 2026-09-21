import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Check, Trash2 } from 'lucide-react-native';

import { FontPicker } from '@/components/FontPicker';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Toggle';
import { useCards } from '@/context/CardsContext';
import { useSettings } from '@/context/SettingsContext';
import { LANGUAGES, type LanguageCode } from '@/i18n';
import { radius, spacing } from '@/theme/layout';
import type { ThemeMode } from '@/storage/storage';

export function SettingsScreen() {
  const {
    theme,
    t,
    settings,
    rowDirection,
    textAlign,
    setLanguage,
    setThemeMode,
    setDefaultFont,
    setSnapToGrid,
  } = useSettings();
  const { projects, removeAll } = useCards();

  const version = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

  const confirmClear = () => {
    Alert.alert(t('settings.clearAll'), t('settings.clearAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeAll();
          Alert.alert(t('settings.cleared'));
        },
      },
    ]);
  };

  return (
    <Screen title={t('settings.title')}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Section title={t('settings.language')}>
          {LANGUAGES.map((language) => {
            const active = settings.language === language.code;
            return (
              <Pressable
                key={language.code}
                onPress={() => setLanguage(language.code as LanguageCode)}
                style={[
                  styles.languageRow,
                  {
                    flexDirection: rowDirection,
                    backgroundColor: active ? theme.primarySoft : theme.surfaceAlt,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.languageLabel, { color: theme.text, textAlign }]}>
                  {language.label}
                </Text>
                {active ? <Check size={18} color={theme.primary} /> : null}
              </Pressable>
            );
          })}
        </Section>

        <Section title={t('settings.appearance')}>
          <Segmented<ThemeMode>
            value={settings.themeMode}
            onChange={setThemeMode}
            options={[
              { value: 'system', label: t('settings.themeSystem') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
          />
        </Section>

        <Section title={t('settings.defaults')}>
          <FontPicker
            label={t('settings.defaultFont')}
            value={settings.defaultFont}
            onChange={setDefaultFont}
          />
          <Toggle
            label={t('editor.snapToGrid')}
            value={settings.snapToGrid}
            onChange={setSnapToGrid}
          />
        </Section>

        <Section title={t('settings.storage')}>
          <Text style={[styles.storageText, { color: theme.textMuted, textAlign }]}>
            {t('cards.subtitle', { count: String(projects.length) })}
          </Text>
          <Button
            label={t('settings.clearAll')}
            variant="danger"
            icon={Trash2}
            onPress={confirmClear}
          />
        </Section>

        <Section title={t('settings.about')}>
          <Text style={[styles.aboutText, { color: theme.textMuted, textAlign }]}>
            {t('settings.aboutText')}
          </Text>
          <Text style={[styles.version, { color: theme.textMuted, textAlign }]}>
            {t('settings.version', { version })}
          </Text>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme, textAlign } = useSettings();
  return (
    <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text, textAlign }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingVertical: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  section: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: spacing.md },
  languageRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  languageLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  storageText: { fontSize: 13, marginBottom: spacing.md },
  aboutText: { fontSize: 13, lineHeight: 20, marginBottom: spacing.sm },
  version: { fontSize: 12 },
});
