import React, { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import './Toast.scss';

const Toast: React.FC = () => {
  const { toasts, removeToast } = useToast();
  const [visibleToasts, setVisibleToasts] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Khi có toast mới, thêm vào visibleToasts sau một chút để trigger animation
    toasts.forEach((toast) => {
      if (!visibleToasts.has(toast.id)) {
        setTimeout(() => {
          setVisibleToasts((prev) => new Set(prev).add(toast.id));
        }, 10);
      }
    });

    // Xóa toast khỏi visibleToasts khi nó bị remove
    const currentIds = new Set(toasts.map((t) => t.id));
    setVisibleToasts((prev) => {
      const newSet = new Set<string>();
      prev.forEach((id) => {
        if (currentIds.has(id)) {
          newSet.add(id);
        }
      });
      return newSet;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts]);

  const handleClose = (id: string) => {
    setVisibleToasts((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    // Đợi animation fade out hoàn thành trước khi remove
    setTimeout(() => {
      removeToast(id);
    }, 300);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z"
              fill="currentColor"
            />
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"
              fill="currentColor"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 0L0 18h20L10 0zm0 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-4H9V6h2v4z"
              fill="currentColor"
            />
          </svg>
        );
      case 'info':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-6h2v6zm0-8H9V5h2v2z"
              fill="currentColor"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (toasts.length === 0) return null;

  // Sắp xếp toasts theo thứ tự mới nhất ở trên cùng
  const sortedToasts = [...toasts].reverse();

  return (
    <div className="toast-container">
      {sortedToasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type} ${visibleToasts.has(toast.id) ? 'toast-visible' : 'toast-hidden'}`}
          onClick={() => handleClose(toast.id)}
        >
          <div className="toast-icon">{getIcon(toast.type)}</div>
          <div className="toast-message">{toast.message}</div>
          <button
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              handleClose(toast.id);
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;

