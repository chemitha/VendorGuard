"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Scale,
  Mail,
  X,
  Check,
  Copy,
  Lock,
  Send,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users,
  User,
  SlidersHorizontal,
  Code,
  ArrowLeft,
  Monitor,
  Sun,
  Moon,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Activity,
  FileText,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Eye,
  Clock,
  Zap,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeliveryLogItem {
  id: string;
  timestamp: string;
  channel: "slack" | "teams" | "email";
  triggerType: "expired_coi" | "missing_w9" | "upcoming_expiry";
  vendorName: string;
  target: string;
  statusCode: number;
  statusText: string;
  latencyMs: number;
  requestHeaders: Record<string, string>;
  payload: any;
  responseBody: any;
}

const DEFAULT_DELIVERY_LOGS: DeliveryLogItem[] = [
  {
    id: "log-seed-1",
    timestamp: "Today at 01:14 PM",
    channel: "slack",
    triggerType: "expired_coi",
    vendorName: "Apex Freight Systems LLC",
    target: "#ap-compliance",
    statusCode: 200,
    statusText: "OK",
    latencyMs: 118,
    requestHeaders: {
      "Content-Type": "application/json",
      "User-Agent": "Acme-Compliance-Bot/2.4 (Enterprise)",
      "X-Acme-Tenant-ID": "acme-logistics-us-east-1",
      "X-Compliance-Event": "expired_coi",
    },
    payload: {
      channel: "#ap-compliance",
      username: "Acme Compliance Bot",
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "⚠️ ACME AP COMPLIANCE VIOLATION INTERCEPTED" },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: "*Vendor Entity:*\nApex Freight Systems LLC" },
            { type: "mrkdwn", text: "*Trigger Event:*\nPolicy Lapsed (Expired Sep 30, 2026)" },
            { type: "mrkdwn", text: "*Required GL:*\n$1,000,000 Minimum" },
            { type: "mrkdwn", text: "*Status:*\n🔴 AUTOMATIC AP PAYMENT FREEZE APPLIED" },
          ],
        },
      ],
    },
    responseBody: { ok: true, channel: "#ap-compliance", messageId: "msg_9f28a8d1", mode: "enterprise_sandbox" },
  },
  {
    id: "log-seed-2",
    timestamp: "Today at 12:45 PM",
    channel: "email",
    triggerType: "missing_w9",
    vendorName: "Beacon Security Systems",
    target: "ap-alerts@acmelogistics.com",
    statusCode: 200,
    statusText: "OK",
    latencyMs: 94,
    requestHeaders: {
      "Content-Type": "application/json",
      "User-Agent": "Acme-Compliance-Bot/2.4 (Enterprise)",
    },
    payload: {
      to: "ap-alerts@acmelogistics.com",
      from: "Acme Compliance Controller <compliance-alerts@acmelogistics.com>",
      subject: "[ACTION REQUIRED] Compliance Action Required: Missing Form W-9 - Beacon Security Systems",
      template: "compliance_violation_notice_v1",
    },
    responseBody: { ok: true, messageId: "email_b47c01ee" },
  },
  {
    id: "log-seed-3",
    timestamp: "Yesterday at 04:32 PM",
    channel: "teams",
    triggerType: "upcoming_expiry",
    vendorName: "Titan Facility Solutions",
    target: "Finance / AP Teams Channel",
    statusCode: 200,
    statusText: "OK",
    latencyMs: 142,
    requestHeaders: {
      "Content-Type": "application/json",
      "User-Agent": "Acme-Compliance-Bot/2.4 (Enterprise)",
    },
    payload: {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.5",
            body: [
              {
                type: "TextBlock",
                text: "⚠️ ADVANCE NOTICE: COI EXPIRING IN 30 DAYS",
                weight: "Bolder",
                size: "Medium",
                color: "Warning",
              },
              {
                type: "FactSet",
                facts: [
                  { title: "Vendor:", value: "Titan Facility Solutions" },
                  { title: "Expiration Date:", value: "Nov 14, 2026" },
                  { title: "Coverage:", value: "$1,000,000 General Liability" },
                ],
              },
            ],
          },
        },
      ],
    },
    responseBody: { ok: true, mode: "enterprise_sandbox" },
  },
];

export interface ChannelSettings {
  enabled: boolean;
  webhookUrl?: string;
  channelTarget?: string;
  recipients?: string;
  mode?: "single" | "multi";
  frequency?: "realtime" | "daily_summary" | "both";
}

export interface AppSettings {
  slackWebhookUrl: string;
  teamsWebhookUrl?: string;
  alertEmail?: string;
  alertDestination: "slack" | "teams" | "email";
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
  triggers: {
    expiredCoi: boolean;
    missingW9: boolean;
    upcomingExpiry: boolean;
  };
  companyName: string;
  requireSignedW9: boolean;
  minCoiCoverage: number;
  noticeLeadDays: number;
  autoHoldEnforcement: boolean;
  inboundEmailAlias: string;
  defaultApSignoffName?: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
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
      channelTarget: "Finance / AP Teams channel via Power Automate",
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

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSave: (updatedSettings: AppSettings) => Promise<void>;
  notify: (
    title: string,
    message: string,
    type?: "success" | "warning" | "error" | "info",
    badge?: string,
    autoDismissMs?: number,
    actionLabel?: string,
    onAction?: () => void,
    vendorId?: string
  ) => void;
  isDarkMode: boolean;
  setIsDarkMode?: (dark: boolean, e?: React.MouseEvent | { clientX?: number; clientY?: number }) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  appSettings,
  setAppSettings,
  onSave,
  notify,
  isDarkMode,
  setIsDarkMode,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "rules" | "inbound">("alerts");
  const [aliasCopied, setAliasCopied] = useState(false);
  const [payloadCopied, setPayloadCopied] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);
  const [expandedChannel, setExpandedChannel] = useState<"slack" | "teams" | "email" | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedThemeMode, setSelectedThemeMode] = useState<"system" | "light" | "dark" | null>(null);
  const activeThemeMode: "system" | "light" | "dark" = selectedThemeMode ?? (isDarkMode ? "dark" : "light");

  // Advanced Alert Channels state
  const [previewPlatform, setPreviewPlatform] = useState<"slack" | "teams" | "email">("slack");
  const [previewTrigger, setPreviewTrigger] = useState<"expired_coi" | "missing_w9" | "upcoming_expiry">("expired_coi");
  const [testingChannel, setTestingChannel] = useState<"slack" | "teams" | "email" | null>(null);
  const [channelLatency, setChannelLatency] = useState<Record<string, number | null>>({
    slack: 118,
    teams: 142,
    email: 94,
  });
  const [channelHealth, setChannelHealth] = useState<
    Record<string, { code: number; text: string; latency: number; isSuccess: boolean }>
  >({
    slack: { code: 200, text: "OK", latency: 118, isSuccess: true },
    teams: { code: 200, text: "OK", latency: 142, isSuccess: true },
    email: { code: 200, text: "Verified", latency: 94, isSuccess: true },
  });
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLogItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("acme_alert_delivery_logs");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }
    return DEFAULT_DELIVERY_LOGS;
  });
  const [selectedInspectLog, setSelectedInspectLog] = useState<DeliveryLogItem | null>(null);

  // Safe accessor for channels
  const channels = appSettings.channels || {
    slack: {
      enabled: true,
      webhookUrl: appSettings.slackWebhookUrl || "https://hooks.slack.com/services/T00/B00/XXXX",
      channelTarget: "#ap-compliance (Shared AP & Procurement Team)",
    },
    teams: {
      enabled: Boolean(
        appSettings.teamsWebhookUrl &&
          appSettings.teamsWebhookUrl.length > 0 &&
          appSettings.teamsWebhookUrl !== "https://acme.webhook.office.com/webhookb2/XXXX"
      ),
      webhookUrl: appSettings.teamsWebhookUrl || "https://acme.webhook.office.com/webhookb2/XXXX",
      channelTarget: "Finance / AP Teams channel via Power Automate",
    },
    email: {
      enabled: true,
      recipients: appSettings.alertEmail || "ap-alerts@acmelogistics.com, controller@acmelogistics.com",
      mode: "multi",
      frequency: "both",
    },
  };

  const activeChannelsCount = [
    channels.slack.enabled,
    channels.teams.enabled,
    channels.email.enabled,
  ].filter(Boolean).length;

  const updateChannel = (
    channel: "slack" | "teams" | "email",
    updates: Partial<ChannelSettings>
  ) => {
    setAppSettings((prev) => {
      const currentChannels = prev.channels || channels;
      const updated = {
        ...currentChannels,
        [channel]: {
          ...currentChannels[channel],
          ...updates,
        },
      };

      // Also keep backward-compatible top-level keys in sync
      const legacyUpdates: Partial<AppSettings> = {};
      if (channel === "slack" && updates.webhookUrl !== undefined) {
        legacyUpdates.slackWebhookUrl = updates.webhookUrl;
      }
      if (channel === "teams" && updates.webhookUrl !== undefined) {
        legacyUpdates.teamsWebhookUrl = updates.webhookUrl;
      }
      if (channel === "email" && updates.recipients !== undefined) {
        legacyUpdates.alertEmail = updates.recipients;
      }

      return {
        ...prev,
        ...legacyUpdates,
        channels: updated,
      };
    });
  };

  const toggleTrigger = (triggerKey: keyof AppSettings["triggers"]) => {
    setAppSettings((prev) => ({
      ...prev,
      triggers: {
        ...prev.triggers,
        [triggerKey]: !prev.triggers[triggerKey],
      },
    }));
  };

  const handleThemeChange = (mode: "system" | "light" | "dark", e?: React.MouseEvent) => {
    setSelectedThemeMode(mode);
    if (setIsDarkMode) {
      if (mode === "dark") {
        setIsDarkMode(true, e);
      } else if (mode === "light") {
        setIsDarkMode(false, e);
      } else {
        // System preference
        const prefersDark =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(prefersDark, e);
      }
    }
  };

  // Real Webhook Test Dispatch with HTTP post or high-fidelity simulation
  const handleTestDispatch = async (
    channel: "slack" | "teams" | "email",
    trigger: "expired_coi" | "missing_w9" | "upcoming_expiry" = previewTrigger
  ) => {
    setTestingChannel(channel);

    const targetDesc =
      channel === "slack"
        ? channels.slack.channelTarget || "#ap-compliance"
        : channel === "teams"
        ? channels.teams.channelTarget || "Finance / AP Teams Channel"
        : channels.email.recipients || "ap-alerts@acmelogistics.com";

    const webhookUrl =
      channel === "slack"
        ? channels.slack.webhookUrl
        : channel === "teams"
        ? channels.teams.webhookUrl
        : undefined;

    const vendorName =
      trigger === "expired_coi"
        ? "Apex Freight Systems LLC"
        : trigger === "missing_w9"
        ? "Beacon Security Systems"
        : "Titan Facility Solutions";

    try {
      const res = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          webhookUrl,
          channelTarget: targetDesc,
          recipients: channels.email.recipients,
          triggerType: trigger,
          vendorName,
        }),
      });

      const data = await res.json();
      const latency = data.latencyMs || Math.floor(Math.random() * 45) + 90;
      const isOk = Boolean(data.success && data.statusCode >= 200 && data.statusCode < 300);
      const statusCode = data.statusCode || (isOk ? 200 : 500);
      const statusText = data.statusText || (isOk ? "OK" : "Error");
      const channelLabel = channel === "slack" ? "Slack" : channel === "teams" ? "Teams" : "Email";

      setChannelLatency((prev) => ({ ...prev, [channel]: latency }));
      setChannelHealth((prev) => ({
        ...prev,
        [channel]: {
          code: statusCode,
          text: statusText,
          latency,
          isSuccess: isOk,
        },
      }));

      const now = new Date();
      const timeStr = `Today at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

      const newLogItem: DeliveryLogItem = {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        channel,
        triggerType: trigger,
        vendorName,
        target: targetDesc,
        statusCode,
        statusText,
        latencyMs: latency,
        requestHeaders: data.requestHeaders || {
          "Content-Type": "application/json",
          "User-Agent": "Acme-Compliance-Bot/2.4 (Enterprise)",
          "X-Acme-Tenant-ID": "acme-logistics-us-east-1",
          "X-Compliance-Event": trigger,
        },
        payload: data.payload,
        responseBody: data.responseBody || { ok: isOk, channel: targetDesc, statusCode },
      };

      setDeliveryLogs((prev) => {
        const updated = [newLogItem, ...prev].slice(0, 15);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("acme_alert_delivery_logs", JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      if (isOk) {
        notify(
          `${channelLabel} Dispatch Delivered`,
          `HTTP ${statusCode} ${statusText} (${latency}ms) delivered to ${targetDesc}. Recorded in delivery log.`,
          "success",
          channel.toUpperCase(),
          4500
        );
      } else {
        notify(
          `${channelLabel} Dispatch Failed`,
          `HTTP ${statusCode} ${statusText} (${latency}ms) from ${targetDesc}. Endpoint returned an error. Recorded in delivery log.`,
          "error",
          channel.toUpperCase(),
          6000
        );
      }
    } catch (err: any) {
      notify("Dispatch Ping Error", `Unable to deliver test payload: ${err.message}`, "error");
    } finally {
      setTestingChannel(null);
    }
  };

  const handleClearLogs = () => {
    setDeliveryLogs([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("acme_alert_delivery_logs");
      } catch {}
    }
    notify("Delivery History Cleared", "Recent webhook dispatch logs removed.", "info");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(appSettings);
      notify(
        "System Configuration Saved",
        `Saved: ${activeChannelsCount} alert channel(s) active, $${((appSettings.minCoiCoverage || 1000000) / 1000000).toFixed(0)}M GL threshold, ${appSettings.noticeLeadDays || 30}-day notice window.`,
        "success",
        "SETTINGS"
      );
      onClose();
    } catch {
      notify("Failed to save settings", "Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to generate live JSON payload based on selected platform & trigger
  const getDynamicJsonPayload = () => {
    const vendor =
      previewTrigger === "expired_coi"
        ? "Apex Freight Systems LLC"
        : previewTrigger === "missing_w9"
        ? "Beacon Security Systems"
        : "Titan Facility Solutions";

    if (previewPlatform === "slack") {
      return JSON.stringify(
        {
          channel: channels.slack.channelTarget || "#ap-compliance",
          username: "Acme Compliance Bot",
          icon_emoji: ":shield:",
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text:
                  previewTrigger === "expired_coi"
                    ? "⚠️ ACME AP COMPLIANCE VIOLATION INTERCEPTED"
                    : previewTrigger === "missing_w9"
                    ? "📋 ACTION REQUIRED: MISSING FORM W-9"
                    : "⏳ 30-DAY ADVANCE NOTICE: COI EXPIRING",
                emoji: true,
              },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Vendor Entity:*\n${vendor}` },
                {
                  type: "mrkdwn",
                  text:
                    previewTrigger === "expired_coi"
                      ? "*Deficiency:*\nGeneral Liability Policy Lapsed"
                      : previewTrigger === "missing_w9"
                      ? "*Deficiency:*\nMissing IRS Form W-9 (TIN)"
                      : "*Notice Window:*\nExpires in 28 Days (Nov 14)",
                },
                { type: "mrkdwn", text: "*Policy Requirement:*\n$1,000,000 GL Coverage Required" },
                {
                  type: "mrkdwn",
                  text:
                    previewTrigger === "expired_coi"
                      ? "*AP Status:*\n🔴 PAYMENT FREEZE APPLIED"
                      : previewTrigger === "missing_w9"
                      ? "*AP Status:*\n🟡 1099 WITHHOLDING HOLD"
                      : "*AP Status:*\n🟢 ACTIVE (Notice Queued)",
                },
              ],
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "Inspect in Audit Ledger" },
                  style: "primary",
                },
                {
                  type: "button",
                  text: { type: "plain_text", text: "Request Renewal Document" },
                },
              ],
            },
          ],
        },
        null,
        2
      );
    } else if (previewPlatform === "teams") {
      return JSON.stringify(
        {
          type: "message",
          attachments: [
            {
              contentType: "application/vnd.microsoft.card.adaptive",
              content: {
                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                type: "AdaptiveCard",
                version: "1.5",
                body: [
                  {
                    type: "TextBlock",
                    text:
                      previewTrigger === "expired_coi"
                        ? "⚠️ AP COMPLIANCE HOLD: POLICY DEFICIENCY"
                        : previewTrigger === "missing_w9"
                        ? "📋 ACTION REQUIRED: MISSING TAX ID / W-9"
                        : "⏳ ADVANCE NOTICE: POLICY EXPIRATION",
                    weight: "Bolder",
                    size: "Medium",
                    color: previewTrigger === "expired_coi" ? "Attention" : "Warning",
                  },
                  {
                    type: "FactSet",
                    facts: [
                      { title: "Vendor:", value: vendor },
                      {
                        title: "Trigger:",
                        value:
                          previewTrigger === "expired_coi"
                            ? "COI Policy Lapsed (Sep 30, 2026)"
                            : previewTrigger === "missing_w9"
                            ? "IRS Form W-9 Missing Signature / TIN"
                            : "COI Expiring in 28 Days",
                      },
                      { title: "GL Requirement:", value: "$1,000,000 Minimum" },
                      {
                        title: "AP Enforcement:",
                        value:
                          previewTrigger === "expired_coi"
                            ? "Automatic Invoice Freeze Active"
                            : "Standard Notice Queued",
                      },
                    ],
                  },
                ],
                actions: [
                  {
                    type: "Action.OpenUrl",
                    title: "Open Compliance Ledger",
                    url: "https://compliance.acmelogistics.com/ledger",
                  },
                ],
              },
            },
          ],
        },
        null,
        2
      );
    } else {
      return JSON.stringify(
        {
          to: channels.email.recipients || "ap-alerts@acmelogistics.com",
          from: "Acme Compliance Controller <compliance-alerts@acmelogistics.com>",
          subject: `[ACTION REQUIRED] Compliance Alert: ${vendor}`,
          template: "compliance_violation_notice_v1",
          data: {
            vendorName: vendor,
            trigger: previewTrigger,
            coverageRequired: "$1,000,000 GL",
            paymentHoldEnforced: previewTrigger === "expired_coi",
            effectiveDate: "2026-10-15",
          },
        },
        null,
        2
      );
    }
  };

  const sampleJsonPayload = getDynamicJsonPayload();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="settings-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 cursor-pointer"
        >
          <motion.div
            key="settings-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-[95vw] max-w-[1580px] h-[90vh] max-h-[94vh] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-zinc-100 shadow-2xl shadow-slate-900/10 dark:shadow-black/60 flex flex-col lg:flex-row overflow-hidden cursor-default font-sans antialiased transition-colors"
          >
          {/* ========================================================= */}
          {/* DESKTOP DYNAMIC SIDEBAR (scales 20% to 26%, collapses on tablet and mobile < 1024px) */}
          {/* ========================================================= */}
          <aside className="hidden lg:flex lg:w-[24%] lg:min-w-[260px] lg:max-w-[340px] xl:w-[22%] xl:max-w-[360px] shrink-0 flex-col justify-between border-r border-slate-200 dark:border-zinc-800/80 bg-slate-50/90 dark:bg-[#121316] p-4 lg:p-6 select-none transition-all duration-200">
            {/* Top Navigation */}
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-zinc-400 uppercase mb-4 px-2 truncate">
                SYSTEM SETTINGS &amp; INTEGRATIONS
              </div>

              <nav className="space-y-1">
                {/* 1. Alert Channels */}
                <button
                  type="button"
                  onClick={() => setActiveTab("alerts")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    activeTab === "alerts"
                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold border border-slate-200/80 dark:border-transparent"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <Bell className="w-4 h-4 text-slate-500 dark:text-zinc-300 shrink-0" />
                    <span className="truncate">Alert Channels (Active)</span>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-700/80 text-slate-700 dark:text-zinc-200 text-[10px] font-mono flex items-center justify-center font-bold shrink-0 ml-1.5">
                    {activeChannelsCount}
                  </span>
                </button>

                {/* 2. Compliance Rules */}
                <button
                  type="button"
                  onClick={() => setActiveTab("rules")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    activeTab === "rules"
                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold border border-slate-200/80 dark:border-transparent"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <Scale className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0" />
                    <span className="truncate">Compliance Rules</span>
                  </div>
                </button>

                {/* 3. Inbound Mail Routing */}
                <button
                  type="button"
                  onClick={() => setActiveTab("inbound")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    activeTab === "inbound"
                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold border border-slate-200/80 dark:border-transparent"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <Mail className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0" />
                    <span className="truncate">Inbound Mail Routing</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Bottom Controls of Sidebar: Security Badge & Theme Switcher */}
            <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-zinc-800/80">
              {/* Admin Access Badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-300 font-medium shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
                <span className="truncate">Admin Access: Finance Controller</span>
              </div>

              {/* Theme Switcher Segmented Control */}
              <div className="flex items-center justify-between bg-slate-200/70 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-lg p-1 text-[11px] text-slate-500 dark:text-zinc-400">
                <button
                  type="button"
                  onClick={(e) => handleThemeChange("system", e)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md transition-all cursor-pointer font-medium",
                    activeThemeMode === "system"
                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "hover:text-slate-900 dark:hover:text-zinc-200 text-slate-600 dark:text-zinc-400"
                  )}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>System</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleThemeChange("light", e)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md transition-all cursor-pointer font-medium",
                    activeThemeMode === "light"
                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "hover:text-slate-900 dark:hover:text-zinc-200 text-slate-600 dark:text-zinc-400"
                  )}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleThemeChange("dark", e)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md transition-all cursor-pointer font-medium",
                    activeThemeMode === "dark"
                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "hover:text-slate-900 dark:hover:text-zinc-200 text-slate-600 dark:text-zinc-400"
                  )}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* COMPACT MOBILE & TABLET HEADER & TABS (< 1024px) */}
          {/* ========================================================= */}
          <div className="lg:hidden border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#121316] p-3 sm:p-4 shrink-0 transition-colors">
            {/* Top Bar with Back Arrow, Title, and Close */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <span className="text-slate-300 dark:text-zinc-700">|</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  System Settings &amp; Integrations
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Horizontal Tabs with Active Underline */}
            <div className="flex items-center gap-3 sm:gap-6 text-xs overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-zinc-800/80 -mb-3 sm:-mb-4 px-1 pr-6">
              <button
                type="button"
                onClick={() => setActiveTab("alerts")}
                className={cn(
                  "pb-2.5 sm:pb-3 font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 flex items-center gap-1.5 shrink-0",
                  activeTab === "alerts"
                    ? "border-sky-600 dark:border-sky-500 text-slate-900 dark:text-white"
                    : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                )}
              >
                <span>Alert Channels</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[10px] font-mono font-bold">
                  {activeChannelsCount} Active
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rules")}
                className={cn(
                  "pb-2.5 sm:pb-3 font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 shrink-0",
                  activeTab === "rules"
                    ? "border-sky-600 dark:border-sky-500 text-slate-900 dark:text-white"
                    : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                )}
              >
                Compliance Rules
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("inbound")}
                className={cn(
                  "pb-2.5 sm:pb-3 font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 shrink-0",
                  activeTab === "inbound"
                    ? "border-sky-600 dark:border-sky-500 text-slate-900 dark:text-white"
                    : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                )}
              >
                Inbound Mail Routing
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MAIN CONTENT AREA */}
          {/* ========================================================= */}
          <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0c0d0f] overflow-y-auto overflow-x-hidden transition-colors">
            {/* Top Header of Main Area (Desktop >= 1024px) */}
            <div className="hidden lg:flex items-center justify-between p-5 lg:p-6 pb-4 border-b border-slate-200 dark:border-zinc-800/80 shrink-0 gap-4">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  CONNECTED ALERT CHANNELS
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Manage where automated compliance alerts, hold notices, and audit escalations are sent.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Active Channels Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0 whitespace-nowrap shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="whitespace-nowrap font-medium">{activeChannelsCount} of 3 channels active</span>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  title="Close settings"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            <div className="p-4 sm:p-6 space-y-5 flex-1">
              {/* ========================================================= */}
              {/* TAB 1: ALERT CHANNELS */}
              {/* ========================================================= */}
              {activeTab === "alerts" && (
                <div className="space-y-5">
                  {/* Compact Header Label (< 1024px) */}
                  <div className="lg:hidden flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Connected Alert Channels</h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Manage where automated compliance alerts, hold notices, and audit escalations are sent.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] font-mono shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {activeChannelsCount} of 3 Active
                    </span>
                  </div>

                  {/* 1. STACKED CONNECTOR ROWS */}
                  <div className="space-y-3">
                    {/* -------------------------------------------------- */}
                    {/* CONNECTOR 1: SLACK WEBHOOK */}
                    {/* -------------------------------------------------- */}
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 overflow-hidden transition-all hover:border-slate-300 dark:hover:border-zinc-700 shadow-2xs">
                      <div className="p-4 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Slack 4-Color Flower / Hashtag Icon */}
                          <div className="w-9 h-9 rounded-lg bg-[#4A154B]/10 dark:bg-[#4A154B]/20 border border-[#4A154B]/30 dark:border-[#4A154B]/50 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M6 15a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2a2 2 0 0 1-2 2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5z"
                                fill="#E01E5A"
                              />
                              <path
                                d="M9 6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2a2 2 0 0 1-2 2zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5z"
                                fill="#36C5F0"
                              />
                              <path
                                d="M18 9a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2a2 2 0 0 1 2-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5z"
                                fill="#2EB67D"
                              />
                              <path
                                d="M15 18a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2a2 2 0 0 1 2-2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z"
                                fill="#ECB22E"
                              />
                            </svg>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">Slack Webhook</span>
                              {channels.slack.enabled ? (
                                channelHealth.slack.isSuccess ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active • {channelHealth.slack.latency}ms ({channelHealth.slack.code} {channelHealth.slack.text})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Error • {channelHealth.slack.latency}ms (HTTP {channelHealth.slack.code} {channelHealth.slack.text})
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700">
                                  Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                              Dispatches interactive Block Kit cards to {channels.slack.channelTarget || "#ap-compliance"}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons: Ping & Configure */}
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => handleTestDispatch("slack")}
                            disabled={testingChannel === "slack"}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/70 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                            title="Ping Slack webhook"
                          >
                            {testingChannel === "slack" ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-zinc-300" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span>{testingChannel === "slack" ? "Pinging..." : "Ping"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedChannel(expandedChannel === "slack" ? null : "slack")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/70 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium transition-all cursor-pointer shadow-2xs"
                          >
                            <span>Configure</span>
                            {expandedChannel === "slack" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Configuration Drawer */}
                      <AnimatePresence>
                        {expandedChannel === "slack" && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="border-t border-slate-200 dark:border-zinc-800/80 bg-slate-100/70 dark:bg-zinc-950/60 p-4 space-y-4"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800/60">
                              <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">Channel Activation</span>
                              <button
                                type="button"
                                onClick={() => updateChannel("slack", { enabled: !channels.slack.enabled })}
                                className={cn(
                                  "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                                  channels.slack.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                                    channels.slack.enabled ? "translate-x-5" : "translate-x-0"
                                  )}
                                />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                                  Incoming Webhook URL
                                </label>
                                <input
                                  type="url"
                                  value={channels.slack.webhookUrl || ""}
                                  onChange={(e) => updateChannel("slack", { webhookUrl: e.target.value })}
                                  placeholder="https://hooks.slack.com/services/..."
                                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-slate-500 dark:focus:border-zinc-500 font-mono transition-colors"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                                  Target Slack Channel / Topic
                                </label>
                                <input
                                  type="text"
                                  value={channels.slack.channelTarget || ""}
                                  onChange={(e) => updateChannel("slack", { channelTarget: e.target.value })}
                                  placeholder="#ap-compliance"
                                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-slate-500 dark:focus:border-zinc-500 transition-colors"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                                Dispatches Block Kit rich action cards with payment hold triggers.
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTestDispatch("slack")}
                                disabled={testingChannel === "slack"}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium border border-slate-300 dark:border-zinc-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                              >
                                {testingChannel === "slack" ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-slate-600 dark:text-zinc-300" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>{testingChannel === "slack" ? "Dispatching..." : "Send Test Block Kit Card"}</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* CONNECTOR 2: MICROSOFT TEAMS CONNECTOR */}
                    {/* -------------------------------------------------- */}
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 overflow-hidden transition-all hover:border-slate-300 dark:hover:border-zinc-700 shadow-2xs">
                      <div className="p-4 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Microsoft Teams Vibrant Blue 'T' Icon */}
                          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                            T
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">Microsoft Teams Connector</span>
                              {channels.teams.enabled ? (
                                channelHealth.teams.isSuccess ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active • {channelHealth.teams.latency}ms ({channelHealth.teams.code} {channelHealth.teams.text})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Error • {channelHealth.teams.latency}ms (HTTP {channelHealth.teams.code} {channelHealth.teams.text})
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700">
                                  Disconnected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                              Adaptive Cards dispatched to {channels.teams.channelTarget || "Finance / AP Teams channel via Power Automate"}
                            </p>
                          </div>
                        </div>

                        {/* Action: Connect / Configure / Ping */}
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                          {channels.teams.enabled && (
                            <button
                              type="button"
                              onClick={() => handleTestDispatch("teams")}
                              disabled={testingChannel === "teams"}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/70 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                              title="Ping Teams webhook"
                            >
                              {testingChannel === "teams" ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-zinc-300" />
                              ) : (
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                              )}
                              <span>{testingChannel === "teams" ? "Pinging..." : "Ping"}</span>
                            </button>
                          )}
                          {channels.teams.enabled ? (
                            <button
                              type="button"
                              onClick={() => setExpandedChannel(expandedChannel === "teams" ? null : "teams")}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/70 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium transition-all cursor-pointer shadow-2xs"
                            >
                              <span>Configure</span>
                              {expandedChannel === "teams" ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                updateChannel("teams", { enabled: true });
                                setExpandedChannel("teams");
                              }}
                              className="shrink-0 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Configuration Drawer */}
                      <AnimatePresence>
                        {expandedChannel === "teams" && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="border-t border-slate-200 dark:border-zinc-800/80 bg-slate-100/70 dark:bg-zinc-950/60 p-4 space-y-4"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800/60">
                              <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">Connector Status</span>
                              <button
                                type="button"
                                onClick={() => updateChannel("teams", { enabled: !channels.teams.enabled })}
                                className={cn(
                                  "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                                  channels.teams.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                                    channels.teams.enabled ? "translate-x-5" : "translate-x-0"
                                  )}
                                />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                                  Power Automate / Teams Webhook URL
                                </label>
                                <input
                                  type="url"
                                  value={channels.teams.webhookUrl || ""}
                                  onChange={(e) => updateChannel("teams", { webhookUrl: e.target.value })}
                                  placeholder="https://acme.webhook.office.com/..."
                                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-slate-500 dark:focus:border-zinc-500 font-mono transition-colors"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                                  Channel / Team Target
                                </label>
                                <input
                                  type="text"
                                  value={channels.teams.channelTarget || ""}
                                  onChange={(e) => updateChannel("teams", { channelTarget: e.target.value })}
                                  placeholder="Finance / AP Teams channel via Power Automate"
                                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-slate-500 dark:focus:border-zinc-500 transition-colors"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                                Dispatches Adaptive Cards (JSON v1.5) with instant review buttons.
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTestDispatch("teams")}
                                disabled={testingChannel === "teams"}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium border border-slate-300 dark:border-zinc-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                              >
                                {testingChannel === "teams" ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-slate-600 dark:text-zinc-300" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>{testingChannel === "teams" ? "Dispatching..." : "Send Test Adaptive Card"}</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* CONNECTOR 3: EMAIL DISTRIBUTION ALERTS */}
                    {/* -------------------------------------------------- */}
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 overflow-hidden transition-all hover:border-slate-300 dark:hover:border-zinc-700 shadow-2xs">
                      <div className="p-4 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Navy Rounded Container with Mail Icon */}
                          <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">Email Distribution Alerts</span>
                              {channels.email.enabled ? (
                                channelHealth.email.isSuccess ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active • {channelHealth.email.latency}ms ({channelHealth.email.code} {channelHealth.email.text})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Error • {channelHealth.email.latency}ms (HTTP {channelHealth.email.code} {channelHealth.email.text})
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700">
                                  Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                              Multi-person distribution list active ({channels.email.recipients ? channels.email.recipients.split(",").length : 2} addresses)
                            </p>
                          </div>
                        </div>

                        {/* Action: Ping & Configure */}
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => handleTestDispatch("email")}
                            disabled={testingChannel === "email"}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/70 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                            title="Ping Email service"
                          >
                            {testingChannel === "email" ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-zinc-300" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span>{testingChannel === "email" ? "Pinging..." : "Ping"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedChannel(expandedChannel === "email" ? null : "email")}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/70 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium transition-all cursor-pointer shadow-2xs"
                          >
                            <span>Configure</span>
                            {expandedChannel === "email" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Configuration Drawer */}
                      <AnimatePresence>
                        {expandedChannel === "email" && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="border-t border-slate-200 dark:border-zinc-800/80 bg-slate-100/70 dark:bg-zinc-950/60 p-4 space-y-4"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800/60">
                              <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">Email Routing Mode</span>
                              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs">
                                <button
                                  type="button"
                                  onClick={() => updateChannel("email", { mode: "single" })}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1",
                                    channels.email.mode === "single"
                                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                                  )}
                                >
                                  <User className="w-3 h-3" />
                                  <span>Single Person</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateChannel("email", { mode: "multi" })}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1",
                                    channels.email.mode === "multi"
                                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                                  )}
                                >
                                  <Users className="w-3 h-3" />
                                  <span>Multi-Person / Distro</span>
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                                Distribution Mailbox / Comma-Separated Addresses
                              </label>
                              <input
                                type="text"
                                value={channels.email.recipients || ""}
                                onChange={(e) => updateChannel("email", { recipients: e.target.value })}
                                placeholder="ap-alerts@acmelogistics.com, controller@acmelogistics.com"
                                className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-slate-500 dark:focus:border-zinc-500 font-mono transition-colors"
                              />
                              <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">
                                Corporate IT standard: route to a shared distribution group or mailbox to alert the entire AP desk simultaneously.
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-600 dark:text-zinc-400">Cadence:</span>
                                <div className="flex items-center gap-1 text-[11px]">
                                  {(["realtime", "daily_summary", "both"] as const).map((freq) => (
                                    <button
                                      key={freq}
                                      type="button"
                                      onClick={() => updateChannel("email", { frequency: freq })}
                                      className={cn(
                                        "px-2 py-0.5 rounded border text-[10.5px] transition-all cursor-pointer font-medium",
                                        channels.email.frequency === freq
                                          ? "bg-slate-900 dark:bg-zinc-800 text-white border-slate-900 dark:border-zinc-600 shadow-2xs"
                                          : "bg-white dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200"
                                      )}
                                    >
                                      {freq === "realtime" ? "Real-time" : freq === "daily_summary" ? "Daily Digest" : "Both"}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleTestDispatch("email")}
                                disabled={testingChannel === "email"}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium border border-slate-300 dark:border-zinc-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                              >
                                {testingChannel === "email" ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-slate-600 dark:text-zinc-300" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>{testingChannel === "email" ? "Dispatching..." : "Send Test Email"}</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* 2. DISPATCH TRIGGERS (APPLIED ACROSS ALL CHANNELS) */}
                  {/* -------------------------------------------------- */}
                  <div>
                    <div className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-zinc-400 uppercase mb-2.5">
                      DISPATCH TRIGGERS (APPLIED ACROSS ALL ACTIVE CHANNELS)
                    </div>

                    {/* Desktop View: 3 Side-by-Side Cards */}
                    <div className="hidden sm:grid grid-cols-3 gap-3">
                      {/* Trigger 1: Expired COI / Lapsed Policy */}
                      <div
                        onClick={() => toggleTrigger("expiredCoi")}
                        className={cn(
                          "rounded-xl border p-3.5 cursor-pointer transition-all select-none",
                          appSettings.triggers.expiredCoi
                            ? "border-slate-400 dark:border-zinc-700 bg-white dark:bg-zinc-900/90 shadow-xs ring-1 ring-slate-900/5 dark:ring-transparent"
                            : "border-slate-200 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/30 opacity-70 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                              appSettings.triggers.expiredCoi
                                ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-zinc-950"
                                : "border-slate-300 dark:border-zinc-600 bg-slate-100 dark:bg-zinc-800"
                            )}
                          >
                            {appSettings.triggers.expiredCoi && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">Expired COI / Lapsed Policy</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-snug pl-6">
                          Instant hold notice on policy expiration.
                        </p>
                      </div>

                      {/* Trigger 2: Missing / Invalid W-9 */}
                      <div
                        onClick={() => toggleTrigger("missingW9")}
                        className={cn(
                          "rounded-xl border p-3.5 cursor-pointer transition-all select-none",
                          appSettings.triggers.missingW9
                            ? "border-slate-400 dark:border-zinc-700 bg-white dark:bg-zinc-900/90 shadow-xs ring-1 ring-slate-900/5 dark:ring-transparent"
                            : "border-slate-200 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/30 opacity-70 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                              appSettings.triggers.missingW9
                                ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-zinc-950"
                                : "border-slate-300 dark:border-zinc-600 bg-slate-100 dark:bg-zinc-800"
                            )}
                          >
                            {appSettings.triggers.missingW9 && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">Missing / Invalid W-9</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-snug pl-6">
                          Dispatches alert on missing TIN/EIN or uncertified forms.
                        </p>
                      </div>

                      {/* Trigger 3: 30-Day Expiration Warning */}
                      <div
                        onClick={() => toggleTrigger("upcomingExpiry")}
                        className={cn(
                          "rounded-xl border p-3.5 cursor-pointer transition-all select-none",
                          appSettings.triggers.upcomingExpiry
                            ? "border-slate-400 dark:border-zinc-700 bg-white dark:bg-zinc-900/90 shadow-xs ring-1 ring-slate-900/5 dark:ring-transparent"
                            : "border-slate-200 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/30 opacity-70 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                              appSettings.triggers.upcomingExpiry
                                ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-zinc-950"
                                : "border-slate-300 dark:border-zinc-600 bg-slate-100 dark:bg-zinc-800"
                            )}
                          >
                            {appSettings.triggers.upcomingExpiry && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">30-Day Expiration Warning</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-snug pl-6">
                          Advance renewal notice for proactive outreach.
                        </p>
                      </div>
                    </div>

                    {/* Mobile View: Stacked List with Switches */}
                    <div className="sm:hidden space-y-3 divide-y divide-slate-200 dark:divide-zinc-800/80">
                      {/* Mobile Row 1 */}
                      <div className="pt-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">Expired COI / Lapsed Policy</div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400">Instant hold notice on policy expiration.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTrigger("expiredCoi")}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                            appSettings.triggers.expiredCoi ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                          )}
                        >
                          <span
                            className={cn(
                              "w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                              appSettings.triggers.expiredCoi ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      {/* Mobile Row 2 */}
                      <div className="pt-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">Missing / Invalid W-9</div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400">Dispatches alert on missing TIN/EIN or uncertified forms.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTrigger("missingW9")}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                            appSettings.triggers.missingW9 ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                          )}
                        >
                          <span
                            className={cn(
                              "w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                              appSettings.triggers.missingW9 ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      {/* Mobile Row 3 */}
                      <div className="pt-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">30-Day Expiration Warning</div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400">Advance renewal notice for proactive outreach.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTrigger("upcomingExpiry")}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                            appSettings.triggers.upcomingExpiry ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                          )}
                        >
                          <span
                            className={cn(
                              "w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                              appSettings.triggers.upcomingExpiry ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* 3. RECENT DISPATCH DELIVERY LOGS (ENTERPRISE AUDIT TRAIL) */}
                  {/* -------------------------------------------------- */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121316]/90 overflow-hidden shadow-2xs">
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-900/70 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Recent Dispatch Delivery Logs
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            Real-time webhook handshake records and broker delivery receipts
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestDispatch("slack")}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch Test Alert</span>
                        </button>
                        {deliveryLogs.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearLogs}
                            className="p-1 rounded-md text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Clear delivery history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Table of delivery records */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-zinc-800/80 text-[10.5px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-slate-50/50 dark:bg-zinc-900/40">
                            <th className="py-2.5 px-3.5">Time</th>
                            <th className="py-2.5 px-3.5">Channel</th>
                            <th className="py-2.5 px-3.5">Trigger Event &amp; Target</th>
                            <th className="py-2.5 px-3.5">Status</th>
                            <th className="py-2.5 px-3.5">Latency</th>
                            <th className="py-2.5 px-3.5 text-right">Inspect</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-mono text-[11.5px]">
                          {deliveryLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500 font-sans">
                                No recent dispatch events. Click &ldquo;Dispatch Test Alert&rdquo; or &ldquo;Ping&rdquo; on any channel to test.
                              </td>
                            </tr>
                          ) : (
                            deliveryLogs.slice(0, 8).map((log) => (
                              <tr
                                key={log.id}
                                className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                              >
                                <td className="py-2.5 px-3.5 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                                  {log.timestamp}
                                </td>
                                <td className="py-2.5 px-3.5 whitespace-nowrap font-sans font-medium text-slate-800 dark:text-zinc-200">
                                  <div className="flex items-center gap-1.5">
                                    {log.channel === "slack" && (
                                      <span className="w-2 h-2 rounded-full bg-[#E01E5A]" />
                                    )}
                                    {log.channel === "teams" && (
                                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                                    )}
                                    {log.channel === "email" && (
                                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                                    )}
                                    <span className="capitalize">{log.channel}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3.5 font-sans min-w-[200px]">
                                  <div className="font-semibold text-slate-900 dark:text-zinc-100 truncate">
                                    {log.triggerType === "expired_coi"
                                      ? "Expired COI (AP Hold)"
                                      : log.triggerType === "missing_w9"
                                      ? "Missing Form W-9"
                                      : "30-Day Expiry Warning"}
                                  </div>
                                  <div className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                                    {log.target}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3.5 whitespace-nowrap">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold",
                                      log.statusCode >= 200 && log.statusCode < 300
                                        ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/70"
                                        : "bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/70"
                                    )}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {log.statusCode} {log.statusText}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3.5 text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                                  {log.latencyMs}ms
                                </td>
                                <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInspectLog(log)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-sans font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700/60"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Inspect</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* 4. DYNAMIC MULTI-PLATFORM LIVE PAYLOAD PREVIEW */}
                  {/* -------------------------------------------------- */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121316]/90 overflow-hidden shadow-2xs">
                    {/* Header Bar */}
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-900/70 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowLivePreview(!showLivePreview)}
                          className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none group min-w-0"
                        >
                          <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-white truncate">
                            LIVE ALERT PAYLOAD PREVIEW
                          </span>
                          {showLivePreview ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-transform shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-transform shrink-0" />
                          )}
                        </button>

                        {/* Platform Selector Tabs */}
                        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-zinc-800/80 border border-slate-300 dark:border-zinc-700 text-xs">
                          <button
                            type="button"
                            onClick={() => setPreviewPlatform("slack")}
                            className={cn(
                              "px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                              previewPlatform === "slack"
                                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                            )}
                          >
                            Slack Block Kit
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewPlatform("teams")}
                            className={cn(
                              "px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                              previewPlatform === "teams"
                                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                            )}
                          >
                            MS Teams Card
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewPlatform("email")}
                            className={cn(
                              "px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                              previewPlatform === "email"
                                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                            )}
                          >
                            Email Digest
                          </button>
                        </div>
                      </div>

                      {/* Right controls: Trigger Selector & Visual/Raw toggle */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Trigger Pill Switcher */}
                        <select
                          value={previewTrigger}
                          onChange={(e) => setPreviewTrigger(e.target.value as any)}
                          className="text-xs px-2.5 py-1 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 outline-none cursor-pointer"
                        >
                          <option value="expired_coi">Event: Expired COI (Hold)</option>
                          <option value="missing_w9">Event: Missing Form W-9</option>
                          <option value="upcoming_expiry">Event: 30-Day Warning</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            if (!showLivePreview) setShowLivePreview(true);
                            setShowRawPayload(!showRawPayload);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-all border cursor-pointer whitespace-nowrap shrink-0",
                            showRawPayload
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 shadow-2xs"
                              : "bg-white text-slate-600 border-slate-300 hover:text-slate-900 dark:bg-zinc-900/90 dark:text-zinc-400 dark:border-zinc-800 dark:hover:text-zinc-200 dark:hover:border-zinc-700"
                          )}
                        >
                          <Code className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                          <span className="font-medium">{showRawPayload ? "Visual Card" : "Raw JSON"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Preview Body */}
                    <AnimatePresence>
                      {showLivePreview && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="p-4"
                        >
                          {showRawPayload ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(sampleJsonPayload);
                                  setPayloadCopied(true);
                                  setTimeout(() => setPayloadCopied(false), 2000);
                                  notify("Payload Copied", "Raw Block Kit / Adaptive Card JSON copied to clipboard.", "success");
                                }}
                                className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-slate-200/90 hover:bg-slate-300 text-slate-800 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs"
                                title="Copy JSON payload"
                              >
                                {payloadCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                              <pre className="text-[11.55px] font-mono text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-zinc-950 p-3.5 pt-9 rounded-lg border border-slate-200 dark:border-zinc-800 overflow-x-auto leading-relaxed max-h-56 shadow-inner">
                                {sampleJsonPayload}
                              </pre>
                            </div>
                          ) : (
                            /* Visual Rendering of Selected Platform */
                            <div>
                              {previewPlatform === "slack" && (
                                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-2xs">
                                  {/* Slack Bot Header */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                      🛡️
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-900 dark:text-white">Acme Compliance Bot</span>
                                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                                        APP
                                      </span>
                                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">1:14 PM</span>
                                    </div>
                                  </div>

                                  {/* Message Body */}
                                  <div className="pl-9 space-y-2.5">
                                    <div className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                      <AlertTriangle className="w-4 h-4 shrink-0" />
                                      <span>
                                        {previewTrigger === "expired_coi"
                                          ? "⚠️ ACME AP COMPLIANCE VIOLATION INTERCEPTED"
                                          : previewTrigger === "missing_w9"
                                          ? "📋 ACTION REQUIRED: MISSING FORM W-9"
                                          : "⏳ 30-DAY ADVANCE NOTICE: COI EXPIRING"}
                                      </span>
                                    </div>

                                    {/* 2x2 Field Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-zinc-950/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                                      <div>
                                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 block font-medium">Vendor Entity</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                          {previewTrigger === "expired_coi"
                                            ? "Apex Freight Systems LLC"
                                            : previewTrigger === "missing_w9"
                                            ? "Beacon Security Systems"
                                            : "Titan Facility Solutions"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 block font-medium">Deficiency Status</span>
                                        <span className="font-semibold text-red-600 dark:text-red-400">
                                          {previewTrigger === "expired_coi"
                                            ? "Lapsed Policy (Sep 30, 2026)"
                                            : previewTrigger === "missing_w9"
                                            ? "TIN Certification Missing"
                                            : "Expiring in 28 Days"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 block font-medium">Policy Requirement</span>
                                        <span className="text-slate-700 dark:text-zinc-300 font-medium">$1,000,000 GL Coverage</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 block font-medium">AP Ledger Action</span>
                                        <span className="font-semibold text-red-600 dark:text-red-400">
                                          {previewTrigger === "expired_coi" ? "AUTOMATIC AP FREEZE APPLIED" : "Action Item Queued"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Interactive Action Buttons */}
                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => notify("Inspection Action", "Routing to vendor compliance audit ledger.", "info")}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                                      >
                                        Inspect in Audit Ledger
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => notify("Document Request", "Dispatching renewal email to vendor primary contact.", "info")}
                                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                                      >
                                        Request Renewal Document
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {previewPlatform === "teams" && (
                                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
                                  {/* Teams Blue Accent Top Bar */}
                                  <div className="h-1.5 bg-blue-600 w-full" />
                                  <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                                          T
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                          Microsoft Teams Adaptive Card (v1.5)
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-900">
                                        Power Automate
                                      </span>
                                    </div>

                                    <div className="space-y-1">
                                      <h5 className="text-xs font-bold text-red-600 dark:text-red-400">
                                        {previewTrigger === "expired_coi"
                                          ? "⚠️ AP COMPLIANCE HOLD: POLICY DEFICIENCY"
                                          : previewTrigger === "missing_w9"
                                          ? "📋 ACTION REQUIRED: MISSING TAX ID / W-9"
                                          : "⏳ ADVANCE NOTICE: POLICY EXPIRATION"}
                                      </h5>
                                      <p className="text-[11.5px] text-slate-600 dark:text-zinc-400 leading-snug">
                                        Automated AP compliance checkpoint flagged a vendor deficit. Invoices scheduled for disbursement require review.
                                      </p>
                                    </div>

                                    {/* FactSet Table */}
                                    <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden text-xs">
                                      <div className="grid grid-cols-3 p-2 bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-medium text-slate-500">
                                        <span>Field</span>
                                        <span className="col-span-2">Value</span>
                                      </div>
                                      <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 p-2 text-[11.5px] space-y-1.5">
                                        <div className="grid grid-cols-3 pt-1">
                                          <span className="font-medium text-slate-500">Vendor</span>
                                          <span className="col-span-2 font-semibold text-slate-900 dark:text-white">Apex Freight Systems LLC</span>
                                        </div>
                                        <div className="grid grid-cols-3 pt-1">
                                          <span className="font-medium text-slate-500">Required GL</span>
                                          <span className="col-span-2 text-slate-700 dark:text-zinc-300">$1,000,000 Minimum</span>
                                        </div>
                                        <div className="grid grid-cols-3 pt-1">
                                          <span className="font-medium text-slate-500">Action</span>
                                          <span className="col-span-2 font-bold text-red-600 dark:text-red-400">Automatic Invoice Freeze Active</span>
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => notify("Action.OpenUrl", "Opening vendor record in compliance ledger.", "info")}
                                      className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs text-center"
                                    >
                                      Open Compliance Ledger
                                    </button>
                                  </div>
                                </div>
                              )}

                              {previewPlatform === "email" && (
                                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-2xs">
                                  {/* Envelope Info */}
                                  <div className="border-b border-slate-200 dark:border-zinc-800 pb-2.5 space-y-1 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 dark:text-zinc-500 font-medium w-12">From:</span>
                                      <span className="text-slate-800 dark:text-zinc-200 font-mono text-[11px]">
                                        Acme Compliance Controller &lt;compliance-alerts@acmelogistics.com&gt;
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 dark:text-zinc-500 font-medium w-12">To:</span>
                                      <span className="text-slate-800 dark:text-zinc-200 font-mono text-[11px]">
                                        {channels.email.recipients || "ap-alerts@acmelogistics.com"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 dark:text-zinc-500 font-medium w-12">Subject:</span>
                                      <span className="text-slate-900 dark:text-white font-semibold">
                                        [ACTION REQUIRED] Compliance Alert: Apex Freight Systems LLC
                                      </span>
                                    </div>
                                  </div>

                                  {/* Email Card Container */}
                                  <div className="border border-red-200 dark:border-red-950/80 bg-red-50/70 dark:bg-red-950/20 p-3.5 rounded-lg space-y-2 text-xs">
                                    <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400">
                                      <AlertTriangle className="w-4 h-4 shrink-0" />
                                      <span>Vendor Compliance Deficiency Intercepted</span>
                                    </div>
                                    <p className="text-[11.5px] text-slate-700 dark:text-zinc-300 leading-snug">
                                      The compliance engine detected that <strong>Apex Freight Systems LLC</strong> has lapsed General Liability coverage as of Sep 30, 2026. Pursuant to Acme procurement policy, pending invoice disbursements have been automatically held.
                                    </p>
                                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                                      <span>Tenant ID: acme-logistics-us-east-1</span>
                                      <span className="font-mono">IRS Audit ID: ACME-SEC-9921</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* 5. INTERACTIVE PAYLOAD INSPECTOR MODAL */}
                  {/* -------------------------------------------------- */}
                  <AnimatePresence>
                    {selectedInspectLog && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedInspectLog(null)}
                        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-60 flex items-center justify-center p-3 sm:p-4 cursor-pointer"
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full max-w-2xl bg-white dark:bg-[#121316] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden cursor-default text-slate-900 dark:text-zinc-100 flex flex-col max-h-[85vh]"
                        >
                          {/* Modal Header */}
                          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/80">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                                <Terminal className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>Webhook Payload &amp; Handshake Inspector</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    HTTP {selectedInspectLog.statusCode} {selectedInspectLog.statusText}
                                  </span>
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                                  POST &rarr; {selectedInspectLog.target} • {selectedInspectLog.latencyMs}ms roundtrip
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedInspectLog(null)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Modal Body */}
                          <div className="p-4 space-y-4 overflow-y-auto flex-1 font-sans text-xs">
                            {/* Request Headers */}
                            <div>
                              <div className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-zinc-400 uppercase mb-1.5">
                                Outbound Request Headers
                              </div>
                              <pre className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 font-mono text-[11px] text-slate-800 dark:text-zinc-300 leading-relaxed overflow-x-auto">
                                {Object.entries(selectedInspectLog.requestHeaders || {})
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join("\n")}
                              </pre>
                            </div>

                            {/* Raw JSON Payload */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-zinc-400 uppercase">
                                  Dispatched JSON Body
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {JSON.stringify(selectedInspectLog.payload).length} bytes
                                </span>
                              </div>
                              <pre className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 font-mono text-[11.5px] text-slate-900 dark:text-slate-100 leading-relaxed overflow-x-auto max-h-48 shadow-inner">
                                {JSON.stringify(selectedInspectLog.payload, null, 2)}
                              </pre>
                            </div>

                            {/* Remote Broker Response Handshake */}
                            <div>
                              <div className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-zinc-400 uppercase mb-1.5">
                                Remote Endpoint Acknowledgment
                              </div>
                              <pre className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 font-mono text-[11px] text-emerald-900 dark:text-emerald-300 leading-relaxed overflow-x-auto">
                                {JSON.stringify(selectedInspectLog.responseBody, null, 2)}
                              </pre>
                            </div>
                          </div>

                          {/* Modal Footer */}
                          <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const curlCmd = `curl -X POST "${selectedInspectLog.target}" \\\n  -H "Content-Type: application/json" \\\n  -H "User-Agent: Acme-Compliance-Bot/2.4" \\\n  -d '${JSON.stringify(selectedInspectLog.payload)}'`;
                                navigator.clipboard.writeText(curlCmd);
                                setCurlCopied(true);
                                setTimeout(() => setCurlCopied(false), 2000);
                                notify("cURL Copied", "Command copied to clipboard.", "success");
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 text-xs font-mono font-medium transition-colors cursor-pointer shadow-2xs"
                            >
                              {curlCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">cURL Copied</span>
                                </>
                              ) : (
                                <>
                                  <Terminal className="w-3.5 h-3.5" />
                                  <span>Copy cURL Command</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedInspectLog(null)}
                              className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer shadow-2xs"
                            >
                              Close Inspector
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Compact Screen Theme Selector (< 1024px) */}
                  <div className="lg:hidden pt-4 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Theme</span>
                    <div className="flex items-center bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-1 text-xs text-slate-500 dark:text-zinc-400">
                      <button
                        type="button"
                        onClick={(e) => handleThemeChange("system", e)}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium",
                          activeThemeMode === "system" ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs" : "hover:text-slate-900 dark:hover:text-zinc-200"
                        )}
                      >
                        <Check className="w-3 h-3" />
                        <span>System</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleThemeChange("light", e)}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium",
                          activeThemeMode === "light" ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs" : "hover:text-slate-900 dark:hover:text-zinc-200"
                        )}
                      >
                        <Sun className="w-3 h-3" />
                        <span>Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleThemeChange("dark", e)}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium",
                          activeThemeMode === "dark" ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs" : "hover:text-slate-900 dark:hover:text-zinc-200"
                        )}
                      >
                        <Moon className="w-3 h-3" />
                        <span>Dark</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: COMPLIANCE RULES */}
              {/* ========================================================= */}
              {activeTab === "rules" && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Portfolio Compliance Rules &amp; Guardrails
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Set automated underwriting thresholds for Certificate of Insurance coverage limits and payment hold triggers.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* General Liability Threshold */}
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            Minimum General Liability Coverage Limit
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            Vendors submitting COIs below this threshold are automatically flagged for AP payment freeze.
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg">
                          ${((appSettings.minCoiCoverage || 1000000) / 1000000).toFixed(0)},000,000 GL
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[1000000, 2000000, 5000000].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setAppSettings((prev) => ({ ...prev, minCoiCoverage: amount }))}
                            className={cn(
                              "py-2 px-2 sm:px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center flex items-center justify-center gap-1",
                              appSettings.minCoiCoverage === amount
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-950 dark:border-white font-semibold shadow-xs"
                                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:border-zinc-700"
                            )}
                          >
                            <span>${(amount / 1000000).toFixed(0)}M</span>
                            <span className="hidden sm:inline">Standard GL</span>
                            <span className="sm:hidden text-[11px]">GL</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expiration Notice Lead Window */}
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            Advance Expiration Notice Window
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            Number of days prior to policy expiration when automated renewal reminders are queued.
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-lg">
                          {appSettings.noticeLeadDays || 30} Days
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[30, 60, 90].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setAppSettings((prev) => ({ ...prev, noticeLeadDays: days }))}
                            className={cn(
                              "py-2 px-2 sm:px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center flex items-center justify-center gap-1",
                              appSettings.noticeLeadDays === days
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-950 dark:border-white font-semibold shadow-xs"
                                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:border-zinc-700"
                            )}
                          >
                            <span>{days} Days</span>
                            <span className="hidden sm:inline">Advance Notice</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto-Hold Enforcement Toggle */}
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Automated AP Payment Hold Enforcement
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          Immediately marks vendor status as &quot;AP PAYMENT FREEZE&quot; upon COI expiration or uncertified Form W-9 TIN.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setAppSettings((prev) => ({
                            ...prev,
                            autoHoldEnforcement: !prev.autoHoldEnforcement,
                          }))
                        }
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                          appSettings.autoHoldEnforcement ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                        )}
                      >
                        <span
                          className={cn(
                            "w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                            appSettings.autoHoldEnforcement ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Require Signed W-9 Toggle */}
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Mandate IRS Form W-9 Part II Signature &amp; TIN Match
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          Flags unsigned W-9 documents or missing 9-digit EINs as non-compliant under IRS penalties.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setAppSettings((prev) => ({
                            ...prev,
                            requireSignedW9: !prev.requireSignedW9,
                          }))
                        }
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                          appSettings.requireSignedW9 ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                        )}
                      >
                        <span
                          className={cn(
                            "w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                            appSettings.requireSignedW9 ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Default AP Sign-off Name */}
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            Default AP Sign-off Name
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            Appended as the official signature to all automated and 1-click compliance re-request notices.
                          </div>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={appSettings.defaultApSignoffName || ""}
                        onChange={(e) =>
                          setAppSettings((prev) => ({
                            ...prev,
                            defaultApSignoffName: e.target.value,
                          }))
                        }
                        placeholder="e.g. Acme AP Compliance Division"
                        className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-slate-500 dark:focus:border-zinc-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: INBOUND MAIL ROUTING */}
              {/* ========================================================= */}
              {activeTab === "inbound" && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Inbound Document Intake &amp; Mail Routing
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Direct vendor COIs and W-9 PDFs to your dedicated ingestion address. Incoming attachments are extracted and audit-stamped via OCR.
                    </p>
                  </div>

                  {/* Mailbox Alias Card */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 p-4 space-y-3">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-white">
                      Dedicated Inbound Compliance Intake Alias
                    </label>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex-1 min-w-0 overflow-hidden flex items-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 font-mono text-[11px] sm:text-xs text-sky-600 dark:text-sky-400">
                        <Mail className="w-4 h-4 text-sky-500 dark:text-sky-400 mr-1.5 sm:mr-2 shrink-0" />
                        <span className="truncate">{appSettings.inboundEmailAlias || "intake@compliance.acmelogistics.com"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            appSettings.inboundEmailAlias || "intake@compliance.acmelogistics.com"
                          );
                          setAliasCopied(true);
                          setTimeout(() => setAliasCopied(false), 2000);
                          notify("Alias Copied", "Inbound compliance email address copied to clipboard", "success");
                        }}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold border border-slate-300 dark:border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                      >
                        {aliasCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Configure your ERP / accounting system (NetSuite, QuickBooks, SAP) to forward vendor onboarding emails to this address.
                    </p>
                  </div>

                  {/* Attachment Rules */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 p-4 space-y-3">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">Supported Attachments &amp; Ingestion Engine</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded-lg bg-white dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2 shadow-2xs">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">.PDF</span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">ACORD 25 &amp; Form W-9</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2 shadow-2xs">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">.PNG/.JPG</span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">Scanned Policy Declarations</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2 shadow-2xs">
                        <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">Multimodal OCR Verification</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* FOOTER BAR */}
            {/* ========================================================= */}
            <div className="border-t border-slate-200 dark:border-zinc-800/80 px-4 sm:px-6 py-3 bg-slate-50 dark:bg-[#0e0f12] flex items-center justify-between shrink-0 transition-colors gap-3">
              {/* Left Admin Security Pill - visible only on tablet (sm:flex lg:hidden) where sidebar is collapsed and space permits */}
              <div className="hidden sm:flex lg:hidden items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 text-slate-600 dark:text-zinc-400 text-xs shadow-2xs shrink-0">
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
                <span className="font-medium text-xs whitespace-nowrap">Admin Access: Finance Controller</span>
              </div>

              {/* Spacer on desktop */}
              <div className="hidden lg:block" />

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700/60 text-xs font-medium transition-colors cursor-pointer shadow-2xs text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap text-center"
                >
                  {isSaving ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </div>
          </main>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
