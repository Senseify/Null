# NULL Database Architecture & Schema

NULL utilizes a fully relational PostgreSQL schema managed via versioned atomic SQL migrations.

## Entity Relationship Overview

```
users (id, username, display_name, email, password_hash, avatar_url, is_online, last_seen_at)
  │
  ├── 1:N ── sessions (token_hash, user_agent, expires_at)
  ├── 1:N ── friend_requests (sender_id, receiver_id, status)
  ├── 1:N ── friendships (user_id, friend_id)
  ├── 1:N ── conversation_members (conversation_id, user_id, role, last_read_at)
  └── 1:N ── messages (conversation_id, sender_id, content, type, attachment_url, is_deleted)
               │
               └── 1:N ── message_reads (message_id, user_id, read_at)
```

## Migration Engine

Migrations are stored in `packages/database/migrations/*.sql` and executed via `npm run db:migrate`.
Execution history is tracked in `_schema_migrations`.
All migrations run within atomic transactions to prevent partial schema drift.
