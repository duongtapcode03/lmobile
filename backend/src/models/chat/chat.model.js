import mongoose from "mongoose";

/**
 * Chat Model - Quản lý tin nhắn chat hỗ trợ khách hàng
 */
const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    senderType: {
      type: String,
      enum: ["user", "admin", "system"],
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text"
    },
    attachments: [{
      type: {
        type: String, // 'image', 'file'
        required: true
      },
      url: {
        type: String,
        required: true
      },
      filename: String,
      size: Number
    }],
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });
chatMessageSchema.index({ senderId: 1, createdAt: -1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

/**
 * Chat Conversation Model - Quản lý cuộc trò chuyện
 */
const chatConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    adminName: {
      type: String
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    sellerName: {
      type: String
    },
    status: {
      type: String,
      enum: ["open", "pending", "resolved", "closed"],
      default: "open",
      index: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    subject: {
      type: String,
      trim: true
    },
    lastMessage: {
      type: String,
      trim: true
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    unreadCount: {
      user: {
        type: Number,
        default: 0
      },
      admin: {
        type: Number,
        default: 0
      }
    },
    tags: [{
      type: String
    }],
    notes: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
chatConversationSchema.index({ userId: 1, status: 1 });
chatConversationSchema.index({ adminId: 1, status: 1 });
chatConversationSchema.index({ status: 1, lastMessageAt: -1 });

// Virtual: messages
chatConversationSchema.virtual("messages", {
  ref: "ChatMessage",
  localField: "_id",
  foreignField: "conversationId"
});

export const ChatConversation = mongoose.model("ChatConversation", chatConversationSchema);

