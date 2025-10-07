import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Typography } from 'antd';
import { PageWrapper } from '../../components';
import { useLayout } from '../../hooks';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const { layoutState, setLoading, setError, setEmpty, resetLayout, handleAsync } = useLayout();
  const [data, setData] = useState<any[]>([]);

  // Simulate loading data
  const loadData = async () => {
    const result = await handleAsync(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random error
      if (Math.random() < 0.3) {
        throw new Error('Không thể tải dữ liệu');
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
        <Title level={1}>Chào mừng đến với LMobile</Title>
        <Paragraph>
          Website bán điện thoại di động hàng đầu Việt Nam
        </Paragraph>
      </div>

      <div className="page-actions">
        <Button type="primary" onClick={loadData}>
          Tải lại dữ liệu
        </Button>
        <Button onClick={() => setLoading(true)}>
          Hiển thị Loading
        </Button>
        <Button onClick={() => setError('Lỗi test')}>
          Hiển thị Error
        </Button>
        <Button onClick={() => setEmpty(true)}>
          Hiển thị Empty
        </Button>
      </div>

      <PageWrapper
        loading={layoutState.loading}
        error={layoutState.error}
        empty={layoutState.empty}
        onRetry={handleRetry}
      >
        <div className="products-section">
          <Title level={2}>Sản phẩm nổi bật</Title>
          <Row gutter={[16, 16]}>
            {data.map((product) => (
              <Col xs={24} sm={12} md={8} key={product.id}>
                <Card
                  title={product.name}
                  extra={<span className="price">{product.price}</span>}
                  hoverable
                >
                  <p>Mô tả sản phẩm...</p>
                  <Button type="primary" block>
                    Xem chi tiết
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
