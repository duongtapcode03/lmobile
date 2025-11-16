/**
 * Admin Brands Management
 * Quản lý thương hiệu
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  message,
  Select,
  Switch,
  Modal,
  Form,
  Upload,
  Badge,
  Popconfirm
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import brandService from '../../../api/brandService';
import type { Brand } from '../../../types/brand.types';
import './Brands.scss';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

const Brands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadBrands();
  }, [isActiveFilter]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (isActiveFilter !== 'all') {
        filters.isActive = isActiveFilter === 'true';
      }
      
      if (searchText) {
        filters.search = searchText;
      }

      const response = await brandService.getBrands(filters);
      console.log('Brands response:', response);
      
      // Response format: { data: Brand[], total: number }
      const brandsData = response?.data || [];
      setBrands(Array.isArray(brandsData) ? brandsData : []);
    } catch (error: any) {
      console.error('Failed to load brands:', error);
      message.error(error?.response?.data?.message || 'Không thể tải danh sách thương hiệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadBrands();
  };

  const handleAdd = () => {
    setEditingBrand(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    form.setFieldsValue({
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logoUrl: brand.logoUrl,
      isActive: brand.isActive ?? true,
      sortOrder: brand.sortOrder,
      metaTitle: brand.metaTitle,
      metaDescription: brand.metaDescription,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await brandService.deleteBrand(id);
      message.success('Xóa thương hiệu thành công');
      loadBrands();
    } catch (error: any) {
      console.error('Failed to delete brand:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể xóa thương hiệu';
      message.error(errorMessage);
    }
  };

  const handleToggleActive = async (brand: Brand, isActive: boolean) => {
    try {
      await brandService.updateBrand(brand._id!, { isActive });
      message.success(`Đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} thương hiệu`);
      loadBrands();
    } catch (error: any) {
      console.error('Failed to update brand status:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể cập nhật trạng thái';
      message.error(errorMessage);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('Form values:', values);

      // Prepare data for backend
      const brandData: Partial<Brand> = {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        logoUrl: values.logoUrl || null,
        isActive: values.isActive ?? true,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
        metaTitle: values.metaTitle || null,
        metaDescription: values.metaDescription || null,
      };

      if (editingBrand) {
        // Update existing brand
        await brandService.updateBrand(editingBrand._id!, brandData);
        message.success('Cập nhật thương hiệu thành công');
      } else {
        // Create new brand
        await brandService.createBrand(brandData);
        message.success('Tạo thương hiệu thành công');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingBrand(null);
      loadBrands();
    } catch (error: any) {
      console.error('Failed to save brand:', error);
      if (error.errorFields) {
        // Validation errors
        message.error('Vui lòng kiểm tra lại thông tin');
      } else {
        const errorMessage = error?.response?.data?.message || error?.message || 'Không thể lưu thương hiệu';
        message.error(errorMessage);
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingBrand(null);
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: '_id',
      key: '_id',
      width: 80,
    },
    {
      title: 'Logo',
      key: 'logo',
      width: 100,
      render: (_: any, record: Brand) => (
        record.logoUrl ? (
          <img 
            src={record.logoUrl} 
            alt={record.name}
            style={{ width: 50, height: 50, objectFit: 'contain' }}
          />
        ) : (
          <div style={{ width: 50, height: 50, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No Logo
          </div>
        )
      ),
    },
    {
      title: 'Tên thương hiệu',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text ? (text.length > 50 ? `${text.substring(0, 50)}...` : text) : '-',
    },
    {
      title: 'Sắp xếp',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
      render: (order: number) => order || 0,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (isActive: boolean, record: Brand) => (
        <Space>
          <Badge 
            status={isActive ? 'success' : 'error'} 
            text={isActive ? 'Hoạt động' : 'Khóa'} 
          />
          <Switch
            checked={isActive}
            onChange={(checked) => handleToggleActive(record, checked)}
            size="small"
          />
        </Space>
      ),
    },
    {
      title: 'Số sản phẩm',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 120,
      render: (count: number) => count || 0,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: Brand) => (
        <Space size={0}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
            style={{ padding: '4px 8px' }}
          />
          <Popconfirm
            title="Xóa thương hiệu"
            description="Bạn có chắc chắn muốn xóa thương hiệu này?"
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
              style={{ padding: '4px 8px' }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-brands">
      <div className="brands-header">
        <h1 className="page-title">Quản lý thương hiệu</h1>
        <Space>
          <Search
            placeholder="Tìm kiếm theo tên, slug"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
          />
          <Select
            value={isActiveFilter}
            onChange={setIsActiveFilter}
            style={{ width: 150 }}
          >
            <Option value="all">Tất cả</Option>
            <Option value="true">Hoạt động</Option>
            <Option value="false">Khóa</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadBrands}>
            Làm mới
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
          >
            Thêm thương hiệu
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={brands}
        rowKey="_id"
        loading={loading}
        pagination={{
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} của ${total} thương hiệu`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />

      {/* Add/Edit Brand Modal */}
      <Modal
        title={editingBrand ? 'Sửa thương hiệu' : 'Thêm thương hiệu'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={700}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            isActive: true,
            sortOrder: 0,
          }}
        >
          <Form.Item
            name="name"
            label="Tên thương hiệu"
            rules={[{ required: true, message: 'Vui lòng nhập tên thương hiệu' }]}
          >
            <Input
              placeholder="Nhập tên thương hiệu"
              onChange={(e) => {
                const name = e.target.value;
                const slug = generateSlug(name);
                form.setFieldsValue({ slug });
              }}
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Slug"
            rules={[{ required: true, message: 'Vui lòng nhập slug' }]}
          >
            <Input placeholder="Nhập slug (tự động tạo từ tên)" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <TextArea
              rows={4}
              placeholder="Nhập mô tả thương hiệu"
            />
          </Form.Item>

          <Form.Item
            name="logoUrl"
            label="URL Logo"
          >
            <Input placeholder="Nhập URL logo thương hiệu" />
          </Form.Item>

          <Form.Item
            name="sortOrder"
            label="Thứ tự sắp xếp"
          >
            <Input type="number" placeholder="Nhập thứ tự sắp xếp" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
          </Form.Item>

          <Form.Item
            name="metaTitle"
            label="Meta Title (SEO)"
          >
            <Input placeholder="Nhập meta title cho SEO" />
          </Form.Item>

          <Form.Item
            name="metaDescription"
            label="Meta Description (SEO)"
          >
            <TextArea
              rows={3}
              placeholder="Nhập meta description cho SEO"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Brands;

