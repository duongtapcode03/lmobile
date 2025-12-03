/**
 * Voucher Error Handler Utility
 * Map error codes từ backend thành messages thân thiện với user
 */

import { VOUCHER_ERROR_CODES } from '../api/voucherService';

export interface VoucherError {
  errorCode?: string;
  message?: string;
}

/**
 * Map error code thành message thân thiện
 */
export const getVoucherErrorMessage = (error: VoucherError | string): string => {
  let errorCode: string | undefined;
  let defaultMessage: string | undefined;

  if (typeof error === 'string') {
    defaultMessage = error;
  } else {
    errorCode = error.errorCode;
    defaultMessage = error.message;
  }

  if (!errorCode) {
    return defaultMessage || 'Mã giảm giá không hợp lệ';
  }

  const errorMessages: Record<string, string> = {
    [VOUCHER_ERROR_CODES.NOT_FOUND]: 'Mã voucher không tồn tại',
    [VOUCHER_ERROR_CODES.INVALID_CODE]: 'Mã voucher không hợp lệ',
    [VOUCHER_ERROR_CODES.INACTIVE]: 'Voucher đã bị vô hiệu hóa',
    [VOUCHER_ERROR_CODES.EXPIRED]: 'Voucher đã hết hạn',
    [VOUCHER_ERROR_CODES.NOT_STARTED]: 'Voucher chưa có hiệu lực',
    [VOUCHER_ERROR_CODES.OUT_OF_STOCK]: 'Voucher đã hết lượt sử dụng',
    [VOUCHER_ERROR_CODES.MIN_ORDER_NOT_MET]: 'Đơn hàng chưa đạt giá trị tối thiểu',
    [VOUCHER_ERROR_CODES.USER_NOT_ELIGIBLE]: 'Bạn không đủ điều kiện sử dụng voucher này',
    [VOUCHER_ERROR_CODES.NEW_USER_ONLY]: 'Voucher chỉ dành cho người dùng mới',
    [VOUCHER_ERROR_CODES.FIRST_TIME_ONLY]: 'Voucher này chỉ được sử dụng một lần duy nhất',
    [VOUCHER_ERROR_CODES.USER_LIMIT_EXCEEDED]: 'Bạn đã sử dụng hết lượt voucher này',
    [VOUCHER_ERROR_CODES.PRODUCT_NOT_APPLICABLE]: 'Voucher không áp dụng cho sản phẩm trong giỏ hàng',
    [VOUCHER_ERROR_CODES.PRODUCT_EXCLUDED]: 'Voucher không áp dụng cho một số sản phẩm trong giỏ hàng',
    [VOUCHER_ERROR_CODES.STACKING_NOT_ALLOWED]: 'Không thể sử dụng nhiều voucher cùng lúc',
    [VOUCHER_ERROR_CODES.CONCURRENCY_ERROR]: 'Voucher đã hết lượt sử dụng. Vui lòng thử lại',
    [VOUCHER_ERROR_CODES.SYSTEM_ERROR]: 'Lỗi hệ thống. Vui lòng thử lại sau'
  };

  return errorMessages[errorCode] || defaultMessage || 'Mã giảm giá không hợp lệ';
};

/**
 * Kiểm tra error code có phải là lỗi cần remove voucher không
 */
export const shouldRemoveVoucher = (errorCode?: string): boolean => {
  if (!errorCode) return false;

  const removeErrorCodes = [
    VOUCHER_ERROR_CODES.EXPIRED,
    VOUCHER_ERROR_CODES.OUT_OF_STOCK,
    VOUCHER_ERROR_CODES.INACTIVE,
    VOUCHER_ERROR_CODES.MIN_ORDER_NOT_MET,
    VOUCHER_ERROR_CODES.CONCURRENCY_ERROR
  ];

  return removeErrorCodes.includes(errorCode);
};


