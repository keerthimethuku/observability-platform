export default async function handler(req, res){
  const id = req.query.id;
  const base = process.env.COLLECTOR_URL || 'http://localhost:8080';
  const r = await fetch(base + '/api/incidents/' + id + '/resolve', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
  const data = await r.json();
  res.status(r.status).json(data);
}
