import { sellerService } from "./seller.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { successResponse, createdResponse } from "../../core/utils/response.js";

export const sellerController = {
  // Dashboard stats
  getDashboardStats: catchAsync(async (req, res) => {
    const stats = await sellerService.getDashboardStats(req.user.id);
    successResponse(res, stats);
  }),

  // Products management
  getMyProducts: catchAsync(async (req, res) => {
    const result = await sellerService.getMyProducts(req.user.id, req.query);
    successResponse(res, result);
  }),

  createProduct: catchAsync(async (req, res) => {
    const product = await sellerService.createProduct(req.user.id, req.body);
    createdResponse(res, product, "Tạo sản phẩm thành công");
  }),

  updateMyProduct: catchAsync(async (req, res) => {
    const product = await sellerService.updateMyProduct(
      req.user.id,
      req.params.productId,
      req.body
    );
    successResponse(res, product, "Cập nhật sản phẩm thành công");
  }),

  deleteMyProduct: catchAsync(async (req, res) => {
    const product = await sellerService.deleteMyProduct(
      req.user.id,
      req.params.productId
    );
    successResponse(res, product, "Xóa sản phẩm thành công");
  }),

  // Orders management
  getMyOrders: catchAsync(async (req, res) => {
    const result = await sellerService.getMyOrders(req.user.id, req.query);
    successResponse(res, result);
  }),

  updateMyOrderStatus: catchAsync(async (req, res) => {
    const { status } = req.body;
    const order = await sellerService.updateMyOrderStatus(
      req.user.id,
      req.params.orderId,
      status
    );
    successResponse(res, order, "Cập nhật trạng thái đơn hàng thành công");
  })
};

