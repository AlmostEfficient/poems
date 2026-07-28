import { Stack } from 'expo-router';
import { useAppColors } from '../../../styles/theme';

export default function SearchLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Search' }} />
    </Stack>
  );
}
