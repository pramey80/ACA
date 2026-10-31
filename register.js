const { cmd, KEYS, TOTAL_TABLES, PANELS } = require('../lib/redis');

// Runs atomically inside Redis so two teams can never get the same table
// and the panel split stays balanced even with simultaneous registrations.
const LUA = `
if redis.call('EXISTS', KEYS[5]) == 0 then
  for i = 1, tonumber(ARGV[1]) do redis.call('SADD', KEYS[1], i) end
  redis.call('SET', KEYS[5], '1')
end
local nk = 'n:' .. string.lower(ARGV[2])
local e1 = 'e:' .. string.lower(ARGV[4])
local e2 = 'e:' .. string.lower(ARGV[6])
if redis.call('HEXISTS', KEYS[6], nk) == 1 then return {'DUP_NAME'} end
if redis.call('HEXISTS', KEYS[6], e1) == 1 or redis.call('HEXISTS', KEYS[6], e2) == 1 then return {'DUP_EMAIL'} end
local tbl = redis.call('SPOP', KEYS[1])
if not tbl then return {'FULL'} end
local best, bestCount = 1, nil
for p = 1, tonumber(ARGV[9]) do
  local c = tonumber(redis.call('HGET', KEYS[3], tostring(p)) or '0') or 0
  if bestCount == nil or c < bestCount then best = p; bestCount = c end
end
redis.call('HINCRBY', KEYS[3], tostring(best), 1)
local id = redis.call('INCR', KEYS[4])
local team = cjson.encode({
  id = id, teamName = ARGV[2], member1Name = ARGV[3], email1 = ARGV[4],
  member2Name = ARGV[5], email2 = ARGV[6], area = ARGV[7],
  table = tonumber(tbl), panel = best, registeredAt = ARGV[8]
})
redis.call('HSET', KEYS[2], tostring(id), team)
redis.call('HSET', KEYS[6], nk, '1', e1, '1', e2, '1')
return {'OK', team}
`;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const clean = (v) => String(v || '').trim().slice(0, 120);
    const f = {
      teamName: clean(b.teamName),
      member1Name: clean(b.member1Name),
      email1: clean(b.email1),
      member2Name: clean(b.member2Name),
      email2: clean(b.email2),
      area: clean(b.area),
    };
    for (const [k, v] of Object.entries(f)) {
      if (!v) return res.status(400).json({ error: `Missing field: ${k}` });
    }
    if (!emailRe.test(f.email1) || !emailRe.test(f.email2))
      return res.status(400).json({ error: 'Please enter valid email addresses.' });
    if (f.email1.toLowerCase() === f.email2.toLowerCase())
      return res.status(400).json({ error: 'The two members need different email IDs.' });

    const result = await cmd([
      'EVAL', LUA, 6,
      KEYS.free, KEYS.teams, KEYS.panels, KEYS.counter, KEYS.init, KEYS.dup,
      String(TOTAL_TABLES), f.teamName, f.member1Name, f.email1, f.member2Name, f.email2,
      f.area, new Date().toISOString(), String(PANELS),
    ]);

    const status = result[0];
    if (status === 'DUP_NAME') return res.status(409).json({ error: 'A team with this name is already registered.' });
    if (status === 'DUP_EMAIL') return res.status(409).json({ error: 'One of these email IDs is already registered.' });
    if (status === 'FULL') return res.status(409).json({ error: `All ${TOTAL_TABLES} tables are taken. Registration is closed.` });
    return res.status(200).json({ team: JSON.parse(result[1]) });
  } catch (e) {
    if (e.message === 'DB_NOT_CONFIGURED')
      return res.status(500).json({ error: 'Database not configured. Add the Upstash Redis integration in Vercel.' });
    return res.status(500).json({ error: 'Server error: ' + e.message });
  }
};
