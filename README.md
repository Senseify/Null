# NULL Communications Platform

> **Sovereign, encrypted, real-time peer and room communication system.**  
> Built with Node.js, Express, Socket.IO, PostgreSQL, Tauri, and React.

---

## ⚡ Option 1: Instant Run on Windows (No Setup Required)

If you just want to run the application immediately without installing Node.js, Rust, or any dependencies, pre-compiled Windows binaries are included inside the `installers/` directory:

| Binary | Description | Instructions |
| :--- | :--- | :--- |
| **`installers/null-desktop.exe`** | **Portable Standalone Executable** | Simply double-click to launch immediately. No installation required. |
| **`installers/NULL_1.0.0_x64-setup.exe`** | **Full Windows NSIS Setup** | Installs NULL to your system with desktop shortcuts & Start Menu integration. |
| **`installers/NULL_1.0.0_x64_en-US.msi`** | **Windows MSI Installer** | Standard Windows Installer package for system-wide deployment. |

> **Note:** The pre-compiled Windows application is pre-configured to connect directly to the live production server at `https://null-server-g543.onrender.com`. You can register a new operator account and immediately start chatting with friends across the internet. You can also customize the gateway server URL at any time via the login screen or in **Settings -> Network**.

---

## 🛠️ Option 2: Running from Source (Developer Setup)

### 1. Prerequisites
- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher
- *(Optional for Tauri native desktop builds)*: **Rust** (stable-x86_64-pc-windows-msvc) & **Visual Studio 2022 C++ Build Tools**

### 2. Install Workspace Dependencies
In the root directory of the project, run:
```bash
npm install
```
This installs all monorepo workspace dependencies (`apps/server`, `apps/desktop`, `apps/mobile`, `packages/shared`, `packages/database`).

### 3. Environment Configuration
Copy the template environment file to create your local `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

By default, the server runs on port `4000` and uses an embedded persistent PostgreSQL instance in `./data/null_postgres`. No external database is required for local development.

### 4. Start the Backend Server
```bash
npm run dev:server
```
The server will start on `http://localhost:4000`.  
Health check endpoint: `http://localhost:4000/api/health`

### 5. Start the Desktop Client

#### A. Web Dev Mode (Browser preview):
```bash
npm run dev:desktop
```
Opens the Vite development server at `http://localhost:1420`.

#### B. Native Desktop Window (Tauri Dev Mode):
```bash
npm run tauri:dev
```
Compiles and launches the native Windows desktop client with hot-reload enabled.

#### C. Build Release Executable & Installers:
```bash
npm run tauri:build
```
Produces the optimized release binaries in `apps/desktop/src-tauri/target/release/` and bundle installers in `apps/desktop/src-tauri/target/release/bundle/`.

### 6. Start the Mobile Client (React Native)
```bash
npm run dev:mobile
```
Starts the Metro bundler for the React Native mobile application.

---

## 🚀 Option 3: Production Server Deployment

### Deploy with Docker
A multi-stage, production-ready `Dockerfile` is included in the project root:
```bash
# Build the container image
docker build -t null-server .

# Run the container
docker run -d -p 4000:4000 \
  -e NODE_ENV=production \
  -e PORT=4000 \
  -e JWT_SECRET=your_super_secret_64_character_random_string_here \
  -e DATABASE_URL="postgresql://user:password@your-db-host:5432/nulldb" \
  null-server
```

### Deploy to Render
The repository includes a ready-to-use [`render.yaml`](file:///c:/Users/sridh/OneDrive/Desktop/Null/render.yaml) blueprint:
1. Connect this repository to your [Render](https://render.com) account.
2. Select **New Blueprint Instance** and pick `render.yaml`.
3. Render automatically provisions the web service and a managed PostgreSQL database.

---

## 📁 Repository Structure

```text
NULL/
├── installers/                   # Ready-to-run Windows executables & installers
│   ├── null-desktop.exe          # Standalone portable application
│   ├── NULL_1.0.0_x64-setup.exe  # NSIS Windows Setup executable
│   └── NULL_1.0.0_x64_en-US.msi  # Windows MSI installation package
├── apps/
│   ├── server/                   # Backend Node.js/Express API + Socket.IO realtime engine
│   │   ├── src/                  # Controllers, routes, services, socket managers
│   │   └── package.json
│   ├── desktop/                  # Tauri + React desktop application
│   │   ├── src/                  # React UI components, contexts, hooks, styling
│   │   ├── src-tauri/            # Rust native backend & window configuration
│   │   └── package.json
│   └── mobile/                   # React Native mobile client
│       ├── src/                  # Mobile screens, state, socket & API integration
│       └── package.json
├── packages/
│   ├── shared/                   # Shared TypeScript interfaces, types, constants
│   └── database/                 # PostgreSQL client, migrations, schema definitions
├── docs/                         # Architecture, API specifications, and protocol docs
├── Dockerfile                    # Container build configuration
├── render.yaml                   # Cloud deployment blueprint
├── package.json                  # Root monorepo workspace configuration
├── .env.example                  # Environment configuration template
└── README.md                     # Master setup & operation guide
```

---

## 🔐 Environment Variables Reference

| Variable | Default (Dev) | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Runtime environment (`development` or `production`). |
| `PORT` | `4000` | HTTP and WebSocket server listening port. |
| `HOST` | `0.0.0.0` | Network binding interface. |
| `DATABASE_URL` | *(empty)* | PostgreSQL connection URI. If omitted, embedded PG is used. |
| `JWT_SECRET` | *(dev secret)* | 64+ character secret for signing authentication tokens. |
| `JWT_EXPIRES_IN` | `7d` | Access token lifespan. |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | Refresh token lifespan. |
| `CORS_ORIGIN` | `*` | Comma-delimited list of allowed origin headers. |
| `MAX_FILE_SIZE_MB` | `25` | Maximum upload size for media & file attachments. |
| `S3_ENDPOINT` | *(optional)* | Custom S3 endpoint (e.g. Supabase, MinIO, Cloudflare R2). |
| `S3_BUCKET` | *(optional)* | Cloud storage bucket name for persistent attachments. |
| `S3_ACCESS_KEY_ID` | *(optional)* | S3 access key credentials. |
| `S3_SECRET_ACCESS_KEY`| *(optional)* | S3 secret key credentials. |
| `VITE_API_URL` | `http://localhost:4000` | Base HTTP endpoint for desktop client API calls. |
| `VITE_WS_URL` | `http://localhost:4000` | Base WebSocket endpoint for desktop realtime events. |

---

## 🔒 Security & Privacy Notice

This distributable package contains **NO** private credentials, production database passwords, live JWT secrets, or cloud storage keys. All configuration is driven via environment variables or safe public defaults. For production deployments, always generate cryptographically strong, random secrets.
