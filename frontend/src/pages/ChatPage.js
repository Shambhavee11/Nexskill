import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { messagesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

let socket;

export default function ChatPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Init socket
  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    socket = io(
      process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000',
      {
        auth: { token }
      }
    );

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('new_message', (msg) => {
      if (msg.conversation_id === activeConv?.id) {
        setMessages(prev => [...prev, msg]);
      }

      setConversations(prev =>
        prev.map(c =>
          c.id === msg.conversation_id
            ? {
                ...c,
                last_message: msg.content,
                unread_count: c.id === activeConv?.id ? c.unread_count : (c.unread_count || 0) + 1
              }
            : c
        )
      );
    });

    socket.on('message_sent', (msg) => {
      if (msg.conversation_id === activeConv?.id) {
        setMessages(prev => [...prev, msg]);
      }

      setConversations(prev =>
        prev.map(c =>
          c.id === msg.conversation_id
            ? { ...c, last_message: msg.content }
            : c
        )
      );
    });

    socket.on('user_typing', ({ sender_id, conversation_id }) => {
      if (
        conversation_id === activeConv?.id ||
        sender_id === activeConv?.other_user_id
      ) {
        setTyping(true);
      }
    });

    socket.on('user_stop_typing', ({ sender_id, conversation_id }) => {
      if (
        conversation_id === activeConv?.id ||
        sender_id === activeConv?.other_user_id
      ) {
        setTyping(false);
      }
    });

    return () => {
      socket?.disconnect();
    };
  }, [activeConv?.id, activeConv?.other_user_id]);

  // Load conversations
  useEffect(() => {
    messagesAPI.getConversations()
      .then(res => {
        const convs = res.data.conversations || [];
        setConversations(convs);

        if (conversationId) {
          const conv = convs.find(c => String(c.id) === String(conversationId));
          if (conv) {
            setActiveConv(conv);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load conversations:', err);
      });
  }, [conversationId]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConv?.id) {
      messagesAPI.getMessages(activeConv.id)
        .then(res => setMessages(res.data.messages || []))
        .catch((err) => {
          console.error('Failed to load messages:', err);
        });

      socket?.emit('mark_read', { conversation_id: activeConv.id });
    }
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMsg.trim() || !activeConv || !socket) return;

    socket.emit('send_message', {
      conversation_id: activeConv.id,
      receiver_id: activeConv.other_user_id,
      content: newMsg.trim(),
    });

    socket.emit('stop_typing', {
      conversation_id: activeConv.id,
      receiver_id: activeConv.other_user_id
    });

    setNewMsg('');
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);

    if (!activeConv || !socket) return;

    socket.emit('typing', {
      conversation_id: activeConv.id,
      receiver_id: activeConv.other_user_id
    });

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        conversation_id: activeConv.id,
        receiver_id: activeConv.other_user_id
      });
    }, 1500);
  };

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={s.page}>
      {/* Sidebar: Conversations */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <h2 style={s.sidebarTitle}>Messages</h2>
          <div
            style={{ ...s.connDot, background: connected ? '#10b981' : '#ef4444' }}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>

        <div style={s.convList}>
          {conversations.length === 0 && (
            <div style={s.noConvs}>
              <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center' }}>
                No conversations yet.
                <br />
                Request a service to start chatting!
              </p>
            </div>
          )}

          {conversations.map(conv => (
            <div
              key={conv.id}
              style={{ ...s.convItem, ...(activeConv?.id === conv.id ? s.convActive : {}) }}
              onClick={() => {
                setActiveConv(conv);
                navigate(`/chat/${conv.id}`);
              }}
            >
              <div style={s.convAvatar}>
                {getInitials(conv.other_user_name)}
              </div>

              <div style={s.convInfo}>
                <div style={s.convName}>
                  {conv.other_user_name || 'Unknown User'}
                </div>
                <div style={s.convLast}>
                  {conv.last_message?.slice(0, 35) || 'No messages yet'}
                </div>
              </div>

              {conv.unread_count > 0 && (
                <div style={s.unreadBadge}>{conv.unread_count}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div style={s.chatArea}>
        {activeConv ? (
          <>
            {/* Chat header */}
            <div style={s.chatHeader}>
              <div style={s.chatAvatar}>
                {getInitials(activeConv.other_user_name)}
              </div>
              <div>
                <div style={s.chatName}>
                  {activeConv.other_user_name || 'Unknown User'}
                </div>
                {typing && <div style={s.typingIndicator}>typing...</div>}
              </div>
            </div>

            {/* Messages */}
            <div style={s.messages}>
              {messages.map((msg, i) => {
                const isMine = msg.sender_id === user?.id;

                return (
                  <div
                    key={msg.id || i}
                    style={{
                      ...s.msgWrapper,
                      justifyContent: isMine ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {!isMine && (
                      <div style={s.msgAvatar}>
                        {getInitials(msg.sender_name)}
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          ...s.bubble,
                          ...(isMine ? s.bubbleMine : s.bubbleOther)
                        }}
                      >
                        {msg.content}
                      </div>

                      <div
                        style={{
                          ...s.msgTime,
                          textAlign: isMine ? 'right' : 'left'
                        }}
                      >
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div style={{ ...s.msgWrapper, justifyContent: 'flex-start' }}>
                  <div style={s.bubble}>
                    <span style={s.typingDots}>● ● ●</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={s.inputArea}>
              <span style={s.attachIcon}>📎</span>
              <input
                style={s.msgInput}
                value={newMsg}
                onChange={handleTyping}
                onKeyDown={e =>
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  (e.preventDefault(), sendMessage())
                }
                placeholder="Type a message..."
              />
              <button
                style={s.sendBtn}
                onClick={sendMessage}
                disabled={!newMsg.trim()}
              >
                ➤
              </button>
            </div>
          </>
        ) : (
          <div style={s.noChat}>
            <div style={s.noChatIcon}>💬</div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, marginBottom: 8 }}>
              Select a conversation
            </h3>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              Choose a conversation from the sidebar to start messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' },
  sidebar: {
    width: 320,
    background: '#1a1a2e',
    borderRight: '1px solid rgba(99,102,241,0.15)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0
  },
  sidebarHeader: {
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(99,102,241,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sidebarTitle: { fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 },
  connDot: { width: 10, height: 10, borderRadius: '50%' },
  convList: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  noConvs: { padding: 24 },
  convItem: {
    display: 'flex',
    gap: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    alignItems: 'center',
    transition: 'background 0.15s'
  },
  convActive: { background: 'rgba(99,102,241,0.1)' },
  convAvatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: 'white',
    flexShrink: 0
  },
  convInfo: { flex: 1, overflow: 'hidden' },
  convName: {
    fontWeight: 600,
    fontSize: 14,
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  convLast: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  unreadBadge: {
    background: '#6366f1',
    color: 'white',
    borderRadius: '50%',
    width: 20,
    height: 20,
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700
  },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(99,102,241,0.1)',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    background: '#1a1a2e'
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: 'white'
  },
  chatName: { fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15 },
  typingIndicator: { fontSize: 12, color: '#6366f1' },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  msgWrapper: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: 'white',
    flexShrink: 0
  },
  bubble: {
    maxWidth: 420,
    padding: '10px 14px',
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.5
  },
  bubbleMine: {
    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    color: 'white',
    borderBottomRightRadius: 4
  },
  bubbleOther: {
    background: '#16213e',
    color: '#f1f5f9',
    border: '1px solid rgba(99,102,241,0.15)',
    borderBottomLeftRadius: 4
  },
  msgTime: { fontSize: 11, color: '#475569', marginTop: 4 },
  typingDots: { letterSpacing: 4, color: '#6366f1', fontSize: 10 },
  inputArea: {
    padding: '12px 24px',
    borderTop: '1px solid rgba(99,102,241,0.1)',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    background: '#1a1a2e'
  },
  attachIcon: { cursor: 'pointer', fontSize: 18, color: '#64748b' },
  msgInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 12,
    padding: '10px 16px',
    color: '#f1f5f9',
    fontSize: 14,
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none'
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f1f5f9'
  },
  noChatIcon: { fontSize: 64, marginBottom: 16, opacity: 0.3 },
};