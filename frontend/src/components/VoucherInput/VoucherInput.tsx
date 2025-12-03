/**
 * VoucherInput Component
 * Component để nhập và apply voucher vào cart
 */

import React, { useState } from 'react';
import { Input, Button, Space, Tag, Typography } from 'antd';
import { TagOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import voucherService, { VOUCHER_ERROR_CODES } from '../../api/voucherService';
import { userService } from '../../api/userService';
import { getVoucherErrorMessage } from '../../utils/voucherErrorHandler';
import { useToast } from '../../contexts/ToastContext';
import './VoucherInput.scss';

const { Text } = Typography;

interface VoucherInputProps {
  cartItems: any[];
  orderAmount: number;
  shippingFee?: number;
  currentVoucherCode?: string;
  onVoucherApplied?: (voucher: any, discountAmount: number) => void;
  onVoucherRemoved?: () => void;
  onCartUpdate?: () => void;
}

const VoucherInput: React.FC<VoucherInputProps> = ({
  cartItems,
  orderAmount,
  shippingFee = 0,
  currentVoucherCode,
  onVoucherApplied,
  onVoucherRemoved,
  onCartUpdate
}) => {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [removing, setRemoving] = useState(false);


  const handleApply = async () => {
    if (!code.trim()) {
      toast.warning('Vui lòng nhập mã giảm giá');
      return;
    }

    if (orderAmount === 0) {
      toast.warning('Giỏ hàng trống');
      return;
    }

    try {
      setApplying(true);

      // Gọi trực tiếp applyCoupon - backend sẽ validate và tính discount
      const applyResult = await userService.applyCoupon(code.trim().toUpperCase());
      
      // Hiển thị toast TRƯỚC khi reload cart để không bị mất
      toast.success(applyResult.message || 'Áp dụng mã giảm giá thành công!');
      setCode('');

      // Reload cart SAU khi đã hiển thị toast
      if (onCartUpdate) {
        await onCartUpdate();
      }

      // Callback với voucher info từ backend
      if (onVoucherApplied && applyResult.voucher) {
        onVoucherApplied(applyResult.voucher, applyResult.discountAmount || 0);
      }

    } catch (error: any) {
      console.error('[VoucherInput] Apply error:', error);
      const errorMessage = error.response?.data?.message || 'Không thể áp dụng mã giảm giá';
      toast.error(errorMessage);
    } finally {
      setApplying(false);
    }
  };

  const handleRemove = async () => {
    try {
      setRemoving(true);
      await userService.removeCoupon();
      
      // Hiển thị toast TRƯỚC khi reload cart để không bị mất
      toast.success('Đã xóa mã giảm giá');
      
      // Reload cart SAU khi đã hiển thị toast
      if (onCartUpdate) {
        await onCartUpdate();
      }

      // Callback
      if (onVoucherRemoved) {
        onVoucherRemoved();
      }
    } catch (error: any) {
      console.error('[VoucherInput] Remove error:', error);
      toast.error('Không thể xóa mã giảm giá');
    } finally {
      setRemoving(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Nếu đã có voucher, hiển thị thông tin voucher
  if (currentVoucherCode) {
    return (
      <div className="voucher-input-applied">
        <Space>
          <Tag icon={<TagOutlined />} color="success">
            {currentVoucherCode}
          </Tag>
          <Text type="secondary">đã được áp dụng</Text>
          <Button
            type="link"
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={handleRemove}
            loading={removing}
          >
            Xóa
          </Button>
        </Space>
      </div>
    );
  }

  // Form nhập voucher
  return (
    <div className="voucher-input">
      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder="Nhập mã giảm giá"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onPressEnter={handleApply}
          prefix={<TagOutlined style={{ color: '#999' }} />}
          disabled={applying}
        />
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={handleApply}
          loading={applying}
        >
          Áp dụng
        </Button>
      </Space.Compact>
    </div>
  );
};

export default VoucherInput;

