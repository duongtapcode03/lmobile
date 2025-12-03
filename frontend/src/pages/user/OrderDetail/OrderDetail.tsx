/**
 * OrderDetailPage Component
 * Trang hiển thị chi tiết đơn hàng
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  Divider,
  Timeline,
  Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
  CreditCardOutlined,
  TruckOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import orderService, { type Order } from '../../../api/orderService';
import feedbackService, { type Feedback } from '../../../api/feedbackService';
import returnRequestService, { type ReturnRequest } from '../../../api/returnRequestService';
import ReviewModal from '../../../components/Common/ReviewModal/ReviewModal';
import ReturnRequestModal from '../../../components/Common/ReturnRequestModal/ReturnRequestModal';
import { PageWrapper, useToast } from '../../../components';
import './OrderDetail.scss';

const { Title, Text } = Typography;

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    productId: string | number;
    productName: string;
    productImage?: string;
    orderId: string;
    orderNumber: string;
  } | null>(null);
  const [existingFeedbacks, setExistingFeedbacks] = useState<Map<string, Feedback>>(new Map());
  const [returnRequestModalVisible, setReturnRequestModalVisible] = useState(false);
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [loadingReturnRequest, setLoadingReturnRequest] = useState(false);
  const [canReturnOrder, setCanReturnOrder] = useState(false);
  const [returnDeadlineMessage, setReturnDeadlineMessage] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadOrderDetail(id);
    }
  }, [id]);

  useEffect(() => {
    if (order && order.status === 'delivered') {
      loadFeedbacksForOrder();
      loadReturnRequest();
      checkReturnEligibility();
    }
  }, [order]);

  const checkReturnEligibility = () => {
    if (!order || order.status !== 'delivered' || !order.deliveredAt) {
      setCanReturnOrder(false);
      setReturnDeadlineMessage('');
      return;
    }

    const deliveredDate = new Date(order.deliveredAt);
    const now = new Date();
    const daysSinceDelivery = Math.floor((now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = 7 - daysSinceDelivery;

    if (daysSinceDelivery > 7) {
      setCanReturnOrder(false);
      setReturnDeadlineMessage(`Đã quá thời hạn hoàn hàng (7 ngày kể từ khi nhận hàng). Đơn hàng đã được giao ${daysSinceDelivery} ngày trước.`);
    } else if (daysRemaining > 0) {
      setCanReturnOrder(true);
      setReturnDeadlineMessage(`Bạn còn ${daysRemaining} ngày để yêu cầu hoàn hàng.`);
    } else {
      // Ngày cuối cùng
      setCanReturnOrder(true);
      setReturnDeadlineMessage('Hôm nay là ngày cuối cùng để yêu cầu hoàn hàng.');
    }
  };

  const loadReturnRequest = async () => {
    if (!order) return;
    
    try {
      // Kiểm tra xem đã có return request chưa
      const requests = await returnRequestService.getMyReturnRequests({
        page: 1,
        limit: 10
      });
      
      const existingRequest = requests.data.find(
        req => typeof req.order === 'object' 
          ? req.order._id === order._id 
          : req.order === order._id
      );
      
      if (existingRequest) {
        setReturnRequest(existingRequest);
        // Nếu đã có request đang xử lý, không thể tạo mới
        if (['pending', 'approved', 'processing'].includes(existingRequest.status)) {
          setCanReturnOrder(false);
        }
      }
    } catch (error) {
      console.error('Error loading return request:', error);
    }
  };

  const loadOrderDetail = async (orderId: string) => {
    try {
      setLoading(true);
      const orderData = await orderService.getOrderById(orderId);
      setOrder(orderData);
    } catch (error: any) {
      console.error('Error loading order detail:', error);
      toast.error(error.response?.data?.message || 'Không thể tải chi tiết đơn hàng');
      if (error.response?.status === 404) {
        navigate('/orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFeedbacksForOrder = async () => {
    if (!order || !order.items) return;
    
    try {
      const feedbackMap = new Map<string, Feedback>();
      
      // Lấy feedbacks của user hiện tại
      const myFeedbacks = await feedbackService.getMyFeedbacks({
        limit: 100, // Lấy tất cả feedbacks
      });

      // Map feedbacks theo productId
      myFeedbacks.data.forEach((feedback) => {
        const productId = String(feedback.product._id || feedback.product);
        feedbackMap.set(productId, feedback);
      });

      setExistingFeedbacks(feedbackMap);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    }
  };

  const handleReviewClick = (item: any) => {
    setSelectedProduct({
      productId: item.product?._id || item.product,
      productName: item.productName,
      productImage: item.productImage,
      orderId: order!._id,
      orderNumber: order!.orderNumber,
    });
    
    // Kiểm tra xem đã có feedback chưa
    const productId = String(item.product?._id || item.product);
    const existingFeedback = existingFeedbacks.get(productId);
    
    setReviewModalVisible(true);
  };

  const handleReviewSuccess = () => {
    loadFeedbacksForOrder();
    loadOrderDetail(order!._id);
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    
    try {
      await orderService.cancelOrder(order._id);
      toast.success('Đã hủy đơn hàng');
      loadOrderDetail(order._id);
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng');
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

  const getPaymentMethodText = (method: string) => {
    const texts: Record<string, string> = {
      cod: 'Thanh toán khi nhận hàng (COD)',
      bank_transfer: 'Chuyển khoản ngân hàng',
      credit_card: 'Thẻ tín dụng/Ghi nợ',
      momo: 'Ví điện tử MoMo',
      zalopay: 'Ví điện tử ZaloPay'
    };
    return texts[method] || method;
  };

  const getShippingMethodText = (method: string) => {
    const texts: Record<string, string> = {
      standard: 'Giao hàng tiêu chuẩn (3-5 ngày)',
      express: 'Giao hàng nhanh (1-2 ngày)',
      same_day: 'Giao trong ngày'
    };
    return texts[method] || method;
  };

  const getReturnRequestStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      approved: 'blue',
      rejected: 'red',
      processing: 'cyan',
      completed: 'green',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const getReturnRequestStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Chờ xử lý hoàn hàng',
      approved: 'Đã duyệt hoàn hàng',
      rejected: 'Từ chối hoàn hàng',
      processing: 'Đang xử lý hoàn tiền',
      completed: 'Đã hoàn thành',
      cancelled: 'Đã hủy'
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
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const orderItemsColumns = [
    {
      title: 'Sản phẩm',
      key: 'product',
      render: (_: any, record: any) => (
        <Space>
          <img
            src={record.productImage || '/placeholder-product.png'}
            alt={record.productName}
            style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
          />
          <div>
            <Text strong>{record.productName}</Text>
            {record.variant && (
              <div>
                {record.variant.storage && <Text type="secondary">Dung lượng: {record.variant.storage}</Text>}
                {record.variant.color && <Text type="secondary"> | Màu: {record.variant.color}</Text>}
              </div>
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
      render: (price: number) => formatPrice(price)
    },
    {
      title: 'Thành tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      align: 'right' as const,
      render: (price: number) => <Text strong>{formatPrice(price)}</Text>
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => {
        // Chỉ hiển thị nút đánh giá nếu đơn hàng đã được giao
        if (order?.status !== 'delivered') {
          return null;
        }

        const productId = String(record.product?._id || record.product);
        const existingFeedback = existingFeedbacks.get(productId);
        
        // Chỉ cho phép đánh giá nếu chưa có hoặc đã được duyệt (có thể chỉnh sửa trong 24h)
        const canReview = !existingFeedback || 
          (existingFeedback.status === 'approved' && existingFeedback.canEdit) ||
          existingFeedback.status === 'pending';

        return (
          <Button
            type={existingFeedback ? 'default' : 'primary'}
            size="small"
            onClick={() => handleReviewClick(record)}
            disabled={!canReview}
          >
            {existingFeedback 
              ? (existingFeedback.status === 'approved' && existingFeedback.canEdit ? 'Chỉnh sửa' : 'Đã đánh giá')
              : 'Đánh giá'}
          </Button>
        );
      }
    }
  ];

  if (loading) {
    return (
      <PageWrapper loading={true}>
        <div className="order-detail-page">
          <div className="container">
            <Spin size="large" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!order) {
    return (
      <PageWrapper>
        <div className="order-detail-page">
          <div className="container">
            <Empty description="Không tìm thấy đơn hàng" />
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')} style={{ marginTop: 16 }}>
              Quay lại
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="order-detail-page">
        <div className="container">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/orders')}
            style={{ marginBottom: 24 }}
          >
            Quay lại
          </Button>

          <Card
            title={
              <Space>
                <ShoppingCartOutlined />
                <span>Chi tiết đơn hàng</span>
              </Space>
            }
            extra={
              <Space>
                <Tag color={getStatusColor(order.status)}>{getStatusText(order.status)}</Tag>
                {order.canCancel && (
                  <Button danger onClick={handleCancelOrder}>
                    Hủy đơn hàng
                  </Button>
                )}
                {order.status === 'delivered' && !returnRequest && (
                  <>
                    {canReturnOrder ? (
                      <Button 
                        type="primary" 
                        onClick={() => {
                          // Double check trước khi mở modal
                          if (order.deliveredAt) {
                            const deliveredDate = new Date(order.deliveredAt);
                            const now = new Date();
                            const daysSinceDelivery = Math.floor((now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            if (daysSinceDelivery > 7) {
                              toast.error('Đã quá thời hạn hoàn hàng (7 ngày kể từ khi nhận hàng)');
                              return;
                            }
                          }
                          setReturnRequestModalVisible(true);
                        }}
                      >
                        Yêu cầu hoàn hàng
                      </Button>
                    ) : (
                      <Button type="primary" disabled title={returnDeadlineMessage}>
                        Yêu cầu hoàn hàng
                      </Button>
                    )}
                    {returnDeadlineMessage && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                        {returnDeadlineMessage}
                      </Text>
                    )}
                  </>
                )}
                {returnRequest && (
                  <>
                    <Tag color={getReturnRequestStatusColor(returnRequest.status)}>
                      {getReturnRequestStatusText(returnRequest.status)}
                    </Tag>
                    {returnRequest.status === 'cancelled' || returnRequest.status === 'rejected' ? (
                      canReturnOrder && (
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={() => {
                            if (order.deliveredAt) {
                              const deliveredDate = new Date(order.deliveredAt);
                              const now = new Date();
                              const daysSinceDelivery = Math.floor((now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
                              
                              if (daysSinceDelivery > 7) {
                                toast.error('Đã quá thời hạn hoàn hàng (7 ngày kể từ khi nhận hàng)');
                                return;
                              }
                            }
                            setReturnRequestModalVisible(true);
                          }}
                        >
                          Yêu cầu lại
                        </Button>
                      )
                    ) : null}
                  </>
                )}
              </Space>
            }
          >
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
              <Descriptions.Item label="Mã đơn hàng">
                <Text strong>{order.orderNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày đặt">
                {formatDate(order.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusColor(order.status)}>{getStatusText(order.status)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                <Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>
                  {formatPrice(order.totalAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức thanh toán">
                {getPaymentMethodText(order.paymentInfo.method)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái thanh toán">
                <Tag color={order.paymentInfo.status === 'paid' ? 'green' : 'orange'}>
                  {order.paymentInfo.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Sản phẩm trong đơn hàng */}
          <Card
            title="Sản phẩm"
            style={{ marginTop: 16 }}
          >
            <Table
              columns={orderItemsColumns}
              dataSource={order.items}
              rowKey="_id"
              pagination={false}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text strong>Tổng cộng:</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ fontSize: 16 }}>
                        {formatPrice(order.subtotal)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>

          {/* Thông tin giao hàng */}
          <Card
            title={
              <Space>
                <EnvironmentOutlined />
                <span>Địa chỉ giao hàng</span>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <Descriptions column={1}>
              <Descriptions.Item label="Họ và tên">
                {order.shippingAddress.fullName}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {order.shippingAddress.phone}
              </Descriptions.Item>
              {order.shippingAddress.email && (
                <Descriptions.Item label="Email">
                  {order.shippingAddress.email}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Địa chỉ">
                {order.shippingAddress.address}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province}
              </Descriptions.Item>
              {order.shippingAddress.postalCode && (
                <Descriptions.Item label="Mã bưu điện">
                  {order.shippingAddress.postalCode}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Phương thức vận chuyển">
                {getShippingMethodText(order.shippingMethod)}
              </Descriptions.Item>
              <Descriptions.Item label="Phí vận chuyển">
                {formatPrice(order.shippingFee)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Thông tin thanh toán */}
          <Card
            title={
              <Space>
                <CreditCardOutlined />
                <span>Thông tin thanh toán</span>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <Descriptions column={1}>
              <Descriptions.Item label="Phương thức">
                {getPaymentMethodText(order.paymentInfo.method)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={order.paymentInfo.status === 'paid' ? 'green' : 'orange'}>
                  {order.paymentInfo.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </Tag>
              </Descriptions.Item>
              {order.paymentInfo.transactionId && (
                <Descriptions.Item label="Mã giao dịch">
                  {order.paymentInfo.transactionId}
                </Descriptions.Item>
              )}
              {order.paymentInfo.paidAt && (
                <Descriptions.Item label="Ngày thanh toán">
                  {formatDate(order.paymentInfo.paidAt)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Tóm tắt đơn hàng */}
          <Card
            title="Tóm tắt đơn hàng"
            style={{ marginTop: 16 }}
          >
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Tạm tính">
                {formatPrice(order.subtotal)}
              </Descriptions.Item>
              <Descriptions.Item label="Phí vận chuyển">
                {formatPrice(order.shippingFee)}
              </Descriptions.Item>
              {order.discountAmount > 0 && (
                <Descriptions.Item label="Giảm giá">
                  <Text type="success">-{formatPrice(order.discountAmount)}</Text>
                </Descriptions.Item>
              )}
              <Divider style={{ margin: '8px 0' }} />
              <Descriptions.Item label="Tổng cộng">
                <Text strong style={{ fontSize: 20, color: '#ff4d4f' }}>
                  {formatPrice(order.totalAmount)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Lịch sử trạng thái */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <Card
              title={
                <Space>
                  <TruckOutlined />
                  <span>Lịch sử trạng thái</span>
                </Space>
              }
              style={{ marginTop: 16 }}
            >
              <Timeline>
                {order.statusHistory.map((history, index) => (
                  <Timeline.Item
                    key={index}
                    color={getStatusColor(history.status)}
                  >
                    <Text strong>{getStatusText(history.status)}</Text>
                    {history.note && (
                      <div>
                        <Text type="secondary">{history.note}</Text>
                      </div>
                    )}
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(history.updatedAt)}
                      </Text>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          )}

          {/* Ghi chú */}
          {order.notes && (
            <Card title="Ghi chú" style={{ marginTop: 16 }}>
              <Text>{order.notes}</Text>
            </Card>
          )}

          {/* Quà tặng */}
          {order.isGift && order.giftMessage && (
            <Card title="Thông tin quà tặng" style={{ marginTop: 16 }}>
              <Text>{order.giftMessage}</Text>
            </Card>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedProduct && (
        <ReviewModal
          open={reviewModalVisible}
          onCancel={() => {
            setReviewModalVisible(false);
            setSelectedProduct(null);
          }}
          onSuccess={handleReviewSuccess}
          productId={selectedProduct.productId}
          productName={selectedProduct.productName}
          productImage={selectedProduct.productImage}
          orderId={selectedProduct.orderId}
          orderNumber={selectedProduct.orderNumber}
          existingFeedback={
            selectedProduct
              ? existingFeedbacks.get(String(selectedProduct.productId)) || null
              : null
          }
        />
      )}

      {/* Return Request Modal */}
      {order && order.status === 'delivered' && (
        <ReturnRequestModal
          open={returnRequestModalVisible}
          onCancel={() => {
            setReturnRequestModalVisible(false);
          }}
          onSuccess={() => {
            loadReturnRequest();
            loadOrderDetail(order._id);
            setReturnRequestModalVisible(false);
          }}
          order={order}
        />
      )}
    </PageWrapper>
  );
};

export default OrderDetailPage;

