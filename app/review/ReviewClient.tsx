'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DESIGNS, type Design } from '@/lib/designs';

type Decision = 'adopted' | 'rejected';
type ReviewMap = Record<string, Decision>;
type SyncState = 'idle' | 'loading' | 'saving' | 'error';

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function patternSrc(d: Design) {
  return `/patterns/${d.id}_${slug(d.name)}.png`;
}

async function fetchReviews(): Promise<ReviewMap> {
  const res = await fetch('/api/reviews', { cache: 'no-store' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
}

async function saveReviews(map: ReviewMap): Promise<void> {
  const res = await fetch('/api/reviews', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(map),
  });
  if (!res.ok) throw new Error('save failed');
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function ReviewClient() {
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [imgError, setImgError] = useState(false);
  const [sync, setSync] = useState<SyncState>('loading');
  const touchStartX = useRef<number | null>(null);

  // 初期ロード
  useEffect(() => {
    setSync('loading');
    fetchReviews()
      .then(data => { setReviews(data); setSync('idle'); })
      .catch(() => setSync('error'));
  }, []);

  // 対象リスト
  const list = filter === 'pending'
    ? DESIGNS.filter(d => !reviews[d.id])
    : DESIGNS;

  const current = list[index] ?? null;

  const adoptedCount  = Object.values(reviews).filter(v => v === 'adopted').length;
  const rejectedCount = Object.values(reviews).filter(v => v === 'rejected').length;
  const pendingCount  = DESIGNS.length - adoptedCount - rejectedCount;

  // 決定処理
  const decide = useCallback((decision: Decision) => {
    if (!current || swipeDir) return;
    const dir = decision === 'adopted' ? 'right' : 'left';
    setSwipeDir(dir);

    setTimeout(async () => {
      const next = { ...reviews, [current.id]: decision };
      setReviews(next);
      setSwipeDir(null);
      setImgError(false);
      if (filter !== 'pending') setIndex(i => Math.min(i + 1, list.length - 1));

      // 保存
      setSync('saving');
      try {
        await saveReviews(next);
        setSync('idle');
      } catch {
        setSync('error');
      }
    }, 280);
  }, [current, swipeDir, reviews, filter, list.length]);

  // 元に戻す
  const undoLast = useCallback(async () => {
    const keys = Object.keys(reviews);
    if (!keys.length) return;
    const last = keys[keys.length - 1];
    const next = { ...reviews };
    delete next[last];
    setReviews(next);
    if (filter !== 'pending') setIndex(i => Math.max(i - 1, 0));

    setSync('saving');
    try {
      await saveReviews(next);
      setSync('idle');
    } catch {
      setSync('error');
    }
  }, [reviews, filter]);

  // キーボード
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide('adopted');
      if (e.key === 'ArrowLeft')  decide('rejected');
      if (e.key === 'ArrowUp' || e.key === 'Backspace') undoLast();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [decide, undoLast]);

  // タッチ
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) decide(dx > 0 ? 'adopted' : 'rejected');
    touchStartX.current = null;
  };

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#F5EFE4', color: '#2B2620', display: 'flex', flexDirection: 'column' }}>

      {/* ── ヘッダー ── */}
      <header style={{
        padding: '16px 20px 12px',
        borderBottom: '1px solid #C4B59A',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 24, fontWeight: 400, margin: 0 }}>
            Review
          </h1>
          <p style={{ fontSize: 11, color: '#8B7355', margin: '2px 0 0', letterSpacing: '0.08em' }}>
            ← NOPE · YES →
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* 統計（カタログへリンク） */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Stat label="採用" value={adoptedCount}  color="#4A7C59"  href="/catalog?review=adopted" />
            <Stat label="保留" value={pendingCount}  color="#8B7355"  href="/catalog?review=pending" />
            <Stat label="不採用" value={rejectedCount} color="#B85C5C" href="/catalog?review=rejected" />
          </div>
          {/* 同期インジケーター */}
          <SyncDot state={sync} />
        </div>
      </header>

      {/* ── フィルター ── */}
      <div style={{ padding: '8px 20px', borderBottom: '1px solid #D4C5A9', display: 'flex', gap: 6, alignItems: 'center' }}>
        {(['pending', 'all'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setIndex(0); setImgError(false); }} style={{
            padding: '3px 12px', border: '1px solid',
            borderColor: filter === f ? '#2B2620' : '#C4B59A',
            borderRadius: 999,
            background: filter === f ? '#2B2620' : 'transparent',
            color: filter === f ? '#F5EFE4' : '#6B5A44',
            fontSize: 11, letterSpacing: '0.07em', cursor: 'pointer',
          }}>
            {f === 'pending' ? `未レビュー (${pendingCount})` : `全件 (${DESIGNS.length})`}
          </button>
        ))}
        <button onClick={undoLast} style={{
          marginLeft: 'auto', padding: '3px 12px',
          border: '1px solid #C4B59A', borderRadius: 999,
          background: 'transparent', color: '#8B7355', fontSize: 11, cursor: 'pointer',
        }}>
          戻す
        </button>
      </div>

      {/* ── メイン ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', gap: 20 }}>

        {sync === 'loading' ? (
          <div style={{ textAlign: 'center', color: '#8B7355' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⟳</div>
            <p style={{ fontSize: 13 }}>読み込み中...</p>
          </div>
        ) : !current ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: 22, marginBottom: 4 }}>
              {filter === 'pending' ? 'すべてレビュー済み！' : '最後のデザインです'}
            </p>
            <p style={{ fontSize: 12, color: '#8B7355' }}>採用 {adoptedCount} / 不採用 {rejectedCount}</p>
            <button onClick={() => { setFilter('pending'); setIndex(0); }} style={{
              marginTop: 20, padding: '8px 24px',
              background: '#2B2620', color: '#F5EFE4',
              border: 'none', borderRadius: 999, fontSize: 13, cursor: 'pointer',
            }}>
              未レビューを確認
            </button>
          </div>
        ) : (
          <>
            {/* プログレス */}
            <div style={{ width: '100%', maxWidth: 420 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8B7355', marginBottom: 4 }}>
                <span>{filter === 'pending' ? `残り ${list.length}` : `${index + 1} / ${list.length}`}</span>
                <span>{current.id} · {current.theme.toUpperCase()}</span>
              </div>
              {filter !== 'pending' && (
                <div style={{ height: 3, background: '#D4C5A9', borderRadius: 2 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: '#2B2620', width: `${((index + 1) / list.length) * 100}%`, transition: 'width 0.2s' }} />
                </div>
              )}
            </div>

            {/* カード */}
            <div
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              style={{
                width: '100%', maxWidth: 420,
                background: '#FDF8F0', border: '1px solid #D4C5A9',
                borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(43,38,32,0.12)',
                transform: swipeDir === 'left'
                  ? 'translateX(-120%) rotate(-12deg)'
                  : swipeDir === 'right'
                  ? 'translateX(120%) rotate(12deg)'
                  : 'none',
                transition: swipeDir ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'none',
                userSelect: 'none',
              }}
            >
              <div style={{ position: 'relative', aspectRatio: '1', background: '#E0D6C8' }}>
                {!imgError ? (
                  <img
                    key={current.id}
                    src={patternSrc(current)}
                    alt={current.name}
                    onError={() => setImgError(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#C4B59A', gap: 8 }}>
                    <span style={{ fontSize: 36 }}>◻</span>
                    <span style={{ fontSize: 11 }}>画像なし</span>
                  </div>
                )}
                {reviews[current.id] && (
                  <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: reviews[current.id] === 'adopted' ? '#4A7C59' : '#B85C5C',
                    color: '#fff', fontSize: 10, letterSpacing: '0.1em',
                    padding: '3px 8px', borderRadius: 4,
                  }}>
                    {reviews[current.id] === 'adopted' ? '✓ 採用' : '✗ 不採用'}
                  </div>
                )}
                {swipeDir && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: swipeDir === 'right' ? 'rgba(74,124,89,0.35)' : 'rgba(184,92,92,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 64, fontWeight: 700,
                  }}>
                    {swipeDir === 'right' ? '✓' : '✗'}
                  </div>
                )}
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 20, fontWeight: 400, marginBottom: 2 }}>
                  {current.name}
                </div>
                <div style={{ fontSize: 11, color: '#8B7355', letterSpacing: '0.06em' }}>
                  {current.id} · {current.theme} · {current.source}
                </div>
              </div>
            </div>

            {/* ボタン */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <ActionBtn label="NOPE" icon="✗" color="#B85C5C" onClick={() => decide('rejected')} />
              <button onClick={undoLast} style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '1px solid #C4B59A', background: 'transparent',
                color: '#8B7355', fontSize: 11, letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>戻す</button>
              <ActionBtn label="YES" icon="✓" color="#4A7C59" onClick={() => decide('adopted')} />
            </div>

            <p style={{ fontSize: 11, color: '#C4B59A', textAlign: 'center' }}>
              スワイプまたは ← → キーでも操作できます
            </p>
          </>
        )}
      </div>

      {/* フッター */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #D4C5A9', textAlign: 'center' }}>
        <a href="/catalog" style={{ fontSize: 12, color: '#8B7355', textDecoration: 'none', letterSpacing: '0.08em' }}>
          ← カタログへ戻る
        </a>
      </div>
    </div>
  );
}

// ─── parts ───────────────────────────────────────────────────────────────────

function Stat({ label, value, color, href }: { label: string; value: number; color: string; href: string }) {
  return (
    <a href={href} style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
      <div style={{ fontSize: 18, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#8B7355', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
    </a>
  );
}

function ActionBtn({ label, icon, color, onClick }: {
  label: string; icon: string; color: string; onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 200);
    onClick();
  };

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={handlePress}
      style={{
        width: 72, height: 72, borderRadius: '50%',
        border: `2px solid ${color}`,
        background: pressed ? color : 'transparent',
        color: pressed ? '#fff' : color,
        fontSize: 28, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
        boxShadow: pressed ? `0 4px 16px ${color}44` : 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 9, letterSpacing: '0.1em', marginTop: 2 }}>{label}</span>
    </button>
  );
}

function SyncDot({ state }: { state: SyncState }) {
  const color = state === 'idle' ? '#4A7C59' : state === 'saving' || state === 'loading' ? '#C4A55A' : '#B85C5C';
  const label = state === 'idle' ? '同期済み' : state === 'saving' ? '保存中...' : state === 'loading' ? '読込中...' : 'エラー';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, transition: 'background 0.3s' }} />
      <span style={{ fontSize: 10, color: '#8B7355' }}>{label}</span>
    </div>
  );
}
