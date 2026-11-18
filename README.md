# NEXO 🚀

[![CI](https://github.com/Kartikey455001/Nexo/actions/workflows/ci.yml/badge.svg)](https://github.com/Kartikey455001/Nexo/actions)
[![Turborepo](https://img.shields.io/badge/monorepo-turborepo-ef4444.svg)](https://turbo.build)
[![pnpm](https://img.shields.io/badge/package%20manager-pnpm-orange.svg)](https://pnpm.io)
[![Next.js](https://img.shields.io/badge/frontend-Next.js%2016-black.svg)](https://nextjs.org)
[![NestJS](https://img.shields.io/badge/backend-NestJS%2011-ea2845.svg)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%206-2D3748.svg)](https://prisma.io)
[![License: UNLICENSED](https://img.shields.io/badge/license-UNLICENSED-lightgrey.svg)](LICENSE)

**NEXO** is a modern, high-performance, realtime communication platform built with a **security-first, privacy-first** architecture. Designed as a modular monorepo, NEXO delivers end-to-end encrypted messaging, realtime status and presence, low-latency WebRTC audio/video calls, ephemeral stories, and AI-assisted workflows.

---

## ✨ Features

- 🔒 **End-to-End Encryption (E2EE)**: Messages and media are encrypted and decrypted on client devices (ECDH + AES-GCM). Only ciphertext is handled by the server.
- 💬 **Realtime Messaging**: 1-on-1 and group chats with typing indicators, delivery receipts, and offline message queueing via WebSockets.
- 📞 **WebRTC Calling**: Peer-to-peer audio and video calls with realtime signaling.
- ⏳ **Ephemeral Stories**: Share 24-hour disappearing photos and updates.
- 🤖 **AI Assistant**: Built-in Google Gemini integration for smart summaries, drafting, and AI assistant capabilities.
- 📦 **Rich Media Uploads**: Secure S3-compatible object storage (AWS S3 or MinIO) using pre-signed upload URLs.
- 👥 **Social & Privacy Controls**: Friend requests, user profiles, blocking, and granular privacy preferences.
- 🏢 **Personal & Business Accounts**: First-class support for business accounts and custom profiles.
- 🛡️ **Session Management & Token Rotation**: Secure JWT access tokens, SHA-256 hashed refresh tokens, and multi-device session revocation.

---

## 🏗️ Repository Architecture

NEXO is managed as a monorepo powered by **[pnpm workspaces](https://pnpm.io/workspaces)** and **[Turborepo](https://turbo.build/)**:

```
Nexo/
├── apps/
│   ├── api/                   # Backend NestJS 11 REST API & WebSocket Gateway
│   └── web/                   # Frontend Next.js 16 (App Router, Tailwind CSS 4)
├── packages/
│   ├── api-client/            # Shared typed API client SDK
│   ├── config/                # Shared configurations
│   ├── crypto/                # Cryptographic utilities and key exchange
│   ├── types/                 # Shared TypeScript models and interfaces
│   ├── ui/                    # Reusable React component library
│   └── validation/            # Shared Zod validation schemas
├── infrastructure/
│   └── docker/
│       └── docker-compose.yml # Local development services (Redis 7, MinIO)
├── docs/                      # Architectural & security specifications
├── package.json               # Root monorepo workspace configuration
├── pnpm-workspace.yaml        # pnpm workspaces definition
└── turbo.json                 # Turborepo task pipeline configuration
```

---

## 🛠️ Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Monorepo Engine** | [Turborepo](https://turbo.build), [pnpm](https://pnpm.io) |
| **Web Frontend** | [Next.js 16](https://nextjs.org) (Turbopack), [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com), [Framer Motion](https://www.framer.com/motion), [Zustand](https://zustand.docs.pmnd.rs) |
| **Backend API** | [NestJS 11](https://nestjs.com), [Socket.IO](https://socket.io), [Passport.js](https://www.passportjs.org) |
| **Database & ORM** | [MongoDB Atlas](https://www.mongodb.com/atlas), [Prisma ORM 6.19](https://www.prisma.io) |
| **Queues & Cache** | [BullMQ](https://bullmq.io), [Redis](https://redis.io) *(optional in local development)* |
| **Object Storage** | [MinIO](https://min.io) / [AWS S3](https://aws.amazon.com/s3) |
| **Realtime & Calling** | [WebRTC](https://webrtc.org), [Socket.IO](https://socket.io) |
| **AI Integration** | [Google Gemini API](https://ai.google.dev) (`@google/genai`) |
| **API Docs** | [Swagger / OpenAPI 3](https://swagger.io) |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.0.0` or higher (tested on Node v22)
- **pnpm**: `v9.0.0` or higher (`npm install -g pnpm`)
- *(Optional)* **Docker & Docker Compose**: For running local Redis and MinIO

### 1. Clone the Repository

```bash
git clone https://github.com/Kartikey455001/Nexo.git
cd Nexo
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

Create frontend environment configuration:

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=ws://localhost:3001
```

Configure your `.env` variables:
- `DATABASE_URL`: Your MongoDB connection string (e.g. MongoDB Atlas or local MongoDB instance).
- `JWT_SECRET`: Random 32+ character string.
- `JWT_REFRESH_SECRET`: Random 32+ character string.
- `REDIS_ENABLED`: Set to `"false"` for development without Redis, or `"true"` if using Redis.
- `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key.

### 4. Generate Database Client

Push your schema and generate the Prisma client:

```bash
cd apps/api
npx prisma generate
npx prisma db push
cd ../..
```

### 5. Start Development Servers

Run all workspace applications in parallel:

```bash
pnpm dev
```

This starts:
- 🌐 **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- 🔌 **Backend API**: [http://localhost:3001](http://localhost:3001)
- 📖 **Swagger Documentation**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- 🩺 **Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

---

## 🐳 Optional Local Infrastructure (Docker)

To run Redis and MinIO locally:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

- **Redis**: `localhost:6379`
- **MinIO S3 API**: `http://localhost:9000`
- **MinIO Console**: `http://localhost:9001` (User: `admin`, Password: `admin123`)

Update `REDIS_ENABLED="true"` in `.env` if you want BullMQ queueing enabled.

---

## 📜 Monorepo Scripts

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Run all applications concurrently in watch mode |
| `pnpm build` | Build all packages and applications for production |
| `pnpm test` | Run test suites across all workspaces |
| `pnpm lint` | Lint code across all workspaces |
| `pnpm typecheck` | Perform TypeScript type checking |
| `pnpm format` | Auto-format source code using Prettier |
| `pnpm clean` | Clean build artifacts and caches |

---

## 🔒 Security & Privacy

1. **Client-Side Encryption**: E2EE private identity keys are generated and stored exclusively on client devices. Passwords unlock client-side backup blobs; the server never receives unencrypted private keys.
2. **Short-Lived JWTs & Session Revocation**: Access tokens expire quickly; refresh tokens are hashed with SHA-256 before persistence and rotated on each usage.
3. **Throttling & Fraud Defense**: Rate-limiting and IP tracking protect authentication and sensitive mutation endpoints.

For more details, see [docs/security.md](docs/security.md) and [docs/architecture.md](docs/architecture.md).

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
