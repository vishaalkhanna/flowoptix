import { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { chatWithAI } from '../api';

type Message = { role: 'user' | 'ai'; text: string; action?: string };

const SUGGESTIONS = [
    { icon: '📊', text: 'Why is my productivity score low?' },
    { icon: '🤖', text: 'What should I automate first?' },
    { icon: '🔁', text: 'What are my most repetitive tasks?' },
    { icon: '💡', text: 'How can I improve my workflow?' },
    { icon: '📋', text: 'Give me a weekly summary' },
    { icon: '⚡', text: 'Which patterns should I act on?' },
];

const ACTION_KEYWORDS = [
    { keywords: ['email', 'communicate', 'message', 'slack'], action: '📧 Open Email Composer', actionId: 'email' },
    { keywords: ['code', 'vs code', 'vscode', 'development', 'pr'], action: '💻 Open VS Code', actionId: 'vscode' },
    { keywords: ['sheet', 'excel', 'spreadsheet', 'data'], action: '📊 Open Google Sheets', actionId: 'sheets' },
    { keywords: ['meeting', 'calendar', 'schedule'], action: '📅 Open Calendar', actionId: 'calendar' },
    { keywords: ['automate', 'automation', 'rule', 'zapier'], action: '⚡ Go to Automations', actionId: 'automations' },
];

function detectAction(text: string): string | undefined {
    const lower = text.toLowerCase();
    for (const { keywords, action } of ACTION_KEYWORDS) {
        if (keywords.some(k => lower.includes(k))) return action;
    }
    return undefined;
}

export default function Chat() {
    const { colors } = useTheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    const send = async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: msg }]);
        setLoading(true);
        try {
            const reply = await chatWithAI(msg);
            const action = detectAction(reply);
            setMessages(prev => [...prev, { role: 'ai', text: reply, action }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'ai',
                text: 'I couldn\'t get a response right now. Please check your connection and try again.',
            }]);
        } finally {
            setLoading(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
        }
    };

    const handleAction = async (actionId: string) => {
        const urls: Record<string, string> = {
            vscode: 'https://vscode.dev',
            sheets: 'https://docs.google.com/spreadsheets',
            calendar: 'https://calendar.google.com',
        };
        if (!urls[actionId]) return;
        try {
            const supported = await Linking.canOpenURL(urls[actionId]);
            if (!supported) throw new Error('no handler');
            await Linking.openURL(urls[actionId]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'ai',
                text: "I couldn't open that link on this device. Try opening it manually in your browser.",
            }]);
        }
    };

    const s = makeStyles(colors);

    return (
        <KeyboardAvoidingView
            style={s.outer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            <ScrollView
                ref={scrollRef}
                style={s.messages}
                contentContainerStyle={s.messagesContent}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
                {messages.length === 0 && (
                    <View style={s.welcome}>
                        <View style={s.welcomeIconWrap}>
                            <Text style={s.welcomeIcon}>✦</Text>
                        </View>
                        <Text style={s.welcomeTitle}>FlowOptix AI</Text>
                        <Text style={s.welcomeSub}>
                            Ask me anything about your workflow. I have full access to your real tasks, patterns, and productivity data.
                        </Text>
                        <View style={s.suggestionsGrid}>
                            {SUGGESTIONS.map((q, i) => (
                                <TouchableOpacity key={i} style={s.suggestionChip} onPress={() => send(q.text)} testID={`chat-suggestion-${i}`} accessibilityLabel={`chat-suggestion-${i}`}>
                                    <Text style={s.suggestionIcon}>{q.icon}</Text>
                                    <Text style={s.suggestionText}>{q.text}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {messages.map((msg, i) => (
                    <View
                        key={i}
                        style={[s.bubbleWrap, msg.role === 'user' ? s.bubbleWrapUser : s.bubbleWrapAI]}
                        testID={`chat-message-${i}`}
                        accessibilityLabel={`chat-message-${i}`}
                    >
                        {msg.role === 'ai' && (
                            <View style={s.aiAvatar}>
                                <Text style={s.aiAvatarText}>✦</Text>
                            </View>
                        )}
                        <View style={{ maxWidth: '78%' }}>
                            <View style={[s.bubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}>
                                <Text style={[s.bubbleText, msg.role === 'user' ? s.userBubbleText : s.aiBubbleText]}>
                                    {msg.text}
                                </Text>
                            </View>
                            {msg.role === 'ai' && msg.action && (
                                <TouchableOpacity
                                    style={s.actionBtn}
                                    onPress={() => {
                                        const entry = ACTION_KEYWORDS.find(a => a.action === msg.action);
                                        if (entry) handleAction(entry.actionId);
                                    }}
                                    testID={`chat-action-${ACTION_KEYWORDS.find(a => a.action === msg.action)?.actionId ?? 'unknown'}`}
                                    accessibilityLabel={`chat-action-${ACTION_KEYWORDS.find(a => a.action === msg.action)?.actionId ?? 'unknown'}`}
                                >
                                    <Text style={s.actionBtnText}>{msg.action}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}

                {loading && (
                    <View style={[s.bubbleWrap, s.bubbleWrapAI]}>
                        <View style={s.aiAvatar}>
                            <Text style={s.aiAvatarText}>✦</Text>
                        </View>
                        <View style={[s.bubble, s.aiBubble, s.thinkingBubble]}>
                            <ActivityIndicator color={colors.accent} size="small" />
                            <Text style={s.thinkingText}>Thinking…</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={s.inputRow}>
                <TextInput
                    style={s.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Ask about your productivity…"
                    placeholderTextColor={colors.muted}
                    multiline
                    returnKeyType="send"
                    blurOnSubmit
                    onSubmitEditing={() => send()}
                    testID="chat-input"
                    accessibilityLabel="chat-input"
                />
                <TouchableOpacity
                    style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
                    onPress={() => send()}
                    disabled={!input.trim() || loading}
                    testID="chat-send-button"
                    accessibilityLabel="chat-send-button"
                >
                    <Text style={s.sendBtnText}>↑</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const makeStyles = (colors: any) => StyleSheet.create({
    outer: { flex: 1, backgroundColor: colors.bg },
    messages: { flex: 1 },
    messagesContent: { padding: 16, paddingBottom: 8 },

    welcome: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
    welcomeIconWrap: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(124,92,255,0.4)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    welcomeIcon: { color: colors.accent, fontSize: 28 },
    welcomeTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
    welcomeSub: { color: colors.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16, marginBottom: 28 },
    suggestionsGrid: { width: '100%', gap: 8 },
    suggestionChip: {
        backgroundColor: colors.card, borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: colors.border,
        flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    suggestionIcon: { fontSize: 16 },
    suggestionText: { color: colors.text, fontSize: 14, flex: 1 },

    bubbleWrap: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
    bubbleWrapUser: { justifyContent: 'flex-end' },
    bubbleWrapAI: { justifyContent: 'flex-start' },

    aiAvatar: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(124,92,255,0.4)',
        justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 2,
    },
    aiAvatarText: { color: colors.accent, fontSize: 12 },

    bubble: { borderRadius: 18, padding: 14 },
    userBubble: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14, lineHeight: 21 },
    userBubbleText: { color: '#fff' },
    aiBubbleText: { color: colors.text },

    actionBtn: {
        marginTop: 6, backgroundColor: 'rgba(124,92,255,0.15)', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start',
        borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)',
    },
    actionBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },

    thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    thinkingText: { color: colors.muted, fontSize: 13 },

    inputRow: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        paddingHorizontal: 16, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: colors.border,
        backgroundColor: colors.bg,
    },
    input: {
        flex: 1, backgroundColor: colors.card, color: colors.text,
        borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
        fontSize: 14, borderWidth: 1, borderColor: colors.border, maxHeight: 120,
    },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.4 },
    sendBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
