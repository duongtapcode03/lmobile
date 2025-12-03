import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Spin, Button, Avatar } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import blogService from '../../../api/blogService';
import type { Blog } from '../../../types';
import { PageWrapper, useToast } from '../../../components';
import './NewsDetail.scss';

const { Title, Text, Paragraph } = Typography;

const NewsDetailPage: React.FC = () => {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blog, setBlog] = useState<Blog | null>(null);

  useEffect(() => {
    const loadBlog = async () => {
      if (!slug && !id) {
        setError('Blog slug or ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let blogData: Blog;
        if (slug) {
          blogData = await blogService.getBlogBySlug(slug);
        } else if (id) {
          blogData = await blogService.getBlogById(id);
        } else {
          throw new Error('Blog identifier is required');
        }

        setBlog(blogData);

        // Note: Backend tự động tăng view count khi get blog by ID/slug
        // Không cần gọi incrementViewCount riêng
      } catch (err: any) {
        console.error('Error loading blog:', err);
        setError(err.message || 'Không thể tải thông tin tin tức');
        toast.error('Không thể tải thông tin tin tức');
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [slug, id]);

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

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="news-detail-page">
        <PageWrapper loading={true} error={null}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Spin size="large" />
            </div>
          </div>
        </PageWrapper>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="news-detail-page">
        <PageWrapper loading={false} error={error || 'Tin tức không tồn tại'}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Title level={3}>Không tìm thấy tin tức</Title>
              <Button onClick={() => navigate('/news')} style={{ marginTop: 16 }}>
                Về danh sách tin tức
              </Button>
            </div>
          </div>
        </PageWrapper>
      </div>
    );
  }

  return (
    <div className="news-detail-page">
      <PageWrapper loading={loading} error={error}>
        <div className="container">
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/news')}
            className="back-button"
          >
            Quay lại danh sách tin tức
          </Button>

          <article className="news-article">
            {/* Featured Image */}
            {getImageUrl(blog) && (
              <div className="news-featured-image">
                <img
                  src={getImageUrl(blog)}
                  alt={blog.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-news.png';
                  }}
                />
              </div>
            )}

            {/* Article Header */}
            <div className="news-header">
              <Title level={1} className="news-title">
                {blog.title}
              </Title>

              {blog.subtitle && (
                <Text className="news-subtitle" type="secondary">
                  {blog.subtitle}
                </Text>
              )}

              {/* Author and Meta Info */}
              <div className="news-meta">
                <div className="news-author">
                  <Avatar
                    src={getAvatarUrl(blog)}
                    icon={<UserOutlined />}
                    size="large"
                    className="author-avatar"
                  />
                  <div className="author-info">
                    <Text strong className="author-name">
                      {blog.authorName || 'Tác giả'}
                    </Text>
                    {blog.publishedAt && (
                      <Text type="secondary" className="publish-date">
                        {formatDate(blog.publishedAt)}
                      </Text>
                    )}
                  </div>
                </div>

                <div className="news-stats">
                  {blog.viewCount !== undefined && (
                    <Text type="secondary" className="stat-item">
                      {blog.viewCount} lượt xem
                    </Text>
                  )}
                  {blog.readingTime && (
                    <Text type="secondary" className="stat-item">
                      {blog.readingTime} phút đọc
                    </Text>
                  )}
                </div>
              </div>
            </div>

            {/* Article Content */}
            <div className="news-content">
              {blog.content && (
                <div
                  className="news-content-html"
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />
              )}

              {blog.excerpt && !blog.content && (
                <Paragraph>{blog.excerpt}</Paragraph>
              )}

              {blog.blog_items && blog.blog_items.length > 0 && (
                <div className="news-items">
                  {blog.blog_items.map((item, index) => (
                    <div key={index} className="news-item">
                      {item.title && (
                        <Title level={3} className="item-title">
                          {item.title}
                        </Title>
                      )}
                      {item.image && (
                        <div className="item-image">
                          <img
                            src={item.image.url}
                            alt={item.image.alt || item.title || ''}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-news.png';
                            }}
                          />
                        </div>
                      )}
                      {item.lstDescription && item.lstDescription.length > 0 && (
                        <div className="item-description">
                          {item.lstDescription.map((desc, descIndex) => (
                            <Paragraph key={descIndex}>{desc}</Paragraph>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!blog.content && !blog.excerpt && !blog.blog_items && (
                <Paragraph>Nội dung đang được cập nhật...</Paragraph>
              )}
            </div>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="news-tags">
                <Text strong>Tags: </Text>
                {blog.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        </div>
      </PageWrapper>
    </div>
  );
};

export default NewsDetailPage;



