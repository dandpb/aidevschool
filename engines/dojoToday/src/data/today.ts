// AUTO-GERADO por learner/substrate/adapters/dojotoday.py — NÃO EDITAR À MÃO.
// Fonte: learner/learning_state.yaml + scheduler learner.substrate.scheduling.
// Regenerado em 2026-07-25.
import type { TodaySnapshot } from "../types";

export const today: TodaySnapshot = {
  "asOf": "2026-07-25",
  "streak": {
    "current": 0,
    "longest": 1,
    "freezesEquipped": 0,
    "freezesMax": 2,
    "lastGateDate": "2026-07-05"
  },
  "curr": 0.0,
  "activeUnit": {
    "id": "U2-key-value-store",
    "title": "KV WAREHOUSE: hash-map-backed CRUD with TTL expiration",
    "project": "02_key_value_store",
    "num": "02",
    "state": "evaluating",
    "gameDir": "engines/voxelDojo/game-02-warehouse",
    "diagnosticFile": "curriculum/02_key_value_store/docs/spec.md"
  },
  "reviews": [
    {
      "unitId": "U0-sonda-rate-limiter-robustness",
      "title": "GATEKEEPER: token-bucket rate limiter robustness",
      "dueIn": "overdue 16d",
      "reason": "overdue",
      "gameDir": "engines/pixelDojo",
      "project": "01_rate_limiter"
    },
    {
      "unitId": "U2-key-value-store",
      "title": "KV WAREHOUSE: hash-map-backed CRUD with TTL expiration",
      "dueIn": "today",
      "reason": "due",
      "gameDir": "engines/voxelDojo/game-02-warehouse",
      "project": "02_key_value_store"
    }
  ],
  "masteredCount": 1,
  "totalUnits": 2,
  "nextProjectNum": "02",
  "track": [
    {
      "num": "01",
      "title": "GATEKEEPER: token-bucket rate limiter robustness",
      "gameDir": "engines/pixelDojo/pixel-quest",
      "port": null,
      "status": "mastered"
    },
    {
      "num": "02",
      "title": "KV WAREHOUSE: hash-map-backed CRUD with TTL expiration",
      "gameDir": "engines/voxelDojo/game-02-warehouse",
      "port": 5202,
      "status": "active"
    },
    {
      "num": "03",
      "title": "WORMHOLE",
      "gameDir": "engines/voxelDojo/game-03-wormhole",
      "port": 5203,
      "status": "available"
    },
    {
      "num": "04",
      "title": "TASK QUEUE",
      "gameDir": "engines/pixelDojo/pixel-quest",
      "port": null,
      "status": "available"
    },
    {
      "num": "05",
      "title": "RELAY STATION",
      "gameDir": "engines/voxelDojo/game-05-relay-station",
      "port": 5205,
      "status": "available"
    },
    {
      "num": "06",
      "title": "PIPELINE PLANT",
      "gameDir": "engines/voxelDojo/game-06-pipeline-plant",
      "port": 5206,
      "status": "available"
    },
    {
      "num": "07",
      "title": "CHECKPOINT CITY",
      "gameDir": "engines/voxelDojo/game-07-checkpoint-city",
      "port": 5207,
      "status": "available"
    },
    {
      "num": "08",
      "title": "TIMELINE TOWER",
      "gameDir": "engines/voxelDojo/game-08-timeline-tower",
      "port": 5208,
      "status": "available"
    },
    {
      "num": "09",
      "title": "DOCKING BAY",
      "gameDir": "engines/voxelDojo/game-09-docking-bay",
      "port": 5209,
      "status": "available"
    },
    {
      "num": "10",
      "title": "HASH RING",
      "gameDir": "engines/voxelDojo/game-10-hash-ring",
      "port": 5177,
      "status": "available"
    },
    {
      "num": "11",
      "title": "AIR TRAFFIC",
      "gameDir": "engines/voxelDojo/game-11-air-traffic",
      "port": 5211,
      "status": "available"
    },
    {
      "num": "12",
      "title": "MISSION CONTROL",
      "gameDir": "engines/voxelDojo/game-12-mission-control",
      "port": 5212,
      "status": "available"
    },
    {
      "num": "13",
      "title": "BREAKER GRID",
      "gameDir": "engines/voxelDojo/game-13-breaker-grid",
      "port": 5213,
      "status": "available"
    },
    {
      "num": "14",
      "title": "RIVER DELTA",
      "gameDir": "engines/voxelDojo/game-14-river-delta",
      "port": 5214,
      "status": "available"
    },
    {
      "num": "15",
      "title": "OBSERVATORY",
      "gameDir": "engines/voxelDojo/game-15-observatory",
      "port": 5215,
      "status": "available"
    },
    {
      "num": "16",
      "title": "FREIGHT YARD",
      "gameDir": "engines/voxelDojo/game-16-freight-yard",
      "port": 5216,
      "status": "available"
    },
    {
      "num": "17",
      "title": "LIGHTHOUSE NETWORK",
      "gameDir": "engines/voxelDojo/game-17-lighthouse-network",
      "port": 5217,
      "status": "available"
    },
    {
      "num": "18",
      "title": "STACKS",
      "gameDir": "engines/voxelDojo/game-18-stacks",
      "port": 5218,
      "status": "available"
    }
  ]
} as TodaySnapshot;
