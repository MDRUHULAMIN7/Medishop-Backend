# 10 — Socket.IO (Realtime)

## 1. Purpose

Realtime order status updates and admin notifications, without the client polling the API.

## 2. Connection Flow

```
Client connects with accessToken in the socket handshake auth payload
    ↓
Socket middleware verifies the token (same verification logic as the HTTP authenticate middleware)
    ↓
On success: socket joins a private room -> user:<userId>
    ↓
If role === "admin": also joins room -> admins
    ↓
Connection established
```

Invalid/expired token → connection is rejected at the handshake, before any event handlers run.

## 3. Room Strategy

| Room | Members | Purpose |
|---|---|---|
| `user:<userId>` | that user's active connections | order status pushed only to the owning customer |
| `admins` | all connected admin/pharmacist sessions | new order alerts, new prescription-review alerts |

Rooms are used instead of broadcasting to everyone so that a customer never receives another customer's order events.

## 4. Events

| Event | Direction | Payload | Trigger |
|---|---|---|---|
| `order:created` | server → `admins` | `{ orderId, userId, total }` | new checkout completed |
| `order:confirmed` | server → `user:<userId>` | `{ orderId, status }` | admin confirms order |
| `order:packed` | server → `user:<userId>` | `{ orderId, status }` | admin marks packed |
| `order:shipped` | server → `user:<userId>` | `{ orderId, status, trackingInfo? }` | admin marks shipped |
| `order:delivered` | server → `user:<userId>` | `{ orderId, status }` | admin marks delivered |
| `prescription:submitted` | server → `admins` | `{ prescriptionId, userId }` | new prescription upload |
| `notification:new` | server → `user:<userId>` | `{ notificationId, title }` | any notification created for that user |

Event name constants live in `socket/events.ts` — modules import from there rather than hardcoding event strings.

## 5. Emission Pattern

Sockets are never emitted directly from a controller. The relevant service (e.g., `order.service.updateStatus()`) performs the database update, then calls a thin `socket/handlers/order.handler.ts` function to emit the event. This keeps Socket.IO a delivery mechanism, not a place where business logic lives.

```
order.service.updateStatus()
    ↓
  DB update (Mongo)
    ↓
  notificationService.create(...)   (persists a notification document)
    ↓
  emitOrderStatusUpdate(userId, orderId, status)   (socket handler)
```

## 6. Scaling Note

Since the API layer is stateless and may run multiple instances, Socket.IO is configured with the Redis adapter (`@socket.io/redis-adapter`) so that room membership and emitted events are shared across instances — a user connected to instance A still receives an event emitted from instance B.

## 7. Future Extension

The room/event structure is designed so a future customer-support chat feature can be added as a new module + new event namespace, without touching the order/notification event handling already in place.