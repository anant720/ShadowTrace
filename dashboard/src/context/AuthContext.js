"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('st_token');
        const role = localStorage.getItem('st_role');
        const username = localStorage.getItem('st_user');
        const org_id = localStorage.getItem('st_org');

        if (token && role && username && org_id) {
            setUser({ token, role, username, org_id });
        }
        setLoading(false);
    }, []);

    const login = (token, role, username, org_id) => {
        localStorage.setItem('st_token', token);
        localStorage.setItem('st_role', role);
        localStorage.setItem('st_user', username);
        localStorage.setItem('st_org', org_id);
        setUser({ token, role, username, org_id });
        router.push('/');
    };

    const switchOrganization = (org_id) => {
        localStorage.setItem('st_org', org_id);
        setUser(prev => ({ ...prev, org_id }));
        // Reload to refresh all scoped data
        window.location.reload();
    };

    const logout = () => {
        localStorage.removeItem('st_token');
        localStorage.removeItem('st_role');
        localStorage.removeItem('st_user');
        localStorage.removeItem('st_org');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
