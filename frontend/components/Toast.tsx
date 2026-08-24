import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onHide: () => void;
}

export default function Toast({ message, type, onHide }: ToastProps) {
    useEffect(() => {
        const t = setTimeout(onHide, 3500);
        return () => clearTimeout(t);
    }, [message]);

    const config = {
        success: { bg: '#16A34A', icon: '✓' },
        error:   { bg: '#DC2626', icon: '✕' },
        info:    { bg: '#7C5CFF', icon: 'i' },
        warning: { bg: '#D97706', icon: '⚠' },
    }[type];

    return (
        <View style={[styles.wrap, { backgroundColor: config.bg }]} testID="toast-message" accessibilityLabel="toast-message">
            <View style={styles.iconCircle}>
                <Text style={styles.icon}>{config.icon}</Text>
            </View>
            <Text style={styles.msg} numberOfLines={3}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 12,
    },
    iconCircle: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center', alignItems: 'center',
        flexShrink: 0,
    },
    icon: { color: '#fff', fontSize: 13, fontWeight: '800' },
    msg: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },
});
