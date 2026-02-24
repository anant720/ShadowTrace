"use client";
import { useAuth } from '@/context/AuthContext';

export default function UpgradePage() {
    const { user } = useAuth();

    const PlanCard = ({ title, price, features, isPopular, isCurrent }) => (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '32px',
            padding: '40px',
            boxShadow: 'var(--shadow-lg)',
            border: isPopular ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.05)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {isPopular && <span style={{
                position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)',
                background: 'var(--primary)', color: 'white', padding: '4px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '800'
            }}>MOST POPULAR</span>}
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>{title}</h2>
            <div style={{ marginBottom: '32px' }}>
                <span style={{ fontSize: '40px', fontWeight: '900' }}>${price}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}> / month</span>
            </div>
            <div style={{ flex: 1, marginBottom: '40px' }}>
                {features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{f}</span>
                    </div>
                ))}
            </div>
            <button
                disabled={isCurrent}
                style={{
                    width: '100%', padding: '16px', borderRadius: '16px', background: isCurrent ? 'var(--bg-hover)' : 'var(--text-main)',
                    color: isCurrent ? 'var(--text-muted)' : 'white', border: 'none', fontWeight: '800', cursor: isCurrent ? 'default' : 'pointer'
                }}
            >
                {isCurrent ? 'Current Plan' : 'Select Plan'}
            </button>
        </div>
    );

    return (
        <div style={{ padding: '0 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '80px', marginTop: '40px' }}>
                <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '-2px', marginBottom: '16px' }}>Upgrade Defensive Intelligence</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
                    Scale your security operations with advanced ML explainability, behavioral fingerprinting, and automated DLP blocking.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                <PlanCard
                    title="Community"
                    price="0"
                    isCurrent={user?.subscription_tier === 'community' || !user?.subscription_tier}
                    features={[
                        "100 Monthly Scans",
                        "Basic Risk Scoring",
                        "7-Day Log Retention",
                        "1 Analyst Seat"
                    ]}
                />
                <PlanCard
                    title="Professional"
                    price="15"
                    isPopular
                    isCurrent={user?.subscription_tier === 'pro'}
                    features={[
                        "5,000 Monthly Scans",
                        "Behavioral Reasoning",
                        "Keyboard & Paste Hooks",
                        "DLP Exfiltration Warnings",
                        "90-Day Log Retention",
                        "Up to 10 Analysts"
                    ]}
                />
                <PlanCard
                    title="Enterprise"
                    price="199"
                    isCurrent={user?.subscription_tier === 'enterprise'}
                    features={[
                        "Unlimited Scans",
                        "Full XAI Explainability",
                        "ShadowFeed Premium API",
                        "Active DLP Blocking",
                        "Permanent Log Retention",
                        "Unlimited Analysts",
                        "SAML SSO Integration"
                    ]}
                />
            </div>
        </div>
    );
}
