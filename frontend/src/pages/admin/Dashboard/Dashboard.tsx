/**
 * Admin Dashboard
 * Trang tổng quan với thống kê
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, message, Select, Space, DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  ShoppingOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  AppstoreOutlined,
  TagsOutlined,
  StockOutlined,
} from '@ant-design/icons';
import { Column, Line } from '@ant-design/charts';
import adminService from '../../../api/adminService';
import type { DashboardStats } from '../../../api/adminService';
import './Dashboard.scss';

const { RangePicker } = DatePicker;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<'day' | 'month'>('day');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'), // 30 ngày trước
    dayjs(), // Hôm nay
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const params: any = {};
        
        // Thêm date range nếu có
        if (dateRange[0] && dateRange[1]) {
          params.startDate = dateRange[0].format('YYYY-MM-DD');
          params.endDate = dateRange[1].format('YYYY-MM-DD');
        }
        
        const stats = await adminService.getDashboardStats(params);
        console.log('Dashboard stats received:', stats);
        setDashboardStats(stats);
      } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        message.error(error.response?.data?.message || 'Không thể tải thống kê dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [dateRange]);

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: any) => {
        if (record.user) {
          if (typeof record.user === 'object') {
            return record.user.name || record.user.email || 'N/A';
          }
          return String(record.user);
        }
        return 'N/A';
      },
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => 
        amount 
          ? new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(Number(amount))
          : '0 ₫',
    },
    {
      title: 'Doanh thu',
      key: 'revenue',
      align: 'right' as const,
      render: (_: any, record: any) => {
        // Tính doanh thu = (giá bán - giá nhập) * số lượng cho mỗi item
        if (!record.items || !Array.isArray(record.items)) {
          return <span style={{ color: '#999' }}>0 ₫</span>;
        }

        let hasMissingImportPrice = false;
        const revenue = record.items.reduce((total: number, item: any) => {
          const itemPrice = item.price || 0;
          const itemImportPrice = item.importPrice || 0;
          const itemQuantity = item.quantity || 0;
          
          // Kiểm tra nếu importPrice = 0 (có thể là đơn hàng cũ chưa có importPrice)
          if (itemImportPrice === 0 && itemPrice > 0) {
            hasMissingImportPrice = true;
          }
          
          const profit = (itemPrice - itemImportPrice) * itemQuantity;
          return total + profit;
        }, 0);

        // Chỉ tính doanh thu cho đơn hàng đã giao hoặc đã thanh toán
        const isRevenue = record.status === 'delivered' || record.paymentInfo?.status === 'paid';
        
        return (
          <div>
            <span style={{ 
              fontWeight: 'bold', 
              color: isRevenue ? '#52c41a' : '#faad14' 
            }}>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(revenue)}
            </span>
            {hasMissingImportPrice && (
              <div style={{ fontSize: '11px', color: '#faad14' }}>
                (Thiếu giá nhập)
              </div>
            )}
            {!isRevenue && !hasMissingImportPrice && (
              <div style={{ fontSize: '11px', color: '#999' }}>
                (Chưa tính)
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'orange',
          processing: 'blue',
          completed: 'green',
          delivered: 'green',
          cancelled: 'red',
        };
        const statusText: Record<string, string> = {
          pending: 'Chờ xử lý',
          processing: 'Đang xử lý',
          completed: 'Hoàn thành',
          delivered: 'Đã giao',
          cancelled: 'Đã hủy',
        };
        return <Tag color={colorMap[status] || 'default'}>{statusText[status] || status}</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string | Date) => {
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return 'N/A';
        }
      },
    },
  ];

  const stats = dashboardStats?.overview || {
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalBrands: 0,
  };

  const recentOrders = Array.isArray(dashboardStats?.recentOrders) 
    ? dashboardStats.recentOrders 
    : [];

  // Chuẩn bị dữ liệu cho biểu đồ doanh thu
  const revenueData = revenuePeriod === 'day' 
    ? (dashboardStats?.revenueByDay || []).reverse().map(item => ({
        date: item.label || item.date || '',
        revenue: Number(item.total) || 0,
      }))
    : (dashboardStats?.revenueByMonth || []).reverse().map(item => ({
        date: `${item._id?.month || ''}/${item._id?.year || ''}`,
        revenue: Number(item.total) || 0,
      }));

  // Chuẩn bị dữ liệu cho biểu đồ đơn hàng theo trạng thái
  const statusTextMap: Record<string, string> = {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    cancelled: 'Đã hủy',
    returned: 'Đã trả hàng',
  };

  const statusColorMap: Record<string, string> = {
    pending: '#faad14',
    confirmed: '#1890ff',
    processing: '#722ed1',
    shipping: '#13c2c2',
    delivered: '#52c41a',
    cancelled: '#ff4d4f',
    returned: '#ff7875',
  };

  const ordersByStatusData = (dashboardStats?.ordersByStatusDetail || []).map(item => ({
    status: statusTextMap[item.status] || item.status,
    count: item.count,
    color: statusColorMap[item.status] || '#888',
  }));

  // Dữ liệu top 5 sản phẩm bán chạy
  const topSellingProducts = dashboardStats?.topSellingProducts || [];

  // Dữ liệu top 5 sản phẩm tồn kho cao
  const highStockProducts = dashboardStats?.highStockProducts || [];

  // Cấu hình biểu đồ doanh thu (Line chart)
  const revenueConfig = {
    data: revenueData,
    xField: 'date',
    yField: 'revenue',
    smooth: true,
    point: {
      size: 5,
      shape: 'circle',
    },
    color: '#52c41a',
    label: {
      position: 'top' as const,
      style: {
        fill: '#666',
        fontSize: 12,
      },
      formatter: (datum: any) => {
        const revenue = Number(datum.revenue) || 0;
        if (revenue > 0) {
          return `${(revenue / 1000000).toFixed(1)}M`;
        }
        return '';
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        const revenue = Number(datum.revenue) || 0;
        return {
          name: 'Doanh thu',
          value: `${revenue.toLocaleString('vi-VN')} ₫`,
        };
      },
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1000,
      },
    },
  };

  // Cấu hình biểu đồ đơn hàng theo trạng thái
  const ordersStatusConfig = {
    data: ordersByStatusData,
    xField: 'status',
    yField: 'count',
    colorField: 'status',
    color: ordersByStatusData.map(item => item.color),
    label: {
      position: 'top' as const,
      style: {
        fill: '#666',
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.status,
          value: `${datum.count} đơn`,
        };
      },
    },
  };

  // Columns cho bảng top 5 sản phẩm bán chạy
  const topSellingColumns = [
    {
      title: 'Sản phẩm',
      key: 'name',
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.thumbnail && (
            <img 
              src={record.thumbnail} 
              alt={record.name}
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <span>{record.name}</span>
        </div>
      ),
    },
    {
      title: 'Đã bán',
      dataIndex: 'soldFromOrders',
      key: 'sold',
      align: 'center' as const,
      render: (sold: number) => <span style={{ fontWeight: 'bold' }}>{sold || 0}</span>,
    },
    {
      title: 'Doanh thu',
      key: 'revenue',
      align: 'right' as const,
      render: (_: any, record: any) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(record.revenue || 0)}
        </span>
      ),
    },
  ];

  // Columns cho bảng top 5 sản phẩm tồn kho cao
  const highStockColumns = [
    {
      title: 'Sản phẩm',
      key: 'name',
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.thumbnail && (
            <img 
              src={record.thumbnail} 
              alt={record.name}
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <span>{record.name}</span>
        </div>
      ),
    },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      key: 'stock',
      align: 'center' as const,
      render: (stock: number) => <span style={{ fontWeight: 'bold', color: '#faad14' }}>{stock || 0}</span>,
    },
    {
      title: 'Đã bán',
      dataIndex: 'sold',
      key: 'sold',
      align: 'center' as const,
      render: (sold: number) => <span>{sold || 0}</span>,
    },
  ];

  const revenueComparison = dashboardStats?.revenueComparison || {
    currentMonth: 0,
    lastMonth: 0,
    change: 0,
    changePercent: '0',
  };

  const isRevenueIncrease = revenueComparison.change >= 0;

  return (
    <div className="admin-dashboard">
      <h1>Dashboard</h1>
      
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng đơn hàng"
                value={stats.totalOrders}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng doanh thu"
                value={Number(stats.totalRevenue || 0)}
                prefix={<DollarOutlined />}
                suffix="₫"
                valueStyle={{ color: '#52c41a' }}
                formatter={(value) => {
                  const numValue = Number(value || 0);
                  return numValue.toLocaleString('vi-VN');
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng người dùng"
                value={stats.totalUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng sản phẩm"
                value={stats.totalProducts}
                prefix={<ShoppingOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng danh mục"
                value={stats.totalCategories}
                prefix={<AppstoreOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng thương hiệu"
                value={stats.totalBrands}
                prefix={<TagsOutlined />}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Biểu đồ doanh thu */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={16}>
            <Card
              title="Biểu đồ doanh thu"
              extra={
                <Space>
                  <RangePicker
                    value={dateRange}
                    onChange={(dates) => {
                      if (dates) {
                        setDateRange([dates[0], dates[1]]);
                      } else {
                        setDateRange([null, null]);
                      }
                    }}
                    format="DD/MM/YYYY"
                    style={{ width: 250 }}
                  />
                  <Select
                    value={revenuePeriod}
                    onChange={setRevenuePeriod}
                    style={{ width: 120 }}
                  >
                    <Select.Option value="day">Theo ngày</Select.Option>
                    <Select.Option value="month">Theo tháng</Select.Option>
                  </Select>
                </Space>
              }
            >
              {revenueData.length > 0 ? (
                <Line {...revenueConfig} height={300} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Chưa có dữ liệu doanh thu
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="So sánh doanh thu">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <div style={{ color: '#999', fontSize: '14px' }}>Tháng này</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                    {Number(revenueComparison.currentMonth).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '14px' }}>Tháng trước</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {Number(revenueComparison.lastMonth).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '14px' }}>Thay đổi</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    <span style={{ color: isRevenueIncrease ? '#52c41a' : '#ff4d4f' }}>
                      {isRevenueIncrease ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      {' '}
                      {Math.abs(Number(revenueComparison.changePercent))}%
                    </span>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                      {isRevenueIncrease ? 'Tăng' : 'Giảm'}{' '}
                      {Math.abs(revenueComparison.change).toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Biểu đồ đơn hàng theo trạng thái */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card title="Biểu đồ đơn hàng theo trạng thái">
              {ordersByStatusData.length > 0 ? (
                <Column {...ordersStatusConfig} height={300} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Chưa có dữ liệu đơn hàng
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Top sản phẩm */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <span>
                  <ShoppingOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  Top 5 sản phẩm bán chạy
                </span>
              }
            >
              {topSellingProducts.length > 0 ? (
                <Table
                  columns={topSellingColumns}
                  dataSource={topSellingProducts.map((product: any, index: number) => ({
                    ...product,
                    key: product._id || index,
                  }))}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'Chưa có dữ liệu' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Chưa có dữ liệu sản phẩm bán chạy
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={
                <span>
                  <StockOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  Top 5 sản phẩm tồn kho cao
                </span>
              }
            >
              {highStockProducts.length > 0 ? (
                <Table
                  columns={highStockColumns}
                  dataSource={highStockProducts.map((product: any, index: number) => ({
                    ...product,
                    key: product._id || index,
                  }))}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'Chưa có dữ liệu' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Chưa có dữ liệu sản phẩm tồn kho
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Đơn hàng gần đây">
          <Table
            columns={columns}
            dataSource={recentOrders.map((order: any, index: number) => ({
              ...order,
              key: order._id || order.orderNumber || index,
            }))}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Chưa có đơn hàng nào' }}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Dashboard;
