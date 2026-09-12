import React, { useState, useEffect } from 'react';
import {
  X, User, Upload, Loader2, AtSign, KeyRound, ShieldCheck, ShieldAlert, Eye, EyeOff, AlertTriangle
} from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, update, get } from 'firebase/database';

export interface UserProfileData {
  bio?: string;
  avatarUrl?: string;
  badgeText?: string;
  badgeEmoji?: string;
  badgeBgColor?: string;
  isFounder?: boolean;
}

interface UserProfileModalProps {
  username: string;
  currentProfile: UserProfileData;
  onClose: () => void;
  onProfileUpdated: () => void;
  /* Called after a successful rename so the parent can point its session at
     the new username (state + localStorage). Optional: without it the modal
     falls back to updating localStorage itself. */
  onUsernameChanged?: (newUsername: string) => void;
}

const IMGBB_API_KEY = '9e341096967527234e9d141032f6a8c5';

/* Realtime Database keys cannot contain . # $ [ ] / — these are the safe
   characters we let a username use. */
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;
const MIN_PASSWORD_LENGTH = 4;

type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

export default function UserProfileModal({
  username,
  currentProfile,
  onClose,
  onProfileUpdated,
  onUsernameChanged,
}: UserProfileModalProps) {
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatarUrl || '');
  const [secretCode, setSecretCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ---- account (username + password) ----
  const [newUsername, setNewUsername] = useState(username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');

  const trimmedUsername = newUsername.trim();
  const usernameChanged = trimmedUsername !== username;
  const wantsNewPassword = newPassword.length > 0;
  // a username or password change must be authorised with the current password
  const needsCurrentPassword = usernameChanged || wantsNewPassword;

  /* Live availability check, debounced so we don't hit the database on
     every keystroke. */
  useEffect(() => {
    if (!usernameChanged) {
      setUsernameStatus('idle');
      return;
    }
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const snap = await get(ref(database, `users/${trimmedUsername}`));
        setUsernameStatus(snap.exists() ? 'taken' : 'available');
      } catch (err) {
        console.error('Username availability check failed:', err);
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [trimmedUsername, usernameChanged]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data?.url) {
        setAvatarUrl(result.data.url);
      } else {
        console.error('ImgBB upload error:', result);
      }
    } catch (err) {
      console.error('Failed to upload image to ImgBB:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setAvatarUrl('');
  };

  /* ------------------------------------------------------------------ */
  /* ACCOUNT RENAME                                                     */
  /* A username is baked into a lot of paths, so a rename writes one     */
  /* single multi-path update that moves every reference at once —       */
  /* profile, password, messages, read receipts, reactions, replies,     */
  /* group memberships and presence. Nothing is left pointing at the     */
  /* old name.                                                           */
  /* ------------------------------------------------------------------ */
  const migrateAccount = async (
    from: string,
    to: string,
    password: string,
    profile: UserProfileData
  ) => {
    const updates: Record<string, unknown> = {};

    updates[`users/${to}`] = { password, profile };
    updates[`users/${from}`] = null;
    updates[`presence/${from}`] = null;
    updates[`presence/${to}`] = true;

    // messages: sender, receiver, read receipts, reactions and reply quotes
    const messagesSnap = await get(ref(database, 'messages'));
    if (messagesSnap.exists()) {
      const messages = messagesSnap.val() as Record<string, any>;
      Object.entries(messages).forEach(([id, msg]) => {
        if (!msg) return;

        if (msg.sender === from) updates[`messages/${id}/sender`] = to;
        if (msg.receiver === from) updates[`messages/${id}/receiver`] = to;

        if (msg.readBy && msg.readBy[from]) {
          updates[`messages/${id}/readBy/${from}`] = null;
          updates[`messages/${id}/readBy/${to}`] = true;
        }

        if (msg.reactions) {
          Object.entries(msg.reactions as Record<string, any>).forEach(([emoji, users]) => {
            if (users && users[from]) {
              updates[`messages/${id}/reactions/${emoji}/${from}`] = null;
              updates[`messages/${id}/reactions/${emoji}/${to}`] = true;
            }
          });
        }

        if (msg.replyTo && msg.replyTo.sender === from) {
          updates[`messages/${id}/replyTo/sender`] = to;
        }
      });
    }

    // group memberships + group creator
    const groupsSnap = await get(ref(database, 'groups'));
    if (groupsSnap.exists()) {
      const groups = groupsSnap.val() as Record<string, any>;
      Object.entries(groups).forEach(([id, group]) => {
        if (!group) return;
        if (group.members && group.members[from]) {
          updates[`groups/${id}/members/${from}`] = null;
          updates[`groups/${id}/members/${to}`] = true;
        }
        if (group.createdBy === from) updates[`groups/${id}/createdBy`] = to;
      });
    }

    // drop any stale "typing" flag left under the old name
    const typingSnap = await get(ref(database, 'typing'));
    if (typingSnap.exists()) {
      const typing = typingSnap.val() as Record<string, any>;
      Object.entries(typing).forEach(([channel, users]) => {
        if (users && users[from]) updates[`typing/${channel}/${from}`] = null;
      });
    }

    await update(ref(database), updates);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');

    /* ---------------- validate the account changes ---------------- */
    if (usernameChanged) {
      if (!USERNAME_PATTERN.test(trimmedUsername)) {
        setAccountError('Usernames can use letters, numbers, "_" and "-" (3–20 characters).');
        return;
      }
      if (usernameStatus === 'taken') {
        setAccountError(`"${trimmedUsername}" is already taken. Please pick another one.`);
        return;
      }
    }

    if (wantsNewPassword) {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setAccountError(`Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (newPassword !== confirmPassword) {
        setAccountError('The new passwords do not match.');
        return;
      }
    }

    if (needsCurrentPassword && !currentPassword) {
      setAccountError('Enter your current password to change your username or password.');
      return;
    }

    setSaving(true);

    try {
      /* ------------- verify the current password -------------- */
      let existingPassword = '';
      if (needsCurrentPassword) {
        const passSnap = await get(ref(database, `users/${username}/password`));
        existingPassword = (passSnap.val() as string) || '';

        if (currentPassword !== existingPassword) {
          setAccountError('Your current password is incorrect.');
          return;
        }

        // re-check availability at save time (someone may have taken it)
        if (usernameChanged) {
          const nameSnap = await get(ref(database, `users/${trimmedUsername}`));
          if (nameSnap.exists()) {
            setAccountError(`"${trimmedUsername}" was just taken. Please pick another one.`);
            return;
          }
        }
      }

      /* ---------------- profile payload ---------------- */
      const isFounderClaim = secretCode.trim() === '777-founder' || currentProfile.isFounder;

      const updatePayload: UserProfileData = {
        bio,
        avatarUrl,
        ...(isFounderClaim
          ? {
              badgeText: 'FOUNDER',
              badgeEmoji: '🐺',
              badgeBgColor: 'bg-gradient-to-r from-red-700 to-rose-900 border border-red-500/50',
              isFounder: true,
            }
          : {
              badgeText: currentProfile.badgeText || '',
              badgeEmoji: currentProfile.badgeEmoji || '',
              badgeBgColor: currentProfile.badgeBgColor || '',
              isFounder: false,
            }),
      };

      const finalPassword = wantsNewPassword ? newPassword : existingPassword;

      /* ---------------- write ---------------- */
      if (usernameChanged) {
        await migrateAccount(username, trimmedUsername, finalPassword, updatePayload);
      } else {
        await update(ref(database, `users/${username}/profile`), updatePayload);
        if (wantsNewPassword) {
          await update(ref(database, `users/${username}`), { password: newPassword });
        }
      }

      onProfileUpdated();

      if (usernameChanged) {
        if (onUsernameChanged) {
          onUsernameChanged(trimmedUsername);
        } else {
          // keep the session valid even if the parent doesn't handle renames
          localStorage.setItem('secret_chat_user', trimmedUsername);
        }
      }

      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      setAccountError('Something went wrong while saving. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const usernameHint = () => {
    if (!usernameChanged) return null;
    if (usernameStatus === 'invalid') {
      return (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-400">
          <AlertTriangle className="h-3 w-3" /> Letters, numbers, "_" and "-" only (3–20 characters).
        </p>
      );
    }
    if (usernameStatus === 'checking') {
      return (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Checking availability…
        </p>
      );
    }
    if (usernameStatus === 'taken') {
      return (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-red-400">
          <ShieldAlert className="h-3 w-3" /> That username is taken.
        </p>
      );
    }
    if (usernameStatus === 'available') {
      return (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
          <ShieldCheck className="h-3 w-3" /> Available — everything will move across with you.
        </p>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl relative text-slate-100"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Edit Profile</h3>
            <p className="text-xs text-slate-400">@{username}</p>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="mb-6 rounded-2xl bg-[#111b21] p-4 border border-slate-800">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Profile Preview
          </span>
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500/30" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
                {trimmedUsername.slice(0, 2).toUpperCase() || username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  {trimmedUsername || username}
                </span>
                {usernameChanged && trimmedUsername && (
                  <span className="text-[10px] text-slate-500 line-through">@{username}</span>
                )}
                {(currentProfile.badgeText || secretCode.trim() === '777-founder') && (
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${
                      secretCode.trim() === '777-founder' || currentProfile.isFounder
                        ? 'bg-gradient-to-r from-red-700 to-rose-900 border border-red-500/50'
                        : currentProfile.badgeBgColor
                    }`}
                  >
                    <span>{secretCode.trim() === '777-founder' || currentProfile.isFounder ? '🐺' : currentProfile.badgeEmoji}</span>
                    <span>{secretCode.trim() === '777-founder' || currentProfile.isFounder ? 'FOUNDER' : currentProfile.badgeText}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 italic">{bio || 'No bio set yet'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Profile Picture</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-[#2a3942] px-3.5 py-2.5 text-xs text-slate-300 hover:border-emerald-500 hover:text-white cursor-pointer transition-colors">
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                ) : (
                  <Upload className="h-4 w-4 text-emerald-400" />
                )}
                <span>{uploadingImage ? 'Uploading image...' : 'Upload from device'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                  className="rounded-xl bg-red-600/10 border border-red-500/30 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-600 hover:text-white"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write something about yourself..."
              className="w-full rounded-xl border border-slate-700 bg-[#2a3942] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          {/* ============================ ACCOUNT ============================ */}
          <div className="rounded-2xl border border-slate-800 bg-[#111b21] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <AtSign className="h-3.5 w-3.5 text-emerald-400" /> Account
              </span>
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
                title={showPasswords ? 'Hide passwords' : 'Show passwords'}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-slate-400 hover:bg-slate-700/60 hover:text-white transition-colors"
              >
                {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPasswords ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* USERNAME */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                maxLength={20}
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-xl border border-slate-700 bg-[#2a3942] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              {usernameHint()}
              {usernameChanged && usernameStatus === 'available' && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Your chats, groups, reactions and read receipts move with you.
                </p>
              )}
            </div>

            {/* CURRENT PASSWORD */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current password
                {!needsCurrentPassword && <span className="text-slate-500 font-normal"> (only needed to change username or password)</span>}
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-700 bg-[#2a3942] py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* NEW PASSWORD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-700 bg-[#2a3942] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm new password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat it"
                  autoComplete="new-password"
                  disabled={!wantsNewPassword}
                  className="w-full rounded-xl border border-slate-700 bg-[#2a3942] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                />
              </div>
            </div>

            {wantsNewPassword && confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="flex items-center gap-1 text-[10px] text-amber-400">
                <AlertTriangle className="h-3 w-3" /> The new passwords do not match.
              </p>
            )}
          </div>

          {accountError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] font-medium text-red-400">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{accountError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage || usernameStatus === 'taken' || usernameStatus === 'invalid'}
              className="rounded-xl bg-[#00a884] px-5 py-2 text-xs font-bold text-white hover:bg-[#008f70] disabled:opacity-50 shadow-lg"
            >
              {saving ? 'Saving...' : usernameChanged || wantsNewPassword ? 'Save Changes' : 'Save Profile'}
            </button>
          </div>

          {/* SECRET FOUNDER UNLOCK FIELD */}
          <div className="flex justify-end pt-4">
            <input
              type="password"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="..."
              className="w-16 rounded-md border border-slate-800/60 bg-[#162026] px-2 py-1 text-center font-mono text-[10px] text-slate-600 focus:border-slate-700 focus:text-slate-300 focus:outline-none"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
