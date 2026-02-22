"use client";

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import DashboardLayout from '@/components/DashboardLayout';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';

export default function AnalyticsPage() {
    const [trends, setTrends] = useState([]);
    const [tlds, setTlds] = useState([]);
    const [engines, setEngines] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [trendData, tldData, engineData] = await Promise.all([
                    apiRequest('/analytics/trends?days=30'),
                    apiRequest('/analytics/tld-distribution'),
                    apiRequest('/analytics/engine-breakdown')
                ]);
                setTrends(trendData.trends);
                setTlds(tldData.tlds);
                setEngines(engineData.engines);
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <DashboardLayout>
            <div style={{ color: 'var(--secondary)' }}>Aggregating Global Threat Data...</div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div style={{ padding: '20px 0 60px 0' }}>
                <h1 style={{ fontSize: '72px', fontWeight: '800', letterSpacing: '-4px', lineHeight: 1, color: 'var(--text-main)', marginBottom: '16px' }}>
                    Security Analytics
                </h1>
                <p style={{ fontSize: '20px', color: 'var(--text-muted)', maxWidth: '600px', fontWeight: '500' }}>
                    Deep dive into threat vectors and detection patterns across the global network.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px' }}>
                <div className="st-card" style={{ padding: '40px', height: '450px' }}>
                    <h3 style={{ marginBottom: '40px', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Risk Evolution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends}>
                            <defs>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: '600' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: '600' }} domain={[0, 100]} />
                            <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: 'var(--shadow-lg)', padding: '20px' }} />
                            <Area type="monotone" dataKey="avg_risk" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorRisk)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="st-card" style={{ padding: '40px', height: '450px' }}>
                    <h3 style={{ marginBottom: '40px', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Threat Concentration</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tlds} layout="vertical">
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: '600' }} />
                            <YAxis dataKey="tld" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: '700' }} width={60} />
                            <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: 'var(--shadow-lg)', padding: '20px' }} />
                            <Bar dataKey="suspicious_scans" fill="var(--primary)" radius={[0, 12, 12, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="st-card" style={{ padding: '40px' }}>
                <h3 style={{ marginBottom: '40px', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Engine Performance Matrix</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                    {Object.entries(engines).map(([name, data]) => (
                        <div key={name} style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {name.replace('_', ' ')}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '12px 0' }}>
                                <h4 style={{ fontSize: '32px', fontWeight: '800' }}>{data.avg_score}</h4>
                                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>/ {data.max_score}</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${(data.avg_score / data.max_score) * 100}%`,
                                    background: 'var(--primary)'
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Weight: {data.weight}</span>
                                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '800' }}>Optimal</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
