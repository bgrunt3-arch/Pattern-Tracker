'use client';

import { useState, useMemo } from 'react';
import { DESIGNS, THEMES, SOURCE_LABELS, type Design } from '@/lib/designs';
import { ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';

const MOCKUP_COUNTS: Record<string, number> = {
  "001": 2, "002": 2, "010": 2, "011": 12, "019": 2, "021": 12,
  "031": 2, "051": 2, "052": 2, "057": 2, "058": 2, "061": 2, "085": 2, "171": 2,
};

function mockupCount(id: string) { return MOCKUP_COUNTS[id] ?? 0; }

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function patternSrc(d: Design) {
  return `/patterns/${d.id}_${slug(d.name)}.png`;
}

function mockupSrc(d: Design, pos: number) {
  return `/mockups/${d.id}_${slug(d.name)}/pos${pos.toString().padStart(2, "0")}.png`;
}

interface ModalState {
  design: Design;
  pos: number;
  mode: 'mockup' | 'pattern';
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function CatalogClient() {
  const [theme, setTheme] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState | null>(null);

  const filtered = useMemo(() => {
    let list = DESIGNS;
    if (theme !== 'all') list = list.filter(d => d.theme === theme);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(d =>
      d.name.toLowerCase().includes(q) || d.id.includes(q) || d.theme.includes(q)
    );
    return list;
  }, [theme, search]);

  const openModal = (design: Design) => {
    if (mockupCount(design.id) > 0) {
      setModal({ design, pos: 1, mode: 'mockup' });
    } else {
      setModal({ design, pos: 0, mode: 'pattern' });
    }
  };

  const prevPos = () =>
    setModal(m => m ? { ...m, pos: m.pos <= 1 ? mockupCount(m.design.id) : m.pos - 1 } : null);

  const nextPos = () =>
    setModal(m => m ? { ...m, pos: m.pos >= mockupCount(m.design.id) ? 1 : m.pos + 1 } : null);

  return (
    <div style={{ minHeight: '100vh', background: '#F5EFE4', color: '#2B2620' }}>

      {/* ── ヘッダー ── */}
      <header style={{
        padding: '28px 32px 20px',
        borderBottom: '1px solid #C4B59A',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: 36,
          fontWeight: 400,
          letterSpacing: '0.02em',
          margin: 0,
        }}>
          COCOcase
        </h1>
        <p style={{ fontSize: 12, color: '#8B7355', letterSpacing: '0.12em', marginTop: 4 }}>
          AIRPODS PRO 3 CASE — {DESIGNS.length} DESIGNS
        </p>
      </header>

      {/* ── フィルター ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#F5EFE4',
        borderBottom: '1px solid #D4C5A9',
        padding: '10px 32px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
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
                transition: 'all 0.12s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '4px 12px',
            border: '1px solid #C4B59A',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.4)',
            color: '#2B2620',
            fontSize: 12,
            outline: 'none',
            width: 140,
          }}
        />
        <span style={{ fontSize: 11, color: '#8B7355', whiteSpace: 'nowrap' }}>
          {filtered.length} designs
        </span>
      </div>

      {/* ── グリッド ── */}
      <main style={{
        padding: '28px 32px 64px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: 18,
      }}>
        {filtered.map(design => (
          <DesignCard
            key={design.id}
            design={design}
            hasMockup={mockupCount(design.id) > 0}
            onClick={() => openModal(design)}
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
                src={modal.mode === 'mockup'
                  ? mockupSrc(modal.design, modal.pos)
                  : patternSrc(modal.design)
                }
                alt={modal.design.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {modal.mode === 'mockup' && (
                <>
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
                    {Array.from({ length: mockupCount(modal.design.id) }, (_, i) => (
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
                </>
              )}
            </div>

            {/* modal footer */}
            <div style={{
              padding: '12px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, color: '#8B7355' }}>
                {modal.mode === 'mockup' ? `${modal.pos} / ${mockupCount(modal.design.id)}` : 'パターン'}
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

function DesignCard({ design, hasMockup, onClick }: {
  design: Design;
  hasMockup: boolean;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FDF8F0',
        border: '1px solid #D4C5A9',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(43,38,32,0.13)' : '0 1px 4px rgba(43,38,32,0.06)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      {/* image */}
      <div style={{ aspectRatio: '1', background: '#E0D6C8', position: 'relative', overflow: 'hidden' }}>
        {!imgError ? (
          <img
            src={patternSrc(design)}
            alt={design.name}
            loading="lazy"
            onError={() => setImgError(true)}
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
        {hasMockup && (
          <div style={{
            position: 'absolute', top: 7, right: 7,
            background: 'rgba(43,38,32,0.72)',
            color: '#F5EFE4',
            fontSize: 9, letterSpacing: '0.08em',
            padding: '2px 6px', borderRadius: 4,
          }}>
            MOCKUP
          </div>
        )}
      </div>

      {/* info */}
      <div style={{ padding: '9px 11px 11px' }}>
        <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.08em', marginBottom: 2 }}>
          {design.id} · {design.theme.toUpperCase()}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 5 }}>
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
