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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentConversationRef = useRef<ChatConversation | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  
  // Keep refs in sync with state
  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);
  
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

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

  // Load messages - defined before connect to avoid initialization error
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await chatService.getMessages(conversationId, { limit: 100 });
      setMessages(response.data.reverse()); // Reverse để hiển thị từ cũ đến mới
    } catch (error: any) {
      console.error('[Chat] Error loading messages:', error);
      setError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load conversations - defined before connect to avoid initialization error
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
    // Prevent multiple connections
    if (socketRef.current?.connected) {
      console.log('[Chat] Already connected, skipping...');
      return;
    }
    
    // Prevent if already connecting
    if (isConnectingRef.current) {
      console.log('[Chat] Connection already in progress, skipping...');
      return;
    }
    
    // Clean up existing socket if it exists but not connected
    if (socketRef.current && !socketRef.current.connected) {
      console.log('[Chat] Cleaning up existing socket...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      setSocket(null);
      socketRef.current = null;
    }

    const authToken = token || getToken();
    if (!authToken) {
      console.warn('[Chat] No token available, cannot connect');
      return;
    }

    isConnectingRef.current = true;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socketUrl = API_URL.replace('/api', '');

    console.log('[Chat] Connecting to:', socketUrl);

    const newSocket = io(socketUrl, {
      auth: {
        token: authToken
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Chat] Connected to server');
      setIsConnected(true);
      setError(null);
      isConnectingRef.current = false;
    });

    newSocket.on('disconnect', () => {
      console.log('[Chat] Disconnected from server');
      setIsConnected(false);
      isConnectingRef.current = false;
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Chat] Connection error:', err);
      setError(err.message);
      setIsConnected(false);
      isConnectingRef.current = false;
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
        setMessages(prev => [...prev, data.message]);
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
      // Use ref to access current conversation value
      if (currentConversationRef.current?._id === data.conversationId) {
        loadMessages(data.conversationId);
      }
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
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          if (!prev.includes(data.userName)) {
            return [...prev, data.userName];
          }
          return prev;
        });
      }
    });

    newSocket.on('user_stop_typing', (data) => {
      setTypingUsers(prev => prev.filter(name => name !== data.userName));
    });

    setSocket(newSocket);
    socketRef.current = newSocket;
  }, [token, user, loadConversations, loadMessages]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  }, []);

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

  // Mark as read
  const markAsRead = useCallback(async () => {
    if (!currentConversation) {
      return;
    }

    if (socket && isConnected) {
      socket.emit('mark_as_read', { conversationId: currentConversation._id });
    }

    try {
      await chatService.markAsRead(currentConversation._id);
    } catch (error) {
      console.error('[Chat] Error marking as read:', error);
    }
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
    if (token && user) {
      connect();
    }

    return () => {
      if (socketRef.current) {
        disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]); // Removed connect and disconnect from dependencies to prevent infinite loop

  // Auto mark as read when new messages arrive
  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      const unreadMessages = messages.filter(
        msg => !msg.isRead && msg.senderType !== 'user'
      );
      if (unreadMessages.length > 0) {
        markAsRead();
      }
    }
  }, [messages, currentConversation, markAsRead]);

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


