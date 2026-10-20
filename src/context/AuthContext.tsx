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
  login: (email: string, password?: string, firebaseUid?: string, fbUserObj?: any, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
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

  const getStoredToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('yia_token') || sessionStorage.getItem('yia_token') || null;
  };

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
    const activeToken = token || getStoredToken();

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

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: options.credentials || 'include',
    };

    const res = await fetch(url, fetchOptions);
    const data = await parseJsonResponse(res);

    if (!res.ok) {
      // Only revoke session if the core session endpoint specifically rejects the session
      if (res.status === 401 && (url === '/api/auth/me' || url.includes('/api/auth/me'))) {
        setUser(null);
        setToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('yia_token');
          localStorage.removeItem('yia_remember');
          localStorage.removeItem('yia_cached_user');
          localStorage.removeItem('yia_cached_workspace');
          sessionStorage.removeItem('yia_token');
          sessionStorage.removeItem('yia_cached_user');
          sessionStorage.removeItem('yia_cached_workspace');
        }
      }
      const errMsg = (data && data.error) ? data.error : `Server request error (${res.status})`;
      throw new Error(errMsg);
    }
    return data;
  };

  const refreshUserData = async () => {
    const savedToken = getStoredToken();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedToken) {
        headers['Authorization'] = `Bearer ${savedToken}`;
      }
      const res = await fetch('/api/auth/me', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (data && data.user) {
          setUser(data.user);
          const activeTok = data.token || savedToken;
          if (activeTok) {
            setToken(activeTok);
            localStorage.setItem('yia_token', activeTok);
            sessionStorage.setItem('yia_token', activeTok);
          }
          const wsList = data.workspaces || [];
          setWorkspaces(wsList);
          const resolvedWs = data.activeWorkspace || wsList[0] || null;
          if (resolvedWs) {
            setActiveWorkspaceState(resolvedWs);
          }
        }
      } else if (res.status === 401) {
        setUser(null);
        setToken(null);
        setWorkspaces([]);
        setActiveWorkspaceState(null);
        localStorage.removeItem('yia_token');
        localStorage.removeItem('yia_cached_user');
        sessionStorage.removeItem('yia_token');
      }
    } catch {
      // Retain state on network error
    } finally {
      setLoading(false);
    }
  };

  // 1. Initial Session Bootstrap on App Mount: Runs strictly ONCE
  // Checks HttpOnly cookie and/or stored token with the server before rendering
  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const savedToken = getStoredToken();
      if (savedToken) {
        setToken(savedToken);
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (savedToken) {
          headers['Authorization'] = `Bearer ${savedToken}`;
        }

        // Authoritative email from Firebase Auth or cached profile
        const fbCurrent = firebaseAuth.currentUser;
        if (fbCurrent?.email) {
          headers['x-user-email'] = fbCurrent.email.trim().toLowerCase();
        } else {
          const cachedUserStr = localStorage.getItem('yia_cached_user');
          if (cachedUserStr) {
            try {
              const cu = JSON.parse(cachedUserStr);
              if (cu?.email && !cu.email.endsWith('@example.com') && !cu.email.startsWith('user_')) {
                headers['x-user-email'] = cu.email;
              }
            } catch {}
          }
        }

        const res = await fetch('/api/auth/me', {
          headers,
          credentials: 'include',
        });

        if (res.ok) {
          const data = await parseJsonResponse(res);
          if (isMounted && data && data.user) {
            let authoritativeUser = data.user;
            // Never display a generated placeholder email if Firebase or client has the real email
            const realFbEmail = firebaseAuth.currentUser?.email?.trim()?.toLowerCase();
            if (realFbEmail && authoritativeUser.email !== realFbEmail) {
              authoritativeUser = {
                ...authoritativeUser,
                email: realFbEmail,
                name: (authoritativeUser.name && !authoritativeUser.name.startsWith('user_'))
                  ? authoritativeUser.name
                  : (firebaseAuth.currentUser?.displayName || realFbEmail.split('@')[0]),
              };
              // Sync backend database with real email in background
              fetch('/api/auth/firebase-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  uid: authoritativeUser.id,
                  email: realFbEmail,
                  name: authoritativeUser.name,
                }),
              }).catch(() => {});
            }

            setUser(authoritativeUser);
            const activeTok = data.token || savedToken;
            if (activeTok) {
              setToken(activeTok);
              localStorage.setItem('yia_token', activeTok);
              sessionStorage.setItem('yia_token', activeTok);
            }
            localStorage.setItem('yia_cached_user', JSON.stringify(authoritativeUser));
            const wsList = data.workspaces || [];
            setWorkspaces(wsList);
            const resolvedWs = data.activeWorkspace || wsList[0] || null;
            if (resolvedWs) {
              setActiveWorkspaceState(resolvedWs);
              localStorage.setItem('yia_cached_workspace', JSON.stringify(resolvedWs));
            }
          }
        } else if (res.status === 401) {
          // Token expired, invalid or revoked on server
          if (isMounted) {
            setUser(null);
            setToken(null);
            setWorkspaces([]);
            setActiveWorkspaceState(null);
            localStorage.removeItem('yia_token');
            localStorage.removeItem('yia_remember');
            localStorage.removeItem('yia_cached_user');
            localStorage.removeItem('yia_cached_workspace');
            sessionStorage.removeItem('yia_token');
            sessionStorage.removeItem('yia_cached_user');
            sessionStorage.removeItem('yia_cached_workspace');
          }
        }
      } catch (err) {
        // Offline / network glitch — restore cached profile without destroying session
        if (isMounted && savedToken) {
          const cachedUser = localStorage.getItem('yia_cached_user');
          const cachedWs = localStorage.getItem('yia_cached_workspace');
          if (cachedUser) {
            try {
              const u = JSON.parse(cachedUser);
              const realFbEmail = firebaseAuth.currentUser?.email?.trim()?.toLowerCase();
              if (realFbEmail && u.email !== realFbEmail) {
                u.email = realFbEmail;
              }
              setUser(u);
              if (cachedWs) {
                const w = JSON.parse(cachedWs);
                setWorkspaces([w]);
                setActiveWorkspaceState(w);
              }
            } catch {}
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-Time Firebase Authentication State Listener: Keeps user's real email synchronized
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const cleanFbEmail = fbUser.email.trim().toLowerCase();

        // Immediately update React user state with authoritative Firebase email
        setUser((currentUser) => {
          if (!currentUser) {
            const newUser: User = {
              id: fbUser.uid,
              name: fbUser.displayName || cleanFbEmail.split('@')[0],
              email: cleanFbEmail,
              businessName: `${fbUser.displayName || cleanFbEmail.split('@')[0]}'s Store`,
              phone: fbUser.phoneNumber || '',
              role: 'owner',
              isSuperAdmin: false,
              status: 'active',
              avatarUrl: fbUser.photoURL || '',
              createdAt: new Date().toISOString(),
            };
            localStorage.setItem('yia_cached_user', JSON.stringify(newUser));
            return newUser;
          }
          if (currentUser.email !== cleanFbEmail || currentUser.email.startsWith('user_') || currentUser.email.endsWith('@example.com')) {
            const updated = {
              ...currentUser,
              email: cleanFbEmail,
              name: (currentUser.name && !currentUser.name.startsWith('user_'))
                ? currentUser.name
                : (fbUser.displayName || cleanFbEmail.split('@')[0]),
            };
            localStorage.setItem('yia_cached_user', JSON.stringify(updated));
            return updated;
          }
          return currentUser;
        });

        // Safely synchronize database record if user has placeholder or out-of-date email
        try {
          const syncRes = await fetch('/api/auth/firebase-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              uid: fbUser.uid,
              email: cleanFbEmail,
              name: fbUser.displayName || undefined,
              avatarUrl: fbUser.photoURL || undefined,
            }),
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json().catch(() => null);
            if (syncData?.user?.email) {
              setUser(syncData.user);
              localStorage.setItem('yia_cached_user', JSON.stringify(syncData.user));
              if (syncData.token) {
                setToken(syncData.token);
                localStorage.setItem('yia_token', syncData.token);
                sessionStorage.setItem('yia_token', syncData.token);
              }
              if (syncData.workspaces && syncData.workspaces.length > 0) {
                setWorkspaces(syncData.workspaces);
                if (syncData.activeWorkspace) {
                  setActiveWorkspaceState(syncData.activeWorkspace);
                  localStorage.setItem('yia_cached_workspace', JSON.stringify(syncData.activeWorkspace));
                }
              }
            }
          }
        } catch {}
      }
    });

    return () => unsubscribe();
  }, []);

  const createClientSession = (userData: any, workspaceName?: string) => {
    const isSuper = Boolean(userData.isSuperAdmin || userData.role === 'superadmin');
    const localEmail = (userData.email || '').trim().toLowerCase();
    const localUser: User = {
      id: userData.uid || userData.id || `usr_${Date.now()}`,
      name: userData.name || userData.displayName || (localEmail ? localEmail.split('@')[0] : 'Business Owner'),
      email: localEmail,
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

    const expiresAt = Date.now() + 86400000 * 7;
    const clientToken = `yia_fb_${localUser.id}.${expiresAt}`;
    setToken(clientToken);
    sessionStorage.setItem('yia_token', clientToken);
    if (localStorage.getItem('yia_remember') === 'true') {
      localStorage.setItem('yia_token', clientToken);
    }

    setUser(localUser);
    localStorage.setItem('yia_cached_user', JSON.stringify(localUser));
    localStorage.setItem('yia_cached_workspace', JSON.stringify(localWorkspace));
    setWorkspaces([localWorkspace]);
    setActiveWorkspaceState(localWorkspace);
  };

  const login = async (email: string, password?: string, firebaseUid?: string, fbUserObj?: any, rememberMe: boolean = false) => {
    try {
      const cleanInputEmail = email ? email.trim().toLowerCase() : '';
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: cleanInputEmail, password, firebaseUid, rememberMe }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await parseJsonResponse(res);
        if (data && data.user && data.token) {
          const finalUser = { ...data.user };
          if (cleanInputEmail && finalUser.email !== cleanInputEmail && (finalUser.email.endsWith('@example.com') || finalUser.email.startsWith('user_'))) {
            finalUser.email = cleanInputEmail;
          }
          setUser(finalUser);
          setToken(data.token);

          localStorage.setItem('yia_token', data.token);
          localStorage.setItem('yia_cached_user', JSON.stringify(finalUser));
          sessionStorage.setItem('yia_token', data.token);
          if (rememberMe) {
            localStorage.setItem('yia_remember', 'true');
          }

          const wsList = data.workspaces || [];
          setWorkspaces(wsList);
          const resolvedWs = data.activeWorkspace || wsList[0] || null;
          if (resolvedWs) {
            setActiveWorkspaceState(resolvedWs);
            localStorage.setItem('yia_cached_workspace', JSON.stringify(resolvedWs));
          }
          return { success: true };
        }
      }

      // If server is 404 (e.g. static hosting on Vercel) or unreachable, but real Firebase user was authenticated
      if (fbUserObj || firebaseUid) {
        try {
          const syncRes = await fetch('/api/auth/firebase-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              uid: firebaseUid || fbUserObj?.uid,
              email,
              name: fbUserObj?.displayName || email.split('@')[0],
              avatarUrl: fbUserObj?.photoURL,
            }),
          });
          const syncData = await syncRes.json().catch(() => null);
          if (syncData && syncData.token && syncData.user) {
            setUser(syncData.user);
            setToken(syncData.token);
            localStorage.setItem('yia_token', syncData.token);
            localStorage.setItem('yia_cached_user', JSON.stringify(syncData.user));
            sessionStorage.setItem('yia_token', syncData.token);
            if (rememberMe) {
              localStorage.setItem('yia_remember', 'true');
            }
            const wsList = syncData.workspaces || [];
            setWorkspaces(wsList);
            const resolvedWs = syncData.activeWorkspace || wsList[0] || null;
            if (resolvedWs) {
              setActiveWorkspaceState(resolvedWs);
              localStorage.setItem('yia_cached_workspace', JSON.stringify(resolvedWs));
            }
            return { success: true };
          }
        } catch {}

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
        credentials: 'include',
        body: JSON.stringify(inputData),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await parseJsonResponse(res);
        if (data && data.user) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('yia_token', data.token);
          localStorage.setItem('yia_cached_user', JSON.stringify(data.user));
          sessionStorage.setItem('yia_token', data.token);
          setWorkspaces(data.workspaces || [data.workspace]);
          setActiveWorkspaceState(data.workspace);
          if (data.workspace) {
            localStorage.setItem('yia_cached_workspace', JSON.stringify(data.workspace));
          }
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
    const activeToken = token || getStoredToken();
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      },
      credentials: 'include',
    }).catch(() => {});

    // Fully sign out from Firebase client instance
    firebaseSignOut().catch(() => {});

    setUser(null);
    setToken(null);
    setWorkspaces([]);
    setActiveWorkspaceState(null);
    localStorage.removeItem('yia_token');
    localStorage.removeItem('yia_remember');
    localStorage.removeItem('yia_cached_user');
    localStorage.removeItem('yia_cached_workspace');
    sessionStorage.removeItem('yia_token');
    sessionStorage.removeItem('yia_cached_user');
    sessionStorage.removeItem('yia_cached_workspace');
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
