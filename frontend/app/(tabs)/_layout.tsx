import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const tabOpts = (testId: string, title: string, icon: (args: any) => React.ReactNode): any => ({
  title,
  tabBarIcon: icon,
  tabBarTestID: testId,
  tabBarAccessibilityLabel: testId,
});

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
    }}>
      <Tabs.Screen
        name="index"
        options={tabOpts('tab-dashboard', 'Dashboard', ({ color }) => <Ionicons name="bar-chart" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="tasks"
        options={tabOpts('tab-tasks', 'Log Task', ({ color }) => <Ionicons name="add-circle" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="patterns"
        options={tabOpts('tab-patterns', 'Patterns', ({ color }) => <Ionicons name="bulb" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="automations"
        options={tabOpts('tab-automate', 'Automate', ({ color }) => <Ionicons name="flash" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="chat"
        options={tabOpts('tab-chat', 'AI Chat', ({ color }) => <Ionicons name="chatbubble-ellipses" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="profile"
        options={tabOpts('tab-profile', 'Profile', ({ color }) => <Ionicons name="person-circle" size={24} color={color} />)}
      />
    </Tabs>
  );
}
