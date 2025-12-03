/**
 * Seller Dashboard
 * Trang tổng quan cho seller
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, Select } from 'antd';
import {
  ShoppingOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  StockOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import sellerService from '../../../api/sellerService';
import type { SellerDashboardStats } from '../../../api/sellerService';
import { useToast } from '../../../contexts/ToastContext';
import './Dashboard.scss';

const Dashboard: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<SellerDashboardStats | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<'day' | 'month'>('day');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const stats = await sellerService.getDashboardStats();
        console.log('Dashboard stats received:', stats);
        setDashboardStats(stats);
      } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        toast.error(error.response?.data?.message || 'Không thể tải thống kê dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
        // Nếu user là object (đã populate), dùng thông tin từ user
        if (record.user && typeof record.user === 'object') {
          return record.user.name || record.user.email || 'N/A';
        }
        // Nếu user chỉ là string ID, dùng thông tin từ shippingAddress
        if (record.shippingAddress) {
          return record.shippingAddress.fullName || record.shippingAddress.email || record.shippingAddress.phone || 'N/A';
        }
        // Fallback: hiển thị ID nếu không có thông tin khác
        if (record.user && typeof record.user === 'string') {
          return record.user.substring(0, 8) + '...';
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
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  };

  const recentOrders = Array.isArray(dashboardStats?.recentOrders) 
    ? dashboardStats.recentOrders 
    : [];

  // Chuẩn bị dữ liệu cho biểu đồ doanh thu (nếu có)
  const revenueData: any[] = [];
  const ordersByStatusData: any[] = [];
  const topSellingProducts: any[] = [];
  const highStockProducts: any[] = [];

  // Cấu hình biểu đồ doanh thu (Column chart)
  const revenueConfig = {
    data: revenueData,
    xField: 'date',
    yField: 'revenue',
    color: '#52c41a',
    label: {
      position: 'top' as const,
      style: {
        fill: '#666',
      },
      formatter: (datum: any) => {
        return `${Number(datum.revenue).toLocaleString('vi-VN')} ₫`;
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: 'Doanh thu',
          value: `${Number(datum.revenue).toLocaleString('vi-VN')} ₫`,
        };
      },
    },
  };

  // Cấu hình biểu đồ đơn hàng theo trạng thái
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

  const ordersStatusConfig = {
    data: ordersByStatusData,
    xField: 'status',
    yField: 'count',
    colorField: 'status',
    color: ordersByStatusData.map((item: any) => item.color || '#888'),
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

  return (
    <div className="seller-dashboard">
      <h1>Tổng quan</h1>
      
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Tổng sản phẩm"
                value={stats.totalProducts}
                prefix={<ShoppingOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Tổng đơn hàng"
                value={stats.totalOrders}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
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
        </Row>

        {/* Biểu đồ doanh thu */}
        {revenueData.length > 0 && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={16}>
              <Card
                title="Biểu đồ doanh thu"
                extra={
                  <Select
                    value={revenuePeriod}
                    onChange={setRevenuePeriod}
                    style={{ width: 120 }}
                  >
                    <Select.Option value="day">Theo ngày</Select.Option>
                    <Select.Option value="month">Theo tháng</Select.Option>
                  </Select>
                }
              >
                {revenueData.length > 0 ? (
                  <Column {...revenueConfig} height={300} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    Chưa có dữ liệu doanh thu
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}

        {/* Biểu đồ đơn hàng theo trạng thái */}
        {ordersByStatusData.length > 0 && (
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
        )}

        {/* Top sản phẩm */}
        {(topSellingProducts.length > 0 || highStockProducts.length > 0) && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {topSellingProducts.length > 0 && (
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
            )}
            {highStockProducts.length > 0 && (
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
            )}
          </Row>
        )}

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

