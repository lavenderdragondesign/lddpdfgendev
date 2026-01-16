<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LavenderDragonDesign PDF Generator

A Vite + React app for building branded PDFs.

## Local dev

**Prereqs:** Node.js 20+

1. Install deps
   ```bash
   npm install
   ```

2. Add your key (optional, only needed for Gemini-powered features)
   ```bash
   cp .env.example .env.local
   # then edit .env.local and set GEMINI_API_KEY
   ```

3. Run
   ```bash
   npm run dev
   ```

## Deploy to Netlify

### Quick settings
- **Build command:** `npm ci --no-audit --no-fund && npm run build`
- **Publish directory:** `dist`
- **Node version:** `20`

### Environment variables
If you use Gemini features, set this in Netlify:
- `GEMINI_API_KEY` = your key

(If you don't use Gemini features, you can leave it unset.)

## GitHub

This repo is ready to push as-is. Recommended first commit:
```bash
git init
git add .
git commit -m "Initial commit"
```
