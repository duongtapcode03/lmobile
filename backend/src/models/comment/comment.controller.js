import { commentService } from "./comment.service.js";

export const commentController = {
  // Tạo comment mới
  create: async (req, res) => {
    try {
      const commentData = {
        ...req.body,
        user: req.user.id
      };
      
      const comment = await commentService.createComment(commentData);
      res.status(201).json({
        success: true,
        message: "Tạo bình luận thành công",
        data: comment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả comment
  getAll: async (req, res) => {
    try {
      const result = await commentService.getAllComments(req.query);
      res.json({
        success: true,
        data: result.comments,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy comment theo ID
  getById: async (req, res) => {
    try {
      const comment = await commentService.getCommentById(req.params.id);
      res.json({
        success: true,
        data: comment
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy comment theo blog
  getByBlog: async (req, res) => {
    try {
      const result = await commentService.getCommentsByBlog(req.params.blogId, req.query);
      res.json({
        success: true,
        data: result.comments,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật comment
  update: async (req, res) => {
    try {
      const comment = await commentService.updateComment(req.params.id, req.body, req.user.id);
      res.json({
        success: true,
        message: "Cập nhật bình luận thành công",
        data: comment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa comment
  delete: async (req, res) => {
    try {
      const result = await commentService.deleteComment(req.params.id, req.user.id);
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

  // Like/Dislike comment
  toggleLike: async (req, res) => {
    try {
      const { isLike = true } = req.body;
      const comment = await commentService.toggleLikeComment(req.params.id, req.user.id, isLike);
      res.json({
        success: true,
        message: isLike ? "Đã thích bình luận" : "Đã không thích bình luận",
        data: comment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Pin/Unpin comment (Admin)
  togglePin: async (req, res) => {
    try {
      const comment = await commentService.togglePinComment(req.params.id);
      res.json({
        success: true,
        message: `Bình luận đã được ${comment.isPinned ? 'ghim' : 'bỏ ghim'}`,
        data: comment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật trạng thái comment (Admin)
  updateStatus: async (req, res) => {
    try {
      const { status, note } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn trạng thái"
        });
      }

      const comment = await commentService.updateCommentStatus(req.params.id, status, req.user.id, note);
      res.json({
        success: true,
        message: "Cập nhật trạng thái bình luận thành công",
        data: comment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Báo cáo comment
  report: async (req, res) => {
    try {
      const { reason } = req.body;
      const result = await commentService.reportComment(req.params.id, req.user.id, reason);
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

  // Lấy comment của user
  getUserComments: async (req, res) => {
    try {
      const result = await commentService.getUserComments(req.user.id, req.query);
      res.json({
        success: true,
        data: result.comments,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy comment cần kiểm duyệt (Admin)
  getPending: async (req, res) => {
    try {
      const result = await commentService.getPendingComments(req.query);
      res.json({
        success: true,
        data: result.comments,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Tìm kiếm comment
  search: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập từ khóa tìm kiếm"
        });
      }

      const result = await commentService.searchComments(q, req.query);
      res.json({
        success: true,
        data: result.comments,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy thống kê comment
  getStats: async (req, res) => {
    try {
      const blogId = req.query.blogId || null;
      const stats = await commentService.getCommentStats(blogId);
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
