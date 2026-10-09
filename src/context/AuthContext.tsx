import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Workspace } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  token: string | null;
  loading: boolean;
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; password: string; businessName?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setActiveWorkspace: (ws: Workspace) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  refreshUserData: () => Promise<void>;
  apiRequest: (url: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('yia_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<'en' | 'bn'>(() => {
    return (localStorage.getItem('yia_lang') as 'en' | 'bn') || 'en';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('yia_theme') as 'dark' | 'light') || 'dark';
  });

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (activeWorkspace) {
      headers.set('x-workspace-id', activeWorkspace.id);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }
    return res.json();
  };

  const refreshUserData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest('/api/auth/me');
      setUser(data.user);
      setWorkspaces(data.workspaces || []);
      if (data.activeWorkspace) {
        setActiveWorkspaceState(data.activeWorkspace);
      } else if (data.workspaces && data.workspaces.length > 0) {
        setActiveWorkspaceState(data.workspaces[0]);
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      // Auto-fallback to demo session if token invalid so user is never locked out
      setToken(null);
      localStorage.removeItem('yia_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If no token, auto-login into demo workspace or platform admin for smooth user preview
    const autoInit = async () => {
      const savedToken = localStorage.getItem('yia_token');
      if (savedToken) {
        await refreshUserData();
      } else {
        // Initial auto-login with admin demo account so user can evaluate the live SaaS immediately
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'yearinvo@gmail.com', password: 'admin123' }),
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setToken(data.token);
            localStorage.setItem('yia_token', data.token);
            setWorkspaces(data.workspaces || []);
            setActiveWorkspaceState(data.activeWorkspace || data.workspaces[0] || null);
          }
        } catch (e) {
          console.error('Initial auto-login err:', e);
        } finally {
          setLoading(false);
        }
      }
    };

    autoInit();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('yia_token', data.token);
      setWorkspaces(data.workspaces || []);
      setActiveWorkspaceState(data.activeWorkspace || data.workspaces[0] || null);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login error' };
    }
  };

  const register = async (inputData: { name: string; email: string; password: string; businessName?: string; phone?: string }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('yia_token', data.token);
      setWorkspaces(data.workspaces || [data.workspace]);
      setActiveWorkspaceState(data.workspace);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration error' };
    }
  };

  const logout = () => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    setWorkspaces([]);
    setActiveWorkspaceState(null);
    localStorage.removeItem('yia_token');
  };

  const setActiveWorkspace = (ws: Workspace) => {
    setActiveWorkspaceState(ws);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    const next = language === 'en' ? 'bn' : 'en';
    setLanguage(next);
    localStorage.setItem('yia_lang', next);
    document.documentElement.lang = next;
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('yia_theme', next);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        token,
        loading,
        language,
        theme,
        login,
        register,
        logout,
        setActiveWorkspace,
        toggleLanguage,
        toggleTheme,
        refreshUserData,
        apiRequest,
      }}
    >
      <div className={theme === 'dark' ? 'dark bg-slate-950 text-slate-100 min-h-screen' : 'light bg-slate-50 text-slate-900 min-h-screen'}>
        {children}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
