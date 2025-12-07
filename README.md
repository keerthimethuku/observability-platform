# API Monitoring & Observability Platform

## Architecture
The system follows a centralized monitoring design where all microservices send API metrics to a single collector.

Microservice → Tracking Middleware → Collector Service → Dual MongoDB → Dashboard

- The tracking middleware captures API request details.
- The collector stores logs, detects issues, and manages incidents.
- The dashboard visualizes logs and incidents.

---

## Database Schemas

### logs_db (API Logs)
Used for storing all API request logs.

{
  service: "sample-service",
  endpoint: "/slow",
  method: "GET",
  status: 200,
  latencyMs: 820,
  timestamp: "..."
}

### meta_db (Incidents & Metadata)
Used for storing detected incidents and resolution status.

{
  service: "sample-service",
  endpoint: "/slow",
  type: "slow",
  count: 3,
  resolved: false,
  __v: 2
}

---

## Decisions Taken
- Logs and incidents are stored in separate databases to avoid performance issues.
- Tracking middleware is lightweight and does not block API requests.
- Collector service is centralized for easier analysis and monitoring.
- MongoDB is used for its flexibility and high write throughput.

---

## Dual MongoDB Setup
Two MongoDB databases are used:

- logs_db stores high-volume API logs.
- meta_db stores low-volume incident metadata.

This separation ensures logs ingestion does not impact incident management and allows independent scaling.

---

## Rate Limiter
- Tracks the number of API requests per service per second.
- If the limit is exceeded, a rate-limit event is generated.
- Requests are not blocked; only monitoring data is recorded.
- The collector creates a rate-limit incident for visibility.




