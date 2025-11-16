/**
 * Admin Flash Sales Management
 * Quản lý flash sales
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
  InputNumber,
  Tag,
  Popconfirm,
  Row,
  Col,
  Image,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import flashSaleService, { type FlashSale } from '../../../api/flashSaleService';
import './FlashSales.scss';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

const FlashSales: React.FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<FlashSale | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadFlashSales();
  }, [pagination.current, pagination.pageSize, sessionFilter, statusFilter, searchText]);

  const loadFlashSales = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };

      if (sessionFilter !== 'all') {
        params.session_id = sessionFilter;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await flashSaleService.getFlashSales(params);
      
      // Filter by search text if provided
      let filteredData = response.data || [];
      if (searchText) {
        filteredData = filteredData.filter((item: FlashSale) => {
          const productName = item.product?.name?.toLowerCase() || '';
          const sessionId = item.session_id?.toLowerCase() || '';
          return productName.includes(searchText.toLowerCase()) || 
                 sessionId.includes(searchText.toLowerCase());
        });
      }

      setFlashSales(filteredData);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination!.totalItems,
        }));
      }
    } catch (error: any) {
      console.error('Failed to load flash sales:', error);
      message.error('Không thể tải danh sách flash sales');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleAdd = () => {
    setEditingFlashSale(null);
    form.resetFields();
    form.setFieldsValue({
      limit_per_user: 1,
      sort_order: 1,
      sold: 0,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (flashSale: FlashSale) => {
    setEditingFlashSale(flashSale);
    form.setFieldsValue({
      session_id: flashSale.session_id,
      product_id: flashSale.product_id,
      flash_price: flashSale.flash_price,
      total_stock: flashSale.total_stock,
      sold: flashSale.sold,
      limit_per_user: flashSale.limit_per_user,
      sort_order: flashSale.sort_order,
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      const flashSaleData: any = {
        session_id: values.session_id,
        product_id: values.product_id,
        flash_price: values.flash_price,
        total_stock: values.total_stock,
        sold: values.sold || 0,
        limit_per_user: values.limit_per_user || 1,
        sort_order: values.sort_order || 1,
      };

      if (editingFlashSale && editingFlashSale.id) {
        await flashSaleService.updateFlashSale(editingFlashSale.id, flashSaleData);
        message.success('Cập nhật flash sale thành công');
      } else {
        await flashSaleService.createFlashSale(flashSaleData);
        message.success('Tạo flash sale thành công');
      }
      setIsModalVisible(false);
      form.resetFields();
      loadFlashSales();
    } catch (error: any) {
      console.error('Failed to save flash sale:', error);
      message.error(error.response?.data?.message || 'Không thể lưu flash sale');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleDelete = async (id: number) => {
    try {
      await flashSaleService.deleteFlashSale(id);
      message.success('Đã xóa flash sale');
      loadFlashSales();
    } catch (error: any) {
      console.error('Failed to delete flash sale:', error);
      message.error('Không thể xóa flash sale');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Sản phẩm',
      key: 'product',
      width: 250,
      render: (_: any, record: FlashSale) => (
        <Space>
          {record.product?.thumbnail && (
            <Image
              src={record.product.thumbnail}
              alt={record.product.name}
              width={50}
              height={50}
              style={{ objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <div>
            <Text strong>{record.product?.name || 'N/A'}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ID: {record.product_id}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Session',
      dataIndex: 'session_id',
      key: 'session_id',
      width: 150,
      render: (sessionId: string) => (
        <Tag color="blue">{sessionId}</Tag>
      ),
    },
    {
      title: 'Giá flash',
      dataIndex: 'flash_price',
      key: 'flash_price',
      width: 120,
      align: 'right' as const,
      render: (price: number) => (
        <Text strong style={{ color: '#ff4d4f' }}>
          {formatPrice(price)}
        </Text>
      ),
    },
    {
      title: 'Tồn kho',
      key: 'stock',
      width: 120,
      render: (_: any, record: FlashSale) => {
        const remaining = record.total_stock - record.sold;
        const isSoldOut = remaining <= 0;
        return (
          <div>
            <Text type={isSoldOut ? 'danger' : 'success'}>
              {remaining} / {record.total_stock}
            </Text>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Đã bán: {record.sold}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Giới hạn/người',
      dataIndex: 'limit_per_user',
      key: 'limit_per_user',
      width: 120,
      align: 'center' as const,
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 100,
      align: 'center' as const,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_: any, record: FlashSale) => {
        const remaining = record.total_stock - record.sold;
        if (remaining <= 0) {
          return <Tag color="red">Hết hàng</Tag>;
        } else if (remaining <= 5) {
          return <Tag color="orange">Sắp hết</Tag>;
        } else {
          return <Tag color="green">Còn hàng</Tag>;
        }
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: FlashSale) => (
        <Space size={0}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
            style={{ padding: '4px 8px' }}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa flash sale này?"
            description="Hành động này không thể hoàn tác"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              style={{ padding: '4px 8px' }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-flash-sales">
      <div className="flash-sales-header">
        <h1 className="page-title">Quản lý Flash Sales</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Thêm Flash Sale
        </Button>
      </div>

      <div className="flash-sales-filters">
        <Space size="middle" wrap>
          <Search
            placeholder="Tìm kiếm theo tên sản phẩm hoặc session"
            allowClear
            onSearch={handleSearch}
            onChange={(e) => {
              if (!e.target.value) {
                handleSearch('');
              }
            }}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Select
            style={{ width: 200 }}
            placeholder="Lọc theo session"
            value={sessionFilter}
            onChange={setSessionFilter}
            allowClear
          >
            <Option value="all">Tất cả session</Option>
            <Option value="morning">Morning</Option>
            <Option value="afternoon">Afternoon</Option>
            <Option value="evening">Evening</Option>
            <Option value="night">Night</Option>
          </Select>
          <Select
            style={{ width: 150 }}
            placeholder="Trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">Tất cả</Option>
            <Option value="available">Còn hàng</Option>
            <Option value="soldOut">Hết hàng</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadFlashSales}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={flashSales}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} flash sales`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize }));
          },
        }}
        scroll={{ x: 1200 }}
      />

      {/* Modal thêm/sửa flash sale */}
      <Modal
        title={editingFlashSale ? 'Chỉnh sửa Flash Sale' : 'Thêm Flash Sale mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={editingFlashSale ? 'Cập nhật' : 'Tạo'}
        cancelText="Hủy"
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="session_id"
                label="Session ID"
                rules={[{ required: true, message: 'Vui lòng nhập session ID' }]}
              >
                <Select placeholder="Chọn session">
                  <Option value="morning">Morning</Option>
                  <Option value="afternoon">Afternoon</Option>
                  <Option value="evening">Evening</Option>
                  <Option value="night">Night</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="product_id"
                label="ID Sản phẩm"
                rules={[
                  { required: true, message: 'Vui lòng nhập ID sản phẩm' },
                  { type: 'number', message: 'ID sản phẩm phải là số' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Nhập ID sản phẩm"
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="flash_price"
                label="Giá Flash Sale (VNĐ)"
                rules={[
                  { required: true, message: 'Vui lòng nhập giá flash sale' },
                  { type: 'number', min: 0, message: 'Giá phải >= 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Nhập giá flash sale"
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                  addonAfter="₫"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="total_stock"
                label="Tổng số lượng"
                rules={[
                  { required: true, message: 'Vui lòng nhập tổng số lượng' },
                  { type: 'number', min: 1, message: 'Số lượng phải >= 1' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Nhập tổng số lượng"
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sold"
                label="Đã bán"
                rules={[
                  { type: 'number', min: 0, message: 'Số lượng đã bán phải >= 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Nhập số lượng đã bán"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="limit_per_user"
                label="Giới hạn mỗi người"
                rules={[
                  { required: true, message: 'Vui lòng nhập giới hạn' },
                  { type: 'number', min: 1, message: 'Giới hạn phải >= 1' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Nhập giới hạn"
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="sort_order"
            label="Thứ tự sắp xếp"
            rules={[
              { required: true, message: 'Vui lòng nhập thứ tự' },
              { type: 'number', min: 1, message: 'Thứ tự phải >= 1' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Nhập thứ tự sắp xếp"
              min={1}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FlashSales;

