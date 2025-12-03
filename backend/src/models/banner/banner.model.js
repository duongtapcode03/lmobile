import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: [100, "Tiêu đề banner không được quá 100 ký tự"]
    },
    subtitle: { 
      type: String, 
      trim: true,
      maxlength: [200, "Phụ đề banner không được quá 200 ký tự"]
    },
    imageUrl: { 
      type: String, 
      required: true,
      trim: true
    },
    linkUrl: { 
      type: String, 
      trim: true,
      default: "#"
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    sortOrder: { 
      type: Number, 
      default: 0 
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
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

// Index để tối ưu tìm kiếm
bannerSchema.index({ isActive: 1, sortOrder: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });

export const Banner = mongoose.model("Banner", bannerSchema);















