// Minimal Upstash Redis REST client (no dependencies).
// Works with the Upstash integration from the Vercel Marketplace
// (KV_REST_API_URL / KV_REST_API_TOKEN) or plain Upstash vars.
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function cmd(args) {
  if (!URL_ || !TOKEN) throw new Error('DB_NOT_CONFIGURED');
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const KEYS = {
  free: 'hk:free_tables',
  teams: 'hk:teams',
  panels: 'hk:panel_counts',
  counter: 'hk:team_counter',
  init: 'hk:init',
  dup: 'hk:dup',
};

const TOTAL_TABLES = 100;
const PANELS = 4;

function authorized(req) {
  const pass = process.env.JUDGE_PASSCODE;
  if (!pass) return true; // open if no passcode configured
  return req.headers['x-passcode'] === pass;
}

module.exports = { cmd, KEYS, TOTAL_TABLES, PANELS, authorized };
