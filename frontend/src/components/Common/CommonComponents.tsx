import React from 'react';
import { Button } from 'antd';
import { ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons';
import Loading from './Loading/Loading';

// Loading component is now imported from ./Loading

interface ErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorProps> = ({ 
  title = 'Đã xảy ra lỗi',
  message = 'Vui lòng thử lại sau',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`error-container ${className}`}>
      <ExclamationCircleOutlined className="error-icon" />
      <div className="error-title">{title}</div>
      <div className="error-message">{message}</div>
      {onRetry && (
        <Button type="primary" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
};

interface EmptyProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyProps> = ({ 
  title = 'Không có dữ liệu',
  message = 'Chưa có nội dung nào để hiển thị',
  action,
  className = ''
}) => {
  return (
    <div className={`empty-container ${className}`}>
      <InboxOutlined className="empty-icon" />
      <div className="empty-title">{title}</div>
      <div className="empty-message">{message}</div>
      {action}
    </div>
  );
};

// Page wrapper component for consistent styling
interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  className = '',
  loading = false,
  error = null,
  empty = false,
  onRetry
}) => {
  if (loading) {
    return <Loading text="Đang tải..." className={className} />;
  }

  if (error) {
    return (
      <ErrorState 
        message={error} 
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (empty) {
    return <EmptyState className={className} />;
  }

  return (
    <div className={`page-wrapper ${className}`}>
      {children}
    </div>
  );
};
