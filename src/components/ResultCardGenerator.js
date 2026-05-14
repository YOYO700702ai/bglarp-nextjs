'use client';

import { useRef, useState } from 'react';
import styles from './ResultCardGenerator.module.css';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1620;

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getOneSentence(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  const sentence = normalized.match(/^.{1,36}?[。！？!?]/)?.[0] || normalized;
  return sentence.length <= 38 ? sentence : `${sentence.slice(0, 36)}…`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function coverImage(ctx, image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function containImage(ctx, image, x, y, width, height) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = String(text || '').replace(/\s+/g, ' ').split('');
  let line = '';
  let lineCount = 0;

  for (let index = 0; index < chars.length; index += 1) {
    const nextLine = line + chars[index];
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      lineCount += 1;
      if (lineCount >= maxLines) {
        ctx.fillText(`${line.slice(0, Math.max(0, line.length - 2))}…`, x, y);
        return;
      }
      ctx.fillText(line, x, y);
      line = chars[index];
      y += lineHeight;
    } else {
      line = nextLine;
    }
  }

  if (line) ctx.fillText(line, x, y);
}

function drawFitText(ctx, text, x, y, maxWidth, initialSize, minSize, weight = 900) {
  let size = initialSize;
  do {
    ctx.font = `${weight} ${size}px "Noto Serif TC", serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  } while (size >= minSize);
  ctx.fillText(text, x, y);
}

function drawPattern(ctx, seed, accent, secondary) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3;
  for (let index = 0; index < 12; index += 1) {
    const next = hashText(`${seed}:${index}`);
    const x = 60 + (next % 960);
    const y = 80 + ((next >>> 8) % 1400);
    const length = 70 + ((next >>> 16) % 180);
    const angle = ((next >>> 24) % 360) * Math.PI / 180;
    ctx.strokeStyle = index % 2 === 0 ? accent : secondary;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length,
      x - Math.sin(angle) * length * 0.46,
      y + Math.cos(angle) * length * 0.46,
      x + Math.cos(angle + 0.8) * length * 0.8,
      y + Math.sin(angle + 0.8) * length * 0.8
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrame(ctx, accent) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, CARD_WIDTH - 44, CARD_HEIGHT - 44);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 248, 234, 0.42)';
  ctx.strokeRect(36, 36, CARD_WIDTH - 72, CARD_HEIGHT - 72);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  const corners = [
    [22, 22, 92, 22, 22, 92],
    [1058, 22, 988, 22, 1058, 92],
    [22, 1598, 92, 1598, 22, 1528],
    [1058, 1598, 988, 1598, 1058, 1528],
  ];
  corners.forEach(([x1, y1, x2, y2, x3, y3]) => {
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  });
  ctx.restore();
}

function writeLoadingPage(popup) {
  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>生成專屬圖卡</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #080808; color: #f5e6ce; font-family: serif; letter-spacing: .18em; }
  </style>
</head>
<body>圖卡生成中...</body>
</html>`);
  popup.document.close();
}

function writeCardPage(popup, imageUrl, downloadName, title) {
  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #111722; color: #f7ead2; font-family: "Noto Serif TC", serif; }
    main { width: min(100% - 28px, 760px); margin: 0 auto; padding: 16px 0 28px; }
    img { display: block; width: auto; max-width: 100%; max-height: calc(100vh - 92px); height: auto; margin: 0 auto; box-shadow: 0 24px 80px rgba(0,0,0,.48); object-fit: contain; }
    .actions { display: flex; justify-content: center; margin-top: 14px; }
    a { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 22px; border: 1px solid #d6a854; color: #1a0e08; background: linear-gradient(180deg, #fff2d0, #d59a3d); font-weight: 900; letter-spacing: .12em; text-decoration: none; }
  </style>
</head>
<body>
  <main>
    <img src="${imageUrl}" alt="${escapeHtml(title)}" />
    <div class="actions">
      <a href="${imageUrl}" download="${escapeHtml(downloadName)}">下載 PNG</a>
    </div>
  </main>
</body>
</html>`);
  popup.document.close();
}

export default function ResultCardGenerator({
  scriptTitle,
  characterName,
  characterImage,
  quote,
  playerName,
  theme = 'hanmen',
  accent = '#e7bd67',
  secondary = '#9f3022',
}) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('');

  const generateCard = async () => {
    const popup = window.open('', '_blank');
    if (!popup) {
      setStatus('請允許瀏覽器彈出視窗後再試一次');
      return;
    }
    writeLoadingPage(popup);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const name = String(playerName || '').trim() || '未署名玩家';
    const line = getOneSentence(quote);
    const seed = hashText(`${name}:${scriptTitle}:${characterName}:${line}`);
    const serial = seed.toString(16).toUpperCase().padStart(8, '0');
    const ctx = canvas.getContext('2d');
    const image = await loadImage(characterImage);
    if (document.fonts?.ready) await document.fonts.ready;

    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    ctx.textBaseline = 'alphabetic';

    const background = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    if (theme === 'evilFlower') {
      background.addColorStop(0, '#050817');
      background.addColorStop(0.42, '#041a75');
      background.addColorStop(1, '#160308');
    } else {
      background.addColorStop(0, '#1b0f09');
      background.addColorStop(0.52, '#3a1a0d');
      background.addColorStop(1, '#070504');
    }
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    drawPattern(ctx, serial, accent, secondary);

    const imageBox = { x: 40, y: 40, width: 1000, height: 1538 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(imageBox.x, imageBox.y, imageBox.width, imageBox.height);
    ctx.clip();
    ctx.globalAlpha = 0.3;
    coverImage(ctx, image, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fillRect(imageBox.x, imageBox.y, imageBox.width, imageBox.height);
    containImage(ctx, image, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
    ctx.restore();

    const overlayTop = imageBox.y + imageBox.height - 330;
    const imageShade = ctx.createLinearGradient(0, overlayTop, 0, imageBox.y + imageBox.height);
    imageShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    imageShade.addColorStop(0.36, 'rgba(0, 0, 0, 0.64)');
    imageShade.addColorStop(1, 'rgba(0, 0, 0, 0.93)');
    ctx.fillStyle = imageShade;
    ctx.fillRect(imageBox.x, overlayTop, imageBox.width, 330);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(imageBox.x, imageBox.y, imageBox.width, imageBox.height);
    drawFrame(ctx, accent);

    ctx.textAlign = 'left';
    ctx.font = '900 34px "Noto Serif TC", serif';
    ctx.fillStyle = accent;
    ctx.fillText(`${scriptTitle} X Bglarp`, 74, 1320);

    ctx.fillStyle = '#fff8ea';
    drawFitText(ctx, name, 74, 1410, 720, 88, 58);

    ctx.font = '700 32px "Noto Serif TC", serif';
    ctx.fillStyle = '#f5e6ce';
    wrapText(ctx, `「${line}」`, 74, 1480, 900, 42, 2);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const imageUrl = URL.createObjectURL(blob);
    const downloadName = `${scriptTitle}-${characterName}-${name}-角色圖卡.png`;
    writeCardPage(popup, imageUrl, downloadName, `${characterName} 專屬角色圖卡`);
    setStatus('圖卡已在新分頁開啟');
  };

  return (
    <div className={`${styles.cardAction} ${theme === 'evilFlower' ? styles.evilFlower : styles.hanmen}`}>
      <button type="button" onClick={generateCard}>
        生成專屬圖卡
      </button>
      {status && <span className={styles.status}>{status}</span>}
      <canvas ref={canvasRef} className={styles.hiddenCanvas} aria-hidden="true" />
    </div>
  );
}
