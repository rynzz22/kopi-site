/**
 * KKEOPI Coffee — Live Order Tracker JS
 */

document.addEventListener('DOMContentLoaded', async () => {
  const client = window.kopiClient;

  // URL Params & Current Tracking ID
  const urlParams = new URLSearchParams(window.location.search);
  let currentOrderId = urlParams.get('id');

  // DOM Elements
  const displayOrderId = document.getElementById('displayOrderId');
  const displayCustomerName = document.getElementById('displayCustomerName');
  const displayPlacedTime = document.getElementById('displayPlacedTime');
  const displayCurrentStatus = document.getElementById('displayCurrentStatus');
  const timelineProgressBar = document.getElementById('timelineProgressBar');
  const statusMessageBanner = document.getElementById('statusMessageBanner');
  const orderItemsList = document.getElementById('orderItemsList');
  const displayTotalAmount = document.getElementById('displayTotalAmount');
  const recentOrdersContainer = document.getElementById('recentOrdersContainer');
  const orderLookupForm = document.getElementById('orderLookupForm');
  const orderSearchInput = document.getElementById('orderSearchInput');

  // Stepper Elements
  const stepElements = {
    PENDING: document.getElementById('step-pending'),
    CONFIRMED: document.getElementById('step-confirmed'),
    PREPARING: document.getElementById('step-preparing'),
    READY: document.getElementById('step-ready'),
    COMPLETED: document.getElementById('step-completed'),
  };

  const statusProgressMap = {
    PENDING: { percent: '10%', message: '☕ Order received! The barista has received your ticket.', badgeClass: 'bg-warning text-dark' },
    CONFIRMED: { percent: '35%', message: '📋 Order confirmed! Your ticket is queued on the espresso bar.', badgeClass: 'bg-primary' },
    PREPARING: { percent: '65%', message: '🔥 Brewing in progress! Your beans are freshly ground and milk is steaming.', badgeClass: 'bg-info text-dark' },
    READY: { percent: '90%', message: '🎉 Your drink is READY for pickup at the counter! Enjoy!', badgeClass: 'bg-success' },
    COMPLETED: { percent: '100%', message: '✨ Order completed. Thank you for visiting KKEOPI!', badgeClass: 'bg-secondary' },
    CANCELLED: { percent: '0%', message: '❌ This order was cancelled. Please contact the barista for details.', badgeClass: 'bg-danger' },
  };

  const stepsOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

  // Subscribe to real-time WebSocket updates
  client.on('order:status_updated', (data) => {
    const updated = data.order || data;
    if (String(updated.id) === String(currentOrderId) || String(updated.order_id) === String(currentOrderId)) {
      applyOrderStatus(updated.status, updated);
      if (updated.status === 'READY') {
        client.playChime('ready');
        celebrateReady();
      } else {
        client.playChime('ping');
      }
    }
  });

  // Search handler
  orderLookupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = orderSearchInput.value.trim();
    if (query) {
      window.location.search = `?id=${encodeURIComponent(query)}`;
    }
  });

  // Load Order Details
  async function loadOrder() {
    // If no order ID in query, pick the latest from storage or fetch latest
    if (!currentOrderId) {
      try {
        const storedOrders = JSON.parse(localStorage.getItem('kkeopi_recent_orders') || '[]');
        if (storedOrders.length > 0) {
          currentOrderId = storedOrders[0].id;
        }
      } catch (e) {}
    }

    if (!currentOrderId) {
      statusMessageBanner.innerHTML = `<span class="text-secondary">Enter your Order # in the box above or place a cup from the <a href="products.html" class="text-warning text-decoration-underline">Menu</a> to start tracking.</span>`;
      return;
    }

    try {
      const res = await client.getOrder(currentOrderId);
      if (res.success && res.data) {
        renderOrder(res.data);
      } else {
        statusMessageBanner.innerHTML = `<span class="text-danger">Order #${currentOrderId} was not found. Please verify your order number.</span>`;
      }
    } catch (err) {
      statusMessageBanner.innerHTML = `<span class="text-danger">Failed to connect to order server: ${err.message}</span>`;
    }

    renderRecentOrders();
  }

  function renderOrder(order) {
    displayOrderId.textContent = `ORDER #${order.id}`;
    displayCustomerName.textContent = order.customer_name;
    const dt = new Date(order.created_at);
    displayPlacedTime.textContent = `Placed on ${dt.toLocaleDateString()} at ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    displayTotalAmount.textContent = `₱${order.total_amount}`;

    // Render Items
    orderItemsList.innerHTML = (order.items || [])
      .map(
        (it) => `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary border-opacity-10">
        <div>
          <span class="badge bg-secondary me-2">${it.quantity}x</span>
          <span class="text-light fw-medium">${escapeHtml(it.product_name)}</span>
        </div>
        <span class="text-white fw-bold">₱${it.subtotal || it.price * it.quantity}</span>
      </div>
    `
      )
      .join('');

    applyOrderStatus(order.status, order);

    // Save to local recent orders
    saveRecentOrder(order);
  }

  function applyOrderStatus(status, order) {
    const config = statusProgressMap[status] || statusProgressMap['PENDING'];

    displayCurrentStatus.textContent = status;
    displayCurrentStatus.className = `badge ${config.badgeClass} px-3 py-2 fs-6 text-uppercase`;
    timelineProgressBar.style.width = config.percent;

    statusMessageBanner.innerHTML = `
      <div class="fw-semibold text-white mb-1 fs-5">${config.message}</div>
      <div class="small text-secondary">Updated in real time: ${new Date().toLocaleTimeString()}</div>
    `;

    // Update stepper classes
    const currentIdx = stepsOrder.indexOf(status);

    stepsOrder.forEach((stepName, idx) => {
      const el = stepElements[stepName];
      if (!el) return;

      el.classList.remove('active', 'completed');

      if (status === 'CANCELLED') {
        // Cancelled state
      } else if (idx < currentIdx) {
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
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#BB8C64', '#10B981', '#FDFBF7', '#E6A23C'],
        });
      }
    } catch (e) {}
  }

  function saveRecentOrder(order) {
    try {
      let recents = JSON.parse(localStorage.getItem('kkeopi_recent_orders') || '[]');
      recents = recents.filter((o) => String(o.id) !== String(order.id));
      recents.unshift({
        id: order.id,
        total: order.total_amount,
        status: order.status,
        date: order.created_at,
        itemsSummary: (order.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', '),
      });
      localStorage.setItem('kkeopi_recent_orders', JSON.stringify(recents.slice(0, 5)));
    } catch (e) {}
  }

  async function renderRecentOrders() {
    const user = client.getCurrentUser();
    let orders = [];

    // If authenticated with Supabase, retrieve real customer orders from backend
    if (user && user.id) {
      try {
        const res = await client.getMyOrders();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          orders = res.data;
        }
      } catch (e) {
        console.warn('Could not fetch user orders:', e);
      }
    }

    if (orders.length > 0) {
      recentOrdersContainer.innerHTML = `
        <div class="mb-3 d-flex align-items-center justify-content-between">
          <span class="small text-warning"><i class="fa-solid fa-user-check me-1"></i> Orders linked to your account (${escapeHtml(user.email)})</span>
          <span class="badge bg-secondary small">${orders.length} order${orders.length > 1 ? 's' : ''}</span>
        </div>
        ${orders
          .map(
            (r) => `
          <div class="d-flex flex-wrap justify-content-between align-items-center py-2 border-bottom border-secondary border-opacity-15">
            <div>
              <span class="badge bg-warning text-dark me-2">#${r.id}</span>
              <span class="text-light small">${escapeHtml((r.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ') || 'Items')}</span>
              <div class="text-secondary small">${new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div class="d-flex align-items-center gap-2 mt-2 mt-md-0">
              <span class="text-white fw-bold">₱${r.total_amount}</span>
              <span class="badge ${r.status === 'READY' ? 'bg-success' : r.status === 'COMPLETED' ? 'bg-secondary' : 'bg-warning text-dark'} small">${r.status}</span>
              <a href="order-status.html?id=${r.id}" class="btn btn-sm btn-outline-light rounded-pill px-2 py-0">Track</a>
            </div>
          </div>
        `
          )
          .join('')}
      `;
      return;
    }

    // Fallback to local storage recent orders if not logged in
    try {
      const recents = JSON.parse(localStorage.getItem('kkeopi_recent_orders') || '[]');
      if (recents.length === 0) {
        recentOrdersContainer.innerHTML = `<p class="text-secondary small mb-0">No past orders saved on this device yet. Sign in or place an order to track.</p>`;
        return;
      }

      recentOrdersContainer.innerHTML = recents
        .map(
          (r) => `
        <div class="d-flex flex-wrap justify-content-between align-items-center py-2 border-bottom border-secondary border-opacity-15">
          <div>
            <span class="badge bg-warning text-dark me-2">#${r.id}</span>
            <span class="text-light small">${escapeHtml(r.itemsSummary || 'Items')}</span>
            <div class="text-secondary small">${new Date(r.date).toLocaleDateString()}</div>
          </div>
          <div class="d-flex align-items-center gap-2 mt-2 mt-md-0">
            <span class="text-white fw-bold">₱${r.total}</span>
            <span class="badge ${r.status === 'READY' ? 'bg-success' : r.status === 'COMPLETED' ? 'bg-secondary' : 'bg-warning text-dark'} small">${r.status}</span>
            <a href="order-status.html?id=${r.id}" class="btn btn-sm btn-outline-light rounded-pill px-2 py-0">Track</a>
          </div>
        </div>
      `
        )
        .join('');
    } catch (e) {}
  }

  client.on('auth:change', () => {
    renderRecentOrders();
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  await loadOrder();
});
