import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Share2,
  CheckCircle,
  AlertTriangle,
  Play,
  Trash2,
  Image as ImageIcon,
  Send,
  Eye,
  Filter,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { ScheduledPost } from '../types/index.ts';

export const SchedulerPage: React.FC = () => {
  const { activeWorkspace, apiRequest, language } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Composer Modal State
  const [showComposer, setShowComposer] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Form Fields
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<('facebook' | 'instagram')[]>(['facebook', 'instagram']);
  const [hashtags, setHashtags] = useState('#DhakaFashion, #YearInfoAI, #OnlineShopBD');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().slice(0, 16);
  });

  const isBn = language === 'bn';

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/posts');
      if (Array.isArray(data)) {
        setPosts(data);
      }
    } catch (e: any) {
      console.warn('Notice loading posts:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [activeWorkspace?.id]);

  const togglePlatform = (p: 'facebook' | 'instagram') => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleCreatePost = async (status: 'scheduled' | 'draft') => {
    if (!caption.trim() || selectedPlatforms.length === 0) return;

    try {
      const payload = {
        platforms: selectedPlatforms,
        caption: caption.trim(),
        hashtags: hashtags.split(',').map((h) => h.trim()).filter(Boolean),
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        scheduledAt: new Date(scheduledDate).toISOString(),
        timezone: 'Asia/Dhaka',
        status,
      };

      const created = await apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setPosts((prev) => [created, ...prev]);
      setShowComposer(false);
      setCaption('');
      setMediaUrl('');
    } catch (e) {
      console.error('Failed to create post:', e);
    }
  };

  const handlePublishNow = async (id: string) => {
    try {
      const updated = await apiRequest(`/api/posts/${id}/publish-now`, { method: 'POST' });
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (e) {
      console.error('Failed to publish now:', e);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Cancel this scheduled post?')) return;
    try {
      await apiRequest(`/api/posts/${id}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('Failed to delete post:', e);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'published':
        return <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">Published</span>;
      case 'publishing':
        return <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/20 animate-pulse">Publishing</span>;
      case 'failed':
        return <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/20">Failed</span>;
      case 'draft':
        return <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-bold text-slate-400 border border-slate-500/20">Draft</span>;
      default:
        return <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/20">Scheduled</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Social Media Post Scheduler</h1>
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-purple-300">
              Asia/Dhaka GMT+6
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Schedule and publish high-converting visual content directly to your Facebook Page & Instagram.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="rounded-xl bg-slate-950 p-1 border border-slate-800 flex text-xs font-semibold">
            <button
              onClick={() => setViewMode('calendar')}
              className={`rounded-lg px-3 py-1.5 transition ${
                viewMode === 'calendar' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-lg px-3 py-1.5 transition ${
                viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              List View ({posts.length})
            </button>
          </div>

          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create & Schedule Post</span>
          </button>
        </div>
      </div>

      {/* Main Content: Calendar vs List */}
      {viewMode === 'list' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading scheduled posts...</div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarIcon className="mx-auto h-10 w-10 text-slate-600 mb-2" />
              <div className="text-sm font-bold text-white">No scheduled posts yet</div>
              <p className="text-xs text-slate-400 mt-1">Compose a post to schedule automated publishing across Facebook and Instagram.</p>
              <button
                onClick={() => setShowComposer(true)}
                className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500"
              >
                Schedule First Post
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {posts.map((p) => (
                <div key={p.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-900/50">
                  <div className="flex items-start gap-4 flex-1">
                    {p.mediaUrls && p.mediaUrls.length > 0 ? (
                      <img
                        src={p.mediaUrls[0]}
                        alt="Post media"
                        className="h-16 w-16 rounded-xl object-cover shrink-0 border border-slate-800"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 text-slate-600">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {p.platforms.map((pl) => (
                          <span
                            key={pl}
                            className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                              pl === 'facebook'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-pink-500/20 text-pink-300'
                            }`}
                          >
                            {pl}
                          </span>
                        ))}
                        {getStatusBadge(p.status)}
                      </div>

                      <p className="text-xs text-slate-200 font-bengali leading-relaxed line-clamp-2">
                        {p.caption}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-purple-400" />
                          {new Date(p.scheduledAt).toLocaleString()} ({p.timezone})
                        </span>
                        {p.hashtags.length > 0 && (
                          <span className="text-slate-500 truncate max-w-xs">{p.hashtags.join(' ')}</span>
                        )}
                      </div>

                      {p.errorMessage && (
                        <div className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" /> {p.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {p.status === 'scheduled' && (
                      <button
                        onClick={() => handlePublishNow(p.id)}
                        className="flex items-center gap-1 rounded-xl bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 transition"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Publish Now</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePost(p.id)}
                      className="rounded-xl p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Delete post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Calendar View Preview */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-purple-400" />
              Monthly Social Content Schedule (October 2026)
            </h2>
            <span className="text-xs text-slate-400">Durable Background Worker Active</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="font-bold text-slate-400 py-1">{d}</div>
            ))}
            {/* Generate calendar grid days */}
            {Array.from({ length: 31 }).map((_, i) => {
              const dayNum = i + 1;
              const dayPosts = posts.filter((p) => {
                const pDate = new Date(p.scheduledAt);
                return pDate.getDate() === dayNum;
              });

              return (
                <div
                  key={i}
                  className={`min-h-[85px] rounded-xl border p-2 text-left flex flex-col justify-between transition ${
                    dayNum === 9
                      ? 'border-purple-500 bg-purple-950/20'
                      : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${dayNum === 9 ? 'text-purple-400' : 'text-slate-400'}`}>
                      {dayNum}
                    </span>
                    {dayNum === 9 && (
                      <span className="rounded bg-purple-500 px-1 text-[8px] font-bold text-white uppercase">Today</span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden mt-1">
                    {dayPosts.map((dp) => (
                      <div
                        key={dp.id}
                        className="rounded bg-slate-800/90 p-1 text-[9px] text-purple-200 truncate border border-purple-500/20"
                        title={dp.caption}
                      >
                        {dp.platforms.join('+')} • {dp.status}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Post Composer & Platform Preview Modal */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-4xl rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowComposer(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              Social Media Post Composer & Multi-Platform Preview
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Form Fields */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Publish To</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => togglePlatform('facebook')}
                      className={`flex-1 rounded-xl border p-2.5 text-xs font-bold transition ${
                        selectedPlatforms.includes('facebook')
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 bg-slate-950 text-slate-500'
                      }`}
                    >
                      Facebook Page
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlatform('instagram')}
                      className={`flex-1 rounded-xl border p-2.5 text-xs font-bold transition ${
                        selectedPlatforms.includes('instagram')
                          ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                          : 'border-slate-800 bg-slate-950 text-slate-500'
                      }`}
                    >
                      Instagram Profile
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Post Caption (বাংলা & English) *</label>
                  <textarea
                    rows={4}
                    required
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write your engaging promotional copy..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-purple-500 focus:outline-none font-bengali leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hashtags</label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#Bangladesh, #OnlineShop, #Sale"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Media Image URL</label>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Date & Time (Asia/Dhaka)</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreatePost('draft')}
                    className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreatePost('scheduled')}
                    className="flex-1 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
                  >
                    Schedule Post
                  </button>
                </div>
              </div>

              {/* Right Column: Live Social Card Mockup */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-400">Live Post Preview</label>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  {/* Mock profile */}
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                      YI
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{activeWorkspace?.name || 'Dhaka Fashion Hub'}</div>
                      <div className="text-[10px] text-slate-500">Just now • Asia/Dhaka</div>
                    </div>
                  </div>

                  {/* Caption preview */}
                  <p className="text-xs text-slate-200 font-bengali leading-relaxed whitespace-pre-wrap">
                    {caption || 'Your caption will render here in real time...'}
                  </p>
                  {hashtags && (
                    <p className="text-[11px] text-purple-400 font-medium">{hashtags}</p>
                  )}

                  {/* Media preview */}
                  <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 h-48 flex items-center justify-center">
                    {mediaUrl ? (
                      <img src={mediaUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-600">Optional image media</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
