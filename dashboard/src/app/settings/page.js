"use client";

import { useState, useEffect } from 'react';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const fetchMembers = async () => {
        try {
            const data = await apiRequest('/organizations/members');
            setMembers(data);
        } catch (err) {
            console.error("Failed to fetch members", err);
        }
    };

    useEffect(() => {
        if (user?.org_id) {
            fetchMembers();
        }
    }, [user?.org_id]);

    const handleInvite = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');
        try {
            await apiRequest('/organizations/invite', 'POST', { email, role });
            setMessage(`Invitation successfully sent to ${email}`);
            setEmail('');
            fetchMembers();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '0 20px' }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1.5px', marginBottom: '8px' }}>Organization Settings</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Manage your team and security collaboration context.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
                {/* Member List */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '24px',
                    padding: '32px',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid rgba(0,0,0,0.03)'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '24px' }}>Active Members</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {members.map(member => (
                            <div key={member.user_id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: 'var(--bg-main)',
                                borderRadius: '16px',
                                border: '1px solid rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '800',
                                        fontSize: '14px',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}>
                                        {member.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '700', fontSize: '15px' }}>{member.email}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Joined {new Date(member.joined_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    background: member.role === 'admin' ? 'rgba(255, 118, 117, 0.1)' : 'rgba(0, 184, 148, 0.1)',
                                    color: member.role === 'admin' ? '#ff7675' : 'var(--primary)'
                                }}>
                                    {member.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invite Panel */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '24px',
                    padding: '32px',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid rgba(0,0,0,0.03)',
                    height: 'fit-content'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '24px' }}>Invite Team</h2>
                    <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="analyst@corp.com"
                                required
                                style={{
                                    width: '100%',
                                    background: 'var(--bg-main)',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    marginTop: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Access Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'var(--bg-main)',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    marginTop: '8px',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="member">Analyst (Member)</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>

                        {message && <p style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: '700' }}>{message}</p>}
                        {error && <p style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: '700' }}>{error}</p>}

                        <button
                            type="submit"
                            disabled={loading || user?.role !== 'admin'}
                            style={{
                                background: 'var(--primary)',
                                color: 'white',
                                padding: '14px',
                                borderRadius: '14px',
                                border: 'none',
                                fontWeight: '800',
                                cursor: (loading || user?.role !== 'admin') ? 'not-allowed' : 'pointer',
                                opacity: (loading || user?.role !== 'admin') ? 0.6 : 1,
                                marginTop: '8px'
                            }}
                        >
                            {loading ? 'Sending...' : 'Issue Invitation'}
                        </button>
                        {user?.role !== 'admin' && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                Only administrators can issue invites.
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
