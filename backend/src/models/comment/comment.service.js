import { Comment } from "./comment.model.js";
import { Blog } from "../blog/blog.model.js";

export const commentService = {
  // Tạo comment mới
  async createComment(data) {
    const { user, blog, content, parentComment, ...otherData } = data;

    // Kiểm tra blog tồn tại và cho phép comment
    const blogExists = await Blog.findById(blog);
    if (!blogExists) {
      throw new Error("Blog không tồn tại");
    }

    if (!blogExists.allowComments) {
      throw new Error("Blog này không cho phép bình luận");
    }

    // Kiểm tra parent comment nếu có
    if (parentComment) {
      const parentExists = await Comment.findById(parentComment);
      if (!parentExists || parentExists.blog.toString() !== blog) {
        throw new Error("Comment cha không tồn tại hoặc không thuộc blog này");
      }
    }

    const comment = new Comment(data);
    await comment.save();

    await comment.populate([
      { path: "user", select: "name email avatar" },
      { path: "blog", select: "title slug" },
      { path: "parentComment", select: "content user" }
    ]);

    return comment;
  },

  // Lấy tất cả comment với phân trang và lọc
  async getAllComments(query = {}) {
    const {
      page = 1,
      limit = 20,
      blog,
      user,
      parentComment,
      status = "approved",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    // Xây dựng filter
    const filter = {};
    
    if (blog) {
      filter.blog = blog;
    }

    if (user) {
      filter.user = user;
    }

    if (parentComment) {
      filter.parentComment = parentComment;
    }

    if (status) {
      filter.status = status;
    }

    // Xây dựng sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Tính toán phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find(filter)
      .populate("user", "name email avatar")
      .populate("blog", "title slug")
      .populate("parentComment", "content user")
      .populate("mentions", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(filter);

    return {
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy comment theo ID
  async getCommentById(id) {
    const comment = await Comment.findById(id)
      .populate("user", "name email avatar")
      .populate("blog", "title slug")
      .populate("parentComment", "content user")
      .populate("mentions", "name email")
      .populate("moderatedBy", "name email");

    if (!comment) {
      throw new Error("Comment không tồn tại");
    }

    return comment;
  },

  // Lấy comment theo blog
  async getCommentsByBlog(blogId, query = {}) {
    const {
      page = 1,
      limit = 10,
      parentComment = null,
      sortBy = "createdAt",
      sortOrder = "asc"
    } = query;

    const filter = {
      blog: blogId,
      status: "approved",
      parentComment: parentComment
    };

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find(filter)
      .populate("user", "name email avatar")
      .populate("mentions", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(filter);

    // Lấy replies cho mỗi comment (nếu là parent comment)
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        if (!parentComment) {
          const replies = await Comment.find({
            parentComment: comment._id,
            status: "approved"
          })
          .populate("user", "name email avatar")
          .populate("mentions", "name email")
          .sort({ createdAt: 1 })
          .limit(5);

          return {
            ...comment.toObject(),
            replies
          };
        }
        return comment;
      })
    );

    return {
      comments: commentsWithReplies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Cập nhật comment
  async updateComment(id, updateData, userId) {
    const allowedFields = ["content", "tags"];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    const comment = await Comment.findById(id);
    if (!comment) {
      throw new Error("Comment không tồn tại");
    }

    // Chỉ cho phép user sở hữu comment hoặc admin chỉnh sửa
    if (comment.user.toString() !== userId) {
      throw new Error("Không có quyền chỉnh sửa comment này");
    }

    // Kiểm tra có thể chỉnh sửa không
    if (!comment.canEdit) {
      throw new Error("Không thể chỉnh sửa comment sau 24 giờ");
    }

    filteredData.isEdited = true;
    filteredData.editedAt = new Date();

    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      filteredData,
      { new: true, runValidators: true }
    )
    .populate("user", "name email avatar")
    .populate("blog", "title slug");

    return updatedComment;
  },

  // Xóa comment
  async deleteComment(id, userId) {
    const comment = await Comment.findById(id);
    if (!comment) {
      throw new Error("Comment không tồn tại");
    }

    // Chỉ cho phép user sở hữu comment hoặc admin xóa
    if (comment.user.toString() !== userId) {
      throw new Error("Không có quyền xóa comment này");
    }

    // Kiểm tra có thể xóa không
    if (!comment.canDelete) {
      throw new Error("Không thể xóa comment sau 24 giờ");
    }

    // Xóa tất cả replies của comment này
    await Comment.deleteMany({ parentComment: id });

    await Comment.findByIdAndDelete(id);

    return { message: "Xóa comment thành công" };
  },

  // Like/Dislike comment
  async toggleLikeComment(id, userId, isLike = true) {
    const comment = await Comment.findById(id);
    if (!comment) {
      throw new Error("Comment không tồn tại");
    }

    if (isLike) {
      comment.likeCount += 1;
    } else {
      comment.dislikeCount += 1;
    }

    await comment.save();

    return comment;
  },

  // Pin/Unpin comment (Admin)
  async togglePinComment(id) {
    const comment = await Comment.findById(id);
    if (!comment) {
      throw new Error("Comment không tồn tại");
    }

    comment.isPinned = !comment.isPinned;
    await comment.save();

    return comment;
  },

  // Cập nhật trạng thái comment (Admin)
  async updateCommentStatus(id, status, userId, note = "") {
    const validStatuses = ["pending", "approved", "rejected", "hidden"];
    
    if (!validStatuses.includes(status)) {
      throw new Error("Trạng thái không hợp lệ");
    }

    const comment = await Comment.findByIdAndUpdate(
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
    .populate("blog", "title slug")
    .populate("moderatedBy", "name email");

    if (!comment) {
      throw new Error("Comment không tồn tại");
    }

    return comment;
  },

  // Báo cáo comment
  async reportComment(id, userId, reason = "") {
    const comment = await Comment.findById(id);
    if (!comment) {
      throw new Error("Comment không tồn tại");
    }

    comment.reportedCount += 1;
    await comment.save();

    return { message: "Báo cáo comment thành công" };
  },

  // Lấy comment của user
  async getUserComments(userId, query = {}) {
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

    const comments = await Comment.find(filter)
      .populate("blog", "title slug featuredImage")
      .populate("parentComment", "content user")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(filter);

    return {
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy comment cần kiểm duyệt
  async getPendingComments(query = {}) {
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

    const comments = await Comment.find(filter)
      .populate("user", "name email avatar")
      .populate("blog", "title slug")
      .populate("parentComment", "content user")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(filter);

    return {
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy thống kê comment
  async getCommentStats(blogId = null) {
    const filter = blogId ? { blog: blogId } : {};

    const stats = await Comment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          approvedComments: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          pendingComments: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          rejectedComments: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          },
          pinnedComments: {
            $sum: { $cond: [{ $eq: ["$isPinned", true] }, 1, 0] }
          },
          totalLikes: { $sum: "$likeCount" },
          totalDislikes: { $sum: "$dislikeCount" },
          totalReplies: { $sum: "$replyCount" }
        }
      }
    ]);

    return stats[0] || {
      totalComments: 0,
      approvedComments: 0,
      pendingComments: 0,
      rejectedComments: 0,
      pinnedComments: 0,
      totalLikes: 0,
      totalDislikes: 0,
      totalReplies: 0
    };
  },

  // Tìm kiếm comment
  async searchComments(searchTerm, query = {}) {
    const {
      page = 1,
      limit = 20,
      blog,
      status = "approved",
      sortBy = "relevance",
      sortOrder = "desc"
    } = query;

    const filter = {
      $text: { $search: searchTerm },
      status
    };

    if (blog) {
      filter.blog = blog;
    }

    const sort = {};
    if (sortBy === "relevance") {
      sort.score = { $meta: "textScore" };
    } else {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find(filter)
      .populate("user", "name email avatar")
      .populate("blog", "title slug")
      .populate("parentComment", "content user")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(filter);

    return {
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  }
};
