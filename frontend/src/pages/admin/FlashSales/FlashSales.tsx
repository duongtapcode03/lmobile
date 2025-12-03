/**
 * Admin Flash Sales Management
 * Quản lý flash sales với form đầy đủ
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
  DatePicker,
  InputNumber,
  Tag,
  Popconfirm,
  Row,
  Col,
  Card,
  Statistic,
  Descriptions,
  Tabs,
  Image,
  Typography,
  Divider,
  Checkbox,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  EyeOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import flashSaleService, { type FlashSale, type FlashSaleItem } from '../../../api/flashSaleService';
import phoneService from '../../../api/phoneService';
import type { PhoneDetail } from '../../../types';
import { useToast } from '../../../hooks/useToast';
import './FlashSales.scss';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

const FlashSales: React.FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<FlashSale | null>(null);
  const [editingItem, setEditingItem] = useState<FlashSaleItem | null>(null);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedFlashSale, setSelectedFlashSale] = useState<FlashSale | null>(null);
  const [flashSaleItems, setFlashSaleItems] = useState<FlashSaleItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [products, setProducts] = useState<PhoneDetail[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearchText, setProductSearchText] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Map<number, { product: PhoneDetail; flash_price: number; flash_stock: number; limit_per_user: number; sort_order: number }>>(new Map());
  const toast = useToast();

  useEffect(() => {
    loadFlashSales();
    loadStats();
  }, [pagination.current, pagination.pageSize, statusFilter]);

  // Auto-refresh flash sale items khi modal chi tiết mở
  useEffect(() => {
    if (detailModalVisible && selectedFlashSale?._id) {
      // Load ngay khi mở modal
      loadFlashSaleItems(selectedFlashSale._id);
      
      // Auto-refresh mỗi 10 giây khi modal đang mở
      const interval = setInterval(() => {
        if (detailModalVisible && selectedFlashSale?._id) {
          loadFlashSaleItems(selectedFlashSale._id);
        }
      }, 10000); // Refresh mỗi 10 giây

      return () => clearInterval(interval);
    }
  }, [detailModalVisible, selectedFlashSale?._id]);

  const loadFlashSales = async () => {
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

      const response = await flashSaleService.getFlashSales(params);
      
      // Debug: Log raw response
      console.log(`[Admin FlashSale] Raw response:`, response);
      console.log(`[Admin FlashSale] Response data:`, response.data?.map((fs: FlashSale) => ({
        _id: fs._id,
        name: fs.name,
        itemsCount: fs.itemsCount,
        itemsCountType: typeof fs.itemsCount
      })));
      
      // Filter by search text if provided
      let filteredData = response.data || [];
      if (searchText) {
        filteredData = filteredData.filter((item: FlashSale) => {
          const name = item.name?.toLowerCase() || '';
          return name.includes(searchText.toLowerCase());
        });
      }

      // Đảm bảo itemsCount được set đúng
      // Backend đã tính itemsCount bằng aggregation, nên nên có sẵn
      const flashSalesWithCount = filteredData.map((flashSale: FlashSale) => {
        // Kiểm tra và đảm bảo itemsCount là số hợp lệ
        let itemsCount = flashSale.itemsCount;
        
        // Debug: Log để kiểm tra
        if (itemsCount === undefined || itemsCount === null) {
          console.warn(`[Admin FlashSale] itemsCount is ${itemsCount} for flash sale ${flashSale._id} (${flashSale.name}). Full object:`, flashSale);
        }
        
        if (itemsCount === undefined || itemsCount === null || isNaN(Number(itemsCount))) {
          itemsCount = 0;
        }
        const normalizedCount = Number(itemsCount);
        
        // Debug log để kiểm tra
        if (normalizedCount === 0 && flashSale._id) {
          console.log(`[Admin FlashSale] Warning: itemsCount is 0 for flash sale ${flashSale._id} (${flashSale.name}). Original value:`, flashSale.itemsCount);
        }
        
        return {
          ...flashSale,
          itemsCount: normalizedCount,
        };
      });
      
      // Debug: Log tổng quan
      console.log(`[Admin FlashSale] Loaded ${flashSalesWithCount.length} flash sales. ItemsCount summary:`, 
        flashSalesWithCount.map(fs => ({ id: fs._id, name: fs.name, itemsCount: fs.itemsCount }))
      );

      setFlashSales(flashSalesWithCount);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination!.totalItems,
        }));
      }
    } catch (error: any) {
      console.error('Failed to load flash sales:', error);
      toast.error('Không thể tải danh sách flash sales');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const statsData = await flashSaleService.getStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadFlashSaleItems = async (flashSaleId: string) => {
    try {
      setItemsLoading(true);
      const response = await flashSaleService.getFlashSaleItems(flashSaleId);
      const items = response.data || [];
      
      // Debug: Log để kiểm tra data
      console.log('[Admin FlashSale] Loaded items:', items.map((item: FlashSaleItem) => ({
        product_id: item.product_id,
        flash_stock: item.flash_stock,
        sold: item.sold,
        reserved: item.reserved,
        availableStock: item.availableStock,
        remainingStock: item.remainingStock
      })));
      
      setFlashSaleItems(items);
    } catch (error: any) {
      console.error('Failed to load flash sale items:', error);
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setItemsLoading(false);
    }
  };

  const searchProducts = async (search: string) => {
    if (!search || search.length < 2) {
      setProducts([]);
      return;
    }
    try {
      setProductsLoading(true);
      const response = await phoneService.getPhones({
        page: 1,
        limit: 20,
        search,
      });
      setProducts(response.data || []);
    } catch (error: any) {
      console.error('Failed to search products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleAdd = () => {
    setEditingFlashSale(null);
    form.resetFields();
    // Đảm bảo không có _id trong form
    form.setFieldsValue({
      status: 'inactive', // Mặc định là inactive, sẽ tự kích hoạt khi đến thời gian
      _id: undefined, // Đảm bảo không có _id
    });
    setIsModalVisible(true);
  };

  const handleEdit = (flashSale: FlashSale) => {
    setEditingFlashSale(flashSale);
    form.setFieldsValue({
      name: flashSale.name,
      description: flashSale.description,
      start_time: flashSale.start_time ? dayjs(flashSale.start_time) : undefined,
      end_time: flashSale.end_time ? dayjs(flashSale.end_time) : undefined,
      status: flashSale.status,
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      // Loại bỏ _id và các field không cần thiết khi tạo mới
      const flashSaleData: any = {
        name: values.name,
        description: values.description,
        start_time: values.start_time.toISOString(),
        end_time: values.end_time.toISOString(),
        status: values.status || 'inactive',
      };

      // Đảm bảo không gửi _id khi tạo mới
      if (values._id) {
        delete flashSaleData._id;
      }

      if (editingFlashSale && editingFlashSale._id) {
        await flashSaleService.updateFlashSale(editingFlashSale._id, flashSaleData);
        toast.success('Cập nhật flash sale thành công');
      } else {
        // Đảm bảo không có _id khi tạo mới
        delete flashSaleData._id;
        await flashSaleService.createFlashSale(flashSaleData);
        toast.success('Tạo flash sale thành công');
      }
      setIsModalVisible(false);
      setEditingFlashSale(null);
      form.resetFields();
      loadFlashSales();
    } catch (error: any) {
      console.error('Failed to save flash sale:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu flash sale');
    }
  };

  const handleAddItem = (flashSale: FlashSale) => {
    setEditingFlashSale(flashSale);
    setEditingItem(null);
    itemForm.resetFields();
    itemForm.setFieldsValue({
      limit_per_user: 1,
      sort_order: 1,
      flash_price: undefined,
      flash_stock: undefined,
    });
    setProductSearchText('');
    setProducts([]);
    setSelectedProducts(new Map());
    setIsItemModalVisible(true);
  };

  const handleEditItem = (item: FlashSaleItem) => {
    setEditingItem(item);
    itemForm.setFieldsValue({
      product_id: item.product_id,
      flash_price: item.flash_price,
      flash_stock: item.flash_stock,
      limit_per_user: item.limit_per_user,
      sort_order: item.sort_order,
    });
    setProductSearchText(item.product?.name || '');
    setIsItemModalVisible(true);
  };

  const handleItemModalOk = async () => {
    try {
      if (editingItem && editingItem._id) {
        // Chế độ sửa sản phẩm đơn lẻ
        const values = await itemForm.validateFields();
        
        if (!editingFlashSale?._id) {
          toast.error('Vui lòng chọn flash sale');
          return;
        }

        const itemData: any = {
          product_id: values.product_id,
          flash_price: values.flash_price,
          flash_stock: values.flash_stock,
          limit_per_user: values.limit_per_user || 1,
          sort_order: values.sort_order || 1,
        };

        await flashSaleService.updateFlashSaleItem(editingItem._id, itemData);
        toast.success('Cập nhật sản phẩm thành công');
        setIsItemModalVisible(false);
        itemForm.resetFields();
        if (selectedFlashSale?._id === editingFlashSale._id) {
          loadFlashSaleItems(editingFlashSale._id);
        }
        loadFlashSales();
      } else {
        // Chế độ thêm nhiều sản phẩm
        if (selectedProducts.size === 0) {
          toast.error('Vui lòng chọn ít nhất một sản phẩm');
          return;
        }

        const values = await itemForm.validateFields(['flash_price', 'flash_stock', 'limit_per_user', 'sort_order']);
        
        if (!editingFlashSale?._id) {
          toast.error('Vui lòng chọn flash sale');
          return;
        }

        // Thêm từng sản phẩm với giá trị mặc định hoặc giá trị riêng
        let successCount = 0;
        let errorCount = 0;
        let currentSortOrder = values.sort_order || 1;

        for (const [productId, productData] of selectedProducts.entries()) {
          try {
            const itemData: any = {
              product_id: productId,
              flash_price: productData.flash_price || values.flash_price,
              flash_stock: productData.flash_stock || values.flash_stock,
              limit_per_user: productData.limit_per_user || values.limit_per_user || 1,
              sort_order: productData.sort_order || currentSortOrder++,
            };

            await flashSaleService.addProductToFlashSale(editingFlashSale._id, itemData);
            successCount++;
          } catch (error: any) {
            console.error(`Failed to add product ${productId}:`, error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Đã thêm ${successCount} sản phẩm vào flash sale${errorCount > 0 ? ` (${errorCount} lỗi)` : ''}`);
        } else {
          toast.error('Không thể thêm sản phẩm nào');
        }

        setIsItemModalVisible(false);
        itemForm.resetFields();
        setSelectedProducts(new Map());
        if (selectedFlashSale?._id === editingFlashSale._id) {
          loadFlashSaleItems(editingFlashSale._id);
        }
        loadFlashSales();
      }
    } catch (error: any) {
      console.error('Failed to save item:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu sản phẩm');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await flashSaleService.deleteFlashSale(id);
      toast.success('Đã xóa flash sale');
      loadFlashSales();
    } catch (error: any) {
      console.error('Failed to delete flash sale:', error);
      toast.error('Không thể xóa flash sale');
    }
  };

  const handleDeleteItem = async (flashSaleId: string, productId: number) => {
    try {
      await flashSaleService.removeProductFromFlashSale(flashSaleId, productId);
      toast.success('Đã xóa sản phẩm khỏi flash sale');
      if (selectedFlashSale?._id === flashSaleId) {
        loadFlashSaleItems(flashSaleId);
      }
      loadFlashSales();
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      toast.error('Không thể xóa sản phẩm');
    }
  };

  const handleViewDetail = async (flashSale: FlashSale) => {
    setSelectedFlashSale(flashSale);
    setDetailModalVisible(true);
    await loadFlashSaleItems(flashSale._id!);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return dayjs(date).format('DD/MM/YYYY HH:mm');
  };

  const getStatusTag = (flashSale: FlashSale) => {
    const status = flashSale.actualStatus || flashSale.status;
    const statusMap: Record<string, { text: string; color: string }> = {
      scheduled: { text: 'Chờ kích hoạt', color: 'blue' },
      active: { text: 'Đang diễn ra', color: 'green' },
      ended: { text: 'Đã kết thúc', color: 'default' },
      inactive: { text: 'Tạm dừng', color: 'orange' },
    };
    const statusInfo = statusMap[status] || { text: status, color: 'default' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const columns = [
    {
      title: 'Tên Flash Sale',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Thời gian',
      key: 'time',
      width: 300,
      render: (_: any, record: FlashSale) => (
        <div>
          <div>
            <Text type="secondary">Bắt đầu: </Text>
            <Text>{formatDate(record.start_time)}</Text>
          </div>
          <div>
            <Text type="secondary">Kết thúc: </Text>
            <Text>{formatDate(record.end_time)}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Số sản phẩm',
      dataIndex: 'itemsCount',
      key: 'itemsCount',
      width: 120,
      align: 'center' as const,
      render: (count: number | undefined, record: FlashSale) => {
        // Lấy itemsCount từ record nếu count không có
        let itemsCount: number;
        if (count !== undefined && count !== null && !isNaN(Number(count))) {
          itemsCount = Number(count);
        } else if (record.itemsCount !== undefined && record.itemsCount !== null && !isNaN(Number(record.itemsCount))) {
          itemsCount = Number(record.itemsCount);
        } else {
          itemsCount = 0;
        }
        
        // Debug log nếu itemsCount = 0 nhưng có thể có sản phẩm
        if (itemsCount === 0 && record._id) {
          console.log(`[Admin FlashSale] Render: itemsCount is 0 for flash sale ${record._id} (${record.name}). Count param:`, count, 'Record itemsCount:', record.itemsCount);
        }
        
        return <Text strong={itemsCount > 0 ? true : false}>{itemsCount}</Text>;
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 150,
      render: (_: any, record: FlashSale) => getStatusTag(record),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: FlashSale) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            size="small"
          >
            Chi tiết
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa flash sale này?"
            description="Hành động này không thể hoàn tác"
            onConfirm={() => handleDelete(record._id!)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-flash-sales">
      <div className="flash-sales-header">
        <Title level={2}>Quản lý Flash Sales</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Tạo Flash Sale
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng Flash Sales"
                value={stats.totalFlashSales || 0}
                prefix={<ShoppingOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Đang diễn ra"
                value={stats.activeFlashSales || 0}
                valueStyle={{ color: '#3f8600' }}
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Chờ kích hoạt"
                value={stats.scheduledFlashSales || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Đã kết thúc"
                value={stats.endedFlashSales || 0}
                valueStyle={{ color: '#999' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <div className="flash-sales-filters">
        <Space size="middle" wrap>
          <Search
            placeholder="Tìm kiếm theo tên flash sale"
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
            placeholder="Lọc theo trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">Tất cả</Option>
            <Option value="scheduled">Chờ kích hoạt</Option>
            <Option value="active">Đang diễn ra</Option>
            <Option value="ended">Đã kết thúc</Option>
            <Option value="inactive">Tạm dừng</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadFlashSales}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={flashSales}
        rowKey="_id"
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

      {/* Modal tạo/sửa flash sale */}
      <Modal
        title={editingFlashSale ? 'Chỉnh sửa Flash Sale' : 'Tạo Flash Sale mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        okText={editingFlashSale ? 'Cập nhật' : 'Tạo'}
        cancelText="Hủy"
        width={700}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Tên Flash Sale"
            rules={[{ required: true, message: 'Vui lòng nhập tên flash sale' }]}
          >
            <Input placeholder="Nhập tên flash sale" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <TextArea rows={3} placeholder="Nhập mô tả (tùy chọn)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="start_time"
                label="Thời gian bắt đầu"
                rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu' }]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn thời gian bắt đầu"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="end_time"
                label="Thời gian kết thúc"
                rules={[{ required: true, message: 'Vui lòng chọn thời gian kết thúc' }]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn thời gian kết thúc"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="Trạng thái"
            tooltip="inactive: Chờ kích hoạt tự động khi đến thời gian bắt đầu"
          >
            <Select>
              <Option value="inactive">Chờ kích hoạt</Option>
              <Option value="active">Kích hoạt ngay</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal thêm/sửa sản phẩm */}
      <Modal
        title={editingItem ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm vào Flash Sale'}
        open={isItemModalVisible}
        onOk={handleItemModalOk}
        onCancel={() => {
          setIsItemModalVisible(false);
          itemForm.resetFields();
          setProductSearchText('');
          setProducts([]);
          setSelectedProducts(new Map());
        }}
        okText={editingItem ? 'Cập nhật' : `Thêm ${selectedProducts.size > 0 ? `${selectedProducts.size} sản phẩm` : ''}`}
        cancelText="Hủy"
        width={editingItem ? 600 : 900}
        destroyOnHidden
      >
        {editingItem ? (
          // Chế độ sửa sản phẩm đơn lẻ
          <Form
            form={itemForm}
            layout="vertical"
          >
            <Form.Item
              name="product_id"
              label="Sản phẩm"
              rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}
            >
              <Select
                showSearch
                placeholder="Tìm kiếm sản phẩm"
                notFoundContent={productsLoading ? 'Đang tải...' : 'Không tìm thấy'}
                filterOption={false}
                onSearch={searchProducts}
                onSelect={(value) => {
                  const product = products.find(p => p._id === value);
                  if (product) {
                    setProductSearchText(product.name);
                  }
                }}
                value={productSearchText ? itemForm.getFieldValue('product_id') : undefined}
              >
                {products.map(product => (
                  <Option key={product._id} value={product._id}>
                    <Space>
                      {product.thumbnail && (
                        <Image src={product.thumbnail} width={40} height={40} style={{ objectFit: 'cover' }} />
                      )}
                      <div>
                        <div>{product.name}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatPrice(product.priceNumber || 0)}
                        </Text>
                      </div>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

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
                  name="flash_stock"
                  label="Số lượng Flash Sale"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số lượng' },
                    { type: 'number', min: 1, message: 'Số lượng phải >= 1' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập số lượng"
                    min={1}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
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
              <Col span={12}>
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
                    placeholder="Nhập thứ tự"
                    min={1}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        ) : (
          // Chế độ thêm nhiều sản phẩm
          <div>
            <Form
              form={itemForm}
              layout="vertical"
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item label="Tìm kiếm sản phẩm">
                    <Search
                      placeholder="Nhập tên sản phẩm để tìm kiếm"
                      allowClear
                      onSearch={searchProducts}
                      loading={productsLoading}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Danh sách sản phẩm để chọn */}
              {products.length > 0 && (
                <div style={{ marginBottom: 24, maxHeight: '300px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '4px', padding: '8px' }}>
                  <Table
                    dataSource={products}
                    rowKey="_id"
                    pagination={false}
                    size="small"
                    rowSelection={{
                      type: 'checkbox',
                      selectedRowKeys: Array.from(selectedProducts.keys()),
                      onSelect: (record, selected) => {
                        const productId = record._id;
                        const newSelected = new Map(selectedProducts);
                        if (selected) {
                          // Lấy giá trị mặc định từ form hoặc giá gốc của sản phẩm
                          const defaultPrice = itemForm.getFieldValue('flash_price') || record.priceNumber || 0;
                          const defaultStock = itemForm.getFieldValue('flash_stock') || 1;
                          const defaultLimit = itemForm.getFieldValue('limit_per_user') || 1;
                          const defaultSort = itemForm.getFieldValue('sort_order') || 1;
                          
                          newSelected.set(productId, {
                            product: record,
                            flash_price: defaultPrice,
                            flash_stock: defaultStock,
                            limit_per_user: defaultLimit,
                            sort_order: defaultSort,
                          });
                        } else {
                          newSelected.delete(productId);
                        }
                        setSelectedProducts(newSelected);
                      },
                      onSelectAll: (selected, selectedRows, changeRows) => {
                        const newSelected = new Map(selectedProducts);
                        if (selected) {
                          const defaultPrice = itemForm.getFieldValue('flash_price') || 0;
                          const defaultStock = itemForm.getFieldValue('flash_stock') || 1;
                          const defaultLimit = itemForm.getFieldValue('limit_per_user') || 1;
                          const defaultSort = itemForm.getFieldValue('sort_order') || 1;
                          
                          changeRows.forEach(record => {
                            newSelected.set(record._id, {
                              product: record,
                              flash_price: defaultPrice || record.priceNumber || 0,
                              flash_stock: defaultStock,
                              limit_per_user: defaultLimit,
                              sort_order: defaultSort,
                            });
                          });
                        } else {
                          changeRows.forEach(record => {
                            newSelected.delete(record._id);
                          });
                        }
                        setSelectedProducts(newSelected);
                      },
                    }}
                    columns={[
                      {
                        title: 'Sản phẩm',
                        key: 'product',
                        render: (_: any, record: PhoneDetail) => (
                          <Space>
                            {record.thumbnail && (
                              <Image src={record.thumbnail} width={40} height={40} style={{ objectFit: 'cover' }} />
                            )}
                            <div>
                              <div>{record.name}</div>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {formatPrice(record.priceNumber || 0)}
                              </Text>
                            </div>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              )}

              {selectedProducts.size > 0 && (
                <>
                  <Divider>Giá trị mặc định cho tất cả sản phẩm đã chọn</Divider>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="flash_price"
                        label="Giá Flash Sale (VNĐ) - Mặc định"
                        rules={[{ type: 'number', min: 0, message: 'Giá phải >= 0' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder="Nhập giá mặc định"
                          min={0}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                          addonAfter="₫"
                          onChange={(value) => {
                            // Cập nhật giá cho tất cả sản phẩm đã chọn
                            const newSelected = new Map(selectedProducts);
                            newSelected.forEach((data, productId) => {
                              newSelected.set(productId, { ...data, flash_price: value || 0 });
                            });
                            setSelectedProducts(newSelected);
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="flash_stock"
                        label="Số lượng Flash Sale - Mặc định"
                        rules={[{ type: 'number', min: 1, message: 'Số lượng phải >= 1' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder="Nhập số lượng mặc định"
                          min={1}
                          onChange={(value) => {
                            const newSelected = new Map(selectedProducts);
                            newSelected.forEach((data, productId) => {
                              newSelected.set(productId, { ...data, flash_stock: value || 1 });
                            });
                            setSelectedProducts(newSelected);
                          }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="limit_per_user"
                        label="Giới hạn mỗi người - Mặc định"
                        rules={[{ type: 'number', min: 1, message: 'Giới hạn phải >= 1' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder="Nhập giới hạn mặc định"
                          min={1}
                          onChange={(value) => {
                            const newSelected = new Map(selectedProducts);
                            newSelected.forEach((data, productId) => {
                              newSelected.set(productId, { ...data, limit_per_user: value || 1 });
                            });
                            setSelectedProducts(newSelected);
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="sort_order"
                        label="Thứ tự sắp xếp bắt đầu - Mặc định"
                        rules={[{ type: 'number', min: 1, message: 'Thứ tự phải >= 1' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder="Nhập thứ tự bắt đầu"
                          min={1}
                          onChange={(value) => {
                            // Tự động tăng sort_order cho từng sản phẩm
                            const newSelected = new Map(selectedProducts);
                            let currentSort = value || 1;
                            Array.from(newSelected.keys()).forEach((productId) => {
                              newSelected.set(productId, { ...newSelected.get(productId)!, sort_order: currentSort++ });
                            });
                            setSelectedProducts(newSelected);
                          }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider>Danh sách sản phẩm đã chọn ({selectedProducts.size})</Divider>
                  <Table
                    dataSource={Array.from(selectedProducts.entries()).map(([productId, data]) => ({
                      key: productId,
                      productId,
                      ...data,
                    }))}
                    rowKey="productId"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: 'Sản phẩm',
                        key: 'product',
                        render: (_: any, record: any) => (
                          <Space>
                            {record.product.thumbnail && (
                              <Image src={record.product.thumbnail} width={40} height={40} style={{ objectFit: 'cover' }} />
                            )}
                            <div>
                              <div>{record.product.name}</div>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                Giá gốc: {formatPrice(record.product.priceNumber || 0)}
                              </Text>
                            </div>
                          </Space>
                        ),
                      },
                      {
                        title: 'Giá Flash Sale',
                        dataIndex: 'flash_price',
                        key: 'flash_price',
                        width: 150,
                        render: (price: number, record: any) => (
                          <InputNumber
                            value={price}
                            min={0}
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                            addonAfter="₫"
                            style={{ width: '100%' }}
                            onChange={(value) => {
                              const newSelected = new Map(selectedProducts);
                              const current = newSelected.get(record.productId);
                              if (current) {
                                newSelected.set(record.productId, { ...current, flash_price: value || 0 });
                                setSelectedProducts(newSelected);
                              }
                            }}
                          />
                        ),
                      },
                      {
                        title: 'Số lượng',
                        dataIndex: 'flash_stock',
                        key: 'flash_stock',
                        width: 120,
                        render: (stock: number, record: any) => (
                          <InputNumber
                            value={stock}
                            min={1}
                            style={{ width: '100%' }}
                            onChange={(value) => {
                              const newSelected = new Map(selectedProducts);
                              const current = newSelected.get(record.productId);
                              if (current) {
                                newSelected.set(record.productId, { ...current, flash_stock: value || 1 });
                                setSelectedProducts(newSelected);
                              }
                            }}
                          />
                        ),
                      },
                      {
                        title: 'Giới hạn',
                        dataIndex: 'limit_per_user',
                        key: 'limit_per_user',
                        width: 100,
                        render: (limit: number, record: any) => (
                          <InputNumber
                            value={limit}
                            min={1}
                            style={{ width: '100%' }}
                            onChange={(value) => {
                              const newSelected = new Map(selectedProducts);
                              const current = newSelected.get(record.productId);
                              if (current) {
                                newSelected.set(record.productId, { ...current, limit_per_user: value || 1 });
                                setSelectedProducts(newSelected);
                              }
                            }}
                          />
                        ),
                      },
                      {
                        title: 'Thứ tự',
                        dataIndex: 'sort_order',
                        key: 'sort_order',
                        width: 100,
                        render: (sort: number, record: any) => (
                          <InputNumber
                            value={sort}
                            min={1}
                            style={{ width: '100%' }}
                            onChange={(value) => {
                              const newSelected = new Map(selectedProducts);
                              const current = newSelected.get(record.productId);
                              if (current) {
                                newSelected.set(record.productId, { ...current, sort_order: value || 1 });
                                setSelectedProducts(newSelected);
                              }
                            }}
                          />
                        ),
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        width: 80,
                        render: (_: any, record: any) => (
                          <Button
                            type="text"
                            danger
                            size="small"
                            onClick={() => {
                              const newSelected = new Map(selectedProducts);
                              newSelected.delete(record.productId);
                              setSelectedProducts(newSelected);
                            }}
                          >
                            Xóa
                          </Button>
                        ),
                      },
                    ]}
                  />
                </>
              )}

              {products.length === 0 && !productsLoading && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  Nhập tên sản phẩm để tìm kiếm
                </div>
              )}

              {productsLoading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spin />
                </div>
              )}
            </Form>
          </div>
        )}
      </Modal>

      {/* Modal chi tiết flash sale */}
      <Modal
        title={`Chi tiết Flash Sale: ${selectedFlashSale?.name}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedFlashSale(null);
          setFlashSaleItems([]);
        }}
        footer={[
          <Button 
            key="refresh" 
            icon={<ReloadOutlined />} 
            onClick={() => selectedFlashSale && loadFlashSaleItems(selectedFlashSale._id!)}
            loading={itemsLoading}
          >
            Làm mới
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => selectedFlashSale && handleAddItem(selectedFlashSale)}>
            Thêm sản phẩm
          </Button>,
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedFlashSale(null);
            setFlashSaleItems([]);
          }}>
            Đóng
          </Button>,
        ]}
        width={1000}
        destroyOnHidden
      >
        {selectedFlashSale && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Tên">{selectedFlashSale.name}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{getStatusTag(selectedFlashSale)}</Descriptions.Item>
              <Descriptions.Item label="Thời gian bắt đầu">{formatDate(selectedFlashSale.start_time)}</Descriptions.Item>
              <Descriptions.Item label="Thời gian kết thúc">{formatDate(selectedFlashSale.end_time)}</Descriptions.Item>
              {selectedFlashSale.description && (
                <Descriptions.Item label="Mô tả" span={2}>{selectedFlashSale.description}</Descriptions.Item>
              )}
            </Descriptions>

            <Divider>Sản phẩm trong Flash Sale</Divider>

            <Table
              columns={[
                {
                  title: 'Sản phẩm',
                  key: 'product',
                  width: 250,
                  render: (_: any, record: FlashSaleItem) => (
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
                  title: 'Số lượng',
                  key: 'stock',
                  width: 150,
                  render: (_: any, record: FlashSaleItem) => {
                    // Đảm bảo reserved và sold luôn là số
                    const reserved = typeof record.reserved === 'number' ? record.reserved : 0;
                    const sold = typeof record.sold === 'number' ? record.sold : 0;
                    const flash_stock = typeof record.flash_stock === 'number' ? record.flash_stock : 0;
                    const available = record.availableStock ?? (flash_stock - sold - reserved);
                    const isSoldOut = available <= 0;
                    return (
                      <div>
                        <Text type={isSoldOut ? 'danger' : 'success'}>
                          Còn: {available} / {flash_stock}
                        </Text>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          Đã bán: {sold} | Giữ chỗ: {reserved}
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
                  title: 'Thao tác',
                  key: 'action',
                  width: 120,
                  render: (_: any, record: FlashSaleItem) => (
                    <Space size="small">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditItem(record)}
                        size="small"
                      />
                      <Popconfirm
                        title="Xóa sản phẩm khỏi flash sale?"
                        onConfirm={() => selectedFlashSale._id && handleDeleteItem(selectedFlashSale._id, record.product_id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                        />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
              dataSource={flashSaleItems}
              rowKey="_id"
              loading={itemsLoading}
              pagination={false}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FlashSales;
