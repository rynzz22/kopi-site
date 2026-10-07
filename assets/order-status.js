/**
 * KKEOPI Coffee — Minimalist Live Order Tracker
 * Real-time Supabase + BroadcastChannel + WebSocket status synchronization
 */

document.addEventListener('DOMContentLoaded', async () => {
  const client = window.kopiClient;

  const urlParams = new URLSearchParams(window.location.search);
  let currentOrderId = urlParams.get('id');
  let currentOrderData = null;
  let audioEnabled = true;
  let notificationsEnabled = false;
  let notificationPermission = 'default';
  let elapsedInterval = null;

  // DOM Elements
  const displayOrderId = document.getElementById('displayOrderId');
  const displayCustomerName = document.getElementById('displayCustomerName');
  const displayPlacedTime = document.getElementById('displayPlacedTime');
  const displayCurrentStatus = document.getElementById('displayCurrentStatus');
  const displayElapsedTimer = document.getElementById('displayElapsedTimer');
  const timelineProgressBar = document.getElementById('timelineProgressBar');
  const statusMessageBanner = document.getElementById('statusMessageBanner');
  const orderItemsList = document.getElementById('orderItemsList');
  const displayOrderNotes = document.getElementById('displayOrderNotes');
  const displayTotalAmount = document.getElementById('displayTotalAmount');
  const orderLookupForm = document.getElementById('orderLookupForm');
  const orderSearchInput = document.getElementById('orderSearchInput');
  const liveSyncTimestamp = document.getElementById('liveSyncTimestamp');
  const trackerAudioBtn = document.getElementById('trackerAudioBtn');
  const trackerAudioLabel = document.getElementById('trackerAudioLabel');
  const copyTrackLinkBtn = document.getElementById('copyTrackLinkBtn');
  const copyLinkText = document.getElementById('copyLinkText');
  const printTicketBtn = document.getElementById('printTicketBtn');
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationLabel = document.getElementById('notificationLabel');

  const stepElements = {
    PENDING: document.getElementById('step-pending'),
    CONFIRMED: document.getElementById('step-confirmed'),
    PREPARING: document.getElementById('step-preparing'),
    READY: document.getElementById('step-ready'),
    COMPLETED: document.getElementById('step-completed'),
  };

  const statusProgressMap = {
    PENDING: {
      percent: '8%',
      message: 'Order received. Queued at the espresso bar.',
      eta: 'Est. ~5 min',
      color: '#C6976E',
    },
    CONFIRMED: {
      percent: '32%',
      message: 'Order confirmed by barista. Preparing cup & ingredients.',
      eta: 'Est. ~4 min',
      color: '#C6976E',
    },
    PREPARING: {
      percent: '62%',
      message: 'Brewing in progress — pulling espresso shots and texturing milk.',
      eta: 'Est. ~2 min',
      color: '#F59E0B',
    },
    READY: {
      percent: '88%',
      message: 'Your drink is ready for pickup at the counter.',
      eta: 'Ready now',
      color: '#10B981',
    },
    COMPLETED: {
      percent: '100%',
      message: 'Order picked up and completed. Enjoy your KKEOPI cup!',
      eta: 'Completed',
      color: '#A6998A',
    },
    CANCELLED: {
      percent: '0%',
      message: 'This order was cancelled. Please check with the barista.',
      eta: 'Cancelled',
      color: '#EF4444',
    },
  };

  const stepsOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Notification Service
  const statusNotificationMessages = {
    PENDING: {
      title: 'Order Received',
      body: 'Your order is in the queue at the espresso bar.',
      icon: 'fa-regular fa-file-lines'
    },
    CONFIRMED: {
      title: 'Order Confirmed',
      body: 'Barista is preparing your cup and ingredients.',
      icon: 'fa-solid fa-check'
    },
    PREPARING: {
      title: 'Brewing in Progress',
      body: 'Your drink is being made — pulling espresso shots and texturing milk.',
      icon: 'fa-solid fa-fire-burner'
    },
    READY: {
      title: '🎉 Your Order is READY!',
      body: 'Your drink is ready for pickup at the counter.',
      icon: 'fa-solid fa-bell-concierge'
    },
    COMPLETED: {
      title: 'Order Completed',
      body: 'Order picked up. Enjoy your KKEOPI cup!',
      icon: 'fa-solid fa-mug-hot'
    },
    CANCELLED: {
      title: 'Order Cancelled',
      body: 'This order was cancelled. Please check with the barista.',
      icon: 'fa-solid fa-ban'
    }
  };

  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      notificationsEnabled = true;
      updateNotificationButton();
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      notificationPermission = permission;
      if (permission === 'granted') {
        notificationsEnabled = true;
        updateNotificationButton();
        return true;
      }
    }

    notificationsEnabled = false;
    updateNotificationButton();
    return false;
  }

  function showOrderStatusNotification(status, orderId) {
    if (!notificationsEnabled || Notification.permission !== 'granted') {
      return;
    }

    const message = statusNotificationMessages[status];
    if (!message) return;

    const notification = new Notification(message.title, {
      body: message.body,
      icon: '/assets/kkeopi_logo.jpg',
      badge: '/assets/kkeopi_logo.jpg',
      tag: `order-${orderId}`,
      requireInteraction: status === 'READY' || status === 'CANCELLED',
      vibrate: status === 'READY' ? [200, 100, 200] : undefined
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close non-critical notifications after 5 seconds
    if (status !== 'READY' && status !== 'CANCELLED') {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  function updateNotificationButton() {
    if (!notificationBtn || !notificationLabel) return;

    if (notificationsEnabled && Notification.permission === 'granted') {
      notificationLabel.textContent = 'Notif On';
      notificationBtn.style.opacity = '1';
      notificationBtn.style.background = 'var(--accent-kopi)';
      notificationBtn.style.color = '#120D0A';
    } else if (Notification.permission === 'denied') {
      notificationLabel.textContent = 'Blocked';
      notificationBtn.style.opacity = '0.6';
      notificationBtn.style.background = 'var(--bg-elevated)';
      notificationBtn.style.color = 'var(--text-primary)';
    } else {
      notificationLabel.textContent = 'Notif Off';
      notificationBtn.style.opacity = '0.6';
      notificationBtn.style.background = 'var(--bg-elevated)';
      notificationBtn.style.color = 'var(--text-primary)';
    }
  }

  // Check initial notification permission
  if ('Notification' in window) {
    notificationPermission = Notification.permission;
    if (notificationPermission === 'granted') {
      notificationsEnabled = true;
    }
    updateNotificationButton();
  }

  // Notification button click handler
  if (notificationBtn) {
    notificationBtn.addEventListener('click', async () => {
      if (notificationsEnabled) {
        notificationsEnabled = false;
        updateNotificationButton();
      } else {
        await requestNotificationPermission();
      }
    });
  }

  // Audio alert toggle
  if (trackerAudioBtn) {
    trackerAudioBtn.addEventListener('click', () => {
      audioEnabled = !audioEnabled;
      if (trackerAudioLabel) {
        trackerAudioLabel.textContent = audioEnabled ? 'Alert On' : 'Muted';
      }
      trackerAudioBtn.style.opacity = audioEnabled ? '1' : '0.6';
      if (audioEnabled && client?.playChime) {
        client.playChime('ping');
      }
    });
  }

  // Copy link button
  if (copyTrackLinkBtn) {
    copyTrackLinkBtn.addEventListener('click', async () => {
      try {
        const shareUrl = currentOrderId
          ? `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(currentOrderId)}`
          : window.location.href;
        await navigator.clipboard.writeText(shareUrl);
        if (copyLinkText) copyLinkText.textContent = 'Copied';
        setTimeout(() => {
          if (copyLinkText) copyLinkText.textContent = 'Copy Link';
        }, 1800);
      } catch {
        // Ignore clipboard restrictions
      }
    });
  }

  // Print receipt button
  if (printTicketBtn) {
    printTicketBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Live Elapsed Timer
  function updateElapsedDisplay() {
    if (!displayElapsedTimer || !currentOrderData || !currentOrderData.created_at) return;
    if (currentOrderData.status === 'COMPLETED' || currentOrderData.status === 'CANCELLED') {
      displayElapsedTimer.textContent = currentOrderData.status === 'COMPLETED' ? 'Fulfilled' : 'Closed';
      return;
    }
    const createdMs = new Date(currentOrderData.created_at).getTime();
    if (isNaN(createdMs)) return;
    const diffSec = Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      displayElapsedTimer.textContent = `${hrs}h ${mins % 60}m elapsed`;
    } else {
      displayElapsedTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} elapsed`;
    }
  }

  function startElapsedTimer() {
    if (elapsedInterval) clearInterval(elapsedInterval);
    updateElapsedDisplay();
    elapsedInterval = setInterval(updateElapsedDisplay, 1000);
  }

  // Subscribe to real-time updates
  if (client) {
    client.on('order:status_updated', (data) => {
      const updated = data.order || data;
      const targetId = updated.id || updated.order_id;
      if (String(targetId) === String(currentOrderId)) {
        if (currentOrderData) {
          currentOrderData.status = updated.status;
        }
        applyOrderStatus(updated.status, updated);
        showOrderStatusNotification(updated.status, currentOrderId);
        if (audioEnabled && client.playChime) {
          if (updated.status === 'READY') {
            client.playChime('ready');
            celebrateReady();
          } else {
            client.playChime('ping');
          }
        }
      }
    });

    let lastKnownStatus = null;
    client.on('poll:tick', async () => {
      if (!currentOrderId) return;
      try {
        const res = await client.getOrder(currentOrderId);
        if (res && res.success && res.data) {
          const order = res.data;
          if (lastKnownStatus && order.status !== lastKnownStatus) {
            currentOrderData = order;
            applyOrderStatus(order.status, order);
            showOrderStatusNotification(order.status, currentOrderId);
            if (audioEnabled && client.playChime) {
              if (order.status === 'READY') {
                client.playChime('ready');
                celebrateReady();
              } else {
                client.playChime('ping');
              }
            }
          }
          lastKnownStatus = order.status;
        }
      } catch {
        // Ignore poll error
      }
    });
  }

  // Search form submit
  if (orderLookupForm) {
    orderLookupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawQuery = orderSearchInput.value.trim().replace(/^#/, '');
      if (rawQuery) {
        currentOrderId = rawQuery;
        const newUrl = `${window.location.pathname}?id=${encodeURIComponent(rawQuery)}`;
        window.history.replaceState({}, '', newUrl);
        await loadOrder();
      }
    });
  }

  async function loadOrder() {
    // Only load an order explicitly selected by link or order-number lookup.
    if (!currentOrderId) {
      statusMessageBanner.innerHTML = `
        <span>No order selected yet. Place an order on the <a href="products.html" style="color: var(--accent-kopi);">Menu</a> or enter your Order # above.</span>
      `;
      return;
    }

    if (orderSearchInput) {
      orderSearchInput.value = currentOrderId;
    }

    try {
      const res = await client.getOrder(currentOrderId);
      if (res && res.success && res.data) {
        renderOrder(res.data);
      } else {
        statusMessageBanner.innerHTML = `<span style="color: #EF4444;">Order #${escapeHtml(currentOrderId)} was not found.</span>`;
      }
    } catch (err) {
      statusMessageBanner.innerHTML = `<span style="color: #EF4444;">Unable to load Order #${escapeHtml(currentOrderId)}: ${escapeHtml(err.message)}</span>`;
    }

  }

  function renderOrder(order) {
    currentOrderData = order;
    displayOrderId.textContent = `#${order.id}`;
    displayCustomerName.textContent = order.customer_name || 'Guest Customer';

    const dt = new Date(order.created_at);
    const timeFormatted = isNaN(dt.getTime())
      ? '--:--'
      : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = isNaN(dt.getTime()) ? '' : dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
    displayPlacedTime.textContent = `${dateFormatted} · ${timeFormatted}`;

    displayTotalAmount.textContent = `₱${Number(order.total_amount || 0).toFixed(2)}`;

    // Render Items
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) {
      orderItemsList.innerHTML = `<div class="text-secondary" style="font-size: 0.76rem;">No items recorded.</div>`;
    } else {
      orderItemsList.innerHTML = items
        .map(
          (it) => `
          <div class="item-row-compact">
            <div style="padding-right: 8px;">
              <span class="item-qty">${it.quantity}×</span>
              <span>${escapeHtml(it.product_name)}</span>
            </div>
            <span class="mono-num">₱${Number(it.subtotal || it.price * it.quantity).toFixed(2)}</span>
          </div>
        `
        )
        .join('');
    }

    // Order Notes
    if (displayOrderNotes) {
      if (order.notes && String(order.notes).trim()) {
        displayOrderNotes.textContent = order.notes;
        displayOrderNotes.classList.remove('d-none');
      } else {
        displayOrderNotes.classList.add('d-none');
      }
    }

    applyOrderStatus(order.status, order);
    startElapsedTimer();
  }

  function applyOrderStatus(status, order) {
    const config = statusProgressMap[status] || statusProgressMap.PENDING;

    displayCurrentStatus.style.color = config.color;
    displayCurrentStatus.innerHTML = `
      <span class="status-dot"></span>
      <span>${escapeHtml(status)}</span>
    `;

    timelineProgressBar.style.width = config.percent;
    timelineProgressBar.style.background = status === 'READY' ? '#10B981' : '#C6976E';

    statusMessageBanner.style.borderLeftColor = config.color;
    statusMessageBanner.innerHTML = `
      <span>${escapeHtml(config.message)}</span>
      <span class="mono-num" style="font-size: 0.72rem; color: ${config.color}; white-space: nowrap;">${escapeHtml(config.eta)}</span>
    `;

    if (liveSyncTimestamp) {
      liveSyncTimestamp.textContent = `Synced ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }

    const currentIdx = stepsOrder.indexOf(status);
    stepsOrder.forEach((stepName, idx) => {
      const el = stepElements[stepName];
      if (!el) return;
      el.classList.remove('active', 'completed');
      if (status === 'CANCELLED') return;
      if (idx < currentIdx) {
        el.classList.add('completed');
      } else if (idx === currentIdx) {
        el.classList.add('active');
      }
    });
  }

  function celebrateReady() {
    try {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.65 },
          colors: ['#C6976E', '#10B981', '#F5EFE6'],
        });
      }
    } catch {
      // Ignore
    }
  }

  await loadOrder();
});
