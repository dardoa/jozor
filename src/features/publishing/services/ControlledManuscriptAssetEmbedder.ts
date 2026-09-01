const DEFAULT_FONT_URL = '/fonts/Amiri-Regular.ttf';
const MAX_IMAGE_COUNT = 24;
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_TOTAL_ASSET_BYTES = 2_600_000;

export interface ControlledManuscriptAssetEmbeddingResult {
  readonly html: string;
  readonly fontEmbedded: boolean;
  readonly embeddedImageCount: number;
  readonly omittedImageCount: number;
}

export interface ControlledManuscriptAssetEmbedderOptions {
  readonly loadBytes?: (source: string) => Promise<Uint8Array>;
}

async function loadAssetBytes(source: string): Promise<Uint8Array> {
  const response = await fetch(source, {
    credentials: 'omit',
    cache: 'force-cache',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error('Manuscript asset could not be loaded');
  return new Uint8Array(await response.arrayBuffer());
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function detectImageMimeType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  throw new Error('Unsupported manuscript image payload');
}

function isEmbeddedImage(source: string): boolean {
  return /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(source);
}

function removeUnsafeElements(document: Document): void {
  document.querySelectorAll('script, iframe, object, embed, link[rel="stylesheet"]').forEach((element) => {
    element.remove();
  });
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    });
  });
}

function installPrintCsp(document: Document): void {
  document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach((element) => {
    element.remove();
  });
  const meta = document.createElement('meta');
  meta.setAttribute('http-equiv', 'Content-Security-Policy');
  meta.setAttribute(
    'content',
    "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"
  );
  document.head.prepend(meta);
}

export async function embedControlledManuscriptAssets(
  html: string,
  options: ControlledManuscriptAssetEmbedderOptions = {}
): Promise<ControlledManuscriptAssetEmbeddingResult> {
  if (typeof DOMParser === 'undefined') {
    throw new Error('Controlled PDF asset preparation is unavailable');
  }

  const loadBytes = options.loadBytes ?? loadAssetBytes;
  const document = new DOMParser().parseFromString(html, 'text/html');
  removeUnsafeElements(document);

  let totalAssetBytes = 0;
  let fontEmbedded = false;
  const styles = [...document.querySelectorAll('style')];
  if (styles.some((style) => style.textContent?.includes(DEFAULT_FONT_URL))) {
    try {
      const fontBytes = await loadBytes(DEFAULT_FONT_URL);
      totalAssetBytes += fontBytes.byteLength;
      if (totalAssetBytes > MAX_TOTAL_ASSET_BYTES) {
        throw new Error('Controlled PDF embedded assets exceed the safe size limit');
      }
      const fontDataUri = `data:font/ttf;base64,${encodeBase64(fontBytes)}`;
      styles.forEach((style) => {
        if (style.textContent) {
          style.textContent = style.textContent.split(DEFAULT_FONT_URL).join(fontDataUri);
        }
      });
      fontEmbedded = true;
    } catch {
      throw new Error('Controlled PDF Arabic font could not be embedded');
    }
  }

  let embeddedImageCount = 0;
  let omittedImageCount = 0;
  const images = [...document.querySelectorAll<HTMLImageElement>('img[src]')];
  for (const [index, image] of images.entries()) {
    const source = image.getAttribute('src')?.trim() ?? '';
    if (isEmbeddedImage(source)) {
      embeddedImageCount += 1;
      continue;
    }
    if (!source || index >= MAX_IMAGE_COUNT) {
      image.remove();
      omittedImageCount += 1;
      continue;
    }

    try {
      const bytes = await loadBytes(source);
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
        throw new Error('Manuscript image exceeds the safe size limit');
      }
      if (totalAssetBytes + bytes.byteLength > MAX_TOTAL_ASSET_BYTES) {
        throw new Error('Controlled PDF embedded assets exceed the safe size limit');
      }
      const mimeType = detectImageMimeType(bytes);
      totalAssetBytes += bytes.byteLength;
      image.setAttribute('src', `data:${mimeType};base64,${encodeBase64(bytes)}`);
      embeddedImageCount += 1;
    } catch {
      image.remove();
      omittedImageCount += 1;
    }
  }

  document.querySelectorAll<HTMLElement>('[src], [href]').forEach((element) => {
    const attributeName = element.hasAttribute('src') ? 'src' : 'href';
    const value = element.getAttribute(attributeName) ?? '';
    if (!value.startsWith('data:')) element.removeAttribute(attributeName);
  });
  styles.forEach((style) => {
    if (style.textContent && /url\(\s*["']?(?:https?:|blob:|file:|\/\/)/i.test(style.textContent)) {
      throw new Error('Controlled PDF contains an external stylesheet asset');
    }
  });

  installPrintCsp(document);
  return {
    html: `<!doctype html>\n${document.documentElement.outerHTML}`,
    fontEmbedded,
    embeddedImageCount,
    omittedImageCount,
  };
}
