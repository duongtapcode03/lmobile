import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import logger from "./config/logger.js";
import { flashSaleScheduler } from "./jobs/flashSaleScheduler.js";
import { setupChatSocket } from "./socket/chat.socket.js";

const PORT = process.env.PORT || 5000;

// Tạo HTTP server
const httpServer = createServer(app);

// Tạo Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Setup chat socket
setupChatSocket(io);

// Lưu io instance để có thể sử dụng ở nơi khác
app.set("io", io);

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(`💬 Socket.io chat server initialized`);
  
  // Khởi động Flash Sale Scheduler
  flashSaleScheduler.start();
  logger.info('📅 Flash Sale Scheduler started');
});
