/**
 * Admin Users Management
 * Quản lý người dùng
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
  Descriptions,
  Badge
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  EyeOutlined,
  UserOutlined
} from '@ant-design/icons';
import adminService from '../../../api/adminService';
import './Users.scss';

const { Search } = Input;
const { Option } = Select;

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  emailVerified?: boolean;
  avatar?: string;
  address?: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    loadUsers();
  }, [roleFilter, pagination.current, pagination.pageSize]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const filters: any = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      
      if (roleFilter !== 'all') {
        filters.role = roleFilter;
      }
      
      if (searchText) {
        filters.search = searchText;
      }

      const response = await adminService.getAllUsers(filters);
      console.log('Users response:', response);
      
      // Backend service returns: { data: users[], pagination: { currentPage, itemsPerPage, totalItems, totalPages } }
      // adminService returns the same structure
      const usersData = response?.data || [];
      const paginationData = response?.pagination || {};
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setPagination(prev => ({
        ...prev,
        total: paginationData.totalItems || 0,
      }));
    } catch (error: any) {
      console.error('Failed to load users:', error);
      message.error(error?.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    loadUsers();
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      await adminService.updateUserStatus(userId, isActive);
      message.success(`Đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản`);
      loadUsers();
    } catch (error: any) {
      console.error('Failed to update user status:', error);
      message.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái người dùng');
    }
  };

  const handleViewDetail = async (userId: string) => {
    try {
      const user = await adminService.getUserById(userId);
      setSelectedUser(user);
      setDetailModalVisible(true);
    } catch (error: any) {
      console.error('Failed to load user detail:', error);
      message.error(error?.response?.data?.message || 'Không thể tải thông tin người dùng');
    }
  };

  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: User) => (
        <Space>
          {record.avatar ? (
            <img 
              src={record.avatar} 
              alt={text} 
              style={{ width: 32, height: 32, borderRadius: '50%' }}
            />
          ) : (
            <UserOutlined style={{ fontSize: 20 }} />
          )}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colorMap: Record<string, string> = {
          admin: 'red',
          seller: 'blue',
          user: 'green',
        };
        const roleText: Record<string, string> = {
          admin: 'Quản trị viên',
          seller: 'Người bán',
          user: 'Người dùng',
        };
        return <Tag color={colorMap[role] || 'default'}>{roleText[role] || role}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: User) => (
        <Space>
          <Badge 
            status={isActive ? 'success' : 'error'} 
            text={isActive ? 'Hoạt động' : 'Khóa'} 
          />
          <Switch
            checked={isActive}
            onChange={(checked) => handleStatusChange(record._id, checked)}
            size="small"
          />
        </Space>
      ),
    },
    {
      title: 'Xác thực Email',
      dataIndex: 'emailVerified',
      key: 'emailVerified',
      render: (verified: boolean) => (
        <Tag color={verified ? 'green' : 'orange'}>
          {verified ? 'Đã xác thực' : 'Chưa xác thực'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? new Date(date).toLocaleDateString('vi-VN') : '-',
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: User) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record._id)}
          size="small"
          style={{ padding: '4px 8px' }}
        />
      ),
    },
  ];

  return (
    <div className="admin-users">
      <div className="users-header">
        <h1 className="page-title">Quản lý người dùng</h1>
        <Space>
          <Search
            placeholder="Tìm kiếm theo tên, email"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
          />
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            style={{ width: 150 }}
          >
            <Option value="all">Tất cả</Option>
            <Option value="admin">Admin</Option>
            <Option value="seller">Seller</Option>
            <Option value="user">User</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadUsers}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} của ${total} người dùng`,
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

      {/* User Detail Modal */}
      <Modal
        title="Chi tiết người dùng"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedUser(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedUser(null);
          }}>
            Đóng
          </Button>
        ]}
        width={700}
      >
        {selectedUser && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Tên">{selectedUser.name}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {selectedUser.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              <Tag color={
                selectedUser.role === 'admin' ? 'red' :
                selectedUser.role === 'seller' ? 'blue' : 'green'
              }>
                {selectedUser.role === 'admin' ? 'Quản trị viên' :
                 selectedUser.role === 'seller' ? 'Người bán' : 'Người dùng'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Badge 
                status={selectedUser.isActive ? 'success' : 'error'} 
                text={selectedUser.isActive ? 'Hoạt động' : 'Khóa'} 
              />
            </Descriptions.Item>
            <Descriptions.Item label="Xác thực Email">
              <Tag color={selectedUser.emailVerified ? 'green' : 'orange'}>
                {selectedUser.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={2}>
              {selectedUser.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {selectedUser.createdAt 
                ? new Date(selectedUser.createdAt).toLocaleString('vi-VN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Lần đăng nhập cuối">
              {selectedUser.lastLogin 
                ? new Date(selectedUser.lastLogin).toLocaleString('vi-VN')
                : 'Chưa đăng nhập'}
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật lần cuối">
              {selectedUser.updatedAt 
                ? new Date(selectedUser.updatedAt).toLocaleString('vi-VN')
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Users;










