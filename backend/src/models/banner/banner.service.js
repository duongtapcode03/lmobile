import { Banner } from "./banner.model.js";

export const bannerService = {
  // Tạo banner mới
  async createBanner(data) {
    try {
      const banner = new Banner(data);
      await banner.save();
      return banner;
    } catch (error) {
      throw error;
    }
  },

  // Lấy tất cả banners với phân trang và lọc
  async getAllBanners(query = {}) {
    const {
      page = 1,
      limit = 10,
      search = "",
      isActive,
      sortBy = "sortOrder",
      sortOrder = "asc"
    } = query;

    // Xây dựng filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { subtitle: { $regex: search, $options: "i" } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Lọc theo thời gian hiện tại nếu có startDate và endDate
    // Chỉ áp dụng khi không có search (để tránh conflict với $or của search)
    if (!search) {
      const now = new Date();
      const dateConditions = [];
      
      // Start date condition: null hoặc <= now
      dateConditions.push({
        $or: [
          { startDate: null },
          { startDate: { $lte: now } }
        ]
      });
      
      // End date condition: null hoặc >= now
      dateConditions.push({
        $or: [
          { endDate: null },
          { endDate: { $gte: now } }
        ]
      });
      
      if (dateConditions.length > 0) {
        filter.$and = filter.$and || [];
        filter.$and.push(...dateConditions);
      }
    }

    // Xây dựng sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Tính toán phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const banners = await Banner.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Banner.countDocuments(filter);

    return {
      banners,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy banner theo ID
  async getBannerById(id) {
    const banner = await Banner.findById(id);
    if (!banner) {
      throw new Error("Banner không tồn tại");
    }
    return banner;
  },

  // Lấy tất cả banners đang active
  async getActiveBanners() {
    const now = new Date();
    const banners = await Banner.find({
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: null },
            { startDate: { $lte: now } }
          ]
        },
        {
          $or: [
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ]
    })
      .sort({ sortOrder: 1, createdAt: -1 });
    
    return banners;
  },

  // Cập nhật banner
  async updateBanner(id, data) {
    const banner = await Banner.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    
    if (!banner) {
      throw new Error("Banner không tồn tại");
    }
    
    return banner;
  },

  // Xóa banner
  async deleteBanner(id) {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      throw new Error("Banner không tồn tại");
    }
    return banner;
  },

  // Toggle active status
  async toggleActive(id) {
    const banner = await Banner.findById(id);
    if (!banner) {
      throw new Error("Banner không tồn tại");
    }
    
    banner.isActive = !banner.isActive;
    await banner.save();
    
    return banner;
  },

  // Cập nhật sort order
  async updateSortOrder(banners) {
    const updatePromises = banners.map(({ id, sortOrder }) =>
      Banner.findByIdAndUpdate(id, { sortOrder }, { new: true })
    );
    
    await Promise.all(updatePromises);
    return { success: true };
  }
};

