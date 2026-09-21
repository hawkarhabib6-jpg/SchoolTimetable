import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CardCanvas } from '@/components/CardCanvas';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { useCards } from '@/context/CardsContext';
import { useSettings } from '@/context/SettingsContext';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '@/templates';
import { radius, spacing } from '@/theme/layout';
import type { RootStackParamList } from '@/navigation/types';
import type { CardTemplate, TemplateCategory } from '@/types/card';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Filter = TemplateCategory | 'all';

export function TemplatesScreen() {
  const navigation = useNavigation<Navigation>();
  const { theme, t, rowDirection, textAlign } = useSettings();
  const { createFromTemplate } = useCards();
  const { width: screenWidth } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const [preview, setPreview] = useState<CardTemplate | null>(null);

  const visible = useMemo(
    () => (filter === 'all' ? TEMPLATES : TEMPLATES.filter((item) => item.category === filter)),
    [filter],
  );

  const cardWidth = Math.min(screenWidth - spacing.lg * 2, 520);
  const previewWidth = Math.min(screenWidth - spacing.xl * 2, 480);

  const useTemplate = (template: CardTemplate) => {
    const project = createFromTemplate(template, t(`templates.${template.nameKey}`));
    setPreview(null);
    navigation.navigate('Editor', { projectId: project.id });
  };

  return (
    <Screen title={t('templates.title')} subtitle={t('templates.subtitle')}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { flexDirection: rowDirection }]}
      >
        {(['all', ...TEMPLATE_CATEGORIES] as Filter[]).map((category) => {
          const active = filter === category;
          return (
            <Pressable
              key={category}
              onPress={() => setFilter(category)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.surfaceAlt,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[styles.chipLabel, { color: active ? theme.onPrimary : theme.textMuted }]}
              >
                {t(`templates.${category}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {visible.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => setPreview(template)}
            style={[styles.item, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <CardCanvas
              side={template.front}
              contact={template.contact}
              width={cardWidth - spacing.md * 2}
            />
            <View style={[styles.itemFooter, { flexDirection: rowDirection }]}>
              <Text style={[styles.itemName, { color: theme.text, textAlign }]}>
                {t(`templates.${template.nameKey}`)}
              </Text>
              <Text style={[styles.itemCategory, { color: theme.textMuted }]}>
                {t(`templates.${template.category}`)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Sheet
        visible={preview !== null}
        title={preview ? t(`templates.${preview.nameKey}`) : ''}
        onClose={() => setPreview(null)}
        maxHeight={0.9}
      >
        {preview ? (
          <View style={styles.previewBody}>
            <Text style={[styles.previewLabel, { color: theme.textMuted }]}>
              {t('common.front')}
            </Text>
            <CardCanvas side={preview.front} contact={preview.contact} width={previewWidth} />
            <Text style={[styles.previewLabel, { color: theme.textMuted }]}>{t('common.back')}</Text>
            <CardCanvas side={preview.back} contact={preview.contact} width={previewWidth} />
            <Button
              label={t('templates.useTemplate')}
              onPress={() => useTemplate(preview)}
              fullWidth
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: spacing.sm, paddingVertical: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  grid: { paddingBottom: spacing.xxl, gap: spacing.md },
  item: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  itemFooter: { justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 14, fontWeight: '700', flex: 1 },
  itemCategory: { fontSize: 11 },
  previewBody: { gap: spacing.md, alignItems: 'center' },
  previewLabel: { fontSize: 12, fontWeight: '600', alignSelf: 'flex-start' },
});
