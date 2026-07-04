import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { io, Socket } from 'socket.io-client'
import {
  Search, MoreVertical, Phone, Video,
  Send, Smile, Paperclip, Mic,
  MessageCircle, LogOut, Sun, Moon,
} from 'lucide-react'

const API = 'https://chatapp-backend-i946.vercel.app'

interface Message {
  _id: string
  sender: { _id: string; name: string }
  content: string
  createdAt: string
  read: boolean
}

interface Chat {
  _id: string
  name?: string
  isGroup: boolean
  participants: { _id: string; name: string; email?: string; online?: boolean }[]
  latestMessage?: { content: string; createdAt: string }
  unreadCount?: number
}

export default function ChatPage() {
  const { user, logout } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [typing, setTyping] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [users, setUsers] = useState<{ _id: string; name: string; email?: string }[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showNewChat, setShowNewChat] = useState(false) 

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => { 
    if (!user) return
    const newSocket = io(API, { query: { userId: user._id } })
    setSocket(newSocket)
    newSocket.on('online-users', (users: string[]) => setOnlineUsers(users))
    newSocket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message])
    })
    newSocket.on('typing', () => setIsTyping(true))
    newSocket.on('stop-typing', () => setIsTyping(false))
    return () => { newSocket.disconnect() }
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

 useEffect(() => {
    if (!user) return
    fetch(`${API}/api/chats`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => setChats(Array.isArray(data) ? data : []))
      .catch(() => setChats([]))

    fetch(`${API}/api/users`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
  }, [user])

  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat)
    if (!user) return
    socket?.emit('join-chat', chat._id)
    const res = await fetch(`${API}/api/messages/${chat._id}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    const data = await res.json()
    setMessages(Array.isArray(data) ? data : [])
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return
    socket?.emit('stop-typing', selectedChat._id)

    const res = await fetch(`${API}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ chatId: selectedChat._id, content: newMessage }),
    })
    const data = await res.json()
    setMessages(prev => [...prev, data])
    setNewMessage('')
    socket?.emit('new-message', { ...data, chatId: selectedChat._id })
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    if (!socket || !selectedChat) return
    if (!typing) {
      setTyping(true)
      socket.emit('typing', selectedChat._id)
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', selectedChat._id)
      setTyping(false)
    }, 2000)
  }

  const getChatName = (chat: Chat) => {
    if (chat.isGroup) return chat.name || 'Group'
    const other = chat.participants.find(p => p._id !== user?._id)
    return other?.name || 'Unknown'
  }

  const getChatInitial = (chat: Chat) => getChatName(chat)[0]?.toUpperCase() || '?'

  const isOnline = (chat: Chat) => {
    if (chat.isGroup) return false
    const other = chat.participants.find(p => p._id !== user?._id)
    return other ? onlineUsers.includes(other._id) : false
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const filteredChats = chats.filter(c =>
    getChatName(c).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{
        width: 360, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg2)', flexShrink: 0,
      }} className="chat-sidebar">

        {/* Sidebar Header */}
        <div style={{
          padding: '1rem 1.2rem', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#fff', fontSize: '1rem',
            }}>
              {user?.name[0]?.toUpperCase()}
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user?.name}</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: '0.4rem' }}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={logout}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: '0.4rem' }}>
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Search + New Chat */}
<div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border)' }}>
  <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
    <input
      placeholder="Search or start new chat"
      value={search}
      onChange={e => setSearch(e.target.value)}
      style={{ paddingLeft: '2.5rem', borderRadius: 8, fontSize: '0.88rem' }}
    />
  </div>
  <button
    onClick={() => setShowNewChat(true)}
    style={{
      width: '100%', background: 'var(--accent)', color: '#fff',
      border: 'none', borderRadius: 8, padding: '0.6rem',
      fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
    }}>
    + New Chat
  </button>
</div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChats.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
              <MessageCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.88rem' }}>No chats yet</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div key={chat._id} onClick={() => selectChat(chat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.9rem',
                  padding: '0.9rem 1.2rem', cursor: 'pointer',
                  background: selectedChat?._id === chat._id ? 'var(--bg3)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  if (selectedChat?._id !== chat._id)
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--bg3)'
                }}
                onMouseLeave={e => {
                  if (selectedChat?._id !== chat._id)
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}>

                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: '#fff', fontSize: '1.1rem',
                  }}>
                    {getChatInitial(chat)}
                  </div>
                  {isOnline(chat) && (
                    <div style={{
                      position: 'absolute', bottom: 2, right: 2,
                      width: 10, height: 10, borderRadius: '50%',
                      background: '#00A884', border: '2px solid var(--bg2)',
                    }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{getChatName(chat)}</span>
                    {chat.latestMessage && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                        {formatTime(chat.latestMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: '0.8rem', color: 'var(--muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {chat.latestMessage?.content || 'No messages yet'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedChat ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Chat Header */}
          <div style={{
            padding: '0.8rem 1.5rem', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: '#fff',
              }}>
                {getChatInitial(selectedChat)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{getChatName(selectedChat)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                  {isTyping ? 'typing...' : isOnline(selectedChat) ? 'online' : 'offline'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: '0.5rem' }}>
                <Video size={20} />
              </button>
              <button style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: '0.5rem' }}>
                <Phone size={20} />
              </button>
              <button style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: '0.5rem' }}>
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '1rem 5%',
            background: 'var(--bg)',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: '3rem' }}>
                <MessageCircle size={50} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>No messages yet. Say hello! 👋</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMine = msg.sender._id === user?._id
                return (
                  <div key={msg._id} style={{
                    display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
                    marginBottom: '0.5rem',
                  }}>
                    <div style={{
                      maxWidth: '65%', padding: '0.6rem 0.9rem',
                      borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: isMine ? 'var(--msg-out)' : 'var(--msg-in)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}>
                      {!isMine && selectedChat.isGroup && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.2rem' }}>
                          {msg.sender.name}
                        </div>
                      )}
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{msg.content}</p>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'right', marginTop: '0.2rem' }}>
                        {formatTime(msg.createdAt)}
                        {isMine && <span style={{ marginLeft: '0.3rem' }}>✓✓</span>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', fontSize: '0.82rem', padding: '0.5rem 0' }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--muted)',
                      animation: `bounce 1s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div style={{
            padding: '0.8rem 1.5rem', background: 'var(--bg2)',
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '0.8rem',
          }}>
            <button style={{ background: 'none', border: 'none', color: 'var(--muted)', flexShrink: 0 }}>
              <Smile size={22} />
            </button>
            <button style={{ background: 'none', border: 'none', color: 'var(--muted)', flexShrink: 0 }}>
              <Paperclip size={22} />
            </button>

            <input
              placeholder="Type a message"
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1, borderRadius: 8, padding: '0.7rem 1rem', fontSize: '0.9rem' }}
            />

            <button onClick={newMessage.trim() ? sendMessage : undefined}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'var(--accent)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s',
              }}>
              {newMessage.trim() ? <Send size={18} color="#fff" /> : <Mic size={18} color="#fff" />}
            </button>
          </div>
        </div>
      ) : (
        /* No chat selected */
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg)', color: 'var(--muted)',
        }}>
          <MessageCircle size={80} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>
            ChatApp
          </h2>
          <p style={{ fontSize: '0.9rem', textAlign: 'center', maxWidth: 300 }}>
            Select a chat to start messaging or search for someone to talk to.
          </p>
        </div>
      )}

     {/* New Chat Modal */}
{showNewChat && (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }} onClick={() => setShowNewChat(false)}>
    <div style={{
      background: 'var(--bg2)', borderRadius: 16,
      padding: '1.5rem', width: '90%', maxWidth: 400,
      maxHeight: '80vh', overflowY: 'auto',
    }} onClick={e => e.stopPropagation()}>
      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Start New Chat</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {users.filter(u => u._id !== user?._id).map(u => (
          <div key={u._id}
            onClick={async () => {
              const res = await fetch(`${API}/api/chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user!.token}` },
                body: JSON.stringify({ userId: u._id }),
              })
              const chat = await res.json()
              setChats(prev => {
                const exists = prev.find(c => c._id === chat._id)
                return exists ? prev : [chat, ...prev]
              })
              selectChat(chat)
              setShowNewChat(false)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.8rem',
              padding: '0.8rem', borderRadius: 10, cursor: 'pointer',
              background: 'var(--bg3)',
            }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#fff',
            }}>
              {u.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{u.email}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @media (max-width: 768px) {
          .chat-sidebar { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}