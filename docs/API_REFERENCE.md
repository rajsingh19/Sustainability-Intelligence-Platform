# Sensible Document Extractor — REST API Reference

> **FastAPI Endpoints Specification & Interactive OpenAPI Guide**  
> *Base URL: `http://localhost:8005/api` • Interactive Swagger UI: `http://localhost:8005/docs`*

---

## 1. System & Diagnostic Endpoints

### `GET /api/health`
Checks operational status of the backend API, SQLite database, OCR subsystem, and Google Gemini LLM service.

**Response (200 OK):**
```json
{
    "status": "healthy",
    "version": "1.0.0",
    "database": "connected",
    "ocr_available": true,
    "gemini_configured": true
}
```

### `GET /api/stats`
Retrieves high-level platform counts and document state statistics.
- **Response**:
  ```json
  {
    "total_documents": 24,
    "needs_review": 2,
    "completed": 14,
    "verified": 8,
    "total_emissions_tco2e": 142.85
  }
  ```

### `POST /api/samples/seed`
Seeds realistic synthetic demo documents for demonstration and testing.
- **Payload**:
  ```json
  {
    "sample_type": "electricity" // "electricity" | "esg" | "scanned"
  }
  ```

---

## 2. Document Ingestion & Extraction Endpoints

### `POST /api/documents/upload`
Uploads a new PDF file, computes SHA-256 hash, extracts text, classifies document, and generates structured data with evidence anchors.
- **Form Data**: `file: Binary PDF`
- **Response**: Full `DocumentResponse` with extraction, confidence, and evidence items.

### `GET /api/documents`
Lists documents with optional pagination, search filtering, and status filtering.
- **Query Parameters**:
  - `page` (int, default: 1)
  - `limit` (int, default: 10)
  - `search` (string, optional)
  - `status` (string, optional: `NEEDS_REVIEW`, `COMPLETED`, `VERIFIED`)

### `GET /api/documents/{id}`
Retrieves complete detail for a specific document including bounding boxes, structured key-values, and quality audit logs.

### `POST /api/documents/{id}/verify`
Marks a specific document field or the entire document as verified by human reviewer.

### `POST /api/documents/{id}/correct`
Applies a human correction to an extracted field with an immutable audit log entry.
- **Payload**:
  ```json
  {
    "field_name": "consumption_kwh",
    "corrected_value": 48750.0,
    "corrected_unit": "kWh",
    "reason": "Corrected OCR digit misread on billing page 2"
  }
  ```

### `POST /api/documents/{id}/reprocess`
Re-triggers extraction with optional forced high-resolution OCR.
- **Query Parameters**: `force_ocr` (boolean, default: false)

### `DELETE /api/documents/{id}`
Deletes document, physical file, and cascading normalized activity/ledger records.

---

## 3. Carbon Accounting & Ledger Endpoints

### `GET /api/carbon/dashboard`
Returns aggregated Scope 1, Scope 2 (market & location based), and Scope 3 breakdown, historical trends, emission intensities, and document contributions.

### `GET /api/activity-data`
Lists all normalized activity data records linked to source documents and line items.

### `GET /api/emission-factors`
Retrieves governed emission factor registry (DEFRA, CEA India, US EPA, IPCC).

### `GET /api/carbon/calculations`
Lists all transparent calculation logs with exact quantity $\times$ factor formulas and confidence scores.

### `GET /api/carbon/ledger`
Retrieves double-entry carbon ledger transactions with debit/credit entries and SHA-256 hashes.

### `GET /api/carbon-credit/assessments`
Retrieves Carbon Credit Readiness assessments, Core Carbon Principles scores, and MRV checklists.

---

## 4. Decarbonization & Insights Endpoints

### `GET /api/metrics`
Returns all aggregated sustainability metrics across operational periods.

### `GET /api/metrics/summary`
Returns top-level KPI cards (Total Energy MWh, Water kL, Scope 1/2 GHG $t\text{CO}_2e$).

### `GET /api/benchmarks`
Retrieves industry sector benchmark intelligence and percentile rankings.

### `GET /api/reduction-opportunities`
Returns deterministic mitigation opportunities ranked by ROI, payback, and abatement cost.

### `GET /api/forecast`
Calculates linear rolling trend extrapolations and baseline trajectory comparisons.

### `GET /api/reduction-roadmap`
Retrieves multi-phase decarbonization milestones and capital expenditure projections.

### `POST /api/emission-scenarios/simulate`
Simulates dynamic emission trajectories based on renewable electricity share, EV adoption, and efficiency parameters.
- **Payload**:
  ```json
  {
    "renewable_share_pct": 50,
    "ev_fleet_pct": 40,
    "efficiency_gain_pct": 15
  }
  ```

---

## 5. Compliance & Reporting Endpoints

### `GET /api/compliance-reports`
Lists generated compliance disclosure reports (GHG Protocol, BRSR, GRI, CBAM).

### `POST /api/compliance-reports/generate`
Generates a new regulatory compliance report for a specific period and framework.

### `GET /api/compliance-reports/{id}/pdf`
Downloads an audit-ready vector PDF document of the compliance disclosure.

### `GET /api/green-finance/assessments`
Retrieves green finance taxonomy assessments and green loan eligibility scoring.

### `GET /api/green-finance/{id}/pdf`
Downloads a Bank-Ready Green Loan Dossier PDF.

### `GET /api/reduction-projects`
Lists capital reduction projects and tracks Measurement & Verification (M&V) status.

---

## 6. Proactive Agent & Copilot Endpoints

### `GET /api/agent/actions`
Retrieves active proactive recommendations and action cards generated by the autonomous agent engine.

### `POST /api/agent/actions/{id}/execute`
Executes an approved proactive recommendation.

### `POST /api/agent/actions/{id}/dismiss`
Dismisses or archives a recommendation card.

### `POST /api/copilot/chat`
Conversational RAG endpoint answering natural language queries grounded in active document evidence and ledger data.
- **Payload**:
  ```json
  {
    "query": "What was our highest electricity consumption month and what contributed to it?",
    "document_id": 12 // Optional context anchor
  }
  ```
