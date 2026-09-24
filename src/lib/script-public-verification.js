import { createHash } from 'node:crypto';

// The API and the rendered detail must describe the same public revision.
// A title or cover alone cannot distinguish a stale price, synopsis or role list.
export function publicScriptFingerprint(script) {
  const orderedObject = (value) => Object.fromEntries(Object.entries(value || {}).sort(([a], [b]) => a.localeCompare(b)));
  const payload = {
    scriptId: script?.scriptId || null,
    name: script?.name || '',
    synopsis: script?.synopsis || '',
    characters: script?.characters || '',
    characterImages: orderedObject(script?.characterImages),
    characterDescriptions: orderedObject(script?.characterDescriptions),
    genre: script?.genre || [],
    customTags: script?.customTags || '',
    duration: script?.duration || '',
    price: script?.price ?? null,
    priceStatus: script?.priceStatus || 'tbd',
    players: script?.players || [],
    image: script?.image || null,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
