/**
 * KKEOPI Coffee — Minimalist Dirty-White Admin Console & Live KDS Board
 * Directly connected to Supabase PostgreSQL + Realtime + BroadcastChannel
 */

document.addEventListener('DOMContentLoaded', async () => {
  const client = window.kopiClient;

  // Local state
  let allOrders = [];
  let allProducts = [];
  let activeFilter = 'ALL';
  let activeViewMode = 'TABLE'; // 'TABLE' or 'KDS'
  let orderSearchQuery = '';
  let productCategoryFilter = '';
  let productSearchQuery = '';
  let soundEnabled = true;

  // Bootstrap Modals
  const addProductModalEl = document.getElementById('addProductModal');
  const editProductModalEl = document.getElementById('editProductModal');
  const orderTicketModalEl = document.getElementById('orderTicketModal');
  const addProductModal = addProductModalEl ? new bootstrap.Modal(addProductModalEl) : null;
  const editProductModal = editProductModalEl ? new bootstrap.Modal(editProductModalEl) : null;
  const orderTicketModal = orderTicketModalEl ? new bootstrap.Modal(orderTicketModalEl) : null;

  // Toast
  const toastEl = document.getElementById('liveOrderToast');
  const toastMsgEl = document.getElementById('toastMessage');
  const liveToast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3800 }) : null;

  function notifyToast(msg) {
    if (toastMsgEl && liveToast) {
      toastMsgEl.textContent = msg;
      liveToast.show();
    }
  }

  // DOM Elements - Navigation & Status
  const navOrdersBadge = document.getElementById('navOrdersBadge');
  const navProductsBadge = document.getElementById('navProductsBadge');
  const wsLiveIndicator = document.getElementById('wsLiveIndicator');
  const wsStatusText = document.getElementById('wsStatusText');
  const soundToggleBtn = document.getElementById('soundToggleBtn');

  // DOM Elements - Dashboard Stats
  const statTodayOrders = document.getElementById('statTodayOrders');
  const statPendingOrders = document.getElementById('statPendingOrders');
  const statPreparingOrders = document.getElementById('statPreparingOrders');
  const statTodaySales = document.getElementById('statTodaySales');

  // DOM Elements - Orders View
  const orderFilters = document.getElementById('orderFilters');
  const viewModeTableBtn = document.getElementById('viewModeTableBtn');
  const viewModeKdsBtn = document.getElementById('viewModeKdsBtn');
  const orderSearchInput = document.getElementById('orderSearchInput');
  const exportOrdersCsvBtn = document.getElementById('exportOrdersCsvBtn');
  const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
  const retryOrdersBtn = document.getElementById('retryOrdersBtn');
  const ordersLoading = document.getElementById('ordersLoading');
  const ordersError = document.getElementById('ordersError');
  const ordersErrorDetail = document.getElementById('ordersErrorDetail');
  const ordersEmpty = document.getElementById('ordersEmpty');
  const ordersFilterEmpty = document.getElementById('ordersFilterEmpty');
  const ordersFilterEmptyText = document.getElementById('ordersFilterEmptyText');
  const ordersTableWrapper = document.getElementById('ordersTableWrapper');
  const ordersTableBody = document.getElementById('ordersTableBody');
  const ordersKdsWrapper = document.getElementById('ordersKdsWrapper');
  const kdsColPending = document.getElementById('kdsColPending');
  const kdsColPreparing = document.getElementById('kdsColPreparing');
  const kdsColReady = document.getElementById('kdsColReady');
  const kdsCountPending = document.getElementById('kdsCountPending');
  const kdsCountPreparing = document.getElementById('kdsCountPreparing');
  const kdsCountReady = document.getElementById('kdsCountReady');

  // DOM Elements - Ticket Modal
  const thermalTicketContent = document.getElementById('thermalTicketContent');
  const printModalTicketBtn = document.getElementById('printModalTicketBtn');

  // DOM Elements - Products View
  const openAddProductModalBtn = document.getElementById('openAddProductModalBtn');
  const emptyAddProductBtn = document.getElementById('emptyAddProductBtn');
  const productCategoryFilterEl = document.getElementById('productCategoryFilter');
  const productSearchInput = document.getElementById('productSearchInput');
  const refreshProductsBtn = document.getElementById('refreshProductsBtn');
  const retryProductsBtn = document.getElementById('retryProductsBtn');
  const productsLoading = document.getElementById('productsLoading');
  const productsError = document.getElementById('productsError');
  const productsErrorDetail = document.getElementById('productsErrorDetail');
  const productsEmpty = document.getElementById('productsEmpty');
  const productsTableWrapper = document.getElementById('productsTableWrapper');
  const productsTableBody = document.getElementById('productsTableBody');

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function formatRelativeElapsed(isoStr) {
    if (!isoStr) return '';
    try {
      const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000));
      if (diffSec < 60) return `${diffSec}s ago`;
      const mins = Math.floor(diffSec / 60);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    } catch {
      return '';
    }
  }

  // Keyboard shortcut: press '/' to focus search input
  document.addEventListener('keydown', (e) => {
    if (
      e.key === '/' &&
      document.activeElement &&
      !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
    ) {
      e.preventDefault();
      if (orderSearchInput) orderSearchInput.focus();
    }
  });

  // --- AUDIO ALERT TOGGLE ---
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundToggleBtn.innerHTML = soundEnabled
        ? '<i class="fa-solid fa-volume-high"></i> <span class="d-none d-md-inline">Chime: ON</span>'
        : '<i class="fa-solid fa-volume-xmark"></i> <span class="d-none d-md-inline">Muted</span>';
      if (soundEnabled && client?.playChime) {
        client.playChime('ping');
      }
    });
  }

  // --- VIEW MODE SWITCHER (TABLE vs KDS BOARD) ---
  if (viewModeTableBtn && viewModeKdsBtn) {
    viewModeTableBtn.addEventListener('click', () => {
      activeViewMode = 'TABLE';
      viewModeTableBtn.classList.add('active');
      viewModeKdsBtn.classList.remove('active');
      renderOrders();
    });

    viewModeKdsBtn.addEventListener('click', () => {
      activeViewMode = 'KDS';
      viewModeKdsBtn.classList.add('active');
      viewModeTableBtn.classList.remove('active');
      renderOrders();
    });
  }

  // --- CSV EXPORT ---
  if (exportOrdersCsvBtn) {
    exportOrdersCsvBtn.addEventListener('click', () => {
      if (allOrders.length === 0) {
        notifyToast('No orders available to export.');
        return;
      }
      const headers = ['Order ID', 'Created At', 'Customer Name', 'Email', 'Status', 'Total PHP', 'Items', 'Notes'];
      const rows = allOrders.map((o) => {
        const itemsText = (o.items || [])
          .map((it) => `${it.quantity}x ${it.product_name}`)
          .join('; ');
        return [
          o.id,
          o.created_at || '',
          `"${String(o.customer_name || '').replace(/"/g, '""')}"`,
          `"${String(o.customer_email || '').replace(/"/g, '""')}"`,
          o.status,
          Number(o.total_amount || 0).toFixed(2),
          `"${itemsText.replace(/"/g, '""')}"`,
          `"${String(o.notes || '').replace(/"/g, '""')}"`,
        ].join(',');
      });
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kkeopi-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notifyToast(`Exported ${allOrders.length} orders to CSV.`);
    });
  }

  // --- PRINTABLE THERMAL TICKET MODAL ---
  function openTicketModal(order) {
    if (!thermalTicketContent) return;
    const dt = new Date(order.created_at);
    const itemsHtml = (order.items || [])
      .map(
        (it) => `
        <div class="d-flex justify-content-between py-1" style="border-bottom: 1px dotted #D5CFC4;">
          <span>${it.quantity}x ${escapeHtml(it.product_name)}</span>
          <span>₱${Number(it.subtotal || it.price * it.quantity).toFixed(2)}</span>
        </div>
      `
      )
      .join('');

    thermalTicketContent.innerHTML = `
      <div class="text-center pb-2 mb-2" style="border-bottom: 1px dashed #968F85;">
        <div class="fw-bold" style="font-size: 0.9rem; letter-spacing: 0.08em;">KKEOPI ESPRESSO BAR</div>
        <div class="text-muted" style="font-size: 0.68rem;">Ticket #${escapeHtml(order.id)} · ${escapeHtml(order.status)}</div>
      </div>
      <div class="mb-2" style="font-size: 0.72rem;">
        <div><strong>Customer:</strong> ${escapeHtml(order.customer_name || 'Guest')}</div>
        <div><strong>Time:</strong> ${isNaN(dt.getTime()) ? '--' : dt.toLocaleString()}</div>
      </div>
      <div class="my-2">
        ${itemsHtml || '<div>No items</div>'}
      </div>
      ${
        order.notes
          ? `<div class="p-2 my-2" style="background: #F3EFE6; border-radius: 4px; font-size: 0.7rem;">
              <strong>Note:</strong> ${escapeHtml(order.notes)}
            </div>`
          : ''
      }
      <div class="d-flex justify-content-between pt-2 mt-2 fw-bold" style="border-top: 1px dashed #968F85; font-size: 0.85rem;">
        <span>TOTAL</span>
        <span>₱${Number(order.total_amount || 0).toFixed(2)}</span>
      </div>
    `;

    if (orderTicketModal) orderTicketModal.show();
  }

  if (printModalTicketBtn) {
    printModalTicketBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // --- LIVE CONNECTION INDICATOR ---
  function updateWsStatus(connected) {
    if (!wsLiveIndicator || !wsStatusText) return;
    if (connected) {
      wsLiveIndicator.className = 'live-indicator bg-success';
      wsStatusText.textContent = 'Supabase Live';
    } else {
      wsLiveIndicator.className = 'live-indicator bg-warning';
      wsStatusText.textContent = 'Syncing...';
    }
  }

  if (client) {
    client.on('ws:status', ({ connected }) => {
      updateWsStatus(connected);
    });

    client.on('order:created', (payload) => {
      const order = payload.order || payload;
      if (!order || !order.id) return;

      const exists = allOrders.some((o) => String(o.id) === String(order.id));
      if (!exists) {
        allOrders.unshift(order);
      }

      if (soundEnabled && client.playChime) {
        client.playChime('order');
      }

      notifyToast(
        `New Order #${order.id} · ${order.customer_name || 'Guest'} (₱${Number(order.total_amount || 0).toFixed(2)})`
      );

      updateSummaryStats();
      renderOrders();
    });

    client.on('order:status_updated', (payload) => {
      const order = payload.order || payload;
      if (!order) return;
      const targetId = String(order.order_id || order.id);
      const idx = allOrders.findIndex((o) => String(o.id) === targetId);
      if (idx !== -1) {
        allOrders[idx] = { ...allOrders[idx], ...order, id: allOrders[idx].id };
      }
      updateSummaryStats();
      renderOrders();
    });

    client.on('product:created', (prod) => {
      if (!prod || !prod.id) return;
      if (!allProducts.some((p) => p.id === prod.id)) {
        allProducts.unshift(prod);
      }
      renderProducts();
    });

    client.on('product:updated', (prod) => {
      if (!prod || !prod.id) return;
      const idx = allProducts.findIndex((p) => p.id === prod.id);
      if (idx !== -1) {
        allProducts[idx] = prod;
        renderProducts();
      }
    });

    client.on('product:deleted', ({ id }) => {
      allProducts = allProducts.filter((p) => p.id !== id);
      renderProducts();
    });

    client.on('poll:tick', async () => {
      try {
        const res = await client.getOrders();
        if (res && res.success && Array.isArray(res.data)) {
          const existingIds = new Set(allOrders.map((o) => String(o.id)));
          const newOrders = res.data.filter((o) => !existingIds.has(String(o.id)));
          allOrders = res.data;
          if (newOrders.length > 0 && existingIds.size > 0) {
            const latest = newOrders[0];
            if (soundEnabled && client.playChime) client.playChime('order');
            notifyToast(
              `New Order #${latest.id} · ${latest.customer_name || 'Guest'} (₱${Number(latest.total_amount || 0).toFixed(2)})`
            );
          }
          updateSummaryStats();
          renderOrders();
        }
      } catch {
        // Ignore transient poll error
      }
    });
  }

  // --- STATS CALCULATION ---
  function updateSummaryStats() {
    const today = new Date().toDateString();
    const todayOrders = allOrders.filter((o) => {
      try {
        return new Date(o.created_at).toDateString() === today;
      } catch {
        return true;
      }
    });

    const pendingCount = allOrders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length;
    const preparingCount = allOrders.filter((o) => o.status === 'PREPARING').length;
    const readyCount = allOrders.filter((o) => o.status === 'READY').length;
    const completedCount = allOrders.filter((o) => o.status === 'COMPLETED').length;
    const cancelledCount = allOrders.filter((o) => o.status === 'CANCELLED').length;

    const todaySales = todayOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    if (statTodayOrders) statTodayOrders.textContent = todayOrders.length;
    if (statPendingOrders) statPendingOrders.textContent = pendingCount;
    if (statPreparingOrders) statPreparingOrders.textContent = preparingCount;
    if (statTodaySales) statTodaySales.textContent = `₱${todaySales.toFixed(2)}`;

    const countAllEl = document.getElementById('filterCountAll');
    const countPendingEl = document.getElementById('filterCountPending');
    const countPreparingEl = document.getElementById('filterCountPreparing');
    const countReadyEl = document.getElementById('filterCountReady');
    const countCompletedEl = document.getElementById('filterCountCompleted');
    const countCancelledEl = document.getElementById('filterCountCancelled');

    if (countAllEl) countAllEl.textContent = allOrders.length;
    if (countPendingEl) countPendingEl.textContent = pendingCount;
    if (countPreparingEl) countPreparingEl.textContent = preparingCount;
    if (countReadyEl) countReadyEl.textContent = readyCount;
    if (countCompletedEl) countCompletedEl.textContent = completedCount;
    if (countCancelledEl) countCancelledEl.textContent = cancelledCount;

    if (navOrdersBadge) navOrdersBadge.textContent = pendingCount > 0 ? pendingCount : allOrders.length;
  }

  // --- FETCH ORDERS ---
  async function fetchOrders() {
    ordersLoading.classList.remove('d-none');
    ordersError.classList.add('d-none');
    ordersEmpty.classList.add('d-none');
    ordersFilterEmpty.classList.add('d-none');
    ordersTableWrapper.classList.add('d-none');
    if (ordersKdsWrapper) ordersKdsWrapper.classList.add('d-none');

    try {
      const res = await client.getOrders();
      ordersLoading.classList.add('d-none');

      if (!res.success) {
        throw new Error(res.error || res.message || 'Failed to retrieve orders');
      }

      allOrders = Array.isArray(res.data) ? res.data : [];
      updateSummaryStats();
      renderOrders();
    } catch (err) {
      ordersLoading.classList.add('d-none');
      ordersError.classList.remove('d-none');
      if (ordersErrorDetail) {
        ordersErrorDetail.textContent = err.message || 'Connection error.';
      }
    }
  }

  // --- RENDER KDS KANBAN BOARD ---
  function renderKdsBoard(filteredOrders) {
    if (!ordersKdsWrapper) return;

    const pendingList = filteredOrders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED');
    const prepList = filteredOrders.filter((o) => o.status === 'PREPARING');
    const readyList = filteredOrders.filter((o) => o.status === 'READY');

    if (kdsCountPending) kdsCountPending.textContent = pendingList.length;
    if (kdsCountPreparing) kdsCountPreparing.textContent = prepList.length;
    if (kdsCountReady) kdsCountReady.textContent = readyList.length;

    function buildKdsTicketHtml(order, nextStatus, nextBtnLabel, nextBtnClass) {
      const elapsed = formatRelativeElapsed(order.created_at);
      const itemsHtml = (order.items || [])
        .map(
          (it) => `
          <div class="d-flex justify-content-between py-1" style="font-size: 0.78rem; border-bottom: 1px solid rgba(221, 216, 206, 0.45);">
            <span><strong class="mono-num">${it.quantity}×</strong> ${escapeHtml(it.product_name)}</span>
          </div>
        `
        )
        .join('');

      return `
        <div class="kds-ticket">
          <div class="kds-ticket-top">
            <div>
              <span class="mono-num fw-bold">#${escapeHtml(order.id)}</span>
              <span class="text-muted"> · </span>
              <span class="fw-semibold">${escapeHtml(order.customer_name || 'Guest')}</span>
            </div>
            <span class="mono-num text-muted" style="font-size: 0.7rem;">${escapeHtml(elapsed)}</span>
          </div>
          <div class="mb-2">${itemsHtml}</div>
          ${
            order.notes
              ? `<div class="p-1 mb-2 rounded" style="background: #F2EFE9; font-size: 0.71rem; color: #68625B;">
                  ${escapeHtml(order.notes)}
                </div>`
              : ''
          }
          <div class="d-flex justify-content-between align-items-center pt-1">
            <span class="mono-num fw-semibold" style="font-size: 0.78rem;">₱${Number(order.total_amount || 0).toFixed(2)}</span>
            <div class="d-flex gap-1">
              <button type="button" class="btn-dirty py-1 px-2 open-ticket-btn" data-id="${order.id}" title="Print Cup Ticket">
                <i class="fa-solid fa-receipt"></i>
              </button>
              <button type="button" class="${nextBtnClass} py-1 px-2 status-action-btn" data-id="${order.id}" data-status="${nextStatus}">
                ${nextBtnLabel}
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (kdsColPending) {
      kdsColPending.innerHTML =
        pendingList
          .map((o) => buildKdsTicketHtml(o, 'PREPARING', 'Start Brew →', 'btn-primary'))
          .join('') || '<div class="text-muted small py-3 text-center">No pending tickets</div>';
    }
    if (kdsColPreparing) {
      kdsColPreparing.innerHTML =
        prepList
          .map((o) => buildKdsTicketHtml(o, 'READY', 'Mark Ready →', 'btn-success'))
          .join('') || '<div class="text-muted small py-3 text-center">Espresso bar clear</div>';
    }
    if (kdsColReady) {
      kdsColReady.innerHTML =
        readyList
          .map((o) => buildKdsTicketHtml(o, 'COMPLETED', 'Complete ✓', 'btn-dirty'))
          .join('') || '<div class="text-muted small py-3 text-center">No cups waiting at counter</div>';
    }

    ordersKdsWrapper.querySelectorAll('.status-action-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await updateStatus(btn.dataset.id, btn.dataset.status, btn);
      });
    });

    ordersKdsWrapper.querySelectorAll('.open-ticket-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ord = allOrders.find((o) => String(o.id) === String(btn.dataset.id));
        if (ord) openTicketModal(ord);
      });
    });
  }

  // --- RENDER ORDERS ---
  function renderOrders() {
    ordersLoading.classList.add('d-none');
    ordersError.classList.add('d-none');

    if (allOrders.length === 0) {
      ordersEmpty.classList.remove('d-none');
      ordersFilterEmpty.classList.add('d-none');
      ordersTableWrapper.classList.add('d-none');
      if (ordersKdsWrapper) ordersKdsWrapper.classList.add('d-none');
      return;
    }
    ordersEmpty.classList.add('d-none');

    let filtered = allOrders;
    if (activeFilter !== 'ALL') {
      if (activeFilter === 'PENDING') {
        filtered = filtered.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED');
      } else {
        filtered = filtered.filter((o) => o.status === activeFilter);
      }
    }

    if (orderSearchQuery) {
      const q = orderSearchQuery.toLowerCase();
      filtered = filtered.filter((o) => {
        const idMatch = String(o.id).toLowerCase().includes(q);
        const nameMatch = (o.customer_name || '').toLowerCase().includes(q);
        const emailMatch = (o.customer_email || '').toLowerCase().includes(q);
        return idMatch || nameMatch || emailMatch;
      });
    }

    // If KDS Board mode is active
    if (activeViewMode === 'KDS') {
      ordersFilterEmpty.classList.add('d-none');
      ordersTableWrapper.classList.add('d-none');
      if (ordersKdsWrapper) {
        ordersKdsWrapper.classList.remove('d-none');
        renderKdsBoard(filtered);
      }
      return;
    }

    if (ordersKdsWrapper) ordersKdsWrapper.classList.add('d-none');

    if (filtered.length === 0) {
      ordersFilterEmpty.classList.remove('d-none');
      ordersTableWrapper.classList.add('d-none');
      if (ordersFilterEmptyText) {
        ordersFilterEmptyText.textContent = orderSearchQuery
          ? `No orders matching "${orderSearchQuery}".`
          : `No ${activeFilter.toLowerCase()} orders.`;
      }
      return;
    }

    ordersFilterEmpty.classList.add('d-none');
    ordersTableWrapper.classList.remove('d-none');

    ordersTableBody.innerHTML = filtered
      .map((order) => {
        const timeStr = formatTime(order.created_at);
        const relStr = formatRelativeElapsed(order.created_at);
        const itemsList = (order.items || [])
          .map(
            (it) => `
            <div style="font-size: 0.79rem;">
              <span class="mono-num fw-semibold">${it.quantity}×</span> ${escapeHtml(it.product_name)}
              <span class="text-muted mono-num">(₱${Number(it.subtotal || it.price * it.quantity).toFixed(2)})</span>
            </div>
          `
          )
          .join('');

        let actionButtons = '';
        if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
          actionButtons = `
            <button class="btn-primary py-1 px-2 status-action-btn" data-id="${order.id}" data-status="PREPARING">
              Prepare
            </button>
          `;
        } else if (order.status === 'PREPARING') {
          actionButtons = `
            <button class="btn-success py-1 px-2 status-action-btn" data-id="${order.id}" data-status="READY">
              Mark Ready
            </button>
          `;
        } else if (order.status === 'READY') {
          actionButtons = `
            <button class="btn-dirty py-1 px-2 status-action-btn" data-id="${order.id}" data-status="COMPLETED">
              Complete
            </button>
          `;
        }

        const statusSelect = `
          <select class="form-select py-1 px-2 status-select-dropdown" data-id="${order.id}" style="width: auto; font-size: 0.74rem;">
            <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>Pending</option>
            <option value="PREPARING" ${order.status === 'PREPARING' ? 'selected' : ''}>Preparing</option>
            <option value="READY" ${order.status === 'READY' ? 'selected' : ''}>Ready</option>
            <option value="COMPLETED" ${order.status === 'COMPLETED' ? 'selected' : ''}>Completed</option>
            <option value="CANCELLED" ${order.status === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
          </select>
        `;

        return `
          <tr id="order-row-${order.id}">
            <td>
              <div class="mono-num fw-bold">#${escapeHtml(order.id)}</div>
              <div class="text-muted mono-num" style="font-size: 0.7rem;">${timeStr} · ${relStr}</div>
            </td>
            <td>
              <div class="fw-semibold">${escapeHtml(order.customer_name || 'Customer')}</div>
              ${order.customer_email ? `<div class="text-muted" style="font-size: 0.72rem;">${escapeHtml(order.customer_email)}</div>` : ''}
              ${
                order.notes
                  ? `<div class="mt-1 px-2 py-1 rounded" style="background: #EFECE4; color: #57524B; font-size: 0.71rem;">
                      ${escapeHtml(order.notes)}
                    </div>`
                  : ''
              }
            </td>
            <td>${itemsList || '<span class="text-muted small">No items</span>'}</td>
            <td>
              <span class="mono-num fw-bold">₱${Number(order.total_amount || 0).toFixed(2)}</span>
            </td>
            <td>
              <span class="status-inline status-${String(order.status || 'pending').toLowerCase()}">
                ${escapeHtml(order.status)}
              </span>
            </td>
            <td class="text-end">
              <div class="d-flex justify-content-end align-items-center gap-1">
                <button type="button" class="btn-dirty py-1 px-2 open-ticket-btn" data-id="${order.id}" title="View / Print Cup Ticket">
                  <i class="fa-solid fa-receipt"></i>
                </button>
                ${actionButtons}
                ${statusSelect}
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    ordersTableBody.querySelectorAll('.status-action-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await updateStatus(btn.dataset.id, btn.dataset.status, btn);
      });
    });

    ordersTableBody.querySelectorAll('.status-select-dropdown').forEach((sel) => {
      sel.addEventListener('change', async (e) => {
        await updateStatus(sel.dataset.id, e.target.value, sel);
      });
    });

    ordersTableBody.querySelectorAll('.open-ticket-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ord = allOrders.find((o) => String(o.id) === String(btn.dataset.id));
        if (ord) openTicketModal(ord);
      });
    });
  }

  async function updateStatus(orderId, newStatus, triggerEl) {
    if (triggerEl) triggerEl.disabled = true;
    try {
      const res = await client.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        const idx = allOrders.findIndex((o) => String(o.id) === String(orderId));
        if (idx !== -1) {
          allOrders[idx].status = newStatus;
        }
        notifyToast(`Order #${orderId} → ${newStatus}`);
        updateSummaryStats();
        renderOrders();
      } else {
        notifyToast('Failed to update status: ' + (res.error || 'Unknown error'));
        if (triggerEl) triggerEl.disabled = false;
      }
    } catch (err) {
      notifyToast('Error updating order: ' + err.message);
      if (triggerEl) triggerEl.disabled = false;
    }
  }

  // --- ORDER FILTERS & SEARCH ---
  if (orderFilters) {
    orderFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      orderFilters.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'ALL';
      renderOrders();
    });
  }

  if (orderSearchInput) {
    orderSearchInput.addEventListener('input', (e) => {
      orderSearchQuery = e.target.value.trim();
      renderOrders();
    });
  }

  if (refreshOrdersBtn) refreshOrdersBtn.addEventListener('click', fetchOrders);
  if (retryOrdersBtn) retryOrdersBtn.addEventListener('click', fetchOrders);

  // --- FETCH PRODUCTS ---
  async function fetchProducts() {
    productsLoading.classList.remove('d-none');
    productsError.classList.add('d-none');
    productsEmpty.classList.add('d-none');
    productsTableWrapper.classList.add('d-none');

    try {
      const res = await client.getProducts();
      productsLoading.classList.add('d-none');

      if (!res.success) {
        throw new Error(res.error || res.message || 'Failed to retrieve products');
      }

      allProducts = Array.isArray(res.data) ? res.data : [];
      if (navProductsBadge) navProductsBadge.textContent = allProducts.length;
      renderProducts();
    } catch (err) {
      productsLoading.classList.add('d-none');
      productsError.classList.remove('d-none');
      if (productsErrorDetail) {
        productsErrorDetail.textContent = err.message || 'Connection error.';
      }
    }
  }

  // --- RENDER PRODUCTS TABLE (WITH 1-CLICK STOCK TOGGLE) ---
  function renderProducts() {
    productsLoading.classList.add('d-none');
    productsError.classList.add('d-none');

    if (navProductsBadge) navProductsBadge.textContent = allProducts.length;

    if (allProducts.length === 0) {
      productsEmpty.classList.remove('d-none');
      productsTableWrapper.classList.add('d-none');
      return;
    }
    productsEmpty.classList.add('d-none');

    let filtered = allProducts;
    if (productCategoryFilter) {
      filtered = filtered.filter((p) => p.category === productCategoryFilter);
    }
    if (productSearchQuery) {
      const q = productSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      productsTableWrapper.classList.remove('d-none');
      productsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            No menu items match the current filter.
          </td>
        </tr>
      `;
      return;
    }

    productsTableWrapper.classList.remove('d-none');

    productsTableBody.innerHTML = filtered
      .map(
        (prod) => `
        <tr id="prod-row-${prod.id}">
          <td>
            <img src="${escapeHtml(prod.image)}" alt="${escapeHtml(prod.name)}" class="product-thumb" referrerPolicy="no-referrer"
              onerror="this.src='assets/kkeopi_logo.jpg'">
          </td>
          <td>
            <div class="fw-semibold">${escapeHtml(prod.name)}</div>
            ${prod.description ? `<div class="text-muted text-truncate" style="max-width: 340px; font-size: 0.74rem;">${escapeHtml(prod.description)}</div>` : ''}
          </td>
          <td>
            <span class="mono-num fw-bold">₱${Number(prod.price || 0).toFixed(2)}</span>
          </td>
          <td>
            <span class="text-secondary" style="font-size: 0.78rem;">${escapeHtml(prod.category || 'Coffee')}</span>
          </td>
          <td>
            <button type="button" class="btn-dirty py-1 px-2 toggle-stock-btn" data-id="${prod.id}" title="Click to toggle stock status">
              <span class="status-inline ${prod.is_available ? 'status-ready' : 'status-cancelled'}">
                ${prod.is_available ? 'In Stock' : 'Sold Out'}
              </span>
            </button>
          </td>
          <td class="text-end">
            <div class="d-flex justify-content-end gap-1">
              <button class="btn-dirty py-1 px-2 edit-product-btn" data-id="${prod.id}">
                Edit
              </button>
              <button class="btn-outline-danger py-1 px-2 delete-product-btn" data-id="${prod.id}">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `
      )
      .join('');

    // 1-Click Stock Availability Toggle
    productsTableBody.querySelectorAll('.toggle-stock-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const prod = allProducts.find((p) => p.id === btn.dataset.id);
        if (!prod) return;
        btn.disabled = true;
        const nextAvail = !prod.is_available;
        try {
          const res = await client.updateProduct(prod.id, { is_available: nextAvail });
          if (res && res.success) {
            prod.is_available = nextAvail;
            notifyToast(`${prod.name}: ${nextAvail ? 'In Stock' : 'Sold Out'}`);
            renderProducts();
          } else {
            btn.disabled = false;
          }
        } catch {
          btn.disabled = false;
        }
      });
    });

    productsTableBody.querySelectorAll('.edit-product-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prod = allProducts.find((p) => p.id === btn.dataset.id);
        if (prod) openEditProductModal(prod);
      });
    });

    productsTableBody.querySelectorAll('.delete-product-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const prodId = btn.dataset.id;
        const prod = allProducts.find((p) => p.id === prodId);
        btn.disabled = true;
        try {
          const res = await client.deleteProduct(prodId);
          if (res.success) {
            allProducts = allProducts.filter((p) => p.id !== prodId);
            notifyToast(`Deleted "${prod?.name || prodId}"`);
            renderProducts();
          } else {
            notifyToast('Failed to delete: ' + (res.error || 'Unknown error'));
            btn.disabled = false;
          }
        } catch (err) {
          notifyToast('Error deleting product: ' + err.message);
          btn.disabled = false;
        }
      });
    });
  }

  // --- PRODUCT MODALS & FORM HANDLERS ---
  if (openAddProductModalBtn) {
    openAddProductModalBtn.addEventListener('click', () => {
      document.getElementById('addProductForm').reset();
      document.getElementById('addProductError').classList.add('d-none');
      if (addProductModal) addProductModal.show();
    });
  }

  if (emptyAddProductBtn) {
    emptyAddProductBtn.addEventListener('click', () => {
      document.getElementById('addProductForm').reset();
      document.getElementById('addProductError').classList.add('d-none');
      if (addProductModal) addProductModal.show();
    });
  }

  const addProductForm = document.getElementById('addProductForm');
  const addProductError = document.getElementById('addProductError');
  const saveAddProductBtn = document.getElementById('saveAddProductBtn');

  if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      addProductError.classList.add('d-none');
      saveAddProductBtn.disabled = true;
      saveAddProductBtn.textContent = 'Saving...';

      const payload = {
        name: document.getElementById('newProdName').value.trim(),
        price: parseFloat(document.getElementById('newProdPrice').value),
        category: document.getElementById('newProdCategory').value,
        description: document.getElementById('newProdDesc').value.trim(),
        image: document.getElementById('newProdImage').value.trim(),
        is_available: document.getElementById('newProdAvailable').checked,
      };

      try {
        const res = await client.createProduct(payload);
        if (res.success && res.data) {
          allProducts.unshift(res.data);
          renderProducts();
          if (addProductModal) addProductModal.hide();
          addProductForm.reset();
          notifyToast(`Added "${res.data.name}" to menu.`);
        } else {
          addProductError.textContent =
            res.error || (res.errors ? JSON.stringify(res.errors) : 'Failed to add product');
          addProductError.classList.remove('d-none');
        }
      } catch (err) {
        addProductError.textContent = err.message || 'Network error occurred';
        addProductError.classList.remove('d-none');
      } finally {
        saveAddProductBtn.disabled = false;
        saveAddProductBtn.textContent = 'Create Product';
      }
    });
  }

  function openEditProductModal(prod) {
    document.getElementById('editProdId').value = prod.id;
    document.getElementById('editProdName').value = prod.name;
    document.getElementById('editProdPrice').value = prod.price;
    document.getElementById('editProdCategory').value = prod.category;
    document.getElementById('editProdDesc').value = prod.description || '';
    document.getElementById('editProdImage').value = prod.image || '';
    document.getElementById('editProdAvailable').checked = Boolean(prod.is_available);
    document.getElementById('editProductError').classList.add('d-none');
    if (editProductModal) editProductModal.show();
  }

  const editProductForm = document.getElementById('editProductForm');
  const editProductError = document.getElementById('editProductError');
  const saveEditProductBtn = document.getElementById('saveEditProductBtn');

  if (editProductForm) {
    editProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      editProductError.classList.add('d-none');
      saveEditProductBtn.disabled = true;
      saveEditProductBtn.textContent = 'Saving...';

      const prodId = document.getElementById('editProdId').value;
      const updates = {
        name: document.getElementById('editProdName').value.trim(),
        price: parseFloat(document.getElementById('editProdPrice').value),
        category: document.getElementById('editProdCategory').value,
        description: document.getElementById('editProdDesc').value.trim(),
        image: document.getElementById('editProdImage').value.trim(),
        is_available: document.getElementById('editProdAvailable').checked,
      };

      try {
        const res = await client.updateProduct(prodId, updates);
        if (res.success && res.data) {
          const idx = allProducts.findIndex((p) => p.id === prodId);
          if (idx !== -1) {
            allProducts[idx] = res.data;
          }
          renderProducts();
          if (editProductModal) editProductModal.hide();
          notifyToast(`Updated "${res.data.name}"`);
        } else {
          editProductError.textContent =
            res.error || (res.errors ? JSON.stringify(res.errors) : 'Failed to update product');
          editProductError.classList.remove('d-none');
        }
      } catch (err) {
        editProductError.textContent = err.message || 'Network error occurred';
        editProductError.classList.remove('d-none');
      } finally {
        saveEditProductBtn.disabled = false;
        saveEditProductBtn.textContent = 'Save Changes';
      }
    });
  }

  if (productCategoryFilterEl) {
    productCategoryFilterEl.addEventListener('change', (e) => {
      productCategoryFilter = e.target.value;
      renderProducts();
    });
  }

  if (productSearchInput) {
    productSearchInput.addEventListener('input', (e) => {
      productSearchQuery = e.target.value.trim();
      renderProducts();
    });
  }

  if (refreshProductsBtn) refreshProductsBtn.addEventListener('click', fetchProducts);
  if (retryProductsBtn) retryProductsBtn.addEventListener('click', fetchProducts);

  await Promise.all([fetchOrders(), fetchProducts()]);
});
