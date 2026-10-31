const { cmd, KEYS } = require('../lib/redis');

// Wipes all registrations. Only works when JUDGE_PASSCODE is set AND supplied.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const pass = process.env.JUDGE_PASSCODE;
  if (!pass) return res.status(403).json({ error: 'Set JUDGE_PASSCODE in Vercel to enable reset.' });
  if (req.headers['x-passcode'] !== pass) return res.status(401).json({ error: 'Wrong passcode' });
  try {
    await cmd(['DEL', KEYS.free, KEYS.teams, KEYS.panels, KEYS.counter, KEYS.init, KEYS.dup]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
