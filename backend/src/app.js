import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
// import rateLimit from "express-rate-limit"; // Disabled - rate limiting is off
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import routes from "./routes/index.js";
import { errorHandler } from "./core/middleware/errorHandler.js";
import logger from "./config/logger.js";

dotenv.config();
connectDB();

const app = express();

// Security Headers
app.use(helmet());

// Body Parser với size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use(cors());

// HTTP Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate Limiting - General API
// DISABLED - Rate limiting is disabled in all environments
// Uncomment below to enable rate limiting
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use("/api", limiter);
*/
console.log('[Rate Limiting] Disabled in all environments');

// API Versioning
// Support both /api and /api/v1 for backward compatibility
app.use("/api", routes); // Non-versioned routes (backward compatibility)
app.use("/api/v1", routes); // Versioned routes

// Debug: Log all registered routes
console.log('[App] Routes registered. Admin routes should be at /api/v1/admin/*');

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Global Error Handler (must be last middleware)
app.use(errorHandler);

export default app;
