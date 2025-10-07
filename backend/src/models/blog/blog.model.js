import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Tiêu đề không được quá 200 ký tự"]
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [50000, "Nội dung không được quá 50000 ký tự"]
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, "Tóm tắt không được quá 500 ký tự"]
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    category: {
      type: String,
      enum: ["news", "review", "guide", "promotion", "technology", "tips"],
      required: true,
      default: "news"
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [30, "Tag không được quá 30 ký tự"]
    }],
    featuredImage: {
      type: String,
      default: ""
    },
    images: [{
      type: String
    }],
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft"
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date
    },
    viewCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt xem không được âm"]
    },
    likeCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt thích không được âm"]
    },
    commentCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt bình luận không được âm"]
    },
    shareCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt chia sẻ không được âm"]
    },
    readingTime: {
      type: Number,
      default: 0,
      min: [0, "Thời gian đọc không được âm"]
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: [60, "SEO title không được quá 60 ký tự"]
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: [160, "SEO description không được quá 160 ký tự"]
    },
    seoKeywords: [{
      type: String,
      trim: true
    }],
    relatedProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }],
    relatedBlogs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog"
    }],
    allowComments: {
      type: Boolean,
      default: true
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    scheduledAt: {
      type: Date
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để kiểm tra blog đã được publish chưa
blogSchema.virtual("isPublished").get(function() {
  return this.status === "published" && this.publishedAt && this.publishedAt <= new Date();
});

// Virtual để kiểm tra blog có thể xem không
blogSchema.virtual("canView").get(function() {
  return this.isPublic && this.isPublished;
});

// Virtual để tính thời gian đọc (ước tính)
blogSchema.virtual("estimatedReadingTime").get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Virtual để lấy author info
blogSchema.virtual("authorInfo", {
  ref: "User",
  localField: "author",
  foreignField: "_id",
  justOne: true
});

// Tự động tạo slug từ title
blogSchema.pre("save", function(next) {
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }
  next();
});

// Tự động tính thời gian đọc
blogSchema.pre("save", function(next) {
  if (this.isModified("content")) {
    this.readingTime = this.estimatedReadingTime;
  }
  next();
});

// Tự động set publishedAt khi publish
blogSchema.pre("save", function(next) {
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Index để tối ưu tìm kiếm
blogSchema.index({ title: "text", content: "text", tags: "text" });
blogSchema.index({ slug: 1 });
blogSchema.index({ author: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ status: 1 });
blogSchema.index({ isFeatured: 1 });
blogSchema.index({ isPinned: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ viewCount: -1 });
blogSchema.index({ likeCount: -1 });
blogSchema.index({ createdAt: -1 });

export const Blog = mongoose.model("Blog", blogSchema);
