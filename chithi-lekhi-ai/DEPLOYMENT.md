# 🚀 Chithi Lekhi AI — Production Deployment Guide

Complete step-by-step production deployment instructions for **Chithi Lekhi AI** (চিঠি লেখাই).

---

## 📋 Pre-Deployment Prerequisites

Ensure you have active accounts for:
1. **[Vercel](https://vercel.com)** — Web application hosting, edge network, and serverless functions.
2. **[Supabase](https://supabase.com)** — PostgreSQL database, Row Level Security (RLS), and authentication.
3. **[OpenAI Platform](https://platform.openai.com)** — API key with access to `gpt-4o-mini`.
4. **Custom Domain Provider** (e.g., Namecheap, Cloudflare, GoDaddy) — for custom domain setup (`chithi.ai`).

---

## 🛠️ Step 1: Database Setup (Supabase)

1. Log in to **[Supabase Dashboard](https://supabase.com/dashboard)** and click **New project**.
2. Set project name: `chithi-lekhi-ai-prod` and select your target region (e.g., Singapore `ap-southeast-1` or closest to your audience).
3. Once provisioned, navigate to **SQL Editor** in the left navigation.
4. Execute the initial schema migration script:
   - Copy and paste [`supabase/migrations/20260906000000_phase05_database_upgrade.sql`](supabase/migrations/20260906000000_phase05_database_upgrade.sql) and click **Run**.
5. Execute the security hardening migration script:
   - Copy and paste [`supabase/migrations/20260906000001_phase09_security_hardening.sql`](supabase/migrations/20260906000001_phase09_security_hardening.sql) and click **Run**.
6. Verify in **Database > Tables**:
   - `profiles` table exists with RLS enabled.
   - `letters` table exists with RLS enabled and required indexes (`idx_letters_user_id`, `idx_letters_public_slug`, `idx_letters_created_at`).
7. Configure Authentication in **Authentication > URL Configuration**:
   - **Site URL**: `https://chithi.ai` (or your initial Vercel domain `https://*.vercel.app`)
   - **Redirect URLs**: Add `https://chithi.ai/**` and `http://localhost:3000/**`.

---

## 🔑 Step 2: OpenAI API Setup

1. Go to **[OpenAI API Keys](https://platform.openai.com/api-keys)**.
2. Click **Create new secret key** (name it `chithi-lekhi-ai-production`).
3. Copy the key (`sk-proj-...`).
4. **Important Security Controls**:
   - In **Settings > Limits**, set monthly usage budgets (e.g., \$20–\$50) and email alert thresholds to prevent cost overruns.

---

## 🌐 Step 3: Deploy to Vercel

### Option A: Via GitHub / Git (Recommended for CI/CD)

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete production readiness (Phases 01-10)"
   git push origin main
   ```
2. In the **[Vercel Dashboard](https://vercel.com/new)**, click **Add New... > Project**.
3. Import your `chithi-lekhi-ai` repository.
4. Vercel automatically detects Next.js framework settings.
5. In **Environment Variables**, add the following 4 production variables:

| Key | Value Description | Public/Secret |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://chithi.ai` (or your assigned Vercel URL) | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public JWT key | Public |
| `OPENAI_API_KEY` | `sk-proj-...` | **Secret (Server Only)** |

> ⚠️ **SECURITY WARNING**: NEVER prepend `NEXT_PUBLIC_` to `OPENAI_API_KEY`. It must only ever execute inside serverless route handlers.

6. Click **Deploy**. Vercel will run `next build` and deploy within ~60 seconds.

### Option B: Via Vercel CLI

```bash
# 1. Install Vercel CLI globally if needed
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to production
vercel --prod
```

---

## 🌍 Step 4: Custom Domain & SSL Setup

1. In your project on Vercel, go to **Settings > Domains**.
2. Enter your domain (e.g. `chithi.ai` and `www.chithi.ai`).
3. Add the DNS records shown by Vercel into your DNS registrar (e.g., Cloudflare or Namecheap):
   - **A Record**: `@` → `76.76.21.21`
   - **CNAME Record**: `www` → `cname.vercel-dns.com`
4. Vercel automatically issues an SSL certificate (Let's Encrypt) within a few minutes.

---

## 🛡️ Step 5: Production Verification Checklist

Run these smoke tests once live:

- [ ] **Home Page & Generator**: Open `https://your-domain.com`. Generate a letter with Bengali, English, and Banglish options.
- [ ] **WhatsApp Sharing**: Click "হোয়াটসঅ্যাপে শেয়ার" and verify URL formatting.
- [ ] **Visual Studio**: Open the visual card modal, test switching themes (90s Old Paper, Romantic, Minimal, Modern) and aspect ratios, and download a PNG image.
- [ ] **Anonymous Link**: Click "পাবলিক লিংক তৈরি করুন", copy the `/read/[slug]` link in an incognito window, and verify:
  - Letter renders cleanly.
  - Zero private author information (user_id, email) is shown.
  - OpenGraph social media preview metadata displays accurately.
- [ ] **Authentication**:
  - Test `/signup` with a new email.
  - Confirm redirection to `/dashboard`.
  - Confirm `/dashboard` displays user statistics and saved letters.
  - Test `/login` and logout flow.
- [ ] **Rate Limiting**: Rapidly submit requests to `/api/generate-letter` and verify HTTP 429 Too Many Requests response after exceeding limit.
- [ ] **Security Headers**: Run `curl -I https://your-domain.com` and verify:
  - `Strict-Transport-Security` is active.
  - `X-Frame-Options: DENY` is active.
  - `X-Content-Type-Options: nosniff` is active.
  - `Content-Security-Policy` is active.
  - `X-Powered-By` header is disabled.
