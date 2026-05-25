import mongoose from "mongoose";
import dotenv from "dotenv";
import { logger } from "#utils/logger.js";
import { initData } from "#config/initDataSetup/index.js";

dotenv.config();

export const connectDatabase = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) throw new Error("MONGO_URI is not defined in .env");

  const isProd = process.env.NODE_ENV === "production";
  const maxRetries = 5;
  const baseRetryDelay = 3000;

  const connect = async (attempt = 1) => {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        w: "majority",
        // TLS only when MongoDB Atlas (mongodb+srv://) is used
        ...(MONGO_URI.startsWith("mongodb+srv://")
          ? {
              tls: true,
              tlsAllowInvalidCertificates: !isProd,
            }
          : {}),
      });

      logger.info("MongoDB connected", {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      });

      // Seed default data after connection (idempotent)
      await initData();
    } catch (err) {
      logger.error(
        `MongoDB connection failed (attempt ${attempt}/${maxRetries}): ${err.message}`
      );

      if (attempt >= maxRetries) {
        logger.error("Max retry attempts reached. Exiting...");
        process.exit(1);
      }

      const delay = baseRetryDelay * attempt;
      logger.warn(`Retrying in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
      await connect(attempt + 1);
    }
  };

  await connect();

  mongoose.connection.on("disconnected", () =>
    logger.warn("MongoDB disconnected")
  );
  mongoose.connection.on("reconnected", () =>
    logger.info("MongoDB reconnected")
  );
  mongoose.connection.on("error", (err) =>
    logger.error("MongoDB connection error", { message: err.message })
  );
};
