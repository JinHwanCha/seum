const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');

const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

function parseInlineImage(value) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  if (!match || !extensions[match[1].toLowerCase()]) throw new Error('Unsupported inline image encoding.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 ||
      bytes.toString('base64').replace(/=+$/, '') !== match[2].replace(/=+$/, '')) {
    throw new Error('Invalid inline image or image exceeds 2MB.');
  }
  return { mime: match[1].toLowerCase(), extension: extensions[match[1].toLowerCase()], bytes };
}

async function migratePost(client, post, backupDirectory) {
  const images = post.images;
  if (post.board_type !== 'gathering' || !Array.isArray(images) || images.some((image) => typeof image !== 'string')) {
    throw new Error('Only gathering posts with a valid image list can be migrated.');
  }
  const inline = images.filter((image) => image.startsWith('data:'));
  if (!inline.length) return { migrated: 0, beforeBytes: Buffer.byteLength(JSON.stringify(images)), afterBytes: Buffer.byteLength(JSON.stringify(images)) };
  const parsed = new Map(inline.map((image) => [image, parseInlineImage(image)]));
  const { data: bucket, error: bucketError } = await client.storage.getBucket('images');
  if (bucketError || !bucket?.public) throw new Error('Existing images bucket must be accessible and public; bucket access is not modified.');
  fs.mkdirSync(backupDirectory, { recursive: true });
  const backup = path.join(backupDirectory, `${post.id}-${randomUUID()}.json`);
  fs.writeFileSync(backup, JSON.stringify(post), { flag: 'wx', mode: 0o600 });
  console.log(`Original post backup: ${backup}`);

  const urls = new Map();
  for (const [image, parsedImage] of parsed) {
    const object = `${post.department_id}/${randomUUID()}.${parsedImage.extension}`;
    const uploaded = await client.storage.from('images').upload(object, parsedImage.bytes, {
      contentType: parsedImage.mime, cacheControl: '31536000', upsert: false,
    });
    if (uploaded.error) throw new Error(`Storage upload failed (${uploaded.error.statusCode || 'unknown'}). Backup preserved; uploaded files are not automatically deleted.`);
    const { data } = client.storage.from('images').getPublicUrl(object);
    const verified = await fetch(data.publicUrl, { signal: AbortSignal.timeout(20000) });
    if (!verified.ok) throw new Error(`Uploaded image verification failed: HTTP ${verified.status}`);
    const downloaded = Buffer.from(await verified.arrayBuffer());
    if (!createHash('sha256').update(downloaded).digest().equals(createHash('sha256').update(parsedImage.bytes).digest())) {
      throw new Error('Uploaded image bytes differ from original. Post has not been changed.');
    }
    urls.set(image, data.publicUrl);
  }
  const replacement = images.map((image) => urls.get(image) || image);
  const current = await client.from('posts').select('images,updated_at').eq('id', post.id).single();
  if (current.error || current.data.updated_at !== post.updated_at ||
      JSON.stringify(current.data.images) !== JSON.stringify(images)) {
    throw new Error('Post changed during migration. Original data remains; retry after reviewing the backup.');
  }
  const result = await client.from('posts').update({ images: replacement })
    .eq('id', post.id).eq('board_type', 'gathering').eq('updated_at', post.updated_at)
    .select('id,images,image_count,thumbnail').maybeSingle();
  if (result.error || !result.data) throw new Error('Migration could not update the unchanged post. Backup preserved.');
  if (JSON.stringify(result.data.images) !== JSON.stringify(replacement) ||
      result.data.image_count !== images.length || result.data.thumbnail !== replacement[0]) {
    throw new Error('Migration verification failed. Inspect the post and backup before retrying.');
  }
  return { migrated: inline.length, beforeBytes: Buffer.byteLength(JSON.stringify(images)), afterBytes: Buffer.byteLength(JSON.stringify(replacement)) };
}

async function main(args) {
  loadEnvConfig(process.cwd());
  const apply = args.includes('--apply');
  const index = args.indexOf('--post-id');
  const id = index >= 0 ? args[index + 1] : null;
  if (apply && (!id || !/^[0-9a-f-]{36}$/i.test(id))) throw new Error('Apply requires an explicit --post-id UUID. Run without --apply to inspect counts first.');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server configuration is required locally.');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let query = client.from('posts').select('id,board_type,department_id,images,updated_at')
    .eq('board_type', 'gathering').order('created_at', { ascending: false }).limit(10);
  if (id) query = query.eq('id', id);
  const result = await query;
  if (result.error) throw new Error(`Post lookup failed: ${result.error.code}`);
  if (apply && result.data?.length !== 1) throw new Error('Requested gathering post was not found.');
  for (const post of result.data || []) {
    const count = (post.images || []).filter((image) => image.startsWith('data:')).length;
    console.log(JSON.stringify({ postId: post.id, inlineImages: count, imageArrayBytes: Buffer.byteLength(JSON.stringify(post.images)) }));
    if (apply) console.log(JSON.stringify(await migratePost(client, post, path.join(process.cwd(), 'mobile-artifacts', 'image-backups'))));
  }
}

module.exports = { parseInlineImage, migratePost };
if (require.main === module) main(process.argv.slice(2)).catch((error) => {
  console.error('Gathering image migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
