import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Copy, LayoutTemplate, PencilLine, Plus, Trash2 } from 'lucide-react-native';

import { CardCanvas } from '@/components/CardCanvas';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { TextField } from '@/components/ui/TextField';
import { useCards } from '@/context/CardsContext';
import { useSettings } from '@/context/SettingsContext';
import { radius, spacing } from '@/theme/layout';
import type { RootStackParamList } from '@/navigation/types';
import type { CardProject } from '@/types/card';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function MyCardsScreen() {
  const navigation = useNavigation<Navigation>();
  const { theme, t, n, d, rowDirection, textAlign, settings } = useSettings();
  const { projects, createBlank, duplicate, remove, rename } = useCards();
  const [sort, setSort] = useState<'newest' | 'name'>('newest');
  const [renaming, setRenaming] = useState<CardProject | null>(null);
  const [draftName, setDraftName] = useState('');

  const sorted = useMemo(() => {
    const list = [...projects];
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => b.updatedAt - a.updatedAt);
    return list;
  }, [projects, sort]);

  const openCard = (project: CardProject) =>
    navigation.navigate('Editor', { projectId: project.id });

  const handleCreateBlank = () => {
    const project = createBlank(t('common.untitled'), settings.defaultFont);
    openCard(project);
  };

  const confirmDelete = (project: CardProject) => {
    Alert.alert(
      t('cards.deleteTitle'),
      t('cards.deleteMessage', { name: project.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => remove(project.id) },
      ],
    );
  };

  const submitRename = () => {
    if (renaming && draftName.trim()) rename(renaming.id, draftName.trim());
    setRenaming(null);
  };

  return (
    <Screen title={t('cards.title')} subtitle={t('cards.subtitle', { count: n(projects.length) })}>
      <View style={[styles.actions, { flexDirection: rowDirection }]}>
        <Button label={t('cards.newBlank')} onPress={handleCreateBlank} icon={Plus} />
        <Button
          label={t('cards.fromTemplate')}
          variant="secondary"
          icon={LayoutTemplate}
          onPress={() => navigation.navigate('Tabs', { screen: 'Templates' })}
        />
      </View>

      {projects.length > 1 ? (
        <Segmented
          options={[
            { value: 'newest', label: t('cards.sortNewest') },
            { value: 'name', label: t('cards.sortName') },
          ]}
          value={sort}
          onChange={setSort}
        />
      ) : null}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('cards.empty')}</Text>
            <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
              {t('cards.emptyHint')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openCard(item)}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <CardCanvas side={item.front} contact={item.contact} width={150} />
            <View style={styles.cardBody}>
              <Text numberOfLines={1} style={[styles.cardName, { color: theme.text, textAlign }]}>
                {item.name}
              </Text>
              <Text numberOfLines={1} style={[styles.cardMeta, { color: theme.textMuted, textAlign }]}>
                {t('cards.updatedAt', { date: d(item.updatedAt) })}
              </Text>
              <View style={[styles.cardActions, { flexDirection: rowDirection }]}>
                <IconAction
                  icon={PencilLine}
                  color={theme.textMuted}
                  onPress={() => {
                    setRenaming(item);
                    setDraftName(item.name);
                  }}
                />
                <IconAction
                  icon={Copy}
                  color={theme.textMuted}
                  onPress={() => duplicate(item.id, t('cards.duplicateSuffix'))}
                />
                <IconAction icon={Trash2} color={theme.danger} onPress={() => confirmDelete(item)} />
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={renaming !== null} transparent animationType="fade">
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text, textAlign }]}>
              {t('cards.renameTitle')}
            </Text>
            <TextField
              value={draftName}
              onChangeText={setDraftName}
              placeholder={t('cards.namePlaceholder')}
            />
            <View style={[styles.modalActions, { flexDirection: rowDirection }]}>
              <Button label={t('common.cancel')} variant="secondary" onPress={() => setRenaming(null)} />
              <Button label={t('common.save')} onPress={submitRename} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function IconAction({
  icon: Icon,
  color,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.iconAction} accessibilityRole="button">
      <Icon size={18} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, marginVertical: spacing.md, flexWrap: 'wrap' },
  list: { paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardMeta: { fontSize: 11 },
  cardActions: { gap: spacing.lg, marginTop: spacing.sm },
  iconAction: { padding: 4 },
  empty: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox: { width: '100%', borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { gap: spacing.sm, justifyContent: 'flex-end' },
});
