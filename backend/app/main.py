from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import uuid
from datetime import datetime

from app.config import settings
from app.storage.sqlite_store import sqlite_store
from app.storage.memory_cache import memory_cache
from app.websocket.manager import ws_manager
from app.routers import agents, tasks, a2a, discovery, auth
from app.services.discovery_service import discovery_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await sqlite_store.init_db()
    await discovery_service.start_auto_discovery()
    yield
    await discovery_service.stop_auto_discovery()
    await sqlite_store.close()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(tasks.router)
app.include_router(a2a.router)
app.include_router(discovery.router)
app.include_router(auth.router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "app_name": settings.APP_NAME
    }


@app.get("/api/activity")
async def get_activity(limit: int = Query(default=100, le=1000)):
    return await memory_cache.get_activity_log(limit)


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str = Query(default=None)
):
    if not client_id:
        client_id = str(uuid.uuid4())
    
    await ws_manager.connect(client_id, websocket)
    
    await websocket.send_json({
        "type": "connected",
        "client_id": client_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
                elif message.get("type") == "subscribe":
                    await websocket.send_json({
                        "type": "subscribed",
                        "channels": message.get("channels", []),
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
    except WebSocketDisconnect:
        await ws_manager.disconnect(client_id)
        await ws_manager.broadcast_activity("client_disconnected", {
            "client_id": client_id
        })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
