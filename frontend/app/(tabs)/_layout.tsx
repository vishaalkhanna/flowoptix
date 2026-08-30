import { Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

// Map each screen name to its web href.
const TAB_HREFS: Record<string, string> = {
  index: '/',
  tasks: '/tasks',
  patterns: '/patterns',
  automations: '/automations',
  chat: '/chat',
  profile: '/profile',
};

// On web: render an <a> so Selenium finds data-testid and Ctrl/Cmd+click works.
// On native: omit tabBarButton entirely — React Navigation's default button is
// used; tabBarTestID and tabBarAccessibilityLabel remain for Appium.
const tabOpts = (testId: string, screenName: string, title: string, icon: (args: any) => React.ReactNode): any => {
  const href = TAB_HREFS[screenName] ?? `/${screenName}`;

  const webAnchorButton = (props: any) => (
    <a
      href={href}
      {...({ 'data-testid': testId } as any)}
      aria-label={testId}
      aria-selected={props.accessibilityState?.selected}
      style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        color: 'inherit',
      } as any}
      onClick={(e: any) => {
        e.preventDefault();
        router.navigate(href as any);
      }}
    >
      {props.children}
    </a>
  );

  return {
    title,
    tabBarIcon: icon,
    tabBarTestID: testId,
    tabBarAccessibilityLabel: testId,
    ...(Platform.OS === 'web' ? { tabBarButton: webAnchorButton } : {}),
  };
};

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
        options={tabOpts('tab-dashboard', 'index', 'Dashboard', ({ color }) => <Ionicons name="bar-chart" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="tasks"
        options={tabOpts('tab-tasks', 'tasks', 'Log Task', ({ color }) => <Ionicons name="add-circle" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="patterns"
        options={tabOpts('tab-patterns', 'patterns', 'Patterns', ({ color }) => <Ionicons name="bulb" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="automations"
        options={tabOpts('tab-automate', 'automations', 'Automate', ({ color }) => <Ionicons name="flash" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="chat"
        options={tabOpts('tab-chat', 'chat', 'AI Chat', ({ color }) => <Ionicons name="chatbubble-ellipses" size={24} color={color} />)}
      />
      <Tabs.Screen
        name="profile"
        options={tabOpts('tab-profile', 'profile', 'Profile', ({ color }) => <Ionicons name="person-circle" size={24} color={color} />)}
      />
    </Tabs>
  );
}
