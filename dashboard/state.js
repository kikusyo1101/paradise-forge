window.PARADISE_STATE = {
  "generated": "2026-08-30T13:43:17.321Z",
  "pipeline": [
    {
      "id": "discover",
      "agent": "market-researcher",
      "gate": true,
      "deps": []
    },
    {
      "id": "specify",
      "agent": "requirements-analyst",
      "gate": false,
      "deps": [
        "discover"
      ]
    },
    {
      "id": "design",
      "agent": "architect",
      "gate": true,
      "deps": [
        "specify"
      ]
    },
    {
      "id": "detail",
      "agent": "architect",
      "gate": false,
      "deps": [
        "design"
      ]
    },
    {
      "id": "build",
      "agent": "architect",
      "gate": false,
      "deps": [
        "detail"
      ]
    },
    {
      "id": "tests",
      "agent": "tdd-guide",
      "gate": false,
      "deps": [
        "detail"
      ]
    },
    {
      "id": "review",
      "agent": "code-reviewer",
      "gate": false,
      "deps": [
        "build",
        "tests"
      ]
    },
    {
      "id": "security",
      "agent": "security-reviewer",
      "gate": false,
      "deps": [
        "build"
      ]
    },
    {
      "id": "verify",
      "agent": "verification-loop",
      "gate": true,
      "deps": [
        "review",
        "security"
      ]
    },
    {
      "id": "reflect",
      "agent": "self-critic",
      "gate": true,
      "deps": [
        "verify"
      ]
    },
    {
      "id": "verdict",
      "agent": "creation-judge",
      "gate": true,
      "deps": [
        "reflect"
      ]
    }
  ],
  "constitution": [
    "Spec is the source of truth — code serves the spec, not the reverse.",
    "Every phase is gated — no phase advances on unverified assumptions.",
    "Independent work runs in parallel; dependent work runs in order.",
    "Verification precedes judgment; judgment precedes shipping.",
    "Evidence-based memory — only what actually happened is remembered.",
    "No secrets in code; security is reviewed, never assumed."
  ],
  "graph": {
    "nodeCount": 21,
    "edgeCount": 21,
    "nodes": [
      {
        "id": "paradise",
        "type": "system",
        "label": "The Paradise harness",
        "degree": 5
      },
      {
        "id": "graph-engine",
        "type": "component",
        "label": "Graph orchestration engine",
        "degree": 2
      },
      {
        "id": "kg",
        "type": "component",
        "label": "Knowledge graph memory",
        "degree": 2
      },
      {
        "id": "no-db",
        "type": "decision",
        "label": "No database rule",
        "degree": 1
      },
      {
        "id": "dashboard-run",
        "type": "run",
        "label": "Paradise Live Dashboard build",
        "degree": 2
      },
      {
        "id": "dashboard",
        "type": "component",
        "label": "Paradise Live Dashboard",
        "degree": 2
      },
      {
        "id": "forge",
        "type": "system",
        "label": "The Forge \\u2014 creation pipeline",
        "degree": 5
      },
      {
        "id": "verdict-gate",
        "type": "system",
        "label": "The Gate of Judgment",
        "degree": 2
      },
      {
        "id": "constitution",
        "type": "decision",
        "label": "Paradise Constitution",
        "degree": 2
      },
      {
        "id": "pomodoro-forge",
        "type": "run",
        "label": "Forge run: pomodoro timer",
        "degree": 2
      },
      {
        "id": "pomodoro",
        "type": "creation",
        "label": "Pomodoro timer (SHIPPED)",
        "degree": 3
      },
      {
        "id": "pomodoro-verdict",
        "type": "verdict",
        "label": "Verdict: SHIP",
        "degree": 1
      },
      {
        "id": "discover-gap",
        "type": "lesson",
        "label": "調査フェーズ欠落の教訓",
        "degree": 1
      },
      {
        "id": "market-researcher",
        "type": "component",
        "label": "Market Researcher agent",
        "degree": 4
      },
      {
        "id": "article-8",
        "type": "decision",
        "label": "憲法第8条: Research precedes specification",
        "degree": 1
      },
      {
        "id": "pomodoro-v2",
        "type": "creation",
        "label": "Pomodoro 完全版 (SHIPPED)",
        "degree": 2
      },
      {
        "id": "require-customization",
        "type": "lesson",
        "label": "設定カスタマイズは必須",
        "degree": 1
      },
      {
        "id": "require-discovery",
        "type": "lesson",
        "label": "調査フェーズを飛ばすな",
        "degree": 1
      },
      {
        "id": "critic",
        "type": "component",
        "label": "Adversarial self-critic",
        "degree": 3
      },
      {
        "id": "self-critic-agent",
        "type": "component",
        "label": "self-critic agent",
        "degree": 0
      },
      {
        "id": "article-9",
        "type": "decision",
        "label": "憲法第9条: 楽園は裁かれる前に自らを疑う",
        "degree": 0
      }
    ],
    "edges": [
      {
        "from": "paradise",
        "rel": "contains",
        "to": "graph-engine"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "kg"
      },
      {
        "from": "kg",
        "rel": "follows",
        "to": "no-db"
      },
      {
        "from": "dashboard-run",
        "rel": "produced",
        "to": "dashboard"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "dashboard"
      },
      {
        "from": "dashboard-run",
        "rel": "used",
        "to": "graph-engine"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "forge"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "verdict-gate"
      },
      {
        "from": "forge",
        "rel": "obeys",
        "to": "constitution"
      },
      {
        "from": "verdict-gate",
        "rel": "enforces",
        "to": "constitution"
      },
      {
        "from": "pomodoro-forge",
        "rel": "uses",
        "to": "forge"
      },
      {
        "from": "pomodoro-forge",
        "rel": "produced",
        "to": "pomodoro"
      },
      {
        "from": "pomodoro",
        "rel": "judged-as",
        "to": "pomodoro-verdict"
      },
      {
        "from": "forge",
        "rel": "contains",
        "to": "market-researcher"
      },
      {
        "from": "market-researcher",
        "rel": "enforces",
        "to": "article-8"
      },
      {
        "from": "discover-gap",
        "rel": "fixed-by",
        "to": "market-researcher"
      },
      {
        "from": "pomodoro-v2",
        "rel": "supersedes",
        "to": "pomodoro"
      },
      {
        "from": "pomodoro-v2",
        "rel": "grounded-in",
        "to": "market-researcher"
      },
      {
        "from": "forge",
        "rel": "contains",
        "to": "critic"
      },
      {
        "from": "critic",
        "rel": "applies",
        "to": "require-customization"
      },
      {
        "from": "critic",
        "rel": "applies",
        "to": "require-discovery"
      }
    ],
    "byType": {
      "system": 3,
      "component": 6,
      "decision": 4,
      "run": 2,
      "creation": 2,
      "verdict": 1,
      "lesson": 3
    }
  },
  "lessons": [
    {
      "id": "discover-gap",
      "label": "調査フェーズ欠落の教訓",
      "check": "forgeがwish→specyと直行し思い込みspecを生んだ。discoverフェーズを恒久追加し憲法第8条化"
    },
    {
      "id": "require-customization",
      "label": "設定カスタマイズは必須",
      "check": "config"
    },
    {
      "id": "require-discovery",
      "label": "調査フェーズを飛ばすな",
      "check": "findings"
    }
  ],
  "creations": [
    {
      "name": "pomodoro",
      "files": 10,
      "verdict": "SHIP",
      "hasFindings": true
    }
  ]
};
