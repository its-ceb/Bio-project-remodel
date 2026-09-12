import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Send, Hash, Lock, LogOut, Power, Plus, UserPlus, LogIn,
  ShieldAlert, Users, MessageSquare, CheckCheck, Trash2,
  MoreVertical, Pin, Settings, Eye, Crown, X, Award,
  Image as ImageIcon, Reply, Loader2, ArrowLeft, Pencil, Check,
  ChevronDown, ChevronRight, Info, UserMinus, Search, Smile, Copy,
  SmilePlus, ArrowDown, History
} from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, push, onValue, get, set, onDisconnect, update, remove, query, limitToLast } from 'firebase/database';
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
  edited?: boolean;
  editedAt?: number;
  // emoji -> { username: true }
  reactions?: Record<string, Record<string, boolean>>;
}

interface GroupChat {
  id: string;
  name: string;
  emoji: string;
  createdBy: string;
  createdAt: number;
  members: Record<string, boolean>;
}

const IMGBB_API_KEY = '9e341096967527234e9d141032f6a8c5';

/* Group chats are stored in the DB at `groups/{id}`.
   Messages that belong to a group use the channel key `gc_{groupId}`
   inside the message's `receiver` field, so DMs / general / groups all
   travel through the same message pipeline. */
const GROUP_PREFIX = 'gc_';
const EDIT_WINDOW_MS = 15 * 60 * 1000; // messages can only be edited for 15 minutes

/* Unread indicator shown on the right of every sidebar row (WhatsApp style).
   true  -> green pill with the unread count  (e.g. 3)
   false -> plain green dot, no number */
const SHOW_UNREAD_COUNT = true;
const UNREAD_GREEN = '#25d366';

/* ------------------------------------------------------------------ */
/* Reactions (Instagram style)                                        */
/* ------------------------------------------------------------------ */
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];
const DOUBLE_TAP_REACTION = '❤️';

/* ------------------------------------------------------------------ */
/* Message windowing / pagination                                     */
/* Only a slice of the history is ever downloaded or rendered.        */
/* ------------------------------------------------------------------ */
const MESSAGE_WINDOW_START = 200; // messages pulled from the DB on open
const LOAD_MORE_BATCH = 200;      // extra messages pulled per "load older"
const VISIBLE_STEP = 40;          // messages rendered per "load older"
const SCROLL_LOAD_TRIGGER = 60;   // px from the top that triggers loading

/* ------------------------------------------------------------------ */
/* Swipe-right-to-reply gesture (mobile)                              */
/* ------------------------------------------------------------------ */
const SWIPE_THRESHOLD = 60; // px of travel needed to arm the reply
const SWIPE_MAX = 88;       // px the bubble can travel
const SWIPE_LOCK_PX = 8;    // movement before the gesture axis is decided
const SWIPE_SLOP = 0.6;     // rubber-band factor
const DOUBLE_TAP_MS = 300;  // window for the double-tap heart
const GROUP_EMOJIS = ['👥', '🔥', '🎮', '📚', '🧠', '🎵', '⚽', '🍕', '💀', '🌈', '🧪', '🐧'];

const isGroupKey = (channelKey: string) => channelKey.startsWith(GROUP_PREFIX);
const groupChannelKey = (groupId: string) => `${GROUP_PREFIX}${groupId}`;
const groupIdFromChannel = (channelKey: string) => channelKey.slice(GROUP_PREFIX.length);

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
  const [messagePartners, setMessagePartners] = useState<string[]>([]);
  const [manualConversations, setManualConversations] = useState<string[]>([]);
  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Group chats
  const [groups, setGroups] = useState<Record<string, GroupChat>>({});
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('👥');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupEmojiDraft, setGroupEmojiDraft] = useState('👥');
  const [memberToAdd, setMemberToAdd] = useState('');

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reply State
  const [replyingTo, setReplyingTo] = useState<ReplyContext | null>(null);

  // Edit State (own messages, 15 minute window)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Swipe Gesture Ref/State. The drag visuals are written straight onto the
  // DOM nodes so a 60fps swipe never triggers a React re-render.
  const swipeRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    rawDx: number;
    dx: number;
    horizontal: boolean;
    locked: boolean;
    armed: boolean;
    content: HTMLElement | null;
    icon: HTMLElement | null;
  } | null>(null);
  const lastTapRef = useRef<{ id: string; at: number }>({ id: '', at: 0 });

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

  // Mobile single-pane navigation: which panel is shown on small screens.
  // Desktop (md+) ignores this and shows the relevant panels side by side.
  const [mobilePanel, setMobilePanel] = useState<'list' | 'chat' | 'participants'>('list');

  // Sidebar collapsible sections (Discord style)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Message Options dropdown state
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  // Emoji reaction picker state
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);

  // Pagination state
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [loadedLimit, setLoadedLimit] = useState<number>(MESSAGE_WINDOW_START);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Popover refs so "click anywhere" can dismiss them
  const messageMenuRef = useRef<HTMLDivElement | null>(null);
  const channelMenuRef = useRef<HTMLDivElement | null>(null);

  // Typing indicators state
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Grant Badge Form state
  const [grantTargetUser, setGrantTargetUser] = useState('');
  const [badgeCodeInput, setBadgeCodeInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const pendingChannelJumpRef = useRef(true);
  const pendingScrollRestoreRef = useRef<{ prevHeight: number; prevTop: number } | null>(null);
  const loadingOlderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keeps the latest active channel available inside firebase listeners
  const activeChannelRef = useRef<string>(activeChannel);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  /* The auto-scroll and scroll-anchoring effects live further down, right
     after `displayedMessages` is computed (they depend on it). */

  /* ------------------------------------------------------------------ */
  /* Ticking clock: lets the "Edit" option vanish the moment the        */
  /* 15 minute window closes, without needing any user interaction.     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

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

  /* ------------------------------------------------------------------ */
  /* GROUP CHAT LISTENER (only groups the current user is a member of)  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!currentUser) return;

    const groupsRef = ref(database, 'groups');
    const unsubscribeGroups = onValue(groupsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const mine: Record<string, GroupChat> = {};

      Object.entries(data).forEach(([id, val]: [string, any]) => {
        if (val && val.members && val.members[currentUser]) {
          mine[id] = {
            id,
            name: val.name || 'Group Chat',
            emoji: val.emoji || '👥',
            createdBy: val.createdBy || '',
            createdAt: val.createdAt || 0,
            members: val.members || {},
          };
        }
      });

      setGroups(mine);

      // If the group that is currently open got deleted, or we were removed
      // from it, fall back to the general channel.
      const openChannel = activeChannelRef.current;
      if (isGroupKey(openChannel) && !mine[groupIdFromChannel(openChannel)]) {
        setActiveChannel('general');
        setShowGroupInfo(false);
      }
    });

    return () => unsubscribeGroups();
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

  /* ------------------------------------------------------------------ */
  /* CLICK ANYWHERE -> DISMISS OPEN POPUPS (dropdowns)                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!activeMessageMenuId && !activeReactionPickerId) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (messageMenuRef.current && target && messageMenuRef.current.contains(target)) return;
      setActiveMessageMenuId(null);
      setActiveReactionPickerId(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [activeMessageMenuId, activeReactionPickerId]);

  useEffect(() => {
    if (!showChannelMenu) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (channelMenuRef.current && target && channelMenuRef.current.contains(target)) return;
      setShowChannelMenu(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showChannelMenu]);

  // ESC also closes whatever popup is open
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (activeMessageMenuId) {
        setActiveMessageMenuId(null);
      } else if (activeReactionPickerId) {
        setActiveReactionPickerId(null);
      } else if (showChannelMenu) {
        setShowChannelMenu(false);
      } else if (editingMessage) {
        cancelEditing();
      } else if (replyingTo) {
        setReplyingTo(null);
      } else if (expandedImageUrl) {
        setExpandedImageUrl(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMessageMenuId, activeReactionPickerId, showChannelMenu, editingMessage, replyingTo, expandedImageUrl]);

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
    if (editingMessage) return;

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
    setActiveChannel('general');
    setManualConversations([]);
  };

  useEffect(() => {
    if (!currentUser) return;

    fetchUsersAndProfiles();

    // Only the newest slice of the database is downloaded. Growing
    // `loadedLimit` (the "load older messages" action) re-subscribes with a
    // wider window instead of ever holding the whole history in memory.
    const messagesRef = query(ref(database, 'messages'), limitToLast(loadedLimit));
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
          edited: value.edited || false,
          editedAt: value.editedAt || 0,
          reactions: value.reactions || {},
        }));

        setRawMessages(loaded);
        setIsLoadingOlder(false);

        const dmUsers = new Set<string>();
        loaded.forEach((msg) => {
          if (msg.receiver === 'general' || isGroupKey(msg.receiver)) return;
          if (msg.sender === currentUser) dmUsers.add(msg.receiver);
          if (msg.receiver === currentUser) dmUsers.add(msg.sender);
        });
        setMessagePartners(Array.from(dmUsers));

        loaded.forEach((msg) => {
          const isRelevantChannel =
            (msg.receiver === 'general' && activeChannel === 'general') ||
            (isGroupKey(activeChannel) && msg.receiver === activeChannel) ||
            (!isGroupKey(activeChannel) &&
              activeChannel !== 'general' &&
              msg.receiver === currentUser &&
              msg.sender === activeChannel);

          if (isRelevantChannel && msg.sender !== currentUser && !msg.readBy?.[currentUser]) {
            update(ref(database, `messages/${msg.id}/readBy`), {
              [currentUser]: true,
            });
          }
        });
      } else {
        setRawMessages([]);
        setMessagePartners([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser, activeChannel, loadedLimit]);

  /* ------------------------------------------------------------------ */
  /* SEND / EDIT MESSAGES                                               */
  /* ------------------------------------------------------------------ */
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    const userTypingRef = ref(database, `typing/${activeChannel}/${currentUser}`);
    set(userTypingRef, false);

    /* ---------- EDITING AN EXISTING MESSAGE ---------- */
    if (editingMessage) {
      const trimmed = inputMessage.trim();
      if (!trimmed) return;

      const withinWindow = Date.now() - editingMessage.timestamp < EDIT_WINDOW_MS;
      if (editingMessage.sender !== currentUser || !withinWindow) {
        alert('This message can no longer be edited (15 minute limit).');
        cancelEditing();
        return;
      }

      try {
        await update(ref(database, `messages/${editingMessage.id}`), {
          text: trimmed,
          edited: true,
          editedAt: Date.now(),
        });
        setNowTick(Date.now());
      } catch (err) {
        console.error('Error editing message:', err);
        alert('Could not edit the message. Please try again.');
        return;
      }

      cancelEditing();
      return;
    }

    /* ---------- SENDING A NEW MESSAGE ---------- */
    if (!inputMessage.trim() && !selectedImage) return;

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

  const startEditing = (msg: ChatMessage) => {
    setEditingMessage(msg);
    setInputMessage(msg.text || '');
    setReplyingTo(null);
    cancelImageSelection();
    setActiveMessageMenuId(null);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setInputMessage('');
  };

  const canEditMessage = (msg: ChatMessage) =>
    msg.sender === currentUser && nowTick - msg.timestamp < EDIT_WINDOW_MS;

  const editMinutesLeft = (msg: ChatMessage) =>
    Math.max(0, Math.ceil((EDIT_WINDOW_MS - (nowTick - msg.timestamp)) / 60000));

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await remove(ref(database, `messages/${msgId}`));
      if (pinnedMessageId === msgId) setPinnedMessageId(null);
      if (editingMessage?.id === msgId) cancelEditing();
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

  /* ------------------------------------------------------------------ */
  /* REACTIONS                                                          */
  /* ------------------------------------------------------------------ */
  const toggleReaction = async (msg: ChatMessage, emoji: string) => {
    if (!currentUser) return;

    const usersForEmoji = msg.reactions?.[emoji] || {};
    const iReacted = !!usersForEmoji[currentUser];
    const others = Object.keys(usersForEmoji).filter((u) => u !== currentUser);

    try {
      if (iReacted) {
        if (others.length > 0) {
          await remove(ref(database, `messages/${msg.id}/reactions/${emoji}/${currentUser}`));
        } else {
          // last one out — drop the emoji node so the pill disappears cleanly
          await remove(ref(database, `messages/${msg.id}/reactions/${emoji}`));
        }
      } else {
        await update(ref(database, `messages/${msg.id}/reactions/${emoji}`), {
          [currentUser]: true,
        });
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }

    setActiveReactionPickerId(null);
  };

  const buzz = (ms: number) => {
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (nav && typeof nav.vibrate === 'function') nav.vibrate(ms);
  };

  /* ------------------------------------------------------------------ */
  /* SWIPE RIGHT TO REPLY (mobile)                                      */
  /* The translate + the revealed reply icon are written directly onto  */
  /* the DOM while dragging, so the gesture stays smooth and the message */
  /* list never re-renders mid-swipe.                                   */
  /* ------------------------------------------------------------------ */
  const paintSwipeRest = (content: HTMLElement, icon: HTMLElement, animate: boolean) => {
    content.style.transition = animate ? 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    content.style.transform = 'translateX(0px)';
    icon.style.transition = animate
      ? 'opacity 200ms ease-out, transform 200ms ease-out, background-color 200ms ease-out'
      : 'none';
    icon.style.opacity = '0';
    icon.style.transform = 'translateY(-50%) scale(0.6)';
    icon.style.backgroundColor = 'transparent';
    icon.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    icon.style.color = '#34d399';
  };

  const handleTouchStart = (e: React.TouchEvent, msg: ChatMessage) => {
    const row = e.currentTarget as HTMLElement;
    const touch = e.touches[0];
    if (!touch) return;

    swipeRef.current = {
      id: msg.id,
      startX: touch.clientX,
      startY: touch.clientY,
      rawDx: 0,
      dx: 0,
      horizontal: false,
      locked: false,
      armed: false,
      content: row.querySelector<HTMLElement>('[data-swipe-content]'),
      icon: row.querySelector<HTMLElement>('[data-swipe-icon]'),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s || !s.content || !s.icon) return;
    const touch = e.touches[0];
    if (!touch) return;

    s.rawDx = touch.clientX - s.startX;
    const dy = touch.clientY - s.startY;

    if (!s.locked) {
      if (Math.abs(s.rawDx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
      s.locked = true;
      // Left drags and mostly-vertical gestures are handed back to the
      // browser so scrolling still feels native.
      s.horizontal = s.rawDx > 0 && Math.abs(s.rawDx) > Math.abs(dy);
      if (!s.horizontal) return;
    }
    if (!s.horizontal) return;

    // rubber-band: the further you drag, the heavier it gets
    const offset = Math.min(s.rawDx * SWIPE_SLOP, SWIPE_MAX);
    s.dx = offset;
    const progress = Math.min(offset / SWIPE_THRESHOLD, 1);
    const armed = progress >= 1;

    s.content.style.transition = 'none';
    s.content.style.transform = `translateX(${offset}px)`;

    s.icon.style.transition = 'none';
    s.icon.style.opacity = String(progress);
    s.icon.style.transform = `translateY(-50%) scale(${0.6 + progress * 0.45})`;

    if (armed !== s.armed) {
      s.armed = armed;
      if (armed) {
        // locked on: fill the icon and give a short haptic tick
        s.icon.style.backgroundColor = 'rgba(16, 185, 129, 0.25)';
        s.icon.style.borderColor = '#34d399';
        s.icon.style.color = '#ffffff';
        buzz(12);
      } else {
        s.icon.style.backgroundColor = 'transparent';
        s.icon.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        s.icon.style.color = '#34d399';
      }
    }
  };

  const finishSwipe = (msg: ChatMessage) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s) return;

    if (s.content && s.icon) paintSwipeRest(s.content, s.icon, true);

    const armed = s.horizontal && s.dx >= SWIPE_THRESHOLD;

    if (armed) {
      // snap the icon back with a little pulse as the reply bar appears
      if (s.icon) {
        s.icon.style.transition = 'transform 220ms ease-out, opacity 220ms ease-out';
        s.icon.style.opacity = '1';
        s.icon.style.transform = 'translateY(-50%) scale(1.15)';
        setTimeout(() => {
          if (s.icon) {
            s.icon.style.opacity = '0';
            s.icon.style.transform = 'translateY(-50%) scale(0.6)';
          }
        }, 150);
      }

      setReplyingTo({
        id: msg.id,
        sender: msg.sender,
        text: msg.text || (msg.imageUrl ? '📷 Photo' : ''),
        imageUrl: msg.imageUrl,
      });
      return;
    }

    // a tap (no meaningful drag) — two of them quickly = quick ❤️ reaction
    if (!s.horizontal || Math.abs(s.rawDx) < SWIPE_LOCK_PX) {
      const now = Date.now();
      if (lastTapRef.current.id === msg.id && now - lastTapRef.current.at < DOUBLE_TAP_MS) {
        lastTapRef.current = { id: '', at: 0 };
        toggleReaction(msg, DOUBLE_TAP_REACTION);
      } else {
        lastTapRef.current = { id: msg.id, at: now };
      }
    }
  };

  const handleTouchEnd = (_e: React.TouchEvent, msg: ChatMessage) => {
    finishSwipe(msg);
  };

  const handleTouchCancel = () => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (s && s.content && s.icon) paintSwipeRest(s.content, s.icon, true);
  };

  /* ------------------------------------------------------------------ */
  /* GROUP CHAT ACTIONS                                                 */
  /* ------------------------------------------------------------------ */
  const resetGroupDraft = () => {
    setNewGroupName('');
    setNewGroupEmoji('👥');
    setNewGroupMembers([]);
    setGroupMemberSearch('');
  };

  const toggleNewGroupMember = (user: string) => {
    setNewGroupMembers((prev) =>
      prev.includes(user) ? prev.filter((u) => u !== user) : [...prev, user]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const name = newGroupName.trim();
    if (!name) {
      alert('Give your group a name first.');
      return;
    }

    const members: Record<string, boolean> = { [currentUser]: true };
    newGroupMembers.forEach((u) => {
      members[u] = true;
    });

    if (Object.keys(members).length < 2) {
      alert('Pick at least one other member to create a group.');
      return;
    }

    try {
      const groupsRef = ref(database, 'groups');
      const newGroupRef = push(groupsRef);
      const groupId = newGroupRef.key as string;

      await set(newGroupRef, {
        name,
        emoji: newGroupEmoji,
        createdBy: currentUser,
        createdAt: Date.now(),
        members,
      });

      resetGroupDraft();
      setShowCreateGroupModal(false);
      setActiveChannel(groupChannelKey(groupId));
      setMobilePanel('chat');
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Could not create the group. Check your connection and try again.');
    }
  };

  const handleStartDMWith = (username: string) => {
    if (!currentUser || username === currentUser) return;
    setManualConversations((prev) => (prev.includes(username) ? prev : [...prev, username]));
    setActiveChannel(username);
    setReplyingTo(null);
    setEditingMessage(null);
    setMobilePanel('chat');
  };

  const handleRenameGroup = async () => {
    if (!activeGroup) return;
    const name = groupNameDraft.trim();
    if (!name) {
      alert('Group name cannot be empty.');
      return;
    }
    try {
      await update(ref(database, `groups/${activeGroup.id}`), {
        name,
        emoji: groupEmojiDraft || activeGroup.emoji,
      });
    } catch (err) {
      console.error('Error renaming group:', err);
    }
  };

  const handleAddGroupMember = async () => {
    if (!activeGroup || !memberToAdd) return;
    try {
      await update(ref(database, `groups/${activeGroup.id}/members`), { [memberToAdd]: true });
      setMemberToAdd('');
    } catch (err) {
      console.error('Error adding member:', err);
    }
  };

  const handleRemoveGroupMember = async (username: string) => {
    if (!activeGroup) return;
    if (!confirm(`Remove @${username} from ${activeGroup.name}?`)) return;
    try {
      await remove(ref(database, `groups/${activeGroup.id}/members/${username}`));
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup || !currentUser) return;
    if (!confirm(`Leave ${activeGroup.name}?`)) return;

    const groupId = activeGroup.id;
    const remaining = Object.keys(activeGroup.members).filter((u) => u !== currentUser);

    try {
      if (remaining.length === 0) {
        await remove(ref(database, `groups/${groupId}`));
      } else {
        await remove(ref(database, `groups/${groupId}/members/${currentUser}`));
      }
    } catch (err) {
      console.error('Error leaving group:', err);
    }

    setShowGroupInfo(false);
    setActiveChannel('general');
    setMobilePanel('list');
  };

  /* ------------------------------------------------------------------ */
  /* DERIVED DATA                                                       */
  /* ------------------------------------------------------------------ */
  const conversations = Array.from(new Set([...messagePartners, ...manualConversations])).sort(
    (a, b) => a.localeCompare(b)
  );

  const activeGroup: GroupChat | null = isGroupKey(activeChannel)
    ? groups[groupIdFromChannel(activeChannel)] || null
    : null;

  /* Every downloaded message that belongs to the open chat */
  const channelMessages = rawMessages.filter((msg) => {
    if (activeChannel === 'general') {
      return msg.receiver === 'general';
    }
    if (isGroupKey(activeChannel)) {
      return msg.receiver === activeChannel;
    }
    return (
      (msg.sender === currentUser && msg.receiver === activeChannel) ||
      (msg.sender === activeChannel && msg.receiver === currentUser)
    );
  });

  /* ...but only the newest slice of them is actually rendered */
  const visibleMessageCount = visibleCounts[activeChannel] ?? VISIBLE_STEP;
  const displayedMessages = channelMessages.slice(
    Math.max(0, channelMessages.length - visibleMessageCount)
  );

  const olderInMemory = channelMessages.length - displayedMessages.length;
  const hasOlderInMemory = olderInMemory > 0;
  const windowIsFull = rawMessages.length >= loadedLimit;
  const canLoadOlder = hasOlderInMemory || windowIsFull;

  /* Load older: first reveal what is already downloaded (instant), and only
     then widen the DB window. Growing the window re-subscribes with a bigger
     limitToLast() and the same limitToLast() path is what keeps the initial
     download small. */
  const loadOlderMessages = () => {
    const el = scrollContainerRef.current;
    if (el) {
      pendingScrollRestoreRef.current = { prevHeight: el.scrollHeight, prevTop: el.scrollTop };
    }

    setVisibleCounts((prev) => ({
      ...prev,
      [activeChannel]: (prev[activeChannel] ?? VISIBLE_STEP) + VISIBLE_STEP,
    }));

    if (!hasOlderInMemory && windowIsFull && !isLoadingOlder) {
      setIsLoadingOlder(true);
      setLoadedLimit((limit) => limit + LOAD_MORE_BATCH);
      if (loadingOlderTimeoutRef.current) clearTimeout(loadingOlderTimeoutRef.current);
      loadingOlderTimeoutRef.current = setTimeout(() => setIsLoadingOlder(false), 4000);
    }
  };

  const handleMessagesScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
    setShowJumpToLatest(distanceFromBottom > 400);

    if (el.scrollTop < SCROLL_LOAD_TRIGGER && canLoadOlder) {
      loadOlderMessages();
    }
  };

  /* Auto-scroll on new messages — but only while the user is already at the
     bottom, so loading older ones never yanks them away from where they
     were reading. */
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const instant = pendingChannelJumpRef.current;
    scrollToBottom(instant ? 'auto' : 'smooth');
    if (displayedMessages.length > 0) pendingChannelJumpRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawMessages, typingUsers, activeChannel]);

  /* Opening a chat jumps straight to the newest message */
  useEffect(() => {
    stickToBottomRef.current = true;
    setShowJumpToLatest(false);
    pendingChannelJumpRef.current = true;
  }, [activeChannel]);

  /* Keep the viewport anchored when older messages are prepended */
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    const pending = pendingScrollRestoreRef.current;
    if (!el || !pending) return;
    el.scrollTop = el.scrollHeight - pending.prevHeight + pending.prevTop;
    pendingScrollRestoreRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedMessages.length, rawMessages.length]);

  // Calculate the single last seen message ID for current user
  const selfReadMessages = displayedMessages.filter((msg) => {
    if (msg.sender !== currentUser) return false;
    const readUsers = Object.keys(msg.readBy || {}).filter((u) => u !== msg.sender);
    return readUsers.length > 0;
  });
  const lastSeenMsgId = selfReadMessages.length > 0 ? selfReadMessages[selfReadMessages.length - 1].id : null;

  const pinnedMessage = displayedMessages.find((m) => m.id === pinnedMessageId);

  const getUnreadCount = (channelKey: string) => {
    const me = currentUser || '';
    return rawMessages.filter((msg) => {
      if (msg.sender === me) return false;
      if (msg.readBy?.[me]) return false;
      if (channelKey === 'general') return msg.receiver === 'general';
      if (isGroupKey(channelKey)) return msg.receiver === channelKey;
      return msg.sender === channelKey && msg.receiver === me;
    }).length;
  };

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

  const renderGroupAvatar = (group: GroupChat, size = 'h-9 w-9') => (
    <div
      className={`${size} flex items-center justify-center rounded-full bg-[#2a3942] border border-slate-600/60 text-base shrink-0`}
    >
      <span>{group.emoji || '👥'}</span>
    </div>
  );

  /* Unread indicator for sidebar rows — WhatsApp style green, bottom of the
     row's right side. Shows a count pill, or a bare dot when
     SHOW_UNREAD_COUNT is false. */
  const renderUnreadBadge = (count: number) => {
    if (count <= 0) return null;
    const label = count > 99 ? '99+' : String(count);

    if (!SHOW_UNREAD_COUNT) {
      return (
        <span
          title={`${count} unread message${count === 1 ? '' : 's'}`}
          className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
          style={{ backgroundColor: UNREAD_GREEN }}
        />
      );
    }

    return (
      <span
        title={`${count} unread message${count === 1 ? '' : 's'}`}
        className="ml-auto flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shadow-sm"
        style={{ backgroundColor: UNREAD_GREEN }}
      >
        {label}
      </span>
    );
  };

  const renderChannelAvatar = (channelKey: string, size = 'h-9 w-9') => {
    if (channelKey === 'general') {
      return (
        <div className={`${size} flex items-center justify-center rounded-full bg-slate-700 text-emerald-400 font-bold shrink-0`}>
          <Hash className="h-[55%] w-[55%]" />
        </div>
      );
    }
    if (isGroupKey(channelKey)) {
      const g = groups[groupIdFromChannel(channelKey)];
      return renderGroupAvatar(
        g || { id: '', name: 'Group', emoji: '👥', createdBy: '', createdAt: 0, members: {} },
        size
      );
    }
    return renderAvatar(channelKey, size);
  };

  const describeChannel = (channelKey: string) => {
    if (channelKey === 'general') return '#general-chat';
    if (isGroupKey(channelKey)) {
      const g = groups[groupIdFromChannel(channelKey)];
      return g ? g.name : 'Group Chat';
    }
    return `@${channelKey}`;
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

  const openChannel = (channelKey: string) => {
    setActiveChannel(channelKey);
    setReplyingTo(null);
    setEditingMessage(null);
    setActiveMessageMenuId(null);
    setMobilePanel('chat');
  };

  /* ------------------------------------------------------------------ */
  /* MESSAGE 3-DOT DROPDOWN                                             */
  /* ------------------------------------------------------------------ */
  const renderMessageControls = (msg: ChatMessage, isSelf: boolean) => {
    const editable = canEditMessage(msg);
    const minsLeft = editMinutesLeft(msg);
    const pickerOpen = activeReactionPickerId === msg.id;
    const me = currentUser || '';
    const myReactions = Object.keys(msg.reactions || {}).filter(
      (emoji) => msg.reactions?.[emoji]?.[me]
    );

    return (
      <div ref={messageMenuRef} className="relative flex items-center gap-0.5">
        {/* QUICK REACTION BUTTON */}
        <button
          onClick={() => {
            setActiveReactionPickerId(pickerOpen ? null : msg.id);
            setActiveMessageMenuId(null);
          }}
          title="React to this message"
          className={`p-1 rounded transition-colors hover:bg-slate-700 hover:text-white ${
            pickerOpen ? 'bg-slate-700 text-white' : 'text-slate-400'
          }`}
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>

        {/* REACTION PICKER */}
        {pickerOpen && (
          <div
            className={`absolute z-40 top-7 flex items-center gap-0.5 rounded-full border border-slate-700 bg-[#1f2c34] px-1.5 py-1 shadow-2xl ${
              isSelf ? 'right-0' : 'left-0'
            }`}
          >
            {QUICK_REACTIONS.map((emoji) => {
              const mine = myReactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(msg, emoji)}
                  title={mine ? `Remove ${emoji}` : `React ${emoji}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-base leading-none transition-transform hover:scale-125 active:scale-95 ${
                    mine ? 'bg-emerald-600/30 ring-1 ring-emerald-500/60' : 'hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}

        {/* 3-DOT MENU */}
        <button
          onClick={() => {
            setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id);
            setActiveReactionPickerId(null);
          }}
          className="p-1 rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>

        {activeMessageMenuId === msg.id && (
          <div
            className={`absolute z-30 w-44 rounded-xl border border-slate-800 bg-[#1f2c34] p-1 shadow-2xl top-7 ${
              isSelf ? 'right-0' : 'left-0'
            }`}
          >
            {/* QUICK REACTIONS INSIDE THE MENU */}
            <div className="mb-1 flex items-center justify-between gap-0.5 border-b border-slate-700/60 px-0.5 pb-1.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(msg, emoji)}
                  title={`React ${emoji}`}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm leading-none transition-transform hover:scale-125 active:scale-95 ${
                    myReactions.includes(emoji)
                      ? 'bg-emerald-600/30 ring-1 ring-emerald-500/60'
                      : 'hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setReplyingTo({
                  id: msg.id,
                  sender: msg.sender,
                  text: msg.text || (msg.imageUrl ? '📷 Photo' : ''),
                  imageUrl: msg.imageUrl,
                });
                setEditingMessage(null);
                setActiveMessageMenuId(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700/70"
            >
              <Reply className="h-3.5 w-3.5 text-emerald-400" /> Reply
            </button>

            {msg.text.trim().length > 0 && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(msg.text).catch(() => {});
                  setActiveMessageMenuId(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700/70"
              >
                <Copy className="h-3.5 w-3.5 text-emerald-400" /> Copy Text
              </button>
            )}

            {/* EDIT: only your own messages, only for 15 minutes */}
            {isSelf && editable && (
              <button
                onClick={() => startEditing(msg)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700/70"
              >
                <Pencil className="h-3.5 w-3.5 text-amber-400" /> Edit Message
                <span className="ml-auto text-[9px] font-semibold text-slate-500">{minsLeft}m</span>
              </button>
            )}

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
    );
  };

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
  const activeConversations = conversations.filter((ch) => !hiddenChannels.includes(ch));
  const isGeneralHidden = hiddenChannels.includes('general');

  const myGroups = Object.values(groups)
    .filter((g) => !hiddenChannels.includes(groupChannelKey(g.id)))
    .sort((a, b) => a.createdAt - b.createdAt);

  /* Participants sidebar is now context aware:
     - #general-chat -> every member of the server
     - a group chat  -> only that group's members
     - a DM          -> just you + the other person */
  const participantsBase: string[] = activeGroup
    ? Object.keys(activeGroup.members)
    : activeChannel === 'general'
    ? allUsers
    : Array.from(new Set([currentUser, activeChannel])).filter(Boolean);

  const sortedParticipants = Array.from(new Set(participantsBase)).sort((a, b) => {
    if (a === currentUser) return -1;
    if (b === currentUser) return 1;
    const aOnline = !!onlineUsers[a];
    const bOnline = !!onlineUsers[b];
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    return a.localeCompare(b);
  });

  const onlineParticipants = sortedParticipants.filter((u) => !!onlineUsers[u]);
  const offlineParticipants = sortedParticipants.filter((u) => !onlineUsers[u]);

  const groupOnlineCount = activeGroup
    ? Object.keys(activeGroup.members).filter((u) => !!onlineUsers[u]).length
    : 0;

  const participantsTitle =
    activeChannel === 'general' ? '#general-chat' : activeGroup ? activeGroup.name : `@${activeChannel}`;

  const participantsSubtitle = activeGroup
    ? `${Object.keys(activeGroup.members).length} members · ${groupOnlineCount} online`
    : activeChannel === 'general'
    ? `${allUsers.length} members`
    : onlineUsers[activeChannel]
    ? 'Online'
    : 'Offline';

  const toggleSection = (key: string) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const SectionHeader = ({
    label,
    count,
    sectionKey,
    action,
  }: {
    label: string;
    count?: number;
    sectionKey: string;
    action?: React.ReactNode;
  }) => (
    <div className="group/section flex items-center justify-between px-1 mb-1">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="flex items-center gap-0.5 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase hover:text-slate-200 transition-colors"
      >
        {collapsedSections[sectionKey] ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span>{label}</span>
        {typeof count === 'number' && <span className="text-slate-500">— {count}</span>}
      </button>
      {action}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0b141a] font-sans text-slate-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`${mobilePanel === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-64 lg:w-72 flex-col border-r border-slate-800 bg-[#111b21] shrink-0`}>
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

        {/* CHANNELS, GROUPS & DMS */}
        <div className="flex-1 overflow-y-auto p-2 space-y-5">
          {!isGeneralHidden && (
            <div>
              <SectionHeader label="Channels" sectionKey="channels" count={1} />
              {!collapsedSections['channels'] && (
                <button
                  onClick={() => openChannel('general')}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                    activeChannel === 'general'
                      ? 'bg-[#2a3942] text-white'
                      : 'text-slate-300 hover:bg-[#202c33]'
                  }`}
                >
                  <Hash
                    className={`h-4 w-4 shrink-0 ${
                      activeChannel === 'general' ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <span
                    className={`truncate text-[13px] ${
                      getUnreadCount('general') > 0 ? 'font-bold text-white' : 'font-semibold'
                    }`}
                  >
                    general-chat
                  </span>
                  {renderUnreadBadge(getUnreadCount('general'))}
                </button>
              )}
            </div>
          )}

          {/* GROUP CHATS */}
          <div>
            <SectionHeader
              label="Group Chats"
              sectionKey="groups"
              count={myGroups.length}
              action={
                <button
                  onClick={() => {
                    fetchUsersAndProfiles();
                    resetGroupDraft();
                    setShowCreateGroupModal(true);
                  }}
                  title="Create a group chat"
                  className="rounded-md p-0.5 text-slate-400 hover:text-emerald-400 hover:bg-[#202c33] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              }
            />

            {!collapsedSections['groups'] && (
              <>
                {myGroups.length === 0 ? (
                  <p className="px-2 py-1 text-[11px] text-slate-500 italic">
                    No groups yet. Hit + to make one.
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {myGroups.map((g) => {
                      const key = groupChannelKey(g.id);
                      const unread = getUnreadCount(key);
                      const memberCount = Object.keys(g.members).length;
                      return (
                        <button
                          key={g.id}
                          onClick={() => openChannel(key)}
                          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                            activeChannel === key
                              ? 'bg-[#2a3942] text-white'
                              : 'text-slate-300 hover:bg-[#202c33]'
                          }`}
                        >
                          {renderGroupAvatar(g, 'h-8 w-8')}
                          <div className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-[13px] ${
                                unread > 0 ? 'font-bold text-white' : 'font-semibold'
                              }`}
                            >
                              {g.name}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {memberCount} {memberCount === 1 ? 'member' : 'members'}
                            </span>
                          </div>
                          {renderUnreadBadge(unread)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* DIRECT MESSAGES */}
          <div>
            <SectionHeader
              label="Direct Messages"
              sectionKey="dms"
              count={activeConversations.length}
              action={
                <button
                  onClick={() => {
                    fetchUsersAndProfiles();
                    setShowNewDMModal(true);
                  }}
                  title="Start a new DM"
                  className="rounded-md p-0.5 text-slate-400 hover:text-emerald-400 hover:bg-[#202c33] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              }
            />

            {!collapsedSections['dms'] && (
              <>
                {activeConversations.length === 0 ? (
                  <p className="px-2 py-1 text-[11px] text-slate-500 italic">
                    No active conversations.
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {activeConversations.map((username) => {
                      const isOnline = !!onlineUsers[username];
                      const unread = getUnreadCount(username);
                      return (
                        <button
                          key={username}
                          onClick={() => openChannel(username)}
                          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                            activeChannel === username
                              ? 'bg-[#2a3942] text-white'
                              : 'text-slate-300 hover:bg-[#202c33]'
                          }`}
                        >
                          <div className="relative shrink-0">
                            {renderAvatar(username, 'h-8 w-8')}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-[3px] ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                              } ${activeChannel === username ? 'ring-[#2a3942]' : 'ring-[#111b21]'}`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`truncate text-[13px] ${
                                  unread > 0 ? 'font-bold text-white' : 'font-semibold'
                                }`}
                              >
                                {username}
                              </span>
                              {renderDiscordBadge(username)}
                            </div>
                            <span className="block text-[10px] text-slate-500">
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          {renderUnreadBadge(unread)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* SIDEBAR FOOTER: SETTINGS & NEW DM */}
        <div className="p-3 border-t border-slate-800 bg-[#111b21] flex items-center justify-between gap-2">
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
      <main className={`${mobilePanel === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-[#0b141a] relative w-full`}>
        <header className="flex items-center justify-between border-b border-slate-800 bg-[#1f2c34] px-4 py-3 relative">
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <button
              onClick={() => setMobilePanel('list')}
              className="md:hidden -ml-1 shrink-0 rounded-xl p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="relative shrink-0">{renderChannelAvatar(activeChannel, 'h-9 w-9')}</div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 truncate">
                  {activeChannel === 'general' ? '#general-chat' : activeGroup ? activeGroup.name : activeChannel}
                </h3>
                {activeChannel !== 'general' && !activeGroup && renderDiscordBadge(activeChannel)}
              </div>
              <p className="text-[11px] text-emerald-400">
                {activeChannel === 'general'
                  ? `${Object.keys(onlineUsers).length} online`
                  : activeGroup
                  ? `${Object.keys(activeGroup.members).length} members · ${groupOnlineCount} online`
                  : onlineUsers[activeChannel]
                  ? 'Online'
                  : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const opening = !showParticipants;
                if (opening) fetchUsersAndProfiles();
                setShowParticipants(opening);
                setMobilePanel(opening ? 'participants' : 'chat');
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

            <div ref={channelMenuRef} className="relative">
              <button
                onClick={() => setShowChannelMenu((prev) => !prev)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showChannelMenu && (
                <div className="absolute right-0 top-10 z-20 w-48 rounded-2xl border border-slate-800 bg-[#1f2c34] p-1.5 shadow-2xl">
                  {activeGroup && (
                    <button
                      onClick={() => {
                        setGroupNameDraft(activeGroup.name);
                        setGroupEmojiDraft(activeGroup.emoji);
                        setMemberToAdd('');
                        setShowGroupInfo(true);
                        setShowChannelMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700/60 transition-colors"
                    >
                      <Info className="h-4 w-4 text-emerald-400" /> Group Info
                    </button>
                  )}

                  <button
                    onClick={() => handleHideChannel(activeChannel)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700/60 transition-colors"
                  >
                    <Eye className="h-4 w-4 text-emerald-400" />
                    {activeGroup ? 'Hide Group' : activeChannel === 'general' ? 'Hide Channel' : 'Hide Chat'}
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
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            onScroll={handleMessagesScroll}
            className="h-full overflow-y-auto p-4 space-y-2 bg-[#0b141a]"
          >
          {/* LOAD OLDER — reveals already-downloaded messages instantly, and
              widens the DB window when there is nothing left in memory */}
          {canLoadOlder && (
            <div className="flex flex-col items-center justify-center gap-1 py-2">
              <button
                onClick={loadOlderMessages}
                disabled={isLoadingOlder}
                className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#202c33] px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-60 transition-colors"
              >
                {isLoadingOlder ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading older messages…
                  </>
                ) : (
                  <>
                    <History className="h-3 w-3" /> Load older messages
                  </>
                )}
              </button>
              <span className="text-[10px] text-slate-600">
                {hasOlderInMemory ? `${olderInMemory} older message${olderInMemory === 1 ? '' : 's'} ready` : 'scroll up to load more'}
              </span>
            </div>
          )}

          {displayedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
              <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-xs">No messages yet. Send a message to start chatting!</p>
            </div>
          ) : (
            displayedMessages.map((msg, idx) => {
              const isSelf = msg.sender === currentUser;
              const isBeingEdited = editingMessage?.id === msg.id;

              const readUsers = Object.keys(msg.readBy || {}).filter((u) => u !== msg.sender);
              const isRead = readUsers.length > 0;

              const reactionEntries = Object.entries(msg.reactions || {})
                .map(([emoji, users]) => ({ emoji, users: Object.keys(users || {}) }))
                .filter((entry) => entry.users.length > 0)
                .sort((a, b) => b.users.length - a.users.length);

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
                    onTouchStart={(e) => handleTouchStart(e, msg)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={(e) => handleTouchEnd(e, msg)}
                    onTouchCancel={handleTouchCancel}
                    style={{ touchAction: 'pan-y' }}
                    className={`relative group ${isSequence ? 'mt-1' : 'mt-3'}`}
                  >
                    {/* Reply affordance revealed while swiping right */}
                    <div
                      data-swipe-icon
                      className="pointer-events-none absolute left-1 top-1/2 z-0 flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-[#202c33] text-emerald-400 opacity-0"
                      style={{ transform: 'translateY(-50%) scale(0.6)' }}
                    >
                      <Reply className="h-4 w-4" />
                    </div>

                    <div
                      data-swipe-content
                      className={`relative z-10 flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                    >
                    <div
                      onDoubleClick={() => toggleReaction(msg, DOUBLE_TAP_REACTION)}
                      title="Double tap to react ❤️"
                      className={`max-w-[85%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm text-sm relative ${
                        isSelf
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                          : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                      } ${isBeingEdited ? 'ring-2 ring-amber-400/70' : ''}`}
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

                          {renderMessageControls(msg, isSelf)}
                        </div>
                      ) : (
                        /* Minimal dropdown for grouped messages */
                        <div
                          className={`absolute right-2 top-2 transition-opacity ${
                            activeMessageMenuId === msg.id
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                          }`}
                        >
                          {renderMessageControls(msg, isSelf)}
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
                        {msg.edited && (
                          <span className={`text-[10px] italic ${isSelf ? 'text-emerald-200/70' : 'text-slate-400'}`}>
                            edited
                          </span>
                        )}
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
                        Seen by{' '}
                        {msg.receiver === 'general'
                          ? readUsers.join(', ')
                          : isGroupKey(msg.receiver)
                          ? readUsers.filter((u) => u !== currentUser).join(', ') || '—'
                          : msg.receiver}
                      </div>
                    )}

                    {/* REACTION PILLS (Instagram style) */}
                    {reactionEntries.length > 0 && (
                      <div
                        className={`z-10 -mt-2 flex flex-wrap items-center gap-1 px-1 ${
                          isSelf ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {reactionEntries.map(({ emoji, users }) => {
                          const mine = users.includes(currentUser);
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg, emoji)}
                              title={`${emoji} ${users.join(', ')}`}
                              className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] shadow-sm transition-all active:scale-95 ${
                                mine
                                  ? 'border-emerald-500/70 bg-emerald-600/30 text-emerald-50'
                                  : 'border-slate-700 bg-[#202c33] text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              <span className="leading-none">{emoji}</span>
                              <span className="font-bold leading-none">{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    </div>
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

          {/* JUMP TO LATEST */}
          {showJumpToLatest && (
            <button
              onClick={() => {
                stickToBottomRef.current = true;
                setShowJumpToLatest(false);
                scrollToBottom('smooth');
              }}
              title="Jump to latest messages"
              className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-[#202c33] text-emerald-400 shadow-2xl hover:bg-slate-700 transition-colors"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* INPUT & ATTACHMENT PREVIEW PANEL */}
        <div className="bg-[#1f2c34] p-3 border-t border-slate-800 space-y-2">
          {/* EDIT MESSAGE BAR */}
          {editingMessage && (
            <div className="flex items-center justify-between rounded-xl bg-[#2a3942] px-3 py-2 border-l-4 border-amber-400 text-xs text-slate-200 max-w-5xl mx-auto">
              <div className="overflow-hidden">
                <span className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Pencil className="h-3 w-3" /> Editing message
                  <span className="text-[10px] font-medium text-slate-400">
                    ({editMinutesLeft(editingMessage)}m left)
                  </span>
                </span>
                <p className="truncate text-slate-300 text-[11px]">
                  {editingMessage.text || '📷 Photo'}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEditing}
                title="Cancel edit"
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* REPLY PREVIEW BAR */}
          {replyingTo && !editingMessage && (
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
          {imagePreview && !editingMessage && (
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
              disabled={!!editingMessage}
              title={editingMessage ? 'Finish editing first' : 'Attach Image'}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2a3942] text-slate-300 hover:text-emerald-400 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-[#2a3942] transition-colors shrink-0"
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
                editingMessage
                  ? `Editing your message (Shift+Enter for new line)`
                  : activeChannel === 'general'
                  ? 'Type a message (Shift+Enter for new line)'
                  : activeGroup
                  ? `Message ${activeGroup.name} (Shift+Enter for new line)`
                  : `Message @${activeChannel} (Shift+Enter for new line)`
              }
              className={`flex-1 max-h-32 min-h-[44px] resize-none rounded-xl bg-[#2a3942] px-4 py-3 text-sm text-[#d1d7db] placeholder-[#8696a0] outline-none focus:ring-1 ${
                editingMessage ? 'focus:ring-amber-500' : 'focus:ring-emerald-500'
              }`}
            />

            {editingMessage && (
              <button
                type="button"
                onClick={cancelEditing}
                title="Cancel edit"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <button
              type="submit"
              disabled={(!inputMessage.trim() && !selectedImage) || isUploadingImage}
              title={editingMessage ? 'Save changes' : 'Send message'}
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-white disabled:opacity-50 transition-colors shrink-0 ${
                editingMessage ? 'bg-amber-600 hover:bg-amber-500' : 'bg-[#00a884] hover:bg-[#008f70]'
              }`}
            >
              {isUploadingImage ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : editingMessage ? (
                <Check className="h-5 w-5" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </main>

      {/* PARTICIPANTS SIDEBAR (context aware, Discord style) */}
      {showParticipants && (
        <aside className={`${mobilePanel === 'participants' ? 'flex' : 'hidden'} md:flex w-full md:w-64 shrink-0 flex-col border-l border-slate-800 bg-[#111b21]`}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-[#202c33] px-4 py-3.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="shrink-0">{renderChannelAvatar(activeChannel, 'h-8 w-8')}</div>
              <div className="overflow-hidden">
                <h4 className="truncate text-xs font-bold text-slate-100">{participantsTitle}</h4>
                <p className="truncate text-[10px] text-slate-400">{participantsSubtitle}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowParticipants(false);
                setMobilePanel('chat');
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors shrink-0"
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
                    <div
                      key={u}
                      onClick={() => setInspectingUser(u)}
                      className="group/member w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#2a3942] transition-colors text-left cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(u, 'h-8 w-8')}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-[3px] ring-[#111b21]" />
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-slate-100 truncate">
                            {u}
                            {u === currentUser && (
                              <span className="text-slate-500 font-normal"> (you)</span>
                            )}
                          </span>
                        </div>
                        {activeGroup && u === activeGroup.createdBy ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400">
                            <Crown className="h-2.5 w-2.5" /> Group Creator
                          </span>
                        ) : (
                          <span className="block text-[10px] text-emerald-400/80">Online</span>
                        )}
                      </div>
                      {u !== currentUser && (
                        <span
                          role="button"
                          tabIndex={-1}
                          title={`Message @${u}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartDMWith(u);
                          }}
                          className="opacity-0 group-hover/member:opacity-100 rounded-md p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 transition-all"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
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
                    <div
                      key={u}
                      onClick={() => setInspectingUser(u)}
                      className="group/member w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#2a3942] transition-colors text-left cursor-pointer opacity-50 hover:opacity-100"
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(u, 'h-8 w-8')}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-slate-600 ring-[3px] ring-[#111b21]" />
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-slate-400 truncate block">
                          {u}
                          {u === currentUser && (
                            <span className="text-slate-500 font-normal"> (you)</span>
                          )}
                        </span>
                        <span className="block text-[10px] text-slate-500">Offline</span>
                      </div>
                      {u !== currentUser && (
                        <span
                          role="button"
                          tabIndex={-1}
                          title={`Message @${u}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartDMWith(u);
                          }}
                          className="opacity-0 group-hover/member:opacity-100 rounded-md p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 transition-all"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GROUP SHORTCUT */}
          {activeGroup && (
            <div className="border-t border-slate-800 p-3">
              <button
                onClick={() => {
                  setGroupNameDraft(activeGroup.name);
                  setGroupEmojiDraft(activeGroup.emoji);
                  setMemberToAdd('');
                  setShowGroupInfo(true);
                }}
                className="w-full rounded-xl bg-[#2a3942] px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Group Info & Members
              </button>
            </div>
          )}
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
        <div
          onClick={() => setShowSettingsModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl relative text-slate-100 max-h-[85vh] overflow-y-auto"
          >
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

            {/* UNHIDE SECTION */}
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
                      className="flex items-center justify-between gap-2 rounded-xl bg-[#111b21] px-3 py-2 border border-slate-800 text-xs"
                    >
                      <span className="truncate">
                        {ch === 'general' ? '#general-chat' : describeChannel(ch)}
                      </span>
                      <button
                        onClick={() => handleUnhideChannel(ch)}
                        className="shrink-0 rounded-lg bg-emerald-600/20 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-600 hover:text-white"
                      >
                        Unhide
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
        <div
          onClick={() => setShowGrantBadgeModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl relative text-slate-100"
          >
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
        <div
          onClick={() => setInspectingUser(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl text-center relative"
          >
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setInspectingUser(null)}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
              >
                Close
              </button>
              {inspectingUser !== currentUser && (
                <button
                  onClick={() => {
                    const target = inspectingUser;
                    setInspectingUser(null);
                    handleStartDMWith(target);
                  }}
                  className="flex-1 rounded-xl bg-[#00a884] py-2.5 text-xs font-bold text-white hover:bg-[#008f70]"
                >
                  Message
                </button>
              )}
            </div>
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
        <div
          onClick={() => setShowNewDMModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl"
          >
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
                    handleStartDMWith(selectedDMUser);
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

      {/* CREATE GROUP CHAT MODAL */}
      {showCreateGroupModal && (
        <div
          onClick={() => {
            setShowCreateGroupModal(false);
            resetGroupDraft();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateGroup}
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl flex flex-col max-h-[88vh]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Create Group Chat</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateGroupModal(false);
                  resetGroupDraft();
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* GROUP NAME */}
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Group Name</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Bio Squad"
              maxLength={40}
              className="w-full rounded-xl border border-slate-700 bg-[#2a3942] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 mb-4"
            />

            {/* GROUP EMOJI */}
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Smile className="h-3.5 w-3.5 text-emerald-400" /> Group Icon
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {GROUP_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewGroupEmoji(emoji)}
                  className={`h-9 w-9 rounded-xl text-base transition-all ${
                    newGroupEmoji === emoji
                      ? 'bg-emerald-600/30 border border-emerald-500 scale-105'
                      : 'bg-[#2a3942] border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* MEMBER PICKER */}
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Add Members ({newGroupMembers.length} selected)
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={groupMemberSearch}
                onChange={(e) => setGroupMemberSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full rounded-xl border border-slate-700 bg-[#111b21] py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-[#111b21] p-1.5 min-h-[120px] max-h-[220px]">
              {availableUsersToMessage
                .filter((u) => u.toLowerCase().includes(groupMemberSearch.toLowerCase()))
                .map((user) => {
                  const selected = newGroupMembers.includes(user);
                  return (
                    <button
                      key={user}
                      type="button"
                      onClick={() => toggleNewGroupMember(user)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                        selected ? 'bg-emerald-600/15' : 'hover:bg-[#202c33]'
                      }`}
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(user, 'h-7 w-7')}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#111b21] ${
                            onlineUsers[user] ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      <span className="flex-1 truncate text-xs font-semibold text-slate-200">
                        {user}
                      </span>
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-md border ${
                          selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </span>
                    </button>
                  );
                })}
              {availableUsersToMessage.length === 0 && (
                <p className="p-3 text-center text-[11px] text-slate-500 italic">
                  No other users found.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateGroupModal(false);
                  resetGroupDraft();
                }}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[#00a884] py-2.5 text-xs font-bold text-white hover:bg-[#008f70] shadow-lg"
              >
                Create Group
              </button>
            </div>
          </form>
        </div>
      )}

      {/* GROUP INFO MODAL */}
      {showGroupInfo && activeGroup && (
        <div
          onClick={() => setShowGroupInfo(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl flex flex-col max-h-[88vh]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Group Info</h3>
              </div>
              <button
                onClick={() => setShowGroupInfo(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              {renderGroupAvatar({ ...activeGroup, emoji: groupEmojiDraft }, 'h-14 w-14')}
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={groupNameDraft}
                  onChange={(e) => setGroupNameDraft(e.target.value)}
                  maxLength={40}
                  className="w-full rounded-xl border border-slate-700 bg-[#2a3942] px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Created by @{activeGroup.createdBy} · {Object.keys(activeGroup.members).length} members
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {GROUP_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setGroupEmojiDraft(emoji)}
                  className={`h-8 w-8 rounded-lg text-sm transition-all ${
                    groupEmojiDraft === emoji
                      ? 'bg-emerald-600/30 border border-emerald-500'
                      : 'bg-[#2a3942] border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              onClick={handleRenameGroup}
              className="mb-4 w-full rounded-xl bg-emerald-600/20 border border-emerald-500/30 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
            >
              Save Name & Icon
            </button>

            {/* MEMBERS */}
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Members — {Object.keys(activeGroup.members).length}
            </span>
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-[#111b21] p-1.5 mb-4 min-h-[100px]">
              {Object.keys(activeGroup.members).map((member) => (
                <div key={member} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                  <div className="relative shrink-0">
                    {renderAvatar(member, 'h-7 w-7')}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#111b21] ${
                        onlineUsers[member] ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-200">
                      {member}
                      {member === currentUser && <span className="text-slate-500"> (you)</span>}
                    </span>
                    {member === activeGroup.createdBy && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400">
                        <Crown className="h-2.5 w-2.5" /> Group Creator
                      </span>
                    )}
                  </div>
                  {member !== currentUser && member !== activeGroup.createdBy && (
                    <button
                      onClick={() => handleRemoveGroupMember(member)}
                      title={`Remove @${member}`}
                      className="rounded-md p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ADD MEMBER */}
            <div className="flex items-center gap-2 mb-4">
              <select
                value={memberToAdd}
                onChange={(e) => setMemberToAdd(e.target.value)}
                className="flex-1 rounded-xl border border-slate-700 bg-[#2a3942] px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Add a member --</option>
                {availableUsersToMessage
                  .filter((u) => !activeGroup.members[u])
                  .map((user) => (
                    <option key={user} value={user}>
                      {user} {onlineUsers[user] ? '(Online)' : '(Offline)'}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleAddGroupMember}
                disabled={!memberToAdd}
                className="rounded-xl bg-[#00a884] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#008f70] disabled:opacity-50 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGroupInfo(false)}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={handleLeaveGroup}
                className="flex-1 rounded-xl bg-red-600/15 border border-red-500/30 py-2.5 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition-colors"
              >
                Leave Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
