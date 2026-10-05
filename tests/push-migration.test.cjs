const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const engine = process.env.PUSH_SQL_ENGINE_PATH;
test('native push migration executes and preserves queue, lease and device lifecycle semantics', {
  skip: !engine && 'Set PUSH_SQL_ENGINE_PATH to a local @electric-sql/pglite module for PostgreSQL execution',
}, async () => {
  const { PGlite } = require(engine);
  const db = new PGlite();
  const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', 'add_native_push.sql'), 'utf8');
  const user = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const installation = '33333333-3333-4333-8333-333333333333';
  const secondInstallation = '44444444-4444-4444-8444-444444444444';
  const expires = new Date(Date.now() + 86400000).toISOString();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';
      CREATE TABLE users(id uuid PRIMARY KEY, is_approved boolean, department_id uuid);
      CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), recipient_id uuid REFERENCES users(id),
        is_read boolean DEFAULT false, created_at timestamptz DEFAULT now(),
        department_id uuid, actor_id uuid, type text, title text, body text);
    `);
    await db.query('INSERT INTO users VALUES ($1,true,$1),($2,true,$2)', [user, other]);
    await db.exec(migration);
    await db.exec(migration);
    const register = async (install, owner, token = 'fcm-token-12345678901234567890') => {
      const { rows } = await db.query('SELECT register_push_device($1,$2,$3,$4,$5,$6,$7) AS id',
        [install, owner, 'android', 'fcm', 'production', token, expires]);
      return rows[0].id;
    };
    const notify = async () => (await db.query('INSERT INTO notifications(recipient_id) VALUES ($1) RETURNING id', [user])).rows[0].id;
    const jobs = async () => (await db.query('SELECT * FROM claim_push_jobs(5)')).rows;
    const finish = async (job, outcome, lease = job.lease_id) => (await db.query(
      'SELECT finish_push_job($1,$2,$3,$4) AS ok', [job.id, lease, outcome, 'test outcome']
    )).rows[0].ok;

    const device = await register(installation, user);
    const initial = (await db.query('SELECT token_version FROM push_devices WHERE id=$1', [device])).rows[0].token_version;
    await register(installation, user);
    assert.equal((await db.query('SELECT token_version FROM push_devices WHERE id=$1', [device])).rows[0].token_version, initial);
    const secondDevice = await register(secondInstallation, user, 'second-fcm-token-12345678901234567890');
    await notify();
    const firstJobs = await jobs();
    assert.equal(firstJobs.length, 2, 'fan-out reaches both devices');
    const primaryJob = firstJobs.find((job) => job.device_id === device);
    const secondaryJob = firstJobs.find((job) => job.device_id === secondDevice);
    assert.ok(primaryJob);
    assert.ok(secondaryJob);
    assert.equal((await jobs()).length, 0, 'active leases prevent duplicate claims');
    assert.equal(await finish(primaryJob, 'sent', '55555555-5555-4555-8555-555555555555'), false);
    assert.equal(await finish(primaryJob, 'sent'), true);
    assert.equal(await finish(primaryJob, 'sent'), false, 'completed leases cannot commit twice');
    assert.equal(await finish(secondaryJob, 'retry'), true);
    assert.equal((await jobs()).length, 0, 'retry backoff is respected');
    await db.query("UPDATE push_jobs SET available_at=now()-interval '1 second' WHERE id=$1", [secondaryJob.id]);
    const retry = (await jobs())[0];
    assert.equal(retry.attempts, 2);
    assert.equal(await finish(retry, 'invalid'), true);
    assert.equal((await db.query('SELECT enabled FROM push_devices WHERE id=$1', [retry.device_id])).rows[0].enabled, false);

    await notify();
    await register(installation, other);
    assert.equal((await jobs()).length, 0, 'account rebind cancels old recipient jobs');
    assert.equal((await db.query("SELECT count(*)::int AS count FROM push_jobs WHERE status='cancelled'")).rows[0].count, 1);
    await register(installation, user);
    const readNotification = await notify();
    await db.query('UPDATE notifications SET is_read=true WHERE id=$1', [readNotification]);
    assert.equal((await jobs()).length, 0, 'already-read notifications are not delivered late');
    await notify();
    await db.query('UPDATE push_devices SET enabled=false WHERE id=$1', [device]);
    assert.equal((await jobs()).length, 0, 'logout revocation cancels queued sends');
    await register(installation, user);
    await notify();
    const lostLease = (await jobs())[0];
    await db.query("UPDATE push_jobs SET lease_until=now()-interval '1 second' WHERE id=$1", [lostLease.id]);
    const recovered = (await jobs())[0];
    assert.notEqual(recovered.lease_id, lostLease.lease_id);
    assert.equal(await finish(lostLease, 'sent'), false, 'expired worker cannot acknowledge a new lease');
    assert.equal(await finish(recovered, 'sent'), true);

    const reinstalled = await register('66666666-6666-4666-8666-666666666666', user);
    assert.notEqual(reinstalled, device);
    assert.equal((await db.query("SELECT count(*)::int AS count FROM push_devices WHERE token='fcm-token-12345678901234567890'")).rows[0].count, 1);
    const testNotification = (await db.query('SELECT create_push_test_notification($1) AS id', [user])).rows[0].id;
    assert.equal((await db.query('SELECT count(*)::int AS count FROM push_jobs WHERE notification_id=$1', [testNotification])).rows[0].count, 1);
    await assert.rejects(() => db.query('SELECT create_push_test_notification($1)', [user]), /PUSH_TEST_RATE_LIMIT/);
    await assert.rejects(() => db.query('SELECT register_push_device($1,$2,$3,$4,$5,$6,$7)',
      [installation, user, 'android', 'apns', 'sandbox', 'fcm-token-12345678901234567890', expires]));
    await assert.rejects(() => db.exec('SET ROLE anon; SELECT * FROM push_devices'));
    await db.exec('RESET ROLE');
  } finally { await db.close(); }
});
