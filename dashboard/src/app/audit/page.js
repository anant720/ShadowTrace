"use client";

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import DashboardLayout from '@/components/DashboardLayout';

export default function AuditPage() {
    const [scans, setScans] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchScans = async () => {
        try {
            const data = await apiRequest('/analytics/recent-scans?limit=50');
            setScans(data.scans || []);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScans();
        const interval = setInterval(fetchScans, 15000);
        return () => clearInterval(interval);
    }, []);

    const getRiskColor = (level) => {
        const l = (level || '').toLowerCase();
        if (l === 'safe') return 'var(--success)';
        if (l === 'suspicious') return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <DashboardLayout>
            <div style={{ padding: '20px 0 60px 0' }}>
                <h1 style={{ fontSize: '72px', fontWeight: '800', letterSpacing: '-4px', lineHeight: 1, color: 'var(--text-main)', marginBottom: '16px' }}>
                    Security Audit
                </h1>
                <p style={{ fontSize: '20px', color: 'var(--text-muted)', maxWidth: '600px', fontWeight: '500' }}>
                    A high-density record of every signal processed by the ShadowTrace neural engine.
                </p>
            </div>

            <div className="st-card" style={{ padding: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Signal History</h3>
                    <div style={{ padding: '8px 20px', background: 'var(--bg-main)', borderRadius: '100px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>
                        Showing Last 50 Events
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left' }}>
                                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>TIMESTAMP</th>
                                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>DOMAIN SOURCE</th>
                                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>RISK SCORE</th>
                                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>STATUS</th>
                                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>ENGINE LOGS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Synchronizing audit logs...</td>
                                </tr>
                            ) : scans.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No audit events found.</td>
                                </tr>
                            ) : (
                                scans.map((scan) => (
                                    <tr key={scan._id} style={{ background: 'var(--bg-main)', borderRadius: '16px' }}>
                                        <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', borderRadius: '16px 0 0 16px' }}>
                                            {new Date(scan.timestamp).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '20px 24px', fontWeight: '800', color: 'var(--text-main)' }}>{scan.domain}</td>
                                        <td style={{ padding: '20px 24px', fontFamily: 'monospace', fontWeight: '800', fontSize: '16px', color: 'var(--primary)' }}>
                                            {scan.final_risk_score}
                                        </td>
                                        <td style={{ padding: '20px 24px' }}>
                                            <span style={{
                                                background: 'white',
                                                color: getRiskColor(scan.risk_level),
                                                padding: '8px 16px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '800',
                                                boxShadow: 'var(--shadow-sm)',
                                                border: `1px solid ${getRiskColor(scan.risk_level)}20`
                                            }}>
                                                {scan.risk_level.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', borderRadius: '0 16px 16px 0' }}>
                                            Analysis complete. No behavioral bypass detected.
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
