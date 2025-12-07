const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const COLLECTOR = process.env.COLLECTOR_URL || 'http://localhost:8080';

// simple tracking middleware
function trackingMiddleware(serviceName){
  return async function(req, res, next){
    const start = Date.now();
    res.on('finish', async () => {
      const latency = Date.now() - start;
      const log = {
        service: serviceName,
        endpoint: req.path,
        method: req.method,
        status: res.statusCode,
        latencyMs: latency,
        requestSize: req.headers['content-length'] ? Number(req.headers['content-length']) : 0,
        responseSize: 0,
        timestamp: new Date().toISOString()
      };
      try {
        await axios.post(COLLECTOR + '/collect/log', log, { timeout: 2000 });
      } catch(e){
        console.warn('tracking POST failed', e.message);
      }
    });
    next();
  }
}

app.use(trackingMiddleware('sample-service'));

// demo endpoints
app.get('/fast', (req, res) => {
  res.json({ msg: 'fast' });
});

app.get('/slow', (req, res) => {
  // simulate slow
  setTimeout(()=> res.json({ msg: 'slow' }), 800);
});

app.get('/error', (req, res) => {
  res.status(500).json({ error: 'server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, ()=> console.log('Sample app running on', port));
