import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  ShoppingBag,
  Tag,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Customer } from '../types/index.ts';

export const CustomersPage: React.FC = () => {
  const { activeWorkspace, apiRequest } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/customers');
      if (Array.isArray(data)) {
        setCustomers(data);
      }
    } catch (e: any) {
      console.warn('Notice loading customers:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [activeWorkspace?.id]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Customer Profiles & CRM</h1>
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-purple-300">
              {customers.length} Verified Profiles
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Unified customer profiles linked across Facebook Messenger, Instagram, WhatsApp, and Website Chat.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, phone, email..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading customer records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <Users className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <div className="text-sm font-bold text-slate-400">
              {search ? 'No customer records found matching search.' : 'No customers yet.'}
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Customer profiles will be created automatically when inquiries arrive through connected channels.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Primary Channel</th>
                  <th className="py-3 px-4">Orders Count</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{c.name}</div>
                      {c.notes && <div className="text-[10px] text-slate-500 italic">{c.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-purple-400" /> {c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1 text-[11px] text-slate-400"><Mail className="h-3 w-3 text-purple-400" /> {c.email}</div>}
                    </td>
                    <td className="py-3 px-4 capitalize font-semibold text-purple-300">
                      {c.primaryChannel}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {c.totalOrders}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      ৳ {c.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t, idx) => (
                          <span key={idx} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
