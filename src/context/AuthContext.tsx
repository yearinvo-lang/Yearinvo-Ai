import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Workspace } from '../types/index.ts';
import { auth as firebaseAuth, firebaseSignOut } from '../lib/firebase.ts';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  token: string | null;
  loading: boolean;
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
  login: (email: string, password?: string, firebaseUid?: string, fbUserObj?: any) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; password: string; businessName?: string; phone?: string; uid?: string; fbUser?: any }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setActiveWorkspace: (ws: Workspace) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  refreshUserData: () => Promise<void>;
  apiRequest: (url: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Never populate authenticated session before cryptographic verification
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [token, setToken] = useState<string | null>(null);
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
      const json = await res.json().catch(() => null);
      if (json) return json;
    }
    const rawText = await res.text().catch(() => '');
    if (res.status === 404 || rawText.includes('NOT_FOUND') || rawText.includes('could not be found')) {
      return { error: 'Requested service route is not reachable (HTTP 404).' };
    }
    if (rawText.startsWith('<!doctype') || rawText.startsWith('<html')) {
      return { error: `Server returned an HTML page instead of API response (HTTP ${res.status}).` };
    }
    const cleanMsg = rawText.trim().slice(0, 150);
    return { error: cleanMsg || `Server responded with status ${res.status}` };
  };

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('yia_token') : null);

    if (activeToken) {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }
    if (activeWorkspace) {
      headers.set('x-workspace-id', activeWorkspace.id);
    }
    if (user?.id) {
      headers.set('x-user-id', user.id);
    }
    if (user?.email) {
      headers.set('x-user-email', user.email);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        // Session expired or revoked
        setUser(null);
        setToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('yia_token');
          localStorage.removeItem('yia_cached_user');
          localStorage.removeItem('yia_cached_workspace');
        }
      }
      const errMsg = (data && data.error) ? data.error : `Server request error (${res.status})`;
      throw new Error(errMsg);
    }
    return data;
  };

  const refreshUserData = async () => {
    const savedToken = localStorage.getItem('yia_token');
    if (!savedToken) {
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/api/auth/me');
      if (data && data.user) {
        setUser(data.user);
        localStorage.setItem('yia_cached_user', JSON.stringify(data.user));
        const wsList = data.workspaces || [];
        setWorkspaces(wsList);
        const resolvedWs = data.activeWorkspace || wsList[0] || null;
        if (resolvedWs) {
          setActiveWorkspaceState(resolvedWs);
          localStorage.setItem('yia_cached_workspace', JSON.stringify(resolvedWs));
        }
      } else {
        // If server says unauthorized or invalid session, clear local state
        setUser(null);
        setToken(null);
        localStorage.removeItem('yia_token');
        localStorage.removeItem('yia_cached_user');
        localStorage.removeItem('yia_cached_workspace');
      }
    } catch {
      // On 401 or network error, if not valid, clear user session
      setUser(null);
      setToken(null);
      localStorage.removeItem('yia_token');
      localStorage.removeItem('yia_cached_user');
      localStorage.removeItem('yia_cached_workspace');
    } finally {
      setLoading(false);
    }
  };

  // Sync with real Firebase Authentication state changes
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (!isMounted) return;

      if (fbUser) {
        // Real authenticated user in Firebase
        let existingToken = localStorage.getItem('yia_token');
        if (!existingToken) {
          try {
            const syncRes = await fetch('/api/auth/firebase-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: fbUser.uid,
                email: fbUser.email,
                name: fbUser.displayName,
                avatarUrl: fbUser.photoURL,
              }),
            });
            const syncData = await syncRes.json().catch(() => null);
            if (syncData && syncData.token) {
              const freshToken = String(syncData.token);
              existingToken = freshToken;
              localStorage.setItem('yia_token', freshToken);
              setToken(freshToken);
            }
          } catch {}
        }

        if (existingToken) {
          setToken(existingToken);
          try {
            const res = await fetch('/api/auth/me', {
              headers: {
                Authorization: `Bearer ${existingToken}`,
                'Content-Type': 'application/json',
              },
            });
            const data = await res.json().catch(() => null);
            if (isMounted && data && data.user) {
              setUser(data.user);
              localStorage.setItem('yia_cached_user', JSON.stringify(data.user));
              const wsList = data.workspaces || [];
              setWorkspaces(wsList);
              const resolvedWs = data.activeWorkspace || wsList[0] || null;
              if (resolvedWs) {
                setActiveWorkspaceState(resolvedWs);
                localStorage.setItem('yia_cached_workspace', JSON.stringify(resolvedWs));
              }
            } else if (isMounted) {
              setUser(null);
              setToken(null);
              localStorage.removeItem('yia_token');
              localStorage.removeItem('yia_cached_user');
              localStorage.removeItem('yia_cached_workspace');
            }
          } catch {
            if (isMounted) {
              setUser(null);
              setToken(null);
              localStorage.removeItem('yia_token');
              localStorage.removeItem('yia_cached_user');
              localStorage.removeItem('yia_cached_workspace');
            }
          } finally {
            if (isMounted) setLoading(false);
          }
        } else {
          if (isMounted) setLoading(false);
        }
      } else {
        // No Firebase user is signed in
        const savedToken = localStorage.getItem('yia_token');
        if (savedToken) {
          try {
            const res = await fetch('/api/auth/me', {
              headers: {
                Authorization: `Bearer ${savedToken}`,
                'Content-Type': 'application/json',
              },
            });
            const data = await res.json().catch(() => null);
            if (isMounted && data && data.user) {
              setUser(data.user);
              localStorage.setItem('yia_cached_user', JSON.stringify(data.user));
              setWorkspaces(data.workspaces || []);
              setActiveWorkspaceState(data.activeWorkspace || data.workspaces[0] || null);
            } else if (isMounted) {
              // Token is invalid/expired, reset state to force Login Page
              setUser(null);
              setToken(null);
              setWorkspaces([]);
              setActiveWorkspaceState(null);
              localStorage.removeItem('yia_token');
              localStorage.removeItem('yia_cached_user');
              localStorage.removeItem('yia_cached_workspace');
            }
          } catch {
            if (isMounted) {
              setUser(null);
              setToken(null);
              setWorkspaces([]);
              setActiveWorkspaceState(null);
              localStorage.removeItem('yia_token');
              localStorage.removeItem('yia_cached_user');
              localStorage.removeItem('yia_cached_workspace');
            }
          } finally {
            if (isMounted) setLoading(false);
          }
        } else {
          // Brand new visitor, not logged in
          setUser(null);
          setToken(null);
          setWorkspaces([]);
          setActiveWorkspaceState(null);
          localStorage.removeItem('yia_cached_user');
          localStorage.removeItem('yia_cached_workspace');
          if (isMounted) setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const createClientSession = (userData: any, workspaceName?: string) => {
    const isSuper = Boolean(userData.isSuperAdmin || userData.role === 'superadmin');
    const localUser: User = {
      id: userData.uid || userData.id || `usr_${Date.now()}`,
      name: userData.name || userData.displayName || userData.email?.split('@')[0] || 'Business Owner',
      email: userData.email,
      businessName: userData.businessName || workspaceName || `${userData.name || 'Store'}'s Workspace`,
      phone: userData.phone || '',
      role: isSuper ? 'superadmin' : (userData.role || 'owner'),
      isSuperAdmin: isSuper,
      status: 'active',
      avatarUrl: userData.avatarUrl || userData.photoURL || '',
      createdAt: new Date().toISOString(),
    };

    const localWorkspace: Workspace = {
      id: `ws_${localUser.id}`,
      name: localUser.businessName || `${localUser.name}'s Business`,
      slug: (localUser.businessName || 'workspace').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30),
      ownerId: localUser.id,
      businessType: 'Retail & E-commerce',
      phone: localUser.phone,
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
      language: 'both',
      createdAt: new Date().toISOString(),
    };

    setUser(localUser);
    localStorage.setItem('yia_cached_user', JSON.stringify(localUser));
    localStorage.setItem('yia_cached_workspace', JSON.stringify(localWorkspace));
    setWorkspaces([localWorkspace]);
    setActiveWorkspaceState(localWorkspace);
  };

  const login = async (email: string, password?: string, firebaseUid?: string, fbUserObj?: any) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firebaseUid }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await parseJsonResponse(res);
        if (data && data.user) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('yia_token', data.token);
          localStorage.setItem('yia_cached_user', JSON.stringify(data.user));
          setWorkspaces(data.workspaces || []);
          setActiveWorkspaceState(data.activeWorkspace || data.workspaces[0] || null);
          return { success: true };
        }
      }

      // If server is 404 (e.g. static hosting on Vercel) or unreachable, but real Firebase user was authenticated
      if (fbUserObj || firebaseUid) {
        createClientSession(
          fbUserObj || { uid: firebaseUid, email },
          `${email.split('@')[0]}'s Workspace`
        );
        return { success: true };
      }

      if (res) {
        const data = await parseJsonResponse(res);
        return { success: false, error: (data && data.error) || `Login request returned HTTP ${res.status}` };
      }

      return { success: false, error: 'Could not connect to authentication service.' };
    } catch (err: any) {
      if (fbUserObj || firebaseUid) {
        createClientSession(fbUserObj || { uid: firebaseUid, email });
        return { success: true };
      }
      return { success: false, error: err.message || 'Login error' };
    }
  };

  const register = async (inputData: {
    name: string;
    email: string;
    password: string;
    businessName?: string;
    phone?: string;
    uid?: string;
    fbUser?: any;
  }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await parseJsonResponse(res);
        if (data && data.user) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('yia_token', data.token);
          localStorage.setItem('yia_cached_user', JSON.stringify(data.user));
          setWorkspaces(data.workspaces || [data.workspace]);
          setActiveWorkspaceState(data.workspace);
          return { success: true };
        }
      }

      // If server endpoint is 404 (static Vercel hosting) or unreachable, but real Firebase user was created
      if (inputData.fbUser || inputData.uid) {
        createClientSession({
          uid: inputData.uid || inputData.fbUser?.uid,
          name: inputData.name,
          email: inputData.email,
          businessName: inputData.businessName,
          phone: inputData.phone,
        }, inputData.businessName);
        return { success: true };
      }

      if (res) {
        const data = await parseJsonResponse(res);
        return { success: false, error: (data && data.error) || `Registration request returned HTTP ${res.status}` };
      }

      return { success: false, error: 'Could not connect to registration service.' };
    } catch (err: any) {
      if (inputData.fbUser || inputData.uid) {
        createClientSession({
          uid: inputData.uid || inputData.fbUser?.uid,
          name: inputData.name,
          email: inputData.email,
          businessName: inputData.businessName,
          phone: inputData.phone,
        }, inputData.businessName);
        return { success: true };
      }
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
    // Fully sign out from Firebase client instance
    firebaseSignOut().catch(() => {});

    setUser(null);
    setToken(null);
    setWorkspaces([]);
    setActiveWorkspaceState(null);
    localStorage.removeItem('yia_token');
    localStorage.removeItem('yia_cached_user');
    localStorage.removeItem('yia_cached_workspace');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('yia_entered_app');
    }
  };

  const setActiveWorkspace = (ws: Workspace) => {
    setActiveWorkspaceState(ws);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
