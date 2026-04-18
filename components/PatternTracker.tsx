'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Copy, Download, Check, Clock, Sparkles, FileText,
  RotateCcw, ExternalLink, ChevronDown, ChevronUp,
  Search, Wand2, ImageOff, AlertCircle, X,
} from 'lucide-react';
import { DESIGNS, THEMES, STATUSES, SOURCE_LABELS, type Status } from '@/lib/designs';

const STORAGE_KEY = 'cococase-pattern-tracker-v1';

// ─────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────
interface Entry {
  status: Status;
  notes: string;
  imageUrl?: string;       // Imagen 4 Fast で生成した画像（base64 data URL、localStorage 保存）
  generatedAt?: string;    // 生成日時
}

type ProgressMap = Record<string, Entry>;

// generate-images.ts が生成した manifest.json の型
type Manifest = Record<string, { url: string; generatedAt: string }>;

// ─────────────────────────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────────────────────────
export default function PatternTracker() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [manifest, setManifest] = useState<Manifest>({});
  const [themeFilter, setThemeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ── ロード ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setProgress(JSON.parse(saved));
    } catch { /* ignore */ }
    setLoaded(true);

    // バッチ生成 manifest を取得（存在しなければ空）
    fetch('/api/manifest')
      .then(r => r.ok ? r.json() : {})
      .then((m: Manifest) => {
        setManifest(m);
        // manifest に画像がある ID のうち、ステータスが pending のものを generated に昇格
        setProgress(prev => {
          const updated = { ...prev };
          let changed = false;
          Object.keys(m).forEach(id => {
            const current = updated[id] ?? { status: 'pending' as Status, notes: '' };
            if (current.status === 'pending') {
              updated[id] = { ...current, status: 'generated' as Status };
              changed = true;
            }
          });
          if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return changed ? updated : prev;
        });
      })
      .catch(() => { /* manifest なし → スルー */ });
  }, []);

  // ── 永続化 ──────────────────────────────────────────────────────
  const saveProgress = useCallback((next: ProgressMap) => {
    setProgress(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateProgress = useCallback((id: string, updates: Partial<Entry>) => {
    setProgress(prev => {
      const current = prev[id] ?? { status: 'pending' as Status, notes: '' };
      const next: ProgressMap = { ...prev, [id]: { ...current, ...updates } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetAll = () => {
    saveProgress({});
    localStorage.removeItem(STORAGE_KEY);
    setShowResetConfirm(false);
  };

  // ── ゲッター ─────────────────────────────────────────────────────
  const getStatus  = useCallback((id: string): Status  => progress[id]?.status   ?? 'pending', [progress]);
  const getNotes   = useCallback((id: string): string   => progress[id]?.notes    ?? '', [progress]);
  const getImageUrl = useCallback((id: string): string | undefined => {
    // localStorage（UI生成）を優先し、なければ manifest（バッチ生成）
    if (progress[id]?.imageUrl) return progress[id].imageUrl;
    return manifest[id]?.url;
  }, [manifest, progress]);

  // patterns/ から画像URLを構築（manifest未登録でもサムネ表示試行用）
  const getPatternsUrl = useCallback((id: string, name: string): string => {
    const slugName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    return `/patterns/${id}_${slugName}.png`;
  }, []);

  // ── 統計 ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const s: Record<string, number> = { pending: 0, generated: 0, approved: 0, submitted: 0 };
    DESIGNS.forEach(d => { s[getStatus(d.id)]++; });
    return s;
  }, [getStatus]);

  const completedCount   = stats.generated + stats.approved + stats.submitted;
  const completionPercent = Math.round((completedCount / DESIGNS.length) * 100);
  const generatedImages  = DESIGNS.filter(d => getImageUrl(d.id)).length;

  // ── フィルタ ────────────────────────────────────────────────────
  const filtered = useMemo(() => DESIGNS.filter(d => {
    if (themeFilter !== 'all' && d.theme !== themeFilter) return false;
    if (statusFilter !== 'all' && getStatus(d.id) !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !d.name.toLowerCase().includes(q) &&
        !d.sourceRef.toLowerCase().includes(q) &&
        !d.prompt.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [themeFilter, statusFilter, searchQuery, getStatus]);

  // ── プロンプトコピー ──────────────────────────────────────────────
  const copyPrompt = async (id: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* ignore */ }
  };

  // ── AI 画像生成（Imagen 4 Fast）────────────────────────────────────
  const generateImage = async (id: string, prompt: string) => {
    setGeneratingId(id);
    setGenerateError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId: id, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      updateProgress(id, {
        imageUrl: data.imageUrl,
        generatedAt: data.generatedAt,
        // ステータスが未着手なら自動で「生成済」に更新
        ...(getStatus(id) === 'pending' ? { status: 'generated' as Status } : {}),
      });
      // 生成後は展開表示
      setExpandedId(id);
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : '生成に失敗しました。');
    } finally {
      setGeneratingId(null);
    }
  };

  // ── CSV 書き出し ──────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['ID', 'Theme', 'Name', 'Source', 'Source Ref', 'Source URL', 'Status', 'Has Image', 'Notes', 'Prompt'];
    const rows = DESIGNS.map(d => {
      const st = getStatus(d.id);
      const stLabel = STATUSES.find(s => s.id === st)?.jp ?? st;
      return [
        d.id, d.theme, d.name, d.source, d.sourceRef, d.sourceUrl,
        stLabel,
        getImageUrl(d.id) ? '○' : '×',
        getNotes(d.id),
        d.prompt,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
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

  // ── 画像ダウンロード ────────────────────────────────────────────
  const downloadImage = async (id: string, url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `cococase-${id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const statusIcons: Record<string, React.ElementType> = {
    pending: Clock, generated: Sparkles, approved: Check, submitted: FileText,
  };

  // ── ローディング ─────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="serif" style={{ fontSize: 18, fontStyle: 'italic', color: '#8B7355' }}>Loading…</div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
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
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fade-in 0.3s ease; }
      `}</style>

      {/* ═══════════════════════════════════ HEADER ═══════════════════════════════════ */}
      <header style={{ background: '#2B2620', color: '#F5EFE4', padding: '28px 20px 22px', borderBottom: '1px solid #3A3530' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="sans" style={{ fontSize: 10, letterSpacing: 3, opacity: 0.55, marginBottom: 6 }}>
            COCOCASE · AIRPODS PRO 3
          </div>
          <h1 className="serif" style={{ fontSize: 34, fontWeight: 600, margin: '0 0 4px', letterSpacing: -0.5, lineHeight: 1.1 }}>
            Pattern <em style={{ color: '#D4A574' }}>Tracker</em>
          </h1>
          <div className="sans" style={{ fontSize: 13, opacity: 0.65 }}>BURGA参考の{DESIGNS.length}デザイン管理</div>

          {/* Progress bar */}
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div className="sans" style={{ fontSize: 10, letterSpacing: 2.5, opacity: 0.55 }}>PROGRESS</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                {generatedImages > 0 && (
                  <div className="sans" style={{ fontSize: 11, color: '#D4A574', opacity: 0.8 }}>
                    🖼 {generatedImages} 画像生成済
                  </div>
                )}
                <div className="serif" style={{ fontSize: 19, fontWeight: 600 }}>
                  <span style={{ color: '#D4A574' }}>{completedCount}</span>
                  <span style={{ opacity: 0.4, fontSize: 13 }}> / {DESIGNS.length}</span>
                </div>
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

      {/* ═══════════════════════════════════ CONTROLS ═══════════════════════════════════ */}
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

      {/* エラーバナー */}
      {generateError && (
        <div
          className="fade-in sans"
          style={{ background: '#FDE8E8', border: '1px solid #E8AAAA', borderRadius: 6, padding: '10px 14px', margin: '12px 16px 0', maxWidth: 900 - 32, marginLeft: 'auto', marginRight: 'auto', display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#7A3030' }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ flex: 1 }}>{generateError}</span>
          <button className="btn" onClick={() => setGenerateError(null)} style={{ background: 'transparent', padding: 0, color: '#7A3030' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════ LIST ═══════════════════════════════════ */}
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
          const status    = getStatus(d.id);
          const info      = STATUSES.find(s => s.id === status)!;
          const isExpanded = expandedId === d.id;
          const themeInfo  = THEMES.find(t => t.id === d.theme);
          const imageUrl   = getImageUrl(d.id);
          const isGenerating = generatingId === d.id;

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
              {/* ── Main row ── */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>

                  {/* サムネイル or プレースホルダー */}
                  <div
                    onClick={() => imageUrl && setLightboxUrl(imageUrl)}
                    style={{
                      width: 52, height: 52, flexShrink: 0,
                      borderRadius: 6,
                      border: `1px solid ${info.border}`,
                      overflow: 'hidden',
                      background: '#F0EAE0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: imageUrl ? 'zoom-in' : 'default',
                      position: 'relative',
                    }}
                  >
                    {/* プレースホルダー（画像がない or 生成中に表示） */}
                    {isGenerating ? (
                      <div className="spin" style={{ width: 18, height: 18, border: '2px solid #D4C5A9', borderTopColor: '#D4A574', borderRadius: '50%' }} />
                    ) : (
                      <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: '#D4A574', fontStyle: 'italic', lineHeight: 1 }}>
                        {d.id}
                      </div>
                    )}
                    {/* 画像（読み込み成功時に上書き表示、失敗時は非表示） */}
                    {!isGenerating && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl ?? getPatternsUrl(d.id, d.name)}
                        alt={d.name}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                      <span className="sans" style={{ fontSize: 9, letterSpacing: 1.5, color: '#8B7355', fontWeight: 600 }}>
                        {themeInfo?.label}
                      </span>
                      {d.sourceRef !== '—' && (
                        <>
                          <span style={{ color: '#C4B59A', fontSize: 10 }}>·</span>
                          <span className="sans" style={{ fontSize: 10, color: '#8B7355', fontStyle: 'italic' }}>
                            ref: {d.sourceRef}
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
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {/* プロンプトコピー */}
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

                  {/* AI 生成ボタン */}
                  <button
                    onClick={() => !isGenerating && generateImage(d.id, d.prompt)}
                    disabled={isGenerating}
                    className="btn sans"
                    title={imageUrl ? '再生成（Imagen 4 Fast）' : 'AI画像生成（Imagen 4 Fast）'}
                    style={{
                      background: imageUrl ? 'transparent' : '#D4A574',
                      color: imageUrl ? '#8B7355' : '#2B2620',
                      border: imageUrl ? '1px solid #D4C5A9' : '1px solid #C4915A',
                      borderRadius: 14,
                      padding: '5px 10px', fontSize: 11, fontWeight: 500,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      opacity: isGenerating ? 0.6 : 1,
                    }}
                  >
                    {isGenerating
                      ? <><div className="spin" style={{ width: 11, height: 11, border: '1.5px solid #8B7355', borderTopColor: '#2B2620', borderRadius: '50%' }} />生成中…</>
                      : imageUrl
                        ? <><ImageOff size={11} />再生成</>
                        : <><Wand2 size={11} />AI生成</>
                    }
                  </button>

                  {/* ソースリンク */}
                  {d.sourceUrl && (
                    <a
                      href={d.sourceUrl}
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
                      <ExternalLink size={11} /> {SOURCE_LABELS[d.source]}
                    </a>
                  )}

                  {/* 展開ボタン */}
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

              {/* ── Expanded ── */}
              {isExpanded && (
                <div className="fade-in" style={{ background: '#F5EFE4', padding: '14px 14px', borderTop: `1px solid ${info.border}` }}>

                  {/* 生成画像 */}
                  {imageUrl && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="sans" style={{ fontSize: 9, letterSpacing: 2, color: '#8B7355', marginBottom: 8, fontWeight: 600 }}>
                        GENERATED IMAGE
                        {progress[d.id]?.generatedAt && (
                          <span style={{ marginLeft: 8, opacity: 0.6, letterSpacing: 0 }}>
                            {new Date(progress[d.id].generatedAt!).toLocaleString('ja-JP')}
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={d.name}
                          onClick={() => setLightboxUrl(imageUrl)}
                          style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #D4C5A9', cursor: 'zoom-in', display: 'block' }}
                        />
                        <button
                          onClick={() => downloadImage(d.id, imageUrl)}
                          className="btn sans"
                          title="画像をダウンロード"
                          style={{
                            position: 'absolute', bottom: 8, right: 8,
                            background: 'rgba(43,38,32,0.75)', color: '#F5EFE4',
                            border: 'none', borderRadius: 6,
                            padding: '4px 8px', fontSize: 10,
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                          }}
                        >
                          <Download size={10} /> DL
                        </button>
                      </div>
                    </div>
                  )}

                  {/* プロンプト */}
                  <div className="sans" style={{ fontSize: 9, letterSpacing: 2, color: '#8B7355', marginBottom: 4, fontWeight: 600 }}>PROMPT</div>
                  <div
                    className="serif"
                    style={{ fontSize: 13, lineHeight: 1.6, color: '#2B2620', background: '#FFFBF3', padding: 10, borderRadius: 6, border: '1px solid #D4C5A9', fontStyle: 'italic', marginBottom: 12 }}
                  >
                    {d.prompt}
                  </div>

                  {/* メモ */}
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

      {/* ═══════════════════════════════════ LIGHTBOX ═══════════════════════════════════ */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(43,38,32,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Generated pattern"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="btn"
            style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(245,239,228,0.15)', color: '#F5EFE4', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════ RESET CONFIRM ═══════════════════════════════════ */}
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
              100件すべての進捗・ステータス・メモ・生成画像URLが消去されます。この操作は取り消せません。
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
