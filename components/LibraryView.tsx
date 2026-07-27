import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { createLocalUserPoem, getLocalSavedPoems, getLocalUserPoems } from '../lib/poems';
import type { SavedPoemScope } from '../lib/poems';
import type { Poem } from '../lib/types';
import { styles } from '../styles/styles';
import { PoemReaderView } from './PoemReaderView';
import { PoemScannerView } from './PoemScannerView';

type LibraryTab = 'saved' | 'your-poems';

interface LibraryViewProps {
  isDatabaseReady: boolean;
  isPoemSaved: (poemId: string, poemScope?: SavedPoemScope) => boolean;
  onClose: () => void;
  onToggleSaved: (poemId: string, poemScope?: SavedPoemScope) => Promise<void> | void;
  onUserPoemCreated?: (poem: Poem) => void;
  onOpenAccount: () => void;
  refreshKey: number;
}

function getPoemPreview(poem: Poem): string {
  return poem.content.replace(/\s+/g, ' ').trim();
}

export function LibraryView({
  isDatabaseReady,
  isPoemSaved,
  onClose,
  onToggleSaved,
  onUserPoemCreated,
  onOpenAccount,
  refreshKey,
}: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('saved');
  const [savedPoems, setSavedPoems] = useState<Poem[]>([]);
  const [userPoems, setUserPoems] = useState<Poem[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [isCreatingPoem, setIsCreatingPoem] = useState(false);
  const [isScanningPoem, setIsScanningPoem] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftLanguage, setDraftLanguage] = useState<'en' | 'ur'>('en');
  const [draftError, setDraftError] = useState<string | null>(null);

  const loadSavedPoems = useCallback(() => {
    if (!isDatabaseReady) {
      setSavedPoems([]);
      return;
    }
    setSavedPoems([
      ...getLocalSavedPoems({ limit: 200, poemScope: 'catalogue' }),
      ...getLocalSavedPoems({ limit: 200, poemScope: 'user' }),
    ]);
  }, [isDatabaseReady]);

  const loadUserPoems = useCallback(() => {
    if (!isDatabaseReady) {
      setUserPoems([]);
      return;
    }
    setUserPoems(getLocalUserPoems({ limit: 200 }));
  }, [isDatabaseReady]);

  useEffect(() => {
    loadSavedPoems();
    loadUserPoems();
  }, [loadSavedPoems, loadUserPoems, refreshKey]);

  const selectedPoemSaved = useMemo(
    () => (selectedPoem ? isPoemSaved(selectedPoem.id, selectedPoem.source === 'user' ? 'user' : 'catalogue') : false),
    [isPoemSaved, selectedPoem]
  );

  const handleToggleSelectedSaved = useCallback(
    async (poemId: string, poemScope?: SavedPoemScope) => {
      await onToggleSaved(poemId, poemScope);
      loadSavedPoems();
      if (selectedPoem?.id === poemId && selectedPoemSaved) {
        setSelectedPoem(null);
      }
    },
    [loadSavedPoems, onToggleSaved, selectedPoem, selectedPoemSaved]
  );

  const resetPoemForm = useCallback(() => {
    setDraftTitle('');
    setDraftAuthor('');
    setDraftContent('');
    setDraftLanguage('en');
    setDraftError(null);
  }, []);

  const handleStartCreatingPoem = useCallback(() => {
    resetPoemForm();
    setIsCreatingPoem(true);
  }, [resetPoemForm]);

  const handleCancelCreatingPoem = useCallback(() => {
    resetPoemForm();
    setIsCreatingPoem(false);
  }, [resetPoemForm]);

  const handleStartScanningPoem = useCallback(() => {
    resetPoemForm();
    setIsScanningPoem(true);
  }, [resetPoemForm]);

  const handleSaveCreatedPoem = useCallback(() => {
    if (!draftContent.trim()) {
      setDraftError('Add poem text before saving.');
      return;
    }

    const poem = createLocalUserPoem({
      title: draftTitle,
      author: draftAuthor,
      content: draftContent,
      language: draftLanguage,
    });

    resetPoemForm();
    setIsCreatingPoem(false);
    setActiveTab('your-poems');
    loadUserPoems();
    setSelectedPoem(poem);
    onUserPoemCreated?.(poem);
  }, [draftAuthor, draftContent, draftLanguage, draftTitle, loadUserPoems, onUserPoemCreated, resetPoemForm]);

  if (isScanningPoem) {
    return (
      <PoemScannerView
        onCancel={() => setIsScanningPoem(false)}
        onScanned={(poem) => {
          setDraftTitle(poem.title ?? '');
          setDraftAuthor(poem.author ?? '');
          setDraftContent(poem.content);
          setDraftLanguage(poem.language ?? 'en');
          setDraftError(null);
          setIsScanningPoem(false);
          setIsCreatingPoem(true);
        }}
      />
    );
  }

  if (selectedPoem) {
    return (
      <View style={styles.libraryDetailContainer}>
        <View style={styles.libraryDetailHeader}>
          <Pressable
            onPress={() => setSelectedPoem(null)}
            style={({ pressed }) => [styles.libraryHeaderButton, pressed && styles.saveButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to My Library"
            accessibilityHint="Returns to your saved poems list."
            hitSlop={8}
          >
            <Text style={styles.libraryHeaderButtonText}>Back</Text>
          </Pressable>
          <View style={styles.libraryHeaderActions}>
            <Pressable
              onPress={onOpenAccount}
              style={({ pressed }) => [styles.libraryHeaderButton, pressed && styles.saveButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open account"
              accessibilityHint="Shows sign-in, sync, and account controls."
              hitSlop={8}
            >
              <Text style={styles.libraryHeaderButtonText}>Account</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.libraryHeaderButton, pressed && styles.saveButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Close My Library"
              accessibilityHint="Returns to the poem reader."
              hitSlop={8}
            >
              <Text style={styles.libraryHeaderButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
        <PoemReaderView
          poem={selectedPoem}
          isSaved={selectedPoemSaved}
          onToggleSaved={handleToggleSelectedSaved}
          canSave={isDatabaseReady}
        />
      </View>
    );
  }

  const renderPoemRow = (item: Poem, hint: string) => (
    <Pressable
      onPress={() => setSelectedPoem(item)}
      style={({ pressed }) => [styles.libraryRow, pressed && styles.libraryRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} by ${item.author}`}
      accessibilityHint={hint}
    >
      <Text style={styles.libraryRowTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.libraryRowAuthor} numberOfLines={1}>
        {item.author}
      </Text>
      <Text style={styles.libraryRowPreview} numberOfLines={2}>
        {getPoemPreview(item)}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.libraryContainer}>
      <View style={styles.libraryContent}>
        <View style={styles.libraryHeader}>
          <View style={styles.libraryHeaderTop}>
            <Text style={styles.libraryTitle}>My Library</Text>
            <View style={styles.libraryHeaderActions}>
              <Pressable
                onPress={onOpenAccount}
                style={({ pressed }) => [styles.libraryHeaderButton, pressed && styles.saveButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Open account"
                accessibilityHint="Shows sign-in, sync, and account controls."
                hitSlop={8}
              >
                <Text style={styles.libraryHeaderButtonText}>Account</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.libraryHeaderButton, pressed && styles.saveButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Close My Library"
                accessibilityHint="Returns to the poem reader."
                hitSlop={8}
              >
                <Text style={styles.libraryHeaderButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.librarySubtitle}>Saved poems and personal work</Text>
        </View>

        <View style={styles.librarySegmentedControl} accessibilityRole="tablist">
          <Pressable
            onPress={() => setActiveTab('saved')}
            style={({ pressed }) => [
              styles.librarySegment,
              activeTab === 'saved' && styles.librarySegmentActive,
              pressed && styles.saveButtonPressed,
            ]}
            accessibilityRole="tab"
            accessibilityLabel="Saved poems"
            accessibilityHint="Shows poems you have saved."
            accessibilityState={{ selected: activeTab === 'saved' }}
          >
            <Text style={[styles.librarySegmentText, activeTab === 'saved' && styles.librarySegmentTextActive]}>
              Saved
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('your-poems')}
            style={({ pressed }) => [
              styles.librarySegment,
              activeTab === 'your-poems' && styles.librarySegmentActive,
              pressed && styles.saveButtonPressed,
            ]}
            accessibilityRole="tab"
            accessibilityLabel="Your Poems"
            accessibilityHint="Shows poems you have written locally."
            accessibilityState={{ selected: activeTab === 'your-poems' }}
          >
            <Text style={[styles.librarySegmentText, activeTab === 'your-poems' && styles.librarySegmentTextActive]}>
              Your Poems
            </Text>
          </Pressable>
        </View>

        {activeTab === 'saved' ? (
          <FlatList
            data={savedPoems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={savedPoems.length ? styles.libraryListContent : styles.libraryEmptyListContent}
            renderItem={({ item }) => renderPoemRow(item, 'Opens this saved poem.')}
            ListEmptyComponent={
              <View style={styles.libraryEmptyState}>
                <Text style={styles.libraryEmptyTitle}>No saved poems yet</Text>
                <Text style={styles.libraryEmptyText}>
                  Save poems from the reader and they will appear here.
                </Text>
              </View>
            }
          />
        ) : isCreatingPoem ? (
          <ScrollView
            contentContainerStyle={styles.libraryFormContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.libraryFormHeader}>
              <View style={styles.libraryFormTitleGroup}>
                <Text style={styles.librarySectionTitle}>Review poem</Text>
                <Text style={styles.libraryFormSubtitle}>Edit anything before adding it to your library.</Text>
              </View>
              <Pressable
                onPress={handleCancelCreatingPoem}
                style={({ pressed }) => [styles.librarySmallButton, pressed && styles.saveButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Cancel adding poem"
                accessibilityHint="Returns to your poems without saving."
              >
                <Text style={styles.librarySmallButtonText}>Cancel</Text>
              </Pressable>
            </View>

            <View style={styles.libraryFieldGroup}>
              <Text style={styles.libraryFieldLabel}>Title</Text>
              <TextInput
                value={draftTitle}
                onChangeText={setDraftTitle}
                style={styles.libraryTextInput}
                placeholder="Untitled"
                placeholderTextColor="#a09a91"
                accessibilityLabel="Poem title"
                accessibilityHint="Optional. Blank titles are saved as Untitled."
                returnKeyType="next"
              />
            </View>

            <View style={styles.libraryFieldGroup}>
              <Text style={styles.libraryFieldLabel}>Author</Text>
              <TextInput
                value={draftAuthor}
                onChangeText={setDraftAuthor}
                style={styles.libraryTextInput}
                placeholder="Anonymous"
                placeholderTextColor="#a09a91"
                accessibilityLabel="Poem author"
                accessibilityHint="Optional. Blank authors are saved as Anonymous."
                returnKeyType="next"
              />
            </View>

            <View style={styles.libraryFieldGroup}>
              <Text style={styles.libraryFieldLabel}>Poem</Text>
              <TextInput
                value={draftContent}
                onChangeText={(value) => {
                  setDraftContent(value);
                  if (draftError && value.trim()) {
                    setDraftError(null);
                  }
                }}
                style={[styles.libraryTextInput, styles.libraryContentInput]}
                placeholder="Write or paste your poem"
                placeholderTextColor="#a09a91"
                accessibilityLabel="Poem content"
                accessibilityHint="Required. Enter the poem text to save."
                multiline
                textAlignVertical="top"
              />
              {draftError ? (
                <Text style={styles.libraryFieldError} accessibilityRole="alert">
                  {draftError}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={handleSaveCreatedPoem}
              style={({ pressed }) => [styles.libraryPrimaryButton, pressed && styles.saveButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Save poem"
              accessibilityHint="Saves this poem locally and opens it."
            >
              <Text style={styles.libraryPrimaryButtonText}>Save poem</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <>
            <View style={styles.libraryListHeader}>
              <Text style={styles.librarySectionTitle}>Your Poems</Text>
              <View style={styles.libraryHeaderActions}>
                <Pressable
                  onPress={handleStartScanningPoem}
                  style={({ pressed }) => [styles.librarySmallButton, pressed && styles.saveButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Scan poem"
                  accessibilityHint="Opens the camera to extract a poem from an image."
                >
                  <Text style={styles.librarySmallButtonText}>Scan</Text>
                </Pressable>
                <Pressable
                  onPress={handleStartCreatingPoem}
                  style={({ pressed }) => [styles.librarySmallButton, pressed && styles.saveButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Add poem manually"
                  accessibilityHint="Opens a local form for writing or pasting a poem."
                >
                  <Text style={styles.librarySmallButtonText}>Add</Text>
                </Pressable>
              </View>
            </View>
            <FlatList
              data={userPoems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={userPoems.length ? styles.libraryListContent : styles.libraryEmptyListContent}
              renderItem={({ item }) => renderPoemRow(item, 'Opens this poem.')}
              ListEmptyComponent={
                <View style={styles.libraryEmptyState}>
                  <Text style={styles.libraryEmptyTitle}>No poems yet</Text>
                  <Text style={styles.libraryEmptyText}>
                    Add a poem here and it will stay available on this device.
                  </Text>
                </View>
              }
            />
          </>
        )}
      </View>
    </View>
  );
}
