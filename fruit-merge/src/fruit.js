export const FRUIT_DEFS = [
  { name: 'Вишня', radius: 22, score: 1, color: '#ff4d6d', emoji: '🍒', sprite: 'cherry' },
  { name: 'Клубника', radius: 26, score: 2, color: '#ff6b6b', emoji: '🍓', sprite: 'strawberry' },
  { name: 'Слива', radius: 30, score: 3, color: '#7b2cbf', emoji: '🫐', sprite: 'plum' },
  { name: 'Лимон', radius: 34, score: 4, color: '#ffd43b', emoji: '🍋', sprite: 'lemon' },
  { name: 'Апельсин', radius: 38, score: 6, color: '#ffa94d', emoji: '🍊', sprite: 'orange' },
  { name: 'Яблоко', radius: 44, score: 9, color: '#69db7c', emoji: '🍏', sprite: 'apple' },
  { name: 'Груша', radius: 50, score: 12, color: '#94d82d', emoji: '🍐', sprite: 'pear' },
  { name: 'Персик', radius: 58, score: 16, color: '#ff922b', emoji: '🍑', sprite: 'peach' },
  { name: 'Киви', radius: 66, score: 22, color: '#74c69d', emoji: '🥝', sprite: 'kiwi' },
  { name: 'Ананас', radius: 76, score: 30, color: '#f59f00', emoji: '🍍', sprite: 'pineapple' },
  { name: 'Кокос', radius: 88, score: 42, color: '#8d6e63', emoji: '🥥', sprite: 'coconut' },
  { name: 'Арбуз', radius: 102, score: 60, color: '#08d672', emoji: '🍉', sprite: 'watermelon' },
];

export function getFruitDef(level) {
  return FRUIT_DEFS[Math.max(0, Math.min(level, FRUIT_DEFS.length - 1))];
}

export const IMAGE_SOURCES = {
  cherry: 'https://images.unsplash.com/photo-1541650997521-2209d015f6a4?q=80&w=512&auto=format&fit=crop',
  strawberry: 'https://images.unsplash.com/photo-1511689988365-7c0b48b3a3b1?q=80&w=512&auto=format&fit=crop',
  plum: 'https://images.unsplash.com/photo-1624313072444-7eeaca34e0a7?q=80&w=512&auto=format&fit=crop',
  lemon: 'https://images.unsplash.com/photo-1439127989242-c3749a012e55?q=80&w=512&auto=format&fit=crop',
  orange: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?q=80&w=512&auto=format&fit=crop',
  apple: 'https://images.unsplash.com/photo-1547514701-42782101795e?q=80&w=512&auto=format&fit=crop',
  pear: 'https://images.unsplash.com/photo-1600707427184-6d27f0afa170?q=80&w=512&auto=format&fit=crop',
  peach: 'https://images.unsplash.com/photo-1596558450261-c8f9a7dc6b0b?q=80&w=512&auto=format&fit=crop',
  kiwi: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?q=80&w=512&auto=format&fit=crop',
  pineapple: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?q=80&w=512&auto=format&fit=crop',
  coconut: 'https://images.unsplash.com/photo-1607603750909-408e6997d1a3?q=80&w=512&auto=format&fit=crop',
  watermelon: 'https://images.unsplash.com/photo-1621263764928-0b62a1c1d0f0?q=80&w=512&auto=format&fit=crop',
};

const cache = new Map();
export function getCachedImage(key) {
  return cache.get(key) || null;
}
export async function loadImage(key) {
  if (cache.has(key)) return cache.get(key);
  const src = IMAGE_SOURCES[key];
  if (!src) return null;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = src;
  await img.decode().catch(() => {});
  cache.set(key, img);
  return img;
}

export async function preloadAllImages(onProgress) {
  const keys = Object.keys(IMAGE_SOURCES);
  let loaded = 0;
  for (const k of keys) {
    await loadImage(k);
    loaded++;
    if (onProgress) onProgress(loaded / keys.length);
  }
}