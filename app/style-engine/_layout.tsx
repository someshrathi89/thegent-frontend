import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

const COLORS = {
  background: '#F9F8F4',
};

export default function StyleEngineLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}
