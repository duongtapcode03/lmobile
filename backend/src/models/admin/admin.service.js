import mongoose from "mongoose";
import { User } from "../user/user.model.js";
import { Product } from "../product/product.model.js";
import { Order } from "../order/order.model.js";
import { Category } from "../category/category.model.js";
import { Brand } from "../brand/brand.model.js";
import { Cart } from "../cart/cart.model.js";

export const adminService = {
  // Lấy thống kê tổng quan
  async getDashboardStats(query = {}) {
    console.log('[Admin Service] getDashboardStats called', query);
    const { startDate, endDate } = query;
    
    // Tạo date filter nếu có startDate và endDate
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set endDate to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }
    
    try {
      const [
        totalUsers,
        totalProducts,
        totalOrders,
        totalCategories,
        totalBrands,
        totalRevenue,
        recentOrders
      ] = await Promise.all([
        User.countDocuments({}),
        Product.countDocuments({}),
        Order.countDocuments(),
        Category.countDocuments({}),
        Brand.countDocuments({}),
        Order.aggregate([
          { 
            $match: { 
              $and: [
                {
                  $or: [
                    { status: 'delivered' }, // Đơn hàng đã giao
                    { 'paymentInfo.status': 'paid' } // Đơn hàng đã thanh toán
                  ]
                },
                { status: { $ne: 'cancelled' } }, // Loại trừ đơn hàng đã hủy
                { status: { $ne: 'returned' } } // Loại trừ đơn hàng đã trả hàng
              ]
            } 
          },
          // Unwind items để tính doanh thu từng item
          { $unwind: '$items' },
          // Tính doanh thu = (giá bán - giá nhập) * số lượng cho mỗi item
          {
            $addFields: {
              'items.revenue': {
                $multiply: [
                  { $subtract: ['$items.price', { $ifNull: ['$items.importPrice', 0] }] },
                  { $ifNull: ['$items.quantity', 0] }
                ]
              }
            }
          },
          // Tổng hợp doanh thu
          { $group: { _id: null, total: { $sum: '$items.revenue' } } }
        ]),
        Order.find()
          .populate('user', 'name email phone')
          .sort({ createdAt: -1 })
          .limit(10)
          .select('orderNumber totalAmount status createdAt user items paymentInfo')
      ]);

      const revenue = totalRevenue[0]?.total || 0;

      // Populate importPrice cho recentOrders nếu thiếu
      if (recentOrders && recentOrders.length > 0) {
        const allProductIds = new Set();
        for (let order of recentOrders) {
          if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
              if (!item.importPrice || item.importPrice === 0) {
                const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
                if (!isNaN(productId)) {
                  allProductIds.add(productId);
                }
              }
            });
          }
        }
        
        if (allProductIds.size > 0) {
          const productIdsArray = Array.from(allProductIds);
          const products = await Product.find({ _id: { $in: productIdsArray } })
            .select("_id importPrice");
          
          const productMap = new Map();
          products.forEach(p => {
            const productId = typeof p._id === 'number' ? p._id : parseInt(p._id, 10);
            productMap.set(productId, p.importPrice || 0);
          });
          
          // Cập nhật importPrice cho các items thiếu
          for (let order of recentOrders) {
            if (order.items && order.items.length > 0) {
              order.items.forEach(item => {
                if (!item.importPrice || item.importPrice === 0) {
                  const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
                  if (!isNaN(productId) && productMap.has(productId)) {
                    item.importPrice = productMap.get(productId);
                  }
                }
              });
            }
          }
        }
      }

      // Thống kê đơn hàng theo trạng thái
      const ordersByStatus = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Thống kê doanh thu theo tháng
      const monthMatchFilter = {
        $and: [
          {
            $or: [
              { status: 'delivered' }, // Đơn hàng đã giao
              { 'paymentInfo.status': 'paid' } // Đơn hàng đã thanh toán
            ]
          },
          { status: { $ne: 'cancelled' } }, // Loại trừ đơn hàng đã hủy
          { status: { $ne: 'returned' } }, // Loại trừ đơn hàng đã trả hàng
        ]
      };
      
      // Thêm date filter nếu có
      if (dateFilter.createdAt && Object.keys(dateFilter.createdAt).length > 0) {
        monthMatchFilter.$and.push(dateFilter);
      } else {
        // Mặc định 6 tháng gần nhất nếu không có date range
        monthMatchFilter.$and.push({ createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } });
      }
      
      const revenueByMonth = await Order.aggregate([
        {
          $match: monthMatchFilter
        },
        // Unwind items để tính doanh thu từng item
        { $unwind: '$items' },
        // Tính doanh thu = (giá bán - giá nhập) * số lượng cho mỗi item
        {
          $addFields: {
            'items.revenue': {
              $multiply: [
                { $subtract: ['$items.price', { $ifNull: ['$items.importPrice', 0] }] },
                { $ifNull: ['$items.quantity', 0] }
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: '$items.revenue' }, // Tổng doanh thu từ items
            count: { $addToSet: '$_id' } // Đếm số đơn hàng unique
          }
        },
        // Tính lại số đơn hàng
        {
          $addFields: {
            count: { $size: '$count' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 6 }
      ]);

      // Thống kê doanh thu theo ngày
      const dayMatchFilter = {
        $and: [
          {
            $or: [
              { status: 'delivered' },
              { 'paymentInfo.status': 'paid' }
            ]
          },
          { status: { $ne: 'cancelled' } },
          { status: { $ne: 'returned' } },
        ]
      };
      
      // Thêm date filter nếu có
      if (dateFilter.createdAt && Object.keys(dateFilter.createdAt).length > 0) {
        dayMatchFilter.$and.push(dateFilter);
      } else {
        // Mặc định 30 ngày gần nhất nếu không có date range
        dayMatchFilter.$and.push({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
      }
      
      const revenueByDay = await Order.aggregate([
        {
          $match: dayMatchFilter
        },
        { $unwind: '$items' },
        {
          $addFields: {
            'items.revenue': {
              $multiply: [
                { $subtract: ['$items.price', { $ifNull: ['$items.importPrice', 0] }] },
                { $ifNull: ['$items.quantity', 0] }
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            total: { $sum: '$items.revenue' },
            date: { $first: '$createdAt' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
      ]);

      // So sánh doanh thu tháng này vs tháng trước
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [currentMonthRevenue, lastMonthRevenue] = await Promise.all([
        Order.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [
                    { status: 'delivered' },
                    { 'paymentInfo.status': 'paid' }
                  ]
                },
                { status: { $ne: 'cancelled' } },
                { status: { $ne: 'returned' } },
                { createdAt: { $gte: currentMonthStart } }
              ]
            }
          },
          { $unwind: '$items' },
          {
            $addFields: {
              'items.revenue': {
                $multiply: [
                  { $subtract: ['$items.price', { $ifNull: ['$items.importPrice', 0] }] },
                  { $ifNull: ['$items.quantity', 0] }
                ]
              }
            }
          },
          { $group: { _id: null, total: { $sum: '$items.revenue' } } }
        ]),
        Order.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [
                    { status: 'delivered' },
                    { 'paymentInfo.status': 'paid' }
                  ]
                },
                { status: { $ne: 'cancelled' } },
                { status: { $ne: 'returned' } },
                { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }
              ]
            }
          },
          { $unwind: '$items' },
          {
            $addFields: {
              'items.revenue': {
                $multiply: [
                  { $subtract: ['$items.price', { $ifNull: ['$items.importPrice', 0] }] },
                  { $ifNull: ['$items.quantity', 0] }
                ]
              }
            }
          },
          { $group: { _id: null, total: { $sum: '$items.revenue' } } }
        ])
      ]);

      // Tính doanh thu và số lượng đã bán cho TẤT CẢ sản phẩm từ đơn hàng đã giao/thanh toán
      const productStats = await Order.aggregate([
        {
          $match: {
            $and: [
              {
                $or: [
                  { status: 'delivered' },
                  { 'paymentInfo.status': 'paid' }
                ]
              },
              { status: { $ne: 'cancelled' } },
              { status: { $ne: 'returned' } }
            ]
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalRevenue: {
              $sum: {
                $multiply: [
                  { $subtract: ['$items.price', { $ifNull: ['$items.importPrice', 0] }] },
                  { $ifNull: ['$items.quantity', 0] }
                ]
              }
            },
            totalSold: { $sum: { $ifNull: ['$items.quantity', 0] } }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ]);

      // Lấy thông tin sản phẩm cho top 5
      const topSellingProductIds = productStats.map(item => item._id);
      const topSellingProductsRaw = await Product.find({
        _id: { $in: topSellingProductIds },
        isActive: true
      })
        .select('_id name stock sold price priceNumber importPrice thumbnail')
        .lean();

      // Map doanh thu và số lượng đã bán vào sản phẩm
      const statsMap = new Map();
      productStats.forEach(item => {
        statsMap.set(item._id, {
          revenue: item.totalRevenue,
          sold: item.totalSold
        });
      });

      // Sắp xếp theo thứ tự từ productStats (theo số lượng đã bán)
      const topSellingProducts = topSellingProductIds.map(productId => {
        const product = topSellingProductsRaw.find(p => p._id === productId);
        const stats = statsMap.get(productId);
        return {
          ...product,
          revenue: stats?.revenue || 0,
          soldFromOrders: stats?.sold || 0
        };
      }).filter(p => p._id); // Loại bỏ undefined

      // Top 5 sản phẩm tồn kho cao nhất (stock cao nhất)
      const highStockProducts = await Product.find({
        isActive: true
      })
        .select('_id name stock sold price priceNumber importPrice thumbnail')
        .sort({ stock: -1 })
        .limit(5)
        .lean();

      // Thống kê đơn hàng theo trạng thái chi tiết
      const ordersByStatusDetail = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        overview: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalCategories,
          totalBrands,
          totalRevenue: revenue
        },
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentOrders,
        revenueByMonth,
        revenueByDay: revenueByDay.map(item => ({
          date: item.date,
          total: item.total,
          label: `${item._id.day}/${item._id.month}/${item._id.year}`
        })),
        revenueComparison: {
          currentMonth: currentMonthRevenue[0]?.total || 0,
          lastMonth: lastMonthRevenue[0]?.total || 0,
          change: (currentMonthRevenue[0]?.total || 0) - (lastMonthRevenue[0]?.total || 0),
          changePercent: lastMonthRevenue[0]?.total 
            ? (((currentMonthRevenue[0]?.total || 0) - lastMonthRevenue[0].total) / lastMonthRevenue[0].total * 100).toFixed(2)
            : '0'
        },
        topSellingProducts,
        highStockProducts,
        ordersByStatusDetail: ordersByStatusDetail.map(item => ({
          status: item._id,
          count: item.count
        }))
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  },

  // Quản lý users
  async getAllUsers(filters = {}) {
    const { page = 1, limit = 10, search, role, isActive } = filters;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    return {
      data: users,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async getUserById(userId) {
    console.log('[Admin Service] getUserById called with userId:', userId, 'type:', typeof userId);
    try {
      // Ensure userId is a valid ObjectId string
      let validUserId = userId;
      if (typeof userId === 'number') {
        // If somehow it's a number, convert back to string (shouldn't happen for User)
        validUserId = String(userId);
      }
      
      // Use mongoose.Types.ObjectId to validate and convert if needed
      if (!mongoose.Types.ObjectId.isValid(validUserId)) {
        throw new Error('ID người dùng không hợp lệ');
      }
      
      const user = await User.findById(validUserId).select('-password -refreshTokens');
      if (!user) {
        console.log('[Admin Service] User not found:', validUserId);
        throw new Error('User không tồn tại');
      }
      console.log('[Admin Service] User found:', user._id);
      return user;
    } catch (error) {
      console.error('[Admin Service] Error in getUserById:', error.message, error.name);
      if (error.name === 'CastError' || error.message.includes('không hợp lệ')) {
        throw new Error('ID người dùng không hợp lệ');
      }
      throw error;
    }
  },

  async updateUserStatus(userId, isActive) {
    console.log('[Admin Service] updateUserStatus called with userId:', userId, 'type:', typeof userId, 'isActive:', isActive);
    try {
      // Ensure userId is a valid ObjectId string
      let validUserId = userId;
      if (typeof userId === 'number') {
        // If somehow it's a number, convert back to string (shouldn't happen for User)
        validUserId = String(userId);
      }
      
      // Use mongoose.Types.ObjectId to validate and convert if needed
      if (!mongoose.Types.ObjectId.isValid(validUserId)) {
        throw new Error('ID người dùng không hợp lệ');
      }
      
      const user = await User.findById(validUserId);
      if (!user) {
        console.log('[Admin Service] User not found:', validUserId);
        throw new Error('User không tồn tại');
      }
      user.isActive = isActive;
      await user.save();
      console.log('[Admin Service] User status updated:', user._id, 'isActive:', user.isActive);
      return user;
    } catch (error) {
      console.error('[Admin Service] Error in updateUserStatus:', error.message, error.name);
      if (error.name === 'CastError' || error.message.includes('không hợp lệ')) {
        throw new Error('ID người dùng không hợp lệ');
      }
      throw error;
    }
  },

  // Quản lý products
  async getAllProducts(filters = {}) {
    const { page = 1, limit = 10, search, brand, category, isActive } = filters;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (brand) {
      query.brandRef = typeof brand === 'number' ? brand : parseInt(brand, 10);
    }
    if (category) {
      const categoryId = typeof category === 'number' ? category : parseInt(category, 10);
      query.categoryRefs = categoryId;
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('brandRef', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    return {
      data: products,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async updateProductStatus(productId, isActive) {
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      throw new Error('Sản phẩm không tồn tại');
    }
    product.isActive = isActive;
    await product.save();
    return product;
  },

  // Quản lý orders
  async getAllOrders(filters = {}) {
    const { page = 1, limit = 10, status, search, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query)
    ]);

    return {
      data: orders,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async updateOrderStatus(orderId, status) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Đơn hàng không tồn tại');
    }
    order.status = status;
    await order.save();
    return order;
  },

  // Quản lý categories
  async getAllCategories(filters = {}) {
    const { page = 1, limit = 10, search, isActive } = filters;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [categories, total] = await Promise.all([
      Category.find(query)
        .populate('parentCategory', 'name')
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Category.countDocuments(query)
    ]);

    return {
      data: categories,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Quản lý brands
  async getAllBrands(filters = {}) {
    const { page = 1, limit = 10, search, isActive } = filters;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [brands, total] = await Promise.all([
      Brand.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Brand.countDocuments(query)
    ]);

    return {
      data: brands,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};

