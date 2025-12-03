/**
 * Admin Banners Management
 * Quản lý banners
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Image,
  Input,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import bannerService from '../../../api/bannerService';
import type { Banner } from '../../../components/BannerCarousel';
import './Banners.scss';

const Banners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const response = await bannerService.getBanners();
      setBanners(response.data || []);
    } catch (error: any) {
      console.error('Failed to load banners:', error);
      message.error('Không thể tải danh sách banners');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBanner(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    form.setFieldsValue(banner);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!id || typeof id !== 'string') {
      message.error('ID banner không hợp lệ');
      return;
    }
    
    try {
      await bannerService.deleteBanner(id.trim());
      message.success('Xóa banner thành công');
      loadBanners();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể xóa banner';
      message.error(errorMessage);
      console.error('Delete banner error:', error);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingBanner) {
        if (!editingBanner._id) {
          message.error('ID banner không hợp lệ');
          return;
        }
        await bannerService.updateBanner(editingBanner._id.trim(), values);
        message.success('Cập nhật banner thành công');
      } else {
        await bannerService.createBanner(values);
        message.success('Tạo banner thành công');
      }
      setIsModalVisible(false);
      loadBanners();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra';
      message.error(errorMessage);
      console.error('Form validation failed:', error);
    }
  };

  const columns = [
    {
      title: 'Hình ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 150,
      render: (url: string) => (
        <Image
          src={url}
          alt=""
          width={100}
          height={60}
          style={{ objectFit: 'cover', borderRadius: 4 }}
        />
      ),
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Link',
      dataIndex: 'linkUrl',
      key: 'linkUrl',
      ellipsis: true,
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
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
      render: (_: any, record: Banner) => (
        <Space size={0}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
            style={{ padding: '4px 8px' }}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa banner này?"
            onConfirm={() => {
              if (record._id) {
                handleDelete(record._id);
              } else {
                message.error('ID banner không hợp lệ');
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
    <div className="admin-banners">
      <div className="banners-header">
        <h1 className="page-title">Quản lý banners</h1>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Thêm banner
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadBanners}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={banners}
        rowKey="_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Tổng ${total} banners`,
        }}
      />

      <Modal
        title={editingBanner ? 'Chỉnh sửa banner' : 'Thêm banner mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Nhập tiêu đề" />
          </Form.Item>
          <Form.Item
            name="imageUrl"
            label="URL hình ảnh"
            rules={[{ required: true, message: 'Vui lòng nhập URL hình ảnh' }]}
          >
            <Input placeholder="Nhập URL hình ảnh" />
          </Form.Item>
          <Form.Item name="linkUrl" label="Link">
            <Input placeholder="Nhập link" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự">
            <Input type="number" placeholder="Nhập thứ tự" />
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái" initialValue={true}>
            <Tag color="green">Hoạt động</Tag>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Banners;
