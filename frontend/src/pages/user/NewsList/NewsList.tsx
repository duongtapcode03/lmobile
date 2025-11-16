import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Spin, Card, Avatar, message } from 'antd';
import { Link } from 'react-router-dom';
import { UserOutlined } from '@ant-design/icons';
import blogService from '../../../api/blogService';
import type { Blog } from '../../../types';
import { PageWrapper } from '../../../components';
import './NewsList.scss';

const { Title, Text } = Typography;

const NewsListPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await blogService.getBlogs({
          status: 'published',
          sortBy: 'publishedAt',
          sortOrder: 'desc',
          limit: 20,
          page: 1
        });

        setBlogs(response.data);
        setTotal(response.total);
      } catch (err: any) {
        console.error('Error loading blogs:', err);
        setError(err.message || 'Không thể tải danh sách tin tức');
        message.error('Không thể tải danh sách tin tức');
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, []);

  const getImageUrl = (blog: Blog): string => {
    if (blog.featuredImage) return blog.featuredImage;
    if (blog.featuredImageData?.original) return blog.featuredImageData.original;
    if (blog.images && blog.images.length > 0) return blog.images[0];
    return '/placeholder-news.png';
  };

  const getAvatarUrl = (blog: Blog): string => {
    if (blog.avatar) return blog.avatar;
    return '';
  };

  if (loading) {
    return (
      <div className="news-list-page">
        <PageWrapper loading={true} error={null}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
            </div>
          </div>
        </PageWrapper>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-list-page">
        <PageWrapper loading={false} error={error}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Title level={3}>Không thể tải danh sách tin tức</Title>
            </div>
          </div>
        </PageWrapper>
      </div>
    );
  }

  return (
    <div className="news-list-page">
      <PageWrapper loading={loading} error={error}>
        <div className="container">
          <div className="news-header">
            <Title level={1}>Tin tức công nghệ</Title>
            <Text type="secondary">Tổng cộng {total} bài viết</Text>
          </div>

          <div className="news-list">
            {blogs.length > 0 ? (
              <Row gutter={[24, 24]}>
                {blogs.map((blog) => (
                  <Col xs={24} sm={12} md={12} lg={8} xl={8} key={blog._id}>
                    <Link to={`/news/${blog.slug || blog._id}`} className="news-card-link">
                      <Card
                        className="news-card"
                        hoverable
                        cover={
                          <div className="news-image-wrapper">
                            <img
                              src={getImageUrl(blog)}
                              alt={blog.title}
                              className="news-image"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-news.png';
                              }}
                            />
                          </div>
                        }
                      >
                        <div className="news-content">
                          <Title level={4} className="news-title" ellipsis={{ rows: 2 }}>
                            {blog.title}
                          </Title>
                          {blog.subtitle && (
                            <Text className="news-subtitle" ellipsis>
                              {blog.subtitle}
                            </Text>
                          )}
                          <div className="news-author">
                            <Avatar
                              src={getAvatarUrl(blog)}
                              icon={<UserOutlined />}
                              size="small"
                              className="author-avatar"
                            />
                            <Text className="author-name">
                              {blog.authorName || 'Tác giả'}
                            </Text>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="no-news">
                <Text>Chưa có tin tức nào.</Text>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    </div>
  );
};

export default NewsListPage;



