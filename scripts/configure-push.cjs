const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const root = path.join(__dirname, '..');

function configure() {
  const source = path.join(root, 'firebase-service-account.json');
  if (!fs.existsSync(source)) {
    throw new Error('Download your Firebase server service-account JSON to firebase-service-account.json in the project root. Never send it in chat or commit it.');
  }
  const account = JSON.parse(fs.readFileSync(source, 'utf8'));
  for (const name of ['project_id', 'client_email', 'private_key']) {
    if (typeof account[name] !== 'string' || !account[name]) throw new Error(`Service-account JSON is missing ${name}`);
  }
  const android = JSON.parse(fs.readFileSync(path.join(root, 'android', 'app', 'google-services.json'), 'utf8'));
  if (account.project_id !== android.project_info?.project_id) {
    throw new Error('Server service account and Android app belong to different Firebase projects.');
  }
  const envPath = path.join(root, '.env.local');
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const existingSecret = text.match(/^PUSH_DISPATCH_SECRET=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, '');
  const settings = {
    FIREBASE_PROJECT_ID: account.project_id,
    FIREBASE_CLIENT_EMAIL: account.client_email,
    FIREBASE_PRIVATE_KEY: account.private_key,
    PUSH_DISPATCH_SECRET: existingSecret && existingSecret.length >= 32 ? existingSecret : randomBytes(32).toString('hex'),
    PUSH_SEND_ENABLED: 'true',
  };
  for (const [name, value] of Object.entries(settings)) {
    const line = `${name}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${name}=.*$`, 'gm');
    text = pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(envPath, text);
  console.log('Firebase server settings written to ignored .env.local. No secrets are printed.');
  console.log('Add the same server settings securely to Vercel, apply the Push SQL migration, and redeploy.');
}

try { configure(); }
catch (error) {
  console.error('Push configuration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
