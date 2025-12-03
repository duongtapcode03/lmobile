import { returnRequestService } from "./returnRequest.service.js";
import { successResponse, paginatedResponse, createdResponse, errorResponse } from "../../core/utils/response.js";

export const returnRequestController = {
  /**
   * User: Tạo yêu cầu hoàn hàng
   */
  create: async (req, res) => {
    try {
      const { orderId, items, customerNote } = req.body;

      if (!orderId) {
        return errorResponse(res, "Vui lòng cung cấp ID đơn hàng", 400);
      }

      const returnRequest = await returnRequestService.createReturnRequest(
        req.user.id,
        orderId,
        { items, customerNote }
      );

      createdResponse(res, returnRequest, "Yêu cầu hoàn hàng đã được tạo thành công");
    } catch (error) {
      errorResponse(res, error.message || "Không thể tạo yêu cầu hoàn hàng", 400);
    }
  },

  /**
   * User: Lấy danh sách return requests của mình
   */
  getMyReturnRequests: async (req, res) => {
    try {
      const result = await returnRequestService.getMyReturnRequests(req.user.id, req.query);
      paginatedResponse(res, result.items, result.pagination);
    } catch (error) {
      errorResponse(res, error.message || "Không thể tải danh sách yêu cầu hoàn hàng", 400);
    }
  },

  /**
   * User: Lấy chi tiết return request
   */
  getById: async (req, res) => {
    try {
      const returnRequest = await returnRequestService.getReturnRequestById(
        req.params.id,
        req.user.id
      );
      successResponse(res, returnRequest);
    } catch (error) {
      errorResponse(res, error.message || "Không thể tải chi tiết yêu cầu hoàn hàng", 400);
    }
  },

  /**
   * User: Hủy yêu cầu hoàn hàng
   */
  cancel: async (req, res) => {
    try {
      const returnRequest = await returnRequestService.cancelReturnRequest(
        req.params.id,
        req.user.id
      );
      successResponse(res, returnRequest, "Đã hủy yêu cầu hoàn hàng");
    } catch (error) {
      errorResponse(res, error.message || "Không thể hủy yêu cầu hoàn hàng", 400);
    }
  },

  /**
   * Admin: Lấy tất cả return requests
   */
  getAll: async (req, res) => {
    try {
      const result = await returnRequestService.getAllReturnRequests(req.query);
      paginatedResponse(res, result.items, result.pagination);
    } catch (error) {
      errorResponse(res, error.message || "Không thể tải danh sách yêu cầu hoàn hàng", 400);
    }
  },

  /**
   * Admin: Lấy chi tiết return request (không cần userId)
   */
  getByIdAdmin: async (req, res) => {
    try {
      const returnRequest = await returnRequestService.getReturnRequestById(req.params.id);
      successResponse(res, returnRequest);
    } catch (error) {
      errorResponse(res, error.message || "Không thể tải chi tiết yêu cầu hoàn hàng", 400);
    }
  },

  /**
   * Admin: Duyệt yêu cầu hoàn hàng
   */
  approve: async (req, res) => {
    try {
      const { adminNote } = req.body;
      const returnRequest = await returnRequestService.approveReturnRequest(
        req.params.id,
        req.user.id,
        adminNote
      );
      successResponse(res, returnRequest, "Đã duyệt yêu cầu hoàn hàng");
    } catch (error) {
      errorResponse(res, error.message || "Không thể duyệt yêu cầu hoàn hàng", 400);
    }
  },

  /**
   * Admin: Từ chối yêu cầu hoàn hàng
   */
  reject: async (req, res) => {
    try {
      const { adminNote } = req.body;
      const returnRequest = await returnRequestService.rejectReturnRequest(
        req.params.id,
        req.user.id,
        adminNote
      );
      successResponse(res, returnRequest, "Đã từ chối yêu cầu hoàn hàng");
    } catch (error) {
      errorResponse(res, error.message || "Không thể từ chối yêu cầu hoàn hàng", 400);
    }
  },

  /**
   * Admin: Xác nhận đã nhận hàng và bắt đầu xử lý
   */
  process: async (req, res) => {
    try {
      const { adminNote } = req.body;
      const returnRequest = await returnRequestService.processReturnRequest(
        req.params.id,
        req.user.id,
        adminNote
      );
      successResponse(res, returnRequest, "Đã xác nhận nhận hàng và bắt đầu xử lý hoàn tiền");
    } catch (error) {
      errorResponse(res, error.message || "Không thể xử lý yêu cầu hoàn hàng", 400);
    }
  },

  /**
   * Admin: Hoàn thành hoàn tiền
   */
  complete: async (req, res) => {
    try {
      const { refundTransactionId, adminNote } = req.body;
      const returnRequest = await returnRequestService.completeReturnRequest(
        req.params.id,
        req.user.id,
        { refundTransactionId, adminNote }
      );
      successResponse(res, returnRequest, "Đã hoàn thành hoàn tiền");
    } catch (error) {
      errorResponse(res, error.message || "Không thể hoàn thành hoàn tiền", 400);
    }
  }
};

