import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Contact,
  Download,
  Image as ImageIcon,
  Layers,
  Palette,
  QrCode,
  Redo2,
  Save,
  Shapes,
  Sliders,
  Smile,
  Trash2,
  Type as TypeIcon,
  Undo2,
} from 'lucide-react-native';

import { EditableCanvas } from '@/components/EditableCanvas';
import { BackgroundPanel } from '@/components/panels/BackgroundPanel';
import { ContactPanel } from '@/components/panels/ContactPanel';
import { ElementPanel } from '@/components/panels/ElementPanel';
import { LayersPanel } from '@/components/panels/LayersPanel';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { EditorProvider, useEditor } from '@/context/EditorContext';
import { useCards } from '@/context/CardsContext';
import { useSettings } from '@/context/SettingsContext';
import { radius, spacing } from '@/theme/layout';
import {
  createIconElement,
  createImageElement,
  createQrElement,
  createShapeElement,
  createTextElement,
} from '@/utils/cardFactory';
import { downscale, pickFromGallery } from '@/utils/imagePicker';
import type { RootStackParamList } from '@/navigation/types';
import type { SideKey } from '@/types/card';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type EditorRoute = RouteProp<RootStackParamList, 'Editor'>;

export function EditorScreen() {
  const route = useRoute<EditorRoute>();
  const navigation = useNavigation<Navigation>();
  const { getProject } = useCards();
  const { t } = useSettings();

  const project = getProject(route.params.projectId);

  useEffect(() => {
    if (!project) navigation.goBack();
  }, [project, navigation]);

  if (!project) {
    return (
      <Screen title={t('editor.title')} onBack={() => navigation.goBack()}>
        <Text>{t('common.loading')}</Text>
      </Screen>
    );
  }

  // Keyed by id so switching cards re-creates the editor state cleanly.
  return (
    <EditorProvider key={project.id} project={project}>
      <EditorContent />
    </EditorProvider>
  );
}

type PanelKind = 'element' | 'background' | 'contact' | 'layers' | null;

function EditorContent() {
  const navigation = useNavigation<Navigation>();
  const { theme, t, rowDirection, settings } = useSettings();
  const { upsert } = useCards();
  const { width: screenWidth } = useWindowDimensions();
  const editor = useEditor();
  const [panel, setPanel] = useState<PanelKind>(null);
  const [busy, setBusy] = useState(false);

  const canvasWidth = Math.min(screenWidth - spacing.lg * 2, 560);

  const save = useCallback(() => {
    upsert(editor.project);
    editor.markSaved();
  }, [editor, upsert]);

  const confirmLeave = useCallback(() => {
    if (!editor.dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert(t('editor.unsavedTitle'), t('editor.unsavedMessage'), [
      { text: t('editor.keepEditing'), style: 'cancel' },
      {
        text: t('common.save'),
        onPress: () => {
          save();
          navigation.goBack();
        },
      },
      { text: t('editor.discard'), style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }, [editor.dirty, navigation, save, t]);

  const addImage = async () => {
    try {
      setBusy(true);
      const picked = await pickFromGallery();
      if (!picked) return;
      const uri = await downscale(picked.uri);
      const ratio = picked.height > 0 ? picked.width / picked.height : 1;
      const width = 280;
      editor.addElement(
        createImageElement(uri, {
          x: 120,
          y: 140,
          width,
          height: Math.round(width / (ratio || 1)),
        }),
      );
      setPanel('element');
    } catch {
      Alert.alert(t('common.error'), t('editor.pickImageError'));
    } finally {
      setBusy(false);
    }
  };

  const tools = useMemo(
    () => [
      {
        key: 'text',
        label: t('editor.addText'),
        icon: TypeIcon,
        onPress: () => {
          editor.addElement(
            createTextElement(settings.defaultFont, { text: t('editor.addText') }),
          );
          setPanel('element');
        },
      },
      { key: 'image', label: t('editor.addImage'), icon: ImageIcon, onPress: () => void addImage() },
      {
        key: 'shape',
        label: t('editor.addShape'),
        icon: Shapes,
        onPress: () => {
          editor.addElement(createShapeElement({}));
          setPanel('element');
        },
      },
      {
        key: 'icon',
        label: t('editor.addIcon'),
        icon: Smile,
        onPress: () => {
          editor.addElement(createIconElement('star'));
          setPanel('element');
        },
      },
      {
        key: 'qr',
        label: t('editor.addQr'),
        icon: QrCode,
        onPress: () => {
          editor.addElement(createQrElement());
          setPanel('element');
        },
      },
      {
        key: 'background',
        label: t('editor.background'),
        icon: Palette,
        onPress: () => setPanel('background'),
      },
      {
        key: 'contact',
        label: t('editor.contact'),
        icon: Contact,
        onPress: () => setPanel('contact'),
      },
      { key: 'layers', label: t('editor.layers'), icon: Layers, onPress: () => setPanel('layers') },
    ],
    [editor, settings.defaultFont, t],
  );

  return (
    <Screen
      title={editor.project.name}
      subtitle={editor.dirty ? t('editor.title') : t('common.saved')}
      onBack={confirmLeave}
      headerRight={
        <>
          <HeaderAction
            icon={Undo2}
            color={editor.canUndo ? theme.text : theme.border}
            onPress={editor.undo}
          />
          <HeaderAction
            icon={Redo2}
            color={editor.canRedo ? theme.text : theme.border}
            onPress={editor.redo}
          />
          <HeaderAction icon={Save} color={theme.primary} onPress={save} />
          <HeaderAction
            icon={Download}
            color={theme.text}
            onPress={() => {
              save();
              navigation.navigate('Export', { projectId: editor.project.id });
            }}
          />
        </>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented<SideKey>
          value={editor.side}
          onChange={editor.setSide}
          options={[
            { value: 'front', label: t('common.front') },
            { value: 'back', label: t('common.back') },
          ]}
        />

        <View style={styles.canvasWrapper}>
          <EditableCanvas
            side={editor.currentSide}
            contact={editor.project.contact}
            width={canvasWidth}
            selectedId={editor.selectedId}
            snapToGrid={settings.snapToGrid}
            onSelect={editor.select}
            onChange={editor.updateElement}
          />
        </View>

        {editor.selectedElement ? (
          <View
            style={[
              styles.selectionBar,
              { flexDirection: rowDirection, backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text numberOfLines={1} style={[styles.selectionLabel, { color: theme.textMuted }]}>
              {editor.selectedElement.type}
            </Text>
            <Pressable
              onPress={() => setPanel('element')}
              style={[styles.selectionButton, { backgroundColor: theme.primary }]}
            >
              <Sliders size={16} color={theme.onPrimary} />
              <Text style={[styles.selectionButtonLabel, { color: theme.onPrimary }]}>
                {t('common.edit')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => editor.removeElement(editor.selectedElement!.id)}
              style={[styles.selectionButton, { backgroundColor: theme.danger }]}
            >
              <Trash2 size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            {t('editor.nothingSelected')}
          </Text>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.toolbar, { flexDirection: rowDirection }]}
        >
          {tools.map((tool) => (
            <Pressable
              key={tool.key}
              onPress={tool.onPress}
              disabled={busy}
              style={[
                styles.tool,
                { backgroundColor: theme.surface, borderColor: theme.border, opacity: busy ? 0.6 : 1 },
              ]}
            >
              <tool.icon size={20} color={theme.primary} />
              <Text style={[styles.toolLabel, { color: theme.text }]}>{tool.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      <ElementPanel visible={panel === 'element'} onClose={() => setPanel(null)} />
      <BackgroundPanel visible={panel === 'background'} onClose={() => setPanel(null)} />
      <ContactPanel visible={panel === 'contact'} onClose={() => setPanel(null)} />
      <LayersPanel visible={panel === 'layers'} onClose={() => setPanel(null)} />
    </Screen>
  );
}

function HeaderAction({
  icon: Icon,
  color,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button">
      <Icon size={20} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  canvasWrapper: { alignItems: 'center', marginBottom: spacing.md },
  selectionBar: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectionLabel: { flex: 1, fontSize: 12, fontWeight: '600', paddingHorizontal: spacing.sm },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  selectionButtonLabel: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center' },
  toolbar: { gap: spacing.sm, paddingVertical: spacing.sm },
  tool: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: 84,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolLabel: { fontSize: 11, fontWeight: '600' },
});
