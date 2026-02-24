"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/utils/api';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await apiRequest('/auth/login', 'POST', { username, password });
            login(data.access_token, data.role, data.username, data.org_id);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main)',
            color: 'var(--text-main)'
        }}>
            <div style={{
                padding: '60px',
                borderRadius: '40px',
                width: '100%',
                maxWidth: '460px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid rgba(0,0,0,0.03)'
            }}>
                <img
                    src="/dashboard_logo.png"
                    alt="ShadowTrace Logo"
                    style={{ width: '100px', height: '100px', marginBottom: '32px' }}
                />
                <h1 style={{ fontSize: '36px', marginBottom: '8px', fontWeight: '800', letterSpacing: '-1.5px', color: 'var(--text-main)' }}>ShadowTrace</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '16px', fontWeight: '500' }}>Intelligence Portal</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginLeft: '12px' }}>Identity</label>
                        <input
                            type="text"
                            placeholder="Operator ID"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                background: 'var(--bg-main)',
                                border: '1px solid rgba(0,0,0,0.05)',
                                color: 'var(--text-main)',
                                padding: '18px 24px',
                                borderRadius: '20px',
                                fontSize: '16px',
                                marginTop: '8px',
                                fontWeight: '600'
                            }}
                        />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginLeft: '12px' }}>Security Token</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                background: 'var(--bg-main)',
                                border: '1px solid rgba(0,0,0,0.05)',
                                color: 'var(--text-main)',
                                padding: '18px 24px',
                                borderRadius: '20px',
                                fontSize: '16px',
                                marginTop: '8px',
                                fontWeight: '600'
                            }}
                        />
                    </div>

                    {error && <p style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: '700', textAlign: 'left', marginLeft: '12px' }}>{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '18px',
                            background: 'var(--primary)',
                            color: 'white',
                            marginTop: '16px',
                            borderRadius: '20px',
                            fontWeight: '800',
                            fontSize: '16px',
                            transition: 'all 0.3s ease',
                            border: 'none',
                            boxShadow: '0 10px 20px rgba(0, 184, 148, 0.2)',
                            cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        {loading ? 'Authenticating...' : 'Authorize Access'}
                    </button>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', marginTop: '16px' }}>
                        Protected by ShadowTrace Cryptographic Layer
                    </p>
                </form>
            </div>
        </div>
    );
}
