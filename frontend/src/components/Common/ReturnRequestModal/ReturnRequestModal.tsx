import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  Table,
  Button,
  Space,
  Checkbox,
  message,
  Typography,
  Alert
} from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import returnRequestService, { type ReturnRequestItem, type Order } from '../../../api/returnRequestService';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

interface ReturnRequestModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  order: Order;
}

const reasonOptions = [
  { value: 'defective', label: 'Hàng lỗi' },
  { value: 'wrong_item', label: 'Sai sản phẩm' },
  { value: 'not_as_described', label: 'Không đúng mô tả' },
  { value: 'damaged', label: 'Hàng bị hỏng' },
  { value: 'size_issue', label: 'Vấn đề về kích thước' },
  { value: 'color_issue', label: 'Vấn đề về màu sắc' },
  { value: 'other', label: 'Lý do khác' }
];

const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  open,
  onCancel,
  onSuccess,
  order
}) => {
  const [form] = Form.useForm();
  const [selectedItems, setSelectedItems] = useState<Map<string, {
    productId: number;
    variantId?: number;
    quantity: number;
    reason: string;
    reasonDetail?: string;
  }>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  const handleItemSelect = (item: any, checked: boolean) => {
    const newSelectedItems = new Map(selectedItems);
    
    if (checked) {
      newSelectedItems.set(String(item.product?._id || item.product), {
        productId: typeof item.product === 'object' ? item.product._id : item.product,
        variantId: item.variant?._id,
        quantity: item.quantity,
        reason: '',
        reasonDetail: ''
      });
    } else {
      newSelectedItems.delete(String(item.product?._id || item.product));
    }
    
    setSelectedItems(newSelectedItems);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const newSelectedItems = new Map(selectedItems);
    const item = newSelectedItems.get(itemId);
    if (item) {
      const orderItem = order.items.find(
        oi => String(oi.product?._id || oi.product) === itemId
      );
      const maxQuantity = orderItem?.quantity || 0;
      
      if (quantity > maxQuantity) {
        message.warning(`Số lượng không được vượt quá ${maxQuantity}`);
        return;
      }
      
      item.quantity = quantity;
      newSelectedItems.set(itemId, item);
      setSelectedItems(newSelectedItems);
    }
  };

  const handleReasonChange = (itemId: string, reason: string) => {
    const newSelectedItems = new Map(selectedItems);
    const item = newSelectedItems.get(itemId);
    if (item) {
      item.reason = reason as any;
      newSelectedItems.set(itemId, item);
      setSelectedItems(newSelectedItems);
    }
  };

  const handleReasonDetailChange = (itemId: string, reasonDetail: string) => {
    const newSelectedItems = new Map(selectedItems);
    const item = newSelectedItems.get(itemId);
    if (item) {
      item.reasonDetail = reasonDetail;
      newSelectedItems.set(itemId, item);
      setSelectedItems(newSelectedItems);
    }
  };

  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      message.warning('Vui lòng chọn ít nhất một sản phẩm để hoàn');
      return;
    }

    // Validate tất cả items đã chọn lý do
    for (const [itemId, item] of selectedItems.entries()) {
      if (!item.reason) {
        message.warning('Vui lòng chọn lý do hoàn hàng cho tất cả sản phẩm');
        return;
      }
    }

    try {
      setSubmitting(true);
      
      const items: ReturnRequestItem[] = Array.from(selectedItems.values()).map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        reason: item.reason as any,
        reasonDetail: item.reasonDetail
      }));

      const customerNote = form.getFieldValue('customerNote') || '';

      await returnRequestService.createReturnRequest(order._id, {
        items,
        customerNote
      });

      message.success('Yêu cầu hoàn hàng đã được gửi thành công');
      onSuccess();
      handleCancel();
    } catch (error: any) {
      console.error('Error creating return request:', error);
      message.error(error.response?.data?.message || 'Không thể tạo yêu cầu hoàn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedItems(new Map());
    form.resetFields();
    onCancel();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const columns = [
    {
      title: 'Chọn',
      key: 'select',
      width: 60,
      render: (_: any, record: any) => {
        const itemId = String(record.product?._id || record.product);
        const isSelected = selectedItems.has(itemId);
        return (
          <Checkbox
            checked={isSelected}
            onChange={(e) => handleItemSelect(record, e.target.checked)}
          />
        );
      }
    },
    {
      title: 'Sản phẩm',
      key: 'product',
      render: (_: any, record: any) => (
        <Space>
          <img
            src={record.productImage || '/placeholder-product.png'}
            alt={record.productName}
            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
          />
          <div>
            <Text strong>{record.productName}</Text>
            {record.variant && (
              <div>
                {record.variant.storage && <Text type="secondary" style={{ fontSize: 12 }}>Dung lượng: {record.variant.storage}</Text>}
                {record.variant.color && <Text type="secondary" style={{ fontSize: 12 }}> | Màu: {record.variant.color}</Text>}
              </div>
            )}
          </div>
        </Space>
      )
    },
    {
      title: 'Số lượng đã mua',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center' as const,
      width: 120
    },
    {
      title: 'Số lượng hoàn',
      key: 'returnQuantity',
      width: 150,
      render: (_: any, record: any) => {
        const itemId = String(record.product?._id || record.product);
        const selectedItem = selectedItems.get(itemId);
        
        if (!selectedItem) {
          return '-';
        }
        
        return (
          <InputNumber
            min={1}
            max={record.quantity}
            value={selectedItem.quantity}
            onChange={(value) => handleQuantityChange(itemId, value || 1)}
            style={{ width: '100%' }}
          />
        );
      }
    },
    {
      title: 'Lý do hoàn',
      key: 'reason',
      width: 200,
      render: (_: any, record: any) => {
        const itemId = String(record.product?._id || record.product);
        const selectedItem = selectedItems.get(itemId);
        
        if (!selectedItem) {
          return '-';
        }
        
        return (
          <Select
            value={selectedItem.reason}
            onChange={(value) => handleReasonChange(itemId, value)}
            placeholder="Chọn lý do"
            style={{ width: '100%' }}
          >
            {reasonOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      }
    },
    {
      title: 'Chi tiết',
      key: 'reasonDetail',
      render: (_: any, record: any) => {
        const itemId = String(record.product?._id || record.product);
        const selectedItem = selectedItems.get(itemId);
        
        if (!selectedItem) {
          return '-';
        }
        
        return (
          <TextArea
            value={selectedItem.reasonDetail}
            onChange={(e) => handleReasonDetailChange(itemId, e.target.value)}
            placeholder="Mô tả chi tiết (tùy chọn)"
            rows={2}
            maxLength={500}
            showCount
          />
        );
      }
    }
  ];

  return (
    <Modal
      title="Yêu cầu hoàn hàng"
      open={open}
      onCancel={handleCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          disabled={selectedItems.size === 0}
        >
          Gửi yêu cầu
        </Button>
      ]}
    >
      <Alert
        message="Lưu ý"
        description="Bạn chỉ có thể yêu cầu hoàn hàng trong vòng 7 ngày kể từ khi nhận hàng. Vui lòng chọn sản phẩm và điền lý do hoàn hàng."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={order.items}
        rowKey={(record) => String(record.product?._id || record.product)}
        pagination={false}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="customerNote"
          label="Ghi chú thêm (tùy chọn)"
        >
          <TextArea
            rows={3}
            placeholder="Bạn có thể thêm ghi chú về yêu cầu hoàn hàng..."
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReturnRequestModal;

