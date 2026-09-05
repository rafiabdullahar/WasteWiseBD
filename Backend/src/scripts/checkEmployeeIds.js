import "dotenv/config";
import CollectorProfile from "../models/CollectorProfile.model.js";
import User from "../models/User.model.js";
import { connectDB } from "../config/db.js";

// ============================================================================
// Reports collectors that share an employee ID.
//
// Why this exists: employee IDs became unique via a partial unique index on
// CollectorProfile. MongoDB refuses to build that index while duplicate values
// are already stored — and because Mongoose builds indexes in the background,
// the failure is easy to miss. The app keeps running, the constraint silently
// is not there, and duplicates keep being accepted.
//
// Run this once before (or after) deploying the change. It only reports; it
// never edits data, because deciding which collector keeps a contested ID is
// an administrative call, not a scripted one.
//
//   node src/scripts/checkEmployeeIds.js
// ============================================================================

const checkEmployeeIds = async () => {
  try {
    await connectDB();

    // Group case-insensitively, so "EMP-001" and "emp-001" are reported as the
    // clash they are — the index alone would not catch that pair.
    const duplicates = await CollectorProfile.aggregate([
      { $match: { employeeId: { $gt: "" } } },
      {
        $group: {
          _id: { $toLower: "$employeeId" },
          count: { $sum: 1 },
          profiles: {
            $push: {
              profileId: "$_id",
              user: "$user",
              employeeId: "$employeeId",
            },
          },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (duplicates.length === 0) {
      console.log("=========================================");
      console.log(" No duplicate employee IDs found.");
      console.log(" The unique index can build cleanly.");
      console.log("=========================================");
      process.exit(0);
    }

    // Resolve names in one query. `profiles.user` is invented by the pipeline
    // and is not a schema path, so Model.populate() cannot be used here.
    const userIds = duplicates.flatMap((group) =>
      group.profiles.map((profile) => profile.user)
    );

    const users = await User.find({ _id: { $in: userIds } }).select(
      "name email"
    );

    const userMap = new Map(users.map((user) => [String(user._id), user]));

    console.log("=========================================");
    console.log(` ${duplicates.length} duplicated employee ID(s) found.`);
    console.log(" The unique index CANNOT build until these are resolved.");
    console.log("=========================================");

    duplicates.forEach((group) => {
      console.log(`\n Employee ID "${group._id}" is used by ${group.count}:`);

      group.profiles.forEach((profile) => {
        const user = userMap.get(String(profile.user));

        console.log(
          `   - ${user?.name || "Unknown"} <${user?.email || "no email"}>` +
            `  stored as "${profile.employeeId}"  (profile ${profile.profileId})`
        );
      });
    });

    console.log(
      "\n Fix: give each collector a distinct ID from their profile page, or"
    );
    console.log(" clear the ID of every collector but one, then re-run this.\n");

    process.exit(1);
  } catch (error) {
    console.error("[Check] Error checking employee IDs:", error.message);
    process.exit(1);
  }
};

checkEmployeeIds();
