export default async function handler(req, res){
  const base = process.env.COLLECTOR_URL || 'http://localhost:8080';
  const q = req.url.split('?')[1] || '';
  const r = await fetch(base + '/api/logs' + (q ? ('?' + q) : ''));
  const data = await r.json();
  res.status(200).json(data);
}
