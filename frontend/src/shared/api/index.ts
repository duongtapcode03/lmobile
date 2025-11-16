/**
 * Shared API Services
 * Services được sử dụng bởi cả admin và customer
 */

// DEPRECATED: Use api/axiosClient and api/authApi instead
export { axiosClient as apiClient, default as axiosClient } from '../../api/axiosClient';
export { authApi as authClient, default as authApi } from '../../api/authApi';
export { authService, publicAuthAPI, authAPI } from '../../api/authService';

// Re-export services (will be added as we move them)
// export { default as phoneService } from './phoneService';
// export { default as categoryService } from './categoryService';
// export { default as orderService } from './orderService';
// export { default as bannerService } from './bannerService';
// export { default as blogService } from './blogService';
// export { default as brandService } from './brandService';



