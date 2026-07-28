import { router } from 'expo-router';

import { PoemScannerView } from '../components/PoemScannerView';
import { usePoemsApp } from '../providers/poems-app-provider';

export default function ScannerScreen() {
  const { setPendingDraft } = usePoemsApp();
  return (
    <PoemScannerView
      onCancel={() => router.back()}
      onScanned={(poem) => {
        setPendingDraft(poem);
        router.replace('/add-poem');
      }}
    />
  );
}

