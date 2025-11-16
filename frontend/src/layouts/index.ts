// Re-export from new structure for backward compatibility
export { default as UserLayout } from './UserLayout/UserLayout';
export { AdminLayout } from '../admin/layouts';
export { AuthLayout } from '../shared/layouts';
export { default as MainLayout } from './MainLayout'; // Giữ lại để backward compatibility (deprecated, use UserLayout)
