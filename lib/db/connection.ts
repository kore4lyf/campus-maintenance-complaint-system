import mongoose from "mongoose";

let isConnected = false;

async function connect(): Promise<void> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("MongoDB connection timeout waiting for open event"));
        }, 5000);
        mongoose.connection.once("open", () => {
          clearTimeout(timeout);
          resolve(true);
        });
        mongoose.connection.once("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }
    isConnected = true;
  } catch (error) {
    isConnected = false;
    throw error;
  }
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
