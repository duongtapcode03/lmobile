/**
 * OrderHistoryPage Component
 * Trang hiển thị lịch sử đơn hàng của user
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Button, Space, Typography, Empty, Spin, Card, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import orderService, { type Order } from '../../../api/orderService';
import { PageWrapper, useToast } from '../../../components';
import './OrderHistory.scss';

const { Title, Text } = Typography;

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';

const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Lưu tất cả đơn hàng
  const [activeTab, setActiveTab] = useState<OrderStatus>('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    loadAllOrders();
  }, []);

  // Load tất cả đơn hàng một lần (không phân trang)
  const loadAllOrders = async () => {
    try {
      setLoading(true);
      // Load với limit lớn để lấy tất cả đơn hàng
      const response = await orderService.getMyOrders({
        page: 1,
        limit: 1000 // Load tất cả đơn hàng
      });
      setAllOrders(response.data || []);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.totalItems || (response.data || []).length,
          current: 1 // Reset về trang 1 khi filter
        }));
      } else {
        setPagination(prev => ({
          ...prev,
          total: (response.data || []).length,
          current: 1
        }));
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Filter đơn hàng theo status (xử lý ở frontend)
  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') {
      return allOrders;
    }
    return allOrders.filter(order => order.status === activeTab);
  }, [allOrders, activeTab]);

  // Phân trang cho filtered orders
  const paginatedOrders = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, pagination.current, pagination.pageSize]);

  // Cập nhật total khi filter thay đổi
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: filteredOrders.length,
      current: 1 // Reset về trang 1 khi filter thay đổi
    }));
  }, [activeTab, filteredOrders.length]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      confirmed: 'blue',
      processing: 'cyan',
      shipping: 'purple',
      delivered: 'green',
      cancelled: 'red',
      returned: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipping: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      cancelled: 'Đã hủy',
      returned: 'Đã trả hàng'
    };
    return texts[status] || status;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => formatDate(text)
    },
    {
      title: 'Số lượng',
      dataIndex: 'items',
      key: 'items',
      render: (items: any[]) => `${items.length} sản phẩm`
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => <Text strong>{formatPrice(amount)}</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: Order) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${record._id}`)}
          >
            Xem chi tiết
          </Button>
          {record.canCancel && (
            <Button
              type="link"
              danger
              onClick={() => handleCancelOrder(record._id)}
            >
              Hủy đơn
            </Button>
          )}
        </Space>
      )
    }
  ];

  const handleCancelOrder = async (orderId: string) => {
    try {
      await orderService.cancelOrder(orderId);
      toast.success('Đã hủy đơn hàng');
      loadAllOrders(); // Reload tất cả đơn hàng
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng');
    }
  };

  const getStatusCount = (status: OrderStatus) => {
    if (status === 'all') {
      return allOrders.length;
    }
    return allOrders.filter(order => order.status === status).length;
  };

  // Tạo tabs items
  const tabItems: TabsProps['items'] = [
    {
      key: 'all',
      label: (
        <span>
          Tất cả <span style={{ marginLeft: 4, color: '#999' }}>({getStatusCount('all')})</span>
        </span>
      )
    },
    {
      key: 'pending',
      label: (
        <span>
          Chờ xử lý <span style={{ marginLeft: 4, color: '#999' }}>({getStatusCount('pending')})</span>
        </span>
      )
    },
    {
      key: 'confirmed',
      label: (
        <span>
          Đã xác nhận <span style={{ marginLeft: 4, color: '#999' }}>({getStatusCount('confirmed')})</span>
        </span>
      )
    },
    {
      key: 'processing',
      label: (
        <span>
          Đang xử lý <span style={{ marginLeft: 4, color: '#999' }}>({getStatusCount('processing')})</span>
        </span>
      )
    },
    {
      key: 'shipping',
      label: (
        <span>
          Đang giao hàng <span style={{ marginLeft: 4, color: '#999' }}>({getStatusCount('shipping')})</span>
        </span>
      )
    },
    {
      key: 'delivered',
      label: (
        <span>
          Đã giao hàng <span style={{ marginLeft: 4, color: '#999' }}>({getStatusCount('delivered')})</span>
        </span>
      )
    },
    {
      key: 'cancelled',
      label: (
        <span>
          Đã hủy <span style={{ marginLeft: 4, color: '#999' }}>({getStatusCount('cancelled')})</span>
        </span>
      )
    },
    {
      key: 'returned',
      label: (
        <span>
          Đã trả hàng <span style={{ marginLeft: 4, color: '#999' }}>({getStatusCount('returned')})</span>
        </span>
      )
    }
  ];

  if (loading && allOrders.length === 0) {
    return (
      <PageWrapper loading={true}>
        <div className="order-history-page">
          <div className="container">
            <Spin size="large" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="order-history-page">
        <div className="container">
          <Card
            title={
              <Space>
                <Title level={2} style={{ margin: 0 }}>
                  Lịch sử đơn hàng
                </Title>
              </Space>
            }
            extra={
              <Button icon={<ReloadOutlined />} onClick={loadAllOrders} loading={loading}>
                Làm mới
              </Button>
            }
          >
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as OrderStatus)}
              type="card"
              items={tabItems}
            />

            {paginatedOrders.length === 0 ? (
              <Empty description={`Bạn chưa có đơn hàng nào${activeTab !== 'all' ? ` với trạng thái "${getStatusText(activeTab)}"` : ''}`} />
            ) : (
              <Table
                columns={columns}
                dataSource={paginatedOrders}
                rowKey="_id"
                loading={loading}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  onChange: (page) => setPagination({ ...pagination, current: page }),
                  showSizeChanger: false,
                  showTotal: (total) => `Tổng ${total} đơn hàng`
                }}
              />
            )}
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

export default OrderHistoryPage;



