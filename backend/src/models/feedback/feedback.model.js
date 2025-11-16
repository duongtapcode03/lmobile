import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    product: {
      type: Number,
      ref: "Product",
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "Đánh giá phải từ 1 sao"],
      max: [5, "Đánh giá không được quá 5 sao"]
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, "Tiêu đề không được quá 200 ký tự"]
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, "Nội dung đánh giá không được quá 2000 ký tự"]
    },
    images: [{
      type: String,
      validate: {
        validator: function(v) {
          return v.length <= 5;
        },
        message: "Không được quá 5 hình ảnh"
      }
    }],
    pros: [{
      type: String,
      trim: true,
      maxlength: [100, "Ưu điểm không được quá 100 ký tự"]
    }],
    cons: [{
      type: String,
      trim: true,
      maxlength: [100, "Nhược điểm không được quá 100 ký tự"]
    }],
    verified: {
      type: Boolean,
      default: false
    },
    helpful: {
      type: Number,
      default: 0,
      min: [0, "Số lượt hữu ích không được âm"]
    },
    notHelpful: {
      type: Number,
      default: 0,
      min: [0, "Số lượt không hữu ích không được âm"]
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "hidden"],
      default: "pending"
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    response: {
      content: {
        type: String,
        trim: true,
        maxlength: [1000, "Phản hồi không được quá 1000 ký tự"]
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      respondedAt: {
        type: Date
      }
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [20, "Tag không được quá 20 ký tự"]
    }],
    deviceInfo: {
      model: String,
      color: String,
      storage: String,
      ram: String
    },
    purchaseDate: {
      type: Date
    },
    usageDuration: {
      type: String,
      enum: ["less_than_week", "1_week", "1_month", "3_months", "6_months", "1_year", "more_than_year"]
    },
    recommend: {
      type: Boolean
    },
    reportedCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt báo cáo không được âm"]
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    moderatedAt: {
      type: Date
    },
    moderationNote: {
      type: String,
      trim: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để tính điểm hữu ích
feedbackSchema.virtual("helpfulnessScore").get(function() {
  const total = this.helpful + this.notHelpful;
  if (total === 0) return 0;
  return (this.helpful / total) * 100;
});

// Virtual để kiểm tra có thể chỉnh sửa không
feedbackSchema.virtual("canEdit").get(function() {
  const hoursSinceCreated = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreated <= 24 && this.status === "approved"; // Có thể sửa trong 24h
});

// Virtual để kiểm tra có thể xóa không
feedbackSchema.virtual("canDelete").get(function() {
  const hoursSinceCreated = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreated <= 24; // Có thể xóa trong 24h
});

// Virtual để lấy thông tin user
feedbackSchema.virtual("userInfo", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true
});

// Virtual để lấy thông tin sản phẩm
feedbackSchema.virtual("productInfo", {
  ref: "Product",
  localField: "product",
  foreignField: "_id",
  justOne: true
});

// Middleware để tự động cập nhật rating của sản phẩm
feedbackSchema.post("save", async function() {
  if (this.status === "approved") {
    await this.constructor.updateProductRating(this.product);
  }
});

feedbackSchema.post("findOneAndUpdate", async function() {
  if (this.status === "approved") {
    await this.constructor.updateProductRating(this.product);
  }
});

feedbackSchema.post("findOneAndDelete", async function() {
  await this.constructor.updateProductRating(this.product);
});

// Static method để cập nhật rating sản phẩm
feedbackSchema.statics.updateProductRating = async function(productId) {
  const { Product } = await import("../product/product.model.js");
  
  // Convert productId to Number nếu là string
  const productIdNum = typeof productId === 'string' ? parseInt(productId, 10) : productId;
  if (isNaN(productIdNum)) {
    return;
  }
  
  const stats = await this.aggregate([
    { $match: { product: productIdNum, status: "approved" } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productIdNum, {
      rating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].totalReviews
    });
  }
};

// Index để tối ưu truy vấn
feedbackSchema.index({ user: 1, product: 1 }, { unique: true }); // Mỗi user chỉ đánh giá 1 lần/sản phẩm
feedbackSchema.index({ product: 1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ verified: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ helpful: -1 });
feedbackSchema.index({ order: 1 });

export const Feedback = mongoose.model("Feedback", feedbackSchema);
