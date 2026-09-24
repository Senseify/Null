# NULL REST & WebSocket API Specification

## REST Endpoints

### Authentication
- `POST /api/auth/register` - Create new operator account
- `POST /api/auth/login` - Authenticate and obtain JWT access & refresh tokens
- `POST /api/auth/logout` - Invalidate session and set offline presence
- `GET /api/auth/me` - Retrieve current operator profile
- `PUT /api/auth/profile` - Update callsign, avatar URL, or status message
- `POST /api/auth/change-password` - Update operator password

### Friends & Network
- `GET /api/friends/search?q=<query>` - Search operators by username
- `GET /api/friends/list` - List active friends with live presence
- `GET /api/friends/requests` - List incoming and outgoing pending requests
- `POST /api/friends/request` - Send friend request to @username
- `POST /api/friends/respond` - Accept or reject friend request
- `DELETE /api/friends/:friendId` - Remove friend from network

### Communications
- `GET /api/conversations` - List direct conversations and private rooms
- `POST /api/conversations/direct` - Get or create 1-to-1 conversation
- `POST /api/conversations/rooms` - Create private room with roster
- `GET /api/conversations/:id` - Get conversation details and members
- `POST /api/conversations/:id/invite` - Add member to private room
- `POST /api/conversations/:id/leave` - Leave private room

### Messages
- `GET /api/messages?conversationId=<id>&limit=50` - Get message history
- `POST /api/messages` - Send text or attachment message
- `DELETE /api/messages/:id` - Delete message (sender only)
- `POST /api/messages/read/:conversationId` - Mark conversation as read

### Attachments
- `POST /api/attachments/upload` - Secure file/image upload (Multipart)
- `GET /api/attachments/:filename` - Stream uploaded asset

---

## WebSocket Events (Socket.IO)

- `ping` / `pong` - Real-time latency measurement
- `presence:update` - Broadcast user online/offline/idle states
- `message:send` / `message:new` - Real-time message distribution
- `message:deleted` - Instant message removal across clients
- `message:read` - Read receipts
- `typing:start` / `typing:stop` / `typing:update` - Real-time typing indicators
- `friend:request_received` / `friend:request_updated` - Friend notification events
- `room:member_joined` / `room:member_left` - Dynamic roster updates
