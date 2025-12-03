/**
 * Seller Vouchers Page
 * Trang để seller xem thống kê voucher (chỉ xem, không tạo/sửa/xóa)
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  message,
  Spin,
  DatePicker,
  Space,
  Button,
} from 'antd';
import {
  BarChartOutlined,
  ReloadOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import voucherService from '../../../api/voucherService';
import './Vouchers.scss';

const { RangePicker } = DatePicker;

const Vouchers: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await voucherService.getStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      message.error('Không thể tải thống kê voucher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seller-vouchers-page">
      <div className="page-header">
        <h1 className="page-title">
          <GiftOutlined style={{ marginRight: '12px' }} />
          Thống kê mã giảm giá
        </h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadStats}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {stats && (
          <>
            {/* Stats Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Tổng số voucher"
                    value={stats.totalVouchers || 0}
                    prefix={<BarChartOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Voucher đang hoạt động"
                    value={stats.activeVouchers || 0}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Tổng lượt sử dụng"
                    value={stats.totalUsages || 0}
                    prefix={<BarChartOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Tổng giảm giá (₫)"
                    value={stats.totalDiscountAmount || 0}
                    precision={0}
                    formatter={(value) => new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(Number(value))}
                  />
                </Card>
              </Col>
            </Row>

            {/* Additional Stats */}
            {stats.byType && (
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={8}>
                  <Card title="Theo loại voucher">
                    <Row gutter={16}>
                      {stats.byType.percentage && (
                        <Col span={12}>
                          <Statistic
                            title="Phần trăm"
                            value={stats.byType.percentage}
                          />
                        </Col>
                      )}
                      {stats.byType.fixed_amount && (
                        <Col span={12}>
                          <Statistic
                            title="Số tiền cố định"
                            value={stats.byType.fixed_amount}
                          />
                        </Col>
                      )}
                      {stats.byType.free_shipping && (
                        <Col span={12}>
                          <Statistic
                            title="Miễn phí ship"
                            value={stats.byType.free_shipping}
                          />
                        </Col>
                      )}
                    </Row>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Card title="Theo trạng thái">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Statistic
                          title="Đang hiệu lực"
                          value={stats.activeVouchers || 0}
                          valueStyle={{ color: '#3f8600' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Tạm dừng"
                          value={(stats.totalVouchers || 0) - (stats.activeVouchers || 0)}
                          valueStyle={{ color: '#cf1322' }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Card title="Hiệu quả">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Statistic
                          title="Tỷ lệ sử dụng"
                          value={stats.totalVouchers > 0 
                            ? ((stats.totalUsages || 0) / stats.totalVouchers).toFixed(1)
                            : 0}
                          suffix="%"
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Giảm giá TB"
                          value={stats.totalUsages > 0
                            ? (stats.totalDiscountAmount || 0) / (stats.totalUsages || 1)
                            : 0}
                          precision={0}
                          formatter={(value) => new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(Number(value))}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Note */}
            <Card>
              <div style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>
                <p>
                  <strong>Lưu ý:</strong> Seller chỉ có quyền xem thống kê voucher.
                  Để tạo, sửa hoặc xóa voucher, vui lòng liên hệ Admin.
                </p>
              </div>
            </Card>
          </>
        )}
      </Spin>
    </div>
  );
};

export default Vouchers;


