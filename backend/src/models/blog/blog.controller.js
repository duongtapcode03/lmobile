import { blogService } from "./blog.service.js";

export const blogController = {
  // Tạo blog mới
  create: async (req, res) => {
    try {
      const blogData = {
        ...req.body,
        author: req.user.id
      };
      
      const blog = await blogService.createBlog(blogData);
      res.status(201).json({
        success: true,
        message: "Tạo blog thành công",
        data: blog
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy danh sách blog (API mới cho trang tin tức)
  getList: async (req, res) => {
    try {
      const result = await blogService.getBlogList(req.query);
      res.json({
        success: true,
        data: result.blogs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả blog
  getAll: async (req, res) => {
    try {
      const result = await blogService.getAllBlogs(req.query);
      res.json({
        success: true,
        data: result.blogs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy blog theo ID
  getById: async (req, res) => {
    try {
      const blog = await blogService.getBlogById(req.params.id);
      
      // Tăng lượt xem nếu là published blog
      if (blog.canView) {
        await blogService.incrementViewCount(req.params.id);
      }
      
      res.json({
        success: true,
        data: blog
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy blog theo slug
  getBySlug: async (req, res) => {
    try {
      const blog = await blogService.getBlogBySlug(req.params.slug);
      
      // Tăng lượt xem nếu là published blog
      if (blog.canView) {
        await blogService.incrementViewCount(blog._id);
      }
      
      res.json({
        success: true,
        data: blog
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật blog
  update: async (req, res) => {
    try {
      const blog = await blogService.updateBlog(req.params.id, req.body, req.user.id);
      res.json({
        success: true,
        message: "Cập nhật blog thành công",
        data: blog
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa blog
  delete: async (req, res) => {
    try {
      const result = await blogService.deleteBlog(req.params.id);
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

  // Tăng lượt thích
  like: async (req, res) => {
    try {
      const blog = await blogService.incrementLikeCount(req.params.id);
      res.json({
        success: true,
        message: "Đã thích blog",
        data: blog
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Giảm lượt thích
  unlike: async (req, res) => {
    try {
      const blog = await blogService.decrementLikeCount(req.params.id);
      res.json({
        success: true,
        message: "Đã bỏ thích blog",
        data: blog
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Tăng lượt chia sẻ
  share: async (req, res) => {
    try {
      const blog = await blogService.incrementShareCount(req.params.id);
      res.json({
        success: true,
        message: "Đã chia sẻ blog",
        data: blog
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy blog nổi bật
  getFeatured: async (req, res) => {
    try {
      const limit = req.query.limit || 5;
      const blogs = await blogService.getFeaturedBlogs(limit);
      res.json({
        success: true,
        data: blogs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy blog ghim
  getPinned: async (req, res) => {
    try {
      const limit = req.query.limit || 3;
      const blogs = await blogService.getPinnedBlogs(limit);
      res.json({
        success: true,
        data: blogs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy blog mới nhất
  getLatest: async (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const blogs = await blogService.getLatestBlogs(limit);
      res.json({
        success: true,
        data: blogs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy blog phổ biến nhất
  getPopular: async (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const blogs = await blogService.getPopularBlogs(limit);
      res.json({
        success: true,
        data: blogs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy blog liên quan
  getRelated: async (req, res) => {
    try {
      const limit = req.query.limit || 5;
      const blogs = await blogService.getRelatedBlogs(req.params.id, limit);
      res.json({
        success: true,
        data: blogs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy blog theo danh mục
  getByCategory: async (req, res) => {
    try {
      const result = await blogService.getBlogsByCategory(req.params.category, req.query);
      res.json({
        success: true,
        data: result.blogs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy blog theo tác giả
  getByAuthor: async (req, res) => {
    try {
      const result = await blogService.getBlogsByAuthor(req.params.authorId, req.query);
      res.json({
        success: true,
        data: result.blogs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Tìm kiếm blog
  search: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập từ khóa tìm kiếm"
        });
      }

      const result = await blogService.searchBlogs(q, req.query);
      res.json({
        success: true,
        data: result.blogs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy thống kê blog
  getStats: async (req, res) => {
    try {
      // Nếu là admin, lấy thống kê tổng quan
      // Nếu là seller, lấy thống kê của seller đó
      const authorId = req.user.role === "admin" ? null : req.user.id;
      const stats = await blogService.getBlogStats(authorId);
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
  },

  // Toggle trạng thái featured
  toggleFeatured: async (req, res) => {
    try {
      const blog = await blogService.toggleFeatured(req.params.id);
      res.json({
        success: true,
        message: `Blog đã được ${blog.isFeatured ? 'đánh dấu nổi bật' : 'bỏ đánh dấu nổi bật'}`,
        data: blog
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Toggle trạng thái pinned
  togglePinned: async (req, res) => {
    try {
      const blog = await blogService.togglePinned(req.params.id);
      res.json({
        success: true,
        message: `Blog đã được ${blog.isPinned ? 'ghim' : 'bỏ ghim'}`,
        data: blog
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};
