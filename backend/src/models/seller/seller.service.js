import { Product } from "../product/product.model.js";
import { Order } from "../order/order.model.js";
import { findProductById } from "../product/product.service.js";

export const sellerService = {
  // Lấy thống kê tổng quan cho seller
  async getDashboardStats(sellerId) {
    try {
      // Lấy tất cả products của seller (giả sử seller có thể tạo products)
      // Nếu không có field sellerId trong Product, có thể dùng userId từ req.user
      const totalProducts = await Product.countDocuments({ isActive: true });
      
      // Lấy orders có chứa products của seller
      const orders = await Order.find({
        'items.product': { $exists: true }
      }).populate('items.product', 'name price');

      // Lọc orders có products của seller này
      const sellerOrders = orders.filter(order => {
        // Logic để kiểm tra order có products của seller
        // Có thể cần thêm field sellerId vào Product model
        return true; // Tạm thời return true, cần logic thực tế
      });

      const totalOrders = sellerOrders.length;
      // Tính doanh thu từ đơn hàng đã giao hoặc đã thanh toán, loại trừ đơn hàng đã hủy/trả hàng
      // Doanh thu = (giá bán - giá nhập) * số lượng cho mỗi item
      const totalRevenue = sellerOrders.reduce((sum, order) => {
        const isDelivered = order.status === 'delivered';
        const isPaid = order.paymentInfo?.status === 'paid';
        const isCancelled = order.status === 'cancelled';
        const isReturned = order.status === 'returned';
        
        if ((isDelivered || isPaid) && !isCancelled && !isReturned) {
          // Tính doanh thu từ items: (giá bán - giá nhập) * số lượng
          const orderRevenue = (order.items || []).reduce((itemSum, item) => {
            const itemPrice = item.price || 0;
            const itemImportPrice = item.importPrice || 0;
            const itemQuantity = item.quantity || 0;
            const profit = (itemPrice - itemImportPrice) * itemQuantity;
            return itemSum + profit;
          }, 0);
          return sum + orderRevenue;
        }
        return sum;
      }, 0);

      // Recent orders
      const recentOrders = sellerOrders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);

      return {
        overview: {
          totalProducts,
          totalOrders,
          totalRevenue
        },
        recentOrders
      };
    } catch (error) {
      console.error('Error getting seller dashboard stats:', error);
      throw error;
    }
  },

  // Quản lý products của seller
  async getMyProducts(sellerId, filters = {}) {
    const { page = 1, limit = 10, search, isActive } = filters;
    const skip = (page - 1) * limit;

    const query = {};
    // Nếu Product model có sellerId field, thêm điều kiện
    // query.sellerId = sellerId;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
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

  async createProduct(sellerId, productData) {
    // Thêm sellerId vào productData nếu Product model có field này
    const product = new Product({
      ...productData,
      // sellerId: sellerId
    });
    await product.save();
    return product;
  },

  async updateMyProduct(sellerId, productId, updateData) {
    const product = await findProductById(productId);
    if (!product) {
      throw new Error('Sản phẩm không tồn tại');
    }
    
    // Kiểm tra quyền sở hữu (nếu có sellerId field)
    // if (product.sellerId && product.sellerId.toString() !== sellerId.toString()) {
    //   throw new Error('Không có quyền chỉnh sửa sản phẩm này');
    // }

    Object.assign(product, updateData);
    await product.save();
    return product;
  },

  async deleteMyProduct(sellerId, productId) {
    const product = await findProductById(productId);
    if (!product) {
      throw new Error('Sản phẩm không tồn tại');
    }

    // Kiểm tra quyền sở hữu
    // if (product.sellerId && product.sellerId.toString() !== sellerId.toString()) {
    //   throw new Error('Không có quyền xóa sản phẩm này');
    // }

    product.isActive = false;
    await product.save();
    return product;
  },

  // Quản lý orders của seller
  async getMyOrders(sellerId, filters = {}) {
    const { page = 1, limit = 10, status } = filters;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }

    // Lấy orders có products của seller
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Lọc orders có products của seller (cần logic thực tế)
    const sellerOrders = orders; // Tạm thời

    const total = sellerOrders.length;

    return {
      data: sellerOrders,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async updateMyOrderStatus(sellerId, orderId, status) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Đơn hàng không tồn tại');
    }

    // Kiểm tra quyền (order có products của seller)
    // Logic kiểm tra...

    order.status = status;
    await order.save();
    return order;
  }
};

