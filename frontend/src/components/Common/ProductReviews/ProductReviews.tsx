/**
 * ProductReviews Component
 * Hiển thị đánh giá của sản phẩm
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Rate,
  Typography,
  Avatar,
  Tag,
  Image,
  Space,
  Pagination,
  Select,
  Empty,
  Spin,
  Button,
  Divider,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  LikeOutlined,
  DislikeOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import feedbackService, { type Feedback } from '../../../api/feedbackService';
import './ProductReviews.scss';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ProductReviewsProps {
  productId: string | number;
  productName?: string;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, productName }) => {
  const [reviews, setReviews] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [stats, setStats] = useState<{
    averageRating?: number;
    totalReviews?: number;
    ratingStats?: any;
  }>({});

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [productId, pagination.current, pagination.pageSize, ratingFilter, sortBy]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
        sortBy: sortBy,
        sortOrder: 'desc',
      };

      if (ratingFilter) {
        params.rating = ratingFilter;
      }

      const response = await feedbackService.getFeedbacksByProduct(String(productId), params);
      setReviews(response.data || []);
      
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination!.totalItems,
        }));
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await feedbackService.getFeedbacksByProduct(String(productId), {
        page: 1,
        limit: 1,
      });
      
      setStats({
        averageRating: response.averageRating || 0,
        totalReviews: response.totalReviews || 0,
        ratingStats: response.ratingStats || {},
      });
    } catch (error) {
      console.error('Failed to load review stats:', error);
      setStats({
        averageRating: 0,
        totalReviews: 0,
        ratingStats: {},
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#52c41a';
    if (rating >= 3) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <div className="product-reviews">
      <Card>
        <div className="reviews-header">
          <Title level={3} className="reviews-title">
            Đánh giá sản phẩm
          </Title>
          {stats.totalReviews !== undefined && stats.totalReviews > 0 && (
            <div className="reviews-summary">
              <div className="average-rating">
                <Text strong style={{ fontSize: '32px', color: getRatingColor(stats.averageRating || 0) }}>
                  {stats.averageRating?.toFixed(1) || '0.0'}
                </Text>
                <div>
                  <Rate disabled value={stats.averageRating || 0} allowHalf />
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({stats.totalReviews} đánh giá)
                  </Text>
                </div>
              </div>
              {stats.ratingStats && (
                <div className="rating-breakdown">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    // ratingStats là object với key là rating (5, 4, 3, 2, 1) và value là count
                    const count = stats.ratingStats[rating] || 0;
                    const percent = stats.totalReviews ? (count / stats.totalReviews) * 100 : 0;
                    return (
                      <div key={rating} className="rating-item">
                        <Text>{rating} sao</Text>
                        <div className="rating-bar">
                          <div 
                            className="rating-bar-fill" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <Text type="secondary">{count}</Text>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <Divider />

        <div className="reviews-filters">
          <Space size="middle">
            <Select
              style={{ width: 150 }}
              placeholder="Lọc theo sao"
              value={ratingFilter}
              onChange={(value) => {
                setRatingFilter(value);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
              allowClear
            >
              <Option value={5}>5 sao</Option>
              <Option value={4}>4 sao</Option>
              <Option value={3}>3 sao</Option>
              <Option value={2}>2 sao</Option>
              <Option value={1}>1 sao</Option>
            </Select>
            <Select
              style={{ width: 150 }}
              value={sortBy}
              onChange={setSortBy}
            >
              <Option value="createdAt">Mới nhất</Option>
              <Option value="helpful">Hữu ích nhất</Option>
              <Option value="rating">Đánh giá cao</Option>
            </Select>
          </Space>
        </div>

        {loading && reviews.length === 0 ? (
          <div className="reviews-loading">
            <Spin size="large" />
          </div>
        ) : reviews.length === 0 ? (
          <Empty
            description="Chưa có đánh giá nào cho sản phẩm này"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <>
            <div className="reviews-list">
              {reviews.map((review) => (
                <Card key={review._id} className="review-item" size="small">
                  <div className="review-header">
                    <Space>
                      <Avatar
                        icon={<UserOutlined />}
                        src={review.user?.avatar}
                        size={40}
                      />
                      <div>
                        <div className="review-user">
                          <Text strong>
                            {review.isAnonymous ? 'Người dùng ẩn danh' : (review.user?.name || 'Khách hàng')}
                          </Text>
                          {review.verified && (
                            <Tag color="green" icon={<CheckCircleOutlined />} style={{ marginLeft: 8 }}>
                              Đã mua hàng
                            </Tag>
                          )}
                        </div>
                        <div className="review-meta">
                          <Rate disabled value={review.rating} style={{ fontSize: '14px' }} />
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            {formatDate(review.createdAt)}
                          </Text>
                        </div>
                      </div>
                    </Space>
                  </div>

                  {review.title && (
                    <Title level={5} className="review-title">
                      {review.title}
                    </Title>
                  )}

                  <Paragraph className="review-content">
                    {review.content}
                  </Paragraph>

                  {review.images && review.images.length > 0 && (
                    <div className="review-images">
                      <Image.PreviewGroup>
                        {review.images.map((img, index) => (
                          <Image
                            key={index}
                            src={img}
                            alt={`Review image ${index + 1}`}
                            width={80}
                            height={80}
                            style={{ objectFit: 'cover', borderRadius: 4, marginRight: 8 }}
                          />
                        ))}
                      </Image.PreviewGroup>
                    </div>
                  )}

                  {(review.pros && review.pros.length > 0) || (review.cons && review.cons.length > 0) ? (
                    <div className="review-pros-cons">
                      {review.pros && review.pros.length > 0 && (
                        <div className="pros">
                          <Text strong style={{ color: '#52c41a' }}>Ưu điểm:</Text>
                          <ul>
                            {review.pros.map((pro, index) => (
                              <li key={index}>{pro}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {review.cons && review.cons.length > 0 && (
                        <div className="cons">
                          <Text strong style={{ color: '#ff4d4f' }}>Nhược điểm:</Text>
                          <ul>
                            {review.cons.map((con, index) => (
                              <li key={index}>{con}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {review.response && (
                    <div className="review-response">
                      <Divider style={{ margin: '12px 0' }} />
                      <div className="response-header">
                        <MessageOutlined style={{ marginRight: 8 }} />
                        <Text strong>Phản hồi từ cửa hàng</Text>
                      </div>
                      <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                        {review.response.content}
                      </Paragraph>
                    </div>
                  )}

                  <div className="review-footer">
                    <Space>
                      <Button
                        type="text"
                        size="small"
                        icon={<LikeOutlined />}
                        disabled
                      >
                        Hữu ích ({review.helpful || 0})
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        icon={<DislikeOutlined />}
                        disabled
                      >
                        Không hữu ích ({review.notHelpful || 0})
                      </Button>
                    </Space>
                  </div>
                </Card>
              ))}
            </div>

            {pagination.total > pagination.pageSize && (
              <div className="reviews-pagination">
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  showSizeChanger
                  showTotal={(total) => `Tổng ${total} đánh giá`}
                  onChange={(page, pageSize) => {
                    setPagination(prev => ({ ...prev, current: page, pageSize }));
                  }}
                  onShowSizeChange={(current, size) => {
                    setPagination(prev => ({ ...prev, current: 1, pageSize: size }));
                  }}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default ProductReviews;

