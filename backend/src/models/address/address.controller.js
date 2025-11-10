import { addressService } from "./address.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { createdResponse, successResponse } from "../../core/utils/response.js";

export const addressController = {
  /**
   * Tạo địa chỉ mới
   */
  create: catchAsync(async (req, res) => {
    const address = await addressService.createAddress(req.user.id, req.body);
    createdResponse(res, address, "Đã tạo địa chỉ mới");
  }),

  /**
   * Lấy tất cả địa chỉ của user
   */
  getAll: catchAsync(async (req, res) => {
    const addresses = await addressService.getUserAddresses(req.user.id);
    successResponse(res, addresses, `Tìm thấy ${addresses.length} địa chỉ`);
  }),

  /**
   * Lấy địa chỉ mặc định
   */
  getDefault: catchAsync(async (req, res) => {
    const address = await addressService.getDefaultAddress(req.user.id);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Chưa có địa chỉ mặc định"
      });
    }
    
    successResponse(res, address);
  }),

  /**
   * Lấy địa chỉ theo ID
   */
  getById: catchAsync(async (req, res) => {
    const address = await addressService.getAddressById(req.params.id, req.user.id);
    successResponse(res, address);
  }),

  /**
   * Update địa chỉ
   */
  update: catchAsync(async (req, res) => {
    const address = await addressService.updateAddress(req.params.id, req.user.id, req.body);
    successResponse(res, address, "Đã cập nhật địa chỉ");
  }),

  /**
   * Xóa địa chỉ
   */
  delete: catchAsync(async (req, res) => {
    await addressService.deleteAddress(req.params.id, req.user.id);
    successResponse(res, null, "Đã xóa địa chỉ");
  }),

  /**
   * Set địa chỉ làm mặc định
   */
  setDefault: catchAsync(async (req, res) => {
    const address = await addressService.setDefaultAddress(req.params.id, req.user.id);
    successResponse(res, address, "Đã đặt làm địa chỉ mặc định");
  })
};

