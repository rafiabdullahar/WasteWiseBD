// Fixed catalog of rewards residents can redeem their green points for.
// Costs live here (server-side) so the redeem endpoint can validate against an
// authoritative price the client can't tamper with. This is intentionally a
// static list — there is no admin management UI for it (per feature scope).
export const REWARDS_CATALOG = [
  {
    id: "tree-planting",
    name: "Plant a Tree in Your Name",
    description:
      "We plant a tree on your behalf through a local green initiative.",
    cost: 200,
    icon: "TreePine",
  },
  {
    id: "mobile-recharge-30",
    name: "৳30 Mobile Recharge",
    description: "Top up any Bangladeshi mobile number with ৳30 airtime.",
    cost: 300,
    icon: "Smartphone",
  },
  {
    id: "reusable-bag",
    name: "Eco Reusable Bag Voucher",
    description: "Redeem for a durable reusable shopping bag at partner stores.",
    cost: 400,
    icon: "ShoppingBag",
  },
  {
    id: "bill-discount-50",
    name: "৳50 Utility Bill Discount",
    description: "Get ৳50 off your next municipal utility bill.",
    cost: 500,
    icon: "Receipt",
  },
];

// Look up a catalog entry by id; returns null when not found.
export const findReward = (id) =>
  REWARDS_CATALOG.find((r) => r.id === id) || null;
