/**
 * Admin Vouchers Management
 * Quản lý mã giảm giá
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
  Switch,
  Tag,
  Popconfirm,
  Row,
  Col,
  Card,
  Statistic,
  Descriptions,
  Tabs,
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
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import voucherService, { type Voucher } from '../../../api/voucherService';
import './Vouchers.scss';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

const Vouchers: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [usages, setUsages] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    loadVouchers();
    loadStats();
  }, [pagination.current, pagination.pageSize, searchText]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (searchText) {
        params.search = searchText;
      }

      const response = await voucherService.getVouchers(params);
      setVouchers(response.data || []);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination!.totalItems,
        }));
      }
    } catch (error: any) {
      console.error('Failed to load vouchers:', error);
      message.error('Không thể tải danh sách mã giảm giá');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleAdd = () => {
    setEditingVoucher(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'percentage',
      isActive: true,
      usageLimit: 1,
      minOrderAmount: 0,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    form.setFieldsValue({
      ...voucher,
      validFrom: voucher.validFrom ? dayjs(voucher.validFrom) : undefined,
      validTo: voucher.validTo ? dayjs(voucher.validTo) : undefined,
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      const voucherData: Partial<Voucher> = {
        code: values.code?.toUpperCase().trim(),
        name: values.name,
        description: values.description,
        type: values.type,
        value: values.value,
        minOrderAmount: values.minOrderAmount || 0,
        maxDiscountAmount: values.maxDiscountAmount,
        usageLimit: values.usageLimit || 1,
        validFrom: values.validFrom ? values.validFrom.toISOString() : new Date().toISOString(),
        validTo: values.validTo ? values.validTo.toISOString() : undefined,
        isActive: values.isActive !== undefined ? values.isActive : true,
        conditions: values.conditions || {},
        tags: values.tags,
        image: values.image,
        priority: values.priority || 0,
      };

      // Remove undefined fields
      Object.keys(voucherData).forEach(key => {
        if (voucherData[key as keyof Voucher] === undefined) {
          delete voucherData[key as keyof Voucher];
        }
      });

      if (editingVoucher && editingVoucher._id) {
        await voucherService.updateVoucher(editingVoucher._id, voucherData);
        message.success('Cập nhật mã giảm giá thành công');
      } else {
        await voucherService.createVoucher(voucherData);
        message.success('Tạo mã giảm giá thành công');
      }
      setIsModalVisible(false);
      form.resetFields();
      loadVouchers();
    } catch (error: any) {
      console.error('Failed to save voucher:', error);
      message.error(error.response?.data?.message || 'Không thể lưu mã giảm giá');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleDelete = async (id: string) => {
    try {
      await voucherService.deleteVoucher(id);
      message.success('Đã xóa mã giảm giá');
      loadVouchers();
    } catch (error: any) {
      console.error('Failed to delete voucher:', error);
      message.error('Không thể xóa mã giảm giá');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await voucherService.toggleActive(id);
      message.success('Đã cập nhật trạng thái mã giảm giá');
      loadVouchers();
      loadStats();
    } catch (error: any) {
      console.error('Failed to toggle voucher:', error);
      message.error('Không thể cập nhật trạng thái');
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const statsData = await voucherService.getStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleViewDetail = async (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setDetailModalVisible(true);
    await loadVoucherDetails(voucher._id);
  };

  const loadVoucherDetails = async (voucherId: string) => {
    try {
      setUsageLoading(true);
      const [statsData, usagesData] = await Promise.all([
        voucherService.getUsageStats(voucherId),
        voucherService.getUsages(voucherId, { limit: 10 })
      ]);
      setUsageStats(statsData);
      setUsages(usagesData.usages || []);
    } catch (error: any) {
      console.error('Failed to load voucher details:', error);
      message.error('Không thể tải chi tiết voucher');
    } finally {
      setUsageLoading(false);
    }
  };

  const columns = [
    {
      title: 'Mã giảm giá',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => (
        <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{code}</span>
      ),
    },
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          percentage: { text: 'Phần trăm', color: 'blue' },
          fixed_amount: { text: 'Số tiền cố định', color: 'green' },
          free_shipping: { text: 'Miễn phí ship', color: 'orange' },
        };
        const typeInfo = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      },
    },
    {
      title: 'Giá trị',
      key: 'value',
      width: 120,
      render: (_: any, record: Voucher) => {
        if (record.type === 'percentage') {
          return `${record.value}%`;
        } else if (record.type === 'fixed_amount') {
          return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(record.value);
        } else {
          return 'Miễn phí';
        }
      },
    },
    {
      title: 'Đã dùng',
      key: 'usage',
      width: 100,
      render: (_: any, record: Voucher) => (
        <span>
          {record.usedCount || 0} / {record.usageLimit || '∞'}
        </span>
      ),
    },
    {
      title: 'Hiệu lực',
      key: 'validity',
      width: 200,
      render: (_: any, record: Voucher) => {
        const now = new Date();
        const validFrom = new Date(record.validFrom);
        const validTo = new Date(record.validTo);
        
        if (now < validFrom) {
          return <Tag color="orange">Chưa bắt đầu</Tag>;
        } else if (now > validTo) {
          return <Tag color="red">Đã hết hạn</Tag>;
        } else {
          return <Tag color="green">Đang hiệu lực</Tag>;
        }
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record: Voucher) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record._id)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: Voucher) => (
        <Space size={0}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            size="small"
            style={{ padding: '4px 8px' }}
            title="Xem chi tiết"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
            style={{ padding: '4px 8px' }}
            title="Chỉnh sửa"
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa mã giảm giá này?"
            description="Hành động này không thể hoàn tác"
            onConfirm={() => handleDelete(record._id)}
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
              title="Xóa"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-vouchers">
      <div className="vouchers-header">
        <h1 className="page-title">Quản lý mã giảm giá</h1>
        <Space>
          <Search
            placeholder="Tìm kiếm mã giảm giá"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => {
              if (!e.target.value) {
                setSearchText('');
                setPagination(prev => ({ ...prev, current: 1 }));
                loadVouchers();
              }
            }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Thêm mã giảm giá
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => {
            loadVouchers();
            loadStats();
          }}>
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số voucher"
                value={stats.totalVouchers || 0}
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Voucher đang hoạt động"
                value={stats.activeVouchers || 0}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng lượt sử dụng"
                value={stats.totalUsages || 0}
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng giảm giá (₫)"
                value={stats.totalDiscountAmount || 0}
                precision={0}
                formatter={(value) => new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(Number(value))}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Table
        columns={columns}
        dataSource={vouchers}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total) => `Tổng ${total} mã giảm giá`,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setPagination(prev => ({
              ...prev,
              current: page,
              pageSize: pageSize || prev.pageSize,
            }));
          },
        }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingVoucher ? 'Chỉnh sửa mã giảm giá' : 'Thêm mã giảm giá mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        okText="Lưu"
        cancelText="Hủy"
        okButtonProps={{ loading: loading }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Mã giảm giá"
                rules={[{ required: true, message: 'Vui lòng nhập mã giảm giá' }]}
              >
                <Input
                  placeholder="Ví dụ: WELCOME10"
                  style={{ textTransform: 'uppercase' }}
                  maxLength={20}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Loại"
                rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
              >
                <Select placeholder="Chọn loại mã giảm giá">
                  <Option value="percentage">Phần trăm (%)</Option>
                  <Option value="fixed_amount">Số tiền cố định (₫)</Option>
                  <Option value="free_shipping">Miễn phí vận chuyển</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="Tên mã giảm giá"
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input placeholder="Ví dụ: Giảm giá 10% cho khách hàng mới" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <TextArea
              rows={3}
              placeholder="Mô tả chi tiết về mã giảm giá"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="value"
                label="Giá trị"
                rules={[{ required: true, message: 'Vui lòng nhập giá trị' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Ví dụ: 10 (cho %) hoặc 50000 (cho ₫)"
                  min={0}
                  formatter={(value) => {
                    if (!value) return '';
                    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  }}
                  parser={(value) => {
                    if (!value) return 0;
                    return Number(value.replace(/\$\s?|(,*)/g, ''));
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxDiscountAmount"
                label="Giảm tối đa (₫)"
                tooltip="Áp dụng cho loại phần trăm, để trống nếu không giới hạn"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Ví dụ: 150000"
                  min={0}
                  formatter={(value) => {
                    if (!value) return '';
                    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  }}
                  parser={(value) => {
                    if (!value) return 0;
                    return Number(value.replace(/\$\s?|(,*)/g, ''));
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="minOrderAmount"
                label="Đơn hàng tối thiểu (₫)"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Ví dụ: 1000000"
                  min={0}
                  formatter={(value) => {
                    if (!value) return '';
                    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  }}
                  parser={(value) => {
                    if (!value) return 0;
                    return Number(value.replace(/\$\s?|(,*)/g, ''));
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="usageLimit"
                label="Giới hạn sử dụng"
                initialValue={1}
                rules={[{ required: true, message: 'Vui lòng nhập giới hạn sử dụng' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Số lần có thể sử dụng"
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="validFrom"
                label="Ngày bắt đầu"
                rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  showTime
                  format="DD/MM/YYYY HH:mm"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="validTo"
                label="Ngày kết thúc"
                rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  showTime
                  format="DD/MM/YYYY HH:mm"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Trạng thái"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Độ ưu tiên"
                initialValue={0}
                tooltip="Số càng cao, ưu tiên càng lớn khi áp dụng nhiều mã giảm giá"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="tags"
            label="Tags"
            tooltip="Nhập tags cách nhau bởi dấu phẩy"
            getValueFromEvent={(e) => {
              const value = e.target.value;
              if (!value) return [];
              return value.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
            }}
            getValueProps={(value) => {
              if (Array.isArray(value)) {
                return { value: value.join(', ') };
              }
              return { value: value || '' };
            }}
          >
            <Input placeholder="Ví dụ: welcome, newuser, sale" />
          </Form.Item>

          <Form.Item
            name="image"
            label="URL hình ảnh"
          >
            <Input placeholder="https://example.com/image.jpg" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal with Usage Stats */}
      <Modal
        title={`Chi tiết voucher: ${selectedVoucher?.code}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedVoucher(null);
          setUsageStats(null);
          setUsages([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedVoucher(null);
            setUsageStats(null);
            setUsages([]);
          }}>
            Đóng
          </Button>,
        ]}
        width={900}
      >
        <Spin spinning={usageLoading}>
          {selectedVoucher && (
            <Tabs defaultActiveKey="info">
              <Tabs.TabPane tab="Thông tin" key="info">
                <Descriptions column={2} bordered>
                  <Descriptions.Item label="Mã voucher">
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                      {selectedVoucher.code}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tên">{selectedVoucher.name}</Descriptions.Item>
                  {selectedVoucher.description && (
                    <Descriptions.Item label="Mô tả" span={2}>
                      {selectedVoucher.description}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Loại">
                    {selectedVoucher.type === 'percentage' && 'Phần trăm'}
                    {selectedVoucher.type === 'fixed_amount' && 'Số tiền cố định'}
                    {selectedVoucher.type === 'free_shipping' && 'Miễn phí vận chuyển'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Giá trị">
                    {selectedVoucher.type === 'percentage' && `${selectedVoucher.value}%`}
                    {selectedVoucher.type === 'fixed_amount' && new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(selectedVoucher.value)}
                    {selectedVoucher.type === 'free_shipping' && 'Miễn phí'}
                  </Descriptions.Item>
                  {selectedVoucher.maxDiscountAmount && (
                    <Descriptions.Item label="Giảm tối đa">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(selectedVoucher.maxDiscountAmount)}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Đơn hàng tối thiểu">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(selectedVoucher.minOrderAmount || 0)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày bắt đầu">
                    {dayjs(selectedVoucher.validFrom).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày kết thúc">
                    {dayjs(selectedVoucher.validTo).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Giới hạn sử dụng">
                    {selectedVoucher.usageLimit || 'Không giới hạn'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Đã sử dụng">
                    {selectedVoucher.usedCount || 0}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={selectedVoucher.isActive ? 'green' : 'red'}>
                      {selectedVoucher.isActive ? 'Hoạt động' : 'Tạm dừng'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Tabs.TabPane>

              <Tabs.TabPane tab="Thống kê sử dụng" key="stats">
                {usageStats ? (
                  <div>
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Tổng lượt sử dụng"
                            value={usageStats.totalUsages || 0}
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Đã sử dụng"
                            value={usageStats.usedUsages || 0}
                            valueStyle={{ color: '#3f8600' }}
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Đã hủy"
                            value={usageStats.cancelledUsages || 0}
                            valueStyle={{ color: '#cf1322' }}
                          />
                        </Card>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Card>
                          <Statistic
                            title="Tổng giảm giá (₫)"
                            value={usageStats.totalDiscountAmount || 0}
                            precision={0}
                            formatter={(value) => new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(Number(value))}
                          />
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card>
                          <Statistic
                            title="Tổng doanh thu (₫)"
                            value={usageStats.totalRevenue || 0}
                            precision={0}
                            formatter={(value) => new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(Number(value))}
                          />
                        </Card>
                      </Col>
                    </Row>
                  </div>
                ) : (
                  <div>Đang tải thống kê...</div>
                )}
              </Tabs.TabPane>

              <Tabs.TabPane tab="Lịch sử sử dụng" key="usages">
                {usages.length > 0 ? (
                  <Table
                    dataSource={usages}
                    rowKey="_id"
                    pagination={false}
                    columns={[
                      {
                        title: 'Người dùng',
                        dataIndex: ['user', 'name'],
                        key: 'user',
                        render: (text: string, record: any) => (
                          <div>
                            <div>{text || record.user?.email || 'N/A'}</div>
                            {record.user?.email && (
                              <div style={{ fontSize: '12px', color: '#999' }}>
                                {record.user.email}
                              </div>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: 'Đơn hàng',
                        dataIndex: ['order', 'orderNumber'],
                        key: 'order',
                        render: (text: string) => text || 'N/A',
                      },
                      {
                        title: 'Giảm giá',
                        dataIndex: 'discountAmount',
                        key: 'discountAmount',
                        render: (value: number) => new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(value || 0),
                      },
                      {
                        title: 'Tổng đơn',
                        dataIndex: 'orderAmount',
                        key: 'orderAmount',
                        render: (value: number) => new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(value || 0),
                      },
                      {
                        title: 'Trạng thái',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => {
                          const statusMap: Record<string, { text: string; color: string }> = {
                            used: { text: 'Đã sử dụng', color: 'green' },
                            cancelled: { text: 'Đã hủy', color: 'red' },
                          };
                          const statusInfo = statusMap[status] || { text: status, color: 'default' };
                          return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
                        },
                      },
                      {
                        title: 'Ngày sử dụng',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
                      },
                    ]}
                  />
                ) : (
                  <div>Chưa có lịch sử sử dụng</div>
                )}
              </Tabs.TabPane>
            </Tabs>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default Vouchers;

