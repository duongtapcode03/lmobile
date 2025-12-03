import crypto from 'crypto';
import qs from 'qs'; // Dùng qs package như code mẫu VNPay

/**
 * VNPay Payment Service
 * Tích hợp thanh toán qua VNPay Payment Gateway
 */
class VNPayService {
  constructor() {
    // VNPay Configuration từ environment variables
    this.tmnCode = process.env.VNPAY_TMN_CODE || 'JBJX5PXN';
    this.secretKey = process.env.VNPAY_SECRET_KEY || 'C5TP32EHZM6BH4DIW5VJLAENB6T9WK77';
    this.vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.vnpApi = process.env.VNPAY_API || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
    this.returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:5173/payment/vnpay/return';
    this.ipnUrl = process.env.VNPAY_IPN_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/payment/vnpay/ipn`;
  }

  /**
   * Tạo chữ ký VNPay (HMAC SHA512)
   * Theo code mẫu VNPay: dùng querystring.stringify với encode: false
   */
  createSecureHash(data) {
    // data Ở ĐÂY PHẢI LÀ object ĐÃ sort + encode (từ sortObject)
    const signData = { ...data };
    delete signData.vnp_SecureHash;
    delete signData.vnp_SecureHashType;

    // Không gọi sortObject nữa, chỉ sort key cho chắc thứ tự
    const keys = Object.keys(signData).sort();

    let signString = keys
      .map(key => `${key}=${signData[key]}`)
      .join('&')
      .trim();

    console.log('[VNPay] Signature data:', JSON.stringify(signString));
    console.log('[VNPay] Signature data length:', signString.length);

    const hmac = crypto.createHmac('sha512', this.secretKey.trim());
    // eslint-disable-next-line node/no-deprecated-api
    const signature = hmac.update(new Buffer(signString, 'utf-8')).digest('hex');

    console.log('[VNPay] Generated signature:', signature);
    return signature;
  }

  /**
   * Tạo URL thanh toán VNPay (Redirect)
   */
  createPaymentUrl(orderId, amount, orderDescription, bankCode = '', ipAddr = '127.0.0.1') {
    const date = new Date();
    const createDate = this.formatDate(date);
    
    // vnp_ExpireDate - Bắt buộc theo doc mới
    // Thời gian hết hạn thanh toán GMT+7, định dạng yyyyMMddHHmmss
    // Thường là +15 phút từ createDate
    const expire = new Date(date.getTime() + 15 * 60 * 1000);
    const expireDate = this.formatDate(expire);

    // VNPay yêu cầu orderInfo: Tiếng Việt không dấu và không bao gồm các ký tự đặc biệt
    // Loại bỏ ký tự đặc biệt và dấu tiếng Việt
    const cleanOrderInfo = this.cleanOrderInfo(orderDescription);

    // Tạo params theo code mẫu VNPay (dùng object notation)
    const vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = this.tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = String(orderId);
    vnp_Params['vnp_OrderInfo'] = cleanOrderInfo;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = Math.round(amount * 100); // VNPay yêu cầu amount tính bằng xu (x100)
    vnp_Params['vnp_ReturnUrl'] = this.returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    vnp_Params['vnp_ExpireDate'] = expireDate; // Bắt buộc theo doc mới

    // Chỉ thêm bankCode nếu có (theo code mẫu)
    if (bankCode && bankCode !== '') {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    // Sắp xếp params theo thứ tự alphabet (theo code mẫu)
    const sortedParams = this.sortObject(vnp_Params);
    
    console.log('[VNPay] Params before signature:', JSON.stringify(sortedParams, null, 2));
    
    // Tạo chữ ký (KHÔNG bao gồm vnp_SecureHash)
    // Code mẫu: tạo signature từ sortedParams (bao gồm vnp_ExpireDate)
    const secureHash = this.createSecureHash(sortedParams);
    
    console.log('[VNPay] Generated signature:', secureHash);
    
    // Thêm signature vào params (theo code mẫu)
    sortedParams['vnp_SecureHash'] = secureHash;
    
    console.log('[VNPay] Final params with signature:', Object.keys(sortedParams));

    // Tạo URL thanh toán
    // sortedParams đã được encode trong sortObject, nên chỉ cần nối key=value
    // Tạo query string thủ công để tránh double encode (giống signature)
    let queryString = Object.keys(sortedParams)
      .map(key => `${key}=${sortedParams[key]}`)
      .join('&');
    queryString = queryString.trim();
    
    const paymentUrl = this.vnpUrl + '?' + queryString;
    
    console.log('[VNPay] Payment URL created:', paymentUrl.substring(0, 200) + '...');
    
    return {
      paymentUrl,
      orderId,
      amount,
      createDate,
      expireDate
    };
  }

  /**
   * Làm sạch orderInfo - loại bỏ ký tự đặc biệt và dấu tiếng Việt
   * VNPay chỉ chấp nhận chữ cái, số, khoảng trắng và dấu hai chấm (:)
   * Theo demo: "Thanh toan don hang thoi gian: 2025-12-02 23:03:57"
   */
  cleanOrderInfo(orderInfo) {
    if (!orderInfo) return 'Thanh toan don hang';
    
    // Chuyển về không dấu và loại bỏ ký tự đặc biệt (giữ lại dấu hai chấm và dấu gạch ngang)
    let cleaned = orderInfo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu tiếng Việt
      .replace(/[^a-zA-Z0-9\s:\-]/g, '') // Chỉ giữ chữ, số, khoảng trắng, dấu hai chấm và dấu gạch ngang
      .replace(/\s+/g, ' ') // Nhiều khoảng trắng thành 1
      .trim()
      .substring(0, 255); // Giới hạn độ dài
    
    // Nếu rỗng sau khi clean, dùng giá trị mặc định
    if (!cleaned || cleaned.length === 0) {
      cleaned = 'Thanh toan don hang';
    }
    
    return cleaned;
  }

  /**
   * Tạo QR Code URL cho VNPay
   * VNPay hỗ trợ QR code qua payment URL
   */
  async createQRCode(orderId, amount, orderDescription, ipAddr = '127.0.0.1') {
    try {
      // Tạo payment URL
      const result = this.createPaymentUrl(orderId, amount, orderDescription, '', ipAddr);
      
      // QR code sẽ được tạo từ payment URL
      // Frontend có thể sử dụng thư viện QR code để generate từ paymentUrl
      
      return {
        qrCodeUrl: result.paymentUrl, // URL để tạo QR code
        paymentUrl: result.paymentUrl,
        orderId: result.orderId,
        amount: result.amount,
        createDate: result.createDate,
        expireDate: result.expireDate
      };
    } catch (error) {
      console.error('[VNPay] Error creating QR code:', error);
      throw error;
    }
  }

  /**
   * Verify callback từ VNPay (IPN)
   */
  verifyIpnCallback(vnpParams) {
    const secureHash = vnpParams.vnp_SecureHash;
    
    // Tạo bản copy để không ảnh hưởng đến object gốc
    const paramsToVerify = { ...vnpParams };
    delete paramsToVerify.vnp_SecureHash;
    delete paramsToVerify.vnp_SecureHashType;

    const sortedParams = this.sortObject(paramsToVerify);
    const checkSum = this.createSecureHash(sortedParams);

    console.log('[VNPay] Verifying IPN callback');
    console.log('[VNPay] Received hash:', secureHash);
    console.log('[VNPay] Calculated hash:', checkSum);

    return secureHash === checkSum;
  }

  /**
   * Sắp xếp object theo key và encode giá trị giống code mẫu VNPay
   */
  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();

    keys.forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        // Encode giá trị giống code mẫu VNPay:
        // - encodeURIComponent: space → %20, : → %3A, / → %2F, ...
        // - chuyển %20 -> + (như code mẫu VNPay)
        sorted[key] = encodeURIComponent(String(value)).replace(/%20/g, '+');
      }
    });

    return sorted;
  }

  /**
   * Format date theo format VNPay yêu cầu (yyyyMMddHHmmss)
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Parse response code từ VNPay
   */
  getResponseMessage(responseCode) {
    const responseMessages = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
      '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
      '10': 'Xác thực thông tin thẻ/tài khoản không đúng. Vui lòng thử lại',
      '11': 'Đã hết hạn chờ thanh toán. Vui lòng thử lại',
      '12': 'Thẻ/Tài khoản bị khóa',
      '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP). Vui lòng thử lại',
      '51': 'Tài khoản không đủ số dư để thực hiện giao dịch',
      '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
      '75': 'Ngân hàng thanh toán đang bảo trì',
      '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
      '99': 'Lỗi không xác định'
    };
    return responseMessages[responseCode] || 'Lỗi không xác định';
  }
}

export const vnpayService = new VNPayService();

