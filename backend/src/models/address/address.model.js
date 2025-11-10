import mongoose from "mongoose";

/**
 * Address Model - Quản lý địa chỉ giao hàng của user
 */
const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Tên không được quá 100 ký tự"]
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: [20, "Số điện thoại không được quá 20 ký tự"]
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, "Email không được quá 100 ký tự"]
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Địa chỉ không được quá 200 ký tự"]
    },
    ward: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Phường/Xã không được quá 50 ký tự"]
    },
    district: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Quận/Huyện không được quá 50 ký tự"]
    },
    province: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Tỉnh/Thành phố không được quá 50 ký tự"],
      index: true
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [10, "Mã bưu điện không được quá 10 ký tự"]
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    },
    label: {
      type: String,
      trim: true,
      maxlength: [50, "Nhãn không được quá 50 ký tự"],
      enum: ["home", "work", "other", ""],
      default: ""
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Ghi chú không được quá 500 ký tự"]
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để lấy địa chỉ đầy đủ
addressSchema.virtual("fullAddress").get(function() {
  const parts = [
    this.address,
    this.ward,
    this.district,
    this.province
  ].filter(Boolean);
  return parts.join(", ");
});

// Virtual để lấy user info
addressSchema.virtual("userInfo", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true
});

// Middleware để đảm bảo chỉ có một địa chỉ default cho mỗi user
addressSchema.pre("save", async function(next) {
  if (this.isDefault && this.isModified("isDefault")) {
    // Bỏ default của các address khác cùng user
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Middleware tự động set default nếu đây là address đầu tiên của user
addressSchema.pre("save", async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ user: this.user });
    if (count === 0) {
      this.isDefault = true;
    }
  }
  next();
});

// Index để tối ưu truy vấn
addressSchema.index({ user: 1, isDefault: 1 });
addressSchema.index({ user: 1, isActive: 1 });
addressSchema.index({ province: 1 });
addressSchema.index({ createdAt: -1 });

export const Address = mongoose.model("Address", addressSchema);

