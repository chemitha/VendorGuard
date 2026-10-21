import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, addAuditLog, Vendor, ComplianceStatus } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    return NextResponse.json(db);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { action } = body;

    if (action === "updateSettings") {
      const { settings } = body;
      db.settings = {
        ...db.settings,
        ...settings,
        channels: {
          ...(db.settings?.channels || {
            slack: { enabled: true, webhookUrl: "", channelTarget: "#ap-compliance" },
            teams: { enabled: false, webhookUrl: "", channelTarget: "Finance Channel" },
            email: { enabled: true, recipients: "ap-alerts@acmelogistics.com", mode: "multi", frequency: "both" }
          }),
          ...(settings?.channels || {})
        },
        triggers: {
          ...(db.settings?.triggers || { expiredCoi: true, missingW9: true, upcomingExpiry: true }),
          ...(settings?.triggers || {})
        }
      };
      saveDb(db);
      
      const activeChannelsList = [
        db.settings.channels?.slack?.enabled ? "Slack" : null,
        db.settings.channels?.teams?.enabled ? "Teams" : null,
        db.settings.channels?.email?.enabled ? "Email" : null,
      ].filter(Boolean).join(", ") || "None";

      addAuditLog({
        vendorName: "System",
        action: "Settings Updated",
        details: `Compliance thresholds updated. Active Channels: [${activeChannelsList}]. Minimum coverage: $${(db.settings.minCoiCoverage || 1000000).toLocaleString()}. Notice window: ${db.settings.noticeLeadDays || 30} days.`,
        status: "success"
      });
      return NextResponse.json({ success: true, db });
    }

    if (action === "updateVendor") {
      const { vendorId, name, contactEmail, type, status } = body;
      const vendorIndex = db.vendors.findIndex((v) => v.id === vendorId);
      if (vendorIndex === -1) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }

      db.vendors[vendorIndex] = {
        ...db.vendors[vendorIndex],
        name,
        contactEmail,
        type,
        status,
        updatedAt: new Date().toISOString()
      };
      saveDb(db);
      addAuditLog({
        vendorId,
        vendorName: name,
        action: "Vendor Updated",
        details: `Vendor details updated manually. Email: "${contactEmail}". Type: ${type}. Status: ${status}.`,
        status: "success"
      });
      return NextResponse.json({ success: true, db });
    }

    if (action === "deleteVendor") {
      const { vendorId } = body;
      const vendor = db.vendors.find((v) => v.id === vendorId);
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }

      db.vendors = db.vendors.filter((v) => v.id !== vendorId);
      saveDb(db);
      addAuditLog({
        vendorName: vendor.name,
        action: "Vendor Deleted",
        details: `Vendor account and all associated document audit records permanently removed.`,
        status: "warning"
      });
      return NextResponse.json({ success: true, db });
    }

    if (action === "requestUpdate") {
      const { vendorId, docType } = body;
      const vendor = db.vendors.find((v) => v.id === vendorId);
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }

      addAuditLog({
        vendorId: vendor.id,
        vendorName: vendor.name,
        action: "Re-Request Doc",
        details: `Compliance document request dispatched automatically to "${vendor.contactEmail}" for updated ${docType}.`,
        status: "success"
      });
      return NextResponse.json({ success: true, db });
    }

    if (action === "bulkRequestUpdate") {
      const { vendorIds } = body;
      const count = Array.isArray(vendorIds) ? vendorIds.length : 0;
      addAuditLog({
        vendorName: "Batch Operations",
        action: "Bulk Notices Dispatched",
        details: `Dispatched automated compliance renewal notices to ${count} selected vendor(s).`,
        status: "success"
      });
      return NextResponse.json({ success: true, count });
    }

    if (action === "bulkHold") {
      const { vendorIds } = body;
      const targetIds = new Set(vendorIds || []);
      let updatedCount = 0;
      db.vendors = db.vendors.map((v) => {
        if (targetIds.has(v.id)) {
          updatedCount++;
          return {
            ...v,
            status: "ACTION_REQUIRED" as ComplianceStatus,
            updatedAt: new Date().toISOString()
          };
        }
        return v;
      });
      saveDb(db);
      addAuditLog({
        vendorName: "Batch Operations",
        action: "Payment Freeze Enforced",
        details: `Enforced immediate AP payment freeze across ${updatedCount} selected vendor accounts.`,
        status: "warning"
      });
      return NextResponse.json({ success: true, count: updatedCount, db });
    }

    if (action === "clearDatabase") {
      // For demo testing, let the user restore seed data
      db.vendors = [];
      saveDb(db);
      // It will reseed automatically on next getDb() call
      const freshDb = getDb();
      addAuditLog({
        vendorName: "System",
        action: "Database Reset",
        details: "Compliance ledger and sandbox entries restored to initial seed state.",
        status: "success"
      });
      return NextResponse.json({ success: true, db: freshDb });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
