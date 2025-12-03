/**
 * VoucherSection Component
 * Hiển thị danh sách voucher ở trang chủ dạng thanh ngang nhỏ
 */

import React, { useState, useEffect } from 'react';
import {
  Button,
  Typography,
  Spin,
  Tooltip,
} from 'antd';
import {
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import voucherService, { type Voucher } from '../../api/voucherService';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import './VoucherSection.scss';

const { Text } = Typography;

interface VoucherSectionProps {
  limit?: number;
}

const VoucherSection: React.FC<VoucherSectionProps> = ({ limit = 6 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [savedVouchers, setSavedVouchers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const isAuthenticated = useSelector((state: any) => state?.auth?.isAuthenticated || false);
  const token = useSelector((state: any) => state?.auth?.token);

  useEffect(() => {
    loadVouchers();
    if (isAuthenticated) {
      loadSavedVouchers();
    }
  }, [isAuthenticated]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const response = await voucherService.getAvailableVouchers({ limit });
      console.log('[VoucherSection] Loaded vouchers:', response);
      setVouchers(response.data || []);
    } catch (error: any) {
      console.error('Failed to load vouchers:', error);
      // Không hiển thị error message vì đây là optional section
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedVouchers = async () => {
    try {
      const saved = await voucherService.getSavedVouchers();
      setSavedVouchers(saved.map((v: Voucher) => v._id));
    } catch (error) {
      console.error('Failed to load saved vouchers:', error);
    }
  };

  const handleSaveVoucher = async (voucherId: string) => {
    // Kiểm tra đăng nhập (cả Redux state và token)
    const hasToken = token || (() => {
      try {
        const persistAuth = localStorage.getItem('persist:auth');
        if (persistAuth) {
          const parsed = JSON.parse(persistAuth);
          let storedToken = parsed.token;
          if (storedToken && typeof storedToken === 'string') {
            if (storedToken.startsWith('"') && storedToken.endsWith('"')) {
              storedToken = JSON.parse(storedToken);
            }
            if (storedToken && storedToken !== 'null' && storedToken !== 'undefined') {
              return true;
            }
          }
        }
      } catch (error) {
        return false;
      }
      return false;
    })();

    if (!isAuthenticated || !hasToken) {
      const currentPath = location.pathname;
      toast.warning('Vui lòng đăng nhập để lưu voucher', 2);
      try {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      } catch (err) {
        console.warn('Could not save redirect path:', err);
      }
      setTimeout(() => {
        window.location.href = '/login';
      }, 200);
      return;
    }

    try {
      setSaving(voucherId);
      if (savedVouchers.includes(voucherId)) {
        await voucherService.removeSavedVoucher(voucherId);
        setSavedVouchers(prev => prev.filter(id => id !== voucherId));
        toast.success('Đã bỏ lưu voucher');
      } else {
        await voucherService.saveVoucher(voucherId);
        setSavedVouchers(prev => [...prev, voucherId]);
        toast.success('Đã lưu voucher');
      }
    } catch (error: any) {
      console.error('Failed to save voucher:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu voucher');
    } finally {
      setSaving(null);
    }
  };

  const formatDiscount = (voucher: Voucher) => {
    if (voucher.type === 'percentage') {
      return `Giảm ${voucher.value}%`;
    } else if (voucher.type === 'fixed_amount') {
      return `Giảm ${new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(voucher.value)}`;
    } else {
      return 'Miễn phí vận chuyển';
    }
  };

  const isVoucherValid = (voucher: Voucher) => {
    const now = new Date();
    const validFrom = new Date(voucher.validFrom);
    const validTo = new Date(voucher.validTo);
    return now >= validFrom && now <= validTo && voucher.isActive;
  };

  if (loading && vouchers.length === 0) {
    return (
      <div className="voucher-section">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      </div>
    );
  }

  if (vouchers.length === 0) {
    return null;
  }

  return (
    <div className="voucher-section">
      <div className="voucher-scroll-container">
        <div className="voucher-scroll">
          {vouchers.map((voucher) => {
            const isValid = isVoucherValid(voucher);
            const isSaved = savedVouchers.includes(voucher._id);

            return (
              <div
                key={voucher._id}
                className={`voucher-item ${isValid ? 'valid' : 'invalid'} ${isSaved ? 'saved' : ''}`}
              >
                <div className="voucher-content">
                  <div className="voucher-code">
                    <Text strong className="code-text">
                      {voucher.code}
                    </Text>
                  </div>
                  <div className="voucher-discount">
                    <Text strong className="discount-text">
                      {formatDiscount(voucher)}
                    </Text>
                  </div>
                </div>
                <Tooltip title={isSaved ? 'Bỏ lưu' : 'Lưu voucher'}>
                  <Button
                    type="text"
                    size="small"
                    icon={isSaved ? <HeartFilled /> : <HeartOutlined />}
                    onClick={() => handleSaveVoucher(voucher._id)}
                    loading={saving === voucher._id}
                    className={`save-btn ${isSaved ? 'saved' : ''}`}
                  />
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VoucherSection;

