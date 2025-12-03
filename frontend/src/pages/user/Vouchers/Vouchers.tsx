/**
 * User Vouchers Page
 * Trang để user xem và quản lý voucher của mình
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Empty,
  Tabs,
  Spin,
  Modal,
  Descriptions,
  Badge,
} from 'antd';
import {
  GiftOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import voucherService, { type Voucher } from '../../../api/voucherService';
import './Vouchers.scss';

const { TabPane } = Tabs;

const Vouchers: React.FC = () => {
  const toast = useToast();
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [savedVouchers, setSavedVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadVouchers();
  }, [activeTab]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      if (activeTab === 'available') {
        const response = await voucherService.getAvailableVouchers({ limit: 50 });
        setAvailableVouchers(response.data || []);
      } else if (activeTab === 'saved') {
        const saved = await voucherService.getSavedVouchers();
        setSavedVouchers(saved || []);
      }
    } catch (error: any) {
      console.error('Failed to load vouchers:', error);
      toast.error('Không thể tải danh sách voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVoucher = async (voucherId: string) => {
    try {
      await voucherService.saveVoucher(voucherId);
      toast.success('Đã lưu voucher');
      loadVouchers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể lưu voucher');
    }
  };

  const handleRemoveSavedVoucher = async (voucherId: string) => {
    try {
      await voucherService.removeSavedVoucher(voucherId);
      toast.success('Đã bỏ lưu voucher');
      loadVouchers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể bỏ lưu voucher');
    }
  };

  const handleViewDetail = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setDetailModalVisible(true);
  };

  const isVoucherSaved = (voucherId: string) => {
    return savedVouchers.some(v => v._id === voucherId);
  };

  const getVoucherStatus = (voucher: Voucher) => {
    const now = new Date();
    const validFrom = new Date(voucher.validFrom);
    const validTo = new Date(voucher.validTo);

    if (!voucher.isActive) {
      return { status: 'inactive', text: 'Tạm dừng', color: 'default' };
    }
    if (now < validFrom) {
      return { status: 'not_started', text: 'Chưa bắt đầu', color: 'orange' };
    }
    if (now > validTo) {
      return { status: 'expired', text: 'Đã hết hạn', color: 'red' };
    }
    if (voucher.usedCount >= voucher.usageLimit) {
      return { status: 'out_of_stock', text: 'Đã hết', color: 'red' };
    }
    return { status: 'active', text: 'Đang hiệu lực', color: 'green' };
  };

  const formatVoucherValue = (voucher: Voucher) => {
    if (voucher.type === 'percentage') {
      return `${voucher.value}%`;
    } else if (voucher.type === 'fixed_amount') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(voucher.value);
    } else {
      return 'Miễn phí vận chuyển';
    }
  };

  const renderVoucherCard = (voucher: Voucher, showSaveButton: boolean = true) => {
    const status = getVoucherStatus(voucher);
    const saved = isVoucherSaved(voucher._id);

    return (
      <Card
        key={voucher._id}
        className="voucher-card"
        hoverable
        style={{
          background: voucher.image
            ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%), url(${voucher.image}) center/cover`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: voucher.image ? '#000' : '#fff',
          border: 'none',
          borderRadius: '12px',
          marginBottom: '16px',
        }}
        actions={[
          <Button
            key="detail"
            type="link"
            onClick={() => handleViewDetail(voucher)}
            style={{ color: voucher.image ? '#1890ff' : '#fff' }}
          >
            Chi tiết
          </Button>,
          showSaveButton && (
            <Button
              key="save"
              type="link"
              icon={saved ? <StarFilled /> : <StarOutlined />}
              onClick={() => {
                if (saved) {
                  handleRemoveSavedVoucher(voucher._id);
                } else {
                  handleSaveVoucher(voucher._id);
                }
              }}
              style={{ color: voucher.image ? '#1890ff' : '#fff' }}
            >
              {saved ? 'Đã lưu' : 'Lưu'}
            </Button>
          ),
        ].filter(Boolean)}
      >
        <div className="voucher-card-content">
          <div className="voucher-header">
            <div className="voucher-code">
              <GiftOutlined style={{ marginRight: '8px' }} />
              <span style={{ fontWeight: 'bold', fontSize: '18px' }}>
                {voucher.code}
              </span>
            </div>
            <Badge
              status={status.color as any}
              text={status.text}
              style={{ color: voucher.image ? '#000' : '#fff' }}
            />
          </div>

          <div className="voucher-name" style={{ marginTop: '12px', fontSize: '16px', fontWeight: 500 }}>
            {voucher.name}
          </div>

          {voucher.description && (
            <div className="voucher-description" style={{ marginTop: '8px', fontSize: '14px', opacity: 0.9 }}>
              {voucher.description}
            </div>
          )}

          <div className="voucher-value" style={{ marginTop: '16px', fontSize: '24px', fontWeight: 'bold' }}>
            {formatVoucherValue(voucher)}
          </div>

          {voucher.minOrderAmount > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
              Áp dụng cho đơn hàng từ{' '}
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(voucher.minOrderAmount)}
            </div>
          )}

          <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.8 }}>
            <ClockCircleOutlined style={{ marginRight: '4px' }} />
            {dayjs(voucher.validFrom).format('DD/MM/YYYY')} - {dayjs(voucher.validTo).format('DD/MM/YYYY')}
          </div>

          {voucher.usageLimit && (
            <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
              Đã dùng: {voucher.usedCount || 0} / {voucher.usageLimit}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="user-vouchers-page">
      <div className="page-header">
        <h1 className="page-title">
          <GiftOutlined style={{ marginRight: '12px' }} />
          Mã giảm giá
        </h1>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
        <TabPane
          tab={
            <span>
              <GiftOutlined />
              Voucher có sẵn
            </span>
          }
          key="available"
        >
          <Spin spinning={loading}>
            {availableVouchers.length === 0 ? (
              <Empty
                description="Không có voucher nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Row gutter={[16, 16]}>
                {availableVouchers.map((voucher) => (
                  <Col xs={24} sm={12} lg={8} key={voucher._id}>
                    {renderVoucherCard(voucher, true)}
                  </Col>
                ))}
              </Row>
            )}
          </Spin>
        </TabPane>

        <TabPane
          tab={
            <span>
              <BookOutlined />
              Voucher đã lưu
            </span>
          }
          key="saved"
        >
          <Spin spinning={loading}>
            {savedVouchers.length === 0 ? (
              <Empty
                description="Bạn chưa lưu voucher nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Row gutter={[16, 16]}>
                {savedVouchers.map((voucher) => (
                  <Col xs={24} sm={12} lg={8} key={voucher._id}>
                    {renderVoucherCard(voucher, true)}
                  </Col>
                ))}
              </Row>
            )}
          </Spin>
        </TabPane>
      </Tabs>

      <Modal
        title="Chi tiết voucher"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={600}
      >
        {selectedVoucher && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Mã voucher">
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {selectedVoucher.code}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Tên">{selectedVoucher.name}</Descriptions.Item>
            {selectedVoucher.description && (
              <Descriptions.Item label="Mô tả">{selectedVoucher.description}</Descriptions.Item>
            )}
            <Descriptions.Item label="Loại">
              {selectedVoucher.type === 'percentage' && 'Phần trăm'}
              {selectedVoucher.type === 'fixed_amount' && 'Số tiền cố định'}
              {selectedVoucher.type === 'free_shipping' && 'Miễn phí vận chuyển'}
            </Descriptions.Item>
            <Descriptions.Item label="Giá trị">{formatVoucherValue(selectedVoucher)}</Descriptions.Item>
            {selectedVoucher.maxDiscountAmount && (
              <Descriptions.Item label="Giảm tối đa">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(selectedVoucher.maxDiscountAmount)}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Đơn hàng tối thiểu">
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(selectedVoucher.minOrderAmount || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày bắt đầu">
              {dayjs(selectedVoucher.validFrom).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày kết thúc">
              {dayjs(selectedVoucher.validTo).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Giới hạn sử dụng">
              {selectedVoucher.usageLimit || 'Không giới hạn'}
            </Descriptions.Item>
            <Descriptions.Item label="Đã sử dụng">
              {selectedVoucher.usedCount || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={getVoucherStatus(selectedVoucher).color}>
                {getVoucherStatus(selectedVoucher).text}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Vouchers;


