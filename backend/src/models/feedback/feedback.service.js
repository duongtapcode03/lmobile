import { Feedback } from "./feedback.model.js";
import { Product } from "../product/product.model.js";
import { Order } from "../order/order.model.js";

export const feedbackService = {
  // Tạo feedback mới
  async createFeedback(data) {
    const { user, product, order, rating, content, ...otherData } = data;

    // Kiểm tra user đã đánh giá sản phẩm này chưa
    const existingFeedback = await Feedback.findOne({ user, product });
    if (existingFeedback) {
      throw new Error("Bạn đã đánh giá sản phẩm này rồi");
    }

    // Kiểm tra user có mua sản phẩm này không (nếu có order)
    if (order) {
      const orderExists = await Order.findOne({
        _id: order,
        user,
        "items.product": product,
        status: "delivered"
      });
      if (!orderExists) {
        throw new Error("Bạn chưa mua sản phẩm này hoặc đơn hàng chưa được giao");
      }
    }

    const feedback = new Feedback(data);
    await feedback.save();

    await feedback.populate([
      { path: "user", select: "name email avatar" },
      { path: "product", select: "name price thumbnail" },
      { path: "order", select: "orderNumber" }
    ]);

    return feedback;
  },

  // Lấy tất cả feedback với phân trang và lọc
  async getAllFeedback(query = {}) {
    const {
      page = 1,
      limit = 10,
      product,
      user,
      rating,
      status = "approved",
      verified,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    // Xây dựng filter
    const filter = {};
    
    if (product) {
      filter.product = product;
    }

    if (user) {
      filter.user = user;
    }

    if (rating) {
      filter.rating = parseInt(rating);
    }

    if (status) {
      filter.status = status;
    }

    if (verified !== undefined) {
      filter.verified = verified === "true";
    }

    // Xây dựng sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Tính toán phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const feedbacks = await Feedback.find(filter)
      .populate("user", "name email avatar")
      .populate("product", "name price thumbnail slug")
      .populate("order", "orderNumber")
      .populate("response.respondedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(filter);

    return {
      feedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy feedback theo ID
  async getFeedbackById(id) {
    const feedback = await Feedback.findById(id)
      .populate("user", "name email avatar")
      .populate("product", "name price thumbnail slug")
      .populate("order", "orderNumber")
      .populate("response.respondedBy", "name email")
      .populate("moderatedBy", "name email");

    if (!feedback) {
      throw new Error("Feedback không tồn tại");
    }

    return feedback;
  },

  // Lấy feedback theo sản phẩm
  async getFeedbackByProduct(productId, query = {}) {
    const {
      page = 1,
      limit = 10,
      rating,
      verified,
      sortBy = "helpful",
      sortOrder = "desc"
    } = query;

    const filter = {
      product: productId,
      status: "approved"
    };

    if (rating) {
      filter.rating = parseInt(rating);
    }

    if (verified !== undefined) {
      filter.verified = verified === "true";
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const feedbacks = await Feedback.find(filter)
      .populate("user", "name email avatar")
      .populate("response.respondedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(filter);

    // Tính thống kê rating
    const ratingStats = await Feedback.aggregate([
      { $match: { product: productId, status: "approved" } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const averageRating = await Feedback.aggregate([
      { $match: { product: productId, status: "approved" } },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          total: { $sum: 1 }
        }
      }
    ]);

    return {
      feedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      ratingStats: ratingStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      averageRating: averageRating[0]?.average || 0,
      totalReviews: averageRating[0]?.total || 0
    };
  },

  // Cập nhật feedback
  async updateFeedback(id, updateData, userId) {
    const allowedFields = [
      "rating", "title", "content", "images", "pros", "cons",
      "deviceInfo", "purchaseDate", "usageDuration", "recommend", "tags"
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw new Error("Feedback không tồn tại");
    }

    // Chỉ cho phép user sở hữu feedback hoặc admin chỉnh sửa
    if (feedback.user.toString() !== userId) {
      throw new Error("Không có quyền chỉnh sửa feedback này");
    }

    // Kiểm tra có thể chỉnh sửa không
    if (!feedback.canEdit) {
      throw new Error("Không thể chỉnh sửa feedback sau 24 giờ");
    }

    filteredData.isEdited = true;
    filteredData.editedAt = new Date();

    const updatedFeedback = await Feedback.findByIdAndUpdate(
      id,
      filteredData,
      { new: true, runValidators: true }
    )
    .populate("user", "name email avatar")
    .populate("product", "name price thumbnail slug");

    return updatedFeedback;
  },

  // Xóa feedback
  async deleteFeedback(id, userId) {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw new Error("Feedback không tồn tại");
    }

    // Chỉ cho phép user sở hữu feedback hoặc admin xóa
    if (feedback.user.toString() !== userId) {
      throw new Error("Không có quyền xóa feedback này");
    }

    // Kiểm tra có thể xóa không
    if (!feedback.canDelete) {
      throw new Error("Không thể xóa feedback sau 24 giờ");
    }

    await Feedback.findByIdAndDelete(id);

    return { message: "Xóa feedback thành công" };
  },

  // Đánh giá feedback hữu ích
  async markHelpful(id, userId, isHelpful = true) {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw new Error("Feedback không tồn tại");
    }

    if (isHelpful) {
      feedback.helpful += 1;
    } else {
      feedback.notHelpful += 1;
    }

    await feedback.save();

    return feedback;
  },

  // Phản hồi feedback (Admin/Seller)
  async respondToFeedback(id, responseData, userId) {
    const { content } = responseData;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw new Error("Feedback không tồn tại");
    }

    feedback.response = {
      content,
      respondedBy: userId,
      respondedAt: new Date()
    };

    await feedback.save();

    await feedback.populate([
      { path: "user", select: "name email avatar" },
      { path: "product", select: "name price thumbnail slug" },
      { path: "response.respondedBy", select: "name email" }
    ]);

    return feedback;
  },

  // Cập nhật trạng thái feedback (Admin)
  async updateFeedbackStatus(id, status, userId, note = "") {
    const validStatuses = ["pending", "approved", "rejected", "hidden"];
    
    if (!validStatuses.includes(status)) {
      throw new Error("Trạng thái không hợp lệ");
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      {
        status,
        moderatedBy: userId,
        moderatedAt: new Date(),
        moderationNote: note
      },
      { new: true, runValidators: true }
    )
    .populate("user", "name email avatar")
    .populate("product", "name price thumbnail slug")
    .populate("moderatedBy", "name email");

    if (!feedback) {
      throw new Error("Feedback không tồn tại");
    }

    return feedback;
  },

  // Báo cáo feedback
  async reportFeedback(id, userId, reason = "") {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw new Error("Feedback không tồn tại");
    }

    feedback.reportedCount += 1;
    await feedback.save();

    return { message: "Báo cáo feedback thành công" };
  },

  // Lấy feedback của user
  async getUserFeedback(userId, query = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    const filter = { user: userId };
    if (status) {
      filter.status = status;
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const feedbacks = await Feedback.find(filter)
      .populate("product", "name price thumbnail slug")
      .populate("order", "orderNumber")
      .populate("response.respondedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(filter);

    return {
      feedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy thống kê feedback
  async getFeedbackStats(productId = null) {
    const filter = productId ? { product: productId } : {};

    const stats = await Feedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          approvedFeedback: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          pendingFeedback: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          rejectedFeedback: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          },
          verifiedFeedback: {
            $sum: { $cond: [{ $eq: ["$verified", true] }, 1, 0] }
          },
          averageRating: { $avg: "$rating" },
          totalHelpful: { $sum: "$helpful" },
          totalNotHelpful: { $sum: "$notHelpful" }
        }
      }
    ]);

    return stats[0] || {
      totalFeedback: 0,
      approvedFeedback: 0,
      pendingFeedback: 0,
      rejectedFeedback: 0,
      verifiedFeedback: 0,
      averageRating: 0,
      totalHelpful: 0,
      totalNotHelpful: 0
    };
  },

  // Lấy feedback cần kiểm duyệt
  async getPendingFeedback(query = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    const filter = { status: "pending" };
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const feedbacks = await Feedback.find(filter)
      .populate("user", "name email avatar")
      .populate("product", "name price thumbnail slug")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(filter);

    return {
      feedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  }
};
