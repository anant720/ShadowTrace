"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/utils/api';


export default function DashboardLayout({ children }) {
    const [organizations, setOrganizations] = useState([]);
    const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
    const { user, loading, logout, switchOrganization } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user && pathname !== '/login') {
            router.push('/login');
        }
    }, [user, loading, pathname, router]);

    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const data = await apiRequest('/organizations/');
                setOrganizations(data);
            } catch (err) {
                console.error("Failed to fetch organizations", err);
            }
        };
        if (user) fetchOrgs();
    }, [user]);

    // Filtered Org context UI
    const currentOrg = organizations.find(o => o.id === user?.org_id) || { name: 'Community', id: 'community' };

    if (loading || (!user && pathname !== '/login')) {
        return <div style={{ background: 'var(--bg-main)', height: '100vh' }} />;
    }

    if (pathname === '/login') return children;

    const SideMenuItem = ({ href, svg, label }) => {
        const active = pathname === href;
        return (
            <Link href={href} style={{
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '20px',
                background: active ? 'var(--bg-hover)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                marginBottom: '16px',
                transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: active ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent'
            }} title={label}>
                {svg}
            </Link>
        );
    };

    const TabButton = ({ href, label }) => {
        const active = pathname === href;
        return (
            <Link href={href} style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-pill)',
                background: active ? 'white' : 'transparent',
                color: active ? 'var(--text-main)' : 'var(--text-muted)',
                fontSize: '14px',
                fontWeight: '600',
                transition: '0.2s',
                textDecoration: 'none',
                boxShadow: active ? 'var(--shadow-sm)' : 'none'
            }}>
                {label}
            </Link>
        );
    };

    return (
        <div style={{ display: 'flex', background: 'var(--bg-main)', minHeight: '100vh', padding: 'var(--padding-page)', transition: 'padding 0.3s ease' }}>
            {/* Minimal Side Menu - Hidden on Mobile */}
            <aside style={{
                width: 'var(--sidebar-width)',
                background: 'var(--bg-sidebar)',
                borderRadius: '30px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '32px 0',
                position: 'sticky',
                top: 'var(--padding-page)',
                height: 'calc(100vh - (var(--padding-page) * 2))',
                zIndex: 100,
                boxShadow: 'var(--shadow-md)',
                transition: 'all 0.3s ease',
                opacity: (pathname === '/login' || (typeof window !== 'undefined' && window.innerWidth <= 1024)) ? 0 : 1,
                pointerEvents: (pathname === '/login' || (typeof window !== 'undefined' && window.innerWidth <= 1024)) ? 'none' : 'auto',
                marginRight: '32px',
                flexShrink: 0,
                overflow: 'hidden'
            }}>
                <div style={{ marginBottom: '48px' }}>
                    <img src="/dashboard_logo.png" alt="Logo" style={{ width: '80px', height: '80px' }} />
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <SideMenuItem href="/" svg={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 22V12h6v10" /></svg>
                    } label="Overview" />
                    <SideMenuItem href="/analytics" svg={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-4" /></svg>
                    } label="Analytics" />
                    <SideMenuItem href="/domains" svg={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                    } label="Domains" />
                    <SideMenuItem href="/audit" svg={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                    } label="Audit Log" />
                    <SideMenuItem href="/intelligence" svg={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    } label="ShadowFeed" />
                    <SideMenuItem href="/settings" svg={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                    } label="Settings" />
                </nav>
                <button onClick={logout} style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    background: 'var(--bg-hover)',
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} title="Logout">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                </button>
            </aside>

            {/* Mobile Bottom Navigation Bar */}
            <nav style={{
                position: 'fixed',
                bottom: '12px',
                left: '12px',
                right: '12px',
                background: 'white',
                borderRadius: '30px',
                boxShadow: 'var(--shadow-lg)',
                display: 'none', // Overwritten by CSS or conditional
                justifyContent: 'space-around',
                padding: '12px',
                zIndex: 1000,
                // Using a data attribute or class to handle visibility on small screens
                ...(typeof window !== 'undefined' && window.innerWidth <= 1024 ? { display: 'flex' } : {})
            }} className="mobile-only-nav">
                <Link href="/" style={{ color: pathname === '/' ? 'var(--primary)' : 'var(--text-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 22V12h6v10" /></svg>
                </Link>
                <Link href="/analytics" style={{ color: pathname === '/analytics' ? 'var(--primary)' : 'var(--text-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-4" /></svg>
                </Link>
                <Link href="/audit" style={{ color: pathname === '/audit' ? 'var(--primary)' : 'var(--text-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                </Link>
                <Link href="/reports" style={{ color: pathname === '/reports' ? 'var(--primary)' : 'var(--text-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                </Link>
            </nav>

            {/* Main Wrapper */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                minWidth: 0 // Prevent flex overflow
            }}>
                {/* Top Bar */}
                <header style={{
                    height: 'auto',
                    minHeight: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'transparent',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h1 style={{ fontWeight: 800, fontSize: 'clamp(20px, 4vw, 32px)', letterSpacing: '-1.5px', color: 'var(--text-main)' }}>ShadowTrace</h1>
                        <div style={{ position: 'relative' }}>
                            <div
                                onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                                style={{
                                    background: 'var(--bg-hover)',
                                    padding: '6px 16px',
                                    borderRadius: '16px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: 'var(--text-main)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                                {currentOrg.name.toUpperCase()}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
                            </div>

                            {isOrgMenuOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 12px)',
                                    left: 0,
                                    background: 'var(--bg-card)',
                                    borderRadius: '20px',
                                    boxShadow: 'var(--shadow-lg)',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    padding: '12px',
                                    minWidth: '240px',
                                    zIndex: 1000,
                                    animation: 'slideUp 0.3s ease'
                                }}>
                                    <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', padding: '0 8px' }}>Switch Organization</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {organizations.map(org => (
                                            <div
                                                key={org.id}
                                                onClick={() => switchOrganization(org.id)}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderRadius: '12px',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    color: org.id === user?.org_id ? 'var(--primary)' : 'var(--text-main)',
                                                    background: org.id === user?.org_id ? 'rgba(0, 184, 148, 0.05)' : 'transparent',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = org.id === user?.org_id ? 'rgba(0, 184, 148, 0.05)' : 'transparent'}
                                            >
                                                {org.name}
                                                {org.id === user?.org_id && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{
                        background: '#D1D1D1',
                        padding: '4px',
                        borderRadius: 'var(--radius-pill)',
                        display: (typeof window !== 'undefined' && window.innerWidth <= 640) ? 'none' : 'flex',
                        gap: '2px',
                        overflowX: 'auto',
                        maxWidth: '100%'
                    }}>
                        <TabButton href="/" label="Overview" />
                        <TabButton href="/analytics" label="Security" />
                        <TabButton href="/audit" label="Forensics" />
                        <TabButton href="/intelligence" label="ShadowFeed" />
                        <TabButton href="/upgrade" label="💎 Upgrade" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            display: (typeof window !== 'undefined' && window.innerWidth <= 480) ? 'none' : 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'white',
                            padding: '8px 16px',
                            borderRadius: '16px',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%' }} />
                            <span style={{ fontSize: '13px', fontWeight: '700' }}>Active</span>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '14px',
                            background: 'white',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            {user?.username?.[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                <div style={{ display: 'flex', flex: 1, paddingBottom: '80px' }}>
                    <main style={{ flex: 1, padding: '0 0px 40px 0px' }}>
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
