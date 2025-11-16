/**
 * Admin Reviews Management
 * Quản lý đánh giá của khách hàng
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  message,
  Modal,
  Form,
  Select,
  Tag,
  Popconfirm,
  Row,
  Col,
  Rate,
  Image,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeInvisibleOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import feedbackService, { type Feedback } from '../../../api/feedbackService';
import './Reviews.scss';

const { Search, TextArea } = Input;
const { Option } = Select;

const Reviews: React.FC = () => {
  const [reviews, setReviews] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isResponseModalVisible, setIsResponseModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Feedback | null>(null);
  const [responseForm] = Form.useForm();

  useEffect(() => {
    loadReviews();
  }, [pagination.current, pagination.pageSize, statusFilter, ratingFilter, searchText]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (ratingFilter !== 'all') {
        params.rating = parseInt(ratingFilter);
      }

      if (searchText) {
        params.search = searchText;
      }

      const response = await feedbackService.getFeedbacks(params);
      setReviews(response.data || []);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination!.totalItems,
        }));
      }
    } catch (error: any) {
      console.error('Failed to load reviews:', error);
      message.error('Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleViewDetail = (review: Feedback) => {
    setSelectedReview(review);
    setIsDetailModalVisible(true);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await feedbackService.updateFeedbackStatus(id, status as any);
      message.success('Đã cập nhật trạng thái đánh giá');
      loadReviews();
      if (selectedReview && selectedReview._id === id) {
        setSelectedReview({ ...selectedReview, status: status as any });
      }
    } catch (error: any) {
      console.error('Failed to update status:', error);
      message.error('Không thể cập nhật trạng thái');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await feedbackService.deleteFeedback(id);
      message.success('Đã xóa đánh giá');
      loadReviews();
      if (selectedReview && selectedReview._id === id) {
        setIsDetailModalVisible(false);
      }
    } catch (error: any) {
      console.error('Failed to delete review:', error);
      message.error('Không thể xóa đánh giá');
    }
  };

  const handleRespond = (review: Feedback) => {
    setSelectedReview(review);
    responseForm.setFieldsValue({
      content: review.response?.content || '',
    });
    setIsResponseModalVisible(true);
  };

  const handleResponseSubmit = async () => {
    try {
      const values = await responseForm.validateFields();
      if (!selectedReview) return;

      await feedbackService.respondToFeedback(selectedReview._id, values.content);
      message.success('Đã phản hồi đánh giá');
      setIsResponseModalVisible(false);
      responseForm.resetFields();
      loadReviews();
    } catch (error: any) {
      console.error('Failed to respond:', error);
      message.error('Không thể phản hồi đánh giá');
    }
  };

  const statusColorMap: Record<string, string> = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    hidden: 'default',
  };

  const statusTextMap: Record<string, string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    hidden: 'Ẩn',
  };

  const columns = [
    {
      title: 'Khách hàng',
      key: 'user',
      width: 150,
      render: (_: any, record: Feedback) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {record.isAnonymous ? 'Ẩn danh' : (record.user?.name || 'N/A')}
          </div>
          {record.verified && (
            <Tag color="blue" size="small">Đã xác thực</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Sản phẩm',
      key: 'product',
      width: 200,
      render: (_: any, record: Feedback) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.product?.thumbnail && (
            <img
              src={record.product.thumbnail}
              alt={record.product.name}
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <span style={{ fontSize: '12px' }}>{record.product?.name || 'N/A'}</span>
        </div>
      ),
    },
    {
      title: 'Đánh giá',
      key: 'rating',
      width: 120,
      render: (_: any, record: Feedback) => (
        <div>
          <Rate disabled value={record.rating} style={{ fontSize: '14px' }} />
          <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
            {record.rating} sao
          </div>
        </div>
      ),
    },
    {
      title: 'Nội dung',
      key: 'content',
      ellipsis: true,
      render: (_: any, record: Feedback) => (
        <div>
          {record.title && (
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{record.title}</div>
          )}
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.content?.substring(0, 100)}
            {record.content && record.content.length > 100 ? '...' : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={statusColorMap[status] || 'default'}>
          {statusTextMap[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Hữu ích',
      key: 'helpful',
      width: 100,
      render: (_: any, record: Feedback) => (
        <div style={{ fontSize: '12px' }}>
          <span style={{ color: '#52c41a' }}>👍 {record.helpful || 0}</span>
          {' / '}
          <span style={{ color: '#ff4d4f' }}>👎 {record.notHelpful || 0}</span>
        </div>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => {
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
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Feedback) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            size="small"
          >
            Chi tiết
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                type="text"
                icon={<CheckOutlined />}
                onClick={() => handleUpdateStatus(record._id, 'approved')}
                size="small"
                style={{ color: '#52c41a' }}
              >
                Duyệt
              </Button>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => handleUpdateStatus(record._id, 'rejected')}
                size="small"
                danger
              >
                Từ chối
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Button
              type="text"
              icon={<EyeInvisibleOutlined />}
              onClick={() => handleUpdateStatus(record._id, 'hidden')}
              size="small"
            >
              Ẩn
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-reviews">
      <div className="reviews-header">
        <h1 className="page-title">Quản lý đánh giá</h1>
        <Space>
          <Search
            placeholder="Tìm kiếm đánh giá"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => {
              if (!e.target.value) {
                setSearchText('');
                setPagination(prev => ({ ...prev, current: 1 }));
                loadReviews();
              }
            }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder="Trạng thái"
          >
            <Option value="all">Tất cả</Option>
            <Option value="pending">Chờ duyệt</Option>
            <Option value="approved">Đã duyệt</Option>
            <Option value="rejected">Từ chối</Option>
            <Option value="hidden">Ẩn</Option>
          </Select>
          <Select
            value={ratingFilter}
            onChange={setRatingFilter}
            style={{ width: 150 }}
            placeholder="Đánh giá"
          >
            <Option value="all">Tất cả</Option>
            <Option value="5">5 sao</Option>
            <Option value="4">4 sao</Option>
            <Option value="3">3 sao</Option>
            <Option value="2">2 sao</Option>
            <Option value="1">1 sao</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadReviews}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={reviews}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total) => `Tổng ${total} đánh giá`,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setPagination(prev => ({
              ...prev,
              current: page,
              pageSize: pageSize || prev.pageSize,
            }));
          },
        }}
        scroll={{ x: 1400 }}
      />

      {/* Modal chi tiết đánh giá */}
      <Modal
        title="Chi tiết đánh giá"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedReview(null);
        }}
        width={800}
        footer={[
          <Button key="close" onClick={() => {
            setIsDetailModalVisible(false);
            setSelectedReview(null);
          }}>
            Đóng
          </Button>,
          selectedReview && selectedReview.status === 'pending' && (
            <Button
              key="approve"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleUpdateStatus(selectedReview._id, 'approved')}
            >
              Duyệt
            </Button>
          ),
          selectedReview && selectedReview.status === 'pending' && (
            <Button
              key="reject"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleUpdateStatus(selectedReview._id, 'rejected')}
            >
              Từ chối
            </Button>
          ),
          selectedReview && selectedReview.status === 'approved' && (
            <Button
              key="hide"
              icon={<EyeInvisibleOutlined />}
              onClick={() => handleUpdateStatus(selectedReview._id, 'hidden')}
            >
              Ẩn
            </Button>
          ),
          selectedReview && (
            <Button
              key="respond"
              icon={<MessageOutlined />}
              onClick={() => handleRespond(selectedReview)}
            >
              Phản hồi
            </Button>
          ),
          selectedReview && (
            <Popconfirm
              key="delete"
              title="Bạn có chắc chắn muốn xóa đánh giá này?"
              description="Hành động này không thể hoàn tác"
              onConfirm={() => handleDelete(selectedReview._id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger>Xóa</Button>
            </Popconfirm>
          ),
        ]}
      >
        {selectedReview && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Khách hàng">
                {selectedReview.isAnonymous ? 'Ẩn danh' : (selectedReview.user?.name || 'N/A')}
                {selectedReview.verified && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>Đã xác thực</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedReview.isAnonymous ? 'N/A' : (selectedReview.user?.email || 'N/A')}
              </Descriptions.Item>
              <Descriptions.Item label="Sản phẩm" span={2}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedReview.product?.thumbnail && (
                    <img
                      src={selectedReview.product.thumbnail}
                      alt={selectedReview.product.name}
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                  <span>{selectedReview.product?.name || 'N/A'}</span>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Đánh giá">
                <Rate disabled value={selectedReview.rating} />
                <span style={{ marginLeft: 8 }}>{selectedReview.rating} sao</span>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={statusColorMap[selectedReview.status] || 'default'}>
                  {statusTextMap[selectedReview.status] || selectedReview.status}
                </Tag>
              </Descriptions.Item>
              {selectedReview.title && (
                <Descriptions.Item label="Tiêu đề" span={2}>
                  {selectedReview.title}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Nội dung" span={2}>
                {selectedReview.content}
              </Descriptions.Item>
              {selectedReview.images && selectedReview.images.length > 0 && (
                <Descriptions.Item label="Hình ảnh" span={2}>
                  <Image.PreviewGroup>
                    {selectedReview.images.map((img, index) => (
                      <Image
                        key={index}
                        src={img}
                        width={100}
                        height={100}
                        style={{ objectFit: 'cover', marginRight: 8, marginBottom: 8 }}
                      />
                    ))}
                  </Image.PreviewGroup>
                </Descriptions.Item>
              )}
              {selectedReview.pros && selectedReview.pros.length > 0 && (
                <Descriptions.Item label="Ưu điểm" span={2}>
                  <ul>
                    {selectedReview.pros.map((pro, index) => (
                      <li key={index}>{pro}</li>
                    ))}
                  </ul>
                </Descriptions.Item>
              )}
              {selectedReview.cons && selectedReview.cons.length > 0 && (
                <Descriptions.Item label="Nhược điểm" span={2}>
                  <ul>
                    {selectedReview.cons.map((con, index) => (
                      <li key={index}>{con}</li>
                    ))}
                  </ul>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Hữu ích">
                <span style={{ color: '#52c41a' }}>👍 {selectedReview.helpful || 0}</span>
                {' / '}
                <span style={{ color: '#ff4d4f' }}>👎 {selectedReview.notHelpful || 0}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {selectedReview.createdAt
                  ? new Date(selectedReview.createdAt).toLocaleString('vi-VN')
                  : 'N/A'}
              </Descriptions.Item>
              {selectedReview.response && (
                <>
                  <Descriptions.Item label="Phản hồi" span={2}>
                    {selectedReview.response.content}
                  </Descriptions.Item>
                  <Descriptions.Item label="Người phản hồi">
                    {selectedReview.response.respondedBy?.name || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày phản hồi">
                    {selectedReview.response.respondedAt
                      ? new Date(selectedReview.response.respondedAt).toLocaleString('vi-VN')
                      : 'N/A'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Modal phản hồi */}
      <Modal
        title="Phản hồi đánh giá"
        open={isResponseModalVisible}
        onOk={handleResponseSubmit}
        onCancel={() => {
          setIsResponseModalVisible(false);
          responseForm.resetFields();
        }}
        okText="Gửi phản hồi"
        cancelText="Hủy"
      >
        <Form form={responseForm} layout="vertical">
          <Form.Item
            name="content"
            label="Nội dung phản hồi"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung phản hồi' }]}
          >
            <TextArea
              rows={6}
              placeholder="Nhập phản hồi của bạn..."
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Reviews;

