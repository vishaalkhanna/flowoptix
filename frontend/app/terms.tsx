import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={s.section}>
            <Text style={s.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return <Text style={s.body}>{children}</Text>;
}

function Li({ children }: { children: React.ReactNode }) {
    return (
        <View style={s.listItem}>
            <Text style={s.bullet}>•</Text>
            <Text style={[s.body, s.listBody]}>{children}</Text>
        </View>
    );
}

export default function TermsScreen() {
    const router = useRouter();

    return (
        <View style={s.root}>
            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
            >
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={18} color="#A855F7" />
                    <Text style={s.backText}>Back</Text>
                </Pressable>

                <Text style={s.pageTitle}>Terms of Service</Text>
                <Text style={s.meta}>Last updated: May 28, 2026</Text>
                <View style={s.divider} />

                <P>
                    Please read these Terms of Service carefully before using FlowOptix.
                    By accessing or using the service you agree to be bound by these terms.
                </P>

                <Section title="1. Acceptance of Terms">
                    <P>
                        By creating an account or using FlowOptix ("the Service"), you agree
                        to these Terms of Service and our Privacy Policy. If you do not agree,
                        do not use the Service.
                    </P>
                    <P>
                        These Terms constitute a legally binding agreement between you and
                        FlowOptix. You must be at least 13 years of age to use the Service.
                    </P>
                </Section>

                <Section title="2. Description of Service">
                    <P>
                        FlowOptix is a productivity intelligence platform that analyzes your
                        workflow data — including emails, calendar events, and task history —
                        to surface patterns, surface insights, and help you optimize how you
                        work. The Service uses artificial intelligence to detect productivity
                        patterns and generate recommendations.
                    </P>
                </Section>

                <Section title="3. User Accounts">
                    <P>
                        You may sign in to FlowOptix using Google OAuth or a magic link sent
                        to your email address. You are responsible for:
                    </P>
                    <Li>Maintaining the confidentiality of your account credentials.</Li>
                    <Li>All activity that occurs under your account.</Li>
                    <Li>Notifying us immediately of any unauthorized use.</Li>
                    <P>
                        We reserve the right to suspend or terminate accounts that violate
                        these Terms.
                    </P>
                </Section>

                <Section title="4. User Data & Privacy">
                    <P>
                        Your use of the Service is also governed by our Privacy Policy. By
                        using FlowOptix you consent to the collection and use of your data
                        as described therein. We do not sell your personal data to third
                        parties.
                    </P>
                </Section>

                <Section title="5. Acceptable Use">
                    <P>You agree not to:</P>
                    <Li>Use the Service for any unlawful purpose or in violation of any regulations.</Li>
                    <Li>Attempt to gain unauthorized access to any part of the Service or its infrastructure.</Li>
                    <Li>Transmit any harmful, offensive, or disruptive content through the Service.</Li>
                    <Li>Reverse-engineer, decompile, or disassemble any part of the Service.</Li>
                    <Li>Use the Service to compete with or replicate FlowOptix.</Li>
                    <Li>Interfere with the proper operation of the Service.</Li>
                </Section>

                <Section title="6. Intellectual Property">
                    <P>
                        All content, features, and functionality of FlowOptix — including
                        but not limited to software, design, text, graphics, and AI models —
                        are owned by FlowOptix and protected by applicable intellectual
                        property laws.
                    </P>
                    <P>
                        You retain ownership of all data you provide to the Service. By
                        using FlowOptix you grant us a limited, non-exclusive license to
                        process your data solely for the purpose of providing the Service
                        to you.
                    </P>
                </Section>

                <Section title="7. Third-Party Services">
                    <P>
                        FlowOptix integrates with the following third-party services. Your
                        use of these integrations is also subject to their respective terms:
                    </P>
                    <Li>
                        Google (OAuth, Gmail API, Google Calendar API) — governed by
                        Google's Terms of Service and Privacy Policy.
                    </Li>
                    <Li>
                        Zapier — governed by Zapier's Terms of Service and Privacy Policy.
                    </Li>
                    <Li>
                        Anthropic Claude — used for AI-powered pattern detection and
                        insight generation.
                    </Li>
                    <P>
                        FlowOptix is not responsible for the practices or content of
                        third-party services.
                    </P>
                </Section>

                <Section title="8. Disclaimer of Warranties">
                    <P>
                        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                        WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                        PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                    </P>
                    <P>
                        We do not warrant that the Service will be uninterrupted, error-free,
                        or free of harmful components, or that any defects will be corrected.
                        AI-generated insights are provided for informational purposes only
                        and do not constitute professional advice.
                    </P>
                </Section>

                <Section title="9. Limitation of Liability">
                    <P>
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, FLOWOPTIX AND ITS OFFICERS,
                        DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY
                        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                        OR ANY LOSS OF PROFITS OR DATA, ARISING OUT OF OR RELATED TO YOUR
                        USE OF THE SERVICE.
                    </P>
                    <P>
                        OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING OUT OF OR RELATING
                        TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID
                        US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
                    </P>
                </Section>

                <Section title="10. Changes to Terms">
                    <P>
                        We may update these Terms from time to time. We will notify you of
                        material changes by updating the "Last updated" date at the top of
                        this page and, where appropriate, by sending an email notification.
                        Your continued use of the Service after changes take effect
                        constitutes acceptance of the revised Terms.
                    </P>
                </Section>

                <Section title="11. Contact Information">
                    <P>
                        If you have questions about these Terms of Service, please contact
                        us at:
                    </P>
                    <P style={{ color: '#A855F7' }}>vk8608vishaalkhanna@gmail.com</P>
                </Section>

                <View style={s.footer}>
                    <Text style={s.footerText}>FlowOptix · Terms of Service</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root:   { flex: 1, backgroundColor: '#0A0A0F' },
    scroll: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 60 },

    backBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginBottom: 32, alignSelf: 'flex-start',
    },
    backText: { color: '#A855F7', fontSize: 15, fontWeight: '500' },

    pageTitle: {
        fontSize: 32, fontWeight: '800', color: '#ffffff',
        letterSpacing: -0.5, marginBottom: 6,
    },
    meta:    { fontSize: 13, color: '#555555', marginBottom: 20 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 28 },

    section:      { marginBottom: 32 },
    sectionTitle: {
        fontSize: 17, fontWeight: '700', color: '#A855F7',
        marginBottom: 12, letterSpacing: 0.1,
    },
    body: { fontSize: 14, color: '#aaaaaa', lineHeight: 22, marginBottom: 10 },

    listItem: { flexDirection: 'row', marginBottom: 8, paddingLeft: 4 },
    bullet:   { color: '#555555', fontSize: 14, marginRight: 10, lineHeight: 22 },
    listBody: { flex: 1, marginBottom: 0 },

    footer:     { marginTop: 20, alignItems: 'center' },
    footerText: { fontSize: 12, color: '#333333' },
});
