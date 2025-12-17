import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import {
  AiOutlineMessage,
  AiOutlineSend,
  AiOutlineInbox,
  AiOutlineStar,
  AiOutlineDelete,
  AiOutlineUser,
  AiOutlineTeam,
  AiOutlineClockCircle,
  AiOutlineSearch,
  AiOutlinePaperClip,
  AiOutlineClose,
  AiOutlinePlus,
} from 'react-icons/ai';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [view, setView] = useState('inbox'); // inbox, sent, starred, archived
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser] = useState({ $id: 'current-user-id', name: 'Current User' }); // Mock current user

  const [newMessage, setNewMessage] = useState({
    recipients: [],
    subject: '',
    body: '',
    priority: 'normal',
  });

  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const guardsRes = await databases.listDocuments(
        config.databaseId,
        config.guardsCollectionId,
        [Query.limit(500)]
      );

      setGuards(guardsRes.documents);

      // Only initialize demo messages if messages array is empty
      if (messages.length === 0) {
        const demoMessages = [
        {
          $id: '1',
          senderId: 'guard-1',
          senderName: 'John Smith',
          recipients: [currentUser.$id],
          subject: 'Shift Swap Request',
          body: 'Hi, I was wondering if you could swap shifts with me this Saturday? I have a family emergency.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          read: false,
          starred: false,
          priority: 'high',
          replies: [],
        },
        {
          $id: '2',
          senderId: currentUser.$id,
          senderName: currentUser.name,
          recipients: ['guard-2'],
          subject: 'Site Access Update',
          body: 'The access codes for the main entrance have been updated. New code is 4729.',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          read: true,
          starred: false,
          priority: 'normal',
          replies: [],
        },
        {
          $id: '3',
          senderId: 'guard-3',
          senderName: 'Sarah Johnson',
          recipients: [currentUser.$id, 'guard-4'],
          subject: 'Equipment Check',
          body: 'Reminder: All radios need to be checked in by 6 PM today for maintenance.',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          read: true,
          starred: true,
          priority: 'normal',
          replies: [
            {
              id: 'r1',
              senderId: currentUser.$id,
              senderName: currentUser.name,
              body: 'Confirmed. I will check in my radio by 5 PM.',
              timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
            }
          ],
        },
      ];

        setMessages(demoMessages);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const getGuardName = (guardId) => {
    if (guardId === currentUser.$id) return 'You';
    const guard = guards.find(g => g.$id === guardId);
    return guard ? `${guard.firstName} ${guard.lastName}` : 'Unknown';
  };

  const handleNewMessage = () => {
    setNewMessage({
      recipients: [],
      subject: '',
      body: '',
      priority: 'normal',
    });
    setShowNewMessageModal(true);
  };

  const handleSendMessage = () => {
    if (!newMessage.recipients.length || !newMessage.subject || !newMessage.body) {
      alert('Please fill in all required fields');
      return;
    }

    const message = {
      $id: ID.unique(),
      senderId: currentUser.$id,
      senderName: currentUser.name,
      recipients: newMessage.recipients,
      subject: newMessage.subject,
      body: newMessage.body,
      priority: newMessage.priority,
      timestamp: new Date().toISOString(),
      read: false,
      starred: false,
      replies: [],
    };

    setMessages([message, ...messages]);
    setShowNewMessageModal(false);
    alert('Message sent successfully!');
  };

  const handleReply = (messageId) => {
    if (!replyMessage.trim()) return;

    const updatedMessages = messages.map(msg => {
      if (msg.$id === messageId) {
        return {
          ...msg,
          replies: [
            ...msg.replies,
            {
              id: ID.unique(),
              senderId: currentUser.$id,
              senderName: currentUser.name,
              body: replyMessage,
              timestamp: new Date().toISOString(),
            }
          ]
        };
      }
      return msg;
    });

    setMessages(updatedMessages);
    setReplyMessage('');
    alert('Reply sent!');
  };

  const handleMarkAsRead = (messageId) => {
    const updatedMessages = messages.map(msg =>
      msg.$id === messageId ? { ...msg, read: true } : msg
    );
    setMessages(updatedMessages);
  };

  const handleToggleStar = (messageId) => {
    const updatedMessages = messages.map(msg =>
      msg.$id === messageId ? { ...msg, starred: !msg.starred } : msg
    );
    setMessages(updatedMessages);
  };

  const handleDeleteMessage = (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    setMessages(messages.filter(msg => msg.$id !== messageId));
    setSelectedConversation(null);
    alert('Message deleted!');
  };

  const filterMessages = () => {
    let filtered = [...messages];

    // View filter
    if (view === 'inbox') {
      filtered = filtered.filter(msg => msg.recipients.includes(currentUser.$id));
    } else if (view === 'sent') {
      filtered = filtered.filter(msg => msg.senderId === currentUser.$id);
    } else if (view === 'starred') {
      filtered = filtered.filter(msg => msg.starred);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(msg =>
        msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.senderName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return filtered;
  };

  const calculateStats = () => {
    const inbox = messages.filter(msg => msg.recipients.includes(currentUser.$id));
    const unread = inbox.filter(msg => !msg.read).length;
    const starred = messages.filter(msg => msg.starred).length;
    const sent = messages.filter(msg => msg.senderId === currentUser.$id).length;

    return { inbox: inbox.length, unread, starred, sent };
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'urgent': return 'text-red-600';
      default: return 'text-white/50';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const stats = calculateStats();
  const filteredMessages = filterMessages();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AiOutlineClockCircle className="mx-auto mb-4 h-12 w-12 animate-spin text-accent" />
          <p className="text-white/70">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Messages</h1>
          <p className="mt-2 text-white/70">Internal communication system</p>
        </div>
        <button
          onClick={handleNewMessage}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
        >
          <AiOutlinePlus className="h-5 w-5" />
          New Message
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4 cursor-pointer hover:border-accent/50 transition-all" onClick={() => setView('inbox')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Inbox</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.inbox}</p>
            </div>
            <AiOutlineInbox className="h-6 w-6 text-accent" />
          </div>
        </div>

        <div className="glass-panel p-4 cursor-pointer hover:border-accent/50 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Unread</p>
              <p className="mt-1 text-2xl font-bold text-yellow-400">{stats.unread}</p>
            </div>
            <AiOutlineMessage className="h-6 w-6 text-yellow-400" />
          </div>
        </div>

        <div className="glass-panel p-4 cursor-pointer hover:border-accent/50 transition-all" onClick={() => setView('starred')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Starred</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.starred}</p>
            </div>
            <AiOutlineStar className="h-6 w-6 text-yellow-500" />
          </div>
        </div>

        <div className="glass-panel p-4 cursor-pointer hover:border-accent/50 transition-all" onClick={() => setView('sent')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Sent</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.sent}</p>
            </div>
            <AiOutlineSend className="h-6 w-6 text-accent" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Message List */}
        <div className="w-2/5 glass-panel flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b border-white/10">
            <div className="relative mb-3">
              <AiOutlineSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setView('inbox')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  view === 'inbox' ? 'bg-accent text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Inbox
              </button>
              <button
                onClick={() => setView('sent')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  view === 'sent' ? 'bg-accent text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Sent
              </button>
              <button
                onClick={() => setView('starred')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  view === 'starred' ? 'bg-accent text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Starred
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <AiOutlineInbox className="h-16 w-16 text-white/20 mb-4" />
                <p className="text-white/50">No messages found</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.$id}
                  onClick={() => {
                    setSelectedConversation(msg);
                    if (!msg.read && msg.recipients.includes(currentUser.$id)) {
                      handleMarkAsRead(msg.$id);
                    }
                  }}
                  className={`p-4 border-b border-white/10 cursor-pointer transition-all hover:bg-white/5 ${
                    selectedConversation?.$id === msg.$id ? 'bg-white/10' : ''
                  } ${!msg.read && msg.recipients.includes(currentUser.$id) ? 'bg-accent/5' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-semibold">
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!msg.read && msg.recipients.includes(currentUser.$id) ? 'font-semibold text-white' : 'text-white/70'}`}>
                          {msg.senderId === currentUser.$id ? `To: ${getGuardName(msg.recipients[0])}` : msg.senderName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {msg.starred && <AiOutlineStar className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      <span className="text-xs text-white/50 whitespace-nowrap">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                  </div>
                  <h4 className={`text-sm mb-1 truncate ${!msg.read && msg.recipients.includes(currentUser.$id) ? 'font-semibold text-white' : 'text-white/70'} ${getPriorityColor(msg.priority)}`}>
                    {msg.subject}
                  </h4>
                  <p className="text-xs text-white/50 truncate">{msg.body}</p>
                  {msg.replies.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-accent">
                      <AiOutlineMessage className="h-3 w-3" />
                      <span>{msg.replies.length} {msg.replies.length === 1 ? 'reply' : 'replies'}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1 glass-panel flex flex-col">
          {selectedConversation ? (
            <>
              {/* Message Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-bold text-white">{selectedConversation.subject}</h2>
                      {selectedConversation.priority !== 'normal' && (
                        <span className={`text-xs font-semibold uppercase ${getPriorityColor(selectedConversation.priority)}`}>
                          {selectedConversation.priority}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/50">
                      <div className="flex items-center gap-1">
                        <AiOutlineUser className="h-4 w-4" />
                        <span>From: {selectedConversation.senderName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AiOutlineTeam className="h-4 w-4" />
                        <span>To: {selectedConversation.recipients.map(r => getGuardName(r)).join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AiOutlineClockCircle className="h-4 w-4" />
                        <span>{new Date(selectedConversation.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStar(selectedConversation.$id)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                    >
                      <AiOutlineStar className={`h-5 w-5 ${selectedConversation.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(selectedConversation.$id)}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <AiOutlineDelete className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Body & Replies */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Original Message */}
                <div>
                  <p className="text-white/70 whitespace-pre-wrap">{selectedConversation.body}</p>
                </div>

                {/* Replies */}
                {selectedConversation.replies.length > 0 && (
                  <div className="space-y-4">
                    <div className="border-t border-white/10 pt-4">
                      <h3 className="text-sm font-semibold text-white/50 mb-4">REPLIES ({selectedConversation.replies.length})</h3>
                    </div>
                    {selectedConversation.replies.map((reply) => (
                      <div key={reply.id} className="rounded-lg bg-white/5 border border-white/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-semibold">
                            {reply.senderName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-white">{reply.senderName}</span>
                          <span className="text-xs text-white/50">{formatTimestamp(reply.timestamp)}</span>
                        </div>
                        <p className="text-white/70">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Section */}
              {selectedConversation.recipients.includes(currentUser.$id) && (
                <div className="p-6 border-t border-white/10">
                  <div className="flex gap-3">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                      rows="3"
                    />
                    <button
                      onClick={() => handleReply(selectedConversation.$id)}
                      className="rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent/90 transition-all flex items-center gap-2"
                    >
                      <AiOutlineSend className="h-5 w-5" />
                      Send
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <AiOutlineMessage className="h-20 w-20 text-white/20 mx-auto mb-4" />
                <p className="text-lg text-white/50">Select a message to view</p>
                <p className="text-sm text-white/30 mt-2">Choose a conversation from the list</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-3xl">
            <div className="border-b border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">New Message</h2>
                <button
                  onClick={() => setShowNewMessageModal(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Recipients */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  To <span className="text-red-400">*</span>
                </label>
                <select
                  multiple
                  value={newMessage.recipients}
                  onChange={(e) => setNewMessage({
                    ...newMessage,
                    recipients: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                  size="5"
                >
                  {guards.map(guard => (
                    <option key={guard.$id} value={guard.$id}>
                      {guard.firstName} {guard.lastName}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-white/50">Hold Ctrl/Cmd to select multiple recipients</p>
              </div>

              {/* Priority */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Priority</label>
                <select
                  value={newMessage.priority}
                  onChange={(e) => setNewMessage({ ...newMessage, priority: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Subject <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Message subject"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={newMessage.body}
                  onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Type your message..."
                  rows="8"
                />
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/5 p-6">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNewMessageModal(false)}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-medium text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
                >
                  <AiOutlineSend className="h-5 w-5" />
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
