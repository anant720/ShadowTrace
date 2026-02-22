"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user && pathname !== '/login') {
            router.push('/login');
        }
    }, [user, loading, pathname, router]);

    if (loading || (!user && pathname !== '/login')) {
        return <div style={{ background: 'var(--bg-main)', height: '100vh' }} />;
    }

    if (pathname === '/login') return children;

    const SideMenuItem = ({ href, icon, label }) => {
        const active = pathname === href;
        return (
            <Link href={href} style={{
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '14px',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'white' : 'var(--text-muted)',
                marginBottom: '12px',
                transition: '0.2s',
                fontSize: '20px'
            }} title={label}>
                {icon}
            </Link>
        );
    };

    const TabButton = ({ href, label }) => {
        const active = pathname === href;
        return (
            <Link href={href} style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-pill)',
                background: active ? '#1A1C1E' : 'transparent',
                color: active ? 'white' : 'var(--text-muted)',
                fontSize: '14px',
                fontWeight: '600',
                transition: '0.2s',
                textDecoration: 'none'
            }}>
                {label}
            </Link>
        );
    };

    return (
        <div style={{ display: 'flex', background: 'var(--bg-main)', minHeight: '100vh' }}>
            {/* Minimal Side Menu */}
            <aside style={{
                width: 'var(--sidebar-width)',
                background: 'var(--bg-sidebar)',
                borderRight: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px 0',
                position: 'fixed',
                height: '100vh',
                zIndex: 100
            }}>
                <div style={{ marginBottom: '40px', fontSize: '24px' }}>🛡️</div>
                <nav style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <SideMenuItem href="/" icon="📊" label="Overview" />
                    <SideMenuItem href="/analytics" icon="📈" label="Analytics" />
                    <SideMenuItem href="/domains" icon="🔒" label="Domains" />
                    <SideMenuItem href="/reports" icon="📄" label="Reports" />
                </nav>
                <button onClick={logout} style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'var(--bg-hover)',
                    color: 'var(--danger)',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} title="Logout">
                    🚪
                </button>
            </aside>

            {/* Main Wrapper */}
            <div style={{ marginLeft: 'var(--sidebar-width)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Top Bar */}
                <header style={{
                    height: 'var(--topbar-height)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 40px',
                    background: 'rgba(244, 246, 248, 0.8)',
                    backdropFilter: 'blur(12px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 90
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>SHADOW TRACE</span>
                        <span style={{ fontSize: '10px', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 'bold' }}>PRO</span>
                    </div>

                    <div style={{
                        background: 'var(--bg-hover)',
                        padding: '4px',
                        borderRadius: 'var(--radius-pill)',
                        display: 'flex',
                        gap: '4px'
                    }}>
                        <TabButton href="/" label="General" />
                        <TabButton href="/analytics" label="Security" />
                        <TabButton href="/reports" label="Database" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'white',
                            padding: '6px 16px',
                            borderRadius: 'var(--radius-pill)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%' }} />
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>System Live</span>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}>
                            {user?.username?.[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                <div style={{ display: 'flex', flex: 1 }}>
                    {/* Page Content */}
                    <main style={{ flex: 1, padding: '40px' }}>
                        {children}
                    </main>

                    {/* Assistant Panel (Right Sidebar) */}
                    <aside style={{
                        width: '320px',
                        padding: '40px 32px 40px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                    }}>
                        <div className="st-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '16px' }}>Assistant</h3>
                                <button style={{ background: 'var(--bg-hover)', width: '24px', height: '24px', borderRadius: '6px', fontSize: '12px' }}>✕</button>
                            </div>
                            <div style={{ flex: 1, background: 'var(--bg-hover)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                    System scanning... No immediate threats detected in your current session.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input style={{ flex: 1, fontSize: '13px', padding: '10px 16px' }} placeholder="Ask anything..." />
                                <button style={{ background: 'var(--primary)', color: 'white', width: '38px', borderRadius: '12px' }}>→</button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
