const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

const image = `data:image/png;base64,${Buffer.from('synthetic image bytes').toString('base64')}`;
const post = { id: 'post', department_id: 'dept', board_type: 'gathering',
  images: [image, 'https://example.invalid/existing.png', image], updated_at: 'original-time' };

function fixture({ concurrentChange = false, differentBytes = false } = {}) {
  const backups = [];
  const uploaded = [];
  const updates = [];
  const urls = new Map();
  const client = {
    storage: {
      getBucket: async () => ({ data: { public: true } }),
      from: () => ({
        upload: async (object, bytes, options) => {
          uploaded.push({ bytes, options });
          urls.set(`https://storage.example.invalid/${object}`, bytes);
          return {};
        },
        getPublicUrl: (object) => ({ data: { publicUrl: `https://storage.example.invalid/${object}` } }),
      }),
    },
    from: () => {
      let replacement;
      const query = {
        select: () => query, eq: () => query,
        update: (value) => { replacement = value.images; updates.push(value); return query; },
        single: async () => ({ data: { images: post.images, updated_at: concurrentChange ? 'changed' : post.updated_at } }),
        maybeSingle: async () => ({ data: { id: post.id, images: replacement, image_count: replacement.length, thumbnail: replacement[0] } }),
      };
      return query;
    },
  };
  const migration = load('scripts\\migrate-gathering-images.cjs', {
    console: { log: () => {}, error: () => {} },
    'node:fs': { mkdirSync: () => {}, writeFileSync: (file, contents, options) => backups.push({ file, contents, options }) },
    fetch: async (url) => new Response(differentBytes ? 'changed bytes' : urls.get(url)),
  });
  return { migration, client, backups, uploaded, updates };
}

test('migration preserves every image byte, order, duplicates, metadata and backup before changing only image URLs', async () => {
  const subject = fixture();
  const result = await subject.migration.migratePost(subject.client, post, 'C:\\fixture\\backups');
  assert.equal(subject.backups.length, 1);
  assert.equal(subject.backups[0].options.flag, 'wx');
  assert.equal(JSON.parse(subject.backups[0].contents).updated_at, post.updated_at);
  assert.equal(subject.uploaded.length, 1, 'duplicate inline image is uploaded only once');
  assert.equal(subject.uploaded[0].options.cacheControl, '31536000');
  const updated = subject.updates[0].images;
  assert.equal(updated[0], updated[2]);
  assert.equal(updated[1], post.images[1]);
  assert.equal(result.migrated, 2);
  assert.ok(!updated[0].startsWith('data:'));
});

test('migration never overwrites concurrent edits or a corrupted storage upload', async () => {
  for (const options of [{ concurrentChange: true }, { differentBytes: true }]) {
    const subject = fixture(options);
    await assert.rejects(() => subject.migration.migratePost(subject.client, post, 'C:\\fixture\\backups'));
    assert.equal(subject.updates.length, 0);
    assert.equal(subject.backups.length, 1);
  }
});

test('unsupported or oversized inline data fails before uploads and DB updates', async () => {
  const subject = fixture();
  assert.throws(() => subject.migration.parseInlineImage('data:text/html;base64,dGVzdA=='), /Unsupported/);
  assert.throws(() => subject.migration.parseInlineImage('data:image/png;base64,AAAAA'), /Invalid/);
  const tooLarge = `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`;
  assert.throws(() => subject.migration.parseInlineImage(tooLarge), /exceeds 2MB/);
  await assert.rejects(() => subject.migration.migratePost(subject.client, { ...post, board_type: 'notice' }, 'C:\\fixture\\backups'), /Only gathering/);
  assert.equal(subject.updates.length, 0);
});
