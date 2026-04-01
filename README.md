# OpenClaw Agent Management System

A comprehensive multi-agent collaboration platform with real-time web dashboard for managing OpenClaw agents. Enables autonomous inter-agent communication via A2A (Agent-to-Agent) protocol with visual monitoring of agent status and task execution.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [A2A Protocol](#a2a-protocol)
- [WebSocket Events](#websocket-events)
- [Data Models](#data-models)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

### Agent Management
- **Registration**: Register new agents with name and capabilities
- **Heartbeat Monitoring**: Real-time agent status tracking (idle/busy/offline)
- **Capability Discovery**: Query agent capabilities via A2A protocol
- **Automatic Offline Detection**: Agents marked offline after 2 minutes without heartbeat

### Task Management
- **Task Creation**: Create standalone or collaborative tasks
- **Task Delegation**: Delegate tasks to other agents via A2A
- **Progress Tracking**: Real-time task progress monitoring
- **Status Updates**: Track task lifecycle (pending → running → completed/failed)
- **Collaborative Tasks**: Support parent-child task relationships

### A2A Protocol (Agent-to-Agent)
- **Agent Discovery**: Agents can discover other agents and their capabilities
- **Task Delegation**: One agent can delegate tasks to another
- **Method Invocation**: Direct method calls between agents
- **Status Queries**: Query agent and task status

### Real-time Dashboard
- **Agent Grid**: Visual cards showing all registered agents
- **Task Monitor**: Real-time list of running and all tasks
- **Activity Log**: Live feed of A2A communications and system events
- **WebSocket Updates**: Instant updates without page refresh
- **Interaction Panel**: Send A2A messages between agents

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Dashboard                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Agent Grid   │  │ Task Monitor │  │ Activity Log         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    WebSocket / HTTP
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Agent Router │  │ Task Manager │  │ A2A Protocol Handler │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ SQLite Store │  │ Memory Cache  │  │ WebSocket Manager    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    A2A Protocol (JSON-RPC 2.0)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Pool                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  Agent A   │◄─►│  Agent B   │◄─►│  Agent C   │◄─►│  Agent D   │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
| Component | Technology | Version |
|-----------|-------------|---------|
| Framework | FastAPI | 0.109+ |
| Server | Uvicorn | 0.27+ |
| Database | SQLite + SQLAlchemy | 2.0+ |
| Async DB | aiosqlite | 0.19+ |
| Validation | Pydantic | 2.6+ |
| WebSocket | websockets | 12.0+ |

### Frontend
| Component | Technology | Version |
|-----------|-------------|---------|
| Framework | React | 18.2+ |
| Language | TypeScript | 5.3+ |
| Build Tool | Vite | 5.1+ |
| Styling | TailwindCSS | 3.4+ |
| State | Zustand | 4.5+ |
| Icons | Lucide React | 0.323+ |

## Project Structure

```
agentmgt/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entry
│   │   ├── config.py            # Configuration settings
│   │   ├── models/              # Pydantic data models
│   │   │   ├── agent.py
│   │   │   ├── task.py
│   │   │   └── message.py
│   │   ├── routers/             # API endpoints
│   │   │   ├── agents.py
│   │   │   ├── tasks.py
│   │   │   └── a2a.py
│   │   ├── services/             # Business logic
│   │   │   ├── agent_service.py
│   │   │   ├── task_service.py
│   │   │   └── a2a_service.py
│   │   ├── storage/             # Data persistence
│   │   │   ├── sqlite_store.py
│   │   │   └── memory_cache.py
│   │   └── websocket/           # WebSocket handling
│   │       └── manager.py
│   ├── requirements.txt
│   └── run.py                   # Startup script
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── AgentCard.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── ActivityLog.tsx
│   │   │   ├── InteractionPanel.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useAgents.ts
│   │   │   ├── useTasks.ts
│   │   │   └── useWebSocket.ts
│   │   ├── stores/             # Zustand state stores
│   │   │   └── appStore.ts
│   │   ├── types/              # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
├── SPEC.md                      # Detailed specification
└── README.md
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/xuanguan2020/agentmgt.git
cd agentmgt
```

### 2. Start Backend
```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python run.py
```

The backend will start at `http://localhost:8000`

### 3. Start Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start at `http://localhost:5173`

### 4. Open Dashboard
Navigate to `http://localhost:5173` in your browser to access the dashboard.

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Application Settings
APP_NAME=OpenClaw Agent Management
DEBUG=true
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=sqlite+aiosqlite:///./agentmgt.db

# Agent Settings
HEARTBEAT_TIMEOUT_SECONDS=120
HEARTBEAT_INTERVAL_SECONDS=30

# Cache Settings
MAX_MEMORY_CACHE_SIZE=1000

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend Configuration

The frontend Vite config proxies API requests to the backend:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      }
    }
  }
})
```

## API Documentation

### Agent Endpoints

#### List All Agents
```
GET /api/agents
```
**Response:**
```json
[
  {
    "id": "abc123",
    "name": "Agent Alpha",
    "status": "idle",
    "capabilities": ["coding", "analysis"],
    "current_task_id": null,
    "created_at": "2024-01-01T00:00:00",
    "last_heartbeat": "2024-01-01T12:00:00"
  }
]
```

#### Get Agent
```
GET /api/agents/{agent_id}
```

#### Create Agent
```
POST /api/agents
Content-Type: application/json

{
  "name": "Agent Alpha",
  "capabilities": ["coding", "analysis", "research"],
  "metadata": {}
}
```

#### Delete Agent
```
DELETE /api/agents/{agent_id}
```

#### Agent Heartbeat
```
POST /api/agents/{agent_id}/heartbeat
Content-Type: application/json

{
  "status": "busy",
  "current_task_id": "task123"
}
```

### Task Endpoints

#### List All Tasks
```
GET /api/tasks
GET /api/tasks?status=running  # Filter by status
```

#### Get Task
```
GET /api/tasks/{task_id}
```

#### Create Task
```
POST /api/tasks
Content-Type: application/json

{
  "type": "standalone",
  "name": "Analyze Data",
  "description": "Perform data analysis",
  "assigned_agents": ["agent123"],
  "params": {}
}
```

#### Update Task
```
PATCH /api/tasks/{task_id}
Content-Type: application/json

{
  "status": "running",
  "progress": 0.5
}
```

#### Get Running Tasks
```
GET /api/tasks/running
```

### A2A Protocol Endpoints

#### Send A2A Message
```
POST /api/a2a/send?from_agent_id={agent_id}
Content-Type: application/json

{
  "to_agent_id": "target_agent_id",
  "action": "request",
  "method": "agent.capabilities",
  "params": {}
}
```

#### Get Messages for Agent
```
GET /api/a2a/messages/{agent_id}
```

#### Get Agent Capabilities
```
GET /api/a2a/capabilities/{agent_id}
```

### Activity Endpoints

#### Get Activity Log
```
GET /api/activity?limit=100
```

### Health Check
```
GET /api/health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00",
  "app_name": "OpenClaw Agent Management"
}
```

## A2A Protocol

The A2A (Agent-to-Agent) protocol enables communication between agents using JSON-RPC 2.0-like messages.

### Message Structure

```json
{
  "id": "msg_abc123",
  "from_agent_id": "agent_a",
  "to_agent_id": "agent_b",
  "action": "request",
  "method": "task.delegate",
  "params": {
    "task_id": "task_xyz"
  },
  "result": null,
  "error": null,
  "timestamp": "2024-01-01T12:00:00"
}
```

### Supported Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `agent.list` | List all agents | none |
| `agent.capabilities` | Get agent capabilities | none |
| `agent.status` | Get agent status | none |
| `task.create` | Create new task | `name`, `params` |
| `task.delegate` | Delegate task | `task_id`, `params` |
| `task.status` | Get task status | `task_id` |
| `task.result` | Get task result | `task_id` |

### Example: Agent Discovery

```python
# Agent A discovers Agent B's capabilities
message = {
    "to_agent_id": "agent_b",
    "action": "request",
    "method": "agent.capabilities",
    "params": {}
}

# Response
{
    "agent_id": "agent_b",
    "capabilities": ["coding", "analysis"],
    "status": "idle"
}
```

### Example: Task Delegation

```python
# Agent A delegates a task to Agent B
message = {
    "to_agent_id": "agent_b",
    "action": "request",
    "method": "task.delegate",
    "params": {
        "task_id": "parent_task_123",
        "params": {"priority": "high"}
    }
}
```

## WebSocket Events

Connect to WebSocket at `ws://localhost:8000/ws`

### Client → Server Messages

#### Ping
```json
{"type": "ping"}
```

#### Subscribe
```json
{"type": "subscribe", "channels": ["agents", "tasks"]}
```

### Server → Client Events

#### Connection Established
```json
{
  "type": "connected",
  "client_id": "uuid",
  "timestamp": "2024-01-01T12:00:00"
}
```

#### Agent Update
```json
{
  "type": "agent_update",
  "agent_id": "abc123",
  "data": {"status": "busy"},
  "timestamp": "2024-01-01T12:00:00"
}
```

#### Task Update
```json
{
  "type": "task_update",
  "task_id": "xyz789",
  "data": {"status": "running", "progress": 0.5},
  "timestamp": "2024-01-01T12:00:00"
}
```

#### Activity Event
```json
{
  "type": "activity",
  "activity_type": "a2a_message_sent",
  "data": {"message_id": "msg123"},
  "timestamp": "2024-01-01T12:00:00"
}
```

## Data Models

### Agent

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `name` | string | Human-readable name |
| `status` | enum | idle, busy, offline |
| `capabilities` | string[] | List of capabilities |
| `current_task_id` | string | Currently executing task |
| `metadata` | object | Additional metadata |
| `created_at` | datetime | Creation timestamp |
| `last_heartbeat` | datetime | Last heartbeat received |

### Task

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `type` | enum | standalone, collaborative |
| `status` | enum | pending, running, completed, failed, cancelled |
| `name` | string | Task name |
| `description` | string | Task description |
| `assigned_agents` | string[] | Assigned agent IDs |
| `parent_task_id` | string | Parent task for sub-tasks |
| `params` | object | Task parameters |
| `result` | object | Task result |
| `error` | string | Error message if failed |
| `progress` | float | Progress (0.0 - 1.0) |
| `created_at` | datetime | Creation timestamp |
| `started_at` | datetime | Start timestamp |
| `completed_at` | datetime | Completion timestamp |

### A2A Message

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Message ID |
| `from_agent_id` | string | Sender agent ID |
| `to_agent_id` | string | Recipient agent ID |
| `action` | enum | request, response, notify |
| `method` | string | Method to invoke |
| `params` | object | Method parameters |
| `result` | object | Response result |
| `error` | string | Error message |
| `timestamp` | datetime | Message timestamp |

## Development

### Running in Development Mode

**Backend:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Type Checking

**Frontend:**
```bash
cd frontend
npm run build  # Includes TypeScript check
```

### Code Formatting

The project uses standard conventions. Ensure TypeScript and Python code follow existing patterns.

## API Documentation (Interactive)

FastAPI provides interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Use Cases

### 1. Multi-Agent Data Processing Pipeline
```
Data Collector Agent → Analysis Agent → Report Agent
```

1. Data Collector gathers data
2. Delegates analysis to Analysis Agent
3. Analysis Agent reports results to Report Agent
4. Report Agent generates final output

### 2. Distributed Task Execution
```
Orchestrator Agent → Worker Agent 1 ─┐
                   → Worker Agent 2 ─┼→ Results Aggregator
                   → Worker Agent 3 ─┘
```

### 3. Agent Capability Discovery
```
Agent A discovers capabilities of B, C, D
Agent A delegates tasks based on capabilities
```

## Performance Considerations

- **Memory Cache**: Hot data stored in-memory (max 1000 items)
- **SQLite**: Persistent storage for agents, tasks, and messages
- **WebSocket**: Real-time updates without polling
- **Heartbeat**: 30-second interval, 2-minute timeout

## Security

- **CORS**: Configurable allowed origins
- **Input Validation**: Pydantic models validate all input
- **No Authentication**: Currently open (add your own auth layer)

## Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.11+

# Verify dependencies
pip install -r requirements.txt

# Check port availability
netstat -an | grep 8000
```

### Frontend shows "Connected" but no data
```bash
# Restart backend first
# Clear browser cache
# Check browser console for errors
```

### WebSocket connection fails
```bash
# Ensure backend is running
# Check CORS configuration
# Verify proxy settings in vite.config.ts
```

## Roadmap

- [ ] Authentication and authorization
- [ ] Agent registration API
- [ ] Task queues and scheduling
- [ ] Agent groups/teams
- [ ] Message encryption
- [ ] Persistence for memory cache
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] Admin UI for system monitoring
- [ ] Agent template library

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Frontend powered by [React](https://react.dev/)
- Icons from [Lucide](https://lucide.dev/)
- Styling with [TailwindCSS](https://tailwindcss.com/)

---

For questions and support, please open an issue on GitHub.
