/**
 * API Services - Main Export
 * Export tất cả API services
 */

// Axios clients
export { axiosClient } from './axiosClient';
export { authApi } from './authApi';

// Auth Service
export { authService, publicAuthAPI, authAPI } from './authService';

// User Service
export { userService, userAPI, publicUserAPI } from './userService';

// Seller Service
export { sellerService, sellerAPI } from './sellerService';

// Admin Service
export { adminService, adminAPI } from './adminService';

// Legacy services (for backward compatibility)
export { default as phoneService } from './phoneService';
export { default as categoryService } from './categoryService';
export { default as orderService } from './orderService';
export { default as bannerService } from './bannerService';
export { default as blogService } from './blogService';
export { default as brandService } from './brandService';
// Deprecated services - removed
// Use userService instead:
// - cartService → userService (getCart, addToCart, updateCartItem, removeFromCart, clearCart, etc.)
// - wishlistService → userService (getWishlist, addToWishlist, removeFromWishlist, checkProductInWishlist, clearWishlist)
export { default as addressService } from './addressService';
export { default as voucherService } from './voucherService';
