import type { CSSProperties } from 'react';

export interface UserProfileData {
  bio?: string;
  avatarUrl?: string;
  badgeText?: string;
  badgeEmoji?: string;
  /** One hex colour or two comma-separated hex colours for a gradient. */
  badgeColors?: string;
  isFounder?: boolean;
}

export interface BadgePresentation {
  text: string;
  emoji: string;
  colors: string[];
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RETIRED_BADGE_NAMES = new Set(['NOOB', 'TUFF']);
const FOUNDER_COLORS = ['#b91c1c', '#9f1239'];
const DEFAULT_BADGE_COLORS = ['#059669'];

/**
 * Accepts a single hex colour or a two-colour gradient entered as
 * "#7c3aed, #ec4899". Keeping the stored value to hex only prevents badge
 * styling from becoming arbitrary CSS supplied by a user profile.
 */
export function normaliseBadgeColors(value: string): string | null {
  const colors = value
    .split(',')
    .map((color) => color.trim())
    .filter(Boolean);

  if (colors.length < 1 || colors.length > 2 || !colors.every((color) => HEX_COLOR.test(color))) {
    return null;
  }

  return colors.map((color) => color.toLowerCase()).join(', ');
}

function parseBadgeColors(value?: string): string[] | null {
  if (!value) return null;
  const normalised = normaliseBadgeColors(value);
  return normalised ? normalised.split(', ') : null;
}

/** Returns nothing for the retired 400/600 badges, even if stale DB data remains. */
export function getBadgePresentation(profile?: UserProfileData): BadgePresentation | null {
  if (!profile) return null;

  const isFounder = profile.isFounder === true;
  const text = (isFounder ? 'FOUNDER' : profile.badgeText || '').trim();
  if (!text || (!isFounder && RETIRED_BADGE_NAMES.has(text.toUpperCase()))) return null;

  return {
    text,
    emoji: (isFounder ? '🐺' : profile.badgeEmoji || '🏷️').trim() || '🏷️',
    colors: isFounder ? FOUNDER_COLORS : parseBadgeColors(profile.badgeColors) || DEFAULT_BADGE_COLORS,
  };
}

export function badgeBackgroundStyle(colors: string[]): CSSProperties {
  if (colors.length > 1) {
    return { backgroundImage: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` };
  }

  return { backgroundColor: colors[0] || DEFAULT_BADGE_COLORS[0] };
}
