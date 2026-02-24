"use client";
import { useState, useEffect } from 'react';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export default function ShadowFeedPage() {
    const { user } = useAuth();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const data = await apiRequest('/intelligence/shadowfeed');
                setFeed(data.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchFeed();
    }, [user]);

    if (error && error.includes('402')) {
        return (
            <div style={{ padding: '80px 20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '30px', margin: '20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚡</div>
                <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>ShadowFeed Enterprise</h1>
                <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 32px' }}>
                    Unlock real-time high-fidelity threat intelligence feeds for SIEM/XDR integration.
                    Monitor DGA domains and obfuscated JS-delivery infrastructure across your fleet.
                </p>
                <button onClick={() => window.location.href = '/upgrade'} style={{
                    background: 'var(--primary)', color: 'white', padding: '16px 32px', borderRadius: '16px', border: 'none', fontWeight: '800', cursor: 'pointer'
                }}>Upgrade to Enterprise</button>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 20px' }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1.5px', marginBottom: '8px' }}>ShadowFeed Intelligence</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Live forensic signals for DGA and Obfuscated infrastructure.</p>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '32px', boxShadow: 'var(--shadow-md)' }}>
                {loading ? <p>Loading intelligence stream...</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {feed.length === 0 ? <p>No active high-risk threats detected in current window.</p> : feed.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '20px', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)'
                            }}>
                                <div>
                                    <p style={{ fontWeight: '800', fontSize: '16px', color: 'var(--danger)' }}>{item.domain}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Detected: {new Date(item.timestamp).toLocaleString()}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800',
                                        background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757'
                                    }}>RISK: {item.risk_score}</span>
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>DGA Density: High</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
