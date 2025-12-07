import useSWR from 'swr';
const fetcher = (url)=> fetch(url).then(r=>r.json());

export default function Home(){
  const { data: incidents } = useSWR('/api/incidents', fetcher, { refreshInterval: 3000 });
  const { data: logs } = useSWR('/api/logs?limit=50', fetcher, { refreshInterval: 5000 });

  return (
    <div>
      <h1>Observability Dashboard (Minimal)</h1>
      <div style={{marginBottom:12}}>
        <span className="card">Incidents: {incidents ? incidents.length : '...'}</span>
        <span className="card">Logs shown: {logs ? logs.length : '...'}</span>
      </div>

      <h2>Incidents</h2>
      <table>
        <thead><tr><th>Service</th><th>Endpoint</th><th>Type</th><th>Count</th><th>Resolved</th><th>Action</th></tr></thead>
        <tbody>
          {incidents && incidents.map(i=>(
            <tr key={i._id}>
              <td>{i.service}</td>
              <td>{i.endpoint}</td>
              <td>{i.type}</td>
              <td>{i.count}</td>
              <td>{i.resolved ? 'Yes' : 'No'}</td>
              <td>{!i.resolved && <button onClick={async ()=>{ await fetch('/api/resolve?id='+i._id, { method:'POST'}); window.location.reload(); }}>Resolve</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Recent Logs</h2>
      <table>
        <thead><tr><th>Time</th><th>Service</th><th>Endpoint</th><th>Status</th><th>Latency</th></tr></thead>
        <tbody>
          {logs && logs.map(l=>(
            <tr key={l._id}>
              <td>{new Date(l.timestamp).toLocaleString()}</td>
              <td>{l.service}</td>
              <td>{l.endpoint}</td>
              <td>{l.status}</td>
              <td>{l.latencyMs} ms</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr />
      <p>Tip: start collector and sample-app, then call <code>/slow</code> or <code>/error</code> endpoints on sample-app to generate incidents.</p>
    </div>
  )
}
