import { ChatConversation, ChatMessage } from "./chat.model.js";
import { User } from "../user/user.model.js";

export const chatService = {
  /**
   * Tạo hoặc lấy conversation cho user
   */
  async getOrCreateConversation(userId) {
    let conversation = await ChatConversation.findOne({
      userId,
      status: { $in: ["open", "pending"] }
    }).sort({ createdAt: -1 });

    if (!conversation) {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      conversation = new ChatConversation({
        userId,
        userName: user.name || user.email,
        userEmail: user.email,
        status: "open"
      });
      await conversation.save();
    }

    return conversation;
  },

  /**
   * Lấy conversation theo ID
   * Admin và seller cùng vai trò - có thể xem tất cả conversations của user
   */
  async getConversationById(conversationId, userId = null, adminId = null, sellerId = null) {
    const query = { _id: conversationId };
    
    // User chỉ có thể xem conversation của mình
    if (userId) {
      query.userId = userId;
    }
    
    // Admin và Seller cùng vai trò - có thể xem tất cả conversations của user
    // Không cần thêm điều kiện filter
    
    const conversation = await ChatConversation.findOne(query)
      .populate("userId", "name email")
      .populate("adminId", "name email")
      .populate("sellerId", "name email");

    return conversation;
  },

  /**
   * Lấy danh sách conversations
   * Admin và seller cùng vai trò - cả hai đều có thể xem tất cả conversations của user
   */
  async getConversations(userId = null, adminId = null, sellerId = null, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const query = {};

    if (userId) {
      // User chỉ xem conversations của mình
      query.userId = userId;
    } else if (adminId || sellerId) {
      // Admin và seller cùng vai trò - có thể xem tất cả conversations của user (khách hàng)
      // Đảm bảo chỉ lấy conversations có userId là user (role = 'user'), không phải admin/seller
      // Get all users with role 'user' and filter conversations by those userIds
      const regularUsers = await User.find({ role: 'user' }).select('_id').lean();
      const regularUserIds = regularUsers.map(u => u._id);
      if (regularUserIds.length > 0) {
        query.userId = { $in: regularUserIds };
      } else {
        // If no regular users exist, return empty result
        query.userId = { $in: [] };
      }
      
      // Chỉ filter theo assignedToMe nếu được yêu cầu
      if (options.assignedToMe) {
        const staffId = adminId || sellerId;
        // Combine with existing userId filter using $and
        const assignedQuery = {
          $or: [
            { adminId: staffId },
            { sellerId: staffId }
          ]
        };
        // If userId filter exists, combine with $and
        if (query.userId) {
          query.$and = [
            { userId: query.userId },
            assignedQuery
          ];
          delete query.userId;
        } else {
          Object.assign(query, assignedQuery);
        }
      }
      // Nếu không có assignedToMe, trả về tất cả conversations của user
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const conversations = await ChatConversation.find(query)
      .populate("userId", "name email")
      .populate("adminId", "name email")
      .populate("sellerId", "name email")
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ChatConversation.countDocuments(query);

    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Gán conversation cho admin
   */
  async assignToAdmin(conversationId, adminId) {
    const admin = await User.findOne({ _id: adminId, role: 'admin' });
    if (!admin) {
      throw new Error("Admin not found");
    }

    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    conversation.adminId = adminId;
    conversation.adminName = admin.name || admin.email;
    conversation.sellerId = null; // Clear seller nếu assign cho admin
    conversation.sellerName = null;
    conversation.status = "pending";
    await conversation.save();

    return conversation;
  },

  /**
   * Gán conversation cho seller
   */
  async assignToSeller(conversationId, sellerId) {
    const seller = await User.findOne({ _id: sellerId, role: 'seller' });
    if (!seller) {
      throw new Error("Seller not found");
    }

    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    conversation.sellerId = sellerId;
    conversation.sellerName = seller.name || seller.email;
    conversation.adminId = null; // Clear admin nếu assign cho seller
    conversation.adminName = null;
    conversation.status = "pending";
    await conversation.save();

    return conversation;
  },

  /**
   * Tạo tin nhắn mới
   */
  async createMessage(conversationId, senderId, senderType, senderName, message, messageType = "text", attachments = []) {
    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const chatMessage = new ChatMessage({
      conversationId,
      senderId,
      senderType,
      senderName,
      message,
      messageType,
      attachments
    });

    await chatMessage.save();

    // Cập nhật conversation
    conversation.lastMessage = message;
    conversation.lastMessageAt = new Date();
    
    // Nếu admin/seller gửi tin nhắn và conversation chưa được assign, tự động assign
    if (senderType === "admin") {
      // Tìm xem senderId là admin hay seller
      const sender = await User.findById(senderId);
      if (sender) {
        if (sender.role === 'admin' && !conversation.adminId) {
          conversation.adminId = senderId;
          conversation.adminName = sender.name || sender.email;
        } else if (sender.role === 'seller' && !conversation.sellerId) {
          conversation.sellerId = senderId;
          conversation.sellerName = sender.name || sender.email;
        }
        // Nếu conversation chưa có status, set thành pending
        if (conversation.status === "open") {
          conversation.status = "pending";
        }
      }
    }
    
    // Cập nhật unread count
    if (senderType === "user") {
      conversation.unreadCount.admin = (conversation.unreadCount.admin || 0) + 1;
    } else if (senderType === "admin") {
      conversation.unreadCount.user = (conversation.unreadCount.user || 0) + 1;
    }

    await conversation.save();

    // Populate để trả về đầy đủ thông tin
    await chatMessage.populate("conversationId");

    return chatMessage;
  },

  /**
   * Lấy tin nhắn của conversation
   */
  async getMessages(conversationId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find({
      conversationId,
      isDeleted: false
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ChatMessage.countDocuments({
      conversationId,
      isDeleted: false
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Đánh dấu tin nhắn đã đọc
   * Admin và seller cùng vai trò
   */
  async markAsRead(conversationId, userId = null, adminId = null, sellerId = null) {
    const query = { conversationId, isRead: false };
    
    if (userId) {
      query.senderType = { $ne: "user" }; // User đánh dấu tin nhắn từ admin/system
    } else if (adminId || sellerId) {
      // Admin và seller cùng vai trò - đánh dấu tin nhắn từ user
      query.senderType = "user";
    }

    const result = await ChatMessage.updateMany(query, {
      isRead: true,
      readAt: new Date()
    });

    // Cập nhật unread count trong conversation
    const conversation = await ChatConversation.findById(conversationId);
    if (conversation) {
      if (userId) {
        conversation.unreadCount.user = 0;
      } else if (adminId || sellerId) {
        // Admin và seller cùng vai trò - cập nhật unreadCount.admin
        conversation.unreadCount.admin = 0;
      }
      await conversation.save();
    }

    return result;
  },

  /**
   * Cập nhật status conversation
   */
  async updateConversationStatus(conversationId, status) {
    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    conversation.status = status;
    await conversation.save();

    return conversation;
  }
};

