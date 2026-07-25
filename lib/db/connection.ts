import mongoose from "mongoose";

let isConnected = false;

async function connect(): Promise<void> {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  isConnected = true;
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    process.on("SIGINT", async () => {
      await mongoose.disconnect();
      isConnected = false;
      process.exit(0);
    });
  }
}

async function disconnect(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

export { connect, disconnect };
