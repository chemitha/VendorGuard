# Bulk Document Ingestion & Presentation Flow

Solidify the enterprise bulk document intake pipeline by adhering strictly to the frictionless local file drag-and-drop and native multi-file explorer picker, while rejecting fragile Google Drive / OneDrive shareable links that fail in corporate environments. Add a 1-click **"Load Demo Batch (3 Documents)"** trigger in the dropzone for foolproof live demonstrations and Loom recordings.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Strategic Architecture:**
> - **No Google Drive Shareable Link Feature:** Rejected due to corporate permission walls (HTTP 403 Forbidden on internal `@company.com` domains), authentication friction, and scraping instability.
> - **Stick with Dual Ingestion Model:**
>   1. **Automated Inbound Email:** Real-world continuous intake via `intake@compliance.acmelogistics.com`.
>   2. **Bulk Ingestion Sandbox:** Drag-and-drop from local desktop folders (including Google Drive for Desktop / OneDrive synced paths) and the native multi-file OS file picker (`<input type="file" multiple>`).
> - **Demo Reliability Feature:** Add a prominent **"Load Demo Batch (3 Sample PDFs)"** quick-action button directly inside the dropzone container, allowing immediate execution of the 1.8s scanning sequence and the Batch Ingestion Report modal without requiring attendees to search their local disk during meetings or Loom recordings.

---

## 1. Overview & Core Concept

- **What It Does**: Enables Accounts Payable (AP) clerks and Controllers to backfill dozens or hundreds of historical vendor compliance documents (COIs, W-9s) directly into VendorGuard without complex IT integrations.
- **Target Audience**: AP Directors, Controllers, Compliance Officers, and Sales Demo Presenters.
- **Key Value**: Zero setup time, zero security audits, immediate optical audit extraction, and automated ledger deduplication.

---

## 2. User Experience & Visual Design

```
+---------------------------------------------------------------------------------------------------------+
|  📁 BULK HISTORICAL INGESTION SANDBOX                                                                   |
|                                                                                                         |
|       ┌─────────────────────────────────────────────────────────────────────────────────────────┐       |
|       │  📥 Drop vendor PDFs here, paste (Ctrl+V), or select multiple documents                 │       |
|       │                                                                                         │       |
|       │     [ 📂 Browse Files (Multi-Select) ]       [ ⚡ Load Demo Batch (3 Sample PDFs) ]      │       |
|       │                                                                                         │       |
|       │  Accepts .pdf, .jpg, .png  ·  Hold Ctrl/Shift to multi-select  ·  Zero IT setup needed │       |
|       └─────────────────────────────────────────────────────────────────────────────────────────┘       |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```

### Key User Flows

1. **Flow A (File Drop / Native Picker):**
   - User drags 1 to 50 PDFs from Windows Explorer / Finder (or clicks "Browse Files" and multi-selects).
   - Scanning overlay appears with animated progress: *"Analyzing documents via Gemini Vision Pipeline..."*
   - Results pop up in the **Batch Ingestion & Optical Scan Report** modal.
   - User reviews extracted entities, policy limits, and holds before clicking **"Apply & Update Ledger"**.

2. **Flow B (1-Click Demo Presentation):**
   - In a sales demo or Loom video, the presenter clicks **"Load Demo Batch (3 Sample PDFs)"**.
   - Instantly triggers the realistic 1.8s scan simulation using the 3 canonical enterprise documents:
     - `COI_ApexLogistics_2026.pdf` (Expired General Liability — Hold Applied)
     - `W9_SummitFacility_v2.pdf` (Verified W-9 — Hold Cleared)
     - `Pinnacle_Renewal_2027.pdf` (Updated COI — In-place Ledger Upsert)
   - Opens the Batch Ingestion & Optical Scan Report modal for immediate commentary.

### Visual & Architectural Compliance
- Adheres strictly to `frontend-design` and `3_saas_dashboard.md`.
- No decorative status dots, no fake telemetry tickers, and no pill badges on static metadata.
- High-contrast tabular numerals (`font-mono tabular-nums`) for currency amounts and policy dates.
- Clean unboxed metadata with middle-dot separators (`·`).

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Rationale | Alternatives Rejected |
| :--- | :--- | :--- | :--- |
| **Cloud Drive Links** | Reject completely | Corporate links return 403 Forbidden without IT tenant credentials. Fails for enterprise buyers. | "Paste Google Drive Link" box (unreliable, requires scraping/OAuth). |
| **Desktop Ingestion** | Native drag-and-drop + file picker | Works with Google Drive for Desktop (`G:\Shared drives\...`), OneDrive, local folders, and downloaded zip files. | Third-party cloud storage picker SDKs (adds 400KB bundle weight & privacy concerns). |
| **Presentation Safety** | 1-Click Demo Batch Loader | Guarantees a flawless 90-second sales pitch or video recording without needing files on the host machine. | Forcing manual file selection during live screen shares. |
| **Deduplication** | In-place upsert by entity name | Prevents duplicate ledger entries (e.g. Pinnacle Freight updated rather than duplicated). | Blind append (leads to duplicate rows and corrupted ledger totals). |

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            User Ingestion Entry                              │
│   [Drag & Drop / Paste]   │   [<input type="file" multiple>]   │ [Demo Batch] │
└──────────────────────────┬─────────────────────────────┬─────────────────────┘
                           │                             │
                           ▼                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Document Preprocessing & Normalization                    │
│   - Validates MIME types (.pdf, .png, .jpg)                                  │
│   - Maps sample demo payloads or extracts client file metadata               │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Gemini Vision Optical OCR Simulation                     │
│   - 1.8s deterministic multi-stage scanning pipeline                         │
│   - Extracts entity name, document type (COI vs W-9), limits, expiration     │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 Batch Ingestion & Optical Scan Report Modal                  │
│   - Summary KPIs: Verified & Cleared / Hold Enforced / Unreadable            │
│   - Scrollable data table with sticky headers (supports 3 to 100+ items)    │
│   - Contextual actions: [Draft Notice], [View Form], [Audit Log]            │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Ledger Deduplication Engine                          │
│   - Matches existing vendor names case-insensitively                         │
│   - Updates existing records in-place; appends novel vendors                 │
│   - Recomputes compliance statuses and saves to localStorage                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Verification Plan

1. **Verify Sandbox Dual Actions:**
   - Confirm "Browse Files (Multi-Select)" triggers the native OS file picker with `multiple` enabled.
   - Confirm "Load Demo Batch (3 Sample PDFs)" triggers the 1.8s scanning sequence immediately.
2. **Verify Batch Modal Display:**
   - Confirm the Batch Ingestion & Optical Scan Report modal displays 3 rows with extracted metrics.
   - Verify modal table is scrollable for larger batches with sticky backdrop headers.
3. **Verify Ledger Deduplication:**
   - Click "Apply & Update Ledger" and confirm Pinnacle Freight is updated in-place without duplicate rows.
4. **Verify Build Health:**
   - Run `lint_applet` and `compile_applet` to confirm pristine Next.js build.
