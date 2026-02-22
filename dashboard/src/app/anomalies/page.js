"use client";

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import DashboardLayout from '@/components/DashboardLayout';

export default function AnomaliesPage() {
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAnomalies = async () => {
        try {
            const data = await apiRequest('/analytics/anomalies?unacknowledged_only=false');
            setAnomalies(data.anomalies);
        } catch (err) {
            console.error('Failed to fetch anomalies:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnomalies();
    }, []);

    const acknowledge = async (id) => {
        try {
            await apiRequest(`/analytics/anomalies/${id}/acknowledge`, 'POST');
            fetchAnomalies();
        } catch (err) {
            alert('Action failed');
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ color: 'var(--secondary)' }}>Analyzing Behavioral Outliers...</div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div style={{ padding: '20px 0 60px 0' }}>
                <h1 style={{ fontSize: '72px', fontWeight: '800', letterSpacing: '-4px', lineHeight: 1, color: 'var(--text-main)', marginBottom: '16px' }}>
                    Machine Learning Alerts
                </h1>
                <p style={{ fontSize: '20px', color: 'var(--text-muted)', maxWidth: '600px', fontWeight: '500' }}>
                    Automated detection of statistical spikes and suspicious campaigns across the cluster.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {anomalies.map((a, i) => (
                    <div key={i} className="st-card" style={{
                        padding: '32px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderLeft: `8px solid ${a.severity === 'high' ? 'var(--danger)' : 'var(--warning)'}`
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                                <span style={{
                                    fontSize: '11px',
                                    textTransform: 'uppercase',
                                    background: a.severity === 'high' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 204, 0, 0.1)',
                                    color: a.severity === 'high' ? 'var(--danger)' : '#B88E00',
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    fontWeight: '800',
                                    letterSpacing: '0.5px'
                                }}>
                                    {a.type} | {a.severity}
                                </span>
                                <span style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-main)' }}>{a.domain || 'Global Signal Spike'}</span>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>{new Date(a.detected_at).toLocaleString()}</span>
                            </div>
                            <p style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>{a.details}</p>
                            {a.reasoning && (
                                <div style={{
                                    background: 'var(--bg-main)',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(0,0,0,0.03)',
                                    fontSize: '14px',
                                    color: 'var(--text-muted)',
                                    lineHeight: '1.5'
                                }}>
                                    <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Intelligence Reasoning</strong>
                                    {a.reasoning}
                                </div>
                            )}
                        </div>

                        {!a.acknowledged ? (
                            <button
                                onClick={() => acknowledge(a._id)}
                                style={{
                                    background: 'var(--primary)',
                                    color: 'white',
                                    padding: '12px 28px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    borderRadius: '16px',
                                    boxShadow: '0 8px 16px rgba(0, 184, 148, 0.2)'
                                }}
                            >
                                Acknowledge
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '800', fontSize: '14px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                                Acknowledged
                            </div>
                        )}
                    </div>
                ))}
                {anomalies.length === 0 && (
                    <div className="st-card" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600', fontSize: '18px' }}>
                        No behavioral anomalies detected in the current analysis window.
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
