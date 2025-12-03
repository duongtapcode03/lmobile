/**
 * Seller Support Chat Page
 * Trang hỗ trợ cho seller - hiển thị danh sách chat và chat window
 */

import React, { useState, useEffect, useRef } from 'react';
import { Layout, Input, Button, Avatar, Badge, Spin, Empty, message, Typography } from 'antd';
import { SendOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useChat } from '../../../contexts/ChatContext';
import type { ChatConversation, ChatMessage } from '../../../api/chatService';
import './Support.scss';

const { Content, Sider } = Layout;
const { TextArea } = Input;
const { Text } = Typography;

const SellerSupport: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    currentConversation,
    messages,
    conversations,
    loading,
    joinConversation,
    sendMessage,
    loadConversations,
    markAsRead,
    startTyping,
    stopTyping,
    typingUsers
  } = useChat();

  // Load conversations on mount and when connection status changes
  useEffect(() => {
    if (isConnected) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Reload conversations periodically to get updates (backup for socket events)
  useEffect(() => {
    if (isConnected) {
      // Reload conversations periodically to get updates
      const interval = setInterval(() => {
        loadConversations();
      }, 10000); // Reload every 10 seconds as backup

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Auto-select first conversation if none selected
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation && !hasAutoSelectedRef.current) {
      const firstConversation = conversations[0];
      setSelectedConversation(firstConversation);
      joinConversation(firstConversation._id);
      hasAutoSelectedRef.current = true;
    }
    // Reset when conversations change significantly
    if (conversations.length === 0) {
      hasAutoSelectedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length, selectedConversation]);

  // Update selected conversation when currentConversation changes
  useEffect(() => {
    if (currentConversation) {
      setSelectedConversation(currentConversation);
    }
  }, [currentConversation]);

  // Ensure selectedConversation is set when messages are loaded or currentConversation changes
  useEffect(() => {
    if (currentConversation) {
      // Luôn cập nhật selectedConversation khi currentConversation thay đổi
      setSelectedConversation(currentConversation);
    }
  }, [currentConversation]);

  // Scroll to bottom when new messages arrive or conversation changes
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      // Sử dụng setTimeout để đảm bảo DOM đã render xong
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, selectedConversation]);

  // Mark as read when conversation is selected (with debouncing)
  const lastMarkedRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedConversation && isConnected) {
      const conversationId = selectedConversation._id;
      // Only mark as read once per conversation selection
      if (lastMarkedRef.current !== conversationId) {
        lastMarkedRef.current = conversationId;
        // Debounce the mark as read call
        const timer = setTimeout(() => {
          markAsRead();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?._id, isConnected]);

  const handleSelectConversation = async (conversation: ChatConversation) => {
    try {
      // Set selected conversation ngay lập tức để hiển thị UI
      setSelectedConversation(conversation);
      
      // Join conversation và load messages
      await joinConversation(conversation._id);
      
      // Đợi một chút để currentConversation được set từ context
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Cập nhật selectedConversation từ currentConversation nếu có
      if (currentConversation && currentConversation._id === conversation._id) {
        setSelectedConversation(currentConversation);
      }
    } catch (error: any) {
      console.error('Error selecting conversation:', error);
      message.error('Không thể mở cuộc trò chuyện');
      setSelectedConversation(null);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || !selectedConversation) {
      return;
    }

    // Đảm bảo currentConversation được set trước khi gửi
    if (!currentConversation || currentConversation._id !== selectedConversation._id) {
      try {
        await joinConversation(selectedConversation._id);
        // Đợi một chút để state được update
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Nếu vẫn chưa có currentConversation, thử lại
        if (!currentConversation || currentConversation._id !== selectedConversation._id) {
          // Thử join lại một lần nữa
          await joinConversation(selectedConversation._id);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error: any) {
        console.error('Error joining conversation:', error);
        message.error('Không thể kết nối đến cuộc trò chuyện. Vui lòng thử lại.');
        return;
      }
    }

    // Kiểm tra lại sau khi join
    if (!currentConversation || currentConversation._id !== selectedConversation._id) {
      message.error('Vui lòng đợi cuộc trò chuyện được tải...');
      return;
    }

    try {
      await sendMessage(inputMessage.trim());
      setInputMessage('');
      stopTyping();
      // Reload conversations để cập nhật lastMessage
      await loadConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
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
    if (e.target.value.trim() && selectedConversation) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.userName?.toLowerCase().includes(query) ||
      conv.userEmail?.toLowerCase().includes(query) ||
      conv.subject?.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query)
    );
  });

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <Layout className="seller-support-layout">
      <Sider width={350} className="seller-support-sidebar">
        <div className="support-sidebar-header">
          <h2>Hỗ trợ khách hàng</h2>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
        <div className="support-conversations-list">
          {loading && conversations.length === 0 ? (
            <div className="loading-container">
              <Spin size="large" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <Empty description="Không có cuộc trò chuyện nào" />
          ) : (
            filteredConversations.map((conversation) => {
              const isSelected = selectedConversation?._id === conversation._id;
              const unreadCount = conversation.unreadCount?.admin || 0;

              return (
                <div
                  key={conversation._id}
                  className={`conversation-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <Avatar icon={<UserOutlined />} src={null} className="conversation-avatar">
                    {conversation.userName?.[0]?.toUpperCase()}
                  </Avatar>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <Text strong className="conversation-name">
                        {conversation.userName || 'Khách hàng'}
                      </Text>
                      {unreadCount > 0 && (
                        <Badge count={unreadCount} size="small" />
                      )}
                    </div>
                    <Text className="conversation-preview" ellipsis>
                      {conversation.lastMessage || 'Chưa có tin nhắn'}
                    </Text>
                    <Text type="secondary" className="conversation-time">
                      {formatTime(conversation.lastMessageAt || conversation.updatedAt)}
                    </Text>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Sider>
      <Content className="seller-support-content">
        {selectedConversation ? (
          <>
            <div className="support-chat-header">
              <div className="chat-header-info">
                <Avatar icon={<UserOutlined />} className="chat-header-avatar">
                  {selectedConversation.userName?.[0]?.toUpperCase()}
                </Avatar>
                <div>
                  <Text strong>{selectedConversation.userName || 'Khách hàng'}</Text>
                  {selectedConversation.userEmail && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {selectedConversation.userEmail}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
              {typingUsers.length > 0 && (
                <Text type="secondary" style={{ fontStyle: 'italic' }}>
                  {typingUsers.join(', ')} đang nhập...
                </Text>
              )}
            </div>
            <div className="support-chat-messages" ref={messagesContainerRef}>
              {loading && messages.length === 0 ? (
                <div className="loading-container">
                  <Spin size="large" />
                </div>
              ) : messages.length === 0 ? (
                <Empty description="Chưa có tin nhắn nào" />
              ) : (
                messages
                  .filter((msg, index, self) => 
                    // Remove duplicates - keep first occurrence
                    index === self.findIndex(m => m._id === msg._id)
                  )
                  .map((msg: ChatMessage, index) => {
                  const isSeller = msg.senderType === 'admin'; // Seller gửi như admin
                  return (
                    <div
                      key={`${msg._id}-${index}`}
                      className={`message-item ${isSeller ? 'message-sent' : 'message-received'}`}
                    >
                      <div className="message-content">
                        <div className="message-text">{msg.message}</div>
                        <div className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="support-chat-input">
              <TextArea
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Nhập tin nhắn..." : "Đang kết nối..."}
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={!isConnected || !selectedConversation}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!inputMessage.trim() || !isConnected || !selectedConversation}
                loading={loading}
              >
                Gửi
              </Button>
            </div>
          </>
        ) : (
          <div className="no-conversation-selected">
            <Empty description="Chọn một cuộc trò chuyện để bắt đầu" />
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default SellerSupport;

