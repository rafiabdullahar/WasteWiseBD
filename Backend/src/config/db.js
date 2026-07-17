import mongoose from "mongoose";
import dns from "node:dns";

// Some networks/ISPs (common complaint in BD) block or mishandle the DNS SRV
// lookups Atlas relies on. Pointing at public resolvers avoids that class of
// "querySrv ENOTFOUND" errors. Safe to remove if your network doesn't need it.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error(
      "MONGO_URI is not defined. Add it to your .env file (see .env.example)."
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("ERROR connecting to MongoDB:", error.message);
    process.exit(1);
  }
};
