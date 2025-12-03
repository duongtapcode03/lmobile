/**
 * Admin Return Requests Management
 * Quản lý yêu cầu hoàn hàng
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
  Typography,
  Popconfirm,
  Divider,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import returnRequestService, { type ReturnRequest } from '../../../api/returnRequestService';
import './ReturnRequests.scss';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

const ReturnRequests: React.FC = () => {
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'process' | 'complete'>('approve');
  const [adminNote, setAdminNote] = useState('');
  const [refundTransactionId, setRefundTransactionId] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    processing: 0,
    completed: 0,
    rejected: 0
  });

  useEffect(() => {
    loadReturnRequests();
  }, [statusFilter, pagination.current, pagination.pageSize]);

  const loadReturnRequests = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchText) {
        params.orderNumber = searchText;
      }

      const response = await returnRequestService.getAllReturnRequests(params);
      setReturnRequests(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.totalItems
      }));

      // Load stats
      const statsResponse = await returnRequestService.getAllReturnRequests({ limit: 1000 });
      const allRequests = statsResponse.data;
      setStats({
        total: allRequests.length,
        pending: allRequests.filter(r => r.status === 'pending').length,
        approved: allRequests.filter(r => r.status === 'approved').length,
        processing: allRequests.filter(r => r.status === 'processing').length,
        completed: allRequests.filter(r => r.status === 'completed').length,
        rejected: allRequests.filter(r => r.status === 'rejected').length
      });
    } catch (error: any) {
      console.error('Error loading return requests:', error);
      message.error('Không thể tải danh sách yêu cầu hoàn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const request = await returnRequestService.getReturnRequestByIdAdmin(id);
      setSelectedRequest(request);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error('Không thể tải chi tiết yêu cầu hoàn hàng');
    }
  };

  const handleAction = (type: 'approve' | 'reject' | 'process' | 'complete', request: ReturnRequest) => {
    setActionType(type);
    setSelectedRequest(request);
    setAdminNote('');
    setRefundTransactionId('');
    setActionModalVisible(true);
  };

  const handleActionSubmit = async () => {
    if (!selectedRequest) return;

    try {
      setLoading(true);
      
      switch (actionType) {
        case 'approve':
          await returnRequestService.approveReturnRequest(selectedRequest._id, adminNote);
          message.success('Đã duyệt yêu cầu hoàn hàng');
          break;
        case 'reject':
          await returnRequestService.rejectReturnRequest(selectedRequest._id, adminNote);
          message.success('Đã từ chối yêu cầu hoàn hàng');
          break;
        case 'process':
          await returnRequestService.processReturnRequest(selectedRequest._id, adminNote);
          message.success('Đã xác nhận nhận hàng và bắt đầu xử lý hoàn tiền');
          break;
        case 'complete':
          await returnRequestService.completeReturnRequest(selectedRequest._id, {
            refundTransactionId,
            adminNote
          });
          message.success('Đã hoàn thành hoàn tiền');
          break;
      }

      setActionModalVisible(false);
      setSelectedRequest(null);
      setAdminNote('');
      setRefundTransactionId('');
      loadReturnRequests();
    } catch (error: any) {
      console.error('Error processing action:', error);
      message.error(error.response?.data?.message || 'Không thể xử lý yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
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

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Chờ xử lý',
      approved: 'Đã duyệt',
      rejected: 'Từ chối',
      processing: 'Đang xử lý',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy'
    };
    return texts[status] || status;
  };

  const getRefundStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      processing: 'cyan',
      completed: 'green',
      failed: 'red'
    };
    return colors[status] || 'default';
  };

  const getRefundStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Chờ xử lý',
      processing: 'Đang xử lý',
      completed: 'Đã hoàn tiền',
      failed: 'Thất bại'
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

  const columns = [
    {
      title: 'Mã yêu cầu',
      dataIndex: '_id',
      key: '_id',
      render: (id: string) => <Text code>{id.slice(-8)}</Text>,
      width: 120
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (orderNumber: string) => <Text strong>{orderNumber}</Text>
    },
    {
      title: 'Khách hàng',
      key: 'user',
      render: (_: any, record: ReturnRequest) => {
        const user = typeof record.user === 'object' ? record.user : null;
        return user ? (
          <div>
            <div>{user.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{user.email}</Text>
          </div>
        ) : '-';
      }
    },
    {
      title: 'Số sản phẩm',
      key: 'itemsCount',
      align: 'center' as const,
      render: (_: any, record: ReturnRequest) => (
        <Text>{record.items?.length || 0} sản phẩm</Text>
      )
    },
    {
      title: 'Số tiền hoàn',
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      align: 'right' as const,
      render: (amount: number) => (
        <Text strong style={{ color: '#ff4d4f' }}>{formatPrice(amount)}</Text>
      )
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
      title: 'Trạng thái hoàn tiền',
      dataIndex: 'refundStatus',
      key: 'refundStatus',
      render: (status: string) => (
        <Tag color={getRefundStatusColor(status)}>{getRefundStatusText(status)}</Tag>
      )
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date),
      width: 150
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_: any, record: ReturnRequest) => {
        const actions = [];

        if (record.status === 'pending') {
          actions.push(
            <Button
              key="approve"
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleAction('approve', record)}
            >
              Duyệt
            </Button>,
            <Button
              key="reject"
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handleAction('reject', record)}
            >
              Từ chối
            </Button>
          );
        }

        if (record.status === 'approved') {
          actions.push(
            <Button
              key="process"
              type="primary"
              size="small"
              icon={<ShoppingOutlined />}
              onClick={() => handleAction('process', record)}
            >
              Xác nhận nhận hàng
            </Button>
          );
        }

        if (record.status === 'processing') {
          actions.push(
            <Button
              key="complete"
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handleAction('complete', record)}
            >
              Hoàn tiền
            </Button>
          );
        }

        actions.push(
          <Button
            key="view"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record._id)}
          >
            Chi tiết
          </Button>
        );

        return <Space size="small">{actions}</Space>;
      }
    }
  ];

  return (
    <div className="return-requests-page">
      <div className="page-header">
        <Title level={2}>Quản lý yêu cầu hoàn hàng</Title>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic title="Tổng số" value={stats.total} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Chờ xử lý" value={stats.pending} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Đã duyệt" value={stats.approved} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Đang xử lý" value={stats.processing} valueStyle={{ color: '#13c2c2' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Hoàn thành" value={stats.completed} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Từ chối" value={stats.rejected} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <Search
            placeholder="Tìm theo mã đơn hàng"
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setSearchText(value);
              setPagination(prev => ({ ...prev, current: 1 }));
              loadReturnRequests();
            }}
          />
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ width: 200 }}
          >
            <Option value="all">Tất cả trạng thái</Option>
            <Option value="pending">Chờ xử lý</Option>
            <Option value="approved">Đã duyệt</Option>
            <Option value="rejected">Từ chối</Option>
            <Option value="processing">Đang xử lý</Option>
            <Option value="completed">Hoàn thành</Option>
            <Option value="cancelled">Đã hủy</Option>
          </Select>
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={returnRequests}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} yêu cầu`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }));
            }
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết yêu cầu hoàn hàng"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedRequest(null);
        }}
        footer={null}
        width={800}
      >
        {selectedRequest && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Mã yêu cầu">
                <Text code>{selectedRequest._id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Mã đơn hàng">
                <Text strong>{selectedRequest.orderNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusColor(selectedRequest.status)}>
                  {getStatusText(selectedRequest.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái hoàn tiền">
                <Tag color={getRefundStatusColor(selectedRequest.refundStatus)}>
                  {getRefundStatusText(selectedRequest.refundStatus)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền hoàn">
                <Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>
                  {formatPrice(selectedRequest.refundAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức hoàn tiền">
                {selectedRequest.refundMethod === 'original' && 'Hoàn về phương thức thanh toán gốc'}
                {selectedRequest.refundMethod === 'store_credit' && 'Hoàn vào tài khoản'}
                {selectedRequest.refundMethod === 'bank_transfer' && 'Chuyển khoản ngân hàng'}
              </Descriptions.Item>
              {selectedRequest.refundTransactionId && (
                <Descriptions.Item label="Mã giao dịch hoàn tiền">
                  <Text code>{selectedRequest.refundTransactionId}</Text>
                </Descriptions.Item>
              )}
              {selectedRequest.refundedAt && (
                <Descriptions.Item label="Ngày hoàn tiền">
                  {formatDate(selectedRequest.refundedAt)}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider>Thông tin khách hàng</Divider>
            {typeof selectedRequest.user === 'object' && selectedRequest.user && (
              <Descriptions column={2} bordered>
                <Descriptions.Item label="Tên">
                  {selectedRequest.user.name}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedRequest.user.email}
                </Descriptions.Item>
                {selectedRequest.user.phone && (
                  <Descriptions.Item label="Số điện thoại">
                    {selectedRequest.user.phone}
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}

            <Divider>Sản phẩm hoàn</Divider>
            <Table
              columns={[
                { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
                { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', align: 'center' as const },
                { title: 'Đơn giá', dataIndex: 'price', key: 'price', render: (p: number) => formatPrice(p) },
                { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
                { title: 'Chi tiết', dataIndex: 'reasonDetail', key: 'reasonDetail' }
              ]}
              dataSource={selectedRequest.items}
              rowKey={(record, index) => `${record.product}-${index}`}
              pagination={false}
              size="small"
            />

            {selectedRequest.customerNote && (
              <>
                <Divider>Ghi chú của khách hàng</Divider>
                <Text>{selectedRequest.customerNote}</Text>
              </>
            )}

            {selectedRequest.adminNote && (
              <>
                <Divider>Ghi chú của admin</Divider>
                <Text>{selectedRequest.adminNote}</Text>
              </>
            )}

            {selectedRequest.refundCalculation && (
              <>
                <Divider>Chi tiết tính toán hoàn tiền</Divider>
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="Giá trị sản phẩm">
                    {formatPrice(selectedRequest.refundCalculation.returnItemsSubtotal)}
                  </Descriptions.Item>
                  {selectedRequest.refundCalculation.returnDiscountAmount > 0 && (
                    <Descriptions.Item label="Discount được hoàn">
                      <Text type="success">
                        +{formatPrice(selectedRequest.refundCalculation.returnDiscountAmount)}
                      </Text>
                    </Descriptions.Item>
                  )}
                  {selectedRequest.refundCalculation.returnShippingFee > 0 && (
                    <Descriptions.Item label="Phí vận chuyển bị trừ">
                      <Text type="danger">
                        -{formatPrice(selectedRequest.refundCalculation.returnShippingFee)}
                      </Text>
                    </Descriptions.Item>
                  )}
                  {selectedRequest.refundCalculation.restockingFee > 0 && (
                    <Descriptions.Item label="Phí xử lý hoàn hàng">
                      <Text type="danger">
                        -{formatPrice(selectedRequest.refundCalculation.restockingFee)}
                      </Text>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Tổng số tiền được hoàn">
                    <Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>
                      {formatPrice(selectedRequest.refundCalculation.totalRefundAmount)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {selectedRequest.statusHistory && selectedRequest.statusHistory.length > 0 && (
              <>
                <Divider>Lịch sử trạng thái</Divider>
                <Timeline>
                  {selectedRequest.statusHistory.map((history, index) => (
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
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal
        title={
          actionType === 'approve' ? 'Duyệt yêu cầu hoàn hàng' :
          actionType === 'reject' ? 'Từ chối yêu cầu hoàn hàng' :
          actionType === 'process' ? 'Xác nhận nhận hàng' :
          'Hoàn thành hoàn tiền'
        }
        open={actionModalVisible}
        onOk={handleActionSubmit}
        onCancel={() => {
          setActionModalVisible(false);
          setSelectedRequest(null);
          setAdminNote('');
          setRefundTransactionId('');
        }}
        confirmLoading={loading}
        okText={
          actionType === 'approve' ? 'Duyệt' :
          actionType === 'reject' ? 'Từ chối' :
          actionType === 'process' ? 'Xác nhận' :
          'Hoàn tiền'
        }
      >
        {selectedRequest && (
          <div>
            <p>
              <Text strong>Mã đơn hàng:</Text> {selectedRequest.orderNumber}
            </p>
            <p>
              <Text strong>Số tiền hoàn:</Text>{' '}
              <Text strong style={{ color: '#ff4d4f' }}>
                {formatPrice(selectedRequest.refundAmount)}
              </Text>
            </p>
            {actionType === 'complete' && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Mã giao dịch hoàn tiền:</Text>
                <Input
                  value={refundTransactionId}
                  onChange={(e) => setRefundTransactionId(e.target.value)}
                  placeholder="Nhập mã giao dịch từ payment gateway"
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
            <div>
              <Text strong>Ghi chú:</Text>
              <Input.TextArea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Nhập ghi chú (tùy chọn)"
                rows={4}
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReturnRequests;

