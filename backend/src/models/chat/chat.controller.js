import { chatService } from "./chat.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { AppError } from "../../core/errors/AppError.js";

export const chatController = {
  /**
   * GET /api/v1/chat/conversations
   * Lấy danh sách conversations
   */
  getConversations: catchAsync(async (req, res) => {
    const userRole = req.user?.role;
    const userId = (userRole === 'user') ? (req.user?.id || req.user?._id) : null;
    const adminId = userRole === 'admin' ? (req.user?.id || req.user?._id) : null;
    const sellerId = userRole === 'seller' ? (req.user?.id || req.user?._id) : null;
    const { status, page, limit, assignedToMe } = req.query;

    const result = await chatService.getConversations(userId, adminId, sellerId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      assignedToMe: assignedToMe === "true"
    });

    res.json({
      success: true,
      data: result.conversations,
      pagination: result.pagination
    });
  }),

  /**
   * GET /api/v1/chat/conversations/:id
   * Lấy chi tiết conversation
   */
  getConversation: catchAsync(async (req, res) => {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = (userRole === 'user') ? (req.user?.id || req.user?._id) : null;
    const adminId = userRole === 'admin' ? (req.user?.id || req.user?._id) : null;
    const sellerId = userRole === 'seller' ? (req.user?.id || req.user?._id) : null;

    const conversation = await chatService.getConversationById(id, userId, adminId, sellerId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    res.json({
      success: true,
      data: conversation
    });
  }),

  /**
   * GET /api/v1/chat/conversations/:id/messages
   * Lấy tin nhắn của conversation
   * Admin và seller cùng vai trò
   */
  getMessages: catchAsync(async (req, res) => {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = (userRole === 'user') ? (req.user?.id || req.user?._id) : null;
    const adminId = userRole === 'admin' ? (req.user?.id || req.user?._id) : null;
    const sellerId = userRole === 'seller' ? (req.user?.id || req.user?._id) : null;
    const { page, limit } = req.query;

    // Kiểm tra quyền truy cập - admin và seller cùng vai trò
    const conversation = await chatService.getConversationById(id, userId, adminId, sellerId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    const result = await chatService.getMessages(id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      data: result.messages,
      pagination: result.pagination
    });
  }),

  /**
   * POST /api/v1/chat/conversations/:id/messages
   * Gửi tin nhắn mới
   */
  sendMessage: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { message, messageType, attachments } = req.body;
    const userRole = req.user?.role;
    const userId = (userRole === 'user') ? (req.user?.id || req.user?._id) : null;
    const isAdmin = userRole === 'admin';
    const isSeller = userRole === 'seller';
    const adminId = isAdmin ? (req.user?.id || req.user?._id) : null;
    const sellerId = isSeller ? (req.user?.id || req.user?._id) : null;

    if (!message && (!attachments || attachments.length === 0)) {
      throw new AppError("Message or attachments is required", 400);
    }

    // Xác định sender
    let senderId, senderType, senderName;
    if (isAdmin) {
      senderId = adminId;
      senderType = "admin";
      senderName = req.user.name || req.user.email;
    } else if (isSeller) {
      senderId = sellerId;
      senderType = "admin"; // Seller gửi tin nhắn như admin (hỗ trợ)
      senderName = req.user.name || req.user.email;
    } else if (userId) {
      senderId = userId;
      senderType = "user";
      senderName = req.user.name || req.user.email;
    } else {
      throw new AppError("Unauthorized", 401);
    }

    // Kiểm tra quyền truy cập conversation
    const conversation = await chatService.getConversationById(id, userId, adminId, sellerId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    const chatMessage = await chatService.createMessage(
      id,
      senderId,
      senderType,
      senderName,
      message || "",
      messageType || "text",
      attachments || []
    );

    res.json({
      success: true,
      data: chatMessage
    });
  }),

  /**
   * POST /api/v1/chat/conversations/:id/read
   * Đánh dấu đã đọc
   */
  markAsRead: catchAsync(async (req, res) => {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = (userRole === 'user') ? (req.user?.id || req.user?._id) : null;
    const adminId = userRole === 'admin' ? (req.user?.id || req.user?._id) : null;
    const sellerId = userRole === 'seller' ? (req.user?.id || req.user?._id) : null;

    // Kiểm tra quyền truy cập
    const conversation = await chatService.getConversationById(id, userId, adminId, sellerId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    await chatService.markAsRead(id, userId, adminId, sellerId);

    res.json({
      success: true,
      message: "Messages marked as read"
    });
  }),

  /**
   * PUT /api/v1/chat/conversations/:id/status
   * Cập nhật status conversation
   */
  updateStatus: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin';
    const isSeller = userRole === 'seller';

    if (!isAdmin && !isSeller) {
      throw new AppError("Only admin or seller can update conversation status", 403);
    }

    const conversation = await chatService.updateConversationStatus(id, status);

    res.json({
      success: true,
      data: conversation
    });
  }),

  /**
   * POST /api/v1/chat/conversations/:id/assign
   * Gán conversation cho admin
   */
  assignToAdmin: catchAsync(async (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'admin';
    const adminId = isAdmin ? (req.user?.id || req.user?._id) : null;

    if (!isAdmin || !adminId) {
      throw new AppError("Only admin can assign conversation to admin", 403);
    }

    const conversation = await chatService.assignToAdmin(id, adminId);

    res.json({
      success: true,
      data: conversation
    });
  }),

  /**
   * POST /api/v1/chat/conversations/:id/assign-seller
   * Gán conversation cho seller
   */
  assignToSeller: catchAsync(async (req, res) => {
    const { id } = req.params;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin';
    const isSeller = userRole === 'seller';
    const sellerId = isSeller ? (req.user?.id || req.user?._id) : req.body.sellerId;

    if (!isAdmin && !isSeller) {
      throw new AppError("Only admin or seller can assign conversation", 403);
    }

    // Admin có thể assign cho seller khác, seller chỉ có thể tự assign
    if (isSeller && sellerId !== (req.user?.id || req.user?._id)) {
      throw new AppError("Seller can only assign conversation to themselves", 403);
    }

    const conversation = await chatService.assignToSeller(id, sellerId);

    res.json({
      success: true,
      data: conversation
    });
  })
};

