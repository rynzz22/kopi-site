/**
 * KKEOPI Coffee — Minimal, Functional Admin Dashboard
 * Strictly API-driven with real database data & WebSockets
 */

document.addEventListener('DOMContentLoaded', async () => {
  const client = window.kopiClient;

  // Local state strictly initialized to empty
  let allOrders = [];
  let allProducts = [];
  let activeFilter = 'ALL';
  let orderSearchQuery = '';
  let productCategoryFilter = '';
  let productSearchQuery = '';
  let soundEnabled = true;

  // Modals
  const addProductModalEl = document.getElementById('addProductModal');
  const editProductModalEl = document.getElementById('editProductModal');
  const addProductModal = addProductModalEl ? new bootstrap.Modal(addProductModalEl) : null;
  const editProductModal = editProductModalEl ? new bootstrap.Modal(editProductModalEl) : null;

  // Toast
  const toastEl = document.getElementById('liveOrderToast');
  const toastMsgEl = document.getElementById('toastMessage');
  const liveToast = toastEl ? new bootstrap.Toast(toastEl, { delay: 4000 }) : null;

  // DOM Elements - Navigation & Status
  const navOrdersBadge = document.getElementById('navOrdersBadge');
  const navProductsBadge = document.getElementById('navProductsBadge');
  const wsStatusBadge = document.getElementById('wsStatusBadge');
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
  const orderSearchInput = document.getElementById('orderSearchInput');
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

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Format timestamp
  function formatTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  // --- AUDIO ALERT TOGGLE ---
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundToggleBtn.innerHTML = soundEnabled
        ? '<i class="fa-solid fa-volume-high me-1"></i> <span class="d-none d-sm-inline">Chime: </span>ON'
        : '<i class="fa-solid fa-volume-xmark me-1"></i> <span class="d-none d-sm-inline">Chime: </span>MUTED';
      soundToggleBtn.classList.toggle('btn-outline-secondary', soundEnabled);
      soundToggleBtn.classList.toggle('btn-outline-danger', !soundEnabled);
    });
  }

  // --- WEBSOCKET CONNECTION INDICATOR ---
  function updateWsStatus(connected) {
    if (!wsLiveIndicator || !wsStatusText) return;
    if (connected) {
      wsLiveIndicator.className = 'live-indicator bg-success';
      wsStatusText.textContent = 'Live';
      wsStatusText.className = 'small text-success fw-medium';
    } else {
      wsLiveIndicator.className = 'live-indicator bg-danger';
      wsStatusText.textContent = 'Reconnecting...';
      wsStatusText.className = 'small text-danger';
    }
  }

  if (client) {
    client.on('ws:status', ({ connected }) => {
      updateWsStatus(connected);
    });

    // Handle real-time incoming orders from customers
    client.on('order:created', (payload) => {
      const order = payload.order || payload;
      if (!order || !order.id) return;

      // Avoid duplicate if already exists
      const exists = allOrders.some((o) => String(o.id) === String(order.id));
      if (!exists) {
        allOrders.unshift(order);
      }

      if (soundEnabled && client.playChime) {
        client.playChime('order');
      }

      if (toastMsgEl && liveToast) {
        toastMsgEl.textContent = `New Order #${order.id} from ${order.customer_name || 'Customer'} (₱${Number(order.total_amount || 0).toFixed(2)})`;
        liveToast.show();
      }

      updateSummaryStats();
      renderOrders();
    });

    // Handle real-time order status updates
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

    // Handle real-time product updates
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
  }

  // --- STATS CALCULATION (DERIVED STRICTLY FROM REAL DATABASE ORDERS) ---
  function updateSummaryStats() {
    const today = new Date().toDateString();
    const todayOrders = allOrders.filter((o) => {
      try {
        return new Date(o.created_at).toDateString() === today;
      } catch {
        return true;
      }
    });

    const pendingCount = allOrders.filter((o) => o.status === 'PENDING').length;
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

    // Update filter badge counts
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

  // --- FETCH ORDERS FROM LARAVEL API ---
  async function fetchOrders() {
    ordersLoading.classList.remove('d-none');
    ordersError.classList.add('d-none');
    ordersEmpty.classList.add('d-none');
    ordersFilterEmpty.classList.add('d-none');
    ordersTableWrapper.classList.add('d-none');

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
        ordersErrorDetail.textContent = err.message || 'Connection error. Please verify the API is operational.';
      }
      console.error('[Admin] Error fetching orders:', err);
    }
  }

  // --- RENDER ORDERS TABLE ---
  function renderOrders() {
    ordersLoading.classList.add('d-none');
    ordersError.classList.add('d-none');

    // If database has literally no orders
    if (allOrders.length === 0) {
      ordersEmpty.classList.remove('d-none');
      ordersFilterEmpty.classList.add('d-none');
      ordersTableWrapper.classList.add('d-none');
      return;
    }
    ordersEmpty.classList.add('d-none');

    // Filter by status & search query
    let filtered = allOrders;
    if (activeFilter !== 'ALL') {
      filtered = filtered.filter((o) => o.status === activeFilter);
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

    // Filter empty state
    if (filtered.length === 0) {
      ordersFilterEmpty.classList.remove('d-none');
      ordersTableWrapper.classList.add('d-none');
      if (ordersFilterEmptyText) {
        ordersFilterEmptyText.textContent = orderSearchQuery
          ? `No orders found matching "${orderSearchQuery}".`
          : `No ${activeFilter.toLowerCase()} orders.`;
      }
      return;
    }

    ordersFilterEmpty.classList.add('d-none');
    ordersTableWrapper.classList.remove('d-none');

    ordersTableBody.innerHTML = filtered
      .map((order) => {
        const timeStr = formatTime(order.created_at);
        const itemsList = (order.items || [])
          .map(
            (it) => `
            <div class="small text-nowrap">
              <span class="fw-semibold">${it.quantity}x</span> ${escapeHtml(it.product_name)}
              <span class="text-muted">(₱${Number(it.subtotal || it.price * it.quantity).toFixed(2)})</span>
            </div>
          `
          )
          .join('');

        // Action buttons tailored to current status
        let actionButtons = '';
        if (order.status === 'PENDING') {
          actionButtons = `
            <button class="btn btn-sm btn-primary py-0 px-2 status-action-btn" data-id="${order.id}" data-status="PREPARING">
              Prepare
            </button>
            <button class="btn btn-sm btn-outline-danger py-0 px-2 status-action-btn" data-id="${order.id}" data-status="CANCELLED">
              Cancel
            </button>
          `;
        } else if (order.status === 'CONFIRMED') {
          actionButtons = `
            <button class="btn btn-sm btn-primary py-0 px-2 status-action-btn" data-id="${order.id}" data-status="PREPARING">
              Prepare
            </button>
          `;
        } else if (order.status === 'PREPARING') {
          actionButtons = `
            <button class="btn btn-sm btn-success py-0 px-2 status-action-btn" data-id="${order.id}" data-status="READY">
              Mark Ready
            </button>
          `;
        } else if (order.status === 'READY') {
          actionButtons = `
            <button class="btn btn-sm btn-dark py-0 px-2 status-action-btn" data-id="${order.id}" data-status="COMPLETED">
              Complete
            </button>
          `;
        }

        // Status select dropdown for complete administrative override
        const statusSelect = `
          <select class="form-select form-select-sm py-0 px-1 status-select-dropdown" data-id="${order.id}" style="width: auto; font-size: 0.775rem;">
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
              <div class="fw-bold">#${order.id}</div>
              <div class="text-muted small">${timeStr}</div>
            </td>
            <td>
              <div class="fw-medium">${escapeHtml(order.customer_name || 'Customer')}</div>
              <div class="text-muted small">${escapeHtml(order.customer_email || '')}</div>
              ${
                order.notes
                  ? `<div class="small text-warning-emphasis bg-warning-subtle p-1 rounded mt-1">
                      <i class="fa-regular fa-comment-dots me-1"></i>${escapeHtml(order.notes)}
                    </div>`
                  : ''
              }
            </td>
            <td>${itemsList || '<span class="text-muted small">No items</span>'}</td>
            <td>
              <span class="fw-bold">₱${Number(order.total_amount || 0).toFixed(2)}</span>
            </td>
            <td>
              <span class="badge badge-${order.status.toLowerCase()} text-uppercase px-2 py-1">
                ${order.status}
              </span>
            </td>
            <td class="text-end">
              <div class="d-flex justify-content-end align-items-center gap-1">
                ${actionButtons}
                ${statusSelect}
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Attach quick action button listeners
    ordersTableBody.querySelectorAll('.status-action-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const orderId = btn.dataset.id;
        const newStatus = btn.dataset.status;
        await updateStatus(orderId, newStatus, btn);
      });
    });

    // Attach status dropdown change listeners
    ordersTableBody.querySelectorAll('.status-select-dropdown').forEach((sel) => {
      sel.addEventListener('change', async (e) => {
        const orderId = sel.dataset.id;
        const newStatus = e.target.value;
        await updateStatus(orderId, newStatus, sel);
      });
    });
  }

  // Update order status via PUT /api/orders/:id/status
  async function updateStatus(orderId, newStatus, triggerEl) {
    if (triggerEl) triggerEl.disabled = true;
    try {
      const res = await client.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        const idx = allOrders.findIndex((o) => String(o.id) === String(orderId));
        if (idx !== -1) {
          allOrders[idx].status = newStatus;
        }
        updateSummaryStats();
        renderOrders();
      } else {
        alert('Failed to update order status: ' + (res.error || res.message || 'Unknown error'));
        if (triggerEl) triggerEl.disabled = false;
      }
    } catch (err) {
      alert('Error updating order: ' + err.message);
      if (triggerEl) triggerEl.disabled = false;
    }
  }

  // --- ORDER FILTERS & SEARCH EVENT LISTENERS ---
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

  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener('click', fetchOrders);
  }

  if (retryOrdersBtn) {
    retryOrdersBtn.addEventListener('click', fetchOrders);
  }

  // --- FETCH PRODUCTS FROM LARAVEL API ---
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
        productsErrorDetail.textContent = err.message || 'Connection error. Please verify the API is operational.';
      }
      console.error('[Admin] Error fetching products:', err);
    }
  }

  // --- RENDER PRODUCTS TABLE ---
  function renderProducts() {
    productsLoading.classList.add('d-none');
    productsError.classList.add('d-none');

    if (navProductsBadge) navProductsBadge.textContent = allProducts.length;

    // Real empty database state
    if (allProducts.length === 0) {
      productsEmpty.classList.remove('d-none');
      productsTableWrapper.classList.add('d-none');
      return;
    }
    productsEmpty.classList.add('d-none');

    // Filter by category & search
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
            No products match the selected filters.
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
            <img src="${escapeHtml(prod.image)}" alt="${escapeHtml(prod.name)}" class="product-thumb"
              onerror="this.src='https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=150&q=80'">
          </td>
          <td>
            <div class="fw-semibold">${escapeHtml(prod.name)}</div>
            ${prod.description ? `<div class="small text-muted text-truncate" style="max-width: 320px;">${escapeHtml(prod.description)}</div>` : ''}
          </td>
          <td>
            <span class="fw-bold">₱${Number(prod.price || 0).toFixed(2)}</span>
          </td>
          <td>
            <span class="badge bg-light text-dark border">${escapeHtml(prod.category || 'General')}</span>
          </td>
          <td>
            <span class="badge ${prod.is_available ? 'bg-success' : 'bg-secondary'}">
              ${prod.is_available ? 'Available' : 'Out of Stock'}
            </span>
          </td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary py-0 px-2 me-1 edit-product-btn" data-id="${prod.id}">
              Edit
            </button>
            <button class="btn btn-sm btn-outline-danger py-0 px-2 delete-product-btn" data-id="${prod.id}">
              Delete
            </button>
          </td>
        </tr>
      `
      )
      .join('');

    // Attach Edit & Delete button handlers
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
        const name = prod ? prod.name : 'this item';
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
          btn.disabled = true;
          try {
            const res = await client.deleteProduct(prodId);
            if (res.success) {
              allProducts = allProducts.filter((p) => p.id !== prodId);
              renderProducts();
            } else {
              alert('Failed to delete product: ' + (res.error || res.message));
              btn.disabled = false;
            }
          } catch (err) {
            alert('Error deleting product: ' + err.message);
            btn.disabled = false;
          }
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

  // Handle Add Product Submit (POST /api/products)
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
        } else {
          addProductError.textContent = res.error || (res.errors ? JSON.stringify(res.errors) : 'Failed to add product');
          addProductError.classList.remove('d-none');
        }
      } catch (err) {
        addProductError.textContent = err.message || 'Network error occurred';
        addProductError.classList.remove('d-none');
      } finally {
        saveAddProductBtn.disabled = false;
        saveAddProductBtn.textContent = 'Add Product';
      }
    });
  }

  // Open Edit Product Modal
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

  // Handle Edit Product Submit (PUT /api/products/:id)
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
        } else {
          editProductError.textContent = res.error || (res.errors ? JSON.stringify(res.errors) : 'Failed to update product');
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

  // Product Filter & Search Event Listeners
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

  if (refreshProductsBtn) {
    refreshProductsBtn.addEventListener('click', fetchProducts);
  }

  if (retryProductsBtn) {
    retryProductsBtn.addEventListener('click', fetchProducts);
  }

  // --- INITIAL DATA FETCH ---
  await Promise.all([fetchOrders(), fetchProducts()]);
});
