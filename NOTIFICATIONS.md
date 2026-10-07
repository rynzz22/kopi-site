# KKEOPI Notification System Documentation

## Current Implementation (Phase 1: Web Notifications API)

### Overview
The order tracking page now supports browser-based notifications that appear in the OS notification center when order status changes. This uses the native Web Notifications API.

### Features
- **Opt-in notifications**: Users must click the "Notif Off" button to enable notifications
- **All status updates**: Notifications are sent for all order status changes (PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED)
- **Custom messages**: Each status has a tailored notification message
- **Smart dismissal**: Non-critical notifications auto-close after 5 seconds; READY and CANCELLED require interaction
- **Vibration support**: READY status triggers vibration on mobile devices
- **Toggle control**: Users can enable/disable notifications at any time

### How It Works

1. **Permission Request**: When user clicks the notification button, the browser requests notification permission
2. **WebSocket Integration**: Existing WebSocket listeners for `order:status_updated` events now trigger notifications
3. **Polling Fallback**: The polling mechanism also triggers notifications if status changes
4. **Notification Display**: Notifications show in the OS notification center with:
   - Custom title and body text
   - KKEOPI logo as icon
   - Order ID as tag (prevents duplicates)
   - Click to focus on tracking page

### User Flow
1. User visits order tracking page with an order ID
2. User clicks "Notif Off" button in the header
3. Browser prompts for notification permission
4. User grants permission → button changes to "Notif On"
5. When order status changes, notification appears in OS notification center
6. User can toggle notifications off anytime by clicking the button again

### Browser Support
- ✅ Chrome (desktop & mobile)
- ✅ Firefox (desktop & mobile)
- ✅ Safari (desktop & mobile)
- ✅ Edge (desktop & mobile)
- ⚠️ Requires HTTPS in production (works on localhost in development)

### Limitations
- Notifications only work when the browser/tab is open (even in background)
- Won't work if browser is completely closed
- Requires user to keep the tracking page open

---

## Future Implementation (Phase 2: Web Push API)

### Overview
To enable true push notifications that work even when the browser is closed, implement the Web Push API with a push service.

### Architecture

```
Server → Push Service (VAPID) → Service Worker → User Device → OS Notification
```

### Implementation Steps

#### 1. Generate VAPID Keys
```bash
# Using web-push npm package
npm install web-push -g
web-push generate-vapid-keys
```

Store the keys in environment variables:
```
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:admin@kkeopi.com
```

#### 2. Create Service Worker
Create `public/sw.js`:
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/kkeopi_logo.jpg',
    badge: '/assets/kkeopi_logo.jpg',
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    vibrate: data.vibrate
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

Register service worker in order-status.html:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => console.log('SW registered'))
    .catch(err => console.error('SW registration failed', err));
}
```

#### 3. Subscribe Users to Push
```javascript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  // Send subscription to server
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription,
      user_id: userId,
      order_id: orderId
    })
  });
}
```

#### 4. Server-Side Push Notification
Install dependencies:
```bash
npm install web-push
```

Add to server.ts:
```typescript
import webpush from 'web-push';

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Store push subscriptions in database
const pushSubscriptions = new Map<string, any>();

app.post('/api/push/subscribe', async (req, res) => {
  const { subscription, user_id, order_id } = req.body;
  const key = `${user_id}-${order_id}`;
  pushSubscriptions.set(key, subscription);
  res.json({ success: true });
});

// Send push notification when order status changes
async function sendPushNotification(orderId: string, status: string) {
  const message = statusNotificationMessages[status];
  if (!message) return;

  // Find subscriptions for this order
  for (const [key, subscription] of pushSubscriptions) {
    if (key.endsWith(`-${orderId}`)) {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: message.title,
          body: message.body,
          tag: `order-${orderId}`,
          requireInteraction: status === 'READY' || status === 'CANCELLED',
          vibrate: status === 'READY' ? [200, 100, 200] : undefined,
          url: `/order-status.html?id=${orderId}`
        }));
      } catch (err) {
        // Remove invalid subscription
        pushSubscriptions.delete(key);
      }
    }
  }
}
```

Integrate with existing order status update:
```typescript
// In the PUT /api/orders/:id/status endpoint
const order = await db.updateOrderStatus(req.params.id, status);
if (order) {
  broadcastOrderStatus(order);
  sendPushNotification(order.id, status); // Add this
}
```

#### 5. Database Schema (Optional)
For production, store push subscriptions in database instead of memory:

```sql
CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  order_id VARCHAR(255),
  subscription JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_push_user_order ON push_subscriptions(user_id, order_id);
```

### Push Service Options

#### Option A: Web Push Protocol (Free, Self-Hosted)
- Use VAPID keys with web-push npm package
- No external service dependency
- Direct communication with browser push services
- Recommended for this project

#### Option B: Firebase Cloud Messaging (Free Tier)
- More robust infrastructure
- Better analytics and delivery tracking
- Requires Firebase project setup
- Easier for cross-platform (mobile apps later)

#### Option C: Third-Party Services (Paid)
- OneSignal, Pusher, etc.
- Rich features (segments, A/B testing, scheduling)
- Overkill for simple order notifications

### Testing Web Push
```bash
# Test VAPID configuration
curl -X POST https://updates.push.services.mozilla.com/wpush/v1/gAAAA...
```

Use browser DevTools → Application → Service Workers to test push events.

### Migration Path
1. Keep current Web Notifications API as fallback
2. Add Web Push API as enhancement
3. Detect if Service Worker is supported
4. Offer users choice: "Background Notifications" (Web Push) vs "Tab Notifications" (Web API)
5. Phase out Web API once Web Push is stable

---

## Notification Message Reference

### Current Messages (Web API)
| Status | Title | Body | Icon |
|--------|-------|------|------|
| PENDING | Order Received | Your order is in the queue at the espresso bar. | 📄 |
| CONFIRMED | Order Confirmed | Barista is preparing your cup and ingredients. | ✓ |
| PREPARING | Brewing in Progress | Your drink is being made — pulling espresso shots and texturing milk. | 🔥 |
| READY | 🎉 Your Order is READY! | Your drink is ready for pickup at the counter. | 🔔 |
| COMPLETED | Order Completed | Order picked up. Enjoy your KKEOPI cup! | ☕ |
| CANCELLED | Order Cancelled | This order was cancelled. Please check with the barista. | 🚫 |

### Web Push Extensions
Add to notification payload:
- `url`: Direct link to order tracking page
- `data.order_id`: For custom handling in service worker
- `actions`: Quick actions (e.g., "View Order", "Dismiss")

---

## Security Considerations

### Current Implementation
- ✅ No sensitive data in notifications
- ✅ User must grant permission
- ✅ Notifications only for tracked orders

### Web Push Security
- ✅ VAPID keys authenticate server
- ✅ HTTPS required in production
- ✅ Validate subscription endpoints
- ✅ Rate limit push notifications
- ✅ Sanitize notification content
- ⚠️ Store private keys securely (environment variables)
- ⚠️ Implement subscription expiration handling

---

## Performance Optimization

### Current
- ✅ Lightweight Web API
- ✅ No additional dependencies
- ✅ Minimal overhead

### Web Push
- Batch multiple notifications
- Implement exponential backoff for failed pushes
- Clean up invalid subscriptions periodically
- Use web workers for subscription management

---

## Troubleshooting

### Notifications Not Showing
1. Check browser permission settings
2. Ensure page is not in background (Web API limitation)
3. Check browser console for errors
4. Verify notification permission is 'granted' in DevTools

### Web Push Not Working
1. Verify VAPID keys are correct
2. Check service worker is registered
3. Ensure HTTPS is enabled
4. Test subscription endpoint
5. Check push service status (e.g., FCM status)

### Mobile-Specific Issues
1. iOS Safari requires user interaction before notifications
2. Android Chrome may block notifications in low-power mode
3. Test on actual devices (emulators may not support all features)

---

## File Changes Summary

### Phase 1 (Current)
- `order-status.html`: Added notification button
- `assets/order-status.js`: Added notification service, permission handling, WebSocket integration

### Phase 2 (Future)
- `public/sw.js`: New service worker file
- `server.ts`: Add web-push integration, subscription endpoints
- `package.json`: Add web-push dependency
- `.env`: Add VAPID keys
- Database: Add push_subscriptions table (optional)

---

## References
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push npm package](https://github.com/web-push-libs/web-push)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
