# Observability Platform 

- `collector-service` - Node.js Express app that receives logs, stores in logs_db, creates incidents in meta_db.
- `sample-app` - sample microservice that sends tracking logs to collector.
- `frontend` - minimal Next.js dashboard to view logs and incidents.
- `docker-compose.yml` - starts two MongoDB instances (logs_db and meta_db).

## Quick start 
1. Make sure you have Node 18+, npm, and Docker installed.
2. Start MongoDB containers:
   ```bash
   docker compose up -d
   ```
   This starts:
   - Mongo logs DB on localhost:27017
   - Mongo meta DB on localhost:27018

3. Start the collector:
   ```bash
   cd collector-service
   npm install
   npm start
   ```
   Collector listens on port 8080 by default.

4. Start the sample app (generates logs):
   ```bash
   cd sample-app
   npm install
   npm start
   ```
   Sample app on port 4000. Endpoints:
   - `GET /fast` (fast)
   - `GET /slow` (slow, ~800ms)
   - `GET /error` (returns 500)

   Hitting `/slow` and `/error` will generate incidents.

5. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open http://localhost:3000

## Useful API endpoints
- Collector:
  - `POST /collect/log` - receives log JSON
  - `GET /api/logs` - query recent logs
  - `GET /api/incidents` - list incidents
  - `POST /api/incidents/:id/resolve` - resolve incident

## How it works 
- sample-app middleware sends log JSON to collector after each request.
- collector stores logs in `logs_db.api_logs` (Mongo on port 27017).
- collector creates incidents in `meta_db.incidents` (Mongo on port 27018) for:
  - latency > 500ms -> type `slow`
  - status >= 500 -> type `broken`
  - event === 'rate-limit-hit' -> type `rate-limit`
- frontend fetches incidents and logs from collector and shows them.

