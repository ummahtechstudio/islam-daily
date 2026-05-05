import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store';
import { Colors, palette } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { MinaretIcon, PrayerBeadsIcon } from '../../src/components/icons';

function TabIcon({
  name,
  color,
  size,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size: number;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const settingsScheme = useStore((s) => s.settings.colorScheme);
  const insets = useSafeAreaInsets();

  const isDark =
    settingsScheme === 'dark' ||
    (settingsScheme === 'system' && colorScheme === 'dark');

  // Tab bar uses deeper green for slight contrast against main content
  const tabBarBg = isDark ? palette.greenDeep : Colors.light.tabBar;
  const tabBarBorder = isDark ? palette.divider : Colors.light.tabBarBorder;
  const inactiveTint = isDark ? palette.textMuted : Colors.light.textMuted;

  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: tabBarBorder,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: 'Quran',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: 'Prayer',
          tabBarIcon: ({ color, size }) => (
            <MinaretIcon color={color} size={size} strokeWidth={1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="dua"
        options={{
          title: 'Dua',
          tabBarIcon: ({ color, size }) => (
            <PrayerBeadsIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="grid-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
