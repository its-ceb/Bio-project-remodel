# SecretChat media, link previews, and GIFs

## Persistent message pins

SecretChat stores one pin per conversation in Firebase Realtime Database:

- `pinnedMessages/general`
- `pinnedMessages/gc_<group-id>`
- `pinnedMessages/dm_<alphabetically-sorted-usernames>`

The record includes the message ID and a short snapshot, so it survives reloads, other devices, and message pagination. Deleting the pinned message clears the relevant pin in the same Firebase update.

## Link previews

Messages automatically linkify `http` and `https` URLs and show up to two compact previews:

- YouTube watch, short, embed, and `youtu.be` links use an in-chat YouTube player.
- Public Instagram posts/reels use Instagram's embed URL. Instagram can block private, restricted, logged-out, or otherwise non-embeddable content, so every card includes an **Open on Instagram** fallback.
- Direct `.gif`, `.webp`, or `.apng` links display as animated media; direct video files such as `.mp4` and `.webm` get native video controls.
- Other links display a safe hostname/path card. The frontend does not fetch arbitrary pages for Open Graph metadata because most sites block that browser request with CORS.

## Enable the KLIPY GIF picker

The picker uses KLIPY's browser-oriented application key and stores the selected direct GIF URL in Firebase with the message. It does **not** upload the GIF to ImgBB.

1. Create an account at [KLIPY Partner Panel](https://partner.klipy.com/).
2. In **API Keys**, choose **Add Platform**, register the production site domain, and create an app key.
3. When you next update Netlify, add this production environment variable:

   ```text
   VITE_KLIPY_API_KEY=your_klipy_app_key
   ```

4. Redeploy the Netlify site. Vite inserts `VITE_*` values during the build, so an already deployed build will not see the new value.

KLIPY application keys are used by the browser GIF integration, so they are visible in browser requests. They are not a private server credential; configure the permitted platform/domain in KLIPY's Partner Panel and use KLIPY's content filtering/usage controls there. The in-app picker requests `content_filter=medium` and displays **Powered by KLIPY** attribution.

A test key is suitable for development; request a production key from KLIPY before wider sharing. See the [KLIPY docs](https://docs.klipy.com/getting-started) for its current limits and integration requirements.
