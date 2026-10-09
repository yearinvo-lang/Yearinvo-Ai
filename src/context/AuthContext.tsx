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
  login: (email: string, password?: string, firebaseUid?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; password: string; businessName?: string; phone?: string; uid?: string }) => Promise<{ success: boolean; error?: string }>;
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

  const parseJsonResponse = async (res: Response) => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json().catch(() => null);
    }
    const rawText = await res.text().catch(() => '');
    return { error: rawText.slice(0, 150) || `Server responded with status ${res.status}` };
  };

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
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      const errMsg = (data && data.error) ? data.error : `Server request error (${res.status})`;
      throw new Error(errMsg);
    }
    return data;
  };

  const refreshUserData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest('/api/auth/me');
      if (data && data.user) {
        setUser(data.user);
        setWorkspaces(data.workspaces || []);
        if (data.activeWorkspace) {
          setActiveWorkspaceState(data.activeWorkspace);
        } else if (data.workspaces && data.workspaces.length > 0) {
          setActiveWorkspaceState(data.workspaces[0]);
        }
      } else {
        setToken(null);
        localStorage.removeItem('yia_token');
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      setToken(null);
      localStorage.removeItem('yia_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const autoInit = async () => {
      const savedToken = localStorage.getItem('yia_token');
      if (savedToken) {
        await refreshUserData();
      } else {
        setLoading(false);
      }
    };

    autoInit();
  }, []);

  const login = async (email: string, password?: string, firebaseUid?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firebaseUid }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data || data.error) {
        return { success: false, error: (data && data.error) || `Login failed (${res.status})` };
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

  const register = async (inputData: { name: string; email: string; password: string; businessName?: string; phone?: string; uid?: string }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data || data.error) {
        return { success: false, error: (data && data.error) || `Registration failed (${res.status})` };
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
    // Also sign out from Firebase client instance
    import('../lib/firebase.ts').then((mod) => {
      mod.firebaseSignOut().catch(() => {});
    }).catch(() => {});

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
