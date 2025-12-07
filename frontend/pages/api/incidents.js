export default async function handler(req, res){
  const base = process.env.COLLECTOR_URL || 'http://localhost:8080';
  const r = await fetch(base + '/api/incidents');
  const data = await r.json();
  res.status(200).json(data);
}
