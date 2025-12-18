# Health Status Dashboard Approaches

**Last Updated**: 2025-12-17

## Overview

Multiple approaches for displaying server, database, and application health status on the dashboard. Each has different tradeoffs in complexity, accuracy, and user experience.

---

## Approach 1: Simple API Health Endpoint (Recommended for MVP)

### Description
Create a single `/api/health` endpoint that checks all critical systems and returns a status object.

### Implementation
- **API Route**: `GET /api/health`
- **Checks**:
  - Database connectivity (Prisma query)
  - Configuration files existence
  - Server uptime/response time
- **Response**: JSON with status for each component

### Pros
- ✅ Simple to implement
- ✅ Fast response time
- ✅ Works client-side with React Query
- ✅ Can be polled every 30-60 seconds

### Cons
- ❌ Doesn't check PM2 directly (only server response)
- ❌ Limited to what's accessible from Next.js context

### UI Display
```
┌─────────────────────────────────────┐
│ System Health                       │
├─────────────────────────────────────┤
│ 🟢 Server      Online              │
│ 🟢 Database    Connected            │
│ 🟡 Config      Missing credo.yaml  │
│ 🟢 API         Responding           │
└─────────────────────────────────────┘
```

---

## Approach 2: Comprehensive Health Check with PM2 Integration

### Description
Extend Approach 1 to include PM2 status by calling PM2's API or checking process status.

### Implementation
- **API Route**: `GET /api/health`
- **Additional Checks**:
  - PM2 process status (via `pm2 list` or PM2 API)
  - PM2 uptime and restart count
  - Memory/CPU usage
  - Recent errors in PM2 logs
- **Response**: Extended status object with PM2 details

### Pros
- ✅ More comprehensive monitoring
- ✅ Shows process manager status
- ✅ Can detect auto-restart issues

### Cons
- ❌ Requires PM2 API access or shell commands
- ❌ More complex implementation
- ❌ May need special permissions

### UI Display
```
┌─────────────────────────────────────┐
│ System Health                       │
├─────────────────────────────────────┤
│ 🟢 Server      Online (7h 23m)      │
│ 🟢 Database    Connected           │
│ 🟢 PM2         Running (0 restarts)│
│ 🟡 Config      Missing credo.yaml  │
│ 🟢 API         Responding           │
│                                    │
│ Memory: 71.5 MB                    │
│ Uptime: 7h 23m                     │
└─────────────────────────────────────┘
```

---

## Approach 3: Real-time Status with WebSocket/SSE

### Description
Use Server-Sent Events (SSE) or WebSocket to push health updates in real-time.

### Implementation
- **API Route**: `GET /api/health/stream` (SSE)
- **Updates**: Push status every 5-10 seconds
- **Client**: Subscribe with EventSource

### Pros
- ✅ Real-time updates without polling
- ✅ Lower latency for status changes
- ✅ Better UX for monitoring

### Cons
- ❌ More complex (SSE/WebSocket setup)
- ❌ Higher server resource usage
- ❌ Overkill for simple health checks

### UI Display
Same as Approach 1/2, but updates automatically without page refresh.

---

## Approach 4: Health Status Card Component

### Description
Create a dedicated `HealthStatusCard` component that displays all health metrics in a visually appealing card.

### Implementation
- **Component**: `src/components/ui/HealthStatusCard.tsx`
- **Hook**: `useHealthStatus()` - React Query hook
- **Polling**: Every 30-60 seconds
- **Visual**: Color-coded status indicators (green/yellow/red)

### Pros
- ✅ Reusable component
- ✅ Clean separation of concerns
- ✅ Easy to style and customize
- ✅ Can be placed anywhere in the app

### Cons
- ❌ Requires API endpoint (Approach 1 or 2)
- ❌ Adds one more component to maintain

### UI Display
```
┌─────────────────────────────────────┐
│ ⚡ System Health                    │
├─────────────────────────────────────┤
│                                     │
│  🟢 Server                          │
│     Online • 7h 23m uptime         │
│                                     │
│  🟢 Database                        │
│     Connected • 42ms response      │
│                                     │
│  🟡 Configuration                   │
│     Missing credo.yaml             │
│     [Fix] →                         │
│                                     │
│  🟢 API Endpoints                   │
│     All responding                  │
│                                     │
│  Last checked: 30s ago             │
│  [Refresh]                          │
└─────────────────────────────────────┘
```

---

## Approach 5: Minimal Status Badge (Simplest)

### Description
Add a small status indicator in the header/navbar showing overall health.

### Implementation
- **Component**: Small badge/indicator
- **Status**: Single overall health (green/yellow/red)
- **Details**: Tooltip or expandable panel on hover/click

### Pros
- ✅ Minimal UI impact
- ✅ Always visible
- ✅ Quick to implement

### Cons
- ❌ Less detailed information
- ❌ Requires clicking to see details

### UI Display
```
Header: [Thomas Writing Assistant]  🟢 Healthy  [Settings]
                                    ↑
                              Click for details
```

---

## Recommended Implementation Plan

### Phase 1: MVP (Approach 1 + 4)
1. Create `/api/health` endpoint
2. Create `HealthStatusCard` component
3. Add to dashboard sidebar
4. Poll every 60 seconds

### Phase 2: Enhanced (Approach 2)
1. Add PM2 status checking
2. Add memory/uptime metrics
3. Add error log checking

### Phase 3: Optional (Approach 3)
1. Add SSE for real-time updates
2. Add notifications for status changes

---

## API Endpoint Structure

```typescript
// GET /api/health
{
  status: "healthy" | "degraded" | "unhealthy",
  timestamp: "2025-12-17T10:30:45Z",
  checks: {
    server: {
      status: "healthy",
      uptime?: number,
      responseTime?: number
    },
    database: {
      status: "healthy",
      responseTime?: number,
      connected: boolean
    },
    pm2: {
      status: "healthy",
      processId?: number,
      uptime?: number,
      restarts?: number,
      memory?: number
    },
    config: {
      status: "degraded",
      styleGuide: { loaded: boolean, isEmpty: boolean },
      credo: { loaded: boolean, isEmpty: boolean },
      constraints: { loaded: boolean, isEmpty: boolean },
      issues: string[]
    },
    api: {
      status: "healthy",
      endpoints: {
        "/api/concepts": "healthy",
        "/api/links": "healthy",
        // ...
      }
    }
  },
  issues: [
    "Configuration file credo.yaml is missing"
  ]
}
```

---

## Component Structure

```tsx
// HealthStatusCard.tsx
export function HealthStatusCard() {
  const { data, isLoading } = useHealthStatus();
  
  return (
    <div className="health-status-card">
      <StatusIndicator status={data?.status} />
      <HealthChecks checks={data?.checks} />
      <IssuesList issues={data?.issues} />
    </div>
  );
}
```

---

## Tradeoffs Summary

| Approach | Complexity | Accuracy | UX | Performance |
|----------|-----------|----------|-----|-------------|
| 1. Simple API | Low | Medium | Good | Excellent |
| 2. PM2 Integration | Medium | High | Excellent | Good |
| 3. Real-time | High | High | Excellent | Medium |
| 4. Card Component | Low | Medium | Excellent | Excellent |
| 5. Minimal Badge | Very Low | Low | Good | Excellent |

**Recommendation**: Start with Approach 1 + 4 (Simple API + Card Component), then enhance with Approach 2 (PM2 Integration) if needed.
