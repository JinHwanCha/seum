// 클라이언트 사이드 이미지 압축 유틸리티
// 모바일/데스크탑 모두 지원하며 결과물은 10KB 이하의 JPEG base64 data URL

export const MAX_IMAGE_BYTES = 100 * 1024; // 100KB
export const MAX_IMAGES_PER_POST = 10;

/**
 * 파일을 HTMLImageElement 로 디코딩한다.
 */
function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      type,
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * 주어진 이미지 파일을 10KB 이하의 JPEG base64 data URL 로 압축한다.
 * 길이/품질을 점진적으로 줄여가며 목표 크기를 만족시킨다.
 */
export async function compressImageToDataUrl(
  file: File,
  maxBytes: number = MAX_IMAGE_BYTES,
  maxDimCap: number = 1024
): Promise<string> {
  const img = await loadImage(file);

  let maxDim = Math.max(img.width, img.height);
  // 너무 큰 원본은 미리 한 번 축소해서 첫 시도 비용을 낮춘다
  if (maxDim > maxDimCap) maxDim = maxDimCap;

  let quality = 0.72;
  let bestUnder: Blob | null = null;
  let lastBlob: Blob | null = null;

  // 최대 18 회 반복하여 목표 사이즈 진입을 시도
  for (let i = 0; i < 18; i++) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    lastBlob = blob;

    if (blob.size <= maxBytes) {
      bestUnder = blob;
      break;
    }

    // 다음 반복 파라미터 조정
    if (quality > 0.35) {
      quality -= 0.1;
    } else {
      // 품질이 충분히 낮으면 해상도를 줄인다
      maxDim = Math.max(120, Math.floor(maxDim * 0.8));
      quality = 0.6;
    }
  }

  const finalBlob = bestUnder || lastBlob!;
  return blobToDataUrl(finalBlob);
}

/**
 * 여러 파일을 순차적으로 압축한다 (메모리 안정성을 위해 직렬 처리).
 */
export async function compressImages(
  files: File[],
  maxBytes: number = MAX_IMAGE_BYTES,
  maxDimCap: number = 1024
): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try {
      const url = await compressImageToDataUrl(f, maxBytes, maxDimCap);
      out.push(url);
    } catch (err) {
      console.error('Image compress failed:', err);
    }
  }
  return out;
}

/**
 * 압축된 base64 data URL 들을 서버(Storage)로 업로드하고 공개 URL 배열을 돌려준다.
 * 이미 http(s) URL 인 항목은 서버에서 그대로 통과된다.
 */
export async function uploadDataUrls(dataUrls: string[]): Promise<string[]> {
  if (dataUrls.length === 0) return [];
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: dataUrls }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => null);
    throw new Error(msg?.error || '이미지 업로드에 실패했습니다.');
  }
  const data = await res.json();
  return (data.urls as string[]) || [];
}

/**
 * 파일들을 압축한 뒤 곧바로 Storage 에 업로드해 공개 URL 배열을 반환한다.
 */
export async function compressAndUpload(
  files: File[],
  maxBytes: number = MAX_IMAGE_BYTES,
  maxDimCap: number = 1024
): Promise<string[]> {
  const compressed = await compressImages(files, maxBytes, maxDimCap);
  if (compressed.length === 0) return [];
  return uploadDataUrls(compressed);
}
