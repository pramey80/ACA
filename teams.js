const { cmd, KEYS, TOTAL_TABLES, PANELS, authorized } = require('../lib/redis');

module.exports = async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Wrong or missing passcode' });
  try {
    const flat = (await cmd(['HGETALL', KEYS.teams])) || [];
    const teams = [];
    for (let i = 1; i < flat.length; i += 2) teams.push(JSON.parse(flat[i]));
    teams.sort((a, b) => a.id - b.id);
    const panelCounts = {};
    for (let p = 1; p <= PANELS; p++) panelCounts[p] = teams.filter((t) => t.panel === p).length;
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ teams, panelCounts, totalTables: TOTAL_TABLES, panels: PANELS });
  } catch (e) {
    res.status(500).json({ error: e.message === 'DB_NOT_CONFIGURED' ? 'Database not configured' : e.message });
  }
};
