import { Blog } from "./blog.model.js";
import { Comment } from "../comment/comment.model.js";

export const blogService = {
  // Tạo blog mới
  async createBlog(data) {
    try {
      const blog = new Blog(data);
      await blog.save();
    
      await blog.populate("author", "name email avatar");
      return blog;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Slug đã tồn tại");
      }
      throw error;
    }
  },

  // Lấy tất cả blog với phân trang và lọc
  async getAllBlogs(query = {}) {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      status = "published",
      author,
      isFeatured,
      isPinned,
      sortBy = "publishedAt",
      sortOrder = "desc"
    } = query;

    // Xây dựng filter
    const filter = {};
    
    if (search) {
      filter.$text = { $search: search };
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (author) {
      filter.author = author;
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === "true";
    }

    if (isPinned !== undefined) {
      filter.isPinned = isPinned === "true";
    }

    // Xây dựng sort
    const sort = {};
    if (search && sortBy === "publishedAt") {
      sort.score = { $meta: "textScore" };
    } else {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    // Tính toán phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find(filter)
      .populate("author", "name email avatar")
      .populate("relatedProducts", "name price thumbnail")
      .populate("relatedBlogs", "title slug")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(filter);

    return {
      blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy blog theo ID
  async getBlogById(id) {
    const blog = await Blog.findById(id)
      .populate("author", "name email avatar")
      .populate("relatedProducts", "name price thumbnail slug")
      .populate("relatedBlogs", "title slug featuredImage")
      .populate("lastModifiedBy", "name email");

    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    return blog;
  },

  // Lấy blog theo slug
  async getBlogBySlug(slug) {
    const blog = await Blog.findOne({ slug })
      .populate("author", "name email avatar")
      .populate("relatedProducts", "name price thumbnail slug")
      .populate("relatedBlogs", "title slug featuredImage")
      .populate("lastModifiedBy", "name email");

    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    return blog;
  },

  // Cập nhật blog
  async updateBlog(id, updateData, userId) {
    const allowedFields = [
      "title", "content", "excerpt", "category", "tags", 
      "featuredImage", "images", "status", "isFeatured", 
      "isPinned", "seoTitle", "seoDescription", "seoKeywords",
      "relatedProducts", "relatedBlogs", "allowComments", 
      "isPublic", "scheduledAt"
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    filteredData.lastModifiedBy = userId;

    const blog = await Blog.findByIdAndUpdate(
      id,
      filteredData,
      { new: true, runValidators: true }
    )
    .populate("author", "name email avatar")
    .populate("lastModifiedBy", "name email");

    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    return blog;
  },

  // Xóa blog
  async deleteBlog(id) {
    // Xóa tất cả comment của blog
    await Comment.deleteMany({ blog: id });

    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    return { message: "Xóa blog thành công" };
  },

  // Tăng lượt xem
  async incrementViewCount(id) {
    const blog = await Blog.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    return blog;
  },

  // Tăng lượt thích
  async incrementLikeCount(id) {
    const blog = await Blog.findByIdAndUpdate(
      id,
      { $inc: { likeCount: 1 } },
      { new: true }
    );

    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    return blog;
  },

  // Giảm lượt thích
  async decrementLikeCount(id) {
    const blog = await Blog.findByIdAndUpdate(
      id,
      { $inc: { likeCount: -1 } },
      { new: true }
    );

    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    return blog;
  },

  // Tăng lượt chia sẻ
  async incrementShareCount(id) {
    const blog = await Blog.findByIdAndUpdate(
      id,
      { $inc: { shareCount: 1 } },
      { new: true }
    );

    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    return blog;
  },

  // Lấy blog nổi bật
  async getFeaturedBlogs(limit = 5) {
    return Blog.find({ 
      status: "published", 
      isFeatured: true,
      isPublic: true
    })
    .populate("author", "name email avatar")
    .sort({ publishedAt: -1 })
    .limit(parseInt(limit));
  },

  // Lấy blog ghim
  async getPinnedBlogs(limit = 3) {
    return Blog.find({ 
      status: "published", 
      isPinned: true,
      isPublic: true
    })
    .populate("author", "name email avatar")
    .sort({ publishedAt: -1 })
    .limit(parseInt(limit));
  },

  // Lấy blog mới nhất
  async getLatestBlogs(limit = 10) {
    return Blog.find({ 
      status: "published",
      isPublic: true
    })
    .populate("author", "name email avatar")
    .sort({ publishedAt: -1 })
    .limit(parseInt(limit));
  },

  // Lấy blog phổ biến nhất
  async getPopularBlogs(limit = 10) {
    return Blog.find({ 
      status: "published",
      isPublic: true
    })
    .populate("author", "name email avatar")
    .sort({ viewCount: -1, likeCount: -1 })
    .limit(parseInt(limit));
  },

  // Lấy blog liên quan
  async getRelatedBlogs(blogId, limit = 5) {
    const blog = await Blog.findById(blogId);
    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    return Blog.find({
      _id: { $ne: blogId },
      $or: [
        { category: blog.category },
        { tags: { $in: blog.tags } },
        { _id: { $in: blog.relatedBlogs } }
      ],
      status: "published",
      isPublic: true
    })
    .populate("author", "name email avatar")
    .sort({ publishedAt: -1 })
    .limit(parseInt(limit));
  },

  // Lấy blog theo danh mục
  async getBlogsByCategory(category, query = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "publishedAt",
      sortOrder = "desc"
    } = query;

    const filter = {
      category,
      status: "published",
      isPublic: true
    };

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find(filter)
      .populate("author", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(filter);

    return {
      blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy blog theo tác giả
  async getBlogsByAuthor(authorId, query = {}) {
    const {
      page = 1,
      limit = 10,
      status = "published",
      sortBy = "publishedAt",
      sortOrder = "desc"
    } = query;

    const filter = {
      author: authorId,
      status,
      isPublic: true
    };

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find(filter)
      .populate("author", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(filter);

    return {
      blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Tìm kiếm blog
  async searchBlogs(searchTerm, query = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      sortBy = "relevance",
      sortOrder = "desc"
    } = query;

    const filter = {
      $text: { $search: searchTerm },
      status: "published",
      isPublic: true
    };

    if (category) {
      filter.category = category;
    }

    const sort = {};
    if (sortBy === "relevance") {
      sort.score = { $meta: "textScore" };
    } else {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find(filter)
      .populate("author", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(filter);

    return {
      blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy thống kê blog
  async getBlogStats(authorId = null) {
    const filter = authorId ? { author: authorId } : {};

    const stats = await Blog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalBlogs: { $sum: 1 },
          publishedBlogs: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] }
          },
          draftBlogs: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] }
          },
          featuredBlogs: {
            $sum: { $cond: [{ $eq: ["$isFeatured", true] }, 1, 0] }
          },
          totalViews: { $sum: "$viewCount" },
          totalLikes: { $sum: "$likeCount" },
          totalComments: { $sum: "$commentCount" },
          totalShares: { $sum: "$shareCount" }
        }
      }
    ]);

    return stats[0] || {
      totalBlogs: 0,
      publishedBlogs: 0,
      draftBlogs: 0,
      featuredBlogs: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0
    };
  },

  // Toggle trạng thái featured
  async toggleFeatured(id) {
    const blog = await Blog.findById(id);
    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    blog.isFeatured = !blog.isFeatured;
    await blog.save();

    return blog;
  },

  // Toggle trạng thái pinned
  async togglePinned(id) {
    const blog = await Blog.findById(id);
    if (!blog) {
      throw new Error("Blog không tồn tại");
    }

    blog.isPinned = !blog.isPinned;
    await blog.save();

    return blog;
  }
};
