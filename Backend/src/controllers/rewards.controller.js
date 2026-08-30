import mongoose from "mongoose";
import RewardTransaction from "../models/RewardTransaction.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { REWARDS_CATALOG, findReward } from "../config/rewardsCatalog.js";

// Generates a short, human-readable voucher code, e.g. "WWBD-4F9K2Q".
// Excludes ambiguous characters (0/O, 1/I) so codes are easy to read aloud.
const generateVoucherCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `WWBD-${code}`;
};

// @route  GET /api/rewards/me
// @access resident
// Returns the resident's current balance, earned/redeemed totals, and the
// paginated transaction ledger (newest first).
export const getMyRewards = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const profile = await ResidentProfile.findOne({ user: req.user._id }).select(
    "totalRewardPoints"
  );
  if (!profile) {
    return sendError(res, 404, "Resident profile not found");
  }

  const skip = (Number(page) - 1) * Number(limit);
  const residentId = new mongoose.Types.ObjectId(req.user._id);

  const [transactions, total, summaryAgg] = await Promise.all([
    RewardTransaction.find({ resident: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    RewardTransaction.countDocuments({ resident: req.user._id }),
    RewardTransaction.aggregate([
      { $match: { resident: residentId } },
      { $group: { _id: "$type", total: { $sum: "$points" } } },
    ]),
  ]);

  const totalEarned = summaryAgg.find((s) => s._id === "earned")?.total || 0;
  const totalRedeemed =
    summaryAgg.find((s) => s._id === "redeemed")?.total || 0;

  return sendSuccess(res, 200, "Rewards fetched", {
    balance: profile.totalRewardPoints,
    summary: { totalEarned, totalRedeemed },
    transactions,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// @route  GET /api/rewards/catalog
// @access resident
export const getCatalog = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, "Rewards catalog fetched", {
    catalog: REWARDS_CATALOG,
  });
});

// @route  POST /api/rewards/redeem
// @access resident
// Spends points on a catalog reward. Uses a single guarded update so the balance
// can never go negative even under concurrent redeem requests.
export const redeemReward = asyncHandler(async (req, res) => {
  const { rewardId } = req.body;

  const reward = findReward(rewardId);
  if (!reward) {
    return sendError(res, 400, "Invalid reward selection");
  }

  // Atomic, race-safe debit: only matches (and decrements) when the balance
  // already covers the cost.
  const profile = await ResidentProfile.findOneAndUpdate(
    { user: req.user._id, totalRewardPoints: { $gte: reward.cost } },
    { $inc: { totalRewardPoints: -reward.cost } },
    { new: true }
  );

  if (!profile) {
    // No match means either the profile is missing or the balance is too low.
    const exists = await ResidentProfile.exists({ user: req.user._id });
    if (!exists) return sendError(res, 404, "Resident profile not found");
    return sendError(res, 400, "Insufficient points to redeem this reward");
  }

  const voucherCode = generateVoucherCode();

  // Record the spend in the immutable ledger.
  await RewardTransaction.create({
    resident: req.user._id,
    residentProfile: profile._id,
    type: "redeemed",
    points: reward.cost,
    reason: "redemption",
    description: `Redeemed "${reward.name}" — voucher ${voucherCode}`,
  });

  return sendSuccess(res, 200, "Reward redeemed successfully", {
    voucherCode,
    reward: { id: reward.id, name: reward.name, cost: reward.cost },
    balance: profile.totalRewardPoints,
  });
});
