/**
 * Admin Products Management
 * Quản lý sản phẩm
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Image,
  Select,
  Row,
  Col,
  Card,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import phoneService from '../../../api/phoneService';
import brandService from '../../../api/brandService';
import categoryService from '../../../api/categoryService';
import type { PhoneDetail, PhoneListResponse } from '../../../types';
import type { Brand } from '../../../types';
import type { Category } from '../../../api/categoryService';
import './Products.scss';

const { Search } = Input;
const { Option } = Select;

const Products: React.FC = () => {
  const [products, setProducts] = useState<PhoneDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PhoneDetail | null>(null);
  const [form] = Form.useForm();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    loadProducts();
    loadBrands();
    loadCategories();
  }, [page, pageSize, searchText]);

  const loadBrands = async () => {
    try {
      setLoadingBrands(true);
      const response = await brandService.getBrands({ isActive: true });
      setBrands(response.data || []);
    } catch (error) {
      console.error('Failed to load brands:', error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await categoryService.getActiveCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response: PhoneListResponse = await phoneService.getPhones({
        page,
        limit: pageSize,
        ...(searchText && { search: searchText }),
      });
      setProducts(response.data || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      console.error('Failed to load products:', error);
      message.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (product: PhoneDetail) => {
    setEditingProduct(product);
    // Convert product data to form format
    // Parse price from string format (e.g., "24.990.000 ₫" or "24990000") to number for input
    let priceValue: number | undefined;
    if (product.price) {
      const priceStr = String(product.price).replace(/[^\d.]/g, '');
      priceValue = parseFloat(priceStr) || undefined;
    } else if (product.priceNumber) {
      priceValue = product.priceNumber;
    }
    
    // Đảm bảo brandRef và categoryRefs là Number (vì model sử dụng Number ID)
    // Xử lý cả trường hợp populated (object) và non-populated (number)
    let brandRefValue: number | undefined;
    if (typeof product.brandRef === 'number') {
      brandRefValue = product.brandRef;
    } else if (product.brandRef && typeof product.brandRef === 'object' && '_id' in product.brandRef) {
      // Nếu là object được populate, lấy _id
      brandRefValue = typeof product.brandRef._id === 'number' 
        ? product.brandRef._id 
        : parseInt(String(product.brandRef._id), 10);
    } else if (product.brandRef) {
      // Fallback: cố gắng parse như string
      const parsed = parseInt(String(product.brandRef), 10);
      brandRefValue = isNaN(parsed) ? undefined : parsed;
    }
    
    let categoryRefsValue: number[] = [];
    if (product.categoryRefs) {
      if (Array.isArray(product.categoryRefs)) {
        categoryRefsValue = product.categoryRefs.map((item: any) => {
          if (typeof item === 'number') {
            return item;
          } else if (item && typeof item === 'object' && '_id' in item) {
            // Nếu là object được populate, lấy _id
            return typeof item._id === 'number' ? item._id : parseInt(String(item._id), 10);
          } else {
            // Fallback: cố gắng parse
            const parsed = parseInt(String(item), 10);
            return isNaN(parsed) ? undefined : parsed;
          }
        }).filter((id: any): id is number => typeof id === 'number' && !isNaN(id));
      } else {
        // Nếu không phải array, chuyển thành array
        const singleValue = typeof product.categoryRefs === 'number' 
          ? product.categoryRefs 
          : parseInt(String(product.categoryRefs), 10);
        if (!isNaN(singleValue)) {
          categoryRefsValue = [singleValue];
        }
      }
    }
    
    const formValues: any = {
      ...product,
      brandRef: brandRefValue,
      categoryRefs: categoryRefsValue,
      price: priceValue, // Use price field for form input
      importPrice: product.importPrice || 0, // Thêm giá nhập
    };
    form.setFieldsValue(formValues);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number | string) => {
    try {
      await phoneService.deleteProduct(id);
      message.success('Xóa sản phẩm thành công');
      loadProducts();
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      message.error(error.response?.data?.message || 'Không thể xóa sản phẩm');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Convert form values to API format
      // Format price: convert number to formatted string (e.g., "24.990.000 ₫")
      const formatPrice = (value: number | string | undefined): string | undefined => {
        if (!value) return undefined;
        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(numValue)) return undefined;
        // Format as Vietnamese currency string
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(numValue);
      };

      // Calculate priceNumber from price input
      const priceNum = typeof values.price === 'number' 
        ? values.price 
        : (values.price ? parseFloat(String(values.price)) : undefined);
      
      // Tính oldPriceNumber nếu có
      const oldPriceNum = values.oldPrice 
        ? (typeof values.oldPrice === 'number' ? values.oldPrice : parseFloat(String(values.oldPrice)))
        : undefined;

      const productData: Partial<PhoneDetail> = {
        name: values.name,
        sku: values.sku,
        slug: values.slug || values.name?.toLowerCase().replace(/\s+/g, '-'),
        description: values.description,
        shortDescription: values.shortDescription,
        price: formatPrice(values.price), // Format price as string
        ...(priceNum && !isNaN(priceNum) && priceNum > 0 ? { priceNumber: priceNum } : {}), // Only include if valid
        oldPrice: values.oldPrice ? formatPrice(values.oldPrice) : undefined,
        ...(oldPriceNum && !isNaN(oldPriceNum) && oldPriceNum > 0 ? { oldPriceNumber: oldPriceNum } : {}),
        discount: values.discount,
        importPrice: values.importPrice ? Number(values.importPrice) : 0, // Thêm giá nhập
        brandRef: typeof values.brandRef === 'number' ? values.brandRef : parseInt(String(values.brandRef), 10),
        categoryRefs: values.categoryRefs ? (Array.isArray(values.categoryRefs) 
          ? values.categoryRefs.map((id: any) => typeof id === 'number' ? id : parseInt(String(id), 10))
          : [typeof values.categoryRefs === 'number' ? values.categoryRefs : parseInt(String(values.categoryRefs), 10)]) 
          : undefined,
        stock: values.stock ? Number(values.stock) : undefined,
        availability: values.availability !== undefined ? values.availability : 1,
        imageUrl: values.imageUrl,
        thumbnail: values.thumbnail || values.imageUrl,
        cpu: values.cpu,
        storage: values.storage,
        screenSize: values.screenSize,
        isActive: values.isActive !== undefined ? values.isActive : true,
      };
      
      // Remove undefined/null values to avoid validation issues
      Object.keys(productData).forEach(key => {
        if (productData[key as keyof PhoneDetail] === undefined || productData[key as keyof PhoneDetail] === null) {
          delete productData[key as keyof PhoneDetail];
        }
      });

      console.log('Product data to send:', productData);

      if (editingProduct && editingProduct._id) {
        await phoneService.updateProduct(editingProduct._id, productData);
        message.success('Cập nhật sản phẩm thành công');
      } else {
        // Backend sẽ tự động generate _id nếu không có
        await phoneService.createProduct(productData);
        message.success('Tạo sản phẩm thành công');
      }
      setIsModalVisible(false);
      form.resetFields();
      loadProducts();
    } catch (error: any) {
      console.error('Failed to save product:', error);
      console.error('Error response:', error.response?.data);
      console.error('Validation errors:', error.response?.data?.errors);
      
      // Show detailed validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map((err: any) => err.msg || err.message).join(', ');
        message.error(`Lỗi validation: ${errorMessages}`);
      } else {
        message.error(error.response?.data?.message || 'Không thể lưu sản phẩm');
      }
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Hình ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 100,
      render: (url: string) => (
        <Image
          src={url}
          alt=""
          width={60}
          height={60}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4="
        />
      ),
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      key: 'price',
      width: 150,
      render: (price: string | number | null | undefined) => {
        if (!price) return '-';
        // If price is already a formatted string, return it
        if (typeof price === 'string') {
          return price;
        }
        // If price is a number, format it
        if (typeof price === 'number') {
          return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(price);
        }
        return '-';
      },
    },
    {
      title: 'Giá nhập',
      dataIndex: 'importPrice',
      key: 'importPrice',
      width: 150,
      render: (importPrice: number | null | undefined) => {
        if (!importPrice && importPrice !== 0) return '-';
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(importPrice);
      },
    },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (stock: number) => (
        <Tag color={stock > 0 ? 'green' : 'red'}>{stock || 0}</Tag>
      ),
    },
    {
      title: 'Đã bán',
      dataIndex: 'sold',
      key: 'sold',
      width: 100,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Tạm dừng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: PhoneDetail) => (
        <Space size={0}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
            style={{ padding: '4px 8px' }}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa sản phẩm này?"
            description="Hành động này không thể hoàn tác"
            onConfirm={() => {
              if (record._id) {
                handleDelete(record._id);
              }
            }}
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
    <div className="admin-products">
      <Card>
        <div className="products-header">
          <h1 className="page-title">Quản lý sản phẩm</h1>
          <Space>
            <Search
              placeholder="Tìm kiếm sản phẩm..."
              allowClear
              style={{ width: 300 }}
              onSearch={(value) => {
                setSearchText(value);
                setPage(1);
              }}
              enterButton={<SearchOutlined />}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Thêm sản phẩm
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadProducts}>
              Làm mới
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={products}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} sản phẩm`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={900}
        okText="Lưu"
        cancelText="Hủy"
        okButtonProps={{ loading: loading }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tên sản phẩm"
                rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
              >
                <Input placeholder="Nhập tên sản phẩm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU"
                rules={[{ required: true, message: 'Vui lòng nhập SKU' }]}
              >
                <Input placeholder="Nhập SKU (ví dụ: IPHONE-17-PRO-MAX)" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="slug"
                label="Slug (URL)"
                tooltip="Để trống sẽ tự động tạo từ tên sản phẩm"
              >
                <Input placeholder="dien-thoai-iphone-17-pro-max" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="brandRef"
                label="Thương hiệu"
                rules={[{ required: true, message: 'Vui lòng chọn thương hiệu' }]}
              >
                <Select
                  placeholder="Chọn thương hiệu"
                  loading={loadingBrands}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={brands.map(brand => ({
                    value: brand._id,
                    label: brand.name,
                    key: brand._id
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="categoryRefs"
            label="Danh mục"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một danh mục' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn danh mục"
              loading={loadingCategories}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={categories.map(category => ({
                value: category._id,
                label: category.name,
                key: category._id
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="price"
                label="Giá bán (VNĐ)"
                rules={[{ required: true, message: 'Vui lòng nhập giá bán' }]}
              >
                <Input
                  type="number"
                  placeholder="Ví dụ: 24990000"
                  addonAfter="₫"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="importPrice"
                label="Giá nhập (VNĐ)"
                rules={[{ required: true, message: 'Vui lòng nhập giá nhập' }]}
              >
                <Input
                  type="number"
                  placeholder="Ví dụ: 20000000"
                  addonAfter="₫"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="oldPrice" label="Giá cũ (VNĐ)">
                <Input
                  type="number"
                  placeholder="Ví dụ: 29990000"
                  addonAfter="₫"
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="discount" label="Giảm giá (%)">
                <Input
                  type="number"
                  placeholder="Ví dụ: 10"
                  addonAfter="%"
                  min={0}
                  max={100}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="stock"
                label="Tồn kho"
                rules={[{ required: true, message: 'Vui lòng nhập số lượng tồn kho' }]}
              >
                <Input type="number" placeholder="0" min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="availability"
                label="Tình trạng"
                initialValue={1}
              >
                <Select>
                  <Option value={1}>Còn hàng</Option>
                  <Option value={0}>Hết hàng</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="isActive"
                label="Trạng thái"
                initialValue={true}
              >
                <Select>
                  <Option value={true}>Hoạt động</Option>
                  <Option value={false}>Tạm dừng</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="imageUrl" label="URL hình ảnh chính">
                <Input placeholder="https://example.com/image.jpg" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="thumbnail" label="URL thumbnail">
                <Input placeholder="https://example.com/thumbnail.jpg" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="cpu" label="CPU">
                <Input placeholder="Ví dụ: Apple A18 Pro" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="storage" label="Bộ nhớ">
                <Input placeholder="Ví dụ: 256GB" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="screenSize" label="Kích thước màn hình">
                <Input placeholder="Ví dụ: 6.7 inch" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="shortDescription" label="Mô tả ngắn">
            <Input.TextArea
              rows={2}
              placeholder="Mô tả ngắn về sản phẩm"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả chi tiết">
            <Input.TextArea
              rows={6}
              placeholder="Mô tả chi tiết về sản phẩm"
              maxLength={5000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;






