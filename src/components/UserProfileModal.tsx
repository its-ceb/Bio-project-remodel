import React, { useState } from 'react';
import { X, User, Upload, Loader2 } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, update } from 'firebase/database';

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
}

const IMGBB_API_KEY = '9e341096967527234e9d141032f6a8c5';

export default function UserProfileModal({
  username,
  currentProfile,
  onClose,
  onProfileUpdated,
}: UserProfileModalProps) {
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatarUrl || '');
  const [secretCode, setSecretCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const userRef = ref(database, `users/${username}/profile`);
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

      await update(userRef, updatePayload);
      onProfileUpdated();
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#1f2c34] p-6 shadow-2xl relative text-slate-100">
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
                {username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  {username}
                </span>
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
              disabled={saving || uploadingImage}
              className="rounded-xl bg-[#00a884] px-5 py-2 text-xs font-bold text-white hover:bg-[#008f70] disabled:opacity-50 shadow-lg"
            >
              {saving ? 'Saving...' : 'Save Profile'}
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