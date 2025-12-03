import { feedbackService } from "./feedback.service.js";

export const feedbackController = {
  // Tạo feedback mới
  create: async (req, res) => {
    try {
      const feedbackData = {
        ...req.body,
        user: req.user.id
      };
      
      const feedback = await feedbackService.createFeedback(feedbackData);
      res.status(201).json({
        success: true,
        message: "Tạo đánh giá thành công",
        data: feedback
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả feedback
  getAll: async (req, res) => {
    try {
      const result = await feedbackService.getAllFeedback(req.query);
      res.json({
        success: true,
        data: result.feedbacks,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy feedback theo ID
  getById: async (req, res) => {
    try {
      const feedback = await feedbackService.getFeedbackById(req.params.id);
      res.json({
        success: true,
        data: feedback
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy feedback theo sản phẩm
  getByProduct: async (req, res) => {
    try {
      const result = await feedbackService.getFeedbackByProduct(req.params.productId, req.query);
      res.json({
        success: true,
        data: result.feedbacks,
        pagination: result.pagination,
        ratingStats: result.ratingStats,
        averageRating: result.averageRating,
        totalReviews: result.totalReviews
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật feedback
  update: async (req, res) => {
    try {
      const feedback = await feedbackService.updateFeedback(req.params.id, req.body, req.user.id);
      res.json({
        success: true,
        message: "Cập nhật đánh giá thành công",
        data: feedback
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa feedback
  delete: async (req, res) => {
    try {
      const result = await feedbackService.deleteFeedback(req.params.id, req.user.id, req.user.role);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa feedback (Admin/Seller) - alias cho delete
  deleteByAdmin: async (req, res) => {
    try {
      const result = await feedbackService.deleteFeedback(req.params.id, req.user.id, req.user.role);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Đánh giá feedback hữu ích
  markHelpful: async (req, res) => {
    try {
      const { isHelpful = true } = req.body;
      const feedback = await feedbackService.markHelpful(req.params.id, req.user.id, isHelpful);
      res.json({
        success: true,
        message: isHelpful ? "Đánh dấu hữu ích thành công" : "Đánh dấu không hữu ích thành công",
        data: feedback
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Phản hồi feedback (Admin/Seller)
  respond: async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập nội dung phản hồi"
        });
      }

      const feedback = await feedbackService.respondToFeedback(req.params.id, { content }, req.user.id);
      res.json({
        success: true,
        message: "Phản hồi đánh giá thành công",
        data: feedback
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật trạng thái feedback (Admin)
  updateStatus: async (req, res) => {
    try {
      const { status, note } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn trạng thái"
        });
      }

      const feedback = await feedbackService.updateFeedbackStatus(req.params.id, status, req.user.id, note);
      res.json({
        success: true,
        message: "Cập nhật trạng thái đánh giá thành công",
        data: feedback
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Báo cáo feedback
  report: async (req, res) => {
    try {
      const { reason } = req.body;
      const result = await feedbackService.reportFeedback(req.params.id, req.user.id, reason);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy feedback của user
  getUserFeedback: async (req, res) => {
    try {
      const result = await feedbackService.getUserFeedback(req.user.id, req.query);
      res.json({
        success: true,
        data: result.feedbacks,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy feedback cần kiểm duyệt (Admin)
  getPending: async (req, res) => {
    try {
      const result = await feedbackService.getPendingFeedback(req.query);
      res.json({
        success: true,
        data: result.feedbacks,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy thống kê feedback
  getStats: async (req, res) => {
    try {
      const productId = req.query.productId || null;
      const stats = await feedbackService.getFeedbackStats(productId);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};
