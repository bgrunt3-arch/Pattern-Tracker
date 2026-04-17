'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Copy, Download, Check, Clock, Sparkles, FileText,
  RotateCcw, ExternalLink, ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import { DESIGNS, THEMES, STATUSES, type Status } from '@/lib/designs';

const STORAGE_KEY = 'cococase-pattern-tracker-v1';

interface Entry {
  status: Status;
  notes: string;
}

type ProgressMap = Record<string, Entry>;

export default function PatternTracker() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [themeFilter, setThemeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setProgress(JSON.parse(saved));
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const updateProgress = (id: string, updates: Partial<Entry>) => {
    const current = progress[id] ?? { status: 'pending' as Status, notes: '' };
    const next: ProgressMap = { ...progress, [id]: { ...current, ...updates } };
    setProgress(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const resetAll = () => {
    setProgress({});
    localStorage.removeItem(STORAGE_KEY);
    setShowResetConfirm(false);
  };

  const getStatus = (id: string): Status => progress[id]?.status ?? 'pending';
  const getNotes = (id: string) => progress[id]?.notes ?? '';

  const stats = useMemo(() => {
    const s: Record<string, number> = { pending: 0, generated: 0, approved: 0, submitted: 0 };
    DESIGNS.forEach(d => { s[getStatus(d.id)]++; });
    return s;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const completedCount = stats.generated + stats.approved + stats.submitted;
  const completionPercent = Math.round((completedCount / 100) * 100);

  const filtered = useMemo(() => DESIGNS.filter(d => {
    if (themeFilter !== 'all' && d.theme !== themeFilter) return false;
    if (statusFilter !== 'all' && getStatus(d.id) !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !d.name.toLowerCase().includes(q) &&
        !d.burgaRef.toLowerCase().includes(q) &&
        !d.prompt.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [themeFilter, statusFilter, searchQuery, progress]);

  const copyPrompt = async (id: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* ignore */ }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Theme', 'Name', 'BURGA Ref', 'BURGA URL', 'Status', 'Notes', 'Prompt'];
    const rows = DESIGNS.map(d => {
      const st = getStatus(d.id);
      const nt = getNotes(d.id);
      const stLabel = STATUSES.find(s => s.id === st)?.jp ?? st;
      return [d.id, d.theme, d.name, d.burgaRef, d.burgaUrl, stLabel, nt, d.prompt]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cococase-patterns-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusIcons: Record<string, React.ElementType> = {
    pending: Clock,
    generated: Sparkles,
    approved: Check,
    submitted: FileText,
  };

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: '#3A3530' }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5EFE4', color: '#2B2620', fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", paddingBottom: 48 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .serif  { font-family: 'Fraunces', Georgia, serif; }
        .sans   { font-family: 'Inter', -apple-system, sans-serif; }
        .card   { transition: box-shadow 0.2s ease; }
        .card:hover { box-shadow: 0 4px 16px rgba(43,38,32,0.1); }
        .btn    { transition: all 0.15s ease; cursor: pointer; border: none; font-family: inherit; }
        .btn:active { transform: scale(0.96); }
        input, textarea, select { font-family: inherit; }
        textarea { resize: vertical; }
        select  { appearance: none; -webkit-appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%232B2620' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>");
          background-repeat: no-repeat; background-position: right 8px center; padding-right: 26px; }
        ::-webkit-scrollbar { height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D4C5A9; border-radius: 2px; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: '#2B2620', color: '#F5EFE4', padding: '28px 20px 22px', borderBottom: '1px solid #3A3530' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="sans" style={{ fontSize: 10, letterSpacing: 3, opacity: 0.55, marginBottom: 6 }}>
            COCOCASE · AIRPODS PRO 3
          </div>
          <h1 className="serif" style={{ fontSize: 34, fontWeight: 600, margin: '0 0 4px', letterSpacing: -0.5, lineHeight: 1.1 }}>
            Pattern <em style={{ color: '#D4A574' }}>Tracker</em>
          </h1>
          <div className="sans" style={{ fontSize: 13, opacity: 0.65 }}>BURGA参考の100デザイン管理</div>

          {/* Progress bar */}
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div className="sans" style={{ fontSize: 10, letterSpacing: 2.5, opacity: 0.55 }}>PROGRESS</div>
              <div className="serif" style={{ fontSize: 19, fontWeight: 600 }}>
                <span style={{ color: '#D4A574' }}>{completedCount}</span>
                <span style={{ opacity: 0.4, fontSize: 13 }}> / 100</span>
              </div>
            </div>
            <div style={{ height: 5, background: 'rgba(245,239,228,0.12)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completionPercent}%`, background: 'linear-gradient(90deg, #D4A574 0%, #E8C391 100%)', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Status chips */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
            {STATUSES.map(s => {
              const Icon = statusIcons[s.id];
              const active = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  className="btn sans"
                  onClick={() => setStatusFilter(active ? 'all' : s.id)}
                  style={{
                    background: active ? s.bg : 'rgba(245,239,228,0.08)',
                    color: active ? s.fg : '#F5EFE4',
                    border: `1px solid ${active ? s.border : 'rgba(245,239,228,0.18)'}`,
                    borderRadius: 20, padding: '5px 11px',
                    fontSize: 11, fontWeight: 500,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Icon size={11} />
                  {s.jp} <span style={{ opacity: active ? 1 : 0.7 }}>{stats[s.id] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── CONTROLS (sticky) ── */}
      <div style={{ background: '#EDE5D5', borderBottom: '1px solid #D4C5A9', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Theme chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 10, scrollbarWidth: 'thin' }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                className="btn sans"
                onClick={() => setThemeFilter(t.id)}
                style={{
                  background: themeFilter === t.id ? '#2B2620' : 'transparent',
                  color: themeFilter === t.id ? '#F5EFE4' : '#2B2620',
                  border: `1px solid ${themeFilter === t.id ? '#2B2620' : '#C4B59A'}`,
                  borderRadius: 20, padding: '5px 12px',
                  fontSize: 10, fontWeight: 500, letterSpacing: 1,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search + actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#8B7355', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="デザイン名 / BURGA参考 / プロンプトで検索..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="sans"
                style={{ width: '100%', padding: '8px 12px 8px 32px', fontSize: 12, border: '1px solid #D4C5A9', borderRadius: 6, background: '#F5EFE4', color: '#2B2620', outline: 'none' }}
              />
            </div>
            <button
              onClick={exportCSV}
              className="btn sans"
              title="CSV書き出し（西さん共有用）"
              style={{ background: '#2B2620', color: '#F5EFE4', borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Download size={13} /> CSV
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="btn sans"
              title="全進捗リセット"
              style={{ background: 'transparent', color: '#8B7355', border: '1px solid #C4B59A', borderRadius: 6, padding: '8px 10px', display: 'inline-flex', alignItems: 'center' }}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── LIST ── */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '16px 16px 0' }}>
        <div className="sans" style={{ fontSize: 10, color: '#8B7355', letterSpacing: 2, marginBottom: 12 }}>
          {filtered.length} 件表示
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B7355' }}>
            <div className="serif" style={{ fontSize: 20, fontStyle: 'italic', marginBottom: 6 }}>該当なし</div>
            <div className="sans" style={{ fontSize: 13 }}>フィルタを変えてみて</div>
          </div>
        )}

        {filtered.map(d => {
          const status = getStatus(d.id);
          const info = STATUSES.find(s => s.id === status)!;
          const isExpanded = expandedId === d.id;
          const themeInfo = THEMES.find(t => t.id === d.theme);

          return (
            <div
              key={d.id}
              className="card"
              style={{
                background: '#FFFBF3',
                border: `1px solid ${info.border}`,
                borderLeft: `4px solid ${info.fg}`,
                borderRadius: 8,
                marginBottom: 10,
                overflow: 'hidden',
              }}
            >
              {/* Main row */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {/* ID */}
                  <div className="serif" style={{ fontSize: 22, fontWeight: 600, color: '#D4A574', lineHeight: 1, flexShrink: 0, fontStyle: 'italic', minWidth: 46 }}>
                    {d.id}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                      <span className="sans" style={{ fontSize: 9, letterSpacing: 1.5, color: '#8B7355', fontWeight: 600 }}>
                        {themeInfo?.label}
                      </span>
                      {d.burgaRef !== '—' && (
                        <>
                          <span style={{ color: '#C4B59A', fontSize: 10 }}>·</span>
                          <span className="sans" style={{ fontSize: 10, color: '#8B7355', fontStyle: 'italic' }}>
                            ref: {d.burgaRef}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="serif" style={{ fontSize: 16, fontWeight: 500, color: '#2B2620', lineHeight: 1.2 }}>
                      {d.name}
                    </div>
                  </div>

                  {/* Status select */}
                  <div style={{ flexShrink: 0 }}>
                    <select
                      value={status}
                      onChange={e => updateProgress(d.id, { status: e.target.value as Status })}
                      className="sans"
                      style={{
                        background: info.bg, color: info.fg,
                        border: `1px solid ${info.border}`,
                        borderRadius: 14, padding: '4px 8px',
                        fontSize: 10, fontWeight: 600, cursor: 'pointer', outline: 'none',
                      }}
                    >
                      {STATUSES.map(s => <option key={s.id} value={s.id}>{s.jp}</option>)}
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button
                    onClick={() => copyPrompt(d.id, d.prompt)}
                    className="btn sans"
                    style={{
                      background: copiedId === d.id ? '#4A6B3A' : '#2B2620',
                      color: '#F5EFE4', borderRadius: 14,
                      padding: '5px 11px', fontSize: 11, fontWeight: 500,
                      display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center',
                    }}
                  >
                    {copiedId === d.id ? <><Check size={12} />コピー済み</> : <><Copy size={12} />プロンプト</>}
                  </button>
                  {d.burgaUrl && (
                    <a
                      href={d.burgaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn sans"
                      style={{
                        background: 'transparent', color: '#8B7355',
                        border: '1px solid #D4C5A9', borderRadius: 14,
                        padding: '5px 10px', fontSize: 11,
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <ExternalLink size={11} /> BURGA
                    </a>
                  )}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    className="btn"
                    style={{
                      background: 'transparent', color: '#8B7355',
                      border: '1px solid #D4C5A9', borderRadius: 14,
                      padding: '5px 8px', display: 'inline-flex', alignItems: 'center',
                    }}
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div style={{ background: '#F5EFE4', padding: '12px 14px', borderTop: `1px solid ${info.border}` }}>
                  <div className="sans" style={{ fontSize: 9, letterSpacing: 2, color: '#8B7355', marginBottom: 4, fontWeight: 600 }}>PROMPT</div>
                  <div
                    className="serif"
                    style={{ fontSize: 13, lineHeight: 1.6, color: '#2B2620', background: '#FFFBF3', padding: 10, borderRadius: 6, border: '1px solid #D4C5A9', fontStyle: 'italic', marginBottom: 12 }}
                  >
                    {d.prompt}
                  </div>
                  <div className="sans" style={{ fontSize: 9, letterSpacing: 2, color: '#8B7355', marginBottom: 4, fontWeight: 600 }}>NOTES</div>
                  <textarea
                    value={getNotes(d.id)}
                    onChange={e => updateProgress(d.id, { notes: e.target.value })}
                    placeholder="メモ・フィードバック・修正点など..."
                    className="sans"
                    style={{ width: '100%', minHeight: 64, padding: 10, fontSize: 13, border: '1px solid #D4C5A9', borderRadius: 6, background: '#FFFBF3', color: '#2B2620', outline: 'none', lineHeight: 1.5 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* ── RESET CONFIRM ── */}
      {showResetConfirm && (
        <div
          onClick={() => setShowResetConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(43,38,32,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#FFFBF3', borderRadius: 12, padding: 24, maxWidth: 360, width: '100%', border: '1px solid #D4C5A9' }}
          >
            <h3 className="serif" style={{ fontSize: 20, margin: '0 0 8px', color: '#2B2620' }}>全データをリセット？</h3>
            <p className="sans" style={{ fontSize: 13, color: '#6B5B45', margin: '0 0 18px', lineHeight: 1.5 }}>
              100件すべての進捗・ステータス・メモが消去されます。この操作は取り消せません。
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="btn sans"
                style={{ background: 'transparent', color: '#8B7355', border: '1px solid #D4C5A9', borderRadius: 6, padding: '8px 14px', fontSize: 13 }}
              >
                キャンセル
              </button>
              <button
                onClick={resetAll}
                className="btn sans"
                style={{ background: '#8B3A3A', color: '#F5EFE4', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 500 }}
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
