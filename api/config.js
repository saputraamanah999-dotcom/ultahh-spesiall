const { readConfig, publicConfig } = require('../lib/config');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.status(200).json(publicConfig(readConfig())); } catch (e) { res.status(500).json({ error: String(e.message) }); }
};
