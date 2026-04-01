# OpenClaw Agent Management System - Specification

## 1. Project Overview

**Project Name**: OpenClaw Agent Management System  
**Project Type**: Multi-agent collaboration platform with web UI  
**Core Functionality**: A system to manage OpenClaw agents, enabling autonomous inter-agent communication via A2A (Agent-to-Agent) protocol, with real-time task monitoring dashboard.  
**Target Users**: Developers and operators managing multi-agent workflows

---

## 2. Technology Stack

### Backend
- **Framework**: Python 3.11+ with FastAPI
- **Database**: SQLite (persistent) + In-memory cache for hot data
- **A2A Protocol**: Custom implementation based on JSON-RPC 2.0
- **WebSocket**: For real-time agent status updates and task notifications

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: TailwindCSS + Radix UI components
- **State Management**: Zustand
- **Real-time**: WebSocket client for live updates

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Dashboard                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Agent List   │  │ Task Monitor │  │ Interaction Log      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                        WebSocket/HTTP
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Agent Router │  │ Task Manager │  │ A2A Protocol Handler │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ SQLite Store │  │ Memory Cache │  │ WebSocket Manager    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    A2A Protocol (Internal)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Pool                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Agent A    │◄─►│ Agent B    │◄─►│ Agent C    │◄─►│ Agent D    │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Models

### Agent
```python
{
    "id": str,              # UUID
    "name": str,            # Human-readable name
    "status": str,          # "idle" | "busy" | "offline"
    "capabilities": List[str],  # What this agent can do
    "current_task_id": Optional[str],
    "created_at": datetime,
    "last_heartbeat": datetime
}
```

### Task
```python
{
    "id": str,              # UUID
    "type": str,            # "standalone" | "collaborative"
    "status": str,          # "pending" | "running" | "completed" | "failed"
    "assigned_agents": List[str],  # Agent IDs
    "parent_task_id": Optional[str],  # For collaborative tasks
    "result": Optional[dict],
    "error": Optional[str],
    "created_at": datetime,
    "started_at": Optional[datetime],
    "completed_at": Optional[datetime]
}
```

### A2A Message
```python
{
    "id": str,              # Message ID
    "from_agent_id": str,
    "to_agent_id": str,
    "action": str,          # "request" | "response" | "notify"
    "method": str,          # Method name being called
    "params": dict,
    "result": Optional[dict],
    "error": Optional[str],
    "timestamp": datetime
}
```

---

## 5. A2A Protocol Specification

### Message Types

1. **Agent Discovery**: Agents can query available agents and their capabilities
2. **Task Delegation**: One agent can delegate tasks to another agent
3. **Capability Invocation**: Direct method calls between agents
4. **Status Updates**: Agents report their status changes

### Protocol Flow

```
Agent A                      Agent B
   │                            │
   │──── capabilities.request ─►│
   │◄─── capabilities.response ─│
   │                            │
   │──── task.delegate ────────►│
   │◄─── task.ack ───────────────│
   │                            │
   │──── task.progress ─────────►│ (optional)
   │◄─── task.result ───────────│
```

### Supported Methods
- `agent.list` - List all agents
- `agent.capabilities` - Get agent capabilities
- `agent.status` - Get agent status
- `task.create` - Create new task
- `task.delegate` - Delegate task to another agent
- `task.status` - Get task status
- `task.result` - Get task result

---

## 6. Backend API Endpoints

### Agent Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/{id}` | Get agent details |
| POST | `/api/agents` | Register new agent |
| DELETE | `/api/agents/{id}` | Remove agent |
| POST | `/api/agents/{id}/heartbeat` | Agent heartbeat |

### Task Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/{id}` | Get task details |
| POST | `/api/tasks` | Create new task |
| DELETE | `/api/tasks/{id}` | Cancel task |
| GET | `/api/tasks/running` | Get currently running tasks |

### A2A Protocol
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/a2a/send` | Send A2A message |
| GET | `/api/a2a/messages/{agent_id}` | Get messages for agent |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://host/ws` | Real-time updates for agents and tasks |

---

## 7. Frontend Features

### Dashboard (Main View)
- **Agent Grid**: Cards showing all registered agents with status indicators
- **Running Tasks Panel**: Real-time list of tasks currently being executed
- **Activity Log**: Scrolling log of A2A communications and task events
- **Quick Actions**: Buttons to create tasks, trigger agent interactions

### Agent Card
- Agent name and ID
- Status badge (idle/busy/offline)
- Current task indicator (if busy)
- Last heartbeat timestamp
- Capability tags

### Task Item
- Task ID and type
- Status badge with progress
- Assigned agents
- Created/completed timestamps
- Error message (if failed)

### Interaction Panel
- Select source and target agents
- Choose action (delegate task, query capabilities, etc.)
- View request/response JSON
- Send button with loading state

---

## 8. Core Features

### F1: Agent Registration
- Agents register themselves on startup
- Provide name, capabilities, and metadata
- Receive unique agent ID

### F2: Agent Heartbeat
- Agents send periodic heartbeats (every 30s)
- If no heartbeat for 2 minutes, agent marked offline
- Heartbeat includes current status

### F3: Task Creation
- Users can create standalone tasks
- Specify task type, parameters
- Task automatically assigned to available agents

### F4: Task Delegation (A2A)
- Agents can delegate tasks to other agents
- Original agent tracks delegated task progress
- Results flow back to delegator

### F5: Collaborative Tasks
- Multiple agents work on same task
- Each sub-task assigned to different agent
- Main task completes when all sub-tasks done

### F6: Real-time Updates
- WebSocket pushes agent status changes
- Task status updates in real-time
- Activity log auto-scrolls

---

## 9. Project Structure

```
agentmgt/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Configuration
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── agent.py
│   │   │   ├── task.py
│   │   │   └── message.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── agents.py
│   │   │   ├── tasks.py
│   │   │   └── a2a.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── agent_service.py
│   │   │   ├── task_service.py
│   │   │   └── a2a_service.py
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   ├── sqlite_store.py
│   │   │   └── memory_cache.py
│   │   └── websocket/
│   │       ├── __init__.py
│   │       └── manager.py
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentCard.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── ActivityLog.tsx
│   │   │   ├── InteractionPanel.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── hooks/
│   │   │   ├── useAgents.ts
│   │   │   ├── useTasks.ts
│   │   │   └── useWebSocket.ts
│   │   ├── stores/
│   │   │   └── appStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── SPEC.md
```

---

## 10. Acceptance Criteria

### AC1: Agent Management
- [ ] Can register a new agent with name and capabilities
- [ ] Can view list of all agents with status
- [ ] Agent status updates automatically (online/offline)
- [ ] Can remove an agent

### AC2: Task Management
- [ ] Can create a new task
- [ ] Can view all tasks with filtering by status
- [ ] Can see task details including assigned agents
- [ ] Running tasks show real-time progress

### AC3: A2A Communication
- [ ] Can send message from one agent to another
- [ ] Agent can delegate task to another agent
- [ ] Response received and displayed
- [ ] Messages logged in activity panel

### AC4: WebSocket Updates
- [ ] Dashboard updates in real-time
- [ ] Agent status changes reflected immediately
- [ ] New tasks appear without refresh
- [ ] Activity log shows new entries automatically

### AC5: Autonomous Interaction
- [ ] Agents can discover other agents' capabilities
- [ ] Agents can autonomously decide to delegate tasks
- [ ] System supports collaborative task execution

---

## 11. Non-Functional Requirements

- **Response Time**: API responses < 100ms
- **WebSocket Latency**: Updates delivered < 500ms
- **Concurrent Agents**: Support at least 50 simultaneous agents
- **Memory**: In-memory cache limited to 1000 recent items
