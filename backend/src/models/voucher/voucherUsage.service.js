import { VoucherUsage } from "./voucherUsage.model.js";
import { Voucher } from "./voucher.model.js";
import { Order } from "../order/order.model.js";
import mongoose from "mongoose";

/**
 * Voucher Usage Service
 * Service để quản lý và thống kê usage của voucher
 */
export const voucherUsageService = {
  /**
   * Lấy danh sách usage của một voucher
   */
  async getVoucherUsages(voucherId, query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate
    } = query;

    const filter = { voucher: voucherId };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const usages = await VoucherUsage.find(filter)
      .populate("user", "name email phone")
      .populate("order", "orderNumber totalAmount status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await VoucherUsage.countDocuments(filter);

    return {
      usages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  /**
   * Lấy usage của user với voucher
   */
  async getUserVoucherUsage(userId, voucherId) {
    const usages = await VoucherUsage.find({
      user: userId,
      voucher: voucherId,
      status: "used"
    })
      .populate("order", "orderNumber totalAmount status")
      .sort({ createdAt: -1 });

    return usages;
  },

  /**
   * Thống kê usage của voucher
   */
  async getVoucherUsageStats(voucherId) {
    const stats = await VoucherUsage.aggregate([
      { $match: { voucher: new mongoose.Types.ObjectId(voucherId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalDiscountAmount: { $sum: "$discountAmount" },
          totalOrderAmount: { $sum: "$orderAmount" }
        }
      }
    ]);

    const totalUsages = await VoucherUsage.countDocuments({ voucher: voucherId });
    const usedUsages = await VoucherUsage.countDocuments({
      voucher: voucherId,
      status: "used"
    });
    const cancelledUsages = await VoucherUsage.countDocuments({
      voucher: voucherId,
      status: "cancelled"
    });

    const totalDiscount = await VoucherUsage.aggregate([
      { $match: { voucher: new mongoose.Types.ObjectId(voucherId), status: "used" } },
      { $group: { _id: null, total: { $sum: "$discountAmount" } } }
    ]);

    const totalRevenue = await VoucherUsage.aggregate([
      { $match: { voucher: new mongoose.Types.ObjectId(voucherId), status: "used" } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } }
    ]);

    return {
      totalUsages,
      usedUsages,
      cancelledUsages,
      totalDiscountAmount: totalDiscount[0]?.total || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalDiscountAmount: stat.totalDiscountAmount,
          totalOrderAmount: stat.totalOrderAmount
        };
        return acc;
      }, {})
    };
  },

  /**
   * Thống kê usage theo thời gian (cho chart)
   */
  async getVoucherUsageByDate(voucherId, startDate, endDate) {
    const usages = await VoucherUsage.aggregate([
      {
        $match: {
          voucher: new mongoose.Types.ObjectId(voucherId),
          status: "used",
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 },
          totalDiscount: { $sum: "$discountAmount" },
          totalRevenue: { $sum: "$finalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return usages;
  },

  /**
   * Lấy top users sử dụng voucher
   */
  async getTopUsersByVoucher(voucherId, limit = 10) {
    const topUsers = await VoucherUsage.aggregate([
      {
        $match: {
          voucher: new mongoose.Types.ObjectId(voucherId),
          status: "used"
        }
      },
      {
        $group: {
          _id: "$user",
          usageCount: { $sum: 1 },
          totalDiscount: { $sum: "$discountAmount" },
          totalSpent: { $sum: "$finalAmount" }
        }
      },
      { $sort: { usageCount: -1 } },
      { $limit: limit }
    ]);

    // Populate user info
    const userIds = topUsers.map(u => u._id);
    const users = await mongoose.model("User").find({ _id: { $in: userIds } })
      .select("name email phone");

    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    return topUsers.map(item => ({
      user: userMap.get(item._id.toString()) || { _id: item._id },
      usageCount: item.usageCount,
      totalDiscount: item.totalDiscount,
      totalSpent: item.totalSpent
    }));
  }
};


