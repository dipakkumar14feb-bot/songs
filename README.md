# 🎵 Sonora AI - Next-Gen Intelligent Music Streaming Platform

Sonora AI is a private, production-grade cloud music streaming web platform inspired by modern audio streaming aesthetics with an original UI design, dark luxury glassmorphism, AI-powered playlist generation, real-time audio visualizer, admin studio with bulk music uploader, range-request streaming, and continuous playback.

---

## 🌟 Key Features

- **🎧 Persistent Music Player**: Global audio controller with seamless playback between pages, seek bar (HTTP 206 range requests), queue manager, shuffle, repeat, volume, synced lyrics viewer, and full-screen immersive canvas visualizer.
- **⚡ AI Music Discovery & Playlist Generator**: Powered by Google Gemini (`gemini-3.8-flash`), generates tailored playlists strictly from existing library tracks based on mood tags or freeform natural prompts (e.g., *"Energetic Bhojpuri fusion for night drive"*).
- **🤖 Interactive AI Music Assistant**: Floating AI copilot that recommends tracks, explains albums, triggers instant song playback, and automates playlist curation.
- **📁 Admin Studio & Bulk Upload**:
  - Drag & drop audio uploader supporting MP3, WAV, FLAC, M4A, AAC.
  - Multi-file bulk audio uploader with live upload progress indicators.
  - Automatic metadata extraction, album art upload, synced lyrics editor.
  - Storage analytics, play count graphs, song & artist management.
- **💎 User Library**: Custom playlist creation, liked tracks, listening history with resume-listening progress tracking.
- **🔒 Role-Based Access Control**: Pre-configured `ADMIN` and `USER` roles with one-click switcher or login screen.
- **🚀 Cloud-Ready Architecture**: Decoupled cloud storage design (AWS S3, Cloudflare R2, Supabase, Vercel Blob) and PostgreSQL Prisma schema ready for Vercel.

---

## 🚀 Quick Start Guide

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-username/sonora-ai.git
cd sonora-ai

# Install dependencies
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your variables:
- `GEMINI_API_KEY`: Get from [Google AI Studio](https://aistudio.google.com/) for AI curation and assistant.
- `DATABASE_URL`: PostgreSQL connection string (e.g. Supabase, Neon, AWS RDS, Cloud SQL).
- `STORAGE_PROVIDER`: `local` for disk storage or `s3` / `r2` / `supabase` for cloud object storage.

### 3. Running Locally

```bash
# Start full-stack development server (Express backend + Vite HMR frontend on port 3000)
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🗄️ Database & Prisma Setup

For production with PostgreSQL:

```bash
# Push schema to PostgreSQL
npx prisma db push

# Generate Prisma Client
npx prisma generate

# (Optional) Launch Prisma Studio GUI
npx prisma studio
```

The database schema is located in `prisma/schema.prisma` and models:
- `User` (roles: `ADMIN`, `USER`)
- `Song` (duration, audio URL, cover URL, lyrics, play count)
- `Artist` & `Album`
- `Playlist` & `PlaylistSong`
- `Like` & `ListeningHistory`

---

## ☁️ Cloud Object Storage Setup

Never store raw audio files in the relational database. Sonora AI uses an object storage abstraction:

### AWS S3 / Cloudflare R2:
1. Create a bucket (e.g. `sonora-audio-vault`)
2. Configure CORS to allow `GET`, `PUT`, `HEAD` from your domain
3. Add credentials to `.env`:
   ```env
   STORAGE_PROVIDER=r2
   STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   STORAGE_ACCESS_KEY=...
   STORAGE_SECRET_KEY=...
   STORAGE_PUBLIC_URL=https://cdn.yourdomain.com
   ```

---

## 👑 First Admin User & Uploading Music

1. In development, click the **Role Switcher** in the top navigation or log in with:
   - **Email:** `admin@vibewave.io`
   - **Role:** `ADMIN`
2. Navigate to `/admin` or click **"Admin Studio"** in the sidebar.
3. Choose **Upload New Track** for single songs with custom lyrics and cover art, or **Bulk Upload** to drop 10+ audio files at once with instant ingestion!

---

## 🌐 Vercel Deployment

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set Build Command: `npm run build`
4. Set Output Directory: `dist`
5. Configure Environment Variables in Vercel project settings (`GEMINI_API_KEY`, `DATABASE_URL`, `STORAGE_*`).
6. Deploy!
