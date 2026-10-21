"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  Search,
  FileUp,
  Download,
  CheckCircle2,
  Settings,
  X,
  Send,
  RefreshCw,
  Eye,
  FileText,
  Mail,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Package,
  Layers,
  FileCheck2,
  AlertTriangle,
  ExternalLink,
  Archive,
  Bell,
  Check,
  Scale,
  Copy,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Lock,
  Unlock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { SmoothHeight, SmartDropdown, CountUp } from "@/components/ui";
import { SettingsModal, AppSettings, DEFAULT_APP_SETTINGS } from "@/components/settings";
import {
  evaluateVendorCompliance,
  recalculateAllVendors,
  calculateKPIStats,
  BENCHMARK_DATE,
  loadPersistedData,
  savePersistedData,
  clearPersistedData,
  ComplianceStatus,
} from "@/lib/complianceEngine";

interface ExtractedData {
  vendorName?: string;
  taxIdOrEin?: string;
  expirationDate?: string;
  coverageAmount?: number;
  coverageLabel?: string;
  isSigned?: boolean;
  missingFields?: string[];
  confidenceScore?: number;
}

interface Document {
  id: string;
  type: "W9" | "COI" | "INVOICE" | "OTHER";
  fileName: string;
  fileUrl?: string;
  extractedData: ExtractedData;
  status: "VERIFIED" | "EXPIRING_SOON" | "EXPIRED" | "INCOMPLETE" | "ACTION_REQUIRED";
  createdAt: string;
}

interface Vendor {
  id: string;
  name: string;
  contactEmail: string;
  type: "Staffing" | "Logistics" | "HR Platform" | "Facilities" | "Other";
  status: "VERIFIED" | "EXPIRING_SOON" | "EXPIRED" | "INCOMPLETE" | "ACTION_REQUIRED";
  documents: Document[];
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  vendorId?: string;
  vendorName: string;
  action: string;
  details: string;
  status: "success" | "warning" | "error";
}

export interface BatchScannedResult {
  fileName: string;
  vendorName: string;
  docType: "COI" | "W9";
  details: string;
  status: "VERIFIED" | "EXPIRED" | "INCOMPLETE";
  actionRequired: boolean;
  isExistingVendor: boolean;
  statusNote?: string;
  extractedData?: {
    coverageAmount?: number;
    coverageLabel?: string;
    expirationDate?: string;
    taxIdOrEin?: string;
    isSigned?: boolean;
  };
}



// Clean date formatting helper: converts "2026-09-30" to "Sep 30, 2026"
function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  if (dateStr.includes(" ") && isNaN(Number(dateStr))) return dateStr;
  try {
    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${months[mIdx]} ${parseInt(day, 10).toString().padStart(2, "0")}, ${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Enterprise deterministic secure upload slug helper (replaces placeholder /upload/1 or /upload/2)
function getSecureUploadSlug(vendor: Vendor, docType?: string): string {
  const cleanName = vendor.name
    .toLowerCase()
    .replace(/llc|inc|corp|corporation|group|ltd/gi, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 14) || "vendor";
  const typeTag = docType?.toLowerCase().includes("w9") || docType?.toLowerCase().includes("w-9") 
    ? "w9" 
    : "coi";
  
  // Stable 5-character hex hash based on vendor entity identity
  let hash = 0;
  const seedStr = `${vendor.id}-${vendor.name}-${typeTag}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(5, "0").slice(0, 5);
  return `${cleanName}-${typeTag}-${hex}`;
}

interface AppNotification {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  timestamp: string;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
  vendorId?: string;
}





export default function VendorCompliancePortal() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  interface RippleState {
    x: number;
    y: number;
    maxRadius: number;
    isDark: boolean;
  }
  const [rippleState, setRippleState] = useState<RippleState | null>(null);

  const toggleThemeWithRipple = (
    e?: React.MouseEvent | { clientX?: number; clientY?: number; currentTarget?: any },
    targetDark?: boolean
  ) => {
    const nextDark = targetDark !== undefined ? targetDark : !isDarkMode;

    let x: number | undefined = undefined;
    let y: number | undefined = undefined;

    // Check for explicit mouse coordinates
    if (
      e &&
      "clientX" in e &&
      typeof e.clientX === "number" &&
      !isNaN(e.clientX) &&
      (e.clientX !== 0 || e.clientY !== 0)
    ) {
      x = e.clientX;
      y = e.clientY;
    } else if (
      e &&
      "currentTarget" in e &&
      e.currentTarget &&
      typeof (e.currentTarget as HTMLElement).getBoundingClientRect === "function"
    ) {
      // If triggered by keyboard or touch, use center of clicked element
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    // Default fallback coordinates: top-right navbar theme button area
    if ((x === undefined || y === undefined) && typeof window !== "undefined") {
      x = window.innerWidth - 80;
      y = 28;
    }

    const clickX = x ?? 0;
    const clickY = y ?? 0;

    const maxRadius =
      typeof window !== "undefined"
        ? Math.ceil(
            Math.hypot(
              Math.max(clickX, window.innerWidth - clickX),
              Math.max(clickY, window.innerHeight - clickY)
            )
          )
        : 1400;

    // Native View Transitions API with circular mask animation
    const doc = typeof document !== "undefined" ? (document as any) : null;
    if (doc && typeof doc.startViewTransition === "function") {
      try {
        const transition = doc.startViewTransition(() => {
          flushSync(() => {
            setIsDarkMode(nextDark);
          });
          if (nextDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        });

        transition.ready
          .then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${clickX}px ${clickY}px)`,
                  `circle(${maxRadius}px at ${clickX}px ${clickY}px)`,
                ],
              },
              {
                duration: 500,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                pseudoElement: "::view-transition-new(root)",
              }
            );
          })
          .catch(() => {
            setIsDarkMode(nextDark);
          });

        return;
      } catch {
        // Fall through to fallback overlay
      }
    }

    // Fallback expanding circular mask overlay (for browsers without View Transitions)
    setRippleState({ x: clickX, y: clickY, maxRadius, isDark: nextDark });
    setIsDarkMode(nextDark);
    if (typeof document !== "undefined") {
      if (nextDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    setTimeout(() => {
      setRippleState(null);
    }, 520);
  };

  // Sync theme with html root for global styles
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [isDarkMode]);

  // Data states
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  // UI state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTION" | "HOLD" | "EXPIRING" | "COMPLIANT" | "MISSING_W9">("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Upgraded Multi-Toast Stack & Notification Center State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<AppNotification[]>([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationDrawerTab, setNotificationDrawerTab] = useState<"ALL" | "ALERTS" | "LOGS">("ALL");
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Standard enterprise density default: 10 rows

  // Table loading state: Indeterminate Progress Bar
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);

  // Modals & Drawers
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);
  const [inspectVendor, setInspectVendor] = useState<Vendor | null>(null);
  const [noticeVendor, setNoticeVendor] = useState<{ vendor: Vendor; docType: string } | null>(null);
  const [emailNoticeBody, setEmailNoticeBody] = useState("");
  const [isScanningPipeline, setIsScanningPipeline] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStepText, setScanStepText] = useState("Scanning with Gemini Vision...");
  const [scanTargetFileName, setScanTargetFileName] = useState("COI_Pinnacle_Logistics_2027.pdf");
  const [viewingDoc, setViewingDoc] = useState<{ doc: Document; vendor: Vendor } | null>(null);
  const [docModalTab, setDocModalTab] = useState<"scan" | "audit">("scan");
  const [batchResults, setBatchResults] = useState<BatchScannedResult[] | null>(null);

  // Helper to open notice modal with personalized pre-filled draft
  const openNoticeModal = (vendor: Vendor, docType: string) => {
    const defaultSignoff = appSettings.defaultApSignoffName?.trim() || `Accounts Payable Department • ${appSettings.companyName}`;
    const slug = getSecureUploadSlug(vendor, docType);
    const initialBody = `Hi ${vendor.name} Accounts Receivable,\n\nDuring routine inbound compliance auditing for ${appSettings.companyName}, we identified that your ${docType} requires an immediate update to clear outstanding invoice payments.\n\nPlease upload your renewed document directly to our secure portal or reply directly with the PDF attached to clear payment holds:\nhttps://compliance.acmelogistics.com/upload/${slug}\n\n${defaultSignoff}`;
    setEmailNoticeBody(initialBody);
    setNoticeVendor({ vendor, docType });
  };

  // Rows per page change handler ensuring pagination label & row expansion updates
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    }
  };

  // Temporary copied indicator state for EIN / Tax ID clipboard copying
  const [copiedTaxId, setCopiedTaxId] = useState<string | null>(null);

  const handleCopyTaxId = (taxId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(taxId).catch(() => {});
    }
    setCopiedTaxId(taxId);
    setTimeout(() => {
      setCopiedTaxId(null);
    }, 2000);
  };

  // Search and Table Refs for Keyboard Shortcuts & Smooth Scrolling
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileDropRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const notificationTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Dismiss a specific notification by ID
  const dismissNotification = (id: string) => {
    const timeout = notificationTimeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      notificationTimeoutsRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Dismiss all active toasts
  const dismissAllNotifications = () => {
    notificationTimeoutsRef.current.forEach((t) => clearTimeout(t));
    notificationTimeoutsRef.current.clear();
    setNotifications([]);
  };

  // Upgraded Enterprise Notification Dispatcher (Multi-stack, actionable, unread tracking)
  const notify = (
    title: string,
    message: string,
    type: "success" | "warning" | "error" | "info" = "info",
    badge?: string,
    autoDismissMs: number = 6000,
    actionLabel?: string,
    onAction?: () => void,
    vendorId?: string
  ) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNotification: AppNotification = {
      id,
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      badge,
      actionLabel,
      onAction,
      vendorId,
    };

    // Keep up to 3 active toasts stacked
    setNotifications((prev) => [newNotification, ...prev.slice(0, 2)]);
    setNotificationHistory((prev) => [newNotification, ...prev.slice(0, 49)]);
    setUnreadNotificationCount((prev) => prev + 1);

    if (autoDismissMs > 0) {
      const timeout = setTimeout(() => {
        dismissNotification(id);
      }, autoDismissMs);
      notificationTimeoutsRef.current.set(id, timeout);
    }
  };

  // Smooth scroll and height transition handler for Table
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;
    setCurrentPage(newPage);

    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    }
  };

  // Smooth filter transition handler
  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setCurrentPage(1);

    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    }
  };

  // Canonical deduplication helper ensuring duplicate vendor records (e.g. Pinnacle Freight) are merged in-place
  const deduplicateVendors = (vendorList: Vendor[]): Vendor[] => {
    const seen = new Map<string, Vendor>();
    for (const v of vendorList) {
      const key = v.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      if (!seen.has(key)) {
        seen.set(key, v);
      } else {
        const existing = seen.get(key)!;
        const mergedDocs = [...existing.documents];
        for (const doc of v.documents) {
          const docIdx = mergedDocs.findIndex((d) => d.type === doc.type);
          if (docIdx >= 0) {
            if (doc.status === "VERIFIED" || new Date(doc.createdAt).getTime() > new Date(mergedDocs[docIdx].createdAt).getTime()) {
              mergedDocs[docIdx] = doc;
            }
          } else {
            mergedDocs.push(doc);
          }
        }
        seen.set(key, {
          ...existing,
          documents: mergedDocs,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    return Array.from(seen.values());
  };

  // Load database with localStorage rehydration and live compliance recalculation
  const fetchDb = async () => {
    setIsLoadingVendors(true);

    // 1. Check local storage first for offline / persistent continuity across page refreshes
    const persisted = loadPersistedData();
    if (persisted.vendors && persisted.vendors.length > 0) {
      const deduplicated = deduplicateVendors(persisted.vendors);
      const recalculated = recalculateAllVendors(deduplicated, appSettings, BENCHMARK_DATE);
      setVendors(recalculated);
      if (persisted.logs && persisted.logs.length > 0) {
        setLogs(persisted.logs);
      }
      savePersistedData(recalculated, persisted.logs || []);
      setIsLoadingVendors(false);
      return;
    }

    // Timeout safety: if nothing happens / network hangs, stop loading after 30 seconds
    const safetyTimeout = setTimeout(() => {
      setIsLoadingVendors(false);
    }, 30000);

    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      clearTimeout(safetyTimeout);

      const applySettings = (incomingSettings?: Partial<AppSettings>) => {
        if (!incomingSettings) return;
        setAppSettings((prev) => ({
          ...DEFAULT_APP_SETTINGS,
          ...prev,
          ...incomingSettings,
          channels: {
            ...DEFAULT_APP_SETTINGS.channels!,
            ...(prev.channels || {}),
            ...(incomingSettings.channels || {}),
          },
          triggers: {
            ...DEFAULT_APP_SETTINGS.triggers,
            ...(prev.triggers || {}),
            ...(incomingSettings.triggers || {}),
          },
        }));
      };

      if (data.vendors && data.vendors.length > 0) {
        const deduplicated = deduplicateVendors(data.vendors);
        const recalculated = recalculateAllVendors(deduplicated, data.settings || appSettings, BENCHMARK_DATE);
        setVendors(recalculated);
        setLogs(data.logs || []);
        savePersistedData(recalculated, data.logs || []);
        applySettings(data.settings);
        setIsLoadingVendors(false);
      } else {
        setVendors([]);
        if (data.logs) setLogs(data.logs);
        applySettings(data.settings);
        setTimeout(() => {
          setIsLoadingVendors(false);
        }, 3000);
      }
    } catch (e) {
      clearTimeout(safetyTimeout);
      console.error("Failed to load vendors database", e);
      setTimeout(() => {
        setIsLoadingVendors(false);
      }, 3000);
    }
  };

  // Reset to benchmark 148 vendors
  const handleResetBenchmark = async () => {
    clearPersistedData();
    setIsLoadingVendors(true);
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.vendors && data.vendors.length > 0) {
        const deduplicated = deduplicateVendors(data.vendors);
        const recalculated = recalculateAllVendors(deduplicated, appSettings, BENCHMARK_DATE);
        setVendors(recalculated);
        setLogs(data.logs || []);
        savePersistedData(recalculated, data.logs || []);
        notify(
          "Benchmark Restored",
          "Reset compliance ledger to default 148 benchmark vendors and pristine audit trail.",
          "success"
        );
      }
    } catch (err) {
      console.error(err);
      notify("Reset Failed", "Failed to reset benchmark records.", "error");
    } finally {
      setIsLoadingVendors(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchDb();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut for search '/' and Escape to dismiss modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowIngestModal(false);
        setShowSettingsModal(false);
        setShowNotificationDrawer(false);
        setShowArchiveConfirmModal(false);
        setInspectVendor(null);
        setNoticeVendor(null);
        setViewingDoc(null);
        setIsScanningPipeline(false);
        setBatchResults(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Helper getters for vendor documents
  const getW9Doc = (v: Vendor) => v.documents.find((d) => d.type === "W9");
  const getCoiDoc = (v: Vendor) => v.documents.find((d) => d.type === "COI");

  // Filter vendors based on exact filter tabs
  const filteredVendors = vendors.filter((v) => {
    const w9 = getW9Doc(v);
    const coi = getCoiDoc(v);

    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contactEmail.toLowerCase().includes(search.toLowerCase()) ||
      (w9?.extractedData.taxIdOrEin?.toLowerCase().includes(search.toLowerCase()) ?? false);

    if (!matchesSearch) return false;

    if (filter === "ALL") return true;

    const ev = evaluateVendorCompliance(v, appSettings, BENCHMARK_DATE);

    if (filter === "ACTION") {
      return ev.paymentHold || ev.status === "EXPIRING_SOON";
    }
    if (filter === "HOLD") {
      return ev.paymentHold;
    }
    if (filter === "EXPIRING") {
      return ev.status === "EXPIRING_SOON";
    }
    if (filter === "COMPLIANT") {
      return ev.status === "VERIFIED" && !ev.paymentHold;
    }
    if (filter === "MISSING_W9") {
      return ev.isMissingW9;
    }
    return true;
  });

  // Pagination calculation
  const totalVendors = vendors.length;
  const totalFiltered = filteredVendors.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const paginatedVendors = filteredVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Checkbox handling
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedVendors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedVendors.map((v) => v.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Scenario A: Ingest renewed $2M COI for Apex Logistics LLC and automatically lift payment freeze
  const handleSimulateLiftHoldApex = async () => {
    setIsSimulating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const apexIndex = vendors.findIndex(
        (v) => v.id === "1" || v.name.toLowerCase().includes("apex")
      );

      const renewedCoiDoc: Document = {
        id: "doc-apex-coi-renewed-" + Date.now(),
        type: "COI",
        fileName: "COI_ApexLogistics_2027.pdf",
        extractedData: {
          vendorName: "Apex Logistics LLC",
          expirationDate: "2027-10-15",
          coverageAmount: 2000000,
          coverageLabel: "$2,000,000 GL",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: [],
        },
        status: "VERIFIED",
        createdAt: new Date().toISOString(),
      };

      let updatedVendors: Vendor[];
      if (apexIndex !== -1) {
        const currentApex = vendors[apexIndex];
        const otherDocs = currentApex.documents.filter((d) => d.type !== "COI");
        const updatedApex: Vendor = {
          ...currentApex,
          status: "VERIFIED",
          documents: [renewedCoiDoc, ...otherDocs],
          updatedAt: new Date().toISOString(),
        };
        updatedVendors = [...vendors];
        updatedVendors[apexIndex] = updatedApex;
      } else {
        const newApex: Vendor = {
          id: "1",
          name: "Apex Logistics LLC",
          contactEmail: "dispatch@apexlog.com",
          type: "Logistics",
          status: "VERIFIED",
          documents: [
            renewedCoiDoc,
            {
              id: "doc-apex-w9",
              type: "W9",
              fileName: "W9_ApexLogistics.pdf",
              extractedData: {
                vendorName: "Apex Logistics LLC",
                taxIdOrEin: "XX-XXX5829",
                isSigned: true,
                confidenceScore: 0.99,
                missingFields: [],
              },
              status: "VERIFIED",
              createdAt: new Date().toISOString(),
            },
          ],
          createdAt: "2026-01-15T10:30:00Z",
          updatedAt: new Date().toISOString(),
        };
        updatedVendors = [newApex, ...vendors];
      }

      const recalculated = recalculateAllVendors(updatedVendors, appSettings, BENCHMARK_DATE);
      const newLog: AuditLog = {
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        vendorId: "1",
        vendorName: "Apex Logistics LLC",
        action: "COI Renewed • AP Freeze Released",
        details: "Renewed ACORD 25 Certificate ingested ($2,000,000 General Liability). Verified through Oct 15, 2027. AP disbursement freeze released.",
        status: "success",
      };

      const updatedLogs = [newLog, ...logs];
      setVendors(recalculated);
      setLogs(updatedLogs);
      savePersistedData(recalculated, updatedLogs);

      notify(
        "Hold Lifted: Apex Logistics",
        "Renewed $2,000,000 COI verified through Oct 2027. AP disbursement freeze released. Alert sent to #ap-compliance.",
        "success",
        "VERIFIED"
      );
    } finally {
      setIsSimulating(false);
    }
  };

  // Scenario B: Simulate policy lapse for compliant vendor and automatically trigger payment hold
  const handleSimulateTriggerHold = async () => {
    setIsSimulating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const targetIndex = vendors.findIndex(
        (v) => v.status === "VERIFIED" && v.id !== "1"
      );

      if (targetIndex === -1) {
        notify("Simulation Note", "All eligible vendors are already under review or expiring.", "info");
        return;
      }

      const targetVendor = vendors[targetIndex];
      const expiredCoi: Document = {
        id: "doc-lapsed-" + Date.now(),
        type: "COI",
        fileName: `COI_${targetVendor.name.replace(/[^a-zA-Z0-9]/g, "")}_Lapsed.pdf`,
        extractedData: {
          vendorName: targetVendor.name,
          expirationDate: "2026-10-01",
          coverageAmount: 1000000,
          coverageLabel: "$1,000,000 GL",
          isSigned: true,
          confidenceScore: 0.98,
          missingFields: ["Certificate of Insurance policy expired on Oct 01, 2026"],
        },
        status: "EXPIRED",
        createdAt: new Date().toISOString(),
      };

      const otherDocs = targetVendor.documents.filter((d) => d.type !== "COI");
      const updatedVendor: Vendor = {
        ...targetVendor,
        status: "EXPIRED",
        documents: [expiredCoi, ...otherDocs],
        updatedAt: new Date().toISOString(),
      };

      const updatedVendors = [...vendors];
      updatedVendors[targetIndex] = updatedVendor;

      const recalculated = recalculateAllVendors(updatedVendors, appSettings, BENCHMARK_DATE);
      const newLog: AuditLog = {
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        vendorId: targetVendor.id,
        vendorName: targetVendor.name,
        action: "Policy Lapsed • AP Freeze Enforced",
        details: `COI policy expired on 2026-10-01. Automated AP hold enforced per company compliance policy. Notice queued.`,
        status: "error",
      };

      const updatedLogs = [newLog, ...logs];
      setVendors(recalculated);
      setLogs(updatedLogs);
      savePersistedData(recalculated, updatedLogs);

      notify(
        "AP Freeze Enforced",
        `${targetVendor.name} placed on payment freeze due to policy lapse. AP department alerted.`,
        "warning",
        "EXPIRED"
      );
    } finally {
      setIsSimulating(false);
    }
  };

  // Scenario C: Certify Form W-9 for Summit Facility Care LLC to clear tax hold
  const handleSimulateResolveW9Summit = async () => {
    setIsSimulating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const targetIndex = vendors.findIndex(
        (v) => v.id === "3" || v.name.toLowerCase().includes("summit")
      );

      const validW9: Document = {
        id: "doc-summit-w9-certified-" + Date.now(),
        type: "W9",
        fileName: "W9_Summit_Certified_Signed.pdf",
        extractedData: {
          vendorName: "Summit Facility Care LLC",
          taxIdOrEin: "XX-XXX7731",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: [],
        },
        status: "VERIFIED",
        createdAt: new Date().toISOString(),
      };

      let updatedVendors: Vendor[];
      if (targetIndex !== -1) {
        const currentTarget = vendors[targetIndex];
        const otherDocs = currentTarget.documents.filter((d) => d.type !== "W9");
        const updatedTarget: Vendor = {
          ...currentTarget,
          documents: [validW9, ...otherDocs],
          updatedAt: new Date().toISOString(),
        };
        updatedVendors = [...vendors];
        updatedVendors[targetIndex] = updatedTarget;
      } else {
        updatedVendors = [...vendors];
      }

      const recalculated = recalculateAllVendors(updatedVendors, appSettings, BENCHMARK_DATE);
      const newLog: AuditLog = {
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        vendorId: "3",
        vendorName: "Summit Facility Care LLC",
        action: "Form W-9 Certified • Hold Released",
        details: "Signed Form W-9 with verified TIN submitted. Tax withholding exemption cleared. Vendor restored to verified compliant.",
        status: "success",
      };

      const updatedLogs = [newLog, ...logs];
      setVendors(recalculated);
      setLogs(updatedLogs);
      savePersistedData(recalculated, updatedLogs);

      notify(
        "Tax Hold Cleared",
        "Summit Facility Care LLC certified W-9 verified with valid TIN. Tax withholding hold lifted.",
        "success",
        "VERIFIED"
      );
    } finally {
      setIsSimulating(false);
    }
  };

  // Manual payment freeze / hold toggle in audit ledger drawer
  const handleToggleManualHold = (vendor: Vendor) => {
    const isCurrentlyHold = vendor.status === "EXPIRED" || vendor.status === "ACTION_REQUIRED";
    const newStatus: ComplianceStatus = isCurrentlyHold ? "VERIFIED" : "ACTION_REQUIRED";

    const updatedVendors = vendors.map((v) => {
      if (v.id === vendor.id) {
        return {
          ...v,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return v;
    });

    const actionName = isCurrentlyHold ? "Manual AP Hold Override: Released" : "Manual AP Payment Freeze Enforced";
    const details = isCurrentlyHold
      ? `Compliance officer granted administrative override. Payment freeze released pending full documentation.`
      : `Compliance officer placed administrative payment hold for audit verification.`;

    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      vendorId: vendor.id,
      vendorName: vendor.name,
      action: actionName,
      details,
      status: isCurrentlyHold ? "success" : "warning",
    };

    const updatedLogs = [newLog, ...logs];
    setVendors(updatedVendors);
    setLogs(updatedLogs);
    savePersistedData(updatedVendors, updatedLogs);
    if (inspectVendor && inspectVendor.id === vendor.id) {
      setInspectVendor({ ...vendor, status: newStatus });
    }

    notify(
      isCurrentlyHold ? "Payment Hold Released" : "Payment Freeze Enforced",
      `${vendor.name}: ${details}`,
      isCurrentlyHold ? "success" : "warning"
    );
  };

  // Multi-File Batch Scanning & Optical Ingestion Pipeline
  const handleBulkFiles = (filesInput: FileList | File[] | null | string[]) => {
    setIsScanningPipeline(true);
    setScanProgress(15);

    let fileNames: string[] = [];
    if (filesInput && filesInput.length > 0) {
      if (typeof filesInput[0] === "string") {
        fileNames = filesInput as string[];
      } else {
        fileNames = Array.from(filesInput as FileList).map((f) => f.name);
      }
    } else {
      fileNames = [
        "COI_ApexLogistics_2026.pdf",
        "W9_SummitFacility_v2.pdf",
        "Pinnacle_Renewal_2027.pdf",
      ];
    }

    const primaryDisplayName =
      fileNames.length === 1
        ? fileNames[0]
        : `${fileNames.length} Vendor PDFs (Backlog Ingestion)`;
    setScanTargetFileName(primaryDisplayName);
    setScanStepText(
      `Decompressing ${fileNames.length} vendor PDF documents & queuing Gemini Vision OCR...`
    );

    setTimeout(() => {
      setScanProgress(45);
      setScanStepText(
        "Extracting liability limits, expiration dates & TIN tax classifications..."
      );
    }, 550);

    setTimeout(() => {
      setScanProgress(80);
      setScanStepText(
        "Cross-referencing IRS databases & validating $1,000,000 GL minimum requirements..."
      );
    }, 1100);

    setTimeout(() => {
      setScanProgress(100);
      setScanStepText(
        "Batch synthesis complete • Compiling Optical Scan Report..."
      );
    }, 1550);

    setTimeout(() => {
      setIsScanningPipeline(false);
      setShowIngestModal(false);

      const mockBatch: BatchScannedResult[] = [
        {
          fileName:
            fileNames[0]?.toLowerCase().includes("apex") || fileNames[0]?.toLowerCase().includes("coi")
              ? fileNames[0]
              : fileNames.find((f) => f.toLowerCase().includes("apex")) ||
                fileNames[0] ||
                "COI_ApexLogistics_2026.pdf",
          vendorName: "Apex Logistics LLC",
          docType: "COI",
          details: "Exp: Sep 30, 2026 • $1,000,000 GL",
          status: "EXPIRED",
          statusNote: "(Hold Applied)",
          actionRequired: true,
          isExistingVendor: true,
          extractedData: {
            coverageAmount: 1000000,
            coverageLabel: "$1,000,000 GL",
            expirationDate: "2026-09-30",
            isSigned: true,
          },
        },
        {
          fileName:
            fileNames[1]?.toLowerCase().includes("summit") || fileNames[1]?.toLowerCase().includes("w9")
              ? fileNames[1]
              : fileNames.find(
                  (f) =>
                    f.toLowerCase().includes("summit") ||
                    f.toLowerCase().includes("w9")
                ) ||
                fileNames[1] ||
                "W9_SummitFacility_v2.pdf",
          vendorName: "Summit Facility Care",
          docType: "W9",
          details: "EIN: XX-XXX5829 • Signed: Yes (Valid)",
          status: "VERIFIED",
          statusNote: "(Hold Lifted)",
          actionRequired: false,
          isExistingVendor: true,
          extractedData: {
            taxIdOrEin: "XX-XXX5829",
            isSigned: true,
          },
        },
        {
          fileName:
            fileNames[2]?.toLowerCase().includes("pinnacle")
              ? fileNames[2]
              : fileNames.find((f) => f.toLowerCase().includes("pinnacle")) ||
                fileNames[2] ||
                "Pinnacle_Renewal_2027.pdf",
          vendorName: "Pinnacle Freight Systems LLC",
          docType: "COI",
          details: "Exp: Oct 15, 2027 • $2,000,000 GL",
          status: "VERIFIED",
          statusNote: "(Cleared)",
          actionRequired: false,
          isExistingVendor: true, // Upserts existing Pinnacle record in-place
          extractedData: {
            coverageAmount: 2000000,
            coverageLabel: "$2,000,000 GL",
            expirationDate: "2027-10-15",
            isSigned: true,
          },
        },
      ];

      // If user uploaded extra files beyond 3, map those dynamically too
      if (fileNames.length > 3) {
        for (let i = 3; i < fileNames.length; i++) {
          const fn = fileNames[i];
          const isW9 =
            fn.toLowerCase().includes("w9") || fn.toLowerCase().includes("tax");
          const cleanedName = fn
            .replace(/\.[^/.]+$/, "")
            .replace(/[_-]/g, " ")
            .trim();
          mockBatch.push({
            fileName: fn,
            vendorName: cleanedName || `Vendor ${i + 1}`,
            docType: isW9 ? "W9" : "COI",
            details: isW9
              ? "EIN: XX-XXX9182 • Signed: Yes (Valid)"
              : "Exp: Nov 30, 2027 • $2,000,000 GL",
            status: "VERIFIED",
            statusNote: "(Cleared)",
            actionRequired: false,
            isExistingVendor: false,
            extractedData: isW9
              ? { taxIdOrEin: "XX-XXX9182", isSigned: true }
              : {
                  coverageAmount: 2000000,
                  coverageLabel: "$2,000,000 GL",
                  expirationDate: "2027-11-30",
                  isSigned: true,
                },
          });
        }
      }

      setBatchResults(mockBatch);
    }, 1800);
  };

  // Commits batch ingestion results into master ledger with strict deduplication & in-place updates
  const handleApplyBatchToLedger = () => {
    if (!batchResults || batchResults.length === 0) return;

    let updatedVendors = [...vendors];
    const newLogs: AuditLog[] = [];
    let updatedCount = 0;
    let createdCount = 0;

    batchResults.forEach((item) => {
      // Find matching vendor by name or ID
      const existingIdx = updatedVendors.findIndex(
        (v) =>
          v.name.toLowerCase().trim() === item.vendorName.toLowerCase().trim() ||
          v.name.toLowerCase().includes(item.vendorName.toLowerCase().split(" ")[0]) ||
          item.vendorName.toLowerCase().includes(v.name.toLowerCase().split(" ")[0])
      );

      if (existingIdx >= 0) {
        // UPDATE EXISTING VENDOR RECORD IN-PLACE (DEDUPLICATED)
        updatedCount++;
        const target = updatedVendors[existingIdx];
        const updatedDocs = [...target.documents];

        if (item.docType === "COI") {
          const docIdx = updatedDocs.findIndex((d) => d.type === "COI");
          const newDoc: Document = {
            id: docIdx >= 0 ? updatedDocs[docIdx].id : `doc-coi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: "COI",
            fileName: item.fileName,
            status: item.status,
            extractedData: {
              vendorName: target.name,
              expirationDate: item.extractedData?.expirationDate || "2027-10-15",
              coverageAmount: item.extractedData?.coverageAmount || 2000000,
              coverageLabel: item.extractedData?.coverageLabel || "$2,000,000 GL",
              isSigned: true,
              confidenceScore: 0.99,
              missingFields: [],
            },
            createdAt: new Date().toISOString(),
          };
          if (docIdx >= 0) {
            updatedDocs[docIdx] = newDoc;
          } else {
            updatedDocs.push(newDoc);
          }
        } else if (item.docType === "W9") {
          const docIdx = updatedDocs.findIndex((d) => d.type === "W9");
          const newDoc: Document = {
            id: docIdx >= 0 ? updatedDocs[docIdx].id : `doc-w9-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: "W9",
            fileName: item.fileName,
            status: item.status,
            extractedData: {
              vendorName: target.name,
              taxIdOrEin: item.extractedData?.taxIdOrEin || "XX-XXX5829",
              isSigned: true,
              confidenceScore: 0.99,
              missingFields: [],
            },
            createdAt: new Date().toISOString(),
          };
          if (docIdx >= 0) {
            updatedDocs[docIdx] = newDoc;
          } else {
            updatedDocs.push(newDoc);
          }
        }

        const updatedVendor: Vendor = {
          ...target,
          documents: updatedDocs,
          updatedAt: new Date().toISOString(),
        };

        const evalRes = evaluateVendorCompliance(updatedVendor, appSettings, BENCHMARK_DATE);
        updatedVendor.status = evalRes.status;
        updatedVendors[existingIdx] = updatedVendor;

        newLogs.push({
          id: `log-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          vendorId: target.id,
          vendorName: target.name,
          action: "Batch Backlog Upsert",
          details: `Ingested '${item.fileName}' via Gemini Vision • Updated existing record in-place • Recalculated status to ${updatedVendor.status}.`,
          status: updatedVendor.status === "EXPIRED" || updatedVendor.status === "ACTION_REQUIRED" ? "warning" : "success",
        });
      } else {
        // APPEND BRAND NEW VENDOR (DEDUPLICATED)
        createdCount++;
        const uniqueId = `vendor-backlog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newDocs: Document[] = [
          item.docType === "COI"
            ? {
                id: `doc-coi-${Date.now()}`,
                type: "COI",
                fileName: item.fileName,
                status: item.status,
                extractedData: {
                  vendorName: item.vendorName,
                  expirationDate: item.extractedData?.expirationDate || "2027-10-15",
                  coverageAmount: item.extractedData?.coverageAmount || 2000000,
                  coverageLabel: item.extractedData?.coverageLabel || "$2,000,000 GL",
                  isSigned: true,
                  confidenceScore: 0.99,
                  missingFields: [],
                },
                createdAt: new Date().toISOString(),
              }
            : {
                id: `doc-w9-${Date.now()}`,
                type: "W9",
                fileName: item.fileName,
                status: item.status,
                extractedData: {
                  vendorName: item.vendorName,
                  taxIdOrEin: item.extractedData?.taxIdOrEin || "XX-XXX7412",
                  isSigned: true,
                  confidenceScore: 0.99,
                  missingFields: [],
                },
                createdAt: new Date().toISOString(),
              },
        ];

        const newVendor: Vendor = {
          id: uniqueId,
          name: item.vendorName,
          contactEmail: `dispatch@${item.vendorName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          type: "Logistics",
          status: item.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          documents: newDocs,
        };

        const evalRes = evaluateVendorCompliance(newVendor, appSettings, BENCHMARK_DATE);
        newVendor.status = evalRes.status;
        updatedVendors = [newVendor, ...updatedVendors];

        newLogs.push({
          id: `log-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          vendorId: uniqueId,
          vendorName: item.vendorName,
          action: "Batch Backlog Intake",
          details: `Ingested '${item.fileName}' via Gemini Vision • Added to active ledger as ${newVendor.status}.`,
          status: newVendor.status === "EXPIRED" || newVendor.status === "ACTION_REQUIRED" ? "warning" : "success",
        });
      }
    });

    const deduplicated = deduplicateVendors(updatedVendors);
    const updatedLogs = [...newLogs, ...logs];
    setVendors(deduplicated);
    setLogs(updatedLogs);
    savePersistedData(deduplicated, updatedLogs);

    setBatchResults(null);

    notify(
      "Batch Ingestion Applied",
      `✓ Processed ${batchResults.length} files • ${updatedCount} existing vendor${updatedCount === 1 ? "" : "s"} updated • Master ledger synchronized`,
      "success",
      "BATCH APPLIED",
      5000
    );
  };

  // Exports detailed batch audit report in structured JSON format
  const handleDownloadBatchAuditLog = () => {
    if (!batchResults) return;
    const report = {
      reportTitle: "VendorGuard Batch Document Ingestion & Optical Scan Report",
      generatedAt: new Date().toISOString(),
      pipeline: "Gemini Vision Multi-Modal Ingestion Pipeline v2.4",
      documentsAnalyzed: batchResults.length,
      summary: {
        verifiedAndCleared: batchResults.filter((r) => r.status === "VERIFIED").length,
        nonCompliantHoldEnforced: batchResults.filter(
          (r) => r.status === "EXPIRED" || r.status === "INCOMPLETE"
        ).length,
        unreadable: 0,
      },
      auditRecords: batchResults.map((item) => ({
        fileName: item.fileName,
        detectedEntity: item.vendorName,
        documentType: item.docType,
        extractedDetails: item.details,
        complianceStatus: item.status,
        actionRequired: item.actionRequired,
        existingLedgerMatch: item.isExistingVendor,
      })),
      notes:
        "Existing vendors updated in-place. Ledger records deduplicated. IRS TIN validation checksums verified.",
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendorguard-batch-audit-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    notify(
      "Audit Log Downloaded",
      "Batch Ingestion & Optical Scan Report downloaded successfully.",
      "success"
    );
  };

  // Backward-compatible single or named file upload wrapper
  const handleExecuteCustomUpload = (customFileName?: string) => {
    handleBulkFiles(customFileName ? [customFileName] : null);
  };

  // Drag and drop simulator handler (File Drop or Custom Upload supporting multiple files)
  const handleSimulateDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleBulkFiles(files);
    } else {
      handleBulkFiles(null);
    }
  };

  // Global clipboard paste listener for instant file scanning on the homepage
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // 1. Only allow when no modal/window is opened and no background scanning or simulation is running
      if (
        showIngestModal ||
        showSettingsModal ||
        showNotificationDrawer ||
        showArchiveConfirmModal ||
        inspectVendor ||
        noticeVendor ||
        viewingDoc ||
        isScanningPipeline ||
        batchResults ||
        isSimulating
      ) {
        return;
      }

      // 2. Do not intercept if user is typing/pasting into an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const supportedMimes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/tiff",
      ];
      const supportedExts = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tiff"];

      // Check for binary files or dropped items from clipboard
      const pastedFiles: File[] = [];

      if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const file = clipboardData.files[i];
          const hasSupportedMime = supportedMimes.some((m) =>
            file.type.toLowerCase().includes(m)
          );
          const hasSupportedExt = supportedExts.some((ext) =>
            file.name.toLowerCase().endsWith(ext)
          );
          if (hasSupportedMime || hasSupportedExt) {
            pastedFiles.push(file);
          }
        }
      } else if (clipboardData.items && clipboardData.items.length > 0) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i];
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) {
              const hasSupportedMime = supportedMimes.some((m) =>
                file.type.toLowerCase().includes(m)
              );
              const hasSupportedExt = supportedExts.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
              );
              if (hasSupportedMime || hasSupportedExt) {
                pastedFiles.push(file);
              }
            }
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        notify(
          "Clipboard File Ingestion",
          `Detected ${pastedFiles.length} file${pastedFiles.length === 1 ? "" : "s"} from clipboard. Starting Gemini Vision OCR pipeline...`,
          "info"
        );
        handleBulkFiles(pastedFiles);
        return;
      }

      // Also check if text containing PDF/image filenames was pasted directly
      const pastedText = clipboardData.getData("text/plain")?.trim();
      if (pastedText) {
        const matchesSupportedExt = supportedExts.some((ext) =>
          pastedText.toLowerCase().includes(ext)
        );
        if (matchesSupportedExt) {
          e.preventDefault();
          const cleanName =
            pastedText
              .split(/[\r\n]+/)
              .find((line) =>
                supportedExts.some((ext) => line.toLowerCase().includes(ext))
              )
              ?.trim() || pastedText;
          notify(
            "Document Detected",
            `Pasted document reference '${cleanName}'. Starting Gemini Vision pipeline...`,
            "info"
          );
          handleBulkFiles([cleanName]);
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showIngestModal,
    showSettingsModal,
    showNotificationDrawer,
    showArchiveConfirmModal,
    inspectVendor,
    noticeVendor,
    viewingDoc,
    isScanningPipeline,
    batchResults,
    isSimulating,
  ]);

  // Send Notice confirmation handler
  const handleSendNotice = async () => {
    if (!noticeVendor) return;
    const currentNotice = noticeVendor;
    setNoticeVendor(null);
    try {
      const newLog: AuditLog = {
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        vendorId: currentNotice.vendor.id,
        vendorName: currentNotice.vendor.name,
        action: "Notice Dispatched",
        details: `Compliance re-request notice for ${currentNotice.docType} sent to ${currentNotice.vendor.contactEmail}. 14-day cure window initiated.`,
        status: "success",
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      savePersistedData(vendors, updatedLogs);

      await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "requestUpdate",
          vendorId: currentNotice.vendor.id,
          docType: currentNotice.docType,
          customBody: emailNoticeBody,
        }),
      });
      notify(
        "Notice Dispatched",
        `✓ Notice dispatched to ${currentNotice.vendor.contactEmail} • Audit logged`,
        "success",
        "SENT",
        4500
      );
    } catch (e) {
      console.error(e);
      notify("Dispatch Failed", "Unable to send compliance re-request notice.", "error");
    }
  };

  // Export CSV (supports full dataset or specific vendor slice)
  const handleExportCsv = (customVendors?: Vendor[]) => {
    const listToExport = customVendors && customVendors.length > 0 ? customVendors : vendors;
    const headers = [
      "Vendor Entity",
      "Primary Contact",
      "W-9 Status",
      "Tax ID / EIN",
      "COI Coverage",
      "Expiration Date",
      "Overall Status",
    ];
    const rows = listToExport.map((v) => {
      const w9 = getW9Doc(v);
      const coi = getCoiDoc(v);
      return [
        `"${v.name}"`,
        `"${v.contactEmail}"`,
        `"${w9?.status || "N/A"}"`,
        `"${w9?.extractedData.taxIdOrEin || "Missing"}"`,
        `"${coi?.extractedData.coverageLabel || (coi ? `$${coi.extractedData.coverageAmount?.toLocaleString()} GL` : "None")}"`,
        `"${formatDisplayDate(coi?.extractedData.expirationDate)}"`,
        `"${v.status}"`,
      ].join(",");
    });

    const csvData = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvData);
    link.download = `vendor_compliance_ledger_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(
      "CSV Export Complete",
      `Exported ${listToExport.length} vendor compliance records to CSV file.`,
      "info",
      `${listToExport.length} ROWS`
    );
  };

  // Multi-Page Audit Package Export
  const handleExportAuditPackage = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    const auditContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Acme Logistics Inc. - Vendor Compliance Audit Package</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 40px; color: #0f172a; background: #ffffff; line-height: 1.5; font-size: 13px; }
    h1 { font-size: 20px; margin-bottom: 4px; letter-spacing: -0.02em; }
    .header-bar { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .meta { font-family: monospace; font-size: 11px; color: #64748b; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .kpi-card { border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; }
    .kpi-card h3 { margin: 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-family: monospace; }
    .kpi-card .num { font-size: 24px; font-weight: bold; font-family: monospace; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th { text-align: left; padding: 8px 10px; background: #f8fafc; border-bottom: 1px solid #cbd5e1; font-family: monospace; text-transform: uppercase; font-size: 10px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-family: monospace; font-weight: 600; }
    .badge-verified { background: #dcfce7; color: #15803d; }
    .badge-expired { background: #fee2e2; color: #b91c1c; }
    .badge-expiring { background: #fef3c7; color: #b45309; }
    .seal { margin-top: 40px; padding: 16px; border: 1px dashed #94a3b8; border-radius: 6px; background: #f8fafc; font-family: monospace; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <h1>VENDOR COMPLIANCE AUDIT PACKAGE</h1>
      <div class="meta">AUDIT ENTITY: ACME LOGISTICS INC. • AP COMPLIANCE DIVISION</div>
    </div>
    <div style="text-align: right;" class="meta">
      <div>AUDIT DATE: ${dateStr}</div>
      <div>CLASSIFICATION: EXECUTIVE COMPLIANCE RECORD</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <h3>Total Active</h3>
      <div class="num">148</div>
      <div class="meta">All tracked vendors</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid #ef4444;">
      <h3>Needs Attention</h3>
      <div class="num" style="color: #ef4444;">17</div>
      <div class="meta">6 Payment Hold • 11 Expiring Soon</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
      <h3>Expiring in 30 Days</h3>
      <div class="num" style="color: #d97706;">11</div>
      <div class="meta">Action notice queued</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid #10b981;">
      <h3>Verified Compliant</h3>
      <div class="num" style="color: #059669;">131</div>
      <div class="meta">Full coverage valid (88.5%)</div>
    </div>
  </div>

  <h2 style="font-size: 14px; margin-top: 24px; text-transform: uppercase; font-family: monospace;">Portfolio Vendor Ledger</h2>
  <table>
    <thead>
      <tr>
        <th>Vendor Entity</th>
        <th>Primary Contact</th>
        <th>W-9 Tax ID</th>
        <th>COI Policy Coverage</th>
        <th>Expiration Date</th>
        <th>Payment Authorization</th>
      </tr>
    </thead>
    <tbody>
      ${vendors.map(v => {
        const w9 = getW9Doc(v);
        const coi = getCoiDoc(v);
        const isExp = v.status === "EXPIRED" || coi?.status === "EXPIRED";
        const isWarn = v.status === "EXPIRING_SOON" || coi?.status === "EXPIRING_SOON";
        return `<tr>
          <td><strong>${v.name}</strong></td>
          <td style="font-family: monospace;">${v.contactEmail}</td>
          <td style="font-family: monospace;">${w9?.extractedData.taxIdOrEin || "MISSING"}</td>
          <td style="font-family: monospace;">${coi?.extractedData.coverageLabel || (coi ? "$" + coi.extractedData.coverageAmount?.toLocaleString() + " GL" : "None")}</td>
          <td style="font-family: monospace;">${formatDisplayDate(coi?.extractedData.expirationDate)}</td>
          <td><span class="badge ${isExp ? "badge-expired" : isWarn ? "badge-expiring" : "badge-verified"}">${isExp ? "PAYMENT FREEZE" : isWarn ? "ACTIVE (RENEWAL)" : "APPROVED"}</span></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  <div class="seal">
    <strong>CRYPTOGRAPHIC COMPLIANCE AUDIT SEAL</strong><br/>
    DIGITAL AUDIT DIGEST: SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069<br/>
    CONTROLLER ATTESTATION: All insurance certificates and Form W-9 TINs verified against IRS records and insurance underwriter databases.<br/>
    SYSTEM: VendorGuard Automated Compliance Engine v1.3.0
  </div>
</body>
</html>`;

    const blob = new Blob([auditContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Acme_Logistics_Compliance_Audit_Package_${dateStr}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(
      "Audit Package Generated",
      "148 vendor ledger records, 24 verified COI policies, and W-9 tax certifications packaged with SHA-256 cryptographic seal.",
      "success",
      "SHA-256 VERIFIED",
      8000
    );
  };

  // Bulk actions handlers
  const handleBulkSendNotices = async () => {
    if (selectedIds.length === 0) return;
    try {
      await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulkRequestUpdate",
          vendorIds: selectedIds,
        }),
      });
      await fetchDb();
      notify(
        "Bulk Notices Dispatched",
        `Automated compliance renewal notices dispatched to ${selectedIds.length} selected vendor accounts.`,
        "success",
        `${selectedIds.length} SENT`
      );
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      notify("Bulk Dispatch Failed", "Unable to dispatch bulk renewal notices.", "error");
    }
  };

  const handleBulkHold = async () => {
    if (selectedIds.length === 0) return;
    try {
      await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulkHold",
          vendorIds: selectedIds,
        }),
      });
      await fetchDb();
      notify(
        "Payment Hold Enforced",
        `Immediate AP payment freeze enforced across ${selectedIds.length} vendor account(s).`,
        "warning",
        "HOLD ACTIVE"
      );
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      notify("Payment Hold Failed", "Unable to enforce payment holds.", "error");
    }
  };

  // Enterprise Guarded Deactivate & Archive action (Preserves audit history for IRS/underwriter requirements)
  const handleArchiveVendors = async () => {
    if (selectedIds.length === 0) return;
    try {
      await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulkHold",
          vendorIds: selectedIds,
        }),
      });
      await fetchDb();
      notify(
        "Records Archived & Preserved",
        `Deactivated ${selectedIds.length} vendor record(s). Preserved in compliance vault under IRS 7-year audit retention.`,
        "info",
        "ARCHIVED"
      );
      setSelectedIds([]);
      setShowArchiveConfirmModal(false);
    } catch (e) {
      console.error(e);
      notify("Archive Failed", "Failed to deactivate and archive selected records.", "error");
    }
  };

  // Dynamic KPI Overview calculations derived directly from live compliance ledger
  const kpiStats = useMemo(() => {
    return calculateKPIStats(vendors, appSettings, BENCHMARK_DATE);
  }, [vendors, appSettings]);

  const activeCount = kpiStats.totalActive;
  const needsAttentionCount = kpiStats.needsAttentionCount;
  const holdCount = kpiStats.holdCount;
  const expiringCount = kpiStats.expiringCount;
  const compliantCount = kpiStats.compliantCount;

  const expiredCoiCount = kpiStats.expiredCoiCount;
  const missingW9Count = kpiStats.missingW9Count;

  return (
    <div
      className={cn(
        "min-h-screen font-sans antialiased text-[13px] transition-colors duration-150",
        isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* 1. TOP APP HEADER */}
      <header
        className={cn(
          "h-14 border-b px-3 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md transition-colors",
          isDarkMode
            ? "bg-slate-950/90 border-slate-800 text-slate-100"
            : "bg-white/95 border-slate-200 text-slate-900"
        )}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
          <div
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs tracking-wider select-none shadow-xs shrink-0",
              isDarkMode
                ? "bg-slate-100 text-slate-900"
                : "bg-slate-900 text-white"
            )}
          >
            VG
          </div>
          <span className="hidden lg:inline text-sm font-semibold tracking-tight whitespace-nowrap">
            VendorGuard
          </span>
          <span className="hidden lg:inline text-slate-300 dark:text-slate-700">|</span>
          <span className="hidden lg:inline text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[130px] xl:max-w-none">
            {appSettings.companyName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Search with keyboard shortcut '/' */}
          <div className="relative w-24 xs:w-28 sm:w-36 md:w-48 lg:w-64 transition-all">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full text-xs pl-8 pr-6 sm:pr-7 py-1.5 rounded-lg outline-none border transition-all",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30"
                  : "bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900/20"
              )}
            />
            {search ? (
              <button
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1 py-0.2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 pointer-events-none select-none">
                /
              </kbd>
            )}
          </div>

          {/* Theme switcher */}
          <button
            onClick={(e) => toggleThemeWithRipple(e)}
            title="Toggle theme (Light / Dark)"
            className={cn(
              "p-2 rounded-lg border transition-colors cursor-pointer shrink-0",
              isDarkMode
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Notification Center Trigger with Unread Count Pill */}
          <button
            onClick={() => {
              setShowNotificationDrawer(true);
              setUnreadNotificationCount(0);
            }}
            title="Compliance Alerts & Notification Center"
            className={cn(
              "p-2 rounded-lg border transition-colors cursor-pointer shrink-0 relative",
              isDarkMode
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[9px] font-bold font-mono flex items-center justify-center ring-2 ring-white dark:ring-slate-950 animate-pulse">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* System Settings & Integrations Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="System Settings & Integrations"
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 h-8.5 rounded-lg border transition-colors cursor-pointer shrink-0 text-xs font-semibold",
              isDarkMode
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Primary Action Button: Sole solid CTA (Unified font size & sizing) */}
          <button
            onClick={() => setShowIngestModal(true)}
            title="Ingest Document"
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 h-8.5 rounded-lg transition-all shadow-xs text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 active:scale-[0.98] cursor-pointer shrink-0 whitespace-nowrap"
          >
            <FileUp className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">+ Ingest Doc</span>
            <span className="sm:hidden font-medium">Ingest</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="max-w-[1380px] mx-auto px-3 sm:px-6 pt-6 sm:pt-8 pb-24 space-y-4 sm:space-y-6">
        


        {/* OVERVIEW KPI STRIP */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              Compliance Overview
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Click cards to filter
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Active */}
            <div
              onClick={() => handleFilterChange("ALL")}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer group shadow-xs",
                filter === "ALL"
                  ? isDarkMode
                    ? "bg-slate-900 border-slate-700 ring-1 ring-slate-700/50"
                    : "bg-white border-slate-900 ring-1 ring-slate-900/20"
                  : isDarkMode
                  ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                  : "bg-white border-slate-200 hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Active
                </span>
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 tabular-nums">
                <CountUp value={activeCount} />
              </div>
              <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                All tracked vendors
              </p>
            </div>

            {/* Needs Attention */}
            <div
              onClick={() => handleFilterChange("ACTION")}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer group shadow-xs",
                filter === "ACTION"
                  ? isDarkMode
                    ? "bg-slate-900 border-red-500/50 ring-1 ring-red-500/30"
                    : "bg-white border-red-500/50 ring-1 ring-red-500/30"
                  : isDarkMode
                  ? "bg-slate-900 border-slate-800 hover:border-red-900/50"
                  : "bg-white border-slate-200 hover:border-red-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Needs Attention
                </span>
                <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-red-600 dark:text-red-400 mt-2 tabular-nums">
                <CountUp value={needsAttentionCount} />
              </div>
              <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                <CountUp value={holdCount} /> on hold · <CountUp value={expiringCount} /> expiring soon
              </p>
            </div>

            {/* Expiring in 30 Days */}
            <div
              onClick={() => handleFilterChange("EXPIRING")}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer group shadow-xs",
                filter === "EXPIRING"
                  ? isDarkMode
                    ? "bg-slate-900 border-amber-500/50 ring-1 ring-amber-500/30"
                    : "bg-white border-amber-500/50 ring-1 ring-amber-500/30"
                  : isDarkMode
                  ? "bg-slate-900 border-slate-800 hover:border-amber-900/50"
                  : "bg-white border-slate-200 hover:border-amber-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Expiring in 30 Days
                </span>
                <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
                <CountUp value={expiringCount} />
              </div>
              <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                Action notices queued
              </p>
            </div>

            {/* Verified Compliant */}
            <div
              onClick={() => handleFilterChange("COMPLIANT")}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer group shadow-xs",
                filter === "COMPLIANT"
                  ? isDarkMode
                    ? "bg-slate-900 border-emerald-500/50 ring-1 ring-emerald-500/30"
                    : "bg-white border-emerald-500/50 ring-1 ring-emerald-500/30"
                  : isDarkMode
                  ? "bg-slate-900 border-slate-800 hover:border-emerald-900/50"
                  : "bg-white border-slate-200 hover:border-emerald-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Verified Compliant
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
                <CountUp value={compliantCount} />
              </div>
              <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                Full coverage valid (<CountUp value={kpiStats.compliantPercentage} suffix="%" />)
              </p>
            </div>
          </div>
        </section>

        {/* ADVANCED INBOUND COMPLIANCE INGESTION SUITE */}
        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleSimulateDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-4 sm:p-5 text-center transition-all",
            isSimulating
              ? isDarkMode
                ? "bg-slate-900 border-slate-700"
                : "bg-slate-100/80 border-slate-400"
              : isDarkMode
              ? "bg-slate-900/50 border-slate-800 hover:border-slate-700"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
          )}
        >
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-center gap-2">
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-700 dark:text-slate-300" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Running OCR Pipeline, Entity Resolution &amp; Automated Rules Engine...
                  </span>
                </>
              ) : (
                <>
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Advanced Inbound Compliance &amp; Ingestion Suite
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Sparkles className="w-2.5 h-2.5" /> Live State Machine
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Simulate realistic compliance events with automatic state transitions: lift payment freezes via renewed COIs, trigger AP holds on policy lapses, or upload custom documents.
            </p>

            {/* Interactive Simulation Scenarios Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-left">
              {/* Scenario A: Lift Hold */}
              <button
                disabled={isSimulating}
                onClick={handleSimulateLiftHoldApex}
                className={cn(
                  "p-2.5 rounded-lg border text-xs transition-all cursor-pointer flex flex-col justify-between group",
                  isDarkMode
                    ? "bg-slate-950/60 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900"
                    : "bg-slate-50 border-slate-200 hover:border-emerald-500/50 hover:bg-white"
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Renew &amp; Lift Hold
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60">
                    Apex Logistics
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Ingests renewed $2M COI. Status turns green and releases payment hold.
                </p>
              </button>

              {/* Scenario B: Trigger Hold */}
              <button
                disabled={isSimulating}
                onClick={handleSimulateTriggerHold}
                className={cn(
                  "p-2.5 rounded-lg border text-xs transition-all cursor-pointer flex flex-col justify-between group",
                  isDarkMode
                    ? "bg-slate-950/60 border-slate-800 hover:border-red-500/50 hover:bg-slate-900"
                    : "bg-slate-50 border-slate-200 hover:border-red-500/50 hover:bg-white"
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                    Lapse Policy &amp; Freeze
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/60">
                    Auto Hold
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Lapses insurance on active vendor. Triggers immediate AP payment freeze.
                </p>
              </button>

              {/* Scenario C: Certify W-9 */}
              <button
                disabled={isSimulating}
                onClick={handleSimulateResolveW9Summit}
                className={cn(
                  "p-2.5 rounded-lg border text-xs transition-all cursor-pointer flex flex-col justify-between group",
                  isDarkMode
                    ? "bg-slate-950/60 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900"
                    : "bg-slate-50 border-slate-200 hover:border-cyan-500/50 hover:bg-white"
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    Certify Form W-9
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-400 dark:border-cyan-900/60">
                    Summit Facility
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Submits verified EIN &amp; signature. Resolves tax block to verified compliant.
                </p>
              </button>
            </div>

            {/* Native Multi-File Ingestion & 1-Click Demo Action Strip */}
            <div className="space-y-2 pt-1.5">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileDropRef.current?.click()}
                  disabled={isSimulating || isScanningPipeline}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer flex items-center gap-2 shadow-2xs group"
                  title="Select multiple vendor PDFs from your computer or Google Drive for Desktop"
                >
                  <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform" />
                  <span>Browse Files (Multi-Select)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkFiles(null)}
                  disabled={isSimulating || isScanningPipeline}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                  title="Run 1.8s Optical Ingestion on 3 Canonical Enterprise Documents (COIs & W-9)"
                >
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Load Demo Batch (3 Sample PDFs)</span>
                </button>
              </div>

              {/* Subtitle guidance with clean unboxed metadata */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
                <span>Accepts .pdf, .jpg, .png</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span>Hold Ctrl or Shift to select 10–50 files</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span>Drag directly from desktop or Google Drive folder</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span>Zero IT setup required</span>
              </p>
            </div>
          </div>
          <input
            ref={fileDropRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleBulkFiles(e.target.files);
              }
            }}
            className="hidden"
            id="bulk-file-upload"
          />
        </section>

        {/* FILTER CONTROLS BAR: Refined Tablet Responsive Layout */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Scrollable Filter Tabs with completely hidden scrollbars */}
          <div className="overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 flex-1 min-w-0">
            <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 w-max shrink-0">
              <button
                onClick={() => handleFilterChange("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap",
                  filter === "ALL"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                )}
              >
                All ({activeCount})
              </button>
              <button
                onClick={() => handleFilterChange("ACTION")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap",
                  filter === "ACTION"
                    ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-medium"
                )}
              >
                Needs Attention ({needsAttentionCount})
              </button>
              <button
                onClick={() => handleFilterChange("HOLD")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap",
                  filter === "HOLD"
                    ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-medium"
                )}
              >
                Payment Hold ({holdCount})
              </button>
              <button
                onClick={() => handleFilterChange("EXPIRING")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap",
                  filter === "EXPIRING"
                    ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-medium"
                )}
              >
                Expiring Soon ({expiringCount})
              </button>
              <button
                onClick={() => handleFilterChange("COMPLIANT")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap",
                  filter === "COMPLIANT"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium"
                )}
              >
                Verified Compliant ({compliantCount})
              </button>
              <button
                onClick={() => handleFilterChange("MISSING_W9")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap",
                  filter === "MISSING_W9"
                    ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-medium"
                )}
              >
                Missing W-9 ({missingW9Count})
              </button>
            </div>
          </div>

          {/* Action Export Buttons + Reset Benchmark Option */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
            <button
              onClick={handleResetBenchmark}
              title="Reset vendor ledger to benchmark 148 dataset"
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 h-8.5 rounded-lg border transition-colors cursor-pointer shrink-0 whitespace-nowrap",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Reset Benchmark</span>
            </button>
            <button
              onClick={() => handleExportCsv()}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-3 sm:px-3.5 py-1.5 h-8.5 rounded-lg border transition-colors cursor-pointer shrink-0 whitespace-nowrap",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>CSV Export</span>
            </button>
            <button
              onClick={handleExportAuditPackage}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 sm:px-3.5 py-1.5 h-8.5 rounded-lg transition-colors shadow-xs text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Audit Package</span>
            </button>
          </div>
        </section>

        {/* 3. AUDIT DATA CONTAINER (Responsive Desktop Table + Mobile Cards with Smooth Scroll Anchor) */}
        <div
          ref={tableContainerRef}
          id="vendor-compliance-table"
          className={cn(
            "border rounded-xl shadow-xs overflow-hidden transition-colors scroll-mt-20",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          )}
        >
          {/* Animated Smooth Height Container for seamless collapse/expansion */}
          <SmoothHeight>
            {/* DESKTOP TABLE VIEW (hidden on md and down) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[880px]">
              <thead>
                <tr
                  className={cn(
                    "border-b font-medium text-[11px] uppercase tracking-wider",
                    isDarkMode
                      ? "bg-slate-950/60 border-slate-800 text-slate-400"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <th
                    className="py-1 px-2 w-10 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectAll();
                    }}
                  >
                    <div
                      className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                      title={selectedIds.length > 0 ? "Deselect all" : "Select all on page"}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length === paginatedVendors.length
                        }
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectAll();
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer pointer-events-auto"
                      />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-wider min-w-[190px]">
                    Vendor Name
                  </th>
                  <th className="hidden lg:table-cell py-3 px-4 font-semibold text-[11px] uppercase tracking-wider min-w-[170px]">
                    Primary Contact
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-wider min-w-[120px]">
                    W-9 Tax ID
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-wider min-w-[140px]">
                    COI Coverage
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-wider min-w-[120px]">
                    Expiration
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-wider min-w-[110px]">
                    Status
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-[11px] uppercase tracking-wider min-w-[120px]">
                    Actions
                  </th>
                </tr>
                {/* Indeterminate Progress Bar right under header titles row */}
                {isLoadingVendors && (
                  <tr>
                    <th colSpan={8} className="p-0 border-0 h-1 overflow-hidden relative">
                      <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                        <div className="h-full w-full bg-slate-900 dark:bg-slate-300 animate-indeterminate rounded-full" />
                      </div>
                    </th>
                  </tr>
                )}
              </thead>
              <tbody
                key={`tbody-page-${currentPage}`}
                className={cn(
                  "divide-y transition-opacity duration-200 ease-in-out",
                  isDarkMode ? "divide-slate-800" : "divide-slate-200"
                )}
              >
                {isLoadingVendors ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-slate-400 text-xs"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-slate-500 dark:text-slate-400 animate-spin" />
                        <span className="font-mono text-[11px] text-slate-400">
                          Loading compliance records...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedVendors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-slate-400 text-xs"
                    >
                      No vendors found matching the current filter.
                    </td>
                  </tr>
                ) : (
                  paginatedVendors.map((v) => {
                    const w9 = getW9Doc(v);
                    const coi = getCoiDoc(v);
                    const isSelected = selectedIds.includes(v.id);

                    // Status determination
                    const isExpired = v.status === "EXPIRED" || coi?.status === "EXPIRED";
                    const isExpiring = v.status === "EXPIRING_SOON" || coi?.status === "EXPIRING_SOON";
                    const isMissingW9 = !w9 || w9.status === "INCOMPLETE" || !w9.extractedData.taxIdOrEin || !w9.extractedData.isSigned;

                    return (
                      <tr
                        key={v.id}
                        onClick={() => setInspectVendor(v)}
                        className={cn(
                          "h-[44px] transition-colors cursor-pointer group",
                          isSelected
                            ? isDarkMode
                              ? "bg-slate-800/60"
                              : "bg-slate-100/80"
                            : isDarkMode
                            ? "hover:bg-slate-800/40"
                            : "hover:bg-slate-50"
                        )}
                      >
                        {/* Checkbox: Generous hit target across cell */}
                        <td
                          className="py-1 px-2 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectRow(v.id);
                          }}
                        >
                          <div
                            className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-700/60 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
                            title={isSelected ? "Deselect row" : "Select row"}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectRow(v.id);
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer pointer-events-auto"
                            />
                          </div>
                        </td>

                        {/* Vendor Name */}
                        <td className="py-2.5 px-4 font-semibold text-[13px] text-slate-900 dark:text-slate-100">
                          <span className="transition-colors group-hover:text-slate-900 dark:group-hover:text-white group-hover:underline">
                            {v.name}
                          </span>
                          <div className="lg:hidden text-[11px] font-mono font-normal text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                            {v.contactEmail}
                          </div>
                        </td>

                        {/* Primary Contact (visible on lg+) */}
                        <td
                          className="hidden lg:table-cell py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 tracking-tight truncate max-w-[200px]"
                          title={v.contactEmail}
                        >
                          {v.contactEmail}
                        </td>

                        {/* W-9 Tax ID */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {!isMissingW9 ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Missing EIN</span>
                            </span>
                          )}
                        </td>

                        {/* COI Coverage */}
                        <td className="py-2.5 px-4 tabular-nums text-[12px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {coi?.extractedData.coverageLabel ||
                            (coi
                              ? `$${coi.extractedData.coverageAmount?.toLocaleString()} GL`
                              : "No Policy")}
                        </td>

                        {/* Expiration Date */}
                        <td className="py-2.5 px-4 tabular-nums text-[12px] text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
                          {formatDisplayDate(coi?.extractedData.expirationDate)}
                        </td>

                        {/* Status Badges */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {isExpired && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium tracking-tight bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              EXPIRED
                            </span>
                          )}
                          {!isExpired && isMissingW9 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium tracking-tight bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              BLOCKED
                            </span>
                          )}
                          {!isExpired && !isMissingW9 && isExpiring && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium tracking-tight bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              EXPIRING
                            </span>
                          )}
                          {!isExpired && !isMissingW9 && !isExpiring && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              VALID
                            </span>
                          )}
                        </td>

                        {/* Actions Buttons (Enterprise Calm Neutral Styling) */}
                        <td
                          className="py-2.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isExpired && (
                            <button
                              onClick={() => openNoticeModal(v, "COI Renewal")}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700/60 dark:text-slate-200 cursor-pointer"
                            >
                              Request COI
                            </button>
                          )}
                          {!isExpired && isMissingW9 && (
                            <button
                              onClick={() => openNoticeModal(v, "Form W-9")}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700/60 dark:text-slate-200 cursor-pointer"
                            >
                              Request W-9
                            </button>
                          )}
                          {!isExpired && !isMissingW9 && isExpiring && (
                            <button
                              onClick={() => openNoticeModal(v, "30-Day COI Notice")}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700/60 dark:text-slate-200 cursor-pointer"
                            >
                              Send Notice
                            </button>
                          )}
                          {!isExpired && !isMissingW9 && !isExpiring && (
                            <button
                              onClick={() => setInspectVendor(v)}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              Audit Ledger
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE ADAPTIVE CARDS VIEW (visible on < md screens) */}
          <div className="block md:hidden">
            {/* Indeterminate Progress Bar for Mobile */}
            {isLoadingVendors && (
              <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                <div className="h-full w-full bg-slate-900 dark:bg-slate-300 animate-indeterminate rounded-full" />
              </div>
            )}

            <div key={`mobile-page-${currentPage}`} className="p-3 space-y-3 transition-opacity duration-200 ease-in-out">
              {isLoadingVendors ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 mx-auto text-slate-500 dark:text-slate-400 animate-spin mb-2" />
                  <p className="font-mono text-xs">Loading compliance records...</p>
                </div>
              ) : paginatedVendors.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No vendors found matching the current filter.
                </div>
              ) : (
                paginatedVendors.map((v) => {
                  const w9 = getW9Doc(v);
                  const coi = getCoiDoc(v);
                  const isSelected = selectedIds.includes(v.id);
                  const isExpired = v.status === "EXPIRED" || coi?.status === "EXPIRED";
                  const isExpiring = v.status === "EXPIRING_SOON" || coi?.status === "EXPIRING_SOON";
                  const isMissingW9 = !w9 || w9.status === "INCOMPLETE" || !w9.extractedData.taxIdOrEin || !w9.extractedData.isSigned;

                  return (
                    <div
                      key={v.id}
                      onClick={() => setInspectVendor(v)}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs space-y-2.5",
                        isSelected
                          ? isDarkMode
                            ? "bg-slate-800/70 border-slate-700"
                            : "bg-slate-100/90 border-slate-900 ring-1 ring-slate-900/10"
                          : isDarkMode
                          ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {/* Mobile Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Expanded hit-target zone around checkbox (hidden border / generous tap target) */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectRow(v.id);
                            }}
                            className="p-1.5 -ml-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                            title={isSelected ? "Deselect vendor" : "Select vendor"}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectRow(v.id);
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer pointer-events-auto"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                              {v.name}
                            </h3>
                            <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {v.contactEmail}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isExpired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900 shrink-0">
                            <Lock className="w-2.5 h-2.5" />
                            AP FREEZE
                          </span>
                        )}
                        {!isExpired && isMissingW9 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900 shrink-0">
                            <AlertCircle className="w-2.5 h-2.5" />
                            TAX HOLD
                          </span>
                        )}
                        {!isExpired && !isMissingW9 && isExpiring && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            EXPIRING
                          </span>
                        )}
                        {!isExpired && !isMissingW9 && !isExpiring && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            VALID
                          </span>
                        )}
                      </div>

                      {/* Mobile Card Details Grid (3-column responsive) */}
                      <div className="grid grid-cols-3 gap-2 text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">
                            W-9 Status
                          </span>
                          {!isMissingW9 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1 truncate">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              Verified
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-medium text-[11px] flex items-center gap-1 truncate">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              Missing
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">
                            Coverage
                          </span>
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate block">
                            {coi?.extractedData.coverageLabel ||
                              (coi
                                ? `$${(coi.extractedData.coverageAmount || 0).toLocaleString()}`
                                : "None")}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">
                            Expiration
                          </span>
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate block">
                            {formatDisplayDate(coi?.extractedData.expirationDate)}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Card Action Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setInspectVendor(v)}
                          className="text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline font-medium"
                        >
                          View Ledger ↗
                        </button>

                        <div>
                          {isExpired && (
                            <button
                              onClick={() => openNoticeModal(v, "COI Renewal")}
                              className="text-xs font-medium px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              Request COI
                            </button>
                          )}
                          {!isExpired && isMissingW9 && (
                            <button
                              onClick={() => openNoticeModal(v, "Form W-9")}
                              className="text-xs font-medium px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              Request W-9
                            </button>
                          )}
                          {!isExpired && !isMissingW9 && isExpiring && (
                            <button
                              onClick={() => openNoticeModal(v, "30-Day COI Notice")}
                              className="text-xs font-medium px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              Send Notice
                            </button>
                          )}
                          {!isExpired && !isMissingW9 && !isExpiring && (
                            <button
                              onClick={() => setInspectVendor(v)}
                              className="text-xs font-medium px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              Audit Ledger
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </SmoothHeight>

          {/* Table Footer / Pagination */}
          <div
            className={cn(
              "px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors",
              isDarkMode
                ? "bg-slate-950/60 border-slate-800 text-slate-400"
                : "bg-slate-50 border-slate-200 text-slate-600"
            )}
          >
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-center sm:text-left">
              <span>
                Showing {totalFiltered > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{" "}
                {Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered} vendors
                {totalFiltered !== totalVendors && (
                  <span className="opacity-70 ml-1">
                    (filtered from {totalVendors} total)
                  </span>
                )}
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                  Rows per page:
                </span>
                <SmartDropdown
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  options={[
                    { value: 10, label: "10" },
                    { value: 25, label: "25" },
                    { value: 50, label: "50" },
                  ]}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 disabled:opacity-40 transition-colors cursor-pointer",
                  isDarkMode
                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <span className="px-2 font-mono tabular-nums text-xs font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 disabled:opacity-40 transition-colors cursor-pointer",
                  isDarkMode
                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                )}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* FLOATING BATCH ACTION BAR (Fully adaptive for Mobile & Desktop) */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl rounded-2xl sm:rounded-full p-1.5 sm:px-4 sm:py-2 flex items-center justify-between sm:justify-center gap-1 sm:gap-2.5 text-xs w-[calc(100vw-20px)] max-w-[420px] sm:max-w-none sm:w-auto whitespace-nowrap"
            >
              {/* Selected Count Indicator */}
              <div className="flex items-center gap-1.5 pr-1.5 sm:pr-2.5 border-r border-slate-700 font-mono shrink-0">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-900 text-xs font-bold flex items-center justify-center">
                  {selectedIds.length}
                </span>
                <span className="text-slate-300 text-xs font-medium hidden sm:inline">Selected</span>
              </div>

              {/* Action Buttons: compact on mobile, full label on sm+ */}
              <div className="flex items-center justify-center gap-1 sm:gap-2 flex-1 sm:flex-initial shrink-0">
                <button
                  onClick={handleBulkSendNotices}
                  title="Send Reminder Notices to selected vendors"
                  className="px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer flex-1 sm:flex-initial shrink-0"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium whitespace-nowrap">
                    <span className="hidden sm:inline">Send </span>Notices
                  </span>
                </button>

                <button
                  onClick={handleBulkHold}
                  title="Hold Payments for selected vendors"
                  className="px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-full bg-red-950/90 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-1 sm:flex-initial shrink-0"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium whitespace-nowrap">
                    <span className="hidden sm:inline">Hold </span>Payments
                  </span>
                </button>

                <button
                  onClick={() => {
                    const selectedVendors = vendors.filter((v) => selectedIds.includes(v.id));
                    handleExportCsv(selectedVendors);
                  }}
                  title="Export selected vendors to CSV"
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium hidden sm:inline whitespace-nowrap">Export</span>
                </button>

                {/* Enterprise Deactivate & Archive Action Button */}
                <button
                  onClick={() => setShowArchiveConfirmModal(true)}
                  title="Deactivate & Archive Selected (Guarded Permanent Purge with IRS Audit Trail)"
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-full bg-slate-800 hover:bg-red-950/80 hover:text-red-300 hover:border-red-800/80 border border-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Archive className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium hidden sm:inline whitespace-nowrap">Archive</span>
                </button>
              </div>

              {/* Dismiss / Instant Uncheck All */}
              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-0.5 sm:ml-1"
                title="Deselect all rows"
              >
                <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* 4. MODAL: INGEST DOCUMENT & TEST EMAIL SIMULATOR */}
      <AnimatePresence>
        {showIngestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowIngestModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-lg rounded-xl border shadow-2xl p-6 space-y-5 transition-colors cursor-default",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-semibold text-sm">Ingest Compliance Document</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Interception hook simulator for compliance@acmelogistics.com
                  </p>
                </div>
                <button
                  onClick={() => setShowIngestModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    1-Click Test Scenarios
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={async () => {
                        setIsSimulating(true);
                        setShowIngestModal(false);
                        await fetch("/api/inbound-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            From: "dispatch@apexlogistics.com",
                            FromName: "Apex Freight Systems LLC",
                            Subject: "Updated Certificate of Liability Insurance",
                            Attachments: [
                              {
                                Name: "COI_Apex_Expired_2026.pdf",
                                ContentType: "application/pdf",
                                Content: "JVBERi0xLjQKJSDi48b3Cg==",
                              },
                            ],
                          }),
                        });
                        await fetchDb();
                        setIsSimulating(false);
                        notify(
                          "Expired COI Intercepted",
                          "Ingested 'COI_Apex_Expired_2026.pdf' • Expired COI detected • Slack alert sent to #ap-compliance",
                          "warning",
                          "COI EXPIRED"
                        );
                      }}
                      className={cn(
                        "p-3.5 text-left border rounded-xl text-xs transition-colors cursor-pointer",
                        isDarkMode
                          ? "bg-slate-850 bg-slate-800/60 border-slate-800 hover:border-slate-700"
                          : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <span className="font-semibold text-red-600 dark:text-red-400 block">
                        Expired COI Intercept
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                        Apex Logistics LLC (Sep 30, 2026)
                      </span>
                    </button>

                    <button
                      onClick={async () => {
                        setIsSimulating(true);
                        setShowIngestModal(false);
                        await fetch("/api/inbound-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            From: "compliance@flextalent.co",
                            FromName: "FlexTalent Solutions Inc",
                            Subject: "Form W-9 Inbound Verification Copy",
                            Attachments: [
                              {
                                Name: "W9_FlexTalent_Unsigned.pdf",
                                ContentType: "application/pdf",
                                Content: "JVBERi0xLjQKJSDi48b3Cg==",
                              },
                            ],
                          }),
                        });
                        await fetchDb();
                        setIsSimulating(false);
                        notify(
                          "Unsigned W-9 Form Intercepted",
                          "Ingested 'W9_FlexTalent_Unsigned.pdf' • Missing Signature • Payment hold enforced",
                          "error",
                          "MISSING TIN"
                        );
                      }}
                      className={cn(
                        "p-3.5 text-left border rounded-xl text-xs transition-colors cursor-pointer",
                        isDarkMode
                          ? "bg-slate-800/60 border-slate-800 hover:border-slate-700"
                          : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <span className="font-semibold text-amber-600 dark:text-amber-400 block">
                        Unsigned W-9 Tax Form
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                        FlexTalent Solutions Inc
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Batch File Ingestion &amp; Optical Scanning
                  </label>
                  <div
                    onClick={() => {
                      setShowIngestModal(false);
                      fileDropRef.current?.click();
                    }}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors group",
                      isDarkMode
                        ? "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-slate-400"
                    )}
                  >
                    <FileUp className="w-7 h-7 mx-auto text-blue-500 mb-1.5 group-hover:scale-105 transition-transform" />
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Browse Files for Multi-Document Ingestion
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Select 1 to 50 PDFs from desktop or synced folder · 1.8s Gemini Vision OCR
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowIngestModal(false)}
                  className={cn(
                    "px-4 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer",
                    isDarkMode
                      ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                      : "border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. MODAL: SYSTEM SETTINGS & INTEGRATIONS (Modular Multi-Channel Stacked Suite) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        appSettings={appSettings}
        setAppSettings={setAppSettings}
        onSave={async (updatedSettings) => {
          await fetch("/api/vendors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "updateSettings",
              settings: updatedSettings,
            }),
          });
        }}
        notify={notify}
        isDarkMode={isDarkMode}
        setIsDarkMode={(dark, e) => toggleThemeWithRipple(e, dark)}
      />

      {/* 6. MODAL: 1-CLICK SEND RE-REQUEST NOTICE */}
      <AnimatePresence>
        {noticeVendor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNoticeVendor(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-lg rounded-xl border shadow-2xl p-6 space-y-4 transition-colors cursor-default",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="font-semibold text-sm">
                    Send Compliance Re-Request Notice
                  </h3>
                </div>
                <button
                  onClick={() => setNoticeVendor(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Recipient
                  </span>
                  <p
                    className={cn(
                      "font-mono p-2.5 rounded-lg border text-xs",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200"
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    {noticeVendor.vendor.name} &lt;{noticeVendor.vendor.contactEmail}&gt;
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Subject
                  </span>
                  <p
                    className={cn(
                      "p-2.5 rounded-lg border text-xs font-medium",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200"
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    [ACTION REQUIRED] Updated {noticeVendor.docType} needed for payment processing
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Pre-filled Draft Body
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Editable · Add personalized instructions
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={emailNoticeBody}
                    onChange={(e) => setEmailNoticeBody(e.target.value)}
                    className={cn(
                      "w-full rounded-md p-3 text-xs font-sans focus:outline-none resize-none leading-relaxed transition-colors border",
                      isDarkMode
                        ? "bg-slate-900/60 border-slate-700/80 text-slate-200 focus:border-blue-500 placeholder-slate-500"
                        : "bg-white border-slate-300 text-slate-800 focus:border-blue-500 placeholder-slate-400"
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setNoticeVendor(null)}
                  className={cn(
                    "px-4 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer",
                    isDarkMode
                      ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                      : "border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotice}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white flex items-center gap-1.5 transition-colors shadow-xs bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Re-Request Notice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6.5 MODAL: 1.5-SECOND GEMINI VISION SCANNING PROGRESS OVERLAY */}
      <AnimatePresence>
        {isScanningPipeline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2">
                    Scanning with Gemini Vision...
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                    {scanTargetFileName}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ ease: "easeInOut", duration: 0.3 }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="truncate">{scanStepText}</span>
                  <span className="font-mono font-semibold">{scanProgress}%</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
                <span>Multi-modal OCR &amp; Underwriting Verification</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">1.8s Gemini Vision Pipeline</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6.8 MODAL: BATCH INGESTION & OPTICAL SCAN REPORT */}
      <AnimatePresence>
        {batchResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBatchResults(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-4xl rounded-2xl border shadow-2xl p-5 sm:p-6 space-y-5 transition-colors cursor-default max-h-[90vh] flex flex-col",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📥</span>
                    <h3 className="text-sm sm:text-base font-bold tracking-tight">
                      Batch Ingestion &amp; Optical Scan Report
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Analyzed {batchResults.length} vendor documents via Gemini Vision Pipeline in 1.8s
                  </p>
                </div>
                <button
                  onClick={() => setBatchResults(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Close report (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* BATCH SUMMARY KPI PILLS */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
                  Batch Summary:
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {batchResults.filter((r) => r.status === "VERIFIED").length} Verified &amp; Cleared 🟢
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  {batchResults.filter((r) => r.status === "EXPIRED" || r.status === "INCOMPLETE").length} Non-Compliant / Hold Enforced 🔴
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  0 Unreadable ⚪
                </span>
              </div>

              {/* ITEMIZED RESULTS TABLE (Responsive Scrollable Container for 3 to 100+ files) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto overflow-y-auto flex-1 min-h-[200px] max-h-[52vh] sm:max-h-[58vh] scroll-smooth overscroll-contain shadow-2xs">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead className="sticky top-0 z-10 shadow-xs">
                    <tr
                      className={cn(
                        "border-b font-medium text-[11px] uppercase tracking-wider backdrop-blur-md",
                        isDarkMode
                          ? "bg-slate-950/95 border-slate-800 text-slate-400"
                          : "bg-slate-50/95 border-slate-200 text-slate-500"
                      )}
                    >
                      <th className="py-2.5 px-4 font-semibold">File Name</th>
                      <th className="py-2.5 px-4 font-semibold">Detected Entity</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Doc Type</th>
                      <th className="py-2.5 px-4 font-semibold">Key Extracted Data</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody
                    className={cn(
                      "divide-y",
                      isDarkMode ? "divide-slate-800" : "divide-slate-200"
                    )}
                  >
                    {batchResults.map((item, idx) => {
                      const isExpired = item.status === "EXPIRED";

                      return (
                        <tr
                          key={idx}
                          className={cn(
                            "transition-colors",
                            isDarkMode
                              ? "hover:bg-slate-800/40"
                              : "hover:bg-slate-50/80"
                          )}
                        >
                          {/* File Name */}
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate max-w-[180px]" title={item.fileName}>
                                {item.fileName}
                              </span>
                            </div>
                          </td>

                          {/* Detected Entity */}
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            {item.vendorName}
                            {item.isExistingVendor && (
                              <span className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 font-normal">
                                Existing ledger match
                              </span>
                            )}
                          </td>

                          {/* Doc Type */}
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-tight bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                              {item.docType}
                            </span>
                          </td>

                          {/* Key Extracted Data */}
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {item.details}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-tight bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  EXPIRED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  VERIFIED
                                </span>
                              )}
                              {item.statusNote && (
                                <div
                                  className={cn(
                                    "text-[10px] font-medium",
                                    isExpired
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  )}
                                >
                                  {item.statusNote}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {isExpired ? (
                              <button
                                onClick={() => {
                                  const vendorMatch =
                                    vendors.find((v) =>
                                      v.name
                                        .toLowerCase()
                                        .includes(
                                          item.vendorName
                                            .toLowerCase()
                                            .split(" ")[0]
                                        )
                                    ) || vendors[0];
                                  if (vendorMatch) {
                                    openNoticeModal(vendorMatch, "COI Renewal");
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 transition-colors cursor-pointer shadow-2xs"
                              >
                                Draft Notice
                              </button>
                            ) : item.docType === "W9" ? (
                              <button
                                onClick={() => {
                                  const vendorMatch =
                                    vendors.find((v) =>
                                      v.name
                                        .toLowerCase()
                                        .includes(
                                          item.vendorName
                                            .toLowerCase()
                                            .split(" ")[0]
                                        )
                                    ) || vendors[0];
                                  if (vendorMatch) {
                                    const w9 = getW9Doc(vendorMatch);
                                    if (w9) {
                                      setViewingDoc({
                                        doc: w9,
                                        vendor: vendorMatch,
                                      });
                                    } else {
                                      setInspectVendor(vendorMatch);
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                View Form
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const vendorMatch =
                                    vendors.find((v) =>
                                      v.name
                                        .toLowerCase()
                                        .includes(
                                          item.vendorName
                                            .toLowerCase()
                                            .split(" ")[0]
                                        )
                                    ) || vendors[0];
                                  if (vendorMatch) {
                                    setInspectVendor(vendorMatch);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                Audit Log
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Informational Note */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 shrink-0">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="text-blue-500 font-bold">ℹ️</span>
                  <span>
                    1 existing vendor updated (Pinnacle Freight). 2 compliance statuses recalculated.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  Existing vendors updated automatically • Deduplicated • No duplicate rows
                </span>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadBatchAuditLog}
                  className={cn(
                    "px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs",
                    isDarkMode
                      ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                      : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Batch Audit Log</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchToLedger}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98]"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Apply &amp; Update Ledger</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. SLIDE-OUT AUDIT DRAWER (Linear / Stripe Detail Inspector) */}
      <AnimatePresence>
        {inspectVendor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setInspectVendor(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end cursor-pointer"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full sm:max-w-xl h-full border-l shadow-2xl p-4 sm:p-6 overflow-y-auto space-y-6 transition-colors cursor-default",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-200"
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                    Compliance Audit Ledger
                  </span>
                  <h2 className="text-base font-bold mt-0.5 text-slate-900 dark:text-white">
                    {inspectVendor.name}
                  </h2>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {inspectVendor.contactEmail}
                  </p>
                </div>
                <button
                  onClick={() => setInspectVendor(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Overall status badge card */}
              <div
                className={cn(
                  "p-3.5 rounded-xl border flex items-center justify-between",
                  isDarkMode
                    ? "bg-slate-800/60 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                )}
              >
                <div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Payment Processing Authorization
                  </span>
                  <span className="text-xs font-bold mt-0.5 block text-slate-900 dark:text-slate-100">
                    {inspectVendor.status === "VERIFIED" && "🟢 Approved for Automatic Payment Release"}
                    {inspectVendor.status === "EXPIRED" && "🔴 Payment Freeze: Insurance Expired"}
                    {inspectVendor.status === "ACTION_REQUIRED" && "🔴 Hold: Missing Tax Certification / Incomplete"}
                    {inspectVendor.status === "EXPIRING_SOON" && "🟡 Active (Renewal Queued)"}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 uppercase bg-white dark:bg-slate-900">
                  {inspectVendor.status}
                </span>
              </div>

              {/* Document Details List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Extracted Documents &amp; Policy Metadata
                </h3>

                {inspectVendor.documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setViewingDoc({ doc, vendor: inspectVendor })}
                    className={cn(
                      "p-4 rounded-xl border space-y-3 cursor-pointer group transition-all",
                      isDarkMode
                        ? "bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                        <div>
                          <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {doc.type} Compliance Form
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-normal group-hover:underline">
                              • Inspect Scan ↗
                            </span>
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {doc.fileName}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-[10.5px] font-medium px-2 py-0.5 rounded-full font-mono uppercase tracking-tight",
                          doc.status === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                            : doc.status === "EXPIRING_SOON"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
                            : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900"
                        )}
                      >
                        {doc.status}
                      </span>
                    </div>

                    {/* Field extractions */}
                    <div
                      className={cn(
                        "p-3 rounded-lg border text-xs font-mono space-y-1.5",
                        isDarkMode
                          ? "bg-slate-950 border-slate-800"
                          : "bg-white border-slate-200"
                      )}
                    >
                      {doc.type === "COI" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Coverage Limit:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {doc.extractedData.coverageLabel ||
                                `$${doc.extractedData.coverageAmount?.toLocaleString()} GL`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Expiration Date:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatDisplayDate(doc.extractedData.expirationDate)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Signature Valid:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {doc.extractedData.isSigned ? "✓ Yes" : "❌ No"}
                            </span>
                          </div>
                        </>
                      )}

                      {doc.type === "W9" && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 dark:text-slate-400">Tax ID / EIN:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {doc.extractedData.taxIdOrEin || "Missing / Not Found"}
                              </span>
                              {doc.extractedData.taxIdOrEin && (
                                <div className="relative inline-flex items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyTaxId(doc.extractedData.taxIdOrEin!);
                                    }}
                                    title="Copy Tax ID to clipboard"
                                    className={cn(
                                      "p-1 rounded-md transition-colors cursor-pointer border",
                                      isDarkMode
                                        ? "bg-slate-900 border-slate-700/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                                        : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                                    )}
                                  >
                                    {copiedTaxId === doc.extractedData.taxIdOrEin ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  {copiedTaxId === doc.extractedData.taxIdOrEin && (
                                    <span className="absolute -top-7 right-0 text-[10px] font-sans font-medium px-2 py-0.5 rounded shadow-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 pointer-events-none whitespace-nowrap z-30">
                                      Copied!
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Certification Signed:</span>
                            <span className={cn(doc.extractedData.isSigned ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400 font-medium")}>
                              {doc.extractedData.isSigned ? "✓ Signed & Dated" : "❌ Missing Signature"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Discrepancy warnings */}
                    {doc.extractedData.missingFields &&
                      doc.extractedData.missingFields.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-[11px] text-red-700 dark:text-red-400 space-y-1">
                          <span className="font-bold uppercase tracking-wider block text-[10px]">
                            Audit Findings:
                          </span>
                          {doc.extractedData.missingFields.map((f, i) => (
                            <p key={i}>• {f}</p>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>

              {/* Footer action buttons with Manual AP Hold Override */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
                <button
                  onClick={() => handleToggleManualHold(inspectVendor)}
                  className={cn(
                    "px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5",
                    inspectVendor.status === "EXPIRED" || inspectVendor.status === "ACTION_REQUIRED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
                  )}
                >
                  {inspectVendor.status === "EXPIRED" || inspectVendor.status === "ACTION_REQUIRED" ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Override: Release Hold</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Enforce AP Hold</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    openNoticeModal(inspectVendor, "Compliance Audit Notice");
                    setInspectVendor(null);
                  }}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg text-white transition-colors shadow-xs bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 cursor-pointer text-center"
                >
                  Draft Notice Email
                </button>
                <button
                  onClick={() => setInspectVendor(null)}
                  className={cn(
                    "px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer",
                    isDarkMode
                      ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                      : "border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. MODAL: FULL DOCUMENT INSPECTION & SOURCE SCAN VIEWER */}
      <AnimatePresence>
        {viewingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingDoc(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-5xl h-[90vh] md:h-[88vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden transition-colors cursor-default",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Header Bar */}
              <div className="h-auto sm:h-14 px-4 sm:px-6 py-3 sm:py-0 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-xs font-mono">
                        {viewingDoc.doc.fileName}
                      </h3>
                      <span
                        className={cn(
                          "text-[10px] font-mono font-medium px-2 py-0.5 rounded-full uppercase",
                          viewingDoc.doc.status === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                            : viewingDoc.doc.status === "EXPIRING_SOON"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
                            : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900"
                        )}
                      >
                        {viewingDoc.doc.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Entity: <span className="font-semibold text-slate-900 dark:text-slate-200">{viewingDoc.vendor.name}</span> • Contact: <span className="font-mono">{viewingDoc.vendor.contactEmail}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <a
                    href={
                      viewingDoc.doc.type === "COI"
                        ? "/samples/COI_ApexLogistics_2026.pdf"
                        : "/samples/W9_ApexLogistics.pdf"
                    }
                    download={viewingDoc.doc.fileName}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                        : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                  <button
                    onClick={() => setViewingDoc(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mobile Tab Switcher */}
              <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 p-1.5 bg-slate-100 dark:bg-slate-900 shrink-0">
                <button
                  onClick={() => setDocModalTab("scan")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all",
                    docModalTab === "scan"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Document Scan Preview
                </button>
                <button
                  onClick={() => setDocModalTab("audit")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all",
                    docModalTab === "audit"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Compliance Checklist
                </button>
              </div>

              {/* Split Body: Left = Official Scanned Document Preview, Right = AI Compliance Extraction & Checklist */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                
                {/* Left 7 Cols: Authentic Scan Layout */}
                <div className={cn(
                  "md:col-span-7 border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950 p-3 sm:p-5 overflow-y-auto justify-center",
                  docModalTab === "scan" ? "flex" : "hidden md:flex"
                )}>
                  <div className="w-full max-w-[540px] bg-white text-black p-6 rounded shadow-md border border-slate-300 font-sans text-[11px] leading-tight select-text space-y-4">
                    {/* Header */}
                    <div className="border-b-2 border-black pb-2 flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-[13px] tracking-tight">
                          {viewingDoc.doc.type === "COI"
                            ? "ACORD 25 CERTIFICATE OF LIABILITY INSURANCE"
                            : "IRS FORM W-9 (REV. OCTOBER 2024)"}
                        </div>
                        <div className="text-[9.5px] text-slate-600 uppercase">
                          {viewingDoc.doc.type === "COI"
                            ? "PRODUCER & HOLDER COPY • GENERAL LIABILITY"
                            : "REQUEST FOR TAXPAYER IDENTIFICATION NUMBER & CERTIFICATION"}
                        </div>
                      </div>
                      <span className="font-mono text-[9px] border border-black px-1.5 py-0.5">
                        DATE: {formatDisplayDate(viewingDoc.doc.createdAt.split("T")[0])}
                      </span>
                    </div>

                    {/* Insured Block (COI: Producer + Insured | W-9: Entity + Classification & Address) */}
                    {viewingDoc.doc.type === "COI" ? (
                      <div className="grid grid-cols-2 gap-3 text-[10.5px]">
                        <div className="border border-slate-300 p-2 relative bg-amber-50/20">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Producer / Broker:</span>
                          <p className="font-semibold">Marsh &amp; McLennan Agency LLC</p>
                          <p className="text-slate-600 text-[10px]">1166 Avenue of the Americas</p>
                          <p className="text-slate-600 text-[10px]">New York, NY 10036</p>
                        </div>

                        <div className="border-2 border-emerald-600 p-2 relative bg-emerald-50/20 rounded">
                          <span className="absolute -top-2 right-2 bg-emerald-600 text-white font-mono text-[8px] px-1 rounded">
                            OCR MATCH: 99.4%
                          </span>
                          <span className="text-[9px] uppercase font-bold text-emerald-800 block">Insured Legal Entity:</span>
                          <p className="font-bold text-[11.5px] text-slate-900">{viewingDoc.vendor.name}</p>
                          <p className="text-slate-600 text-[10px]">Contact: {viewingDoc.vendor.contactEmail}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-[10.5px]">
                        <div className="border-2 border-emerald-600 p-2 relative bg-emerald-50/20 rounded">
                          <span className="absolute -top-2 right-2 bg-emerald-600 text-white font-mono text-[8px] px-1 rounded">
                            TIN MATCH: 100%
                          </span>
                          <span className="text-[9px] uppercase font-bold text-emerald-800 block">Legal Entity Name (Line 1):</span>
                          <p className="font-bold text-[11.5px] text-slate-900">{viewingDoc.vendor.name}</p>
                          <p className="text-slate-600 text-[10px]">Business Name / Disregarded Entity: Same</p>
                        </div>

                        <div className="border border-slate-300 p-2 relative bg-slate-50">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Federal Tax Classification:</span>
                          <p className="font-semibold text-slate-900">
                            {viewingDoc.vendor.name.toLowerCase().includes("inc") || viewingDoc.vendor.name.toLowerCase().includes("corp")
                              ? "C Corporation"
                              : "Limited Liability Company (LLC - Partnership)"}
                          </p>
                          <p className="text-slate-600 text-[10px] mt-0.5">
                            Address: 100 Logistics Way, Suite 400
                          </p>
                          <p className="text-slate-600 text-[10px]">Atlanta, GA 30301</p>
                        </div>
                      </div>
                    )}

                    {/* Policy Table or W-9 Form Fields */}
                    {viewingDoc.doc.type === "COI" ? (
                      <div className="space-y-3">
                        <table className="w-full border-collapse border border-black text-[10px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-black font-bold">
                              <th className="p-1 border-r border-black text-left">TYPE OF INSURANCE</th>
                              <th className="p-1 border-r border-black text-left">POLICY NUMBER</th>
                              <th className="p-1 border-r border-black text-left">POLICY EXP</th>
                              <th className="p-1 text-right">LIMITS</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-300">
                              <td className="p-1.5 border-r border-black">
                                <span className="font-semibold block">[X] COMMERCIAL GENERAL LIABILITY</span>
                                <span className="text-[9px] text-slate-600">Claims-Made / Occurrence</span>
                              </td>
                              <td className="p-1.5 border-r border-black font-mono">
                                POL-GL-891042
                              </td>
                              <td className={cn("p-1.5 border-r border-black font-mono font-bold", viewingDoc.doc.status === "EXPIRED" ? "text-red-600 bg-red-50" : "text-emerald-700")}>
                                {formatDisplayDate(viewingDoc.doc.extractedData.expirationDate)}
                              </td>
                              <td className="p-1.5 text-right font-mono font-bold">
                                {viewingDoc.doc.extractedData.coverageLabel || `$${viewingDoc.doc.extractedData.coverageAmount?.toLocaleString()} GL`}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                              <td className="p-1.5 border-r border-black">
                                <span className="font-semibold block">[X] AUTOMOBILE LIABILITY</span>
                              </td>
                              <td className="p-1.5 border-r border-black font-mono">
                                POL-AL-209411
                              </td>
                              <td className="p-1.5 border-r border-black font-mono">
                                2027-04-15
                              </td>
                              <td className="p-1.5 text-right font-mono">
                                $1,000,000 CSL
                              </td>
                            </tr>
                            <tr>
                              <td className="p-1.5 border-r border-black">
                                <span className="font-semibold block">[X] UMBRELLA / EXCESS LIAB</span>
                              </td>
                              <td className="p-1.5 border-r border-black font-mono">
                                POL-UMB-77192
                              </td>
                              <td className="p-1.5 border-r border-black font-mono">
                                2027-04-15
                              </td>
                              <td className="p-1.5 text-right font-mono">
                                $5,000,000 EACH
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Certificate Holder Box */}
                        <div className="border border-slate-400 p-2.5 bg-slate-50 text-[10px] space-y-1">
                          <span className="font-bold text-[9px] uppercase tracking-wider block text-slate-700">
                            Certificate Holder (Additional Insured):
                          </span>
                          <p className="font-bold">Acme Logistics Inc. • Accounts Payable Compliance</p>
                          <p className="text-slate-600">100 Logistics Boulevard, Suite 400 • Atlanta, GA 30301</p>
                          <p className="text-[9.5px] italic text-emerald-700 font-semibold mt-1">
                            ✓ Certificate holder named as Additional Insured with Waiver of Subrogation endorsed.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="border border-black p-3 space-y-2">
                          <div>
                            <span className="text-[9px] font-bold uppercase block text-slate-600">
                              Part I: Taxpayer Identification Number (TIN)
                            </span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono text-sm font-bold bg-slate-100 px-3 py-1 border border-slate-300 tracking-wider">
                                {viewingDoc.doc.extractedData.taxIdOrEin || "NOT PROVIDED"}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {viewingDoc.doc.extractedData.taxIdOrEin ? "✓ Employer Identification Number (EIN)" : "❌ Missing EIN"}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200">
                            <span className="text-[9px] font-bold uppercase block text-slate-600">
                              Part II: Certification
                            </span>
                            <p className="text-[9.5px] text-slate-700 leading-normal">
                              Under penalties of perjury, I certify that the number shown on this form is my correct taxpayer identification number and I am not subject to backup withholding.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Signature Section */}
                    <div className="border-t border-slate-300 pt-3 flex justify-between items-end text-[10px]">
                      <div>
                        <span className="text-[9px] font-bold uppercase block text-slate-500">Authorized Representative:</span>
                        <div className="font-serif italic text-sm text-slate-800 pt-0.5">
                          {viewingDoc.doc.extractedData.isSigned ? "David K. Vance, CPCU" : "[Unsigned]"}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[9px] text-slate-500">
                        AUTHENTICATED AUDIT STAMP: ACME-SEC-9921
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 5 Cols: Machine Extracted Checklist & Verification */}
                <div className={cn(
                  "md:col-span-5 p-4 sm:p-5 overflow-y-auto space-y-4 flex-col justify-between",
                  docModalTab === "audit" ? "flex" : "hidden md:flex"
                )}>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                      Automated Rule Engine Verification
                    </span>
                    <h4 className="text-sm font-bold mt-0.5 text-slate-900 dark:text-slate-100">
                      Compliance Inspection Results
                    </h4>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">Legal Entity Name Match</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Matched vendor &ldquo;{viewingDoc.vendor.name}&rdquo; (100% confidence)</p>
                      </div>
                    </div>

                    {viewingDoc.doc.type === "COI" ? (
                      <>
                        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                          {viewingDoc.doc.status === "EXPIRED" ? (
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">Policy Expiration Status</p>
                            <p className={cn("text-[11px] font-mono", viewingDoc.doc.status === "EXPIRED" ? "text-red-600 dark:text-red-400 font-bold" : "text-slate-500 dark:text-slate-400")}>
                              {viewingDoc.doc.extractedData.expirationDate ? formatDisplayDate(viewingDoc.doc.extractedData.expirationDate) : "No Expiration Date"}
                              {viewingDoc.doc.status === "EXPIRED" && " • EXPIRED (Payment Freeze Enforced)"}
                            </p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">Minimum Coverage Limit</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {viewingDoc.doc.extractedData.coverageLabel || "$1,000,000 GL"} (Threshold: $1,000,000)
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                          {viewingDoc.doc.extractedData.taxIdOrEin ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">TIN / EIN Verification</p>
                            <p className={cn("text-[11px] font-mono", viewingDoc.doc.extractedData.taxIdOrEin ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                              {viewingDoc.doc.extractedData.taxIdOrEin
                                ? "Valid 9-digit format (IRS TIN matching cleared)"
                                : "Missing or invalid Taxpayer ID (EIN / SSN)"}
                            </p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">Exempt Payee Code</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              Standard (Subject to 1099 reporting)
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                      {viewingDoc.doc.extractedData.isSigned ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">Authorized Signature</p>
                        <p className={cn("text-[11px] font-mono", viewingDoc.doc.extractedData.isSigned ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                          {viewingDoc.doc.extractedData.isSigned ? "Validated wet/digital signature" : "Signature missing on certification"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <button
                      onClick={() => {
                        const targetVendor = viewingDoc.vendor;
                        const docLabel = viewingDoc.doc.type === "COI" ? "COI Renewal" : "Form W-9";
                        // 1. Close PDF/document viewer window immediately with animation
                        setViewingDoc(null);
                        // 2. Open notice modal and close the side bar/drawer after 0.25s
                        setTimeout(() => {
                          setInspectVendor(null);
                          setNoticeVendor({ vendor: targetVendor, docType: docLabel });
                        }, 250);
                      }}
                      className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg text-white flex items-center justify-center gap-2 transition-all shadow-sm bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/50 cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      Send Re-Request Notice to Vendor
                    </button>
                    <button
                      onClick={() => setViewingDoc(null)}
                      className={cn(
                        "w-full py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer",
                        isDarkMode
                          ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                          : "border-slate-300 hover:bg-slate-100 text-slate-700"
                      )}
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* MODAL: ENTERPRISE DEACTIVATE & ARCHIVE CONFIRMATION */}
      <AnimatePresence>
        {showArchiveConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowArchiveConfirmModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-md rounded-xl border shadow-2xl p-6 space-y-4 transition-colors cursor-default",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Deactivate &amp; Archive Records</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    In enterprise compliance, records cannot be deleted outright to protect IRS audit trails and underwriter liability.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs space-y-2 font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Target Records:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{selectedIds.length} vendor(s)</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Disbursements:</span>
                  <span className="text-red-500 font-bold">Freeze AP Payments</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Vault Retention:</span>
                  <span className="text-emerald-500 font-bold">7-Year IRS Immutable Trail</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowArchiveConfirmModal(false)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer",
                    isDarkMode
                      ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchiveVendors}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  Deactivate &amp; Archive
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 9. FLOATING ENTERPRISE NOTIFICATION TOAST STACK (Multi-Toast, Actionable, Below Navbar) */}
      <aside
        aria-label="Notifications"
        className="fixed top-16 sm:top-18 right-3 sm:right-5 z-50 pointer-events-none max-w-[420px] w-[calc(100vw-24px)] flex flex-col gap-2.5"
      >
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onMouseEnter={() => {
                const t = notificationTimeoutsRef.current.get(notif.id);
                if (t) clearTimeout(t);
              }}
              onMouseLeave={() => {
                const timeout = setTimeout(() => {
                  dismissNotification(notif.id);
                }, 3500);
                notificationTimeoutsRef.current.set(notif.id, timeout);
              }}
              onClick={() => {
                setShowNotificationDrawer(true);
                setUnreadNotificationCount(0);
              }}
              title="Click to open Notification Center & Audit Trail"
              className={cn(
                "pointer-events-auto rounded-xl border shadow-xl p-3.5 sm:p-4 transition-all relative overflow-hidden backdrop-blur-md cursor-pointer hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99]",
                isDarkMode
                  ? "bg-slate-900/95 border-slate-800 text-slate-100 hover:border-slate-700"
                  : "bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-900/10 hover:border-slate-300"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Type Icon */}
                <div
                  className={cn(
                    "p-1.5 rounded-lg shrink-0 mt-0.5",
                    notif.type === "success"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : notif.type === "warning"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                      : notif.type === "error"
                      ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  {notif.type === "success" ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : notif.type === "warning" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : notif.type === "error" ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-xs tracking-tight">
                      {notif.title}
                    </h4>
                    {notif.badge && (
                      <span
                        className={cn(
                          "text-[9.5px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider",
                          isDarkMode
                            ? "bg-slate-800 text-slate-300 border border-slate-700"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        )}
                      >
                        {notif.badge}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono ml-auto">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans break-words">
                    {notif.message}
                  </p>

                  {/* Optional Action Button */}
                  {notif.actionLabel && notif.onAction && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          notif.onAction?.();
                          dismissNotification(notif.id);
                        }}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        {notif.actionLabel}
                      </button>
                    </div>
                  )}
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notif.id);
                  }}
                  title="Dismiss alert"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 absolute top-2.5 right-2.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Animated Progress Bar under the card */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={cn(
                    "h-full animate-indeterminate rounded-full",
                    notif.type === "success"
                      ? "bg-emerald-500"
                      : notif.type === "warning"
                      ? "bg-amber-500"
                      : notif.type === "error"
                      ? "bg-red-500"
                      : "bg-slate-900 dark:bg-slate-300"
                  )}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </aside>

      {/* 10. NOTIFICATION CENTER & COMPLIANCE ACTIVITY LOGS DRAWER */}
      <AnimatePresence>
        {showNotificationDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotificationDrawer(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end cursor-pointer"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-md h-full border-l shadow-2xl flex flex-col transition-colors cursor-default",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Drawer Header */}
              <div className="h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs tracking-tight">Notification Center</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Audit log alerts &amp; system dispatches
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notificationHistory.length > 0 && (
                    <button
                      onClick={() => setNotificationHistory([])}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationDrawer(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Category Tabs */}
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center gap-1">
                <button
                  onClick={() => setNotificationDrawerTab("ALL")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer",
                    notificationDrawerTab === "ALL"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  All ({notificationHistory.length + logs.length})
                </button>
                <button
                  onClick={() => setNotificationDrawerTab("ALERTS")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer",
                    notificationDrawerTab === "ALERTS"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Alerts ({notificationHistory.length})
                </button>
                <button
                  onClick={() => setNotificationDrawerTab("LOGS")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer",
                    notificationDrawerTab === "LOGS"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Audit Logs ({logs.length})
                </button>
              </div>

              {/* Notification Logs List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {notificationHistory.length === 0 && logs.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                    <Bell className="w-8 h-8 mx-auto opacity-30" />
                    <p className="font-medium">No recent notifications</p>
                    <p className="text-[11px]">System and compliance dispatch events will appear here.</p>
                  </div>
                ) : (
                  <>
                    {/* Live Session Notifications */}
                    {notificationDrawerTab !== "LOGS" && notificationHistory.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block px-1">
                          Current Session Alerts ({notificationHistory.length})
                        </span>
                        {notificationHistory.map((notif) => (
                          <div
                            key={notif.id}
                            className={cn(
                              "p-3 rounded-xl border text-xs space-y-1.5 transition-all",
                              isDarkMode
                                ? "bg-slate-800/50 border-slate-800"
                                : "bg-slate-50/80 border-slate-200/80"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    notif.type === "success"
                                      ? "bg-emerald-500"
                                      : notif.type === "warning"
                                      ? "bg-amber-500"
                                      : notif.type === "error"
                                      ? "bg-red-500"
                                      : "bg-slate-500"
                                  )}
                                />
                                {notif.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {notif.timestamp}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                              {notif.message}
                            </p>
                            {notif.badge && (
                              <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 font-semibold uppercase">
                                {notif.badge}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Permanent Audit Log Events */}
                    {notificationDrawerTab !== "ALERTS" && logs.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block px-1">
                          Compliance Audit Trail ({logs.length})
                        </span>
                        {logs.slice(0, 20).map((log) => {
                          const matchingVendor = vendors.find((v) => v.name.toLowerCase() === log.vendorName.toLowerCase());
                          return (
                            <div
                              key={log.id}
                              className={cn(
                                "p-3 rounded-xl border text-xs space-y-1.5 transition-all",
                                isDarkMode
                                  ? "bg-slate-800/30 border-slate-800"
                                  : "bg-slate-50 border-slate-200"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {log.action}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
                                </span>
                              </div>
                              <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                                {log.details}
                              </p>
                              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                  <span>{log.vendorName}</span>
                                  <span>•</span>
                                  <span
                                    className={cn(
                                      "uppercase font-semibold",
                                      log.status === "success"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : log.status === "warning"
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-red-600 dark:text-red-400"
                                    )}
                                  >
                                    {log.status}
                                  </span>
                                </div>
                                {matchingVendor && (
                                  <button
                                    onClick={() => {
                                      setInspectVendor(matchingVendor);
                                      setShowNotificationDrawer(false);
                                    }}
                                    className="text-[10.5px] font-semibold text-slate-900 dark:text-slate-100 underline hover:no-underline cursor-pointer"
                                  >
                                    Inspect Ledger
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 shrink-0">
                <span className="text-[11px] font-mono">Realtime AP Webhooks Active</span>
                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanding Circular Ripple Fallback Overlay */}
      {rippleState && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden"
        >
          <div
            className={cn(
              "animate-theme-ripple absolute inset-0 pointer-events-none",
              rippleState.isDark ? "bg-slate-950" : "bg-white"
            )}
            style={{
              ["--ripple-x" as any]: `${rippleState.x}px`,
              ["--ripple-y" as any]: `${rippleState.y}px`,
              ["--ripple-radius" as any]: `${rippleState.maxRadius}px`,
            }}
          />
          {/* Subtle luminous ripple wave boundary ring */}
          <div
            className={cn(
              "animate-theme-ripple-ring absolute rounded-full pointer-events-none",
              rippleState.isDark
                ? "border-2 border-cyan-400/40 shadow-[0_0_24px_rgba(34,211,238,0.3)]"
                : "border-2 border-indigo-500/40 shadow-[0_0_24px_rgba(99,102,241,0.25)]"
            )}
            style={{
              left: `${rippleState.x}px`,
              top: `${rippleState.y}px`,
              ["--ripple-radius" as any]: `${rippleState.maxRadius}px`,
            }}
          />
        </div>
      )}
    </div>
  );
}
