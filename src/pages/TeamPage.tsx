import React, { useState } from 'react';
import { Users, UserPlus, Shield, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const TeamPage: React.FC = () => {
  const { user, activeWorkspace } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'agent'>('agent');
  const [invitedList, setInvitedList] = useState<any[]>([]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInvitedList((prev) => [
      ...prev,
      {
        id: `inv_${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        status: 'Invited',
        date: new Date().toLocaleDateString(),
      },
    ]);
    setInviteEmail('');
    setShowInvite(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Team & Permissions</h1>
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-purple-300">
              Role-Based Access
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Assign agents to conversations and restrict sensitive administrative features.
          </p>
        </div>

        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Team Member</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/40">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {/* Current authenticated user */}
            <tr className="hover:bg-slate-900/50">
              <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white">
                  {user?.name.charAt(0) || 'U'}
                </div>
                <span>{user?.name} (You)</span>
              </td>
              <td className="py-3 px-4 text-slate-300">{user?.email}</td>
              <td className="py-3 px-4 capitalize font-bold text-purple-300">
                {user?.role || 'Owner'}
              </td>
              <td className="py-3 px-4">
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </td>
            </tr>

            {invitedList.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-900/50">
                <td className="py-3 px-4 text-slate-300">{inv.email.split('@')[0]}</td>
                <td className="py-3 px-4 text-slate-400">{inv.email}</td>
                <td className="py-3 px-4 capitalize text-slate-300">{inv.role}</td>
                <td className="py-3 px-4">
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                    Invite Sent
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="agent@store.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="agent">Agent (Inbox & Orders only)</option>
                  <option value="admin">Admin (Full settings access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-500"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
