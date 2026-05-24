export const PLATFORM_ROLES = [
  {
    name: "SuperAdmin",
    description:
      "Full platform control, governance, and system configuration access.",
    permissions: ["*"],
    hierarchy: 1,
    isDefault: false,
  },
  {
    name: "OperationsAdmin",
    description: "Manages assets, wallets, and operational workflows.",
    permissions: [
      "platform.user:create",
      "platform.asset:create",
      "platform.asset:read",
      "platform.asset:update",
      "platform.asset:delete",
      "platform.wallet:read",
      "platform.wallet:manage",
      "platform.user:read",
      "platform.user:update",
    ],
    hierarchy: 2,
    isDefault: false,
  },
  {
    name: "ComplianceAdmin",
    description: "Manages KYC/AML, audit logs, and compliance checks.",
    permissions: [
      "platform.user:create",
      "platform.user:read",
      "platform.user:update",
      "platform.audit:read",
      "platform.audit:export",
    ],
    hierarchy: 3,
    isDefault: false,
  },
  {
    name: "Investor",
    description: "Investor access to assets, shares, and wallet.",
    permissions: [
      "investor.asset:read",
      "investor.share:create",
      "investor.share:read",
      "investor.wallet:read",
      "investor.wallet:withdraw",
    ],
    hierarchy: 4,
    isDefault: true,
  },
];
