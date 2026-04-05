import app from '../server/index.js';

export default function (req, res) {
  // Strip the /api prefix so Express routing matches correctly
  // This mirrors how the local Vite proxy behaves
  if (req.url.startsWith('/api')) {
    req.url = req.url.substring(4) || '/';
  }
  return app(req, res);
}
