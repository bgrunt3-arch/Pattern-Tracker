#!/usr/bin/env tsx
/**
 * COCOcase Pattern Catalog — PDF生成スクリプト
 *
 * 使い方:
 *   npm run catalog
 *
 * 入力:
 *   public/patterns/       自動生成パターン（AI画像）
 *   public/patterns-manual/ 手動作成パターン（Microsoft Designer等）
 *
 * 出力:
 *   out/cococase-catalog-{date}.pdf
 */

import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { DESIGNS, THEMES } from "../lib/designs";

// ===== パス =====
const PATTERNS_DIR  = path.join(process.cwd(), "public", "patterns");
const MANUAL_DIR    = path.join(process.cwd(), "public", "patterns-manual");
const OUT_DIR       = path.join(process.cwd(), "out");

// ===== ヘルパー =====
function slugName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// 画像を base64 data URL に変換（Puppeteer の file:// アクセス制限を回避）
function toDataUrl(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const ext   = path.extname(filePath).toLowerCase().slice(1);
  const mime  = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  const data  = fs.readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${data}`;
}

function patternDataUrl(id: string, name: string): string | null {
  return toDataUrl(path.join(PATTERNS_DIR, `${id}_${slugName(name)}.png`));
}

// web=true のとき /patterns/... の URL を返す（base64 不使用・軽量）
function patternSrc(id: string, name: string, web: boolean): string | null {
  if (web) {
    const filename = `${id}_${slugName(name)}.png`;
    if (!fs.existsSync(path.join(PATTERNS_DIR, filename))) return null;
    return `/patterns/${filename}`;
  }
  return patternDataUrl(id, name);
}

// web=true のとき public/ 以下の相対URLを返す
function manualSrc(filePath: string, web: boolean): string | null {
  if (web) {
    if (!fs.existsSync(filePath)) return null;
    // /Users/.../public/patterns-manual/... → /patterns-manual/...
    const rel = filePath.split(/[\/\\]public[\/\\]/)[1];
    return rel ? `/${rel.replace(/\\/g, "/")}` : null;
  }
  return toDataUrl(filePath);
}

function today(): string {
  return new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).replace(/\//g, ".");
}

// ===== TOC =====
function buildTOC(): string {
  const themes = THEMES.filter(t => t.id !== "all");
  let pageNum = 4;

  const rows: string[] = [
    `<div class="toc-row">
      <span class="toc-theme serif">Editorial Note</span>
      <span class="toc-range"></span>
      <span class="toc-page serif italic">p.03</span>
    </div>`,
    ...themes.map(theme => {
      const designs = DESIGNS.filter(d => d.theme === theme.id);
      const first   = designs[0]?.id ?? "";
      const last    = designs[designs.length - 1]?.id ?? "";
      const p       = String(pageNum++).padStart(2, "0");
      return `<div class="toc-row">
        <span class="toc-theme serif">${theme.label} <span class="toc-jp">${theme.jp}</span></span>
        <span class="toc-range">${first} – ${last}</span>
        <span class="toc-page serif italic">p.${p}</span>
      </div>`;
    }),
    `<div class="toc-row">
      <span class="toc-theme serif">Original <span class="toc-jp">手動デザイン</span></span>
      <span class="toc-range"></span>
      <span class="toc-page serif italic">p.${String(pageNum).padStart(2, "0")}</span>
    </div>`,
  ];
  return rows.join("\n");
}

// ===== テーマ別ページ =====
function buildThemePages(web = false): string {
  const themes = THEMES.filter(t => t.id !== "all");
  let pageNum  = 4;

  return themes.map(theme => {
    const designs = DESIGNS.filter(d => d.theme === theme.id);
    const p       = String(pageNum++).padStart(2, "0");

    const gridHTML = designs.map(d => {
      const src     = patternSrc(d.id, d.name, web);
      const img     = src ? `<img src="${src}" alt="${d.name}" />` : `<div class="card-placeholder"></div>`;
      const hasLink = !!d.burgaUrl;
      const extIcon = hasLink ? `<span class="card-ext">↗</span>` : "";
      const inner   = `${img}<span class="card-id">${d.id}</span>${extIcon}`;
      if (hasLink) {
        return `<a class="card has-link" href="${d.burgaUrl}" target="_blank" rel="noopener" title="BURGA参考: ${d.burgaRef}">${inner}</a>`;
      }
      return `<div class="card">${inner}</div>`;
    }).join("");

    const namesHTML = designs.map(d => {
      const refPart = d.burgaRef !== "—"
        ? (d.burgaUrl
            ? `<a class="name-ref-link" href="${d.burgaUrl}" target="_blank" rel="noopener">ref: ${d.burgaRef}</a>`
            : `<span class="name-ref">ref: ${d.burgaRef}</span>`)
        : "";
      return `
      <div class="name-row">
        <span class="name-id serif italic">${d.id}</span>
        <span class="name-label">${d.name}</span>
        ${refPart}
      </div>`;
    }).join("");

    return `
      <div class="page">
        <div class="header">
          <div class="header-title serif italic">
            ${theme.label} <span class="header-jp">${theme.jp}</span>
          </div>
          <div class="header-meta">${designs.length} DESIGNS</div>
        </div>
        <div class="grid">${gridHTML}</div>
        <div class="names">${namesHTML}</div>
        <div class="footer">
          <span>COCOCASE · ${theme.label}</span>
          <span class="serif italic">p.${p}</span>
        </div>
      </div>
    `;
  }).join("\n");
}

// ===== 手動パターン スキャン =====
type ManualSection = { label: string; files: string[] };

function scanManualSections(): ManualSection[] {
  console.log(`\n   [scanManualSections] manualDir: ${MANUAL_DIR}`);
  console.log(`   [scanManualSections] exists: ${fs.existsSync(MANUAL_DIR)}`);

  if (!fs.existsSync(MANUAL_DIR)) return [];

  const entries = fs.readdirSync(MANUAL_DIR, { withFileTypes: true });
  console.log(`   [scanManualSections] entries: ${entries.map(e => e.name).join(", ") || "(none)"}`);

  const sections: ManualSection[] = [];

  // トップレベルの画像ファイル（サブフォルダ外）
  const topFiles = entries
    .filter(e => e.isFile() && /\.(png|jpg|jpeg)$/i.test(e.name))
    .map(e => path.join(MANUAL_DIR, e.name))
    .sort();
  if (topFiles.length > 0) {
    sections.push({ label: "Original", files: topFiles });
    console.log(`   [scanManualSections] top-level files: ${topFiles.length}`);
  }

  // サブフォルダ内を再帰スキャン
  const subDirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const dir of subDirs) {
    const subPath = path.join(MANUAL_DIR, dir.name);
    const subFiles = fs.readdirSync(subPath)
      .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
      .map(f => path.join(subPath, f))
      .sort();
    console.log(`   [scanManualSections] subdir "${dir.name}": ${subFiles.length} files`);
    if (subFiles.length > 0) {
      // フォルダ名をラベルに変換 (gemini-ai → Gemini AI)
      const label = dir.name.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      sections.push({ label, files: subFiles });
    }
  }

  return sections;
}

// ===== 手動パターンページ =====
function buildManualPage(sections: ManualSection[], startPage: number, web = false): string {
  const allFiles = sections.flatMap(s => s.files);

  if (allFiles.length === 0) {
    return `
      <div class="page">
        <div class="header">
          <div class="header-title serif italic">Original <span class="header-jp">手動デザイン</span></div>
          <div class="header-meta">MANUAL PATTERNS</div>
        </div>
        <div class="empty-note">
          <p>public/patterns-manual/ にPNG/JPGを配置してください。</p>
        </div>
        <div class="footer">
          <span>COCOCASE · ORIGINAL</span>
          <span class="serif italic">p.${String(startPage).padStart(2, "0")}</span>
        </div>
      </div>
    `;
  }

  // セクションをまたいで10枚ごとにページ分割
  const pages: Array<{ filePath: string; label: string }[]> = [];
  let current: Array<{ filePath: string; label: string }> = [];

  for (const section of sections) {
    for (const filePath of section.files) {
      const label = path.basename(filePath, path.extname(filePath));
      current.push({ filePath, label });
      if (current.length === 10) {
        pages.push(current);
        current = [];
      }
    }
  }
  if (current.length > 0) pages.push(current);

  return pages.map((chunk, pi) => {
    const p = String(startPage + pi).padStart(2, "0");

    const gridHTML = chunk.map(({ filePath, label }) => {
      const src = manualSrc(filePath, web);
      const img = src ? `<img src="${src}" alt="${label}" />` : `<div class="card-placeholder"></div>`;
      return `<div class="card">${img}</div>`;
    }).join("");

    const namesHTML = chunk.map(({ label }) =>
      `<div class="name-row"><span class="name-label">${label}</span></div>`
    ).join("");

    // セクション名をサブタイトルに（先頭ページのみ）
    const sectionLabel = sections.map(s => s.label).join(" / ");
    const meta = pi === 0 ? `${sectionLabel} · ${allFiles.length} FILES` : `CONTINUED · ${allFiles.length} FILES`;

    return `
      <div class="page">
        <div class="header">
          <div class="header-title serif italic">
            Original <span class="header-jp">手動デザイン</span>
          </div>
          <div class="header-meta">${meta}</div>
        </div>
        <div class="grid">${gridHTML}</div>
        <div class="names">${namesHTML}</div>
        <div class="footer">
          <span>COCOCASE · ORIGINAL</span>
          <span class="serif italic">p.${p}</span>
        </div>
      </div>
    `;
  }).join("\n");
}

// ===== Contactページ =====
function buildContactPage(pageNum: number): string {
  const p = String(pageNum).padStart(2, "0");
  return `
    <div class="page contact-page">
      <div class="header">
        <div class="header-title serif italic">Contact</div>
        <div class="header-meta">END OF CATALOG</div>
      </div>
      <div class="contact-body">
        <div class="contact-section">
          <div class="contact-label">DESIGN</div>
          <div class="contact-value serif">辻本</div>
        </div>
        <div class="contact-section">
          <div class="contact-label">BRAND</div>
          <div class="contact-value serif">COCOcase</div>
        </div>
        <div class="contact-section">
          <div class="contact-label">PRODUCT</div>
          <div class="contact-value">AirPods Pro 3 Case</div>
        </div>
        <div class="contact-divider"></div>
        <div class="contact-section">
          <div class="contact-label">TOOLS USED</div>
          <div class="contact-value">
            · Google Imagen 4 Fast<br>
            · Google Gemini 2.5 Flash Image<br>
            · Microsoft Designer<br>
            · Photopea + BetterMockups
          </div>
        </div>
        <div class="contact-section">
          <div class="contact-label">REFERENCE</div>
          <div class="contact-value">
            · BURGA (burga.jp / burga.com)
          </div>
        </div>
      </div>
      <div class="contact-end serif italic">— end —</div>
      <div class="footer">
        <span>COCOCASE · AirPods Pro 3</span>
        <span class="serif italic">p.${p}</span>
      </div>
    </div>
  `;
}

// ===== HTML組み立て =====
function buildHTML(manualSections: ManualSection[], web = false): string {
  const manualFiles     = manualSections.flatMap(s => s.files);
  const manualStartPage = 14;
  const contactPage     = manualStartPage + Math.max(1, Math.ceil(manualFiles.length / 10));
  const dateStr         = today();

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Inter:wght@300;400;500&family=Noto+Serif+JP:wght@300;400;500&display=swap');

    @page { size: A4; margin: 0; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Noto Serif JP', -apple-system, sans-serif;
      color: #2B2620;
      background: #F5EFE4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .serif  { font-family: 'Fraunces', 'Noto Serif JP', Georgia, serif; }
    .italic { font-style: italic; }

    /* ─── ページ共通 ─── */
    .page {
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      background: #F5EFE4;
      page-break-after: always;
      position: relative;
      padding: 16mm 18mm 22mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .page:last-child { page-break-after: auto; }

    /* ─── ヘッダー ─── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-bottom: 7pt;
      border-bottom: 0.5pt solid #C4B59A;
      margin-bottom: 12pt;
      flex-shrink: 0;
    }
    .header-title {
      font-size: 22pt;
      font-weight: 400;
      color: #2B2620;
      letter-spacing: -0.3pt;
    }
    .header-jp {
      font-size: 11pt;
      color: #8B7355;
      font-style: normal;
      margin-left: 6pt;
    }
    .header-meta {
      font-size: 7.5pt;
      letter-spacing: 2pt;
      color: #8B7355;
    }

    /* ─── フッター ─── */
    .footer {
      position: absolute;
      bottom: 9mm;
      left: 18mm;
      right: 18mm;
      display: flex;
      justify-content: space-between;
      padding-top: 6pt;
      border-top: 0.5pt solid #C4B59A;
      font-size: 7.5pt;
      letter-spacing: 1.5pt;
      color: #8B7355;
    }

    /* ─── 表紙 ─── */
    .cover {
      justify-content: space-between;
      padding: 18mm 20mm;
    }
    .cover-eyebrow {
      font-size: 7.5pt;
      letter-spacing: 4pt;
      color: #8B7355;
      text-transform: uppercase;
    }
    .cover-body {}
    .cover-title {
      font-family: 'Fraunces', 'Noto Serif JP', Georgia, serif;
      font-size: 72pt;
      font-weight: 300;
      line-height: 0.88;
      color: #2B2620;
      letter-spacing: -1pt;
      margin-bottom: 16pt;
    }
    .cover-title em {
      font-style: italic;
      font-weight: 600;
      color: #D4A574;
    }
    .cover-rule {
      width: 60pt;
      height: 0.75pt;
      background: #D4A574;
      margin: 16pt 0;
    }
    .cover-sub {
      font-size: 10.5pt;
      color: #8B7355;
      line-height: 1.8;
      max-width: 260pt;
    }
    .cover-foot {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8pt;
      letter-spacing: 2.5pt;
      color: #8B7355;
      border-top: 0.5pt solid #C4B59A;
      padding-top: 10pt;
    }
    .cover-vol {
      position: absolute;
      top: 18mm;
      right: 20mm;
      text-align: right;
    }
    .cover-vol div {
      font-size: 7pt;
      letter-spacing: 3pt;
      color: #C4B59A;
      line-height: 1.8;
    }

    /* ─── 目次 ─── */
    .toc { flex: 1; }
    .toc-row {
      display: flex;
      align-items: baseline;
      gap: 10pt;
      padding: 7pt 0;
      border-bottom: 0.25pt dotted #C4B59A;
    }
    .toc-theme {
      font-size: 13pt;
      font-weight: 400;
      min-width: 130pt;
      flex-shrink: 0;
    }
    .toc-jp {
      font-size: 9pt;
      color: #8B7355;
      font-style: normal;
      margin-left: 4pt;
    }
    .toc-range {
      font-size: 9pt;
      color: #8B7355;
      letter-spacing: 0.5pt;
      flex: 1;
    }
    .toc-page {
      font-size: 11pt;
      color: #D4A574;
      flex-shrink: 0;
    }

    /* ─── Editorial Note ─── */
    .note-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 20pt 0;
    }
    .note-text {
      font-family: 'Noto Serif JP', 'Fraunces', Georgia, serif;
      font-size: 12.5pt;
      line-height: 2.4;
      color: #2B2620;
      max-width: 420pt;
    }
    .note-signature {
      margin-top: 36pt;
      font-family: 'Fraunces', serif;
      font-style: italic;
      font-size: 13pt;
      color: #8B7355;
      text-align: right;
      max-width: 420pt;
    }

    /* ─── グリッド ─── */
    .grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5pt;
      margin-bottom: 10pt;
      flex-shrink: 0;
    }
    .card {
      aspect-ratio: 1 / 1;
      background: #EDE5D5;
      border: 0.5pt solid #D4C5A9;
      overflow: hidden;
      position: relative;
      display: block;
      transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
    }
    .card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .card-placeholder {
      width: 100%;
      height: 100%;
      background: #EDE5D5;
    }
    .card-id {
      position: absolute;
      top: 2.5pt;
      left: 3.5pt;
      font-family: 'Fraunces', serif;
      font-style: italic;
      font-size: 8pt;
      color: rgba(255,255,255,0.92);
      text-shadow: 0 0 3pt rgba(0,0,0,0.55);
      pointer-events: none;
    }

    /* ─── 名前リスト ─── */
    .names {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2pt 14pt;
      flex: 1;
    }
    .name-row {
      display: flex;
      gap: 7pt;
      align-items: baseline;
      border-bottom: 0.2pt dotted #C4B59A;
      padding: 2.5pt 0;
    }
    .name-id {
      font-size: 8.5pt;
      color: #D4A574;
      min-width: 20pt;
      flex-shrink: 0;
    }
    .name-label {
      font-size: 8.5pt;
      color: #2B2620;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .name-ref {
      font-size: 7pt;
      color: #8B7355;
      font-style: italic;
      flex-shrink: 0;
    }

    /* ─── Contact ─── */
    .contact-page {}
    .contact-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 18pt;
      padding: 24pt 0;
    }
    .contact-section {}
    .contact-label {
      font-size: 7.5pt;
      letter-spacing: 3pt;
      color: #8B7355;
      margin-bottom: 4pt;
    }
    .contact-value {
      font-size: 13pt;
      color: #2B2620;
      line-height: 1.8;
    }
    .contact-divider {
      height: 0.5pt;
      background: #C4B59A;
      margin: 4pt 0;
    }
    .contact-end {
      font-size: 14pt;
      color: #C4B59A;
      text-align: center;
      padding: 20pt 0;
    }

    /* ─── Empty note ─── */
    .empty-note {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8B7355;
      font-size: 11pt;
      font-style: italic;
    }

    /* ─── BURGAリンク ─── */
    @media screen {
      .card { cursor: zoom-in; }
      .card.has-link { cursor: pointer; }
      .card.has-link:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 14px rgba(43,38,32,0.22);
        border-color: #D4A574;
        z-index: 1;
      }
    }
    .card-ext {
      position: absolute;
      bottom: 3pt;
      right: 4pt;
      font-size: 8pt;
      color: rgba(255,255,255,0.85);
      text-shadow: 0 0 3pt rgba(0,0,0,0.6);
      line-height: 1;
      pointer-events: none;
    }
    a.name-ref-link {
      color: #D4A574;
      text-decoration: none;
      font-size: 7pt;
      font-style: italic;
      flex-shrink: 0;
    }
    @media screen {
      a.name-ref-link:hover { text-decoration: underline; }
    }

    /* ─── ライトボックス（HTMLビューア用・PDF印刷時は非表示） ─── */
    @media screen {
      .card { cursor: zoom-in; }
    }
    .lb-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(20,14,10,0.92);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 14px;
    }
    .lb-overlay.active { display: flex; }
    .lb-img {
      max-width: 88vw;
      max-height: 78vh;
      object-fit: contain;
      border: 1px solid rgba(212,165,116,0.35);
      box-shadow: 0 12px 80px rgba(0,0,0,0.7);
    }
    .lb-label {
      font-family: 'Fraunces', serif;
      font-style: italic;
      font-size: 16px;
      color: #D4A574;
      letter-spacing: 1px;
      text-align: center;
    }
    .lb-close {
      position: fixed;
      top: 18px;
      right: 26px;
      font-size: 30px;
      color: #8B7355;
      cursor: pointer;
      line-height: 1;
      user-select: none;
      transition: color 0.15s;
    }
    .lb-close:hover { color: #fff; }
    .lb-nav {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      font-size: 40px;
      color: #8B7355;
      cursor: pointer;
      padding: 10px 20px;
      user-select: none;
      transition: color 0.15s;
      line-height: 1;
    }
    .lb-nav:hover { color: #D4A574; }
    .lb-prev { left: 10px; }
    .lb-next { right: 10px; }
    .lb-counter {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 11px;
      letter-spacing: 2px;
      color: #8B7355;
    }
    @media print {
      .lb-overlay { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- ══════════════ 表紙 ══════════════ -->
  <div class="page cover">
    <div class="cover-eyebrow">COCOCASE · PATTERN COLLECTION</div>
    <div class="cover-vol">
      <div>VOL.01</div>
      <div>APR 2026</div>
    </div>
    <div class="cover-body">
      <div class="cover-title">
        Pattern<br><em>Collection</em>
      </div>
      <div class="cover-rule"></div>
      <div class="cover-sub">
        AirPods Pro 3 Case Design Proposal<br>
        西さんプレゼン用 · 100 + Original Designs
      </div>
    </div>
    <div class="cover-foot">
      <span>${dateStr}</span>
      <span>CURATED BY 辻本</span>
    </div>
  </div>

  <!-- ══════════════ Index ══════════════ -->
  <div class="page">
    <div class="header">
      <div class="header-title serif italic">Index</div>
      <div class="header-meta">CONTENTS</div>
    </div>
    <div class="toc">
      ${buildTOC()}
    </div>
    <div class="footer">
      <span>COCOCASE</span>
      <span class="serif italic">p.02</span>
    </div>
  </div>

  <!-- ══════════════ Editorial Note ══════════════ -->
  <div class="page">
    <div class="header">
      <div class="header-title serif italic">Editorial <em>Note</em></div>
      <div class="header-meta">FOREWORD</div>
    </div>
    <div class="note-body">
      <div class="note-text">
        BURGAを参考に、COCOcase AirPods Pro 3ケースの<br>
        デザイン方向性として100パターン＋オリジナルを<br>
        ご提案いたします。<br><br>
        テキスタイル感を重視し、<br>
        AIモデル（Google Imagen / Gemini）と<br>
        手描きの組み合わせで制作しました。<br><br>
        10のテーマに分類しており、<br>
        コレクションとしての展開を想定しております。<br>
        西さんのフィードバックをお待ちしております。
      </div>
      <div class="note-signature">— 辻本</div>
    </div>
    <div class="footer">
      <span>COCOCASE</span>
      <span class="serif italic">p.03</span>
    </div>
  </div>

  <!-- ══════════════ テーマ別ページ ══════════════ -->
  ${buildThemePages(web)}

  <!-- ══════════════ Original（手動） ══════════════ -->
  ${buildManualPage(manualSections, manualStartPage, web)}

  <!-- ══════════════ Contact ══════════════ -->
  ${buildContactPage(contactPage)}

  <!-- ══════════════ ライトボックス ══════════════ -->
  <div id="lb-overlay" class="lb-overlay" role="dialog" aria-modal="true">
    <span class="lb-close" id="lb-close" title="閉じる (ESC)">✕</span>
    <span class="lb-nav lb-prev" id="lb-prev" title="前 (←)">&#8249;</span>
    <img id="lb-img" class="lb-img" src="" alt="" />
    <div id="lb-label" class="lb-label"></div>
    <span class="lb-nav lb-next" id="lb-next" title="次 (→)">&#8250;</span>
    <div id="lb-counter" class="lb-counter"></div>
  </div>
  <script>
  (function () {
    // 画像を持つすべての .card を収集
    var cards = Array.from(document.querySelectorAll('.card img'));
    var current = 0;

    var overlay = document.getElementById('lb-overlay');
    var lbImg   = document.getElementById('lb-img');
    var lbLabel = document.getElementById('lb-label');
    var lbCount = document.getElementById('lb-counter');

    function open(index) {
      current = (index + cards.length) % cards.length;
      var img = cards[current];
      lbImg.src = img.src;
      lbImg.alt = img.alt || '';
      lbLabel.textContent = img.alt || '';
      lbCount.textContent = (current + 1) + ' / ' + cards.length;
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    // カードにクリックハンドラを付与（BURGAリンクカードはライトボックス無効）
    cards.forEach(function(img, i) {
      var card = img.closest('.card');
      if (card.classList.contains('has-link')) return; // リンクカードはブラウザデフォルト動作
      card.addEventListener('click', function() { open(i); });
    });

    // 閉じる
    document.getElementById('lb-close').addEventListener('click', close);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });

    // 前後ナビ
    document.getElementById('lb-prev').addEventListener('click', function(e) {
      e.stopPropagation(); open(current - 1);
    });
    document.getElementById('lb-next').addEventListener('click', function(e) {
      e.stopPropagation(); open(current + 1);
    });

    // キーボード操作
    document.addEventListener('keydown', function(e) {
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape')      close();
      if (e.key === 'ArrowLeft')   open(current - 1);
      if (e.key === 'ArrowRight')  open(current + 1);
    });
  })();
  </script>

</body>
</html>`;
}

// ===== メイン =====
async function generateCatalog() {
  console.log("\n📖 COCOcase Pattern Catalog 生成中...\n");

  // 手動パターン読み込み（サブフォルダ対応）
  const manualSections = scanManualSections();
  const manualFileCount = manualSections.reduce((sum, s) => sum + s.files.length, 0);

  const patternCount = fs.existsSync(PATTERNS_DIR)
    ? fs.readdirSync(PATTERNS_DIR).filter(f => f.endsWith(".png") && f !== "manifest.json").length
    : 0;

  console.log(`\n   自動生成パターン: ${patternCount} 枚`);
  console.log(`   手動パターン:     ${manualFileCount} 枚`);
  if (manualSections.length > 0) {
    manualSections.forEach(s => console.log(`     · ${s.label}: ${s.files.length} 枚`));
  }

  // HTML生成（PDF用・base64埋め込み）
  const html    = buildHTML(manualSections, false);
  const tmpHtml = path.join(process.cwd(), ".tmp-catalog.html");
  fs.writeFileSync(tmpHtml, html, "utf-8");

  // Web用HTML生成（画像URL参照・軽量）
  const webHtml     = buildHTML(manualSections, true);
  const publicHtml  = path.join(process.cwd(), "public", "catalog.html");
  fs.writeFileSync(publicHtml, webHtml, "utf-8");

  // PDF・ローカルHTML 出力先
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const date     = new Date().toISOString().slice(0, 10);
  const outPath  = path.join(OUT_DIR, `cococase-catalog-${date}.pdf`);
  const htmlPath = path.join(OUT_DIR, `cococase-catalog-${date}.html`);

  // ローカル閲覧用HTML保存
  fs.copyFileSync(tmpHtml, htmlPath);

  // Puppeteer で PDF 化
  console.log("   Puppeteer 起動中...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Google Fonts 読み込みを含めて待機
    await page.goto(`file://${tmpHtml}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // フォントレンダリング安定待ち
    await new Promise(r => setTimeout(r, 500));

    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    console.log(`\n✨ 完成!`);
    console.log(`   PDF:        ${outPath}`);
    console.log(`   ローカルHTML: ${htmlPath}`);
    console.log(`   Web用HTML:  ${publicHtml}`);
  } finally {
    await browser.close();
    fs.unlinkSync(tmpHtml);
  }
}

generateCatalog().catch(e => {
  console.error("❌ エラー:", e);
  process.exit(1);
});
