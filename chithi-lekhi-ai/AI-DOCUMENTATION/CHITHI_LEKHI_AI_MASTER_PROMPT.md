# 💌 CHITHI LEKHI AI
## Master Software Development Specification

## ROLE

You are acting as a:

- Senior Full Stack Engineer
- Software Architect
- UI/UX Designer
- Database Engineer
- Security Engineer
- DevOps Engineer

Your responsibility is to build a production-ready SaaS web application.

Do not create a simple demo.
Build a scalable, maintainable, professional application.

---

# PROJECT NAME

Chithi Lekhi AI

Tagline:

"যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন।"

---

# PRODUCT IDEA

Chithi Lekhi AI is an AI-powered emotional letter generation platform.

Users can generate beautiful personalized letters and share them instantly through WhatsApp.

The platform supports:

- Bengali letters
- English letters
- Banglish letters

The goal is to create an emotional storytelling product that users love to share.

---

# CORE FEATURES

## User Features

Users can:

1. Create emotional letters

Input:

- Receiver name
- Relationship
- Emotion
- Writing style
- Language


Categories:

- Love
- Friendship
- Family
- Apology
- Missing Someone
- Motivation
- Secret Letter


---

## AI Letter Generation

The AI should create:

- Natural human-like writing
- Emotional depth
- Personalized content
- Non-repetitive letters


Writing styles:

- Romantic
- Emotional
- Deep
- Simple
- Poetic
- Funny


---

# LETTER SHARING

Users can:

- Copy letter
- Share through WhatsApp
- Download text
- Create public sharing link


Example:

chithi.ai/c/abc123

---

# TECH STACK

Use modern production technologies.

## Frontend

Framework:

Next.js 15

Language:

TypeScript


Styling:

Tailwind CSS


UI:

Shadcn UI


Animation:

Framer Motion


---

## Backend

Use:

Next.js API Routes


Architecture:

Frontend

↓

API Layer

↓

Business Logic

↓

External Services


---

## AI

Use:

OpenAI API


Create:

lib/openai.ts


Never expose API keys.

Use:

Environment variables.

---

## Database

Use:

Supabase PostgreSQL


Tables:


## users

Fields:

id

email

name

avatar

created_at



## letters

Fields:

id

user_id

receiver_name

category

emotion

language

content

style

created_at



## favorites

Fields:

id

user_id

letter_id

created_at


---

# AUTHENTICATION

Implement:

Supabase Auth


Features:

- Signup
- Login
- Logout
- Protected dashboard


---

# PROJECT STRUCTURE


Use:


src/

 ├── app/

 │    ├── page.tsx

 │    ├── login/

 │    ├── signup/

 │    ├── dashboard/

 │    └── api/


 ├── components/


 ├── lib/


 ├── hooks/


 ├── types/


 ├── constants/


 └── utils/


---

# UI/UX REQUIREMENTS


Design philosophy:

Premium emotional experience.


Visual style:

- Modern SaaS
- Elegant
- Minimal
- Emotional
- Paper letter aesthetic


Colors:

Primary:

Soft pink

Secondary:

Cream

Accent:

Gold


---

# REQUIRED PAGES


## Landing Page


Sections:

Hero

Features

How it works

Examples

CTA

Footer


---

## Generator Page


Components:

Name input

Category selector

Emotion selector

Language selector

Generate button

Letter preview


---

## Dashboard


Show:

Generated letters

Saved letters

Profile

Usage statistics


---

## Authentication Pages


Login

Signup


---

# COMPONENT ARCHITECTURE


Create reusable components:


Navbar

Footer

HeroSection

LetterGenerator

LetterCard

CategorySelector

EmotionSelector

LanguageSelector

ShareButtons

DashboardCard


---

# API DESIGN


Create:


POST

/api/generate-letter


Request:


{
name:"",
category:"",
emotion:"",
language:"",
style:""
}



Response:


{
success:true,
letter:""
}



Requirements:

- Validation
- Error handling
- Type safety
- Security


---

# SECURITY REQUIREMENTS


Implement:

- Environment variables
- Input sanitization
- API validation
- Authentication protection
- Database security rules
- Rate limiting preparation


---

# PERFORMANCE REQUIREMENTS


Optimize:

- SEO
- Loading speed
- Server components
- Image optimization
- Database queries
- Bundle size


Target:

Lighthouse score >90


---

# DEVELOPMENT RULES


IMPORTANT:


1. Do not generate everything at once.

Build step by step.


2. After every phase:

- Review code
- Find bugs
- Improve quality
- Continue


3. Follow clean architecture.


4. Write production-quality code.


5. Add comments only where necessary.


6. Avoid unnecessary dependencies.


---

# DEVELOPMENT PHASES


## Phase 1

Project setup

- Next.js
- TypeScript
- Tailwind
- Folder structure


---

## Phase 2

Frontend UI

Create:

- Landing page
- Generator UI
- Letter card


---

## Phase 3

Local letter engine

Before AI:

Create sample letter database.

---

## Phase 4

Backend API


---

## Phase 5

OpenAI integration


---

## Phase 6

Supabase database


---

## Phase 7

Authentication


---

## Phase 8

Dashboard


---

## Phase 9

Premium features


Add:

- Anonymous links
- Favorites
- Sharing cards


---

## Phase 10

Testing


Test:

- UI
- API
- Database
- Authentication


---

## Phase 11

Deployment


Prepare:

- Vercel deployment
- Environment configuration
- Production build


---

# FINAL REQUIREMENT


Before declaring completion:

Perform a complete senior engineer review.

Check:

- Code quality
- Security
- Scalability
- UX
- Performance


The final result should be a production-ready SaaS application.