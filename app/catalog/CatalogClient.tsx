'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { DESIGNS, THEMES, SOURCE_LABELS, type Design } from '@/lib/designs';
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
      d.name.toLowerCase().includes(q) || d.id.includes(q) || d.theme.includes(q)
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
      });
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
    <div style={{ minHeight: '100vh', background: '#F5EFE4', color: '#2B2620' }}>

      {/* ── ヘッダー ── */}
      <header style={{
        padding: '20px 16px 14px',
        borderBottom: '1px solid #C4B59A',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: 30,
            fontWeight: 400,
            letterSpacing: '0.02em',
            margin: 0,
          }}>
            COCOcase
          </h1>
          <p style={{ fontSize: 11, color: '#8B7355', letterSpacing: '0.12em', marginTop: 3 }}>
            AIRPODS PRO 3 CASE — {DESIGNS.length} DESIGNS
          </p>
        </div>
        <a href="/review" style={{
          padding: '7px 14px',
          background: '#2B2620', color: '#F5EFE4',
          border: 'none', borderRadius: 999,
          fontSize: 11, letterSpacing: '0.08em',
          textDecoration: 'none', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          ✓✗ REVIEW
        </a>
      </header>

      {/* ── フィルター ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#F5EFE4',
        borderBottom: '1px solid #D4C5A9',
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
              border: '1px solid #C4B59A',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.4)',
              color: '#2B2620',
              fontSize: 12,
              outline: 'none',
              flex: 1,
              maxWidth: 200,
            }}
          />
          <span style={{ fontSize: 11, color: '#8B7355', whiteSpace: 'nowrap' }}>
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
            { id: 'adopted', label: '✓ 採用', color: '#4A7C59' },
            { id: 'pending', label: '– 未', color: '#8B7355' },
            { id: 'rejected', label: '✗ 不採用', color: '#B85C5C' },
          ] as const).map(rf => (
            <button
              key={rf.id}
              onClick={() => setReviewFilter(rf.id)}
              style={{
                padding: '3px 10px',
                border: '1px solid',
                borderColor: reviewFilter === rf.id ? (rf.color || '#2B2620') : '#C4B59A',
                borderRadius: 999,
                background: reviewFilter === rf.id ? (rf.color || '#2B2620') : 'transparent',
                color: reviewFilter === rf.id ? '#F5EFE4' : (rf.color || '#6B5A44'),
                fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s',
              }}
            >
              {rf.label}
            </button>
          ))}
          <div style={{ width: 1, background: '#D4C5A9', margin: '2px 4px', flexShrink: 0 }} />
          {([
            { id: 1, label: 'POS1' },
            { id: 2, label: 'POS2' },
            { id: 3, label: 'TEXTILE' },
          ] as const).map(p => (
            <button
              key={p.id}
              onClick={() => setViewPos(p.id)}
              style={{
                padding: '3px 10px',
                border: '1px solid',
                borderColor: viewPos === p.id ? '#2B2620' : '#C4B59A',
                borderRadius: 999,
                background: viewPos === p.id ? '#2B2620' : 'transparent',
                color: viewPos === p.id ? '#F5EFE4' : '#6B5A44',
                fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s',
              }}
            >
              {p.label}
            </button>
          ))}
          <div style={{ width: 1, background: '#D4C5A9', margin: '2px 4px', flexShrink: 0 }} />
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                padding: '3px 11px',
                border: '1px solid',
                borderColor: theme === t.id ? '#2B2620' : '#C4B59A',
                borderRadius: 999,
                background: theme === t.id ? '#2B2620' : 'transparent',
                color: theme === t.id ? '#F5EFE4' : '#6B5A44',
                fontSize: 11,
                letterSpacing: '0.07em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.12s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── グリッド ── */}
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
              background: '#F5EFE4',
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
              borderBottom: '1px solid #D4C5A9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.1em', marginBottom: 2 }}>
                  {modal.design.id} · {modal.design.theme.toUpperCase()} · {SOURCE_LABELS[modal.design.source]}
                </div>
                <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 22, fontWeight: 400 }}>
                  {modal.design.name}
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B7355', padding: 4, marginTop: -2 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* modal image */}
            <div style={{ position: 'relative', aspectRatio: '1', background: '#E0D6C8', overflow: 'hidden' }}>
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
                      background: modal.pos === i + 1 ? '#2B2620' : 'rgba(43,38,32,0.28)',
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
              <span style={{ fontSize: 11, color: '#8B7355' }}>
                {modal.pos > mockupCount(modal.design.id)
                  ? `${modal.pos} / ${totalPages(modal.design.id)} · パターン`
                  : `${modal.pos} / ${totalPages(modal.design.id)}`}
              </span>
              {modal.design.sourceUrl && (
                <a
                  href={modal.design.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, color: '#8B7355', textDecoration: 'none',
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

  const reviewColor = review === 'adopted' ? '#4A7C59' : review === 'rejected' ? '#B85C5C' : undefined;

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
        background: '#FDF8F0',
        border: `1px solid ${reviewColor ?? '#D4C5A9'}`,
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(43,38,32,0.13)' : '0 1px 4px rgba(43,38,32,0.06)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        opacity: review === 'rejected' ? 0.6 : 1,
      }}
    >
      {/* image */}
      <div style={{ aspectRatio: !isTextile && imgStage === 0 ? '5/6' : '1', background: '#E0D6C8', position: 'relative', overflow: 'hidden' }}>
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
            color: '#C4B59A', gap: 6,
          }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>◻</span>
            <span style={{ fontSize: 11, letterSpacing: '0.06em' }}>{design.id}</span>
          </div>
        )}
        {review && (
          <div style={{
            position: 'absolute', top: 7, left: 7,
            background: review === 'adopted' ? '#4A7C59' : '#B85C5C',
            color: '#fff',
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
          }}>
            {review === 'adopted' ? '✓' : '✗'}
          </div>
        )}
      </div>

      {/* info */}
      <div style={{ padding: '9px 11px 10px' }}>
        <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.08em', marginBottom: 2 }}>
          {design.id} · {design.theme.toUpperCase()}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>
          {design.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 10, color: '#8B7355',
            background: '#EDE5D8', borderRadius: 4, padding: '1px 6px',
            letterSpacing: '0.05em',
          }}>
            {SOURCE_LABELS[design.source]}
          </span>
          {design.sourceUrl && (
            <a
              href={design.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ color: '#B0A090', display: 'flex', alignItems: 'center' }}
            >
              <ExternalLink size={11} />
            </a>
          )}
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
                border: `1px solid ${review === 'adopted' ? '#4A7C59' : '#B85C5C'}`,
                borderRadius: 6,
                background: review === 'adopted' ? 'rgba(74,124,89,0.12)' : 'rgba(184,92,92,0.12)',
                color: review === 'adopted' ? '#4A7C59' : '#B85C5C',
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
                  border: '1px solid #B85C5C',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#B85C5C',
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
                  border: '1px solid #4A7C59',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#4A7C59',
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
    background: 'rgba(245,239,228,0.88)',
    border: 'none',
    borderRadius: '50%',
    width: 34, height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    color: '#2B2620',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  };
}
