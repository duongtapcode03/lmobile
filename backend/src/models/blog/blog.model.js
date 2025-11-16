import mongoose from "mongoose";

/**
 * Blog Model - Refactored để match với cấu trúc blog_posts_merged.json
 * Model này hỗ trợ cả structure mới từ crawl data
 */
const blogImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  alt: {
    type: String
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  srcset: [{
    url: String,
    width: String,
    type: String
  }]
}, { _id: false });

const blogItemSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true
  },
  lstDescription: [{
    type: String
  }],
  image: blogImageSchema
}, { _id: false });

const featuredImageSchema = new mongoose.Schema({
  original: {
    type: String
  },
  sizes: [{
    type: String
  }]
}, { _id: false });

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Tiêu đề không được quá 200 ký tự"],
      index: true
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [500, "Phụ đề không được quá 500 ký tự"]
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
      index: true
    },

    // Author Information
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    authorName: {
      type: String,
      trim: true,
      index: true
    },
    avatar: {
      type: String
    },

    // Content
    content: {
      type: String,
      maxlength: [50000, "Nội dung không được quá 50000 ký tự"]
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, "Tóm tắt không được quá 500 ký tự"]
    },

    // Blog Items (structured content from crawl)
    blog_items: [blogItemSchema],

    // Images
    featuredImage: {
      type: String,
      default: ""
    },
    featuredImageData: featuredImageSchema,
    images: [{
      type: String
    }],

    // Category and Tags
    category: {
      type: String,
      enum: ["news", "review", "guide", "promotion", "technology", "tips"],
      default: "news",
      index: true
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [30, "Tag không được quá 30 ký tự"]
    }],

    // Publishing
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true
    },
    publishDate: {
      type: String
    },
    publishedAt: {
      type: Date,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true
    },

    // Statistics
    viewCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt xem không được âm"],
      index: true
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

    // SEO
    seoTitle: {
      type: String,
      trim: true,
      maxlength: [70, "SEO title không được quá 70 ký tự"],
      validate: {
        validator: function(v) {
          if (!v) return true; // Cho phép null/undefined
          return v.length <= 70;
        },
        message: "SEO title không được quá 70 ký tự"
      }
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

    // Relations
    relatedProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }],
    relatedBlogs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog"
    }],

    // Settings
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
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        if (ret._id) {
          ret._id = ret._id.toString();
        }
        return ret;
      }
    },
    toObject: { 
      virtuals: true,
      transform: function(doc, ret) {
        if (ret._id) {
          ret._id = ret._id.toString();
        }
        return ret;
      }
    }
  }
);

// Virtual để kiểm tra blog đã được publish chưa
blogSchema.virtual("isPublished").get(function() {
  return this.status === "published" && 
         (this.publishedAt ? this.publishedAt <= new Date() : true);
});

// Virtual để kiểm tra blog có thể xem không
blogSchema.virtual("canView").get(function() {
  return this.isPublic && this.isPublished;
});

// Virtual để tính thời gian đọc (ước tính)
blogSchema.virtual("estimatedReadingTime").get(function() {
  if (this.readingTime > 0) return this.readingTime;
  
  const wordsPerMinute = 200;
  let wordCount = 0;
  
  // Count words from content
  if (this.content) {
    wordCount += this.content.split(/\s+/).length;
  }
  
  // Count words from blog_items
  if (this.blog_items && Array.isArray(this.blog_items)) {
    this.blog_items.forEach(item => {
      if (item.lstDescription && Array.isArray(item.lstDescription)) {
        item.lstDescription.forEach(desc => {
          wordCount += desc.split(/\s+/).length;
        });
      }
    });
  }
  
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
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
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }
  next();
});

// Tự động tính thời gian đọc
blogSchema.pre("save", function(next) {
  if (this.isModified("content") || this.isModified("blog_items")) {
    this.readingTime = this.estimatedReadingTime;
  }
  next();
});

// Tự động set publishedAt khi publish
blogSchema.pre("save", function(next) {
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Parse publishDate string to Date if available
  if (this.publishDate && !this.publishedAt) {
    const parsedDate = new Date(this.publishDate);
    if (!isNaN(parsedDate.getTime())) {
      this.publishedAt = parsedDate;
    }
  }
  next();
});

// Index để tối ưu tìm kiếm
blogSchema.index({ title: "text", subtitle: "text", content: "text", tags: "text" });
blogSchema.index({ author: 1 });
blogSchema.index({ authorName: 1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ isFeatured: 1, isPinned: 1 });
blogSchema.index({ viewCount: -1 });
blogSchema.index({ likeCount: -1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ publishedAt: -1 });

export const Blog = mongoose.model("Blog", blogSchema);
