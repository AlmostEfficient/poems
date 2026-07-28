import { Stack } from 'expo-router';
import { useAppColors } from '../../../styles/theme';

export default function LibraryLayout() {
  const colors = useAppColors();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Library' }} />
    </Stack>
  );
}
