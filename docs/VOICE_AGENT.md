# Bonus 2 – Voice agent architecture

A caller asks "Where is shipment RBHU-3F2A9C1D00?" and hears the answer.

```mermaid
sequenceDiagram
  participant C as Caller (PSTN)
  participant ACS as Azure Communication Services<br/>(Call Automation)
  participant VA as Voice agent service<br/>(App Service, WebSocket)
  participant VL as Azure Voice Live API<br/>(STT + LLM + TTS)
  participant API as Shipment API
  participant F as Fabric / Postgres
  C->>ACS: dials the ACS phone number
  ACS->>VA: IncomingCall event (Event Grid webhook)
  VA->>ACS: Answer call + start bidirectional media streaming (WebSocket)
  ACS-->>VA: audio frames (PCM 16 kHz)
  VA->>VL: stream audio (session with instructions + tools)
  VL-->>VA: transcript + tool call get_shipment_status(trackingNumber)
  VA->>API: GET /api/shipments?search=… (service identity)
  API->>F: query (read replica / Fabric SQL endpoint for analytics-style questions)
  API-->>VA: shipment JSON
  VA->>VL: tool result
  VL-->>VA: synthesized speech (neural voice)
  VA-->>ACS: audio frames
  ACS-->>C: spoken answer
```

## Components
- **Azure Communication Services** – phone number, Call Automation (answer, transfer to a human, hang up), bidirectional audio streaming.
- **Azure Voice Live API** – single realtime session handling speech-to-text, the LLM turn and text-to-speech with barge-in (interruptions), noise suppression and end-of-turn detection. Alternative composition: Azure AI Speech STT → Azure OpenAI → Speech TTS, at the cost of more latency and glue code.
- **Voice agent service** – small Node service (can live in this repo as `voice/`) that bridges the ACS media WebSocket and the Voice Live session, and exposes *tools* to the model.
- **Tools (function calling)**
  - `get_shipment_status(trackingNumber)` → calls the existing API.
  - `get_open_shipments_for_customer(customerName)`.
  - `transfer_to_agent()` → ACS call transfer.
- **Fabric** – answers analytical questions ("how many shipments were delivered this week?") through a Fabric Data Agent or the SQL analytics endpoint over the gold tables.

## Key design points
1. **Identity**: caller is unauthenticated, so the agent only reveals shipment status after verifying a second factor (tracking number + last 4 digits of the customer's phone, or a DTMF PIN). Read-only tools; no mutation by voice.
2. **Tracking numbers by voice**: spoken IDs are error-prone. Use a phrase list/custom speech for the `RBHU-` prefix, read numbers back for confirmation, and fall back to "I'll text you the details".
3. **Latency target** < 1.2 s to first audio: keep tools to one API hop, cache status for 15 s, stream TTS.
4. **Safety**: system prompt limits scope to shipment queries, PII never read out in full, recordings off by default (consent announcement if enabled), full transcripts stored with retention policy.
5. **Resilience**: if Voice Live or the API is down, play a fallback message and offer transfer to a human queue.
6. **Observability**: call ID propagated as a request ID; metrics for answer rate, containment rate (resolved without a human), average handle time, tool error rate.
7. **Cost control**: max call duration, silence timeout, per-day budget alert.
