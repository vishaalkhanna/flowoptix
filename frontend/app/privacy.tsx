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

function P({ children, style }: { children: React.ReactNode; style?: object }) {
    return <Text style={[s.body, style]}>{children}</Text>;
}

function Li({ children }: { children: React.ReactNode }) {
    return (
        <View style={s.listItem}>
            <Text style={s.bullet}>•</Text>
            <Text style={[s.body, s.listBody]}>{children}</Text>
        </View>
    );
}

export default function PrivacyScreen() {
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

                <Text style={s.pageTitle}>Privacy Policy</Text>
                <Text style={s.meta}>Last updated: May 28, 2026</Text>
                <View style={s.divider} />

                <P>
                    FlowOptix ("we", "our", or "us") is committed to protecting your
                    privacy. This Privacy Policy explains how we collect, use, and
                    safeguard your information when you use FlowOptix.
                </P>

                <Section title="1. Information We Collect">
                    <P>We collect the following categories of information:</P>
                    <Li>
                        Account information — your name and email address provided when
                        you sign in via Google OAuth or magic link.
                    </Li>
                    <Li>
                        Google data — with your explicit permission, we may access your
                        Gmail messages and Google Calendar events to analyze productivity
                        patterns.
                    </Li>
                    <Li>
                        Usage data — how you interact with the app, including features
                        used and session duration.
                    </Li>
                    <Li>
                        Device information — device type, operating system version, and
                        app version for diagnostic purposes.
                    </Li>
                    <Li>
                        Automation data — workflow configurations and triggers you create
                        through Zapier integrations.
                    </Li>
                </Section>

                <Section title="2. How We Use Your Data">
                    <P>We use your data to:</P>
                    <Li>Provide and operate the FlowOptix service.</Li>
                    <Li>
                        Analyze your emails and calendar events using AI (powered by
                        Anthropic Claude) to detect productivity patterns and generate
                        personalized insights.
                    </Li>
                    <Li>Send magic link authentication emails.</Li>
                    <Li>Improve the accuracy and relevance of our AI recommendations.</Li>
                    <Li>Diagnose technical issues and maintain service reliability.</Li>
                    <Li>Communicate important updates or changes to the service.</Li>
                    <P>
                        We do not sell, rent, or trade your personal data to third parties
                        for marketing purposes.
                    </P>
                </Section>

                <Section title="3. Data Storage">
                    <P>
                        Your account data and productivity insights are stored securely
                        using Supabase, a cloud database platform with enterprise-grade
                        security. Data is encrypted at rest and in transit using
                        industry-standard TLS/SSL encryption.
                    </P>
                    <P>
                        Supabase infrastructure is hosted on AWS and complies with SOC 2
                        Type II and ISO 27001 standards. For more information, see
                        Supabase's Privacy Policy at supabase.com/privacy.
                    </P>
                </Section>

                <Section title="4. Third-Party Integrations">
                    <P>FlowOptix integrates with the following third-party services:</P>

                    <Text style={s.subTitle}>Google (OAuth, Gmail API, Google Calendar API)</Text>
                    <P>
                        We use Google OAuth for authentication. With your permission, we
                        access your Gmail and Google Calendar data solely to analyze your
                        productivity patterns within FlowOptix. We do not store raw email
                        content beyond what is necessary to generate insights. You can
                        revoke access at any time via your Google account settings at
                        myaccount.google.com/permissions.
                    </P>
                    <P>
                        Our use of Google APIs complies with Google's API Services User
                        Data Policy, including the Limited Use requirements.
                    </P>

                    <Text style={s.subTitle}>Zapier</Text>
                    <P>
                        If you connect Zapier to FlowOptix, workflow automation data is
                        transmitted through Zapier's platform. Zapier's Privacy Policy
                        governs how they handle that data.
                    </P>

                    <Text style={s.subTitle}>Anthropic Claude (AI)</Text>
                    <P>
                        FlowOptix uses Claude, an AI model by Anthropic, to power our
                        productivity pattern detection and insight generation. Relevant
                        data is processed by Anthropic's API. Anthropic's Privacy Policy
                        governs their data handling practices.
                    </P>
                </Section>

                <Section title="5. Data Security">
                    <P>
                        We implement appropriate technical and organizational measures to
                        protect your data against unauthorized access, alteration,
                        disclosure, or destruction. These measures include:
                    </P>
                    <Li>End-to-end encryption for data in transit (TLS 1.2+).</Li>
                    <Li>Encryption at rest for all stored data.</Li>
                    <Li>Secure authentication via Supabase Auth.</Li>
                    <Li>Limited employee access to user data on a need-to-know basis.</Li>
                    <P>
                        No method of transmission over the internet is 100% secure. While
                        we strive to protect your data, we cannot guarantee absolute security.
                    </P>
                </Section>

                <Section title="6. Your Rights">
                    <P>
                        Depending on your location, you may have the following rights
                        regarding your personal data:
                    </P>
                    <Li>Access — request a copy of the data we hold about you.</Li>
                    <Li>Correction — request correction of inaccurate data.</Li>
                    <Li>Deletion — request deletion of your data (see Section 7).</Li>
                    <Li>Portability — request your data in a machine-readable format.</Li>
                    <Li>
                        Objection — object to certain types of data processing, including
                        AI-based analysis.
                    </Li>
                    <P>
                        To exercise any of these rights, contact us at the email address
                        listed in Section 10.
                    </P>
                </Section>

                <Section title="7. Data Deletion">
                    <P>
                        You may request deletion of your account and all associated data
                        at any time by emailing us at vk8608vishaalkhanna@gmail.com with
                        the subject line "Delete My Account". We will process your request
                        within 30 days.
                    </P>
                    <P>
                        After deletion, we may retain anonymized, aggregated data that
                        cannot be linked back to you for service improvement purposes.
                    </P>
                </Section>

                <Section title="8. Cookies">
                    <P>
                        The FlowOptix web app uses essential cookies and local storage to
                        maintain your authentication session. We do not use tracking cookies
                        or third-party advertising cookies. Session data is cleared when
                        you sign out.
                    </P>
                </Section>

                <Section title="9. Changes to This Policy">
                    <P>
                        We may update this Privacy Policy from time to time. We will notify
                        you of significant changes by updating the "Last updated" date at
                        the top of this page and, where appropriate, by email. Your
                        continued use of FlowOptix after changes take effect constitutes
                        acceptance of the revised policy.
                    </P>
                </Section>

                <Section title="10. Contact Information">
                    <P>
                        If you have questions, concerns, or requests regarding this Privacy
                        Policy or your personal data, please contact us at:
                    </P>
                    <P style={{ color: '#A855F7' }}>vk8608vishaalkhanna@gmail.com</P>
                </Section>

                <View style={s.footer}>
                    <Text style={s.footerText}>FlowOptix · Privacy Policy</Text>
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
    subTitle: {
        fontSize: 14, fontWeight: '700', color: '#ffffff',
        marginTop: 6, marginBottom: 8,
    },
    body: { fontSize: 14, color: '#aaaaaa', lineHeight: 22, marginBottom: 10 },

    listItem: { flexDirection: 'row', marginBottom: 8, paddingLeft: 4 },
    bullet:   { color: '#555555', fontSize: 14, marginRight: 10, lineHeight: 22 },
    listBody: { flex: 1, marginBottom: 0 },

    footer:     { marginTop: 20, alignItems: 'center' },
    footerText: { fontSize: 12, color: '#333333' },
});
