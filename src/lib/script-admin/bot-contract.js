// Pure checks shared by the bot routes and their offline contract tests.
export class BotContractError extends Error {
  constructor(message, status = 400, code = 'invalid_request') {
    super(message);
    this.name = 'BotContractError';
    this.status = status;
    this.code = code;
  }
}

const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const OPERATION_ID = /^[A-Za-z0-9][A-Za-z0-9:_.-]{0,99}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEDIA_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function botRequestMetadata(headers) {
  const requestId = headers.get('x-bglarp-request-id') || '';
  const operationId = headers.get('idempotency-key') || '';
  if (!REQUEST_ID.test(requestId)) {
    throw new BotContractError('缺少有效的 X-BGLARP-Request-Id，請沿用同一筆上架案件編號。');
  }
  if (!OPERATION_ID.test(operationId)) {
    throw new BotContractError('缺少有效的 Idempotency-Key，請沿用同一操作編號以安全重試。');
  }
  return { requestId, operationId, idempotencyKey: `bot:${requestId}:${operationId}` };
}

export function requireBotExpectedVersion(script, expectedVersionId) {
  if (!UUID.test(expectedVersionId || '')) {
    throw new BotContractError('必須提供 expectedVersionId，才能避免覆蓋其他人的修改。');
  }
  if (script.draftVersionId !== expectedVersionId) {
    throw new BotContractError('草稿已被更新，請先重新讀取；沒有覆蓋其他人的修改。', 409, 'conflict');
  }
  return expectedVersionId;
}

export function requireBotDraftOwnership(script, draftVersion, requestId) {
  // A published revision may be the starting point of a new, explicitly targeted edit.
  if (script.status === 'published' && script.draftVersionId === script.publishedVersionId) return;
  if (draftVersion?.source === 'ai'
    && draftVersion.idempotency_key?.startsWith(`bot:${requestId}:`)) return;
  throw new BotContractError('這筆劇本另有尚未發布的草稿，請先由原編輯者處理；小六沒有覆蓋它。', 409, 'conflict');
}

export function normalizeBotMediaInput(input, maxBytes = 8 * 1024 * 1024) {
  const contentType = String(input?.contentType || '').toLowerCase();
  const extension = MEDIA_TYPES[contentType];
  if (!extension) throw new BotContractError('圖片只支援 JPG、PNG 或 WebP。');
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > maxBytes) {
    throw new BotContractError('圖片檔案大小不符合限制。');
  }
  if (!/^[0-9a-f]{64}$/.test(input.sha256 || '')) {
    throw new BotContractError('請提供圖片原始檔的 SHA-256。');
  }
  if (!['cover', 'character'].includes(input.kind)) {
    throw new BotContractError('圖片用途必須是 cover 或 character。');
  }
  return { contentType, extension, size: input.size, sha256: input.sha256, kind: input.kind };
}

export function botMediaPath(requestId, input) {
  // A retry addresses the same immutable object, even after a process restart.
  return `bot/${requestId}/${input.kind}/${input.sha256}.${input.extension}`;
}

export function imageBytesMatchType(bytes, contentType) {
  if (contentType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  if (contentType === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

export function validateBotJobKey(key) {
  if (!/^[0-9a-f]{64}$/.test(key || '')) throw new BotContractError('案件索引格式不正確。');
  return key;
}

export function validateBotJobState(state, expectedRevision) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new BotContractError('expectedRevision 必須是目前案件的非負整數版本。');
  }
  if (state !== null && (!state || typeof state !== 'object' || Array.isArray(state))) {
    throw new BotContractError('state 必須是物件或 null。');
  }
  function inspect(value, depth = 0) {
    if (depth > 24) throw new BotContractError('案件資料層級過深。');
    if (typeof value === 'string' && /^data:[^,]*;base64,/i.test(value)) {
      throw new BotContractError('案件只能保存圖片網址，不能保存圖片二進位內容。');
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (/(?:password|passwd|secret|credential|authorization|cookie|token|api_?key|service_?role_?key)$/i.test(key)) {
        throw new BotContractError('案件不得保存密碼或存取憑證。');
      }
      if (typeof child === 'string' && /(?:base64|image_?data|file_?bytes|binary)$/i.test(key)) {
        throw new BotContractError('案件只能保存圖片網址，不能保存圖片二進位內容。');
      }
      inspect(child, depth + 1);
    }
  }
  inspect(state);
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateBotPublishContent(script) {
  if (!script.genres?.length) throw new BotContractError('發布前請提供至少一個劇本類型。');
  const names = (script.characters || []).map((character) => character.name.trim());
  if (names.some((name) => /[\r\n]/.test(name))) throw new BotContractError('角色名稱不能包含換行；多行文字請放在角色簡介。');
  if (new Set(names).size !== names.length) throw new BotContractError('角色名稱重複，請先確認每張圖對應的角色。');
  if (names.length && (names.length < script.playerMin || names.length > script.playerMax)) {
    throw new BotContractError('角色數量與遊戲人數不符，請補齊角色或確認人數後再上架。');
  }
}

export function sameCharacterMedia(previous, current) {
  return Boolean(previous?.image?.url && current?.image?.url
    && previous.name === current.name
    && previous.image.url === current.image.url
    && (previous.image.path || '') === (current.image.path || '')
    && (previous.image.alt || '') === (current.image.alt || '')
    && (previous.display || 'avatar') === (current.display || 'avatar'));
}

export function publishedCatalogMatches(script, publicScript) {
  if (!publicScript || !script.notionPageId || publicScript.scriptId !== script.notionPageId) return false;
  if (publicScript.name !== script.name || publicScript.synopsis !== script.synopsis) return false;
  if (publicScript.image !== script.cover?.url || publicScript.priceStatus !== script.priceStatus) return false;
  if (publicScript.price !== (script.priceStatus === 'free' ? 0 : script.priceStatus === 'tbd' ? null : script.price)) return false;
  const players = Array.from({ length: script.playerMax - script.playerMin + 1 }, (_, index) => `${script.playerMin + index}人`);
  if (!sameStrings(players, publicScript.players || [])) return false;
  const duration = script.durationLabel || (script.durationMinutes % 60 === 0
    ? `${script.durationMinutes / 60}小時` : `${script.durationMinutes}分鐘`);
  if (publicScript.duration !== duration) return false;
  if (publicScript.customTags !== (script.customTags || []).join('、')) return false;
  const expectedGenres = new Set([
    ...(script.genres || []),
    ...(script.customTags || []).join('、').split(/[,\/、.。·\s]+/).map((tag) => tag.trim()).filter(Boolean),
    ...(['逃離北極', '砍二刀'].includes(script.name) ? ['新手'] : []),
  ]);
  if (!sameStrings([...expectedGenres].sort(), [...new Set(publicScript.genre || [])].sort())) return false;
  const characters = script.characters || [];
  const fullCharacterText = (separator) => characters.map((character) => character.description
    ? `${character.name}${separator}${character.description}` : character.name).join('\n');
  const namesOnly = characters.map((character) => character.name).join('\n');
  const actualDescriptions = publicScript.characterDescriptions || {};
  const expectedDescriptionNames = characters.filter((character) => character.description).map((character) => character.name).sort();
  const descriptionsMatch = sameStrings(expectedDescriptionNames, Object.keys(actualDescriptions).sort())
    && characters.every((character) => (Object.hasOwn(actualDescriptions, character.name)
      ? actualDescriptions[character.name] : '') === (character.description || ''));
  if (Object.keys(actualDescriptions).length && !descriptionsMatch) return false;
  const actualText = String(publicScript.characters || '');
  if (actualText !== fullCharacterText('｜') && actualText !== fullCharacterText('：')
    && !(actualText === namesOnly && descriptionsMatch)) return false;
  // Exact sets also prove that a deleted portrait is no longer being served.
  const expectedImageNames = characters.filter((character) => character.image?.url).map((character) => character.name).sort();
  if (!sameStrings(expectedImageNames, Object.keys(publicScript.characterImages || {}).sort())) return false;
  return characters.every((character) => {
    if (!character.image?.url) return true;
    const actual = publicScript.characterImages?.[character.name];
    return actual?.image?.url === character.image.url
      && actual.image.path === character.image.path
      && (actual.image.alt || '') === (character.image.alt || '')
      && (actual.display || 'avatar') === (character.display || 'avatar');
  });
}
