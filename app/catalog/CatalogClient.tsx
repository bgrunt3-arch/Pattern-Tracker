'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { DESIGNS, THEMES, type Design } from '@/lib/designs';
import { ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';

type Decision = 'adopted' | 'rejected';
type ReviewMap = Record<string, Decision>;

// 特殊モックアップ（12枚レイアウト）
const EXTRA_MOCKUP_COUNTS: Record<string, number> = {
  "011": 12, "021": 12,
};

// POS2タブでのサムネイル位置オーバーライド（省略時は pos02）
const POS2_THUMB: Record<string, number> = {
  "011": 5, "021": 5,
};

// テーマID → 日本語表示名
const THEME_JP: Record<string, string> = Object.fromEntries(THEMES.map(t => [t.id, t.jp]));

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function patternSrc(d: Design) {
  return `/patterns/${d.id}_${slug(d.name)}.png`;
}

function mockupSrc(d: Design, pos: number) {
  return `/mockup-thumbs/${d.id}_${slug(d.name)}/pos${pos.toString().padStart(2, "0")}.jpg`;
}

interface ModalState {
  design: Design;
  pos: number;  // 1..mockupCount = モックアップ, mockupCount+1 = パターン
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function CatalogClient({ pos02Designs = [] }: { pos02Designs?: string[] }) {
  const pos02Set = useMemo(() => new Set(pos02Designs), [pos02Designs]);

  const mockupCount = (id: string) => {
    if (EXTRA_MOCKUP_COUNTS[id]) return EXTRA_MOCKUP_COUNTS[id];
    return pos02Set.has(id) ? 2 : 1;
  };

  const totalPages = (id: string) => mockupCount(id) + 1;

  const [theme, setTheme] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [reviewFilter, setReviewFilter] = useState<'all' | 'adopted' | 'rejected' | 'pending'>('all');
  const [viewPos, setViewPos] = useState<1 | 2 | 3>(1);

  // URLパラメータからフィルター初期値を読む
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rv = params.get('review');
    if (rv === 'adopted' || rv === 'rejected' || rv === 'pending') {
      setReviewFilter(rv);
    }
  }, []);

  useEffect(() => {
    fetch('/api/reviews', { cache: 'no-store' })
      .then(r => r.json())
      .then(setReviews)
      .catch(() => {/* ignore */});
  }, []);

  const filtered = useMemo(() => {
    let list = DESIGNS;
    if (theme !== 'all') list = list.filter(d => d.theme === theme);
    if (reviewFilter !== 'all') {
      if (reviewFilter === 'pending') list = list.filter(d => !reviews[d.id]);
      else list = list.filter(d => reviews[d.id] === reviewFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(d =>
      d.name.toLowerCase().includes(q) || d.id.includes(q) ||
      d.theme.includes(q) || (THEME_JP[d.theme] ?? '').includes(q)
    );
    return list;
  }, [theme, search, reviews, reviewFilter]);

  const handleReview = useCallback(async (id: string, decision: Decision | null) => {
    setReviews(prev => {
      const next = { ...prev };
      if (decision === null) delete next[id];
      else next[id] = decision;
      fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
        .then(r => { if (!r.ok) alert('保存に失敗しました'); })
        .catch(() => {});
      return next;
    });
  }, []);

  const openModal = (design: Design) => {
    setModal({ design, pos: 1 });
  };

  const prevPos = () =>
    setModal(m => m ? { ...m, pos: m.pos <= 1 ? totalPages(m.design.id) : m.pos - 1 } : null);

  const nextPos = () =>
    setModal(m => m ? { ...m, pos: m.pos >= totalPages(m.design.id) ? 1 : m.pos + 1 } : null);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#23303A' }}>

      {/* ── ヘッダー ── */}
      <header style={{
        padding: '28px 18px 20px',
        borderBottom: '1px solid #D5E2EC',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ margin: 0, lineHeight: 0 }}>
            <img src="/logo.png" alt="COCO case" style={{ height: 28, width: 'auto', display: 'block' }} />
          </h1>
          <p style={{ fontSize: 11, color: '#7A8A99', letterSpacing: '0.12em', marginTop: 10 }}>
            AIRPODS PRO 3 CASE — {DESIGNS.length} DESIGNS
          </p>
        </div>
      </header>

      {/* ── フィルター ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#FFFFFF',
        borderBottom: '1px solid #D5E2EC',
      }}>
        {/* 検索 + カウント行 */}
        <div style={{
          padding: '8px 16px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '5px 12px',
              border: '1px solid #D5E2EC',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.4)',
              color: '#23303A',
              fontSize: 12,
              outline: 'none',
              flex: 1,
              maxWidth: 200,
            }}
          />
          <span style={{ fontSize: 11, color: '#7A8A99', whiteSpace: 'nowrap' }}>
            {filtered.length} designs
          </span>
        </div>
        {/* テーマ + レビューフィルター — 横スクロール1行 */}
        <div style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          display: 'flex',
          gap: 5,
          padding: '0 16px 8px',
        }}>
          {/* レビューフィルター */}
          {([
            { id: 'all', label: 'ALL', color: undefined },
            { id: 'adopted', label: '✓ 採用', color: '#3DA9F4' },
            { id: 'pending', label: '– 未', color: '#7A8A99' },
            { id: 'rejected', label: '✗ 不採用', color: '#F76C6C' },
          ] as const).map(rf => (
            <button
              key={rf.id}
              onClick={() => setReviewFilter(rf.id)}
              style={{
                padding: '3px 10px',
                border: '1px solid',
                borderColor: reviewFilter === rf.id ? (rf.color || '#3DA9F4') : '#D5E2EC',
                borderRadius: 999,
                background: reviewFilter === rf.id ? (rf.color || '#3DA9F4') : 'transparent',
                color: reviewFilter === rf.id ? '#FFFFFF' : (rf.color || '#5E6E7C'),
                fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s',
              }}
            >
              {rf.label}
            </button>
          ))}
          <div style={{ width: 1, background: '#D5E2EC', margin: '2px 4px', flexShrink: 0 }} />
          {([
            { id: 1, label: '蓋開き' },
            { id: 2, label: '蓋閉じ' },
            { id: 3, label: 'テキスタイル' },
          ] as const).map(p => (
            <button
              key={p.id}
              onClick={() => setViewPos(p.id)}
              style={{
                padding: '3px 10px',
                border: '1px solid',
                borderColor: viewPos === p.id ? '#3DA9F4' : '#D5E2EC',
                borderRadius: 999,
                background: viewPos === p.id ? '#3DA9F4' : 'transparent',
                color: viewPos === p.id ? '#FFFFFF' : '#5E6E7C',
                fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s',
              }}
            >
              {p.label}
            </button>
          ))}
          <div style={{ width: 1, background: '#D5E2EC', margin: '2px 4px', flexShrink: 0 }} />
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                padding: '3px 11px',
                border: '1px solid',
                borderColor: theme === t.id ? '#3DA9F4' : '#D5E2EC',
                borderRadius: 999,
                background: theme === t.id ? '#3DA9F4' : 'transparent',
                color: theme === t.id ? '#FFFFFF' : '#5E6E7C',
                fontSize: 11,
                letterSpacing: '0.07em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.12s',
              }}
            >
              {t.jp}
            </button>
          ))}
        </div>
      </div>

      {/* ── グリッド ── */}
      {filtered.length === 0 ? (
        <div style={{ padding: '60px 16px', textAlign: 'center', color: '#7A8A99', fontSize: 13 }}>
          該当するデザインがありません
        </div>
      ) : (
      <main style={{
        padding: '16px 16px 64px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
      }}>
        {filtered.map(design => (
          <DesignCard
            key={design.id}
            design={design}
            review={reviews[design.id]}
            onReview={(d) => handleReview(design.id, d)}
            onClick={() => openModal(design)}
            viewPos={viewPos}
            hasPos02={pos02Set.has(design.id)}
            pos2Thumb={POS2_THUMB[design.id]}
          />
        ))}
      </main>
      )}

      {/* ── モーダル ── */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(43,38,32,0.82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              maxWidth: 480,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            }}
          >
            {/* modal header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #D5E2EC',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ fontSize: 10, color: '#7A8A99', letterSpacing: '0.1em', marginBottom: 2 }}>
                  {modal.design.id} · {THEME_JP[modal.design.theme] ?? modal.design.theme}
                </div>
                <div style={{ fontFamily: 'var(--font-rounded)', fontSize: 22, fontWeight: 400 }}>
                  {modal.design.name}
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8A99', padding: 4, marginTop: -2 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* modal image */}
            <div style={{ position: 'relative', aspectRatio: '1', background: '#EEF3F7', overflow: 'hidden' }}>
              <img
                src={modal.pos <= mockupCount(modal.design.id)
                  ? mockupSrc(modal.design, modal.pos)
                  : patternSrc(modal.design)
                }
                alt={modal.design.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button onClick={prevPos} style={navBtnStyle('left')}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextPos} style={navBtnStyle('right')}>
                <ChevronRight size={16} />
              </button>
              <div style={{
                position: 'absolute', bottom: 10, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', gap: 4,
              }}>
                {Array.from({ length: totalPages(modal.design.id) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setModal(m => m ? { ...m, pos: i + 1 } : null)}
                    style={{
                      width: 6, height: 6, borderRadius: '50%', border: 'none',
                      background: modal.pos === i + 1 ? '#3DA9F4' : 'rgba(43,38,32,0.28)',
                      cursor: 'pointer', padding: 0,
                      transition: 'background 0.12s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* modal footer */}
            <div style={{
              padding: '12px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, color: '#7A8A99' }}>
                {modal.pos > mockupCount(modal.design.id)
                  ? `${modal.pos} / ${totalPages(modal.design.id)} · パターン`
                  : `${modal.pos} / ${totalPages(modal.design.id)}`}
              </span>
              {modal.design.sourceUrl && modal.design.source !== 'burga' && (
                <a
                  href={modal.design.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, color: '#7A8A99', textDecoration: 'none',
                    letterSpacing: '0.06em',
                  }}
                >
                  参照元 <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── card ─────────────────────────────────────────────────────────────────────

// サムネイル表示ステージ: 0=mockup pos01, 1=pattern, 2=placeholder
type ImgStage = 0 | 1 | 2;

function DesignCard({ design, review, onReview, onClick, viewPos, hasPos02, pos2Thumb }: {
  design: Design;
  review?: Decision;
  onReview: (d: Decision | null) => void;
  onClick: () => void;
  viewPos: 1 | 2 | 3;
  hasPos02: boolean;
  pos2Thumb?: number;
}) {
  const [imgStage, setImgStage] = useState<ImgStage>(0);
  const [hovered, setHovered] = useState(false);

  const reviewColor = review === 'adopted' ? '#3DA9F4' : review === 'rejected' ? '#F76C6C' : undefined;

  const isTextile = viewPos === 3;
  const effectivePos = viewPos === 2 ? (pos2Thumb ?? (hasPos02 ? 2 : 1)) : 1;

  useEffect(() => { setImgStage(0); }, [effectivePos, isTextile]);

  // ステージに応じた src
  const imgSrc = isTextile
    ? patternSrc(design)
    : imgStage === 0
    ? mockupSrc(design, effectivePos)
    : imgStage === 1
    ? patternSrc(design)     // パターン（フォールバック）
    : null;

  const handleImgError = () => {
    setImgStage(s => (s < 2 ? (s + 1) as ImgStage : 2));
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${reviewColor ?? '#D5E2EC'}`,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 14px 30px rgba(61,169,244,0.22)' : '0 3px 12px rgba(36,48,58,0.07)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        opacity: review === 'rejected' ? 0.6 : 1,
      }}
    >
      {/* image */}
      <div style={{ aspectRatio: !isTextile && imgStage === 0 ? '5/6' : '1', background: '#EEF3F7', position: 'relative', overflow: 'hidden' }}>
        {imgSrc ? (
          <img
            key={`${design.id}-${imgStage}`}
            src={imgSrc}
            alt={design.name}
            loading="lazy"
            onError={handleImgError}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: '#D5E2EC', gap: 6,
          }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>◻</span>
            <span style={{ fontSize: 11, letterSpacing: '0.06em' }}>{design.id}</span>
          </div>
        )}
        {review && (
          <div style={{
            position: 'absolute', top: 7, left: 7,
            background: review === 'adopted' ? '#3DA9F4' : '#F76C6C',
            color: '#fff',
            fontSize: 10, padding: '2px 6px', borderRadius: 8,
          }}>
            {review === 'adopted' ? '✓' : '✗'}
          </div>
        )}
      </div>

      {/* info */}
      <div style={{ padding: '9px 11px 10px' }}>
        <div style={{ fontSize: 10, color: '#7A8A99', letterSpacing: '0.08em', marginBottom: 2 }}>
          {design.id} · {THEME_JP[design.theme] ?? design.theme}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>
          {design.name}
        </div>
        {/* review buttons */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', gap: 4, marginTop: 8 }}
        >
          {review ? (
            /* decided — show badge, tap to clear */
            <button
              onClick={() => onReview(null)}
              style={{
                flex: 1,
                padding: '4px 0',
                border: `1px solid ${review === 'adopted' ? '#3DA9F4' : '#F76C6C'}`,
                borderRadius: 12,
                background: review === 'adopted' ? 'rgba(61,169,244,0.14)' : 'rgba(247,108,108,0.14)',
                color: review === 'adopted' ? '#3DA9F4' : '#F76C6C',
                fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer',
                transition: 'opacity 0.12s',
              }}
            >
              {review === 'adopted' ? '✓ 採用済み · 解除' : '✗ 不採用済み · 解除'}
            </button>
          ) : (
            /* undecided — show ✗ / ✓ */
            <>
              <button
                onClick={() => onReview('rejected')}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  border: '1px solid #F76C6C',
                  borderRadius: 12,
                  background: '#F76C6C',
                  color: '#fff',
                  fontSize: 13, cursor: 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                ✗
              </button>
              <button
                onClick={() => onReview('adopted')}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  border: '1px solid #3DA9F4',
                  borderRadius: 12,
                  background: '#3DA9F4',
                  color: '#fff',
                  fontSize: 13, cursor: 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                ✓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function navBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    [side]: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.9)',
    border: 'none',
    borderRadius: '50%',
    width: 34, height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    color: '#23303A',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  };
}
