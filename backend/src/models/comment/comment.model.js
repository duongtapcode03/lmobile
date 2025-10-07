import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Nội dung bình luận không được quá 1000 ký tự"]
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "hidden"],
      default: "pending"
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    likeCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt thích không được âm"]
    },
    dislikeCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt không thích không được âm"]
    },
    replyCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt trả lời không được âm"]
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    reportedCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt báo cáo không được âm"]
    },
    moderationNote: {
      type: String,
      trim: true,
      maxlength: [200, "Ghi chú kiểm duyệt không được quá 200 ký tự"]
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    moderatedAt: {
      type: Date
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    tags: [{
      type: String,
      trim: true,
      maxlength: [20, "Tag không được quá 20 ký tự"]
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để tính điểm tương tác
commentSchema.virtual("engagementScore").get(function() {
  return this.likeCount - this.dislikeCount + (this.replyCount * 2);
});

// Virtual để kiểm tra có thể chỉnh sửa không
commentSchema.virtual("canEdit").get(function() {
  const hoursSinceCreated = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreated <= 24 && this.status === "approved"; // Có thể sửa trong 24h
});

// Virtual để kiểm tra có thể xóa không
commentSchema.virtual("canDelete").get(function() {
  const hoursSinceCreated = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreated <= 24; // Có thể xóa trong 24h
});

// Virtual để kiểm tra có phải reply không
commentSchema.virtual("isReply").get(function() {
  return this.parentComment !== null;
});

// Virtual để lấy thông tin user
commentSchema.virtual("userInfo", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true
});

// Virtual để lấy thông tin blog
commentSchema.virtual("blogInfo", {
  ref: "Blog",
  localField: "blog",
  foreignField: "_id",
  justOne: true
});

// Virtual để lấy thông tin parent comment
commentSchema.virtual("parentCommentInfo", {
  ref: "Comment",
  localField: "parentComment",
  foreignField: "_id",
  justOne: true
});

// Middleware để tự động cập nhật số lượng comment của blog
commentSchema.post("save", async function() {
  if (this.status === "approved") {
    await this.constructor.updateBlogCommentCount(this.blog);
  }
});

commentSchema.post("findOneAndUpdate", async function() {
  if (this.status === "approved") {
    await this.constructor.updateBlogCommentCount(this.blog);
  }
});

commentSchema.post("findOneAndDelete", async function() {
  await this.constructor.updateBlogCommentCount(this.blog);
});

// Static method để cập nhật số lượng comment của blog
commentSchema.statics.updateBlogCommentCount = async function(blogId) {
  const { Blog } = await import("../blog/blog.model.js");
  
  const count = await this.countDocuments({ 
    blog: blogId, 
    status: "approved" 
  });

  await Blog.findByIdAndUpdate(blogId, { commentCount: count });
};

// Middleware để tự động cập nhật số lượng reply của parent comment
commentSchema.post("save", async function() {
  if (this.parentComment && this.status === "approved") {
    await this.constructor.updateParentCommentReplyCount(this.parentComment);
  }
});

commentSchema.post("findOneAndDelete", async function() {
  if (this.parentComment) {
    await this.constructor.updateParentCommentReplyCount(this.parentComment);
  }
});

// Static method để cập nhật số lượng reply của parent comment
commentSchema.statics.updateParentCommentReplyCount = async function(parentCommentId) {
  const count = await this.countDocuments({ 
    parentComment: parentCommentId, 
    status: "approved" 
  });

  await this.findByIdAndUpdate(parentCommentId, { replyCount: count });
};

// Index để tối ưu truy vấn
commentSchema.index({ blog: 1 });
commentSchema.index({ user: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ status: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ likeCount: -1 });
commentSchema.index({ isPinned: 1 });
commentSchema.index({ blog: 1, status: 1, createdAt: -1 });

export const Comment = mongoose.model("Comment", commentSchema);
