# Architecture Overview

NEXO is a secure, realtime communication platform designed as a modular monolith. 

## Monorepo Structure

We use `pnpm` workspaces with Turborepo:
- `apps/api`: NestJS backend
- `apps/web`: Next.js web application
- `apps/android`: React Native Expo application
- `packages/*`: Shared internal packages

## Tech Stack
- MongoDB Atlas + Prisma ORM 6.19 (MongoDB connector)
- Redis + BullMQ (for queues and rate-limiting)
- WebRTC (for Calling)
- WebSocket (for Realtime events)
- Object Storage (S3 compatible)

MongoDB is the primary store for accounts, profiles, sessions, chats, and messages. Prisma 6.19 is pinned because MongoDB support is not available in Prisma 7. Apply schema changes with `prisma db push`; MongoDB does not use Prisma Migrate. Existing PostgreSQL data is not copied automatically when changing providers.
