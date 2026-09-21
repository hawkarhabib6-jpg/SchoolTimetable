import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Wand2 } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useEditor } from '@/context/EditorContext';
import { useSettings } from '@/context/SettingsContext';
import { spacing } from '@/theme/layout';
import type { CardContact, TextElement } from '@/types/card';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Contact details drive the vCard QR and can repopulate the card text. */
export function ContactPanel({ visible, onClose }: Props) {
  const { t, theme, textAlign } = useSettings();
  const { project, setContact, replaceSides } = useEditor();
  const contact = project.contact;

  const field = (key: keyof CardContact, label: string, keyboardType?: 'email-address' | 'phone-pad' | 'url') => (
    <TextField
      label={label}
      value={contact[key]}
      onChangeText={(value) => setContact({ [key]: value } as Partial<CardContact>)}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType ? 'none' : 'words'}
    />
  );

  /**
   * Replaces the card's text elements with the contact values, matching by
   * position: the largest text becomes the name, the next the job title, and
   * the remaining ones the contact rows.
   */
  const fillFromContact = () => {
    const rows = [contact.phone, contact.email, contact.website, contact.address].filter(
      (value) => value.trim().length > 0,
    );

    const applyTo = (elements: TextElement[]) => {
      const sorted = [...elements].sort((a, b) => b.fontSize - a.fontSize);
      const values = [contact.fullName, contact.jobTitle, ...rows, contact.company];
      const mapping = new Map<string, string>();
      sorted.forEach((element, index) => {
        const value = values[index];
        if (value && value.trim()) mapping.set(element.id, value);
      });
      return mapping;
    };

    const frontTexts = project.front.elements.filter(
      (element): element is TextElement => element.type === 'text',
    );
    const backTexts = project.back.elements.filter(
      (element): element is TextElement => element.type === 'text',
    );
    const frontMap = applyTo(frontTexts);
    const backMap = new Map<string, string>();
    if (backTexts.length) {
      const primary = [...backTexts].sort((a, b) => b.fontSize - a.fontSize)[0];
      if (contact.company.trim()) backMap.set(primary.id, contact.company);
    }

    replaceSides(
      {
        ...project.front,
        elements: project.front.elements.map((element) =>
          element.type === 'text' && frontMap.has(element.id)
            ? { ...element, text: frontMap.get(element.id) as string }
            : element,
        ),
      },
      {
        ...project.back,
        elements: project.back.elements.map((element) =>
          element.type === 'text' && backMap.has(element.id)
            ? { ...element, text: backMap.get(element.id) as string }
            : element,
        ),
      },
    );
    onClose();
  };

  return (
    <Sheet visible={visible} title={t('contact.title')} onClose={onClose} maxHeight={0.9}>
      <Text style={[styles.hint, { color: theme.textMuted, textAlign }]}>{t('contact.hint')}</Text>
      {field('fullName', t('contact.fullName'))}
      {field('jobTitle', t('contact.jobTitle'))}
      {field('company', t('contact.company'))}
      {field('phone', t('contact.phone'), 'phone-pad')}
      {field('altPhone', t('contact.altPhone'), 'phone-pad')}
      {field('email', t('contact.email'), 'email-address')}
      {field('website', t('contact.website'), 'url')}
      {field('address', t('contact.address'))}
      {field('note', t('contact.note'))}
      <View style={styles.action}>
        <Button label={t('contact.fillCard')} icon={Wand2} onPress={fillFromContact} fullWidth />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, marginBottom: spacing.md },
  action: { marginTop: spacing.sm },
});
