import dotenv from "dotenv";
import mongoose from "mongoose";
import { createIndexes } from "../infrastructure/database/indexes";
import logger from "../shared/logger/winston.logger";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/Shipcrowd";

// Database connection options
const options = {
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10'), // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_TIMEOUT_MS || '5000'), // Keep trying to send operations for 5 seconds
  socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS || '45000'), // Close sockets after 45 seconds of inactivity
};

// Connect to MongoDB
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI, options);
    logger.info("MongoDB connected successfully");

    // Create database indexes for performance
    await createIndexes();


    // Handle connection events
    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.info("MongoDB disconnected");
    });


    // Handle application termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed due to app termination");
      process.exit(0);
    });
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
