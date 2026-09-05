import WasteCategory from "../models/WasteCategory.model.js";
import RewardTransaction from "../models/RewardTransaction.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import Notification from "../models/Notification.model.js";

// Fallback rate used when a WasteCategory has no configured rewardPointsPerKg.
// Mirrors the platform's historical "10 points per kg" behavior so earning keeps
// working even before an admin sets per-category rates.
export const DEFAULT_POINTS_PER_KG = 10;

// Computes reward points for a set of recycling materials, using each category's
// configured rate and falling back to DEFAULT_POINTS_PER_KG when it's unset.
export const calculateRecyclingPoints = async (materials) => {
  const categories = materials.map((m) => m.category);
  const wasteCats = await WasteCategory.find({ name: { $in: categories } });

  let totalPoints = 0;
  for (const mat of materials) {
    const cat = wasteCats.find((wc) => wc.name === mat.category);
    const rate =
      cat && cat.rewardPointsPerKg > 0
        ? cat.rewardPointsPerKg
        : DEFAULT_POINTS_PER_KG;
    totalPoints += Math.floor(rate * mat.estimatedQuantity);
  }
  return totalPoints;
};

// Credits reward points to the resident for a completed recycling request.
// This is the single source of truth for the "earn" side of the rewards system:
// it keeps the resident's balance and the immutable RewardTransaction ledger in
// sync, and notifies the resident.
//
// Idempotent: does nothing if the request has already earned points.
// The caller is responsible for saving `request` (we only set rewardPointsEarned on it).
// Returns the number of points credited (0 if none).
export const creditRecyclingReward = async ({ request }) => {
  if (request.rewardPointsEarned > 0) return 0; // already credited

  const totalPoints = await calculateRecyclingPoints(request.materials);
  if (totalPoints <= 0) return 0;

  request.rewardPointsEarned = totalPoints;

  // Credit the resident's running balance.
  const profile = await ResidentProfile.findOneAndUpdate(
    { user: request.resident },
    { $inc: { totalRewardPoints: totalPoints } },
    { new: true }
  );

  // Append an immutable ledger entry so balance and history always reconcile.
  await RewardTransaction.create({
    resident: request.resident,
    residentProfile: profile?._id || request.residentProfile,
    type: "earned",
    points: totalPoints,
    reason: "recycling_completed",
    description: "Earned for completed recycling pickup",
    sourceDocument: request._id,
    sourceModel: "RecyclingRequest",
  });

  // Notify the resident.
  await Notification.create({
    recipient: request.resident,
    title: "Reward Points Earned!",
    message: `You earned ${totalPoints} green reward points for your completed recycling pickup.`,
    type: "reward_earned",
    relatedDocument: request._id,
    relatedModel: "RecyclingRequest",
  });

  return totalPoints;
};
