/**
 * OrderHistoryPage Component
 * Trang hiển thị lịch sử đơn hàng của user
 */

import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Typography, Empty, Spin, message, Card, Descriptions } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import orderService, { type Order } from '../../../api/orderService';
import { PageWrapper } from '../../../components';
import './OrderHistory.scss';

const { Title, Text } = Typography;

const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    loadOrders();
    // Only depend on pagination.current to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getMyOrders({
        page: pagination.current,
        limit: pagination.pageSize
      });
      setOrders(response.data || []);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination.totalItems
        }));
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      message.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

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
      message.success('Đã hủy đơn hàng');
      loadOrders();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      message.error(error.response?.data?.message || 'Không thể hủy đơn hàng');
    }
  };

  if (loading && orders.length === 0) {
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
              <Button icon={<ReloadOutlined />} onClick={loadOrders} loading={loading}>
                Làm mới
              </Button>
            }
          >
            {orders.length === 0 ? (
              <Empty description="Bạn chưa có đơn hàng nào" />
            ) : (
              <Table
                columns={columns}
                dataSource={orders}
                rowKey="_id"
                loading={loading}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  onChange: (page) => setPagination({ ...pagination, current: page })
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



