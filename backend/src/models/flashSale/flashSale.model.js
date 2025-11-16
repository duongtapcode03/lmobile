import mongoose from "mongoose";

/**
 * Flash Sale Model - Bảng flash_sales
 * Quản lý khung thời gian Flash Sale
 */
const flashSaleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Tên flash sale không được quá 200 ký tự"],
      index: true
    },
    start_time: {
      type: Date,
      required: true,
      index: true
    },
    end_time: {
      type: Date,
      required: true,
      index: true,
      validate: {
        validator: function(value) {
          return value > this.start_time;
        },
        message: "Thời gian kết thúc phải sau thời gian bắt đầu"
      }
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Mô tả không được quá 1000 ký tự"]
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: Tính trạng thái thực tế (scheduled/active/ended)
flashSaleSchema.virtual("actualStatus").get(function() {
  const now = new Date();
  if (now < this.start_time) {
    return "scheduled";
  } else if (now >= this.start_time && now <= this.end_time) {
    return this.status === "active" ? "active" : "inactive";
  } else {
    return "ended";
  }
});

// Virtual: Kiểm tra có đang active không
flashSaleSchema.virtual("isActive").get(function() {
  const now = new Date();
  return this.status === "active" && 
         now >= this.start_time && 
         now <= this.end_time;
});

// Virtual: Số lượng sản phẩm trong flash sale
flashSaleSchema.virtual("itemsCount", {
  ref: "FlashSaleItem",
  localField: "_id",
  foreignField: "flash_sale_id",
  count: true
});

// Virtual: Tổng số lượng đã bán
flashSaleSchema.virtual("totalSold", {
  ref: "FlashSaleItem",
  localField: "_id",
  foreignField: "flash_sale_id",
  options: {
    match: {}
  }
});

// Indexes
flashSaleSchema.index({ start_time: 1, end_time: 1 });
flashSaleSchema.index({ status: 1, start_time: 1, end_time: 1 });
flashSaleSchema.index({ created_by: 1 });

// Pre-save middleware
flashSaleSchema.pre("save", function(next) {
  // Tự động cập nhật status nếu đã qua thời gian
  const now = new Date();
  if (now > this.end_time && this.status === "active") {
    // Có thể tự động set inactive nếu muốn
    // this.status = "inactive";
  }
  next();
});

export const FlashSale = mongoose.model("FlashSale", flashSaleSchema);
