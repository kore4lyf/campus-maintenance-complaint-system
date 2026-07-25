/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.log("ERROR: MONGODB_URI is not set in .env");
  process.exit(1);
}

console.log("URI found. Length:", uri.length);
console.log("Trying to connect...");

mongoose
  .connect(uri)
  .then(() => {
    console.log("SUCCESS: Connected to MongoDB");
    return mongoose.connection.db.admin().listDatabases();
  })
  .then((databases) => {
    console.log("Databases:", databases.databases.map((d) => d.name).join(", "));
    return mongoose.disconnect();
  })
  .then(() => {
    console.log("Disconnected.");
    process.exit(0);
  })
  .catch((err) => {
    console.log("FAILED:", err.message);
    process.exit(1);
  });
