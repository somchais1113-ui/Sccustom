import { BRAND_LOGO_FILES } from './config/brand-logos.js';

export const BRANDS = Object.freeze([
  ['quantum', 'Quantum'], ['elephant', 'Elephant'], ['elfen', 'Elfen'],
  ['uni', 'Uni'], ['mitsubishi', 'Mitsubishi'], ['master-art', 'Master Art'],
  ['ultimatum', 'Ultimatum'], ['artifact', 'Artifact'], ['sccustom', 'SCCUSTOM'],
].map(([id, name]) => Object.freeze({ id, name })));

export const BRAND_LOGO_REQUIRED = 'กรุณาเลือกแบรนด์ที่ตั้งโลโก้แล้วก่อนเปิดเอกสาร หากไม่มีโลโก้พร้อมใช้ ให้ติดต่อผู้ดูแล';
export const isBrandLogoPath = path => typeof path === 'string'
  && /^assets\/brand-logos\/[a-z0-9][a-z0-9._-]*\.(svg|png|webp)$/i.test(path);

function loadImage(url) {
  return new Promise(resolve => {
    const image = new Image();
    const finish = ok => {
      clearTimeout(timer);
      image.onload = image.onerror = null;
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), 4500);
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

export function createBrandLogoRegistry(files = BRAND_LOGO_FILES, checkImage = loadImage) {
  const ready = new Map();
  const failed = new Set();
  return {
    async initialize(base) {
      await Promise.all(BRANDS.map(async brand => {
        const path = files[brand.id];
        if (path == null || path === '') return;
        try {
          if (!isBrandLogoPath(path)) throw Error('Invalid brand logo path');
          const url = new URL(path, base).href;
          if (!(await checkImage(url))) throw Error('Brand logo did not load');
          ready.set(brand.id, Object.freeze({ ...brand, url }));
        } catch {
          failed.add(brand.id);
        }
      }));
    },
    get: id => ready.get(id) ?? null,
    status: id => ready.has(id) ? 'ready' : failed.has(id) ? 'unavailable' : 'unset',
  };
}

export const brandLogos = createBrandLogoRegistry();
