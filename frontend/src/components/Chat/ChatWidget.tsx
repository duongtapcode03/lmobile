/**
 * Chat Widget Component
 * Floating chat widget cho hỗ trợ khách hàng
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Avatar, Badge, Spin, message } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useChat } from '../../contexts/ChatContext';
import './ChatWidget.scss';

const ChatWidget: React.FC = () => {
  const location = useLocation();
  const userRole = useSelector((state: any) => state?.auth?.user?.role);
  
  // Chỉ hiển thị ChatWidget cho user, không hiển thị cho admin/seller
  const isAdminOrSeller = userRole === 'admin' || userRole === 'seller';
  const isAdminOrSellerRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/seller');
  
  if (isAdminOrSeller || isAdminOrSellerRoute) {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    currentConversation,
    messages,
    conversations,
    loading,
    error,
    joinConversation,
    sendMessage,
    loadMessages,
    loadConversations,
    startTyping,
    stopTyping,
    typingUsers
  } = useChat();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const hasJoinedRef = useRef(false);

  // Load conversations on mount
  useEffect(() => {
    if (isOpen && isConnected) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isConnected]);

  // Join or create conversation when opening (only once)
  useEffect(() => {
    if (isOpen && isConnected && !hasJoinedRef.current) {
      if (conversations.length > 0) {
        // Join existing conversation
        const latestConversation = conversations[0];
        joinConversation(latestConversation._id);
        hasJoinedRef.current = true;
      } else if (conversations.length === 0) {
        // Only create new conversation if we've loaded conversations and there are none
        // Wait a bit to ensure conversations are loaded
        const timer = setTimeout(() => {
          if (conversations.length === 0) {
            joinConversation();
            hasJoinedRef.current = true;
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
    
    // Reset when closing
    if (!isOpen) {
      hasJoinedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isConnected, conversations.length]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSend = async () => {
    if (!inputMessage.trim()) {
      return;
    }

    try {
      await sendMessage(inputMessage.trim());
      setInputMessage('');
      stopTyping();
    } catch (error: any) {
      message.error(error.message || 'Không thể gửi tin nhắn');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Count unread messages
  const unreadCount = conversations.reduce((total, conv) => {
    return total + (conv.unreadCount?.user || 0);
  }, 0);

  if (!isConnected) {
    return null; // Don't show widget if not connected
  }

  return (
    <div className="chat-widget">
      {!isOpen ? (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<MessageOutlined />}
          onClick={handleOpen}
          className="chat-widget-toggle"
        >
          {unreadCount > 0 && (
            <Badge count={unreadCount} offset={[-5, 5]} />
          )}
        </Button>
      ) : (
        <div className="chat-widget-container" ref={chatContainerRef}>
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <Avatar icon={<UserOutlined />} />
              <div>
                <div className="chat-widget-header-title">Hỗ trợ khách hàng</div>
                <div className="chat-widget-header-status">
                  {isConnected ? 'Đang trực tuyến' : 'Đang kết nối...'}
                </div>
              </div>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleClose}
              className="chat-widget-close"
            />
          </div>

          <div className="chat-widget-messages">
            {loading && messages.length === 0 ? (
              <div className="chat-widget-loading">
                <Spin size="large" />
              </div>
            ) : error ? (
              <div className="chat-widget-error">{error}</div>
            ) : messages.length === 0 ? (
              <div className="chat-widget-empty">
                <p>Chào mừng bạn đến với hỗ trợ khách hàng!</p>
                <p>Hãy gửi tin nhắn để bắt đầu trò chuyện.</p>
              </div>
            ) : (
              <>
                {messages
                  // Đảm bảo sort theo createdAt (cũ → mới) để hiển thị đúng thứ tự
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((msg) => (
                  <div
                    key={msg._id}
                    className={`chat-widget-message ${
                      msg.senderType === 'user' ? 'message-user' : 'message-admin'
                    }`}
                  >
                    <div className="message-avatar">
                      <Avatar icon={<UserOutlined />} />
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-sender">{msg.senderName}</span>
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="message-text">{msg.message}</div>
                    </div>
                  </div>
                ))}
                {typingUsers.length > 0 && (
                  <div className="chat-widget-message message-admin">
                    <div className="message-avatar">
                      <Avatar icon={<UserOutlined />} />
                    </div>
                    <div className="message-content">
                      <div className="message-typing">
                        {typingUsers.join(', ')} đang nhập...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="chat-widget-input">
            <Input.TextArea
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={!isConnected}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!inputMessage.trim() || !isConnected}
              className="chat-widget-send"
            >
              Gửi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;



