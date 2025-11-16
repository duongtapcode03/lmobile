/**
 * ReviewModal Component
 * Modal để khách hàng đánh giá sản phẩm
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Rate,
  Input,
  Button,
  Upload,
  message,
  Space,
  Row,
  Col,
  Switch,
  Select,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import feedbackService, { type Feedback } from '../../../api/feedbackService';
import dayjs, { Dayjs } from 'dayjs';
import './ReviewModal.scss';

const { TextArea } = Input;
const { Option } = Select;

interface ReviewModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  productId: string | number;
  productName?: string;
  productImage?: string;
  orderId?: string;
  orderNumber?: string;
  existingFeedback?: Feedback | null;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  open,
  onCancel,
  onSuccess,
  productId,
  productName,
  productImage,
  orderId,
  orderNumber,
  existingFeedback,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageList, setImageList] = useState<UploadFile[]>([]);
  const [prosList, setProsList] = useState<string[]>(['']);
  const [consList, setConsList] = useState<string[]>(['']);

  useEffect(() => {
    if (open) {
      if (existingFeedback) {
        // Edit mode
        form.setFieldsValue({
          rating: existingFeedback.rating,
          title: existingFeedback.title,
          content: existingFeedback.content,
          isAnonymous: existingFeedback.isAnonymous,
          recommend: existingFeedback.recommend,
          usageDuration: existingFeedback.usageDuration,
          purchaseDate: existingFeedback.purchaseDate ? dayjs(existingFeedback.purchaseDate) : undefined,
        });
        setProsList(existingFeedback.pros && existingFeedback.pros.length > 0 ? existingFeedback.pros : ['']);
        setConsList(existingFeedback.cons && existingFeedback.cons.length > 0 ? existingFeedback.cons : ['']);
        if (existingFeedback.images && existingFeedback.images.length > 0) {
          setImageList(
            existingFeedback.images.map((url, index) => ({
              uid: `-${index}`,
              name: `image-${index}.jpg`,
              status: 'done',
              url: url,
            }))
          );
        }
      } else {
        // Create mode
        form.resetFields();
        form.setFieldsValue({
          rating: 5,
          isAnonymous: false,
          recommend: true,
        });
        setProsList(['']);
        setConsList(['']);
        setImageList([]);
      }
    }
  }, [open, existingFeedback, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Xử lý hình ảnh - lấy URL từ imageList
      const images = imageList
        .filter(file => file.status === 'done' && file.url && !file.url.startsWith('blob:'))
        .map(file => file.url as string);

      // Xử lý pros và cons - loại bỏ các giá trị rỗng
      const pros = prosList.filter(pro => pro.trim() !== '');
      const cons = consList.filter(con => con.trim() !== '');

      const feedbackData: any = {
        product: String(productId),
        rating: values.rating,
        content: values.content,
        isAnonymous: values.isAnonymous || false,
        recommend: values.recommend !== undefined ? values.recommend : true,
      };

      if (orderId) {
        feedbackData.order = orderId;
      }

      if (values.title) {
        feedbackData.title = values.title;
      }

      if (images.length > 0) {
        feedbackData.images = images;
      }

      if (pros.length > 0) {
        feedbackData.pros = pros;
      }

      if (cons.length > 0) {
        feedbackData.cons = cons;
      }

      if (values.usageDuration) {
        feedbackData.usageDuration = values.usageDuration;
      }

      if (values.purchaseDate) {
        feedbackData.purchaseDate = values.purchaseDate.toISOString();
      }

      if (existingFeedback && existingFeedback._id) {
        await feedbackService.updateFeedback(existingFeedback._id, feedbackData);
        message.success('Cập nhật đánh giá thành công');
      } else {
        await feedbackService.createFeedback(feedbackData);
        message.success('Gửi đánh giá thành công! Đánh giá của bạn đang chờ duyệt.');
      }

      form.resetFields();
      setImageList([]);
      setProsList(['']);
      setConsList(['']);
      onCancel();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to submit feedback:', error);
      message.error(error.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (info: any) => {
    let fileList = [...info.fileList];
    
    // Giới hạn 5 hình ảnh
    fileList = fileList.slice(-5);
    
    // Xử lý preview cho file mới upload
    fileList = fileList.map((file) => {
      if (file.response) {
        file.url = file.response.url;
      }
      // Tạo preview URL cho file mới
      if (file.originFileObj) {
        file.url = URL.createObjectURL(file.originFileObj);
      }
      return file;
    });

    setImageList(fileList);
  };

  const handleImageRemove = (file: UploadFile) => {
    // Revoke object URL nếu có
    if (file.url && file.url.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }
    const newList = imageList.filter(item => item.uid !== file.uid);
    setImageList(newList);
    return true;
  };

  const addProsItem = () => {
    setProsList([...prosList, '']);
  };

  const removeProsItem = (index: number) => {
    const newList = prosList.filter((_, i) => i !== index);
    setProsList(newList.length > 0 ? newList : ['']);
  };

  const updateProsItem = (index: number, value: string) => {
    const newList = [...prosList];
    newList[index] = value;
    setProsList(newList);
  };

  const addConsItem = () => {
    setConsList([...consList, '']);
  };

  const removeConsItem = (index: number) => {
    const newList = consList.filter((_, i) => i !== index);
    setConsList(newList.length > 0 ? newList : ['']);
  };

  const updateConsItem = (index: number, value: string) => {
    const newList = [...consList];
    newList[index] = value;
    setConsList(newList);
  };

  const uploadProps = {
    listType: 'picture-card' as const,
    fileList: imageList,
    onChange: handleImageChange,
    onRemove: handleImageRemove,
    beforeUpload: (file: File) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
      if (!isJpgOrPng) {
        message.error('Chỉ chấp nhận file JPG/PNG/WEBP!');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Hình ảnh phải nhỏ hơn 5MB!');
        return false;
      }
      return false; // Tắt auto upload, sẽ xử lý sau
    },
    maxCount: 5,
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {productImage && (
            <img
              src={productImage}
              alt={productName}
              style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {existingFeedback ? 'Chỉnh sửa đánh giá' : 'Đánh giá sản phẩm'}
            </div>
            {productName && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                {productName}
              </div>
            )}
            {orderNumber && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                Đơn hàng: {orderNumber}
              </div>
            )}
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={existingFeedback ? 'Cập nhật' : 'Gửi đánh giá'}
      cancelText="Hủy"
      width={700}
      okButtonProps={{ loading: loading }}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="rating"
          label="Đánh giá của bạn"
          rules={[{ required: true, message: 'Vui lòng chọn số sao đánh giá' }]}
        >
          <Rate allowClear />
        </Form.Item>

        <Form.Item
          name="title"
          label="Tiêu đề đánh giá"
          rules={[{ max: 200, message: 'Tiêu đề không được quá 200 ký tự' }]}
        >
          <Input placeholder="Ví dụ: Sản phẩm rất tốt, đáng mua!" maxLength={200} />
        </Form.Item>

        <Form.Item
          name="content"
          label="Nội dung đánh giá"
          rules={[
            { required: true, message: 'Vui lòng nhập nội dung đánh giá' },
            { max: 2000, message: 'Nội dung không được quá 2000 ký tự' }
          ]}
        >
          <TextArea
            rows={6}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
            maxLength={2000}
            showCount
          />
        </Form.Item>

        <Form.Item label="Hình ảnh (tối đa 5 ảnh)">
          <Upload {...uploadProps}>
            {imageList.length < 5 && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            )}
          </Upload>
          <div style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
            Lưu ý: Hình ảnh sẽ được lưu dưới dạng URL. Vui lòng nhập URL hình ảnh trực tiếp.
          </div>
          <Input
            placeholder="Nhập URL hình ảnh (cách nhau bởi dấu phẩy), nhấn Enter để thêm"
            style={{ marginTop: 8 }}
            onPressEnter={(e) => {
              const input = e.currentTarget;
              const urls = input.value.split(',').map(url => url.trim()).filter(url => url);
              if (urls.length > 0) {
                const urlFiles = urls.map((url, index) => ({
                  uid: `url-${Date.now()}-${index}`,
                  name: `image-${index}.jpg`,
                  status: 'done' as const,
                  url: url,
                }));
                const newList = [...imageList, ...urlFiles].slice(0, 5);
                setImageList(newList);
                input.value = '';
              }
            }}
          />
        </Form.Item>

        <Form.Item label="Ưu điểm">
          {prosList.map((pro, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input
                placeholder="Nhập ưu điểm"
                value={pro}
                onChange={(e) => updateProsItem(index, e.target.value)}
                maxLength={100}
              />
              {prosList.length > 1 && (
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => removeProsItem(index)}
                  danger
                />
              )}
            </div>
          ))}
          {prosList.length < 5 && (
            <Button
              type="dashed"
              onClick={addProsItem}
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
            >
              Thêm ưu điểm
            </Button>
          )}
        </Form.Item>

        <Form.Item label="Nhược điểm">
          {consList.map((con, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input
                placeholder="Nhập nhược điểm"
                value={con}
                onChange={(e) => updateConsItem(index, e.target.value)}
                maxLength={100}
              />
              {consList.length > 1 && (
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => removeConsItem(index)}
                  danger
                />
              )}
            </div>
          ))}
          {consList.length < 5 && (
            <Button
              type="dashed"
              onClick={addConsItem}
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
            >
              Thêm nhược điểm
            </Button>
          )}
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="usageDuration"
              label="Thời gian sử dụng"
            >
              <Select placeholder="Chọn thời gian sử dụng">
                <Option value="less_than_week">Dưới 1 tuần</Option>
                <Option value="1_week">1 tuần</Option>
                <Option value="1_month">1 tháng</Option>
                <Option value="3_months">3 tháng</Option>
                <Option value="6_months">6 tháng</Option>
                <Option value="1_year">1 năm</Option>
                <Option value="more_than_year">Trên 1 năm</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="purchaseDate"
              label="Ngày mua"
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder="Chọn ngày mua"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="recommend"
              label="Bạn có khuyên mua sản phẩm này không?"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch checkedChildren="Có" unCheckedChildren="Không" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="isAnonymous"
              label="Đánh giá ẩn danh"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch checkedChildren="Có" unCheckedChildren="Không" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default ReviewModal;

