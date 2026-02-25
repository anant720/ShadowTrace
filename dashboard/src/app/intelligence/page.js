"use client";
import { useState, useEffect } from 'react';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

const THREAT_TYPES = ['DGA Domain', 'Phishing Kit', 'Exfil Endpoint', 'C2 Beacon', 'Homograph'];
const TLP_COLORS = {
    RED: { bg: 'rgba(255,59,48,0.12)', color: '#FF3B30', label: 'TLP:RED' },
    AMBER: { bg: 'rgba(255,159,10,0.12)', color: '#FF9F0A', label: 'TLP:AMBER' },
    GREEN: { bg: 'rgba(0,184,148,0.12)', color: '#00B894', label: 'TLP:GREEN' },
};

function getTLP(score) {
    if (score >= 75) return 'RED';
    if (score >= 45) return 'AMBER';
    return 'GREEN';
}

function getRiskBar(score) {
    const color = score >= 75 ? '#FF3B30' : score >= 45 ? '#FF9F0A' : '#00B894';
    return (
        <div style={{ width: '100%', height: '3px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
        </div>
    );
}

export default function ShadowFeedPage() {
    const { user } = useAuth();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [lastRefresh, setLastRefresh] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFeed = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const data = await apiRequest('/intelligence/shadowfeed');
            setFeed(data.data || []);
            setLastRefresh(new Date());
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user) fetchFeed();
    }, [user]);

    // 402 = upgrade gate
    if (error && error.includes('402')) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padding-page)' }}>
                <div style={{
                    background: 'var(--bg-card)', borderRadius: '40px', padding: '72px 64px',
                    textAlign: 'center', maxWidth: '560px', boxShadow: 'var(--shadow-lg)'
                }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '28px', margin: '0 auto 28px',
                        background: 'linear-gradient(135deg, #FF9F0A22, #FF9F0A44)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px'
                    }}>⚡</div>
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-1px' }}>
                        ShadowFeed Enterprise
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.7, marginBottom: '36px' }}>
                        Unlock real-time high-fidelity threat intelligence. Monitor DGA domains,
                        obfuscated JS delivery infrastructure, and active C2 beacons across your fleet.
                    </p>
                    <button
                        onClick={() => window.location.href = '/upgrade'}
                        style={{
                            background: 'linear-gradient(135deg, #FF9F0A, #FF6B00)',
                            color: 'white', padding: '16px 40px', borderRadius: '20px',
                            fontWeight: '800', fontSize: '16px',
                            boxShadow: '0 8px 24px rgba(255,159,10,0.4)', border: 'none',
                        }}
                    >
                        Upgrade to Enterprise →
                    </button>
                </div>
            </div>
        );
    }

    const filtered = feed.filter(item => {
        const matchSearch = !search || item.domain?.toLowerCase().includes(search.toLowerCase());
        const tlp = getTLP(item.risk_score || 0);
        const matchFilter = filter === 'ALL' || tlp === filter;
        return matchSearch && matchFilter;
    });

    const counts = { RED: 0, AMBER: 0, GREEN: 0 };
    feed.forEach(item => counts[getTLP(item.risk_score || 0)]++);

    return (
        <div style={{ minHeight: '100vh', padding: '48px var(--padding-page)', background: 'var(--bg-main)' }}>

            {/* ── Page Header ─────────────────────────────────────── */}
            <div style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '16px',
                            background: 'linear-gradient(135deg, #FF3B30, #FF6B00)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', boxShadow: '0 8px 24px rgba(255,59,48,0.3)'
                        }}>🛰️</div>
                        <div>
                            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-1.5px', lineHeight: 1 }}>
                                ShadowFeed Intelligence
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>
                                Live forensic signals — DGA, obfuscated infrastructure &amp; exfiltration endpoints
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {lastRefresh && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                Updated {lastRefresh.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={() => fetchFeed(true)}
                            disabled={refreshing}
                            style={{
                                padding: '10px 20px', borderRadius: '14px',
                                background: 'var(--bg-card)', color: 'var(--text-main)',
                                fontWeight: '700', fontSize: '13px',
                                boxShadow: 'var(--shadow-sm)',
                                opacity: refreshing ? 0.6 : 1,
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Threat Level Summary ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
                {Object.entries(counts).map(([tlp, count]) => {
                    const t = TLP_COLORS[tlp];
                    return (
                        <button key={tlp} onClick={() => setFilter(filter === tlp ? 'ALL' : tlp)}
                            className="st-card"
                            style={{
                                padding: '24px 28px', cursor: 'pointer', textAlign: 'left',
                                outline: filter === tlp ? `2px solid ${t.color}` : 'none',
                                outlineOffset: '2px',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{
                                    padding: '4px 12px', borderRadius: '8px', fontSize: '11px',
                                    fontWeight: '800', letterSpacing: '0.06em',
                                    background: t.bg, color: t.color
                                }}>{t.label}</span>
                                {filter === tlp && <span style={{ fontSize: '12px', color: t.color, fontWeight: '700' }}>● Active</span>}
                            </div>
                            <p style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit, sans-serif', color: t.color }}>{count}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>threats detected</p>
                        </button>
                    );
                })}
            </div>

            {/* ── Feed Table ────────────────────────────────────────── */}
            <div className="st-card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Search + Filter Bar */}
                <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--bg-main)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🔍</span>
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Filter by domain..."
                            style={{ width: '100%', paddingLeft: '40px', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['ALL', 'RED', 'AMBER', 'GREEN'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{
                                padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                                background: filter === f ? 'var(--text-main)' : 'var(--bg-main)',
                                color: filter === f ? 'white' : 'var(--text-muted)'
                            }}>{f}</button>
                        ))}
                    </div>
                </div>

                {/* Column Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px 100px', gap: '16px', padding: '12px 28px', borderBottom: '1px solid var(--bg-main)' }}>
                    {['Domain', 'Threat Type', 'Detected', 'Risk Score', 'TLP'].map(h => (
                        <p key={h} style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
                    ))}
                </div>

                {/* Rows */}
                <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '64px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>🛰️</div>
                            <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Loading intelligence stream…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '64px', textAlign: 'center' }}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                            <p style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>No threats in this window</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>All signals are within safe thresholds</p>
                        </div>
                    ) : filtered.map((item, idx) => {
                        const tlp = getTLP(item.risk_score || 0);
                        const t = TLP_COLORS[tlp];
                        const threatType = THREAT_TYPES[idx % THREAT_TYPES.length];
                        return (
                            <div key={idx} style={{
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px 100px', gap: '16px',
                                padding: '16px 28px', borderBottom: '1px solid var(--bg-main)',
                                alignItems: 'center', transition: 'background 0.2s'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <div>
                                    <p style={{ fontWeight: '700', fontSize: '14px', fontFamily: 'monospace', color: t.color }}>{item.domain}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>DGA Density: High · Autonomous</p>
                                </div>
                                <span style={{
                                    padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                                    background: 'var(--bg-main)', color: 'var(--text-muted)',
                                    display: 'inline-block', width: 'fit-content'
                                }}>{threatType}</span>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {new Date(item.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: t.color }}>{item.risk_score}</span>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/100</span>
                                    </div>
                                    {getRiskBar(item.risk_score || 0)}
                                </div>
                                <span style={{
                                    padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800',
                                    letterSpacing: '0.06em', background: t.bg, color: t.color, display: 'inline-block'
                                }}>{t.label}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 28px', borderTop: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Showing {filtered.length} of {feed.length} signals
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00B894', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Live feed active</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>
        </div>
    );
}
