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

// tabBarButton renders an <a> on web so:
//  1. data-testid is present for Selenium
//  2. clicking calls router.navigate for SPA navigation (no full reload)
//  3. Ctrl/Cmd+click still opens in a new tab (browser default for <a>)
const tabOpts = (testId: string, screenName: string, title: string, icon: (args: any) => React.ReactNode): any => ({
  title,
  tabBarIcon: icon,
  tabBarTestID: testId,
  tabBarAccessibilityLabel: testId,
  tabBarButton: (props: any) => {
    const href = TAB_HREFS[screenName] ?? `/${screenName}`;
    return (
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
  },
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
