import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SegmentedPicker } from '../components/segmented-picker';
import {
  createLocalUserPoem,
  getPoemById,
  updateLocalUserPoem,
} from '../lib/poems';
import { usePoemsApp } from '../providers/poems-app-provider';
import { type, useAppColors } from '../styles/theme';

export default function AddPoemScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colors = useAppColors();
  const {
    feed,
    pendingDraft,
    setPendingDraft,
    notifyUserPoemChanged,
  } = usePoemsApp();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(id);

  useEffect(() => {
    if (id && feed.isDatabaseReady) {
      const poem = getPoemById(id);
      if (poem?.source === 'user') {
        setTitle(poem.title);
        setAuthor(poem.author);
        setContent(poem.content);
        setLanguage(poem.language);
      }
      return;
    }

    if (pendingDraft) {
      setTitle(pendingDraft.title ?? '');
      setAuthor(pendingDraft.author ?? '');
      setContent(pendingDraft.content);
      setLanguage(pendingDraft.language ?? 'en');
      setPendingDraft(null);
    }
  }, [feed.isDatabaseReady, id, pendingDraft, setPendingDraft]);

  const canSave = useMemo(() => Boolean(content.trim()) && !isSaving, [content, isSaving]);

  const savePoem = () => {
    if (!content.trim()) {
      setError('Add the poem text before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const poem = id
        ? updateLocalUserPoem({
            poemId: id,
            title,
            author,
            content,
            language,
          })
        : createLocalUserPoem({ title, author, content, language });

      if (!poem) {
        setError('This poem could not be found.');
        return;
      }

      notifyUserPoemChanged(poem);
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (isEditing) {
        router.back();
      } else {
        router.replace({ pathname: '/poem/[id]', params: { id: poem.id } });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The poem could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.intro}>
            <Text selectable style={[styles.introTitle, { color: colors.ink }]}>
              {isEditing ? 'Shape the poem until it feels right.' : 'Bring a poem into your library.'}
            </Text>
            <Text selectable style={[styles.introBody, { color: colors.secondary }]}>
              Everything is saved on this device first, so it stays available offline.
            </Text>
          </View>

          {!isEditing && !content ? (
            <Pressable
              onPress={() => router.replace('/scanner')}
              style={({ pressed }) => [
                styles.scanCard,
                { backgroundColor: colors.accentSoft, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scan a printed poem"
            >
              <View style={[styles.scanIcon, { backgroundColor: colors.surface }]}>
                <Text style={[styles.scanIconText, { color: colors.accent }]}>▣</Text>
              </View>
              <View style={styles.scanCopy}>
                <Text style={[styles.scanTitle, { color: colors.ink }]}>Scan a printed poem</Text>
                <Text style={[styles.scanBody, { color: colors.secondary }]}>
                  Photograph a page and review the extracted text.
                </Text>
              </View>
              <Text style={[styles.chevron, { color: colors.tertiary }]}>›</Text>
            </Pressable>
          ) : null}

          <View style={styles.form}>
            <FieldLabel label="Title" optional />
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={[
                styles.input,
                { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              placeholder="Untitled"
              placeholderTextColor={colors.tertiary}
              returnKeyType="next"
              accessibilityLabel="Poem title"
            />

            <FieldLabel label="Poet" optional />
            <TextInput
              value={author}
              onChangeText={setAuthor}
              style={[
                styles.input,
                { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              placeholder="Anonymous"
              placeholderTextColor={colors.tertiary}
              returnKeyType="next"
              accessibilityLabel="Poet"
            />

            <FieldLabel label="Language" />
            <SegmentedPicker
              value={language}
              options={[
                { value: 'en', label: 'English' },
                { value: 'ur', label: 'Urdu' },
              ]}
              onChange={setLanguage}
            />

            <FieldLabel label="Poem" />
            <TextInput
              value={content}
              onChangeText={(value) => {
                setContent(value);
                if (value.trim()) setError(null);
              }}
              style={[
                styles.input,
                styles.poemInput,
                {
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  borderColor: error ? colors.danger : colors.border,
                  fontFamily: language === 'ur' ? 'NotoNastaliqUrdu_400Regular' : type.prose,
                  textAlign: language === 'ur' ? 'right' : 'left',
                  writingDirection: language === 'ur' ? 'rtl' : 'ltr',
                },
              ]}
              placeholder="Write or paste the poem here"
              placeholderTextColor={colors.tertiary}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Poem text"
            />
            {error ? (
              <Text selectable accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
                {error}
              </Text>
            ) : (
              <Text style={[styles.helper, { color: colors.tertiary }]}>
                Blank titles become Untitled; blank poets become Anonymous.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Stack.Screen options={{ title: isEditing ? 'Edit poem' : 'Add a poem' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>
          <Stack.Toolbar.Label>Cancel</Stack.Toolbar.Label>
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button disabled={!canSave} variant="done" onPress={savePoem}>
          <Stack.Toolbar.Label>{isSaving ? 'Saving…' : 'Save'}</Stack.Toolbar.Label>
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

function FieldLabel({ label, optional = false }: { label: string; optional?: boolean }) {
  const colors = useAppColors();
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      {optional ? <Text style={[styles.optional, { color: colors.tertiary }]}>Optional</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 80,
  },
  intro: {
    gap: 7,
  },
  introTitle: {
    fontFamily: type.display,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  introBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  scanCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  scanIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  scanIconText: {
    fontSize: 22,
  },
  scanCopy: {
    flex: 1,
    gap: 3,
  },
  scanTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  scanBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 28,
    fontWeight: '300',
  },
  form: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  optional: {
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 15,
    borderCurve: 'continuous',
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  poemInput: {
    minHeight: 260,
    fontSize: 17,
    lineHeight: 27,
  },
  error: {
    paddingHorizontal: 3,
    fontSize: 13,
    lineHeight: 18,
  },
  helper: {
    paddingHorizontal: 3,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.985 }],
  },
});

