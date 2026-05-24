import mongoose from "mongoose";
import dotenv from "dotenv";
import { initData } from "#config/initDataSetup/index.js";

dotenv.config();

export const connectDatabase = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) throw new Error("MONGO_URI not defined in .env");

  const isProd = process.env.NODE_ENV === "production";
  const maxRetries = 5;
  const retryDelay = 3000;

  const connect = async (attempt = 1) => {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        tls: true,
        tlsAllowInvalidCertificates: !isProd,
        retryWrites: true,
        w: "majority",
      });
      await initData();
      console.log("MongoDB connected!");
    } catch (err) {
      console.error(`MongoDB connection failed (attempt ${attempt}/${maxRetries}):`);
      console.error(`  Message: ${err.message}`);

      if (err.reason) {
        console.error(`  Reason: ${JSON.stringify(err.reason)}`);
      }

      if (err.name === "MongooseServerSelectionError") {
        console.error("  Hint: Check MongoDB Atlas whitelist, cluster status, and ensure DNS resolves");
      }

      if (attempt >= maxRetries) {
        console.error("Max retry attempts reached. Exiting...");
        process.exit(1);
      }

      const delay = retryDelay * attempt;
      console.log(`Retrying in ${delay / 1000} sec...`);
      await new Promise((res) => setTimeout(res, delay));
      await connect(attempt + 1);
    }
  };

  await connect();

  mongoose.connection.on("disconnected", () =>
    console.warn("MongoDB disconnected")
  );
  mongoose.connection.on("reconnected", () =>
    console.log("MongoDB reconnected")
  );
  mongoose.connection.on("error", (err) =>
    console.error("MongoDB connection error:", err.message)
  );
};
