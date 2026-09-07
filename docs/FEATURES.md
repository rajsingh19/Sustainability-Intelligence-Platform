# Sensible Document Extractor — Platform Features Guide

> **Comprehensive Feature Specification & Functional Catalog**  
> *5 Core Functional Modules • 20+ Subsystems • Enterprise Sustainability Operations*

---

## Navigation & Module Matrix

The platform is structured into 5 top-level functional modules:

```
Sensible Document Extractor
├── 📁 1. Documents ▾
│   ├── All Documents (/documents)
│   ├── Needs Review (/documents?status=NEEDS_REVIEW)
│   ├── Ready Documents (/documents?status=COMPLETED)
│   ├── Verified Records (/documents?status=VERIFIED)
│   └── Document Detail & Evidence Viewer (/documents/:id)
│
├── 📊 2. Insights ▾
│   ├── Platform Metrics (/metrics)
│   ├── Industry Intelligence (/benchmarks)
│   ├── Reduction Opportunities (/reduction-opportunities)
│   ├── Emission Forecast (/forecast)
│   ├── Reduction Intelligence (/reduction-intelligence)
│   ├── Reduction Roadmap (/reduction-roadmap)
│   └── What-If Scenarios (/emission-scenarios)
│
├── 🌿 3. Carbon ▾
│   ├── Carbon Footprint Dashboard (/carbon-dashboard)
│   ├── Activity Data Matrix (/activity-data)
│   ├── Emission Factor Registry (/emission-factors)
│   ├── Calculations Engine (/carbon-calculations)
│   ├── Double-Entry Carbon Ledger (/carbon-ledger)
│   └── Carbon Credit Readiness (/carbon-credit)
│
├── 📑 4. Reports ▾
│   ├── Compliance Reports Builder (/compliance-reports)
│   ├── Green Finance Eligibility (/green-finance)
│   └── Reduction Projects Tracker (/reduction-projects)
│
└── 🤖 5. Agent (/agent) & Floating Copilot
    ├── Autonomous Agent Center (/agent)
    └── Global Floating Copilot RAG Drawer (Ask AI)
```

---

## 📁 Module 1: Documents & Multimodal Intelligence

### 1.1 All Documents Inventory
- **Overview**: Central searchable catalog of all uploaded operational documents (utility bills, diesel receipts, water statements, waste manifests, ESG audits).
- **Features**:
  - Live search by filename, vendor, or document type.
  - Quick status filtering: `All`, `Needs Review`, `Completed`, `Verified`.
  - Pagination (10, 25, 50 records per page).
  - SHA-256 duplicate detection on upload with instant alert banner.
  - Multi-file drag-and-drop ingestion with real-time processing indicator.

### 1.2 Low-Confidence "Needs Review" Queue
- **Routing Algorithm**: Documents scoring `< 80%` on extraction confidence or having unanchored numeric fields are automatically prioritized into the Needs Review view.
- **Workflow**: Expedites auditor and reviewer attention to edge-case scans, skewed photos, or unstandardized supplier invoices.

### 1.3 Ready & Verified Archives
- **Ready Documents**: Fully parsed and validated extractions queued for carbon accounting calculations.
- **Verified Records**: Auditor-approved documents with formal digital sign-off and immutable audit logs.

### 1.4 Document Detail & Evidence Anchoring
- **Side-by-Side Verification**: Interactive PDF viewer displayed alongside extracted structured key-value pairs.
- **Verbatim Evidence Anchors**: Every extracted field links to the exact bounding box, page number, and source text snippet.
- **Human-in-the-Loop Corrections**:
  - Inline editing of values, units, vendor names, and billing periods.
  - "Save Correction" logs previous value, new value, reason, and user timestamp to the immutable audit trail.
- **Re-Process with Forced OCR**: Option to re-trigger deep OCR on low-quality scans.

---

## 📊 Module 2: Insights & Decarbonization Intelligence

### 2.1 Platform Metrics & KPI Overview
- **Aggregated KPIs**: Total Energy (MWh), Water Consumption (kL), Scope 1 & 2 Emissions ($t\text{CO}_2e$), and Total Active Documents.
- **Period-over-Period Deltas**: Automatic calculation of quarter-over-quarter and year-over-year operational trends.

### 2.2 Industry Benchmarking & Sector Intelligence
- **Sector Peer Comparison**: Compares emission intensity ($t\text{CO}_2e \text{ / revenue}$ or $t\text{CO}_2e \text{ / unit output}$) against industry percentiles (Top 10%, Median, Bottom 25%).
- **Gap Analysis**: Identifies operational divergence in Scope 1 fuel usage or Scope 2 grid efficiency relative to regional standards.

### 2.3 Deterministic Reduction Opportunities
- **Focus Areas Ranked by ROI**: Algorithmic ranking of high-impact decarbonization initiatives:
  - Solar Rooftop PV Installation
  - LED & Smart HVAC Optimization
  - Boiler Economizer & Waste Heat Recovery
  - EV Fleet Transition
- **Metrics Calculated**:
  - Potential Annual Emission Abatement ($t\text{CO}_2e/\text{year}$)
  - Estimated CAPEX and Annual OPEX Savings (\$)
  - Simple Payback Period (years)
  - Abatement Cost ($\$/t\text{CO}_2e$)

### 2.4 Emission Forecast Engine
- **Rolling Linear Extrapolations**: Historical multi-period trend fitting with confidence interval bounds.
- **Target Trajectory Comparison**: Plots business-as-usual (BAU) curve against Net Zero / SBTi 1.5°C reduction targets.

### 2.5 Reduction Intelligence & Phased Roadmap
- **Phased Milestone Planner**: Multi-year decarbonization schedule broken into Immediate (0–12m), Medium (1–3y), and Long-term (3–5y) actions.
- **Capital Allocation Summary**: Cumulative investment required vs. cumulative energy cost savings.

### 2.6 What-If Emission Scenarios
- **Interactive Simulation Controls**:
  - Grid Electricity Renewable Share (0% &rarr; 100%)
  - Commercial Vehicle Fleet Electrification (0% &rarr; 100%)
  - Energy Efficiency Gain (0% &rarr; 50%)
- **Dynamic Scenario Curves**: Real-time recalculation of projected emission reduction percentages and annual savings.

---

## 🌿 Module 3: Carbon Accounting & Double-Entry Ledger

### 3.1 Carbon Footprint Dashboard
- **Scope 1, 2, 3 Breakdown**: Standardized donut and bar charts showing direct fuel combustion (Scope 1), purchased electricity (Scope 2 location & market based), and supply chain/waste (Scope 3).
- **Document Contribution Matrix**: Direct drill-down table linking each carbon metric back to its contributing source document.

### 3.2 Normalized Activity Data Matrix
- **Standardized Energy & Resource Units**: Aggregates normalized activity values (MWh, Litres, Tonnes, kg) across time periods and operational facilities.

### 3.3 Governed Emission Factor Registry
- **Multi-Standard Database**: Registry of emission factors from DEFRA (UK), Central Electricity Authority (CEA India v19), US EPA, and IPCC.
- **Metadata & Governance**: Every factor lists its scope, category, unit, geographic validity, standard citation, and effective year.

### 3.4 Transparent Calculations Engine
- **Zero-Blackbox Math**: Every calculation displays:
  $$\text{Emissions } (t\text{CO}_2e) = \text{Activity Quantity} \times \text{Emission Factor} \times \text{GWP}$$
- Shows exact input parameters, resolved factor IDs, formulas, and confidence ratings.

### 3.5 Double-Entry Carbon Ledger
- **Financial-Grade Accounting**: Mimics double-entry accounting with debits (emissions incurred) and credits (renewables / certified offsets).
- **Cryptographic Immutability**: Each posted ledger transaction includes a SHA-256 transaction hash.

### 3.6 Carbon Credit Readiness
- **Core Carbon Principles (CCP) Assessment**: Scores company projects against Gold Standard / Verra criteria.
- **MRV Checklist**: Tracks Monitoring, Reporting, and Verification readiness, additionality proofs, baseline integrity, and permanence guarantees.

---

## 📑 Module 4: Compliance, Green Finance & Projects

### 4.1 Compliance Reports Builder
- **Regulatory Disclosure Frameworks**:
  - **GHG Protocol**: Corporate Standard Scope 1/2/3 accounting tables.
  - **BRSR (India)**: SEBI Business Responsibility & Sustainability Reporting Principle 6 format.
  - **GRI (Global Reporting Initiative)**: GRI 302, 305, 306 compliance mapping.
  - **CBAM (EU)**: Carbon Border Adjustment Mechanism export disclosures.
- **Audit-Ready PDF Generator**: One-click generation of professional vector PDF reports with charts, executive summaries, and methodology notes.

### 4.2 Green Finance & Lending Readiness
- **Taxonomy Alignment Score**: Evaluates business activities against EU Taxonomy and RBI Green Lending directives.
- **Bank-Ready Green Loan Dossier**: Compiles evidence-backed sustainability performance dossiers for concessionary interest rate applications.

### 4.3 Capital Reduction Projects Tracker
- **Project Implementation Lifecycle**: Tracks capital projects from `Proposed` &rarr; `In Progress` &rarr; `Completed` &rarr; `Verified`.
- **Measurement & Verification (M&V)**: Compares actual post-implementation utility bills against baseline projections to verify real-world energy savings.

---

## 🤖 Module 5: Proactive Agent & Conversational Copilot

### 5.1 Autonomous Agent Center (`/agent`)
- **Proactive Anomaly Detection**: Autonomous background trigger engine continually analyzes ledger data, bill spikes, expiring compliance deadlines, and high-ROI opportunities.
- **Action Recommendation Cards**: Proactively suggests concrete actions (e.g., "Review 18% diesel consumption spike in Facility A", "Generate Q3 BRSR Report", "Initiate Rooftop Solar RFP").
- **One-Click Execution & Lifecycle**: Users can `Approve & Execute`, `Dismiss`, or `Snooze` actions with complete human oversight.

### 5.2 Global Floating Copilot RAG Drawer (Ask AI)
- **Instant Accessibility**: Persistent floating action trigger available across all application views.
- **Context-Aware Assistance**: Automatically receives context of the currently viewed document, calculation, or report.
- **Grounded Verification**: Returns natural language answers with exact mathematical steps, emission factor references, and clickable document links.
