import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/user/user.model.js";
import { chatService } from "../models/chat/chat.service.js";

/**
 * Socket.io Chat Handler
 */
export function setupChatSocket(io) {
  // Middleware để xác thực socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");
      
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Tìm user (admin cũng là user với role='admin')
      let user = null;
      let userType = null;
      
      if (decoded.id) {
        user = await User.findById(decoded.id);
        if (user) {
          // Kiểm tra role để xác định userType
          if (user.role === 'admin' || user.role === 'seller') {
            userType = "admin"; // Seller cũng được coi là admin trong chat (hỗ trợ khách hàng)
          } else {
            userType = "user";
          }
        }
      }

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.userId = user._id.toString();
      socket.userType = userType;
      socket.userName = user.name || user.email;
      socket.user = user; // Lưu user object để dùng sau này
      socket.userRole = user.role; // Lưu role riêng để dễ truy cập
      
      next();
    } catch (error) {
      next(new Error("Authentication error: " + error.message));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.userId} (${socket.userType})`);

    // Join room theo userId
    socket.join(`user_${socket.userId}`);
    
    // Nếu là admin hoặc seller, join admin room (hỗ trợ khách hàng)
    if (socket.userType === "admin") {
      socket.join("admin_room");
      socket.join("seller_room"); // Seller cũng join seller room riêng
    }

    /**
     * User tạo hoặc join conversation
     */
    socket.on("join_conversation", async (data) => {
      try {
        const { conversationId } = data;
        
        if (conversationId) {
          // Join conversation room
          socket.join(`conversation_${conversationId}`);
          
          // Đánh dấu đã đọc
          await chatService.markAsRead(conversationId, socket.userId, null);
          
          socket.emit("conversation_joined", { conversationId });
        } else {
          // Tạo hoặc lấy conversation mới
          const conversation = await chatService.getOrCreateConversation(socket.userId);
          socket.join(`conversation_${conversation._id}`);
          
          socket.emit("conversation_created", { conversation });
        }
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * Gửi tin nhắn
     */
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, message, messageType, attachments } = data;

        if (!conversationId) {
          return socket.emit("error", { message: "Conversation ID is required" });
        }

        // Kiểm tra quyền truy cập
        const userRole = socket.userRole || socket.user?.role || 'user';
        const isAdmin = userRole === 'admin';
        const isSeller = userRole === 'seller';
        const adminId = isAdmin ? socket.userId : null;
        const sellerId = isSeller ? socket.userId : null;
        
        const conversation = await chatService.getConversationById(
          conversationId,
          socket.userType === "user" ? socket.userId : null,
          adminId,
          sellerId
        );

        if (!conversation) {
          return socket.emit("error", { message: "Conversation not found" });
        }

        // Tạo tin nhắn
        const chatMessage = await chatService.createMessage(
          conversationId,
          socket.userId,
          socket.userType,
          socket.userName,
          message,
          messageType || "text",
          attachments || []
        );

        // Gửi tin nhắn đến tất cả clients trong conversation room (bao gồm cả người gửi)
        io.to(`conversation_${conversationId}`).emit("new_message", {
          message: chatMessage,
          conversation: conversation
        });
        // Cũng emit cho chính người gửi để đảm bảo họ nhận được tin nhắn
        socket.emit("new_message", {
          message: chatMessage,
          conversation: conversation
        });

        // Thông báo cho admin nếu user gửi tin nhắn
        if (socket.userType === "user") {
          io.to("admin_room").emit("new_user_message", {
            conversationId,
            message: chatMessage,
            conversation: conversation
          });
        }

        // Thông báo cho user nếu admin gửi tin nhắn
        if (socket.userType === "admin") {
          io.to(`user_${conversation.userId}`).emit("new_admin_message", {
            conversationId,
            message: chatMessage,
            conversation: conversation
          });
        }
      } catch (error) {
        console.error("[Socket] Error sending message:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * Đánh dấu đã đọc
     */
    socket.on("mark_as_read", async (data) => {
      try {
        const { conversationId } = data;
        
        if (!conversationId) {
          return socket.emit("error", { message: "Conversation ID is required" });
        }

        const userRole = socket.userRole || socket.user?.role || 'user';
        const isAdmin = userRole === 'admin';
        const isSeller = userRole === 'seller';
        const adminId = isAdmin ? socket.userId : null;
        const sellerId = isSeller ? socket.userId : null;
        
        await chatService.markAsRead(
          conversationId,
          socket.userType === "user" ? socket.userId : null,
          adminId,
          sellerId
        );

        // Thông báo cho tất cả clients trong conversation
        io.to(`conversation_${conversationId}`).emit("messages_read", {
          conversationId,
          readBy: socket.userId
        });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * Typing indicator
     */
    socket.on("typing", (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit("user_typing", {
        userId: socket.userId,
        userName: socket.userName,
        conversationId
      });
    });

    socket.on("stop_typing", (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit("user_stop_typing", {
        userId: socket.userId,
        conversationId
      });
    });

    /**
     * Disconnect
     */
    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${socket.userId}`);
    });
  });

  return io;
}

