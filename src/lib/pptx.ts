import { compressImageToDataUrl } from '@/lib/image-utils';

// 슬라이드 이미지는 텍스트 가독성을 위해 조금 넉넉한 용량/해상도로 압축한다.
export const SLIDE_MAX_BYTES = 90 * 1024; // 90KB
export const SLIDE_MAX_DIM = 1600;

const IMAGE_EXT = /\.(png|jpe?g|gif|bmp|webp|tiff?|emf|wmf)$/i;
const RASTER_EXT = /\.(png|jpe?g|gif|bmp|webp)$/i;

/** 각 <Relationship Id=".." Target=".."> 를 파싱해 map 으로 만든다. */
function parseRels(xml: string): Record<string, string> {
  const map: Record<string, string> = {};
  const tags = xml.match(/<Relationship\b[^>]*>/g) || [];
  for (const tag of tags) {
    const id = tag.match(/\bId="([^"]+)"/)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) map[id] = target;
  }
  return map;
}

/** "../media/image1.png" 같은 상대경로를 zip 내부 절대경로로 정규화 */
function resolvePath(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const baseParts = base.split('/').slice(0, -1);
  for (const part of target.split('/')) {
    if (part === '..') baseParts.pop();
    else if (part === '.') continue;
    else baseParts.push(part);
  }
  return baseParts.join('/');
}

/**
 * .pptx(zip) 파일에서 슬라이드 순서대로 이미지를 추출한다.
 * - 각 슬라이드의 <a:blip r:embed> 등장 순서 → 슬라이드 rels → media 파일
 * - 실패 시 ppt/media/* 를 파일명 숫자순으로 폴백
 * 결과는 압축된 data URL 배열.
 */
export async function extractPptxImages(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  // jszip 은 용량이 커서 PPT 를 실제로 가져올 때만 동적 로드한다.
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  const orderedMediaPaths: string[] = [];
  const seen = new Set<string>();

  try {
    // 1) 프레젠테이션의 슬라이드 순서
    const presXml = await zip.file('ppt/presentation.xml')?.async('string');
    const presRelsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string');

    if (presXml && presRelsXml) {
      const presRels = parseRels(presRelsXml);
      const slideRIds = Array.from(presXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)).map(
        (m) => m[1]
      );
      const slidePaths = slideRIds
        .map((rid) => presRels[rid])
        .filter(Boolean)
        .map((t) => resolvePath('ppt/presentation.xml', t));

      // 2) 슬라이드별 blip 순서 → media
      for (const slidePath of slidePaths) {
        const slideXml = await zip.file(slidePath)?.async('string');
        if (!slideXml) continue;
        const relsPath = slidePath.replace(/([^/]+)$/, '_rels/$1.rels');
        const relsXml = await zip.file(relsPath)?.async('string');
        const rels = relsXml ? parseRels(relsXml) : {};

        const embedIds = Array.from(slideXml.matchAll(/r:(?:embed|link)="([^"]+)"/g)).map(
          (m) => m[1]
        );
        for (const eid of embedIds) {
          const target = rels[eid];
          if (!target) continue;
          const mediaPath = resolvePath(slidePath, target);
          if (IMAGE_EXT.test(mediaPath) && !seen.has(mediaPath)) {
            seen.add(mediaPath);
            orderedMediaPaths.push(mediaPath);
          }
        }
      }
    }
  } catch {
    // 무시하고 폴백
  }

  // 3) 폴백: ppt/media/* 를 숫자순으로
  if (orderedMediaPaths.length === 0) {
    const mediaFiles = Object.keys(zip.files)
      .filter((p) => p.startsWith('ppt/media/') && IMAGE_EXT.test(p))
      .sort((a, b) => {
        const na = parseInt(a.match(/(\d+)/)?.[1] || '0', 10);
        const nb = parseInt(b.match(/(\d+)/)?.[1] || '0', 10);
        return na - nb;
      });
    orderedMediaPaths.push(...mediaFiles);
  }

  // 4) 각 media 를 압축 data URL 로 변환 (브라우저가 못 그리는 emf/wmf 는 건너뜀)
  const out: string[] = [];
  const total = orderedMediaPaths.length;
  let done = 0;
  for (const path of orderedMediaPaths) {
    done++;
    onProgress?.(done, total);
    if (!RASTER_EXT.test(path)) continue; // emf/wmf/tiff 등은 <img> 로 그릴 수 없음
    const entry = zip.file(path);
    if (!entry) continue;
    try {
      const blob = await entry.async('blob');
      const ext = path.split('.').pop()?.toLowerCase() || 'png';
      const typed = blob.type
        ? blob
        : new Blob([blob], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      const asFile = new File([typed], `slide-${done}.${ext}`, { type: typed.type });
      const dataUrl = await compressImageToDataUrl(asFile, SLIDE_MAX_BYTES, SLIDE_MAX_DIM);
      out.push(dataUrl);
    } catch {
      // 개별 실패는 건너뜀
    }
  }

  return out;
}
