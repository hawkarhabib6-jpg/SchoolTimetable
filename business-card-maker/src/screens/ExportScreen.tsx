import React, { useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type View as RNView,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileImage, FileText, IdCard, Share2 } from 'lucide-react-native';

import { CardCanvas } from '@/components/CardCanvas';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { useCards } from '@/context/CardsContext';
import { useSettings } from '@/context/SettingsContext';
import { radius, spacing } from '@/theme/layout';
import { CARD_HEIGHT, CARD_WIDTH } from '@/types/card';
import {
  exportImage,
  exportPdf,
  exportVCard,
  mimeTypeFor,
  shareFile,
  type ExportResult,
  type SideSelection,
} from '@/utils/exporter';
import type { RootStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type ExportRoute = RouteProp<RootStackParamList, 'Export'>;

export function ExportScreen() {
  const route = useRoute<ExportRoute>();
  const navigation = useNavigation<Navigation>();
  const { theme, t, n, rowDirection, textAlign } = useSettings();
  const { getProject } = useCards();
  const { width: screenWidth } = useWindowDimensions();

  const project = getProject(route.params.projectId);
  const frontRef = useRef<RNView>(null);
  const backRef = useRef<RNView>(null);
  const [sides, setSides] = useState<SideSelection>('both');
  const [quality, setQuality] = useState(0.92);
  const [bleed, setBleed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastExport, setLastExport] = useState<ExportResult & { kind: string } | null>(null);

  if (!project) {
    return (
      <Screen title={t('exportScreen.title')} onBack={() => navigation.goBack()}>
        <Text style={{ color: theme.text }}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  const previewWidth = Math.min(screenWidth - spacing.lg * 2, 460);

  const finish = async (result: ExportResult, kind: 'png' | 'jpg' | 'pdf' | 'vcf') => {
    setLastExport({ ...result, kind });
    const shared = await shareFile(result.uri, mimeTypeFor(kind));
    if (!shared) {
      Alert.alert(
        t('exportScreen.success'),
        t('exportScreen.successMessage', { path: result.fileName }),
      );
    }
  };

  const run = async (task: () => Promise<void>) => {
    try {
      setBusy(true);
      await task();
    } catch (error) {
      Alert.alert(
        t('exportScreen.failure'),
        error instanceof Error ? error.message : t('common.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  const exportImages = (format: 'png' | 'jpg') =>
    run(async () => {
      if (sides === 'both' || sides === 'front') {
        const result = await exportImage(
          frontRef,
          project.name,
          'front',
          format,
          format === 'jpg' ? quality : 1,
        );
        await finish(result, format);
      }
      if (sides === 'both' || sides === 'back') {
        const result = await exportImage(
          backRef,
          project.name,
          'back',
          format,
          format === 'jpg' ? quality : 1,
        );
        await finish(result, format);
      }
    });

  const exportDocument = () =>
    run(async () => {
      const result = await exportPdf(frontRef, backRef, project.name, sides, bleed);
      await finish(result, 'pdf');
    });

  const exportContact = () =>
    run(async () => {
      const result = await exportVCard(project.contact, project.name);
      await finish(result, 'vcf');
    });

  return (
    <Screen
      title={t('exportScreen.title')}
      subtitle={project.name}
      onBack={() => navigation.goBack()}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={[styles.resolution, { color: theme.textMuted, textAlign }]}>
          {t('exportScreen.resolution', { width: n(CARD_WIDTH), height: n(CARD_HEIGHT) })}
        </Text>

        <View style={styles.previews}>
          <CardCanvas side={project.front} contact={project.contact} width={previewWidth} />
          <CardCanvas side={project.back} contact={project.contact} width={previewWidth} />
        </View>

        <Segmented<SideSelection>
          value={sides}
          onChange={setSides}
          options={[
            { value: 'both', label: t('exportScreen.bothSides') },
            { value: 'front', label: t('exportScreen.frontOnly') },
            { value: 'back', label: t('exportScreen.backOnly') },
          ]}
        />

        <Toggle label={t('exportScreen.includeBleed')} value={bleed} onChange={setBleed} />

        <Slider
          label={t('exportScreen.quality')}
          value={quality}
          min={0.5}
          max={1}
          step={0.02}
          formatValue={(value) => `${Math.round(value * 100)}%`}
          onChange={setQuality}
        />

        <View style={[styles.actions, { flexDirection: rowDirection }]}>
          <Button
            label={t('exportScreen.png')}
            icon={FileImage}
            loading={busy}
            onPress={() => void exportImages('png')}
          />
          <Button
            label={t('exportScreen.jpeg')}
            variant="secondary"
            icon={FileImage}
            loading={busy}
            onPress={() => void exportImages('jpg')}
          />
          <Button
            label={t('exportScreen.pdf')}
            variant="secondary"
            icon={FileText}
            loading={busy}
            onPress={() => void exportDocument()}
          />
          <Button
            label={t('exportScreen.vcard')}
            variant="secondary"
            icon={IdCard}
            loading={busy}
            onPress={() => void exportContact()}
          />
        </View>

        {lastExport ? (
          <View style={[styles.result, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.resultTitle, { color: theme.text, textAlign }]}>
              {t('exportScreen.success')}
            </Text>
            <Text style={[styles.resultPath, { color: theme.textMuted, textAlign }]}>
              {lastExport.fileName}
            </Text>
            <Button
              label={t('exportScreen.share')}
              icon={Share2}
              compact
              variant="ghost"
              onPress={() =>
                void shareFile(
                  lastExport.uri,
                  mimeTypeFor(lastExport.kind as 'png' | 'jpg' | 'pdf' | 'vcf'),
                ).then((shared) => {
                  if (!shared) Alert.alert(t('exportScreen.sharingUnavailable'));
                })
              }
            />
          </View>
        ) : null}
      </ScrollView>

      {/*
        Off-screen render at exactly 1050 × 600 px. react-native-view-shot
        captures these at print resolution regardless of the device screen.
      */}
      <View style={styles.offscreen} pointerEvents="none">
        <CardCanvas
          ref={frontRef}
          side={project.front}
          contact={project.contact}
          width={CARD_WIDTH}
          rounded={false}
        />
        <CardCanvas
          ref={backRef}
          side={project.back}
          contact={project.contact}
          width={CARD_WIDTH}
          rounded={false}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xxl, gap: spacing.md, paddingTop: spacing.md },
  resolution: { fontSize: 12 },
  previews: { gap: spacing.md, alignItems: 'center' },
  actions: { gap: spacing.sm, flexWrap: 'wrap' },
  result: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  resultTitle: { fontSize: 14, fontWeight: '700' },
  resultPath: { fontSize: 12 },
  offscreen: {
    position: 'absolute',
    left: -CARD_WIDTH * 3,
    top: 0,
    opacity: 1,
  },
});
