/**
 * Chat Context với Socket.io
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import type { ChatMessage, ChatConversation } from '../api/chatService';
import chatService from '../api/chatService';

interface ChatContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentConversation: ChatConversation | null;
  messages: ChatMessage[];
  conversations: ChatConversation[];
  loading: boolean;
  error: string | null;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  joinConversation: (conversationId?: string) => Promise<void>;
  sendMessage: (message: string, messageType?: 'text' | 'image' | 'file', attachments?: any[]) => Promise<void>;
  markAsRead: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  
  // Typing
  startTyping: () => void;
  stopTyping: () => void;
  typingUsers: string[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const token = useSelector((state: any) => state?.auth?.token);
  const user = useSelector((state: any) => state?.auth?.user);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markAsReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedConversationRef = useRef<string | null>(null);

  // Get token from localStorage (same as authApi)
  const getToken = (): string | null => {
    try {
      const persistAuth = localStorage.getItem('persist:auth');
      if (persistAuth) {
        const parsed = JSON.parse(persistAuth);
        let token = parsed.token;
        if (token && typeof token === 'string') {
          if (token.startsWith('"') && token.endsWith('"')) {
            token = JSON.parse(token);
          }
          if (token && token !== 'null' && token !== 'undefined') {
            return token;
          }
        }
      }
    } catch (error) {
      console.error('[Chat] Error getting token:', error);
    }
    return null;
  };

  // Load messages
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await chatService.getMessages(conversationId, { limit: 100 });
      // Backend đã sort từ cũ đến mới (createdAt: 1), không cần reverse
      // Tin nhắn cũ nhất ở đầu, mới nhất ở cuối
      setMessages(response.data);
    } catch (error: any) {
      console.error('[Chat] Error loading messages:', error);
      setError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const response = await chatService.getConversations();
      setConversations(response.data);
    } catch (error: any) {
      console.error('[Chat] Error loading conversations:', error);
      setError(error.message || 'Failed to load conversations');
    }
  }, []);

  // Connect to Socket.io
  const connect = useCallback(() => {
    if (socket?.connected) {
      return;
    }

    const authToken = token || getToken();
    if (!authToken) {
      console.warn('[Chat] No token available, cannot connect');
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socketUrl = API_URL.replace('/api', '');

    console.log('[Chat] Connecting to:', socketUrl);

    const newSocket = io(socketUrl, {
      auth: {
        token: authToken
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000
    });

    newSocket.on('connect', () => {
      console.log('[Chat] Connected to server');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('[Chat] Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Chat] Connection error:', err);
      setError(err.message);
      setIsConnected(false);
    });

    newSocket.on('error', (data) => {
      console.error('[Chat] Socket error:', data);
      setError(data.message || 'Unknown error');
    });

    newSocket.on('conversation_created', (data) => {
      console.log('[Chat] Conversation created:', data);
      setCurrentConversation(data.conversation);
      loadConversations();
    });

    newSocket.on('conversation_joined', (data) => {
      console.log('[Chat] Joined conversation:', data);
    });

    newSocket.on('new_message', (data) => {
      console.log('[Chat] New message received:', data);
      if (data.message) {
        // Thêm tin nhắn mới vào cuối danh sách (tin nhắn mới nhất)
        setMessages(prev => {
          // Kiểm tra xem tin nhắn đã tồn tại chưa (tránh duplicate)
          const exists = prev.some(msg => msg._id === data.message._id);
          if (exists) {
            return prev;
          }
          // Thêm vào cuối để giữ thứ tự cũ → mới
          return [...prev, data.message];
        });
      }
      if (data.conversation) {
        setCurrentConversation(data.conversation);
        loadConversations();
      }
    });

    newSocket.on('new_user_message', (data) => {
      console.log('[Chat] New user message (admin notification):', data);
      loadConversations();
    });

    newSocket.on('new_admin_message', (data) => {
      console.log('[Chat] New admin message (user notification):', data);
      // Use functional update to access current conversation state
      setCurrentConversation(prevConv => {
        if (prevConv?._id === data.conversationId) {
          // Nếu có message trong data, thêm trực tiếp vào danh sách
          if (data.message) {
            setMessages(prev => {
              const exists = prev.some(msg => msg._id === data.message._id);
              if (exists) {
                return prev;
              }
              // Thêm vào cuối để giữ thứ tự cũ → mới
              return [...prev, data.message];
            });
          } else {
            // Nếu không có message, reload toàn bộ
            loadMessages(data.conversationId);
          }
        }
        return data.conversation || prevConv;
      });
      loadConversations();
    });

    newSocket.on('messages_read', (data) => {
      console.log('[Chat] Messages read:', data);
      // Update messages read status
      setMessages(prev => prev.map(msg => 
        msg.conversationId === data.conversationId ? { ...msg, isRead: true } : msg
      ));
    });

    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => {
        if (data.userId !== user?.id && !prev.includes(data.userName)) {
          return [...prev, data.userName];
        }
        return prev;
      });
    });

    newSocket.on('user_stop_typing', (data) => {
      setTypingUsers(prev => prev.filter(name => name !== data.userName));
    });

    setSocket(newSocket);
  }, [token, user, loadConversations, loadMessages]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Join conversation
  const joinConversation = useCallback(async (conversationId?: string) => {
    if (!socket || !isConnected) {
      await connect();
    }

    if (!socket) {
      throw new Error('Socket not connected');
    }

    if (conversationId) {
      socket.emit('join_conversation', { conversationId });
      await loadMessages(conversationId);
      const conversation = await chatService.getConversation(conversationId);
      setCurrentConversation(conversation);
    } else {
      socket.emit('join_conversation', {});
    }
  }, [socket, isConnected, connect]);

  // Send message
  const sendMessage = useCallback(async (
    message: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    attachments: any[] = []
  ) => {
    if (!socket || !isConnected) {
      throw new Error('Socket not connected');
    }

    if (!currentConversation) {
      throw new Error('No conversation selected');
    }

    socket.emit('send_message', {
      conversationId: currentConversation._id,
      message,
      messageType,
      attachments
    });
  }, [socket, isConnected, currentConversation]);

  // Mark as read (with debouncing to prevent infinite loops)
  const markAsRead = useCallback(async () => {
    if (!currentConversation) {
      return;
    }

    const conversationId = currentConversation._id;
    
    // Prevent duplicate calls for the same conversation
    if (lastMarkedConversationRef.current === conversationId) {
      return;
    }

    // Clear any pending mark as read calls
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    // Debounce the mark as read call
    markAsReadTimeoutRef.current = setTimeout(async () => {
      lastMarkedConversationRef.current = conversationId;
      
      if (socket && isConnected) {
        socket.emit('mark_as_read', { conversationId });
      }

      try {
        await chatService.markAsRead(conversationId);
      } catch (error) {
        console.error('[Chat] Error marking as read:', error);
        // Reset on error so we can retry
        lastMarkedConversationRef.current = null;
      }
    }, 500); // 500ms debounce
  }, [currentConversation, socket, isConnected]);

  // Typing handlers
  const startTyping = useCallback(() => {
    if (!socket || !isConnected || !currentConversation) {
      return;
    }

    socket.emit('typing', { conversationId: currentConversation._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [socket, isConnected, currentConversation]);

  const stopTyping = useCallback(() => {
    if (!socket || !isConnected || !currentConversation) {
      return;
    }

    socket.emit('stop_typing', { conversationId: currentConversation._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, isConnected, currentConversation]);

  // Auto connect when token is available
  useEffect(() => {
    if (token && user && !socket?.connected) {
      connect();
    }

    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      // Clear mark as read timeout on unmount
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
      lastMarkedConversationRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  // Auto mark as read when new messages arrive (with proper guards)
  useEffect(() => {
    if (!currentConversation || messages.length === 0) {
      return;
    }

    // Only mark as read if we haven't already marked this conversation
    if (lastMarkedConversationRef.current === currentConversation._id) {
      return;
    }

    const unreadMessages = messages.filter(
      msg => !msg.isRead && msg.senderType !== 'user'
    );
    
    // Only mark as read if there are actually unread messages
    if (unreadMessages.length > 0) {
      markAsRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, currentConversation?._id]);

  const value: ChatContextType = {
    socket,
    isConnected,
    currentConversation,
    messages,
    conversations,
    loading,
    error,
    connect,
    disconnect,
    joinConversation,
    sendMessage,
    markAsRead,
    loadMessages,
    loadConversations,
    startTyping,
    stopTyping,
    typingUsers
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};


