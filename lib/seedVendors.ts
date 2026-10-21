import { Vendor } from "./db";

export function generate148Vendors(): Vendor[] {
  const vendors: Vendor[] = [];

  // 1. Four Expired COI Vendors (Hold)
  vendors.push({
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
          missingFields: ["Policy expired 8 days ago on Sep 30, 2026"]
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
  });

  vendors.push({
    id: "8",
    name: "Metro Crane & Rigging LLC",
    contactEmail: "ops@metrocranes.com",
    type: "Logistics",
    status: "EXPIRED",
    documents: [
      {
        id: "doc-metro-coi",
        type: "COI",
        fileName: "COI_MetroCrane_2026.pdf",
        extractedData: {
          vendorName: "Metro Crane & Rigging LLC",
          expirationDate: "2026-09-28",
          coverageAmount: 1000000,
          coverageLabel: "$1,000,000 GL",
          isSigned: true,
          confidenceScore: 0.98,
          missingFields: ["Policy expired 10 days ago on Sep 28, 2026"]
        },
        status: "EXPIRED",
        createdAt: "2026-01-18T09:00:00Z"
      },
      {
        id: "doc-metro-w9",
        type: "W9",
        fileName: "W9_MetroCrane_Signed.pdf",
        extractedData: {
          vendorName: "Metro Crane & Rigging LLC",
          taxIdOrEin: "XX-XXX8211",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-01-18T09:05:00Z"
      }
    ],
    createdAt: "2026-01-18T09:00:00Z",
    updatedAt: "2026-10-02T08:00:00Z"
  });

  vendors.push({
    id: "9",
    name: "Vanguard Courier Logistics",
    contactEmail: "billing@vanguardcourier.com",
    type: "Logistics",
    status: "EXPIRED",
    documents: [
      {
        id: "doc-vanguard-coi",
        type: "COI",
        fileName: "COI_Vanguard_2026.pdf",
        extractedData: {
          vendorName: "Vanguard Courier Logistics Inc",
          expirationDate: "2026-10-01",
          coverageAmount: 1000000,
          coverageLabel: "$1,000,000 GL",
          isSigned: true,
          confidenceScore: 0.97,
          missingFields: ["Policy expired 7 days ago on Oct 01, 2026"]
        },
        status: "EXPIRED",
        createdAt: "2026-02-12T11:00:00Z"
      },
      {
        id: "doc-vanguard-w9",
        type: "W9",
        fileName: "W9_Vanguard_2026.pdf",
        extractedData: {
          vendorName: "Vanguard Courier Logistics Inc",
          taxIdOrEin: "XX-XXX4190",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-02-12T11:05:00Z"
      }
    ],
    createdAt: "2026-02-12T11:00:00Z",
    updatedAt: "2026-10-03T09:00:00Z"
  });

  vendors.push({
    id: "10",
    name: "RoadRunner Freightways Inc",
    contactEmail: "claims@rrfreightways.com",
    type: "Logistics",
    status: "EXPIRED",
    documents: [
      {
        id: "doc-rr-coi",
        type: "COI",
        fileName: "COI_RoadRunner_2026.pdf",
        extractedData: {
          vendorName: "RoadRunner Freightways Inc",
          expirationDate: "2026-09-25",
          coverageAmount: 2000000,
          coverageLabel: "$2,000,000 GL",
          isSigned: true,
          confidenceScore: 0.96,
          missingFields: ["Policy expired 13 days ago on Sep 25, 2026"]
        },
        status: "EXPIRED",
        createdAt: "2026-03-05T08:30:00Z"
      },
      {
        id: "doc-rr-w9",
        type: "W9",
        fileName: "W9_RoadRunner_Certified.pdf",
        extractedData: {
          vendorName: "RoadRunner Freightways Inc",
          taxIdOrEin: "XX-XXX3342",
          isSigned: true,
          confidenceScore: 0.99,
          missingFields: []
        },
        status: "VERIFIED",
        createdAt: "2026-03-05T08:35:00Z"
      }
    ],
    createdAt: "2026-03-05T08:30:00Z",
    updatedAt: "2026-10-01T12:00:00Z"
  });

  // 2. Two Missing W-9 Vendors (Hold / ACTION_REQUIRED)
  vendors.push({
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
  });

  vendors.push({
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
  });

  // 3. Eleven Expiring Soon Vendors (within 30 days)
  const expiringData = [
    { id: "2", name: "Mid-Atlantic Freight Corp", email: "billing@matfreight.com", type: "Logistics", exp: "2026-10-24", days: 16, ein: "XX-XXX4102" },
    { id: "6", name: "Insight Tech Partners LLC", email: "billing@insighttech.com", type: "Staffing", exp: "2026-10-20", days: 12, ein: "XX-XXX4109" },
    { id: "11", name: "Pacific Northwest Fleet LLC", email: "dispatch@pnwfleet.com", type: "Logistics", exp: "2026-10-22", days: 14, ein: "XX-XXX7182" },
    { id: "12", name: "BlueSky Air Cargo Inc", email: "accounts@blueskycargo.aero", type: "Logistics", exp: "2026-10-28", days: 20, ein: "XX-XXX9301" },
    { id: "13", name: "Titan Logistics Group", email: "ar@titanlogistics.com", type: "Logistics", exp: "2026-10-19", days: 11, ein: "XX-XXX5549" },
    { id: "14", name: "HarborPoint Security Services", email: "admin@harborpointsec.com", type: "Facilities", exp: "2026-11-02", days: 25, ein: "XX-XXX2188" },
    { id: "15", name: "Apex Dispatch Systems", email: "ops@apexdispatch.net", type: "Other", exp: "2026-10-26", days: 18, ein: "XX-XXX6641" },
    { id: "16", name: "Cascade Environmental LLC", email: "safety@cascadeenv.com", type: "Facilities", exp: "2026-10-29", days: 21, ein: "XX-XXX3822" },
    { id: "17", name: "Frontline Staffing Agency", email: "payables@frontlinestaff.com", type: "Staffing", exp: "2026-11-05", days: 28, ein: "XX-XXX1944" },
    { id: "18", name: "Atlas Fleet Maintenance Corp", email: "service@atlasfleetmaint.com", type: "Logistics", exp: "2026-10-31", days: 23, ein: "XX-XXX8022" },
    { id: "19", name: "SwiftRail Intermodal LLC", email: "freight@swiftrailintermodal.com", type: "Logistics", exp: "2026-11-01", days: 24, ein: "XX-XXX9173" }
  ];

  for (const v of expiringData) {
    vendors.push({
      id: v.id,
      name: v.name,
      contactEmail: v.email,
      type: v.type as any,
      status: "EXPIRING_SOON",
      documents: [
        {
          id: `doc-${v.id}-coi`,
          type: "COI",
          fileName: `COI_${v.name.replace(/[^a-zA-Z]/g, "")}_2026.pdf`,
          extractedData: {
            vendorName: v.name,
            expirationDate: v.exp,
            coverageAmount: 2000000,
            coverageLabel: "$2,000,000 GL",
            isSigned: true,
            confidenceScore: 0.97,
            missingFields: [`Policy expires in ${v.days} days on ${v.exp}`]
          },
          status: "EXPIRING_SOON",
          createdAt: "2026-02-10T14:20:00Z"
        },
        {
          id: `doc-${v.id}-w9`,
          type: "W9",
          fileName: `W9_${v.name.replace(/[^a-zA-Z]/g, "")}_Signed.pdf`,
          extractedData: {
            vendorName: v.name,
            taxIdOrEin: v.ein,
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
    });
  }

  // 4. Two Existing Verified Vendors
  vendors.push({
    id: "4",
    name: "Commercial Express HVAC Inc",
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
  });

  vendors.push({
    id: "5",
    name: "SteelCore Engineering Group",
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
  });

  // 5. Generate remaining 129 Verified Vendors to total 148
  const companyPrefixes = [
    "Delta", "GreenLine", "Cardinal", "Matrix", "Beacon", "Trinity", "Summit", "Apex", "Horizon", 
    "Pioneer", "Falcon", "Eagle", "Sterling", "CrossRoads", "Quantum", "Synergy", "NextGen", 
    "Evergreen", "Vanguard", "SilverRock", "Highland", "Ironclad", "BlueRidge", "Pacific", 
    "Atlantic", "Sunbelt", "Keystone", "Cornerstone", "Palmetto", "GreatLakes", "Frontier", 
    "Redwood", "Timberline", "Sierra", "Mojave", "Liberty", "Patriot", "Dominion", "Capitol", 
    "Empire", "Allied", "Unified", "Paramount", "Pinnacle", "Zenith", "Polaris", "NorthStar"
  ];

  const companySuffixes = [
    "Transport LLC", "Logistics Inc", "Freight Solutions", "Hauling Corp", "Carrier Group", 
    "Supply Chain LLC", "Services Inc", "Express LLC", "Distribution Co", "Warehousing LLC", 
    "Staffing Partners", "Facility Management", "Industrial Care", "Fleet Systems", "Intermodal"
  ];

  const categories = ["Logistics", "Logistics", "Logistics", "Staffing", "Facilities", "Other", "HR Platform"];

  let currentId = 20;
  while (vendors.length < 148) {
    const pIdx = (currentId - 20) % companyPrefixes.length;
    const sIdx = (Math.floor((currentId - 20) / companyPrefixes.length) + (currentId % 5)) % companySuffixes.length;
    const cName = `${companyPrefixes[pIdx]} ${companySuffixes[sIdx]} #${currentId}`;
    const slug = cName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
    const cat = categories[currentId % categories.length];
    const einNumber = `XX-XXX${String(1000 + currentId * 37).slice(-4)}`;
    const expMonth = String(1 + (currentId % 12)).padStart(2, "0");
    const expDay = String(10 + (currentId % 18)).padStart(2, "0");
    const expYear = 2027 + (currentId % 2);
    const expDate = `${expYear}-${expMonth}-${expDay}`;
    const covAmt = currentId % 3 === 0 ? 2000000 : currentId % 5 === 0 ? 5000000 : 1000000;
    const covLabel = `$${covAmt.toLocaleString()} GL`;

    vendors.push({
      id: String(currentId),
      name: cName,
      contactEmail: `compliance@${slug}.com`,
      type: cat as any,
      status: "VERIFIED",
      documents: [
        {
          id: `doc-${currentId}-coi`,
          type: "COI",
          fileName: `COI_${companyPrefixes[pIdx]}_${expYear}.pdf`,
          extractedData: {
            vendorName: cName,
            expirationDate: expDate,
            coverageAmount: covAmt,
            coverageLabel: covLabel,
            isSigned: true,
            confidenceScore: 0.99,
            missingFields: []
          },
          status: "VERIFIED",
          createdAt: "2026-04-01T08:00:00Z"
        },
        {
          id: `doc-${currentId}-w9`,
          type: "W9",
          fileName: `W9_${companyPrefixes[pIdx]}_Signed.pdf`,
          extractedData: {
            vendorName: cName,
            taxIdOrEin: einNumber,
            isSigned: true,
            confidenceScore: 0.99,
            missingFields: []
          },
          status: "VERIFIED",
          createdAt: "2026-04-01T08:05:00Z"
        }
      ],
      createdAt: "2026-04-01T08:00:00Z",
      updatedAt: "2026-04-01T08:05:00Z"
    });
    currentId++;
  }

  return vendors;
}
