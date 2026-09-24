# NULL System Architecture

NULL is a private communications platform built with a high-performance, security-focused architecture designed for a close-knit group of invited users.

## Monorepo Layout

```
NULL/
├── apps/
│   ├── desktop/          # Tauri v2 + React 18 + TypeScript + Tailwind CSS
│   ├── mobile/           # React Native + TypeScript
│   └── server/           # Node.js + Express + TypeScript + Socket.IO + PostgreSQL
├── packages/
│   ├── shared/           # Shared TypeScript types, events, and API interfaces
│   └── database/         # PostgreSQL schema, migrations, and persistent client
├── docs/                 # System documentation and manuals
├── .env.example          # Environment configuration template
└── package.json          # Root npm workspace definitions
```

## Architectural Principles

1. **Relational Data Integrity**: Data is stored using a structured PostgreSQL relational schema with UUID primary keys, cascade rules, and comprehensive indexes.
2. **Dual-Transport Communication**:
   - **REST API**: Used for authentication, search, historical retrieval, profile management, and file uploads.
   - **WebSockets (Socket.IO)**: Used for real-time bidirectional events including messages, presence status, typing indicators, delivery receipts, and room updates.
3. **Cross-Platform Parity**: The desktop application (Tauri/React) and mobile application (React Native) interact with identical backend APIs and WebSocket event protocols.
4. **Resilient Local Persistence**: When `DATABASE_URL` is omitted in development, NULL defaults to an embedded persistent PostgreSQL engine (`@electric-sql/pglite`), guaranteeing that data survives server restarts without external setup.
