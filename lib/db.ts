import fs from "fs";
import path from "path";
import { generate148Vendors } from "./seedVendors";

export type ComplianceStatus = "VERIFIED" | "EXPIRING_SOON" | "EXPIRED" | "INCOMPLETE" | "ACTION_REQUIRED";

export interface ExtractedData {
  vendorName?: string;
  taxIdOrEin?: string;
  expirationDate?: string; // YYYY-MM-DD
  coverageAmount?: number;
  coverageLabel?: string;
  isSigned?: boolean;
  missingFields?: string[];
  confidenceScore?: number;
}

export interface Document {
  id: string;
  type: "W9" | "COI" | "INVOICE" | "OTHER";
  fileName: string;
  fileUrl?: string;
  extractedData: ExtractedData;
  status: ComplianceStatus;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactEmail: string;
  type: "Staffing" | "Logistics" | "HR Platform" | "Facilities" | "Other";
  status: ComplianceStatus;
  documents: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  vendorId?: string;
  vendorName: string;
  action: string;
  details: string;
  status: "success" | "warning" | "error";
}

export interface ChannelConfig {
  enabled: boolean;
  webhookUrl?: string;
  channelTarget?: string;
  recipients?: string;
  mode?: "single" | "multi";
  frequency?: "realtime" | "daily_summary" | "both";
}

export interface Settings {
  slackWebhookUrl: string;
  teamsWebhookUrl?: string;
  alertEmail?: string;
  alertDestination?: "slack" | "teams" | "email";
  channels?: {
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channelTarget: string;
    };
    teams: {
      enabled: boolean;
      webhookUrl: string;
      channelTarget: string;
    };
    email: {
      enabled: boolean;
      recipients: string;
      mode: "single" | "multi";
      frequency: "realtime" | "daily_summary" | "both";
    };
  };
  triggers?: {
    expiredCoi: boolean;
    missingW9: boolean;
    upcomingExpiry: boolean;
  };
  companyName: string;
  requireSignedW9: boolean;
  minCoiCoverage: number; // e.g. 1000000
  noticeLeadDays?: number; // e.g. 14, 30, 60
  autoHoldEnforcement?: boolean;
  inboundEmailAlias?: string;
  defaultApSignoffName?: string;
}

interface DatabaseState {
  vendors: Vendor[];
  logs: AuditLog[];
  settings: Settings;
}

const DB_FILE = path.join(process.cwd(), "lib", "db.json");

// Ensure the directory exists
function ensureDbDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Generate realistic seed data matching Google Admin / Linear wireframe
const SEED_VENDORS: Vendor[] = [
  {
    id: "1",
    name: "Apex Logistics LLC",
    contactEmail: "dispatch@apexlog.com",
    type: "Logistics",
    status: "EXPIRED",
    documents: [
      {
        id: "doc-apex-coi",
        type: "COI",
        fileName: "COI_ApexLogistics_2026.pdf",
        extractedData: {
          vendorName: "Apex Logistics LLC",
          expirationDate: "2026-09-30",
          coverageAmount: 1000000,
          coverageLabel: "$1,000,000 GL",
          isSigned: true,
          confidenceScore: 0.98,
          missingFields: ["Policy expired 7 days ago on Sep 30, 2026"]
        },
        status: "EXPIRED",
        createdAt: "2026-01-15T10:30:00Z"
      },
      {
        id: "doc-apex-w9",
        type: "W9",
        fileName: "W9_ApexLogistics.pdf",
        extractedData: {
          vendorName: "Apex Logistics LLC",
          taxIdOrEin: "XX-XXX5829",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-01-15T10:35:00Z"
      }
    ],
    createdAt: "2026-01-15T10:30:00Z",
    updatedAt: "2026-10-01T08:00:00Z"
  },
  {
    id: "2",
    name: "Mid-Atlantic Freight",
    contactEmail: "billing@matfreight.com",
    type: "Logistics",
    status: "EXPIRING_SOON",
    documents: [
      {
        id: "doc-mat-coi",
        type: "COI",
        fileName: "COI_MidAtlantic_2026.pdf",
        extractedData: {
          vendorName: "Mid-Atlantic Freight Corp",
          expirationDate: "2026-10-24",
          coverageAmount: 2000000,
          coverageLabel: "$2,000,000 GL",
          isSigned: true,
          confidenceScore: 0.97,
          missingFields: ["Policy expires in 17 days on Oct 24, 2026"]
        },
        status: "EXPIRING_SOON",
        createdAt: "2026-02-10T14:20:00Z"
      },
      {
        id: "doc-mat-w9",
        type: "W9",
        fileName: "W9_MidAtlantic_Signed.pdf",
        extractedData: {
          vendorName: "Mid-Atlantic Freight Corp",
          taxIdOrEin: "XX-XXX4102",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-02-10T14:25:00Z"
      }
    ],
    createdAt: "2026-02-10T14:20:00Z",
    updatedAt: "2026-10-05T09:12:00Z"
  },
  {
    id: "3",
    name: "Summit Facility Care",
    contactEmail: "accounting@summit.io",
    type: "Facilities",
    status: "ACTION_REQUIRED",
    documents: [
      {
        id: "doc-summit-coi",
        type: "COI",
        fileName: "COI_Summit_2027.pdf",
        extractedData: {
          vendorName: "Summit Facility Care LLC",
          expirationDate: "2027-08-14",
          coverageAmount: 1000000,
          coverageLabel: "$1,000,000 GL",
          isSigned: true,
          confidenceScore: 0.96,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-03-01T11:00:00Z"
      },
      {
        id: "doc-summit-w9",
        type: "W9",
        fileName: "W9_Summit_MissingEIN.pdf",
        extractedData: {
          vendorName: "Summit Facility Care LLC",
          taxIdOrEin: undefined,
          isSigned: false,
          confidenceScore: 0.88,
          missingFields: ["Missing Employer Identification Number (EIN)", "Signature block incomplete"]
        },
        status: "INCOMPLETE",
        createdAt: "2026-03-01T11:05:00Z"
      }
    ],
    createdAt: "2026-03-01T11:00:00Z",
    updatedAt: "2026-03-01T11:05:00Z"
  },
  {
    id: "4",
    name: "Commercial Express HVAC",
    contactEmail: "office@cexpress.com",
    type: "Facilities",
    status: "VERIFIED",
    documents: [
      {
        id: "doc-cexpress-coi",
        type: "COI",
        fileName: "COI_CommercialExpress_2027.pdf",
        extractedData: {
          vendorName: "Commercial Express HVAC Inc",
          expirationDate: "2027-02-10",
          coverageAmount: 1000000,
          coverageLabel: "$1,000,000 GL",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-04-18T09:15:00Z"
      },
      {
        id: "doc-cexpress-w9",
        type: "W9",
        fileName: "W9_CommercialExpress.pdf",
        extractedData: {
          vendorName: "Commercial Express HVAC Inc",
          taxIdOrEin: "XX-XXX2019",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-04-18T09:20:00Z"
      }
    ],
    createdAt: "2026-04-18T09:15:00Z",
    updatedAt: "2026-04-18T09:20:00Z"
  },
  {
    id: "5",
    name: "SteelCore Engineering",
    contactEmail: "invoices@steelcore.com",
    type: "Other",
    status: "VERIFIED",
    documents: [
      {
        id: "doc-steelcore-coi",
        type: "COI",
        fileName: "COI_SteelCore_Umbrella.pdf",
        extractedData: {
          vendorName: "SteelCore Engineering Group",
          expirationDate: "2027-01-04",
          coverageAmount: 5000000,
          coverageLabel: "$5,000,000 Umbrella",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-05-12T08:00:00Z"
      },
      {
        id: "doc-steelcore-w9",
        type: "W9",
        fileName: "W9_SteelCore_2026.pdf",
        extractedData: {
          vendorName: "SteelCore Engineering Group",
          taxIdOrEin: "XX-XXX8812",
          isSigned: true,
          confidenceScore: 0.98,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-05-12T08:05:00Z"
      }
    ],
    createdAt: "2026-05-12T08:00:00Z",
    updatedAt: "2026-05-12T08:05:00Z"
  },
  {
    id: "6",
    name: "Insight Tech Partners",
    contactEmail: "billing@insighttech.com",
    type: "Staffing",
    status: "EXPIRING_SOON",
    documents: [
      {
        id: "doc-insight-coi",
        type: "COI",
        fileName: "COI_InsightTech_Signed.pdf",
        extractedData: {
          vendorName: "Insight Tech Partners LLC",
          expirationDate: "2026-10-20",
          coverageAmount: 2000000,
          coverageLabel: "$2,000,000 GL",
          isSigned: true,
          confidenceScore: 0.97,
          missingFields: ["Policy expires in 13 days on Oct 20, 2026"]
        },
        status: "EXPIRING_SOON",
        createdAt: "2026-05-15T11:00:00Z"
      },
      {
        id: "doc-insight-w9",
        type: "W9",
        fileName: "W9_InsightTech.pdf",
        extractedData: {
          vendorName: "Insight Tech Partners LLC",
          taxIdOrEin: "XX-XXX4109",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-05-15T11:05:00Z"
      }
    ],
    createdAt: "2026-05-15T11:00:00Z",
    updatedAt: "2026-10-05T09:12:00Z"
  },
  {
    id: "7",
    name: "FlexTalent Solutions Inc",
    contactEmail: "compliance@flextalent.co",
    type: "HR Platform",
    status: "ACTION_REQUIRED",
    documents: [
      {
        id: "doc-flextalent-coi",
        type: "COI",
        fileName: "COI_FlexTalent_2027.pdf",
        extractedData: {
          vendorName: "FlexTalent Solutions Inc",
          expirationDate: "2027-08-12",
          coverageAmount: 2000000,
          coverageLabel: "$2,000,000 GL",
          isSigned: true,
          confidenceScore: 0.94,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-06-01T14:00:00Z"
      },
      {
        id: "doc-flextalent-w9",
        type: "W9",
        fileName: "W9_FlexTalent_Unsigned.pdf",
        extractedData: {
          vendorName: "FlexTalent Solutions Inc",
          taxIdOrEin: "XX-XXX9281",
          isSigned: false,
          confidenceScore: 0.91,
          missingFields: ["Signature and date missing from Form W-9"]
        },
        status: "INCOMPLETE",
        createdAt: "2026-06-01T14:05:00Z"
      }
    ],
    createdAt: "2026-06-01T14:00:00Z",
    updatedAt: "2026-06-01T14:05:00Z"
  }
];

const SEED_LOGS: AuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-10-01T08:00:00Z",
    vendorId: "1",
    vendorName: "Apex Logistics LLC",
    action: "Policy Expired",
    details: "Certificate of Insurance expired on 2026-09-30. Automatic payment freeze placed on vendor account.",
    status: "error"
  },
  {
    id: "log-2",
    timestamp: "2026-10-05T09:12:00Z",
    vendorId: "2",
    vendorName: "Mid-Atlantic Freight",
    action: "Expiring Warning",
    details: "General Liability policy expires on 2026-10-24 (17 days remaining). 30-day renewal notice scheduled.",
    status: "warning"
  },
  {
    id: "log-3",
    timestamp: "2026-10-07T07:45:00Z",
    vendorId: "3",
    vendorName: "Summit Facility Care",
    action: "Missing EIN",
    details: "Form W-9 received without valid Tax ID / EIN. Hold placed on AP payments until corrected form uploaded.",
    status: "error"
  }
];

const DEFAULT_SETTINGS: Settings = {
  slackWebhookUrl: "https://hooks.slack.com/services/T00/B00/XXXX",
  teamsWebhookUrl: "https://acme.webhook.office.com/webhookb2/XXXX",
  alertEmail: "ap-alerts@acmelogistics.com, controller@acmelogistics.com",
  alertDestination: "slack",
  channels: {
    slack: {
      enabled: true,
      webhookUrl: "https://hooks.slack.com/services/T00/B00/XXXX",
      channelTarget: "#ap-compliance (Shared AP & Procurement Team)",
    },
    teams: {
      enabled: false,
      webhookUrl: "https://acme.webhook.office.com/webhookb2/XXXX",
      channelTarget: "Finance / AP Teams Channel",
    },
    email: {
      enabled: true,
      recipients: "ap-alerts@acmelogistics.com, controller@acmelogistics.com",
      mode: "multi",
      frequency: "both",
    },
  },
  triggers: {
    expiredCoi: true,
    missingW9: true,
    upcomingExpiry: true,
  },
  companyName: "Acme Logistics Inc.",
  requireSignedW9: true,
  minCoiCoverage: 1000000,
  noticeLeadDays: 30,
  autoHoldEnforcement: true,
  inboundEmailAlias: "intake@compliance.acmelogistics.com",
  defaultApSignoffName: "Acme AP Compliance Division",
};

export function getDb(): DatabaseState {
  ensureDbDir();
  if (!fs.existsSync(DB_FILE)) {
    const initialState: DatabaseState = {
      vendors: generate148Vendors(),
      logs: SEED_LOGS,
      settings: DEFAULT_SETTINGS
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), "utf-8");
    return initialState;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!parsed.vendors || parsed.vendors.length < 50) {
      parsed.vendors = generate148Vendors();
      parsed.logs = SEED_LOGS;
    }
    parsed.settings = {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings || {}),
      channels: {
        ...DEFAULT_SETTINGS.channels,
        ...(parsed.settings?.channels || {}),
      },
      triggers: {
        ...DEFAULT_SETTINGS.triggers,
        ...(parsed.settings?.triggers || {}),
      },
    };
    return parsed;
  } catch (err) {
    console.error("Failed to parse database, resetting to seeds", err);
    return {
      vendors: generate148Vendors(),
      logs: SEED_LOGS,
      settings: DEFAULT_SETTINGS
    };
  }
}

export function saveDb(state: DatabaseState) {
  ensureDbDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function addAuditLog(log: Omit<AuditLog, "id" | "timestamp">) {
  const db = getDb();
  const newLog: AuditLog = {
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    ...log
  };
  db.logs.unshift(newLog);
  if (db.logs.length > 100) {
    db.logs = db.logs.slice(0, 100);
  }
  saveDb(db);
  return newLog;
}
