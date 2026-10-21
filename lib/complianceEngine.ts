import { Vendor, Document, ComplianceStatus, Settings, AuditLog } from "./db";

export type { ComplianceStatus, Vendor, Document, Settings, AuditLog };

// Benchmark reference date for simulation (October 15, 2026)
export const BENCHMARK_DATE = new Date("2026-10-15T12:00:00Z");

export interface ComplianceEvaluation {
  status: ComplianceStatus;
  paymentHold: boolean;
  holdReasons: string[];
  coiStatus: ComplianceStatus;
  w9Status: ComplianceStatus;
  daysUntilCoiExpiry: number | null;
  coiCoverageAmount: number | null;
  hasCoverageDeficit: boolean;
  isMissingW9: boolean;
}

export interface KPIStats {
  totalActive: number;
  needsAttentionCount: number;
  holdCount: number;
  expiringCount: number;
  compliantCount: number;
  missingW9Count: number;
  expiredCoiCount: number;
  compliantPercentage: number;
}

/**
 * Parses any date safely against the benchmark or current system date.
 */
export function getDaysRemaining(dateStr?: string, refDate: Date = BENCHMARK_DATE): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diffTime = d.getTime() - refDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates compliance for a single vendor against active settings.
 */
export function evaluateVendorCompliance(
  vendor: Vendor,
  settings?: Partial<Settings>,
  refDate: Date = BENCHMARK_DATE
): ComplianceEvaluation {
  const minCoverage = settings?.minCoiCoverage ?? 1000000;
  const noticeLeadDays = settings?.noticeLeadDays ?? 30;
  const requireSignedW9 = settings?.requireSignedW9 ?? true;

  const coiDoc = vendor.documents.find((d) => d.type === "COI");
  const w9Doc = vendor.documents.find((d) => d.type === "W9");

  const holdReasons: string[] = [];
  let coiStatus: ComplianceStatus = "VERIFIED";
  let daysUntilCoiExpiry: number | null = null;
  let coiCoverageAmount: number | null = null;
  let hasCoverageDeficit = false;

  // 1. Evaluate COI
  if (!coiDoc) {
    coiStatus = "INCOMPLETE";
    holdReasons.push("Missing Certificate of Insurance (COI)");
  } else {
    daysUntilCoiExpiry = getDaysRemaining(coiDoc.extractedData.expirationDate, refDate);
    coiCoverageAmount = coiDoc.extractedData.coverageAmount ?? null;

    if (daysUntilCoiExpiry !== null) {
      if (daysUntilCoiExpiry < 0) {
        coiStatus = "EXPIRED";
        holdReasons.push(`Policy expired ${Math.abs(daysUntilCoiExpiry)} days ago (${coiDoc.extractedData.expirationDate})`);
      } else if (daysUntilCoiExpiry <= noticeLeadDays) {
        coiStatus = "EXPIRING_SOON";
      } else {
        coiStatus = "VERIFIED";
      }
    } else {
      coiStatus = "INCOMPLETE";
      holdReasons.push("COI expiration date missing or invalid");
    }

    if (coiCoverageAmount !== null && coiCoverageAmount < minCoverage) {
      hasCoverageDeficit = true;
      holdReasons.push(
        `Coverage ($${coiCoverageAmount.toLocaleString()}) below required minimum ($${minCoverage.toLocaleString()})`
      );
    }
  }

  // 2. Evaluate W-9
  let w9Status: ComplianceStatus = "VERIFIED";
  let isMissingW9 = false;

  if (!w9Doc) {
    w9Status = "INCOMPLETE";
    isMissingW9 = true;
    holdReasons.push("Form W-9 not submitted");
  } else {
    const hasTaxId = Boolean(w9Doc.extractedData.taxIdOrEin);
    const isSigned = Boolean(w9Doc.extractedData.isSigned);

    if (!hasTaxId) {
      w9Status = "INCOMPLETE";
      isMissingW9 = true;
      holdReasons.push("Missing Employer Identification Number (EIN) or SSN on W-9");
    } else if (requireSignedW9 && !isSigned) {
      w9Status = "INCOMPLETE";
      isMissingW9 = true;
      holdReasons.push("Form W-9 missing authorized signature block");
    } else {
      w9Status = "VERIFIED";
    }
  }

  // 3. Determine Overall Vendor Status & Payment Hold
  const paymentHold = holdReasons.length > 0;
  let overallStatus: ComplianceStatus = "VERIFIED";

  if (coiStatus === "EXPIRED") {
    overallStatus = "EXPIRED";
  } else if (paymentHold) {
    overallStatus = "ACTION_REQUIRED";
  } else if (coiStatus === "EXPIRING_SOON") {
    overallStatus = "EXPIRING_SOON";
  } else {
    overallStatus = "VERIFIED";
  }

  return {
    status: overallStatus,
    paymentHold,
    holdReasons,
    coiStatus,
    w9Status,
    daysUntilCoiExpiry,
    coiCoverageAmount,
    hasCoverageDeficit,
    isMissingW9,
  };
}

/**
 * Re-evaluates all vendors in memory and synchronizes document statuses.
 */
export function recalculateAllVendors(
  vendors: Vendor[],
  settings?: Partial<Settings>,
  refDate: Date = BENCHMARK_DATE
): Vendor[] {
  return vendors.map((vendor) => {
    const evalResult = evaluateVendorCompliance(vendor, settings, refDate);
    const updatedDocuments = vendor.documents.map((doc) => {
      if (doc.type === "COI") {
        return {
          ...doc,
          status: evalResult.coiStatus,
          extractedData: {
            ...doc.extractedData,
            missingFields: evalResult.holdReasons.filter((r) => r.toLowerCase().includes("coi") || r.toLowerCase().includes("policy") || r.toLowerCase().includes("coverage")),
          },
        };
      }
      if (doc.type === "W9") {
        return {
          ...doc,
          status: evalResult.w9Status,
          extractedData: {
            ...doc.extractedData,
            missingFields: evalResult.holdReasons.filter((r) => r.toLowerCase().includes("w-9") || r.toLowerCase().includes("ein") || r.toLowerCase().includes("signature")),
          },
        };
      }
      return doc;
    });

    return {
      ...vendor,
      status: evalResult.status,
      documents: updatedDocuments,
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Dynamically computes accurate, synchronized KPI strip counts from the vendor dataset.
 */
export function calculateKPIStats(
  vendors: Vendor[],
  settings?: Partial<Settings>,
  refDate: Date = BENCHMARK_DATE
): KPIStats {
  let holdCount = 0;
  let expiringCount = 0;
  let compliantCount = 0;
  let missingW9Count = 0;
  let expiredCoiCount = 0;

  for (const v of vendors) {
    const ev = evaluateVendorCompliance(v, settings, refDate);
    if (ev.paymentHold) {
      holdCount++;
    }
    if (ev.coiStatus === "EXPIRED") {
      expiredCoiCount++;
    }
    if (ev.isMissingW9) {
      missingW9Count++;
    }
    if (ev.status === "EXPIRING_SOON") {
      expiringCount++;
    }
    if (ev.status === "VERIFIED" && !ev.paymentHold) {
      compliantCount++;
    }
  }

  const totalActive = vendors.length;
  // Needs Attention = Vendors on Hold + Expiring Soon
  const needsAttentionCount = holdCount + expiringCount;
  const compliantPercentage = totalActive > 0 ? Math.round((compliantCount / totalActive) * 1000) / 10 : 0;

  return {
    totalActive,
    needsAttentionCount,
    holdCount,
    expiringCount,
    compliantCount,
    missingW9Count,
    expiredCoiCount,
    compliantPercentage,
  };
}

/**
 * Storage key for persisting live modifications across page reloads.
 */
export const STORAGE_KEY_VENDORS = "acme_compliance_ledger_vendors_v2";
export const STORAGE_KEY_LOGS = "acme_compliance_ledger_logs_v2";
export const STORAGE_KEY_SETTINGS = "acme_compliance_ledger_settings_v2";

/**
 * Rehydrates state from localStorage or falls back to benchmark server data.
 */
export function loadPersistedData(): {
  vendors: Vendor[] | null;
  logs: AuditLog[] | null;
} {
  if (typeof window === "undefined") return { vendors: null, logs: null };
  try {
    const rawVendors = localStorage.getItem(STORAGE_KEY_VENDORS);
    const rawLogs = localStorage.getItem(STORAGE_KEY_LOGS);
    return {
      vendors: rawVendors ? JSON.parse(rawVendors) : null,
      logs: rawLogs ? JSON.parse(rawLogs) : null,
    };
  } catch (err) {
    console.error("Failed to read localStorage:", err);
    return { vendors: null, logs: null };
  }
}

/**
 * Saves state to browser localStorage.
 */
export function savePersistedData(vendors: Vendor[], logs: AuditLog[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_VENDORS, JSON.stringify(vendors));
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs.slice(0, 100)));
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
  }
}

/**
 * Clears localStorage to restore initial benchmark dataset.
 */
export function clearPersistedData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_VENDORS);
    localStorage.removeItem(STORAGE_KEY_LOGS);
  } catch (err) {
    console.error("Failed to clear localStorage:", err);
  }
}
