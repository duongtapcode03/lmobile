/**
 * Seller Blogs Management
 * Quản lý blog
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
  Badge,
  Popconfirm,
  Image
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  PushpinOutlined
} from '@ant-design/icons';
import blogService from '../../../api/blogService';
import type { Blog, BlogFilter } from '../../../types/blog.types';
import './Blogs.scss';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

const categoryOptions = [
  { value: 'news', label: 'Tin tức' },
  { value: 'review', label: 'Đánh giá' },
  { value: 'guide', label: 'Hướng dẫn' },
  { value: 'promotion', label: 'Khuyến mãi' },
  { value: 'technology', label: 'Công nghệ' },
  { value: 'tips', label: 'Mẹo vặt' }
];

const statusOptions = [
  { value: 'draft', label: 'Bản nháp' },
  { value: 'published', label: 'Đã xuất bản' },
  { value: 'archived', label: 'Đã lưu trữ' }
];

const Blogs: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    loadBlogs();
  }, [statusFilter, categoryFilter, pagination.current, pagination.pageSize]);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const filters: BlogFilter = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter as 'draft' | 'published' | 'archived';
      }
      
      if (categoryFilter !== 'all') {
        filters.category = [categoryFilter];
      }
      
      if (searchText) {
        filters.search = searchText;
      }

      // Use auth API to get all blogs including drafts and archived
      const response = await blogService.getBlogs(filters, true);
      console.log('Blogs response:', response);
      
      setBlogs(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
      }));
    } catch (error: any) {
      console.error('Failed to load blogs:', error);
      message.error(error?.response?.data?.message || 'Không thể tải danh sách blog');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    loadBlogs();
  };

  const handleAdd = () => {
    setEditingBlog(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'draft',
      category: 'news',
      isFeatured: false,
      isPinned: false,
      allowComments: true,
      isPublic: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    form.setFieldsValue({
      title: blog.title,
      subtitle: blog.subtitle,
      slug: blog.slug,
      content: blog.content,
      excerpt: blog.excerpt,
      category: blog.category || 'news',
      tags: blog.tags?.join(', ') || '',
      status: blog.status || 'draft',
      featuredImage: blog.featuredImage,
      isFeatured: blog.isFeatured || false,
      isPinned: blog.isPinned || false,
      allowComments: blog.allowComments ?? true,
      isPublic: blog.isPublic ?? true,
      seoTitle: blog.seoTitle,
      seoDescription: blog.seoDescription,
      seoKeywords: blog.seoKeywords?.join(', ') || '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await blogService.deleteBlog(id);
      message.success('Xóa blog thành công');
      loadBlogs();
    } catch (error: any) {
      console.error('Failed to delete blog:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể xóa blog';
      message.error(errorMessage);
    }
  };

  const handleToggleFeatured = async (blog: Blog) => {
    try {
      await blogService.toggleFeatured(blog._id!);
      message.success(`Đã ${blog.isFeatured ? 'bỏ đánh dấu' : 'đánh dấu'} nổi bật`);
      loadBlogs();
    } catch (error: any) {
      console.error('Failed to toggle featured:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể cập nhật trạng thái';
      message.error(errorMessage);
    }
  };

  const handleTogglePinned = async (blog: Blog) => {
    try {
      await blogService.togglePinned(blog._id!);
      message.success(`Đã ${blog.isPinned ? 'bỏ ghim' : 'ghim'} blog`);
      loadBlogs();
    } catch (error: any) {
      console.error('Failed to toggle pinned:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể cập nhật trạng thái';
      message.error(errorMessage);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('Form values:', values);

      // Prepare data for backend
      const blogData: Partial<Blog> = {
        title: values.title,
        subtitle: values.subtitle || null,
        slug: values.slug || null,
        content: values.content || null,
        excerpt: values.excerpt || null,
        category: values.category || 'news',
        tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
        status: values.status || 'draft',
        featuredImage: values.featuredImage || null,
        isFeatured: values.isFeatured || false,
        isPinned: values.isPinned || false,
        allowComments: values.allowComments ?? true,
        isPublic: values.isPublic ?? true,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        seoKeywords: values.seoKeywords ? values.seoKeywords.split(',').map((kw: string) => kw.trim()).filter(Boolean) : [],
      };

      if (editingBlog) {
        // Update existing blog
        await blogService.updateBlog(editingBlog._id!, blogData);
        message.success('Cập nhật blog thành công');
      } else {
        // Create new blog
        await blogService.createBlog(blogData);
        message.success('Tạo blog thành công');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingBlog(null);
      loadBlogs();
    } catch (error: any) {
      console.error('Failed to save blog:', error);
      if (error.errorFields) {
        // Validation errors
        message.error('Vui lòng kiểm tra lại thông tin');
      } else {
        const errorMessage = error?.response?.data?.message || error?.message || 'Không thể lưu blog';
        message.error(errorMessage);
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingBlog(null);
  };

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
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
      width: 100,
      render: (id: string) => id?.substring(0, 8) + '...',
    },
    {
      title: 'Ảnh',
      key: 'featuredImage',
      width: 100,
      render: (_: any, record: Blog) => (
        record.featuredImage ? (
          <Image
            src={record.featuredImage}
            alt={record.title}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            preview={false}
          />
        ) : (
          <div style={{ width: 60, height: 60, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No Image
          </div>
        )
      ),
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: Blog) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.subtitle && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{record.subtitle}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const option = categoryOptions.find(opt => opt.value === category);
        return <Tag color="blue">{option?.label || category}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          draft: { color: 'default', text: 'Bản nháp' },
          published: { color: 'success', text: 'Đã xuất bản' },
          archived: { color: 'warning', text: 'Đã lưu trữ' },
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: 'Nổi bật',
      dataIndex: 'isFeatured',
      key: 'isFeatured',
      width: 100,
      render: (isFeatured: boolean, record: Blog) => (
        <Button
          type={isFeatured ? 'primary' : 'default'}
          icon={<StarOutlined />}
          size="small"
          onClick={() => handleToggleFeatured(record)}
        >
          {isFeatured ? 'Có' : 'Không'}
        </Button>
      ),
    },
    {
      title: 'Ghim',
      dataIndex: 'isPinned',
      key: 'isPinned',
      width: 100,
      render: (isPinned: boolean, record: Blog) => (
        <Button
          type={isPinned ? 'primary' : 'default'}
          icon={<PushpinOutlined />}
          size="small"
          onClick={() => handleTogglePinned(record)}
        >
          {isPinned ? 'Có' : 'Không'}
        </Button>
      ),
    },
    {
      title: 'Lượt xem',
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: 100,
      render: (count: number) => count || 0,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: Blog) => (
        <Space size={0}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
            style={{ padding: '4px 8px' }}
          />
          <Popconfirm
            title="Xóa blog"
            description="Bạn có chắc chắn muốn xóa blog này?"
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
    <div className="seller-blogs">
      <div className="blogs-header">
        <h1 className="page-title">Quản lý blog</h1>
        <Space>
          <Search
            placeholder="Tìm kiếm blog"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Option value="all">Tất cả trạng thái</Option>
            {statusOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 150 }}
          >
            <Option value="all">Tất cả danh mục</Option>
            {categoryOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadBlogs}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm blog
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={blogs}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} của ${total} blog`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({
              ...prev,
              current: page,
              pageSize: pageSize || prev.pageSize,
            }));
          },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />

      {/* Blog Form Modal */}
      <Modal
        title={editingBlog ? 'Chỉnh sửa blog' : 'Thêm blog mới'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'draft',
            category: 'news',
            isFeatured: false,
            isPinned: false,
            allowComments: true,
            isPublic: true,
          }}
        >
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input
              placeholder="Nhập tiêu đề blog"
              onChange={(e) => {
                const title = e.target.value;
                if (!form.getFieldValue('slug')) {
                  form.setFieldsValue({ slug: generateSlug(title) });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="subtitle"
            label="Phụ đề"
          >
            <Input placeholder="Nhập phụ đề (tùy chọn)" />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Slug"
          >
            <Input placeholder="Slug sẽ được tạo tự động từ tiêu đề" />
          </Form.Item>

          <Form.Item
            name="excerpt"
            label="Tóm tắt"
          >
            <TextArea rows={3} placeholder="Nhập tóm tắt blog" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung"
          >
            <TextArea rows={8} placeholder="Nhập nội dung blog" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Danh mục"
            rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
          >
            <Select>
              {categoryOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags (phân cách bằng dấu phẩy)"
          >
            <Input placeholder="tag1, tag2, tag3" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select>
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="featuredImage"
            label="Ảnh đại diện (URL)"
          >
            <Input placeholder="Nhập URL ảnh đại diện" />
          </Form.Item>

          <Space style={{ width: '100%', marginBottom: 16 }}>
            <Form.Item
              name="isFeatured"
              valuePropName="checked"
              label="Nổi bật"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="isPinned"
              valuePropName="checked"
              label="Ghim"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="allowComments"
              valuePropName="checked"
              label="Cho phép bình luận"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="isPublic"
              valuePropName="checked"
              label="Công khai"
            >
              <Switch />
            </Form.Item>
          </Space>

          <Form.Item
            name="seoTitle"
            label="SEO Title"
          >
            <Input placeholder="Tiêu đề SEO" />
          </Form.Item>

          <Form.Item
            name="seoDescription"
            label="SEO Description"
          >
            <TextArea rows={2} placeholder="Mô tả SEO" />
          </Form.Item>

          <Form.Item
            name="seoKeywords"
            label="SEO Keywords (phân cách bằng dấu phẩy)"
          >
            <Input placeholder="keyword1, keyword2, keyword3" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Blogs;

