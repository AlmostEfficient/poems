import { Stack } from 'expo-router';
import { useAppColors } from '../../../styles/theme';

export default function ReadLayout() {
  const colors = useAppColors();
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ title: '' }} />
    </Stack>
  );
}

