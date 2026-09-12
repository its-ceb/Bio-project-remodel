import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Hash, Lock, LogOut, Power, Plus, UserPlus, LogIn, 
  ShieldAlert, Users, MessageSquare, CheckCheck, Trash2, 
  MoreVertical, Pin, Settings, Eye, Crown, X, Award, 
  Image as ImageIcon, Reply, Loader2 
} from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, push, onValue, get, set, onDisconnect, update, remove } from 'firebase/database';
import UserProfileModal, { UserProfileData } from './UserProfileModal';

interface SecretChatProps {
  onClose: () => void;
}

interface ReplyContext {
  id: string;
  sender: string;
  text: string;
  imageUrl?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  imageUrl?: string;
  time: string;
  timestamp: number;
  readBy?: Record<string, boolean>;
  replyTo?: ReplyContext;
}

const IMGBB_API_KEY = '9e341096967527234e9d141032f6a8c5';

export default function SecretChat({ onClose }: SecretChatProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('secret_chat_user');
  });
  const [authError, setAuthError] = useState('');

  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileData>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [conversations, setConversations] = useState<string[]>([]);
  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reply State
  const [replyingTo, setReplyingTo] = useState<ReplyContext | null>(null);

  // Swipe Gesture Ref/State
  const touchStartXRef = useRef<number | null>(null);

  const [showNewDMModal, setShowNewDMModal] = useState(false);
  const [selectedDMUser, setSelectedDMUser] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [inspectingUser, setInspectingUser] = useState<string | null>(null);

  // Pinning state
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);

  // Channel Hiding state
  const [hiddenChannels, setHiddenChannels] = useState<string[]>([]);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGrantBadgeModal, setShowGrantBadgeModal] = useState(false);

  // Participants sidebar state
  const [showParticipants, setShowParticipants] = useState(false);

  // Message Options dropdown state
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);

  // Typing indicators state
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Grant Badge Form state
  const [grantTargetUser, setGrantTargetUser] = useState('');
  const [badgeCodeInput, setBadgeCodeInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [rawMessages, activeChannel, typingUsers]);

  const fetchUsersAndProfiles = async () => {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersObj = snapshot.val();
        setAllUsers(Object.keys(usersObj));

        const profilesMap: Record<string, UserProfileData> = {};
        Object.entries(usersObj).forEach(([uname, val]: [string, any]) => {
          if (val.profile) {
            profilesMap[uname] = val.profile;
          }
        });
        setUserProfiles(profilesMap);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const userPresenceRef = ref(database, `presence/${currentUser}`);
    set(userPresenceRef, true);
    onDisconnect(userPresenceRef).remove();

    const allPresenceRef = ref(database, 'presence');
    const unsubscribePresence = onValue(allPresenceRef, (snapshot) => {
      setOnlineUsers(snapshot.val() || {});
    });

    return () => unsubscribePresence();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const typingRef = ref(database, `typing/${activeChannel}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val() || {};
      const activeTyping: Record<string, boolean> = {};

      Object.entries(data).forEach(([user, isTyping]) => {
        if (user !== currentUser && isTyping) {
          activeTyping[user] = true;
        }
      });

      setTypingUsers(activeTyping);
    });

    return () => unsubscribe();
  }, [currentUser, activeChannel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);

    if (!currentUser) return;

    const userTypingRef = ref(database, `typing/${activeChannel}/${currentUser}`);
    set(userTypingRef, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      set(userTypingRef, false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const cancelImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteImage = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setSelectedImage(file);
          setImagePreview(URL.createObjectURL(file));
        }
        break;
      }
    }
  };

  const uploadImageToImgBB = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ImgBB API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.data && data.data.display_url) {
      return data.data.display_url;
    }
    throw new Error('Invalid response structure from ImgBB API');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      setAuthError('Please fill in all fields.');
      return;
    }

    const userRef = ref(database, `users/${cleanUser}`);

    try {
      const snapshot = await get(userRef);

      if (authMode === 'signup') {
        if (snapshot.exists()) {
          setAuthError('Username already taken. Please pick another.');
          return;
        }
        await set(userRef, {
          password: cleanPass,
          profile: {
            bio: 'Hello! I am using NEET Bio Chat.',
          },
        });
        localStorage.setItem('secret_chat_user', cleanUser);
        setCurrentUser(cleanUser);
      } else {
        if (!snapshot.exists()) {
          setAuthError('User does not exist. Please sign up first.');
          return;
        }

        const userData = snapshot.val();
        if (userData.password === cleanPass) {
          localStorage.setItem('secret_chat_user', cleanUser);
          setCurrentUser(cleanUser);
        } else {
          setAuthError('Incorrect password.');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError('Authentication failed. Check your connection.');
    }
  };

  const handleExplicitSignOut = () => {
    if (currentUser) {
      set(ref(database, `presence/${currentUser}`), null);
    }
    localStorage.removeItem('secret_chat_user');
    setCurrentUser(null);
  };

  useEffect(() => {
    if (!currentUser) return;

    fetchUsersAndProfiles();

    const messagesRef = ref(database, 'messages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded: ChatMessage[] = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          sender: value.sender,
          receiver: value.receiver || 'general',
          text: value.text || '',
          imageUrl: value.imageUrl,
          time: value.time,
          timestamp: value.timestamp || 0,
          readBy: value.readBy || {},
          replyTo: value.replyTo || undefined,
        }));

        setRawMessages(loaded);

        const dmUsers = new Set<string>();
        loaded.forEach((msg) => {
          if (msg.receiver !== 'general') {
            if (msg.sender === currentUser) dmUsers.add(msg.receiver);
            if (msg.receiver === currentUser) dmUsers.add(msg.sender);
          }
        });
        setConversations(Array.from(dmUsers));

        loaded.forEach((msg) => {
          const isRelevantChannel =
            (msg.receiver === 'general' && activeChannel === 'general') ||
            (msg.receiver === currentUser && msg.sender === activeChannel);

          if (isRelevantChannel && msg.sender !== currentUser && !msg.readBy?.[currentUser]) {
            update(ref(database, `messages/${msg.id}/readBy`), {
              [currentUser]: true,
            });
          }
        });
      } else {
        setRawMessages([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser, activeChannel]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputMessage.trim() && !selectedImage) || !currentUser) return;

    const userTypingRef = ref(database, `typing/${activeChannel}/${currentUser}`);
    set(userTypingRef, false);

    let uploadedUrl = '';
    if (selectedImage) {
      setIsUploadingImage(true);
      try {
        uploadedUrl = await uploadImageToImgBB(selectedImage);
      } catch (err) {
        console.error('Image upload error:', err);
        alert('Failed to upload image. Please verify your ImgBB connection.');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    let sanitizedReplyTo: ReplyContext | null = null;
    if (replyingTo) {
      sanitizedReplyTo = {
        id: replyingTo.id || '',
        sender: replyingTo.sender || '',
        text: replyingTo.text || '',
        ...(replyingTo.imageUrl ? { imageUrl: replyingTo.imageUrl } : {}),
      };
    }

    const messagesRef = ref(database, 'messages');
    const newMessage: Record<string, any> = {
      sender: currentUser,
      receiver: activeChannel,
      text: inputMessage.trim(),
      ...(uploadedUrl ? { imageUrl: uploadedUrl } : {}),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      readBy: {
        [currentUser]: true,
      },
      ...(sanitizedReplyTo ? { replyTo: sanitizedReplyTo } : {}),
    };

    try {
      await push(messagesRef, newMessage);
      setInputMessage('');
      cancelImageSelection();
      setReplyingTo(null);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await remove(ref(database, `messages/${msgId}`));
      if (pinnedMessageId === msgId) setPinnedMessageId(null);
      setActiveMessageMenuId(null);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleHideChannel = (channel: string) => {
    if (!hiddenChannels.includes(channel)) {
      setHiddenChannels([...hiddenChannels, channel]);
    }
    if (activeChannel === channel) {
      setActiveChannel('general');
    }
    setShowChannelMenu(false);
  };

  const handleUnhideChannel = (channel: string) => {
    setHiddenChannels(hiddenChannels.filter((ch) => ch !== channel));
  };

  const handleGrantBadgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = badgeCodeInput.trim();
    if (!grantTargetUser || !code) return;

    let badgeData: Partial<UserProfileData> = {};

    if (code === '400') {
      badgeData = {
        badgeText: 'NOOB',
        badgeEmoji: '🐣',
        badgeBgColor: 'bg-slate-700 border border-slate-500',
      };
    } else if (code === '600') {
      badgeData = {
        badgeText: 'TUFF',
        badgeEmoji: '🗿',
        badgeBgColor: 'bg-gradient-to-r from-purple-700 to-indigo-900 border border-purple-500/50',
      };
    } else {
      alert('Invalid badge code. Use 400 for NOOB or 600 for TUFF.');
      return;
    }

    try {
      const targetRef = ref(database, `users/${grantTargetUser}/profile`);
      await update(targetRef, badgeData);
      await fetchUsersAndProfiles();
      alert(`Badge successfully granted to @${grantTargetUser}!`);
      setGrantTargetUser('');
      setBadgeCodeInput('');
      setShowGrantBadgeModal(false);
    } catch (err) {
      console.error('Error granting badge:', err);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent, msg: ChatMessage) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartXRef.current;

    if (swipeDistance > 60) {
      setReplyingTo({
        id: msg.id,
        sender: msg.sender,
        text: msg.text || (msg.imageUrl ? '📷 Photo' : ''),
        imageUrl: msg.imageUrl,
      });
    }
    touchStartXRef.current = null;
  };

  const displayedMessages = rawMessages.filter((msg) => {
    if (activeChannel === 'general') {
      return msg.receiver === 'general';
    }
    return (
      (msg.sender === currentUser && msg.receiver === activeChannel) ||
      (msg.sender === activeChannel && msg.receiver === currentUser)
    );
  });

  // Calculate the single last seen message ID for current user
  const selfReadMessages = displayedMessages.filter((msg) => {
    if (msg.sender !== currentUser) return false;
    const readUsers = Object.keys(msg.readBy || {}).filter((u) => u !== msg.sender);
    return readUsers.length > 0;
  });
  const lastSeenMsgId = selfReadMessages.length > 0 ? selfReadMessages[selfReadMessages.length - 1].id : null;

  const pinnedMessage = rawMessages.find((m) => m.id === pinnedMessageId);

  const renderDiscordBadge = (uname: string) => {
    const prof = userProfiles[uname];
    if (!prof || !prof.badgeText) return null;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white shadow-sm ${
          prof.badgeBgColor || 'bg-emerald-600'
        }`}
      >
        <span>{prof.badgeEmoji || '🤖'}</span>
        <span>{prof.badgeText}</span>
      </span>
    );
  };

  const renderAvatar = (uname: string, size = 'h-7 w-7') => {
    const prof = userProfiles[uname];
    if (prof?.avatarUrl) {
      return (
        <img
          src={prof.avatarUrl}
          alt={uname}
          className={`${size} rounded-full object-cover shrink-0`}
        />
      );
    }
    return (
      <div
        className={`${size} flex items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-xs shrink-0`}
      >
        {uname.slice(0, 2).toUpperCase()}
      </div>
    );
  };

  const isSameDay = (t1: number, t2: number) => {
    const d1 = new Date(t1);
    const d2 = new Date(t2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const formatDateDivider = (timestamp: number) => {
    const msgDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(timestamp, today.getTime())) return 'Today';
    if (isSameDay(timestamp, yesterday.getTime())) return 'Yesterday';

    return msgDate.toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const typingUserNames = Object.keys(typingUsers);

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-red-600/10 border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            <Power className="h-3.5 w-3.5" /> Exit
          </button>

          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {authMode === 'login'
                ? 'Sign in to access encrypted chat'
                : 'Choose a unique username and password'}
            </p>
          </div>

          <div className="mb-6 flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" /> Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setAuthError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signup'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter exact username"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 font-medium">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition-colors"
            >
              {authMode === 'login' ? 'Sign In' : 'Register Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isCurrentFounder = userProfiles[currentUser]?.isFounder;
  const availableUsersToMessage = allUsers.filter((u) => u !== currentUser);
  const onlineParticipants = allUsers.filter((u) => onlineUsers[u]);
  const offlineParticipants = allUsers.filter((u) => !onlineUsers[u]);
  const activeConversations = conversations.filter((ch) => !hiddenChannels.includes(ch));
  const isGeneralHidden = hiddenChannels.includes('general');

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0b141a] font-sans text-slate-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 sm:w-72 flex flex-col border-r border-slate-800 bg-[#111b21] shrink-0">
        <div
          onClick={() => setEditingProfile(true)}
          title="Click to edit your profile"
          className="flex items-center justify-between border-b border-slate-800 bg-[#202c33] px-4 py-3.5 cursor-pointer hover:bg-[#2a3942] transition-colors group"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative">
              {renderAvatar(currentUser, 'h-9 w-9')}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#202c33]" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-100 group-hover:underline truncate">
                  {currentUser}
                </h4>
                {renderDiscordBadge(currentUser)}
              </div>
              <p className="text-[10px] text-emerald-400">Click to edit profile</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExplicitSignOut();
            }}
            title="Log Out Account"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* CHANNELS & DMS */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {!isGeneralHidden && (
            <div>
              <span className="block px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-1">
                Channels
              </span>
              <button
                onClick={() => setActiveChannel('general')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeChannel === 'general'
                    ? 'bg-[#2a3942] text-emerald-400 font-bold'
                    : 'text-slate-300 hover:bg-[#202c33]'
                }`}
              >
                <Hash className="h-4 w-4 text-emerald-400" />
                <span>general-chat</span>
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                Direct Messages ({activeConversations.length})
              </span>
            </div>

            {activeConversations.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-slate-500 italic">
                No active conversations.
              </p>
            ) : (
              <div className="space-y-0.5">
                {activeConversations.map((username) => (
                  <button
                    key={username}
                    onClick={() => setActiveChannel(username)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeChannel === username
                        ? 'bg-[#2a3942] text-emerald-400 font-bold'
                        : 'text-slate-300 hover:bg-[#202c33]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {renderAvatar(username, 'h-6 w-6')}
                      <span className="truncate">{username}</span>
                    </div>
                    <span className="text-[9px] text-slate-500">
                      {onlineUsers[username] ? 'online' : 'offline'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR FOOTER: SETTINGS & NEW DM */}
        <div className="p-3 border-t border-slate-800 bg-[#111b21] flex items-center justify-between">
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Settings"
            className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition-colors border border-slate-700/50"
          >
            <Settings className="h-4 w-4 text-emerald-400" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => {
              fetchUsersAndProfiles();
              setShowNewDMModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[#00a884] px-3.5 py-2 text-xs font-bold text-white shadow-lg hover:bg-[#008f70] transition-all"
          >
            <Plus className="h-4 w-4" /> New DM
          </button>
        </div>
      </aside>

      {/* MESSAGING CONTAINER */}
      <main className="flex-1 flex flex-col bg-[#0b141a] relative">
        <header className="flex items-center justify-between border-b border-slate-800 bg-[#1f2c34] px-4 py-3 relative">
          <div className="flex items-center gap-3">
            <div className="relative">
              {activeChannel === 'general' ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-emerald-400 font-bold">
                  <Hash className="h-5 w-5" />
                </div>
              ) : (
                renderAvatar(activeChannel, 'h-9 w-9')
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  {activeChannel === 'general' ? '#general-chat' : activeChannel}
                </h3>
                {activeChannel !== 'general' && renderDiscordBadge(activeChannel)}
              </div>
              <p className="text-[11px] text-emerald-400">
                {activeChannel === 'general'
                  ? `${Object.keys(onlineUsers).length} online`
                  : onlineUsers[activeChannel]
                  ? 'Online'
                  : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!showParticipants) fetchUsersAndProfiles();
                setShowParticipants((prev) => !prev);
              }}
              title="Toggle participants"
              className={`p-2 rounded-xl transition-colors ${
                showParticipants
                  ? 'bg-[#2a3942] text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Users className="h-5 w-5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowChannelMenu((prev) => !prev)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showChannelMenu && (
                <div className="absolute right-0 top-10 z-20 w-44 rounded-2xl border border-slate-800 bg-[#1f2c34] p-1.5 shadow-2xl">
                  <button
                    onClick={() => handleHideChannel(activeChannel)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700/60 transition-colors"
                  >
                    <Eye className="h-4 w-4 text-emerald-400" /> Hide GC
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl bg-red-600/10 border border-red-500/30 px-3.5 py-2 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-md"
            >
              <Power className="h-4 w-4" /> Exit
            </button>
          </div>
        </header>

        {/* PINNED MESSAGE HEADER BANNER */}
        {pinnedMessage && (
          <div
            onClick={() => {
              const el = document.getElementById(`msg-${pinnedMessage.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="flex items-center justify-between border-b border-emerald-500/30 bg-[#18252d] px-4 py-2 text-xs text-slate-200 cursor-pointer hover:bg-[#202c33] transition-colors"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Pin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-400 shrink-0">{pinnedMessage.sender}:</span>
              <span className="truncate text-slate-300">
                {pinnedMessage.text || (pinnedMessage.imageUrl ? '📷 Photo' : '')}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPinnedMessageId(null);
              }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* MESSAGES LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0b141a]">
          {displayedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
              <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-xs">No messages yet. Send a message to start chatting!</p>
            </div>
          ) : (
            displayedMessages.map((msg, idx) => {
              const isSelf = msg.sender === currentUser;
              const isMenuOpen = activeMessageMenuId === msg.id;

              const readUsers = Object.keys(msg.readBy || {}).filter((u) => u !== msg.sender);
              const isRead = readUsers.length > 0;

              // Check if previous message exists and has the same sender
              const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
              const showDateDivider = !prevMsg || !isSameDay(prevMsg.timestamp, msg.timestamp);
              const isSequence = !!prevMsg && prevMsg.sender === msg.sender && !showDateDivider;

              return (
                <React.Fragment key={msg.id}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="rounded-lg bg-[#182229] px-3 py-1.5 text-[11px] font-semibold text-slate-300 shadow-sm uppercase tracking-wide">
                      {formatDateDivider(msg.timestamp)}
                    </span>
                  </div>
                )}
                <div
                  id={`msg-${msg.id}`}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, msg)}
                  className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} relative group transition-transform duration-200 ${
                    isSequence ? 'mt-1' : 'mt-3'
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm text-sm relative ${
                      isSelf
                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                    }`}
                  >
                    {/* SENDER HEADER - Rendered only on the first message of a consecutive series */}
                    {!isSequence ? (
                      <div className="flex items-center justify-between border-b border-slate-700/40 pb-1 mb-1.5 gap-4">
                        <div className="flex items-center gap-2">
                          {renderAvatar(msg.sender, 'h-5 w-5')}
                          <span
                            onClick={() => setInspectingUser(msg.sender)}
                            className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                          >
                            {msg.sender}
                          </span>
                          {renderDiscordBadge(msg.sender)}
                        </div>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMessageMenuId(isMenuOpen ? null : msg.id)
                            }
                            className="p-1 rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div
                              className={`absolute z-30 w-36 rounded-xl border border-slate-800 bg-[#1f2c34] p-1 shadow-xl top-6 ${
                                isSelf ? 'right-0' : 'left-0'
                              }`}
                            >
                              <button
                                onClick={() => {
                                  setReplyingTo({
                                    id: msg.id,
                                    sender: msg.sender,
                                    text: msg.text || (msg.imageUrl ? '📷 Photo' : ''),
                                    imageUrl: msg.imageUrl,
                                  });
                                  setActiveMessageMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700/70"
                              >
                                <Reply className="h-3.5 w-3.5 text-emerald-400" /> Reply
                              </button>

                              <button
                                onClick={() => {
                                  setPinnedMessageId(msg.id);
                                  setActiveMessageMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700/70"
                              >
                                <Pin className="h-3.5 w-3.5 text-emerald-400" /> Pin Message
                              </button>

                              {(isSelf || isCurrentFounder) && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Minimal Dropdown for grouped messages */
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setActiveMessageMenuId(isMenuOpen ? null : msg.id)}
                          className="p-1 rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>

                        {isMenuOpen && (
                          <div
                            className={`absolute z-30 w-36 rounded-xl border border-slate-800 bg-[#1f2c34] p-1 shadow-xl top-6 ${
                              isSelf ? 'right-0' : 'left-0'
                            }`}
                          >
                            <button
                              onClick={() => {
                                setReplyingTo({
                                  id: msg.id,
                                  sender: msg.sender,
                                  text: msg.text || (msg.imageUrl ? '📷 Photo' : ''),
                                  imageUrl: msg.imageUrl,
                                });
                                setActiveMessageMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700/70"
                            >
                              <Reply className="h-3.5 w-3.5 text-emerald-400" /> Reply
                            </button>

                            <button
                              onClick={() => {
                                setPinnedMessageId(msg.id);
                                setActiveMessageMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700/70"
                            >
                              <Pin className="h-3.5 w-3.5 text-emerald-400" /> Pin Message
                            </button>

                            {(isSelf || isCurrentFounder) && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* REPLY PREVIEW IN BUBBLE */}
                    {msg.replyTo && (
                      <div
                        onClick={() => {
                          const target = document.getElementById(`msg-${msg.replyTo?.id}`);
                          target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="mb-2 rounded-lg border-l-4 border-emerald-400 bg-slate-900/60 p-2 text-xs cursor-pointer hover:bg-slate-900/90 transition-colors"
                      >
                        <span className="block font-bold text-emerald-400">{msg.replyTo.sender}</span>
                        {msg.replyTo.imageUrl && (
                          <span className="block text-[11px] text-slate-400 italic">📷 Photo</span>
                        )}
                        {msg.replyTo.text && (
                          <p className="truncate text-slate-300 text-[11px]">{msg.replyTo.text}</p>
                        )}
                      </div>
                    )}

                    {/* IMAGE CONTENT */}
                    {msg.imageUrl && (
                      <div className="my-1 overflow-hidden rounded-xl bg-slate-900 border border-slate-700/50">
                        <img
                          src={msg.imageUrl}
                          alt="Attachment"
                          onClick={() => setExpandedImageUrl(msg.imageUrl || null)}
                          className="max-h-72 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        />
                      </div>
                    )}

                    {/* TEXT CONTENT */}
                    {msg.text && (
                      <p className="leading-relaxed whitespace-pre-wrap text-sm">{msg.text}</p>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span
                        className={`text-[10px] ${
                          isSelf ? 'text-emerald-200/70' : 'text-slate-400'
                        }`}
                      >
                        {msg.time}
                      </span>
                      {isSelf && (
                        <CheckCheck className={`h-3.5 w-3.5 ${isRead ? 'text-sky-400' : 'text-slate-400'}`} />
                      )}
                    </div>
                  </div>

                  {/* Single "Seen" display on the last seen message only */}
                  {isSelf && msg.id === lastSeenMsgId && (
                    <div className="text-[10px] text-slate-400/80 mt-0.5 px-1 font-medium">
                      Seen by {msg.receiver === 'general' ? readUsers.join(', ') : msg.receiver}
                    </div>
                  )}
                </div>
                </React.Fragment>
              );
            })
          )}

          {typingUserNames.length > 0 && (
            <div className="flex items-center gap-2 text-slate-400 text-xs italic px-2 py-1">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse delay-100" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse delay-200" />
              </span>
              <span>
                {typingUserNames.join(', ')} {typingUserNames.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT & ATTACHMENT PREVIEW PANEL */}
        <div className="bg-[#1f2c34] p-3 border-t border-slate-800 space-y-2">
          {/* REPLY PREVIEW BAR */}
          {replyingTo && (
            <div className="flex items-center justify-between rounded-xl bg-[#2a3942] px-3 py-2 border-l-4 border-emerald-400 text-xs text-slate-200 max-w-5xl mx-auto">
              <div className="overflow-hidden">
                <span className="block font-bold text-emerald-400">Replying to @{replyingTo.sender}</span>
                <p className="truncate text-slate-300 text-[11px]">{replyingTo.text}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* IMAGE SELECTION PREVIEW BAR */}
          {imagePreview && (
            <div className="relative inline-block max-w-5xl mx-auto">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                <img src={imagePreview} alt="Upload preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={cancelImageSelection}
                  className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-white hover:bg-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-5xl mx-auto">
            {/* HIDDEN FILE INPUT */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Image"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2a3942] text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition-colors shrink-0"
            >
              <ImageIcon className="h-5 w-5" />
            </button>

            {/* MULTI-LINE TEXTAREA INPUT */}
            <textarea
              rows={1}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePasteImage}
              placeholder={
                activeChannel === 'general'
                  ? 'Type a message (Shift+Enter for new line)'
                  : `Message @${activeChannel} (Shift+Enter for new line)`
              }
              className="flex-1 max-h-32 min-h-[44px] resize-none rounded-xl bg-[#2a3942] px-4 py-3 text-sm text-[#d1d7db] placeholder-[#8696a0] outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <button
              type="submit"
              disabled={(!inputMessage.trim() && !selectedImage) || isUploadingImage}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00a884] text-white hover:bg-[#008f70] disabled:opacity-50 transition-colors shrink-0"
            >
              {isUploadingImage ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </main>

      {/* PARTICIPANTS SIDEBAR */}
      {showParticipants && (
        <aside className="w-64 shrink-0 flex flex-col border-l border-slate-800 bg-[#111b21]">
          <div className="flex items-center justify-between border-b border-slate-800 bg-[#202c33] px-4 py-3.5">
            <div>
              <h4 className="text-xs font-bold text-slate-100">Participants</h4>
              <p className="text-[10px] text-slate-400">{allUsers.length} members</p>
            </div>
            <button
              onClick={() => setShowParticipants(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* ONLINE MEMBERS */}
            <div>
              <span className="block px-1 text-[10px] font-extrabold tracking-wider text-emerald-400 uppercase mb-1.5">
                Online — {onlineParticipants.length}
              </span>
              {onlineParticipants.length === 0 ? (
                <p className="px-1 text-[11px] text-slate-500 italic">No one online.</p>
              ) : (
                <div className="space-y-0.5">
                  {onlineParticipants.map((u) => (
                    <button
                      key={u}
                      onClick={() => setInspectingUser(u)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#202c33] transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(u, 'h-8 w-8')}
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#111b21]" />
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-100 truncate">
                            {u}
                            {u === currentUser && (
                              <span className="text-slate-500 font-normal"> (you)</span>
                            )}
                          </span>
                        </div>
                        {renderDiscordBadge(u) && <div className="mt-1">{renderDiscordBadge(u)}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* OFFLINE MEMBERS */}
            <div>
              <span className="block px-1 text-[10px] font-extrabold tracking-wider text-slate-500 uppercase mb-1.5">
                Offline — {offlineParticipants.length}
              </span>
              {offlineParticipants.length === 0 ? (
                <p className="px-1 text-[11px] text-slate-500 italic">Everyone is online.</p>
              ) : (
                <div className="space-y-0.5">
                  {offlineParticipants.map((u) => (
                    <button
                      key={u}
                      onClick={() => setInspectingUser(u)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#202c33] transition-colors text-left opacity-50 hover:opacity-80"
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(u, 'h-8 w-8')}
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-slate-600 ring-2 ring-[#111b21]" />
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-400 truncate block">{u}</span>
                        {renderDiscordBadge(u) && <div className="mt-1">{renderDiscordBadge(u)}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* FULL IMAGE EXPAND LIGHTBOX MODAL */}
      {expandedImageUrl && (
        <div
          onClick={() => setExpandedImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm cursor-pointer"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              onClick={() => setExpandedImageUrl(null)}
              className="absolute -top-10 right-0 rounded-full bg-slate-800 p-2 text-white hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={expandedImageUrl}
              alt="Expanded Attachment"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <Settings className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Settings</h3>
            </div>

            {/* UNHIDE GC SECTION */}
            <div className="mb-6">
              <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Hidden Group Chats / DMs
              </span>
              {hiddenChannels.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-[#111b21] p-3 rounded-xl border border-slate-800">
                  No hidden chats.
                </p>
              ) : (
                <div className="space-y-2">
                  {hiddenChannels.map((ch) => (
                    <div
                      key={ch}
                      className="flex items-center justify-between rounded-xl bg-[#111b21] px-3 py-2 border border-slate-800 text-xs"
                    >
                      <span>{ch === 'general' ? '#general-chat' : `@${ch}`}</span>
                      <button
                        onClick={() => handleUnhideChannel(ch)}
                        className="rounded-lg bg-emerald-600/20 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-600 hover:text-white"
                      >
                        Unhide GC
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FOUNDER PANEL OPTION */}
            {isCurrentFounder && (
              <div className="border-t border-slate-800 pt-5">
                <button
                  onClick={() => {
                    fetchUsersAndProfiles();
                    setShowGrantBadgeModal(true);
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-amber-600/10 border border-amber-500/30 px-4 py-3 text-xs font-bold text-amber-400 hover:bg-amber-600 hover:text-white transition-all shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>Grant user badges</span>
                  </div>
                  <Crown className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GRANT BADGE MODAL FOR FOUNDER */}
      {showGrantBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setShowGrantBadgeModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <Crown className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Grant User Badges</h3>
            </div>

            <form onSubmit={handleGrantBadgeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select User
                </label>
                <select
                  value={grantTargetUser}
                  onChange={(e) => setGrantTargetUser(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#2a3942] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select User --</option>
                  {availableUsersToMessage.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Badge Code (400 = Noob, 600 = Tuff)
                </label>
                <input
                  type="text"
                  placeholder="Enter code (400 or 600)"
                  value={badgeCodeInput}
                  onChange={(e) => setBadgeCodeInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#2a3942] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantBadgeModal(false)}
                  className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!grantTargetUser || !badgeCodeInput.trim()}
                  className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors shadow-lg"
                >
                  Grant Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT USER MODAL */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl text-center relative">
            <div className="flex justify-center mb-3">
              {renderAvatar(inspectingUser, 'h-16 w-16')}
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h3 className="text-base font-bold text-white">{inspectingUser}</h3>
              {renderDiscordBadge(inspectingUser)}
            </div>
            <p className="text-xs text-emerald-400 mb-3">
              {onlineUsers[inspectingUser] ? 'Online' : 'Offline'}
            </p>
            <p className="text-xs text-slate-300 italic mb-4 bg-[#111b21] p-3 rounded-xl border border-slate-800">
              "{userProfiles[inspectingUser]?.bio || 'No bio provided'}"
            </p>

            <button
              onClick={() => setInspectingUser(null)}
              className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editingProfile && currentUser && (
        <UserProfileModal
          username={currentUser}
          currentProfile={userProfiles[currentUser] || {}}
          onClose={() => setEditingProfile(false)}
          onProfileUpdated={fetchUsersAndProfiles}
        />
      )}

      {/* NEW DM MODAL */}
      {showNewDMModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Start New Chat</h3>
              </div>
              <button onClick={() => setShowNewDMModal(false)} className="text-xs text-slate-400 hover:text-white">
                Cancel
              </button>
            </div>

            <select
              value={selectedDMUser}
              onChange={(e) => setSelectedDMUser(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#2a3942] px-3 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none mb-6"
            >
              <option value="">-- Choose User --</option>
              {availableUsersToMessage.map((user) => (
                <option key={user} value={user}>
                  {user} {onlineUsers[user] ? '(Online)' : '(Offline)'}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewDMModal(false)}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedDMUser) {
                    if (!conversations.includes(selectedDMUser)) {
                      setConversations((prev) => [...prev, selectedDMUser]);
                    }
                    setActiveChannel(selectedDMUser);
                    setShowNewDMModal(false);
                    setSelectedDMUser('');
                  }
                }}
                disabled={!selectedDMUser}
                className="flex-1 rounded-xl bg-[#00a884] py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                Open DM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}