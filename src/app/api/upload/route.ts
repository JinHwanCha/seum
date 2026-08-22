import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// 이미지 저장 버킷. 공개 버킷 + 추측 불가능한 UUID 경로를 사용한다.
const BUCKET = 'images';
const MAX_BYTES = 2 * 1024 * 1024; // 디코딩 후 2MB 상한
const MAX_COUNT = 20;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// 프로세스당 한 번만 버킷 존재를 보장한다(이미 있으면 에러 무시).
let bucketEnsured = false;
async function ensureBucket(supabase: ReturnType<typeof createClient>) {
  if (bucketEnsured) return;
  await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(EXT),
  });
  bucketEnsured = true;
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!EXT[mime]) return null;
  return { mime, buffer: Buffer.from(m[2], 'base64') };
}

// POST: base64 data URL 배열을 받아 Storage 에 올리고 공개 URL 배열을 반환한다.
// 이미 http(s) URL 인 항목은 재업로드하지 않고 그대로 통과시킨다.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const inputs: unknown = body?.images ?? (body?.dataUrl ? [body.dataUrl] : null);
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
  }
  if (inputs.length > MAX_COUNT) {
    return NextResponse.json({ error: '한 번에 올릴 수 있는 이미지 수를 초과했습니다.' }, { status: 400 });
  }

  const supabase = createClient();
  await ensureBucket(supabase);

  const urls: string[] = [];
  for (const item of inputs) {
    if (typeof item !== 'string') {
      return NextResponse.json({ error: '잘못된 이미지 형식입니다.' }, { status: 400 });
    }
    // 이미 업로드된 URL 은 그대로 유지
    if (/^https?:\/\//i.test(item)) {
      urls.push(item);
      continue;
    }
    const parsed = parseDataUrl(item);
    if (!parsed) {
      return NextResponse.json({ error: '지원하지 않는 이미지 형식입니다.' }, { status: 400 });
    }
    if (parsed.buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: '이미지 용량이 너무 큽니다.' }, { status: 400 });
    }

    const path = `${session.departmentId}/${crypto.randomUUID()}.${EXT[parsed.mime]}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, parsed.buffer, {
      contentType: parsed.mime,
      upsert: false,
    });
    if (error) {
      return NextResponse.json({ error: '이미지 업로드에 실패했습니다.' }, { status: 500 });
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return NextResponse.json({ urls });
}
