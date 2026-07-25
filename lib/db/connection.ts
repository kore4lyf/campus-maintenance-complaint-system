import mongoose from "mongoose";

let isConnected = false;

async function connect(): Promise<void> {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  await mongoose.connect(uri);
  isConnected = true;
}

async function disconnect(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

export { connect, disconnect };
