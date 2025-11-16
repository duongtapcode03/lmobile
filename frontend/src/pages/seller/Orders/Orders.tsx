/**
 * Seller Orders Management
 * Quản lý đơn hàng của seller
 */

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Tag, 
  Button, 
  Space, 
  Select, 
  message, 
  Input, 
  Modal, 
  Descriptions, 
  Timeline,
  Card,
  Image,
  Typography,
} from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined,
} from '@ant-design/icons';
import sellerService from '../../../api/sellerService';
import type { Order } from '../../../api/orderService';
import './Orders.scss';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, paymentStatusFilter, pagination.current, pagination.pageSize]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (paymentStatusFilter !== 'all') {
        params.paymentStatus = paymentStatusFilter;
      }

      if (searchText.trim()) {
        params.search = searchText.trim();
      }

      const response = await sellerService.getMyOrders(params);
      setOrders(response.data || []);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination!.totalItems
        }));
      }
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await sellerService.updateMyOrderStatus(orderId, newStatus);
      message.success('Cập nhật trạng thái thành công');
      loadOrders();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadOrders();
  };

  const handleViewDetail = async (orderId: string) => {
    try {
      // Sử dụng orderService để lấy chi tiết đơn hàng
      const orderService = (await import('../../../api/orderService')).default;
      const order = await orderService.getOrderById(orderId);
      setSelectedOrder(order);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể tải chi tiết đơn hàng');
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('vi-VN');
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'orange',
      confirmed: 'blue',
      processing: 'cyan',
      shipping: 'purple',
      delivered: 'green',
      cancelled: 'red',
      returned: 'default',
    };
    return colorMap[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labelMap: Record<string, string> = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipping: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      cancelled: 'Đã hủy',
      returned: 'Đã trả hàng',
    };
    return labelMap[status] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'orange',
      paid: 'green',
      failed: 'red',
      refunded: 'default',
    };
    return colorMap[status] || 'default';
  };

  const getPaymentStatusLabel = (status: string) => {
    const labelMap: Record<string, string> = {
      pending: 'Chờ thanh toán',
      paid: 'Đã thanh toán',
      failed: 'Thanh toán thất bại',
      refunded: 'Đã hoàn tiền',
    };
    return labelMap[status] || status;
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_: any, record: Order) => {
        const user = typeof record.user === 'object' ? record.user : null;
        return (
          <div>
            <div>{user?.name || 'N/A'}</div>
            {user?.email && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {user.email}
              </Text>
            )}
          </div>
        );
      }
    },
    {
      title: 'Số điện thoại',
      key: 'phone',
      width: 130,
      render: (_: any, record: Order) => {
        const user = typeof record.user === 'object' ? record.user : null;
        return user?.phone || record.shippingAddress?.phone || 'N/A';
      }
    },
    {
      title: 'Số lượng',
      dataIndex: 'totalItems',
      key: 'totalItems',
      width: 100,
      align: 'center' as const
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => (
        <Text strong style={{ color: '#ff4d4f' }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Doanh thu',
      key: 'revenue',
      width: 150,
      align: 'right' as const,
      render: (_: any, record: Order) => {
        let hasMissingImportPrice = false;
        const revenue = record.items.reduce((total, item) => {
          const itemPrice = item.price || 0;
          const itemImportPrice = item.importPrice || 0;
          const itemQuantity = item.quantity || 0;
          
          if (itemImportPrice === 0 && itemPrice > 0) {
            hasMissingImportPrice = true;
          }
          
          const profit = (itemPrice - itemImportPrice) * itemQuantity;
          return total + profit;
        }, 0);
        
        const isRevenue = record.status === 'delivered' || record.paymentInfo.status === 'paid';
        
        return (
          <div>
            <Text strong style={{ color: isRevenue ? '#52c41a' : '#faad14' }}>
              {formatPrice(revenue)}
            </Text>
            {hasMissingImportPrice && (
              <div>
                <Text type="warning" style={{ fontSize: '11px' }}>
                  (Thiếu giá nhập)
                </Text>
              </div>
            )}
            {!isRevenue && !hasMissingImportPrice && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  (Chưa tính)
                </Text>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Thanh toán',
      key: 'paymentStatus',
      width: 130,
      render: (_: any, record: Order) => (
        <Tag color={getPaymentStatusColor(record.paymentInfo.status)}>
          {getPaymentStatusLabel(record.paymentInfo.status)}
        </Tag>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: string, record: Order) => {
        return (
          <Select
            value={status}
            style={{ width: 150 }}
            onChange={(value) => handleStatusChange(record._id, value)}
            disabled={status === 'cancelled' || status === 'delivered'}
          >
            <Option value="pending">Chờ xử lý</Option>
            <Option value="confirmed">Đã xác nhận</Option>
            <Option value="processing">Đang xử lý</Option>
            <Option value="shipping">Đang giao hàng</Option>
            <Option value="delivered">Đã giao hàng</Option>
            <Option value="cancelled">Đã hủy</Option>
          </Select>
        );
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => formatDate(date)
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: Order) => (
        <Button 
          type="text" 
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record._id)}
          size="small"
          style={{ padding: '4px 8px' }}
        />
      )
    },
  ];

  return (
    <div className="seller-orders">
      <div className="orders-header">
        <Title level={2}>Quản lý đơn hàng</Title>
        <Space size="middle" style={{ marginBottom: 16 }}>
          <Search
            placeholder="Tìm kiếm theo mã đơn, tên, SĐT..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => {
              if (!e.target.value) {
                setSearchText('');
                setPagination(prev => ({ ...prev, current: 1 }));
                loadOrders();
              }
            }}
          />
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ width: 150 }}
            placeholder="Lọc theo trạng thái"
          >
            <Option value="all">Tất cả trạng thái</Option>
            <Option value="pending">Chờ xử lý</Option>
            <Option value="confirmed">Đã xác nhận</Option>
            <Option value="processing">Đang xử lý</Option>
            <Option value="shipping">Đang giao hàng</Option>
            <Option value="delivered">Đã giao hàng</Option>
            <Option value="cancelled">Đã hủy</Option>
          </Select>
          <Select
            value={paymentStatusFilter}
            onChange={(value) => {
              setPaymentStatusFilter(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ width: 150 }}
            placeholder="Lọc theo thanh toán"
          >
            <Option value="all">Tất cả thanh toán</Option>
            <Option value="pending">Chờ thanh toán</Option>
            <Option value="paid">Đã thanh toán</Option>
            <Option value="failed">Thanh toán thất bại</Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total) => `Tổng ${total} đơn hàng`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, pageSize) => {
            setPagination(prev => ({
              ...prev,
              current: page,
              pageSize: pageSize || 20
            }));
          }
        }}
      />

      {/* Modal chi tiết đơn hàng */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>Chi tiết đơn hàng</span>
            {selectedOrder && (
              <Tag color={getStatusColor(selectedOrder.status)}>
                {getStatusLabel(selectedOrder.status)}
              </Tag>
            )}
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedOrder(null);
        }}
        footer={null}
        width={900}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã đơn hàng" span={1}>
                <Text strong>{selectedOrder.orderNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo" span={1}>
                {formatDate(selectedOrder.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={1}>
                <Tag color={getStatusColor(selectedOrder.status)}>
                  {getStatusLabel(selectedOrder.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Thanh toán" span={1}>
                <Tag color={getPaymentStatusColor(selectedOrder.paymentInfo.status)}>
                  {getPaymentStatusLabel(selectedOrder.paymentInfo.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức thanh toán" span={1}>
                {selectedOrder.paymentInfo.method === 'cod' ? 'Thanh toán khi nhận hàng' :
                 selectedOrder.paymentInfo.method === 'momo' ? 'MoMo' :
                 selectedOrder.paymentInfo.method === 'bank_transfer' ? 'Chuyển khoản' :
                 selectedOrder.paymentInfo.method}
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức vận chuyển" span={1}>
                {selectedOrder.shippingMethod === 'standard' ? 'Tiêu chuẩn' :
                 selectedOrder.shippingMethod === 'express' ? 'Nhanh' :
                 selectedOrder.shippingMethod === 'same_day' ? 'Trong ngày' :
                 selectedOrder.shippingMethod}
              </Descriptions.Item>
              {selectedOrder.trackingNumber && (
                <Descriptions.Item label="Mã vận đơn" span={2}>
                  <Text strong>{selectedOrder.trackingNumber}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Card title="Thông tin khách hàng" size="small" style={{ marginTop: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Họ tên">
                  {selectedOrder.shippingAddress.fullName}
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {selectedOrder.shippingAddress.phone}
                </Descriptions.Item>
                {selectedOrder.shippingAddress.email && (
                  <Descriptions.Item label="Email" span={2}>
                    {selectedOrder.shippingAddress.email}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Địa chỉ" span={2}>
                  {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.ward}, {selectedOrder.shippingAddress.district}, {selectedOrder.shippingAddress.province}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Sản phẩm" size="small" style={{ marginTop: 16 }}>
              <Table
                dataSource={selectedOrder.items}
                rowKey={(item, index) => `${item.productName}-${index}`}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Sản phẩm',
                    key: 'product',
                    render: (_: any, item: any) => (
                      <Space>
                        <Image
                          src={item.productImage}
                          alt={item.productName}
                          width={60}
                          height={60}
                          style={{ objectFit: 'cover' }}
                          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iMzAiIHk9IjM1IiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4="
                        />
                        <div>
                          <div>{item.productName}</div>
                          {item.variant && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {item.variant.storage || item.variant.color || ''}
                            </Text>
                          )}
                        </div>
                      </Space>
                    )
                  },
                  {
                    title: 'Số lượng',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    align: 'center' as const,
                    width: 100
                  },
                  {
                    title: 'Đơn giá',
                    dataIndex: 'price',
                    key: 'price',
                    align: 'right' as const,
                    width: 120,
                    render: (price: number) => formatPrice(price)
                  },
                  {
                    title: 'Giá nhập',
                    key: 'importPrice',
                    align: 'right' as const,
                    width: 120,
                    render: (_: any, item: any) => {
                      const importPrice = item.importPrice || 0;
                      return (
                        <Text type={importPrice === 0 ? "warning" : "secondary"}>
                          {importPrice === 0 ? 'N/A' : formatPrice(importPrice)}
                        </Text>
                      );
                    }
                  },
                  {
                    title: 'Thành tiền',
                    dataIndex: 'totalPrice',
                    key: 'totalPrice',
                    align: 'right' as const,
                    width: 120,
                    render: (total: number) => (
                      <Text strong>{formatPrice(total)}</Text>
                    )
                  },
                  {
                    title: 'Doanh thu',
                    key: 'profit',
                    align: 'right' as const,
                    width: 120,
                    render: (_: any, item: any) => {
                      const itemPrice = item.price || 0;
                      const itemImportPrice = item.importPrice || 0;
                      const itemQuantity = item.quantity || 0;
                      const profit = (itemPrice - itemImportPrice) * itemQuantity;
                      return (
                        <Text strong style={{ color: profit > 0 ? '#52c41a' : '#ff4d4f' }}>
                          {formatPrice(profit)}
                        </Text>
                      );
                    }
                  }
                ]}
              />
            </Card>

            <Card title="Tổng thanh toán" size="small" style={{ marginTop: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Tạm tính (từ sản phẩm)">
                  {formatPrice(selectedOrder.subtotal)}
                </Descriptions.Item>
                <Descriptions.Item label="Phí vận chuyển">
                  {formatPrice(selectedOrder.shippingFee)}
                </Descriptions.Item>
                {selectedOrder.discountAmount > 0 && (
                  <Descriptions.Item label="Giảm giá">
                    <Text type="success">-{formatPrice(selectedOrder.discountAmount)}</Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Tổng cộng">
                  <Text strong style={{ fontSize: '18px', color: '#ff4d4f' }}>
                    {formatPrice(selectedOrder.totalAmount)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Tổng doanh thu">
                  <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                    {(() => {
                      const totalRevenue = selectedOrder.items.reduce((total, item) => {
                        const itemPrice = item.price || 0;
                        const itemImportPrice = item.importPrice || 0;
                        const itemQuantity = item.quantity || 0;
                        const profit = (itemPrice - itemImportPrice) * itemQuantity;
                        return total + profit;
                      }, 0);
                      return formatPrice(totalRevenue);
                    })()}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
              <Card title="Lịch sử trạng thái" size="small" style={{ marginTop: 16 }}>
                <Timeline>
                  {selectedOrder.statusHistory.map((history, index) => (
                    <Timeline.Item
                      key={index}
                      color={
                        history.status === 'delivered' ? 'green' :
                        history.status === 'cancelled' ? 'red' :
                        history.status === 'shipping' ? 'blue' :
                        'orange'
                      }
                    >
                      <div>
                        <Text strong>{getStatusLabel(history.status)}</Text>
                        {history.note && (
                          <div><Text type="secondary">{history.note}</Text></div>
                        )}
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatDate(history.updatedAt)}
                          </Text>
                        </div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;

