import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Typography, Spin, Pagination } from 'antd';
import categoryService from '../../../api/categoryService';
import phoneService from '../../../api/phoneService';
import type { Category } from '../../../api/categoryService';
import type { PhoneDetail } from '../../../types';
import { PageWrapper } from '../../../components';
import ProductCard from '../../../components/ProductCard';
import './Category.scss';

const { Title } = Typography;

const ITEMS_PER_PAGE = 12; // Số sản phẩm mỗi trang

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<PhoneDetail[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Lấy page từ URL query params
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (page > 0) {
        setCurrentPage(page);
      }
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    // Redirect to news page if slug is "tin-tuc-cong-nghe"
    if (slug === 'tin-tuc-cong-nghe') {
      navigate('/news', { replace: true });
      return;
    }

    const loadData = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);

        // Load category
        const categoryData = await categoryService.getCategoryBySlug(slug);
        if (!categoryData) {
          setError('Danh mục không tồn tại');
          return;
        }
        setCategory(categoryData);

        // Load tất cả products với pagination (không filter theo category)
        const productsData = await phoneService.getPhones({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        });
        
        setProducts(productsData.data || []);
        setTotalPages(productsData.totalPages || 1);
        setTotal(productsData.total || 0);
      } catch (err: any) {
        console.error('Error loading category:', err);
        setError(err.response?.data?.message || 'Không thể tải danh mục');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, navigate, currentPage]);

  if (loading) {
    return (
      <PageWrapper loading={true}>
        <div className="category-page">
          <div className="container">
            <Spin size="large" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error || !category) {
    return (
      <PageWrapper>
        <div className="category-page">
          <div className="container">
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Title level={3}>{error || 'Danh mục không tồn tại'}</Title>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="category-page">
        <div className="container">
          <Title level={2} style={{ marginBottom: 24 }}>
            {category.name}
          </Title>
          {category.description && (
            <p style={{ marginBottom: 24, color: '#666' }}>{category.description}</p>
          )}

          <Row gutter={[16, 16]}>
            {products.map((product) => (
              <Col xs={12} sm={12} md={8} lg={6} xl={6} key={product._id}>
                <ProductCard product={product} />
              </Col>
            ))}
          </Row>

          {products.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <p>Chưa có sản phẩm nào trong danh mục này</p>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                current={currentPage}
                total={total}
                pageSize={ITEMS_PER_PAGE}
                showSizeChanger={false}
                showQuickJumper
                showTotal={(total, range) => 
                  `${range[0]}-${range[1]} của ${total} sản phẩm`
                }
                onChange={(page) => {
                  setCurrentPage(page);
                  // Update URL query params
                  const newSearchParams = new URLSearchParams(searchParams);
                  newSearchParams.set('page', page.toString());
                  setSearchParams(newSearchParams, { replace: true });
                  // Scroll to top
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default CategoryPage;



