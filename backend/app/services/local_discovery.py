import json
import os
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime


class LocalConfigDiscovery:
    def __init__(self):
        self.config_paths = [
            Path.home() / ".openclaw" / "openclaw.json",
            Path.home() / ".openclaw" / "config.json",
            Path("/root/.openclaw/openclaw.json"),  # Linux root
            Path("C:/Users/.openclaw/openclaw.json"),  # Windows alternative
        ]
        self._last_modified: Optional[datetime] = None
        self._cached_agents: List[Dict[str, Any]] = []

    def find_config_file(self) -> Optional[Path]:
        for path in self.config_paths:
            if path.exists() and path.is_file():
                return path
        return None

    def read_agents_from_config(self) -> List[Dict[str, Any]]:
        config_path = self.find_config_file()
        if not config_path:
            return []

        try:
            stat = config_path.stat()
            current_mtime = datetime.fromtimestamp(stat.st_mtime)

            if self._last_modified and current_mtime == self._last_modified:
                return self._cached_agents

            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            agents = self._parse_openclaw_config(config)
            self._cached_agents = agents
            self._last_modified = current_mtime

            return agents

        except (json.JSONDecodeError, IOError) as e:
            return []

    def _parse_openclaw_config(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        agents = []

        if "agents" in config:
            for agent_id, agent_config in config["agents"].items():
                agent = self._create_agent_from_config(agent_id, agent_config)
                if agent:
                    agents.append(agent)

        elif "agent_definitions" in config:
            for agent_def in config["agent_definitions"]:
                agent = self._parse_agent_definition(agent_def)
                if agent:
                    agents.append(agent)

        return agents

    def _create_agent_from_config(
        self, agent_id: str, config: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        return {
            "id": agent_id,
            "name": config.get("name", agent_id),
            "status": "idle",
            "capabilities": config.get("capabilities", []) or config.get("skills", []),
            "description": config.get("description", ""),
            "allowlist": config.get("allowlist", []),
            "metadata": {
                "source": "local_config",
                "config_path": str(self.find_config_file()),
                "raw_config": config,
            },
            "last_heartbeat": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat(),
        }

    def _parse_agent_definition(
        self, agent_def: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        agent_id = agent_def.get("id") or agent_def.get("name", "").lower().replace(
            " ", "_"
        )
        if not agent_id:
            return None

        return {
            "id": agent_id,
            "name": agent_def.get("name", agent_id),
            "status": "idle",
            "capabilities": agent_def.get("capabilities", [])
            or agent_def.get("skills", []),
            "description": agent_def.get("description", ""),
            "allowlist": agent_def.get("allowlist", []),
            "metadata": {
                "source": "local_config",
                "config_path": str(self.find_config_file()),
            },
            "last_heartbeat": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat(),
        }

    def get_discovery_info(self) -> Dict[str, Any]:
        config_path = self.find_config_file()
        return {
            "method": "local_config",
            "config_path": str(config_path) if config_path else None,
            "config_exists": config_path is not None,
            "agents_found": len(self._cached_agents),
            "last_scan": self._last_modified.isoformat()
            if self._last_modified
            else None,
        }


local_discovery = LocalConfigDiscovery()
