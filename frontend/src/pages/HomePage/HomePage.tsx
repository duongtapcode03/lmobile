import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Typography, Space } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../../components';
import { useLayout } from '../../hooks';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { layoutState, setLoading, setError, setEmpty, resetLayout, handleAsync } = useLayout();
  const [data, setData] = useState<any[]>([]);

  // Simulate loading data
  const loadData = async () => {
    const result = await handleAsync(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random error
      if (Math.random() < 0.3) {
        throw new Error(t('errors.loadDataFailed'));
      }
      
      return [
        { id: 1, name: 'iPhone 15 Pro Max', price: '35.990.000 VNĐ' },
        { id: 2, name: 'Samsung Galaxy S24 Ultra', price: '32.990.000 VNĐ' },
        { id: 3, name: 'Xiaomi 14 Pro', price: '18.990.000 VNĐ' },
      ];
    });

    if (result) {
      setData(result);
      if (result.length === 0) {
        setEmpty(true);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetry = () => {
    resetLayout();
    loadData();
  };

  return (
    <div className="container">
      <div className="page-header">
        <Title level={1}>{t('homePage.welcomeTitle')}</Title>
        <Paragraph>
          {t('homePage.welcomeSubtitle')}
        </Paragraph>
      </div>

      {/* Auth buttons */}
      <div className="auth-buttons" style={{ marginBottom: 32, textAlign: 'center' }}>
        <Space size="large">
          <Link to="/register">
            <Button type="primary" size="large">
              {t('common.register')}
            </Button>
          </Link>
          <Link to="/login">
            <Button size="large">
              {t('common.login')}
            </Button>
          </Link>
        </Space>
      </div>

      <div className="page-actions">
        <Button type="primary" onClick={loadData}>
          {t('homePage.reloadData')}
        </Button>
        <Button onClick={() => setLoading(true)}>
          {t('homePage.showLoading')}
        </Button>
        <Button onClick={() => setError('Lỗi test')}>
          {t('homePage.showError')}
        </Button>
        <Button onClick={() => setEmpty(true)}>
          {t('homePage.showEmpty')}
        </Button>
      </div>

      <PageWrapper
        loading={layoutState.loading}
        error={layoutState.error}
        empty={layoutState.empty}
        onRetry={handleRetry}
      >
        <div className="products-section">
          <Title level={2}>{t('homePage.featuredProducts')}</Title>
          <Row gutter={[16, 16]}>
            {data.map((product) => (
              <Col xs={24} sm={12} md={8} key={product.id}>
                <Card
                  title={product.name}
                  extra={<span className="price">{product.price}</span>}
                  hoverable
                >
                  <p>{t('products.productDescription')}</p>
                  <Button type="primary" block>
                    {t('common.viewDetails')}
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </PageWrapper>
    </div>
  );
};

export default HomePage;
