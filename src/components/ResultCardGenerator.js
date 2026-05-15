'use client';

import { useRef, useState } from 'react';
import styles from './ResultCardGenerator.module.css';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1620;
const LANDSCAPE_CARD_WIDTH = 1620;
const LANDSCAPE_CARD_HEIGHT = 1150;

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function coverImageWithFocus(ctx, image, x, y, width, height, focalX = 0.5, focalY = 0.5) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = clamp((image.width - sourceWidth) * focalX, 0, image.width - sourceWidth);
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = clamp((image.height - sourceHeight) * focalY, 0, image.height - sourceHeight);
  }

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
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

function drawPattern(ctx, seed, accent, secondary, width = CARD_WIDTH, height = CARD_HEIGHT) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3;
  for (let index = 0; index < 12; index += 1) {
    const next = hashText(`${seed}:${index}`);
    const x = 60 + (next % Math.max(1, width - 120));
    const y = 80 + ((next >>> 8) % Math.max(1, height - 160));
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

function drawFrame(ctx, accent, theme, secondary, width = CARD_WIDTH, height = CARD_HEIGHT) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, width - 44, height - 44);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 248, 234, 0.42)';
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  const corners = [
    [22, 22, 92, 22, 22, 92],
    [width - 22, 22, width - 92, 22, width - 22, 92],
    [22, height - 22, 92, height - 22, 22, height - 92],
    [width - 22, height - 22, width - 92, height - 22, width - 22, height - 92],
  ];
  corners.forEach(([x1, y1, x2, y2, x3, y3]) => {
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  });

  if (theme === 'comet') {
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = 'rgba(223, 245, 255, 0.68)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.08, height * 0.1);
    ctx.bezierCurveTo(width * 0.28, height * 0.01, width * 0.52, height * 0.03, width * 0.72, height * 0.13);
    ctx.stroke();

    const gradient = ctx.createLinearGradient(width * 0.12, height * 0.08, width * 0.7, height * 0.14);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.64, secondary);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.98)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(width * 0.14, height * 0.1);
    ctx.bezierCurveTo(width * 0.34, height * 0.06, width * 0.5, height * 0.07, width * 0.7, height * 0.12);
    ctx.stroke();

    ctx.fillStyle = '#fff8d6';
    [[0.18, 0.07], [0.76, 0.16], [0.88, 0.84]].forEach(([xRatio, yRatio]) => {
      const x = width * xRatio;
      const y = height * yRatio;
      ctx.beginPath();
      ctx.moveTo(x, y - 13);
      ctx.lineTo(x + 6, y - 6);
      ctx.lineTo(x + 13, y);
      ctx.lineTo(x + 6, y + 6);
      ctx.lineTo(x, y + 13);
      ctx.lineTo(x - 6, y + 6);
      ctx.lineTo(x - 13, y);
      ctx.lineTo(x - 6, y - 6);
      ctx.closePath();
      ctx.fill();
    });
  }
  ctx.restore();
}

function drawCharacterNamePlate(ctx, characterName, playerName, accent, secondary) {
  const plateX = 74;
  const plateY = 82;
  const plateWidth = 430;
  const plateHeight = 190;

  ctx.save();
  ctx.fillStyle = 'rgba(2, 9, 30, 0.78)';
  ctx.fillRect(plateX, plateY, plateWidth, plateHeight);
  ctx.fillStyle = 'rgba(119, 200, 255, 0.16)';
  ctx.fillRect(plateX + 10, plateY + 10, plateWidth - 20, plateHeight - 20);
  ctx.fillStyle = accent;
  ctx.fillRect(plateX, plateY, 10, plateHeight);
  ctx.strokeStyle = 'rgba(223, 247, 255, 0.58)';
  ctx.lineWidth = 2;
  ctx.strokeRect(plateX, plateY, plateWidth, plateHeight);

  ctx.font = '900 28px "Noto Serif TC", serif';
  ctx.fillStyle = secondary;
  ctx.fillText('心理角色', plateX + 34, plateY + 52);

  ctx.fillStyle = '#fff8ea';
  drawFitText(ctx, characterName, plateX + 34, plateY + 128, plateWidth - 68, 84, 58);

  ctx.font = '700 24px "Noto Serif TC", serif';
  ctx.fillStyle = 'rgba(237, 248, 255, 0.78)';
  ctx.fillText(`玩家 ${playerName}`, plateX + 34, plateY + 164);
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
  cardLayout = 'portrait',
  imageFit = 'contain',
  imageFocalX = 0.5,
  imageFocalY = 0.5,
  namePlacement = 'bottom',
  precomposedArtwork = false,
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

    const isLandscape = cardLayout === 'landscape';
    const cardWidth = isLandscape ? LANDSCAPE_CARD_WIDTH : CARD_WIDTH;
    const cardHeight = isLandscape ? LANDSCAPE_CARD_HEIGHT : CARD_HEIGHT;

    canvas.width = cardWidth;
    canvas.height = cardHeight;
    ctx.textBaseline = 'alphabetic';

    const background = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
    if (theme === 'evilFlower') {
      background.addColorStop(0, '#050817');
      background.addColorStop(0.42, '#041a75');
      background.addColorStop(1, '#160308');
    } else if (theme === 'comet') {
      background.addColorStop(0, '#020a1e');
      background.addColorStop(0.48, '#123468');
      background.addColorStop(1, '#09031a');
    } else {
      background.addColorStop(0, '#1b0f09');
      background.addColorStop(0.52, '#3a1a0d');
      background.addColorStop(1, '#070504');
    }
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    if (!precomposedArtwork) {
      drawPattern(ctx, serial, accent, secondary, cardWidth, cardHeight);
    }

    const imageBox = isLandscape
      ? { x: 38, y: 38, width: cardWidth - 76, height: cardHeight - 76 }
      : { x: 40, y: 40, width: 1000, height: 1538 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(imageBox.x, imageBox.y, imageBox.width, imageBox.height);
    ctx.clip();
    if (imageFit === 'cover') {
      coverImageWithFocus(ctx, image, imageBox.x, imageBox.y, imageBox.width, imageBox.height, imageFocalX, imageFocalY);
    } else {
      ctx.globalAlpha = 0.3;
      coverImage(ctx, image, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fillRect(imageBox.x, imageBox.y, imageBox.width, imageBox.height);
      containImage(ctx, image, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
    }
    ctx.restore();

    const overlayHeight = precomposedArtwork ? 360 : isLandscape ? 260 : 330;
    const overlayTop = imageBox.y + imageBox.height - overlayHeight;
    const imageShade = ctx.createLinearGradient(0, overlayTop, 0, imageBox.y + imageBox.height);
    imageShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    imageShade.addColorStop(0.36, 'rgba(0, 0, 0, 0.64)');
    imageShade.addColorStop(1, 'rgba(0, 0, 0, 0.93)');
    ctx.fillStyle = imageShade;
    ctx.fillRect(imageBox.x, overlayTop, imageBox.width, overlayHeight);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    if (!precomposedArtwork) {
      ctx.strokeRect(imageBox.x, imageBox.y, imageBox.width, imageBox.height);
      drawFrame(ctx, accent, theme, secondary, cardWidth, cardHeight);
    }

    if (!precomposedArtwork && namePlacement === 'topLeft') {
      drawCharacterNamePlate(ctx, characterName, name, accent, secondary);
    }

    const textX = isLandscape ? 86 : 74;
    const scriptY = isLandscape ? cardHeight - 180 : 1320;
    const nameY = isLandscape ? cardHeight - 104 : 1410;
    const quoteY = isLandscape ? cardHeight - 52 : 1480;
    const nameMaxWidth = isLandscape ? 900 : 720;
    const quoteMaxWidth = isLandscape ? cardWidth - textX - 116 : 900;

    ctx.textAlign = 'left';
    ctx.font = `${isLandscape ? 900 : 900} ${isLandscape ? 30 : 34}px "Noto Serif TC", serif`;
    ctx.fillStyle = accent;
    ctx.fillText(`${scriptTitle} X Bglarp`, textX, scriptY);

    ctx.fillStyle = '#fff8ea';
    drawFitText(ctx, precomposedArtwork ? name : namePlacement === 'topLeft' ? characterName : name, textX, nameY, nameMaxWidth, isLandscape ? 72 : 88, isLandscape ? 46 : 58);

    ctx.font = `700 ${isLandscape ? 28 : 32}px "Noto Serif TC", serif`;
    ctx.fillStyle = '#f5e6ce';
    wrapText(ctx, `「${line}」`, textX, quoteY, quoteMaxWidth, isLandscape ? 38 : 42, 2);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const imageUrl = URL.createObjectURL(blob);
    const downloadName = `${scriptTitle}-${characterName}-${name}-角色圖卡.png`;
    writeCardPage(popup, imageUrl, downloadName, `${characterName} 專屬角色圖卡`);
    setStatus('圖卡已在新分頁開啟');
  };

  const themeClass = theme === 'evilFlower' ? styles.evilFlower : theme === 'comet' ? styles.comet : styles.hanmen;

  return (
    <div className={`${styles.cardAction} ${themeClass}`}>
      <button type="button" onClick={generateCard}>
        生成專屬圖卡
      </button>
      {status && <span className={styles.status}>{status}</span>}
      <canvas ref={canvasRef} className={styles.hiddenCanvas} aria-hidden="true" />
    </div>
  );
}
