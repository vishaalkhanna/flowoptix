import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const darkColors = {
    bg: '#0A0A0F',
    card: '#14141C',
    border: '#1F1F2A',
    text: '#F5F5F7',
    subtext: '#A0A0B0',
    muted: '#6A6A7A',
    accent: '#7C5CFF',
    success: '#4ADE80',
    warning: '#F59E0B',
    danger: '#EF4444',
    input: '#14141C',
};

export const lightColors = {
    bg: '#F5F5F7',
    card: '#FFFFFF',
    border: '#E5E5EA',
    text: '#1A1A2E',
    subtext: '#4A4A5A',
    muted: '#8A8A9A',
    accent: '#7C5CFF',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    input: '#FFFFFF',
};

type Colors = typeof darkColors;

interface ThemeContextType {
    isDark: boolean;
    toggleTheme: () => void;
    colors: Colors;
}

const ThemeContext = createContext<ThemeContextType>({
    isDark: true,
    toggleTheme: () => {},
    colors: darkColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem('flowoptix_theme');
                if (saved) setIsDark(saved === 'dark');
                else setIsDark(systemScheme !== 'light');
            } catch {
                setIsDark(systemScheme !== 'light');
            }
        })();
    }, []);

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev;
            AsyncStorage.setItem('flowoptix_theme', next ? 'dark' : 'light').catch(() => {});
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, colors: isDark ? darkColors : lightColors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
