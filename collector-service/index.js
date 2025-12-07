require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({limit: '1mb'}));
app.use(morgan('dev'));

const LOGS_DB_URI = process.env.LOGS_DB_URI || 'mongodb://localhost:27017/logs_db';
const META_DB_URI = process.env.META_DB_URI || 'mongodb://localhost:27018/meta_db';

// create two mongoose connections
const logsConn = mongoose.createConnection(LOGS_DB_URI);
const metaConn = mongoose.createConnection(META_DB_URI);

// Simple schema for logs (stored in logs_db)
const apiLogSchema = new mongoose.Schema({
  service: String,
  endpoint: String,
  method: String,
  status: Number,
  latencyMs: Number,
  requestSize: Number,
  responseSize: Number,
  timestamp: { type: Date, default: Date.now },
  event: String
}, { strict: false });
const ApiLog = logsConn.model('ApiLog', apiLogSchema, 'api_logs');

// Incident schema in meta_db, use versionKey for optimistic locking (__v)
const incidentSchema = new mongoose.Schema({
  service: String,
  endpoint: String,
  type: String, // slow | broken | rate-limit
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  count: { type: Number, default: 1 },
  resolved: { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date
}, { timestamps: false });
const Incident = metaConn.model('Incident', incidentSchema, 'incidents');

// POST /collect/log
app.post('/collect/log', async (req, res) => {
  try {
    const payload = req.body;
    // insert into logs_db
    await ApiLog.create(payload);
    // simple rules
    const latency = Number(payload.latencyMs || 0);
    const status = Number(payload.status || 200);
    const event = payload.event || null;
    const service = payload.service || 'unknown';
    const endpoint = payload.endpoint || 'unknown';

    if (latency > 500) await upsertIncident(service, endpoint, 'slow');
    if (status >= 500) await upsertIncident(service, endpoint, 'broken');
    if (event === 'rate-limit-hit') await upsertIncident(service, endpoint, 'rate-limit');

    res.status(200).send({ ok: true });
  } catch (e) {
    console.error('collect error', e);
    res.status(500).send({ error: 'failed' });
  }
});

// GET /api/logs - basic filters via query
app.get('/api/logs', async (req, res) => {
  try {
    const { service, endpoint, limit = 100 } = req.query;
    const q = {};
    if (service) q.service = service;
    if (endpoint) q.endpoint = endpoint;
    const docs = await ApiLog.find(q).sort({ timestamp: -1 }).limit(Number(limit)).lean().exec();
    res.json(docs);
  } catch (e) {
    console.error(e); res.status(500).json({error:'failed'});
  }
});

// GET /api/incidents
app.get('/api/incidents', async (req, res) => {
  try {
    const docs = await Incident.find().sort({ lastSeen: -1 }).lean().exec();
    res.json(docs);
  } catch (e) { console.error(e); res.status(500).json({error:'failed'}); }
});

// POST /api/incidents/:id/resolve
app.post('/api/incidents/:id/resolve', async (req, res) => {
  try {
    const id = req.params.id;
    // optimistic update: fetch, set resolved true, save; handle version conflicts by retrying
    for (let attempt=0; attempt<3; attempt++) {
      const inc = await Incident.findById(id).exec();
      if (!inc) return res.status(404).json({error:'not found'});
      if (inc.resolved) return res.json({ ok: true, message: 'already resolved' });
      inc.resolved = true;
      inc.resolvedBy = req.body.user || 'unknown';
      inc.resolvedAt = new Date();
      try {
        await inc.save();
        return res.json({ ok: true });
      } catch (saveErr) {
        console.warn('save conflict, retry', saveErr.message);
        // continue to retry
      }
    }
    return res.status(500).json({ error: 'could not resolve due to concurrent updates' });
  } catch (e) { console.error(e); res.status(500).json({error:'failed'}); }
});

// helper: upsert incident by (service, endpoint, type)
async function upsertIncident(service, endpoint, type) {
  // try to find existing
  const q = { service, endpoint, type, resolved: false };
  const now = new Date();
  const existing = await Incident.findOne(q).exec();
  if (existing) {
    // increment with optimistic save
    for (let i=0;i<3;i++){
      existing.count = (existing.count || 1) + 1;
      existing.lastSeen = now;
      try {
        await existing.save();
        return;
      } catch(e){
        // reload and retry
        const fresh = await Incident.findOne(q).exec();
        if (!fresh) break;
        Object.assign(existing, fresh);
      }
    }
  } else {
    try {
      await Incident.create({ service, endpoint, type, firstSeen: now, lastSeen: now, count: 1, resolved: false });
    } catch(e){
      // might conflict if created concurrently; ignore
    }
  }
}

const port = process.env.PORT || 8080;
app.listen(port, () => console.log('Collector running on', port));
