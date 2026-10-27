# Implementation Plan: Enterprise Compliance Verification Modal Redesign

Redesign the document verification modal in **VendorGuard** to replace generic AI sparkle aesthetics with an enterprise-grade cryptographic inspection console. The component will feature structured 4-stage audit telemetry, live runtime counters, escape pathways (`Esc`, `Cancel Audit`), and a floating background minimization pill.

---

## 1. User Alignment & Design Foundation

Based on user feedback:
- **Run in Background**: Minimizes the verification modal into an interactive floating status pill in the lower-right viewport, allowing seamless dashboard navigation, and notifies via toast upon completion.
- **Theme Adaptability**: Fully responsive across both **Pitch Black Dark Mode** (`bg-black` / `bg-neutral-950` with hairline `border-neutral-800` and emerald accents) and **Clean Light Mode** (`bg-white` with `border-slate-200`).
- **Cancellation Grace**: Aborting an in-progress batch (`Cancel Audit` / `Esc`) immediately halts the network pipeline, safely preserves any already-cleared documents, and clears the backdrop.

---

## 2. Proposed Architecture & Component Changes

### A. State Management Additions (`app/page.tsx`)
- `isMinimizedAudit: boolean`: Tracks whether the audit is currently running in the background.
- `auditStartTime: number`: Records timestamp when pipeline starts to drive an accurate live runtime counter (`Runtime: X.Xs`).
- `auditCurrentStage: number` (1 to 4): Maps `scanProgress` (0–100%) dynamically to the 4 discrete verification stages:
  - **Stage 1 (0–30%)**: Document OCR & Form Parsing
  - **Stage 2 (30–65%)**: IRS TIN / EIN Database Cross-Match
  - **Stage 3 (65–85%)**: Evaluating $1,000,000 General Liability Threshold & Insurance Underwriter Endorsement
  - **Stage 4 (85–100%)**: COI Expiration, Additional Insured, & Cryptographic Audit Seal
- `activeAbortController: AbortController | null`: Provides genuine abort capability for ongoing fetch operations.

### B. Verification Modal Visual Specification
- **Emblem**: Replace `Sparkles` with an animated Sandglass / Security Shield vector enclosed in a subtle pulse ring (`sandglass-ring` CSS animation).
- **Header**: Document filename with file icon, "Compliance Verification" headline, "Live Audit" state tag, and close button with `Esc` tooltip.
- **Segmented Micro Progress Bar**: Smooth gradient fill (`from-emerald-500 via-teal-400 to-cyan-400`) accompanied by tabular stage step and percentage text.
- **Structured Audit Ledger**: 4 distinct audit rows with individual completion times, active pulsating beacons, and queued state indicators.
- **Footer Controls**:
  - Telemetry: Monospace runtime timer (`Runtime: 1.8s`) and `<kbd>ESC</kbd>` affordance.
  - Secondary Action: `Run in Background` button that transitions the modal to the floating pill.
  - Destructive Action: `Cancel Audit` button with confirmation alert.

### C. Floating Background Minimization Pill
- Positioned at `fixed bottom-5 right-5 z-40`.
- Sleek glassmorphism pill showing the rotating sandglass icon, file count / active stage label, live percentage, and a "Maximize / View" button.
- Restores the full modal on click; automatically dispatches toast alert and opens the Optical Scan Report upon completion.

---

## 3. Step-by-Step Implementation Strategy

1. **CSS / Animations (`app/globals.css` or Tailwind classes)**:
   - Add `@keyframes pulse-ring` for the subtle sandglass pulse ring.
2. **State & Pipeline Controller Updates (`app/page.tsx`)**:
   - Integrate `isMinimizedAudit`, `auditElapsedSec`, and stage mapping.
   - Attach `keydown` listener for `Escape` key to safely trigger cancellation.
3. **Redesign the Modal (`app/page.tsx`)**:
   - Replace lines 3610–3670 with the redesigned structure.
   - Apply strict Tailwind tokens matching standard palette rules and dual-theme styles.
4. **Add Floating Background Pill (`app/page.tsx`)**:
   - Render when `isScanningPipeline && isMinimizedAudit`.
5. **Version Bump & Verification**:
   - Bump version to `1.28.0` in `package.json` and `/public/version.json`.
   - Run `lint_applet` and `compile_applet` to confirm 0 compilation and lint errors.

---

## 4. Verification & Testing

- Test upload of single and multiple vendor documents.
- Test `Run in Background` minimization and restore.
- Test `Cancel Audit` and `Escape` key abort pathways.
- Verify light and dark mode appearance and zero-pill / anti-slop compliance.
