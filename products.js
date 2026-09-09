/**
 * KKEOPI Specialty Food Cart — Menu, Customizer & Checkout System
 */

document.addEventListener("DOMContentLoaded", () => {
    initLiquidCanvasEffect();
    initSlidingNavIndicator();
    initMobileNavigation();
    initCategoryFilters();
    initCardChipInteractions();
    initCustomizerModalSystem();
    initCheckoutAndCartSystem();
    initHeartFavorites();
    initGoogleAuthIntegration();
});

/* ==========================================================================
   GLOBAL CART STATE
   ========================================================================== */
let cartItems = [];

// Temporary active customizer session state
let activeCustomizerState = {
    mode: "add", // "add" or "edit"
    cartIndex: -1,
    basePrice: 150,
    title: "",
    category: "signature",
    type: "coffee",
    img: "",
    desc: "",
    size: "Regular",
    sizeExtra: 0,
    milk: "Whole Milk",
    milkExtra: 0,
    sugar: "50%",
    ice: "Regular Ice",
    serve: "Warm Toasted",
    addons: [], // array of { name, price }
    note: "",
    qty: 1
};

/* ==========================================================================
   1. LIQUID CANVAS RIPPLE EFFECT
   ========================================================================== */
function initLiquidCanvasEffect() {
    const canvas = document.getElementById("coffeeRippleCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const ripples = [];

    class Ripple {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = 2;
            this.maxRadius = 38;
            this.alpha = 0.35;
            this.speed = 1.2;
        }

        update() {
            this.radius += this.speed;
            this.alpha -= 0.012;
            return this.alpha > 0;
        }

        draw(context) {
            context.save();
            context.beginPath();
            context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            context.strokeStyle = `rgba(184, 133, 87, ${this.alpha})`;
            context.lineWidth = 1.5;
            context.stroke();
            context.restore();
        }
    }

    let lastTime = 0;
    window.addEventListener("mousemove", (e) => {
        const now = performance.now();
        if (now - lastTime > 60) {
            ripples.push(new Ripple(e.clientX, e.clientY));
            lastTime = now;
        }
    });

    function loop() {
        ctx.clearRect(0, 0, width, height);
        for (let i = ripples.length - 1; i >= 0; i--) {
            if (ripples[i].update()) {
                ripples[i].draw(ctx);
            } else {
                ripples.splice(i, 1);
            }
        }
        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

/* ==========================================================================
   2. SLIDING PILL NAVIGATION INDICATOR
   ========================================================================== */
function initSlidingNavIndicator() {
    const navWrapper = document.querySelector(".nav-links-wrapper");
    const pill = document.getElementById("navPill");
    const navList = document.getElementById("navList");

    if (!navWrapper || !pill || !navList) return;

    const navItems = navList.querySelectorAll("li");
    let activeItem = navList.querySelector("li.active") || navItems[0];

    function movePillTo(element) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const parentRect = navWrapper.getBoundingClientRect();

        const offsetLeft = rect.left - parentRect.left;
        const itemWidth = rect.width;

        pill.style.opacity = "1";
        pill.style.width = `${itemWidth}px`;
        pill.style.transform = `translateX(${offsetLeft}px)`;
    }

    if (activeItem) {
        setTimeout(() => movePillTo(activeItem), 80);
    }

    navItems.forEach(item => {
        item.addEventListener("mouseenter", () => movePillTo(item));
        item.addEventListener("mouseleave", () => {
            if (activeItem) movePillTo(activeItem);
        });
    });
}

/* ==========================================================================
   3. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileNavigation() {
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileDrawer = document.getElementById("mobileDrawer");
    const drawerClose = document.getElementById("drawerClose");
    const drawerBackdrop = document.getElementById("drawerBackdrop");

    function openDrawer() {
        if (mobileDrawer) mobileDrawer.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeDrawer() {
        if (mobileDrawer) mobileDrawer.classList.remove("open");
        document.body.style.overflow = "";
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openDrawer);
    if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);
}

/* ==========================================================================
   4. CATEGORY FILTERS
   ========================================================================== */
function initCategoryFilters() {
    const filterChips = document.querySelectorAll(".category-filters .filter-chip");
    const cards = document.querySelectorAll(".products-grid .cart-card");

    filterChips.forEach(chip => {
        chip.addEventListener("click", () => {
            filterChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");

            const filter = chip.getAttribute("data-filter") || "all";

            cards.forEach(card => {
                const cat = card.getAttribute("data-category");
                if (filter === "all" || cat === filter) {
                    card.style.display = "flex";
                } else {
                    card.style.display = "none";
                }
            });
        });
    });
}

/* ==========================================================================
   5. QUICK CARD CHIPS & QUANTITY STEPPERS
   ========================================================================== */
function initCardChipInteractions() {
    // 1. Quantity steppers on cards
    document.querySelectorAll(".cart-card").forEach(card => {
        const minusBtn = card.querySelector(".quantity .minus");
        const plusBtn = card.querySelector(".quantity .plus");
        const countSpan = card.querySelector(".quantity span");

        if (minusBtn && plusBtn && countSpan) {
            minusBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                let val = parseInt(countSpan.textContent || "1", 10);
                if (val > 1) {
                    countSpan.textContent = val - 1;
                }
            });

            plusBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                let val = parseInt(countSpan.textContent || "1", 10);
                countSpan.textContent = val + 1;
            });
        }

        // 2. Chip toggles on card + Live Price Update
        const sizeChips = card.querySelectorAll(".size-chips .chip");
        const priceTag = card.querySelector(".price-tag");
        const basePrice = parseInt(card.getAttribute("data-base-price") || "150", 10);

        sizeChips.forEach(chip => {
            chip.addEventListener("click", (e) => {
                e.stopPropagation();
                sizeChips.forEach(c => c.classList.remove("active"));
                chip.classList.add("active");

                const extra = parseInt(chip.getAttribute("data-extra") || "0", 10);
                if (priceTag) {
                    priceTag.textContent = `₱${basePrice + extra}`;
                }
            });
        });

        const otherChips = card.querySelectorAll(".quick-custom-preview .chip-row:not(:has(.size-chips)) .chip");
        otherChips.forEach(chip => {
            chip.addEventListener("click", (e) => {
                e.stopPropagation();
                const parentRow = chip.closest(".chips");
                if (parentRow) {
                    parentRow.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
                    chip.classList.add("active");
                }
            });
        });
    });
}

/* ==========================================================================
   6. ITEM CUSTOMIZER MODAL SYSTEM (For both Menu & In-Cart Editing)
   ========================================================================== */
function initCustomizerModalSystem() {
    const modal = document.getElementById("customizerModal");
    const backdrop = document.getElementById("customizerBackdrop");
    const closeBtn = document.getElementById("customizerCloseBtn");
    const saveBtn = document.getElementById("custSaveBtn");
    const minusBtn = document.getElementById("custMinusBtn");
    const plusBtn = document.getElementById("custPlusBtn");
    const qtySpan = document.getElementById("custQtyCount");

    // Close handlers
    function closeCustomizer() {
        if (modal) modal.classList.remove("open");
        if (backdrop) backdrop.classList.remove("open");
    }

    if (closeBtn) closeBtn.addEventListener("click", closeCustomizer);
    if (backdrop) backdrop.addEventListener("click", closeCustomizer);

    // Quantity handlers in customizer
    if (minusBtn && plusBtn && qtySpan) {
        minusBtn.addEventListener("click", () => {
            if (activeCustomizerState.qty > 1) {
                activeCustomizerState.qty--;
                qtySpan.textContent = activeCustomizerState.qty;
                updateCustomizerLivePrice();
            }
        });

        plusBtn.addEventListener("click", () => {
            activeCustomizerState.qty++;
            qtySpan.textContent = activeCustomizerState.qty;
            updateCustomizerLivePrice();
        });
    }

    // Option Button Click Listeners inside Customizer
    document.querySelectorAll(".customizer-modal .opt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.getAttribute("data-type");
            const val = btn.getAttribute("data-val") || "";
            const price = parseInt(btn.getAttribute("data-price") || "0", 10);

            // Deactivate sibling buttons of same type
            const parent = btn.parentElement;
            if (parent) {
                parent.querySelectorAll(`.opt-btn[data-type="${type}"]`).forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            }

            if (type === "size") {
                activeCustomizerState.size = val;
                activeCustomizerState.sizeExtra = price;
            } else if (type === "milk") {
                activeCustomizerState.milk = val;
                activeCustomizerState.milkExtra = price;
            } else if (type === "sugar") {
                activeCustomizerState.sugar = val;
            } else if (type === "ice") {
                activeCustomizerState.ice = val;
            } else if (type === "serve") {
                activeCustomizerState.serve = val;
            }

            updateCustomizerLivePrice();
        });
    });

    // Addons Checkbox Listeners
    document.querySelectorAll("#custAddonsList input[type='checkbox']").forEach(chk => {
        chk.addEventListener("change", () => {
            const name = chk.getAttribute("data-name") || "";
            const price = parseInt(chk.getAttribute("data-price") || "0", 10);

            if (chk.checked) {
                if (!activeCustomizerState.addons.some(a => a.name === name)) {
                    activeCustomizerState.addons.push({ name, price });
                }
            } else {
                activeCustomizerState.addons = activeCustomizerState.addons.filter(a => a.name !== name);
            }

            updateCustomizerLivePrice();
        });
    });

    // Note input change listener
    const noteInput = document.getElementById("custItemNote");
    if (noteInput) {
        noteInput.addEventListener("input", (e) => {
            activeCustomizerState.note = e.target.value;
        });
    }

    // Save / Add Button in Customizer
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            saveCustomizerState();
            closeCustomizer();
        });
    }

    // Wire Card "Customize" Trigger Buttons
    document.querySelectorAll(".customize-trigger-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".cart-card");
            if (!card) return;
            openCustomizerForCard(card);
        });
    });
}

function openCustomizerForCard(card) {
    const title = card.getAttribute("data-title") || card.querySelector("h2")?.textContent || "Drink";
    const basePrice = parseInt(card.getAttribute("data-base-price") || "150", 10);
    const category = card.getAttribute("data-category") || "signature";
    const type = card.getAttribute("data-type") || (category === "pastries" ? "pastry" : "coffee");
    const img = card.querySelector("img")?.src || "";
    const desc = card.querySelector(".desc")?.textContent || "";

    // Read current quick selections from card
    const activeSize = card.querySelector(".size-chips .chip.active");
    const sizeVal = activeSize ? (activeSize.getAttribute("data-size") || activeSize.textContent.split(" ")[0]) : "Regular";
    const sizeExtra = activeSize ? parseInt(activeSize.getAttribute("data-extra") || "0", 10) : 0;

    const activeSugar = card.querySelector(".sugar-chips .chip.active");
    const sugarVal = activeSugar ? (activeSugar.getAttribute("data-sugar") || activeSugar.textContent) : "50%";

    const cardQty = parseInt(card.querySelector(".quantity span")?.textContent || "1", 10);

    activeCustomizerState = {
        mode: "add",
        cartIndex: -1,
        basePrice,
        title,
        category,
        type,
        img,
        desc,
        size: sizeVal,
        sizeExtra: sizeExtra,
        milk: "Whole Milk",
        milkExtra: 0,
        sugar: sugarVal,
        ice: "Regular Ice",
        serve: category === "pastries" ? sugarVal : "Warm Toasted",
        addons: [],
        note: "",
        qty: cardQty
    };

    populateCustomizerUI();
    showCustomizerModal();
}

function openCustomizerForCartItem(index) {
    const item = cartItems[index];
    if (!item) return;

    activeCustomizerState = {
        mode: "edit",
        cartIndex: index,
        basePrice: item.basePrice || item.unitPrice,
        title: item.title,
        category: item.category || "signature",
        type: item.type || (item.category === "pastries" ? "pastry" : "coffee"),
        img: item.img,
        desc: item.desc || "Custom handcrafted selection",
        size: item.size || "Regular",
        sizeExtra: item.sizeExtra || 0,
        milk: item.milk || "Whole Milk",
        milkExtra: item.milkExtra || 0,
        sugar: item.sugar || "50%",
        ice: item.ice || "Regular Ice",
        serve: item.serve || "Warm Toasted",
        addons: [...(item.addons || [])],
        note: item.note || "",
        qty: item.qty || 1
    };

    populateCustomizerUI();
    showCustomizerModal();
}

function populateCustomizerUI() {
    const itemTitle = document.getElementById("customizerItemTitle");
    const itemImg = document.getElementById("customizerItemImg");
    const itemDesc = document.getElementById("customizerItemDesc");
    const qtySpan = document.getElementById("custQtyCount");
    const noteInput = document.getElementById("custItemNote");
    const sizeSection = document.getElementById("custSizeSection");
    const milkSection = document.getElementById("custMilkSection");
    const sugarSection = document.getElementById("custSugarSection");
    const iceSection = document.getElementById("custIceSection");
    const pastrySection = document.getElementById("custPastrySection");
    const addonsSection = document.getElementById("custAddonsSection");

    if (itemTitle) itemTitle.textContent = activeCustomizerState.title;
    if (itemImg) itemImg.src = activeCustomizerState.img;
    if (itemDesc) itemDesc.textContent = activeCustomizerState.desc;
    if (qtySpan) qtySpan.textContent = activeCustomizerState.qty;
    if (noteInput) noteInput.value = activeCustomizerState.note;

    // Toggle drink vs pastry sections
    const isPastry = activeCustomizerState.category === "pastries" || activeCustomizerState.type === "pastry";
    if (isPastry) {
        if (sizeSection) sizeSection.style.display = "none";
        if (milkSection) milkSection.style.display = "none";
        if (sugarSection) sugarSection.style.display = "none";
        if (iceSection) iceSection.style.display = "none";
        if (addonsSection) addonsSection.style.display = "none";
        if (pastrySection) pastrySection.style.display = "flex";
    } else {
        if (sizeSection) sizeSection.style.display = "flex";
        if (milkSection) milkSection.style.display = activeCustomizerState.title.includes("Americano") ? "none" : "flex";
        if (sugarSection) sugarSection.style.display = "flex";
        if (iceSection) iceSection.style.display = "flex";
        if (addonsSection) addonsSection.style.display = "flex";
        if (pastrySection) pastrySection.style.display = "none";
    }

    // Set active option buttons
    document.querySelectorAll("#custSizeOptions .opt-btn").forEach(btn => {
        const val = btn.getAttribute("data-val");
        btn.classList.toggle("active", val === activeCustomizerState.size);
    });

    document.querySelectorAll("#custMilkOptions .opt-btn").forEach(btn => {
        const val = btn.getAttribute("data-val");
        btn.classList.toggle("active", val === activeCustomizerState.milk);
    });

    document.querySelectorAll("#custSugarOptions .opt-btn").forEach(btn => {
        const val = btn.getAttribute("data-val");
        btn.classList.toggle("active", val === activeCustomizerState.sugar);
    });

    document.querySelectorAll("#custIceOptions .opt-btn").forEach(btn => {
        const val = btn.getAttribute("data-val");
        btn.classList.toggle("active", val === activeCustomizerState.ice);
    });

    document.querySelectorAll("#custPastryOptions .opt-btn").forEach(btn => {
        const val = btn.getAttribute("data-val");
        btn.classList.toggle("active", val === activeCustomizerState.serve);
    });

    // Check addons
    document.querySelectorAll("#custAddonsList input[type='checkbox']").forEach(chk => {
        const name = chk.getAttribute("data-name");
        chk.checked = activeCustomizerState.addons.some(a => a.name === name);
    });

    updateCustomizerLivePrice();
}

function updateCustomizerLivePrice() {
    const livePriceEl = document.getElementById("customizerLivePrice");
    const saveBtnText = document.getElementById("custSaveBtnText");

    const isPastry = activeCustomizerState.category === "pastries" || activeCustomizerState.type === "pastry";
    let addonsTotal = activeCustomizerState.addons.reduce((sum, a) => sum + a.price, 0);
    
    let unitPrice = activeCustomizerState.basePrice;
    if (!isPastry) {
        unitPrice += activeCustomizerState.sizeExtra + activeCustomizerState.milkExtra + addonsTotal;
    }

    const totalPrice = unitPrice * activeCustomizerState.qty;

    if (livePriceEl) livePriceEl.textContent = `₱${unitPrice}`;
    if (saveBtnText) {
        if (activeCustomizerState.mode === "edit") {
            saveBtnText.textContent = `Update Item in Cart — ₱${totalPrice}`;
        } else {
            saveBtnText.textContent = `Add to Food Cart — ₱${totalPrice}`;
        }
    }
}

function showCustomizerModal() {
    const modal = document.getElementById("customizerModal");
    const backdrop = document.getElementById("customizerBackdrop");
    if (modal) modal.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
}

function saveCustomizerState() {
    const isPastry = activeCustomizerState.category === "pastries" || activeCustomizerState.type === "pastry";
    let addonsTotal = activeCustomizerState.addons.reduce((sum, a) => sum + a.price, 0);

    let unitPrice = activeCustomizerState.basePrice;
    let customsList = [];

    if (isPastry) {
        customsList.push(activeCustomizerState.serve);
    } else {
        unitPrice += activeCustomizerState.sizeExtra + activeCustomizerState.milkExtra + addonsTotal;
        customsList.push(activeCustomizerState.size);
        if (activeCustomizerState.milk !== "Whole Milk") customsList.push(activeCustomizerState.milk);
        if (activeCustomizerState.sugar) customsList.push(`${activeCustomizerState.sugar} sugar`);
        if (activeCustomizerState.ice !== "Regular Ice") customsList.push(activeCustomizerState.ice);
        activeCustomizerState.addons.forEach(a => customsList.push(a.name));
    }

    if (activeCustomizerState.note) {
        customsList.push(`"${activeCustomizerState.note}"`);
    }

    const customsSummary = customsList.join(" • ");

    const cartItem = {
        id: `${activeCustomizerState.title}-${customsSummary}`,
        title: activeCustomizerState.title,
        basePrice: activeCustomizerState.basePrice,
        unitPrice: unitPrice,
        category: activeCustomizerState.category,
        type: activeCustomizerState.type,
        img: activeCustomizerState.img,
        desc: activeCustomizerState.desc,
        size: activeCustomizerState.size,
        sizeExtra: activeCustomizerState.sizeExtra,
        milk: activeCustomizerState.milk,
        milkExtra: activeCustomizerState.milkExtra,
        sugar: activeCustomizerState.sugar,
        ice: activeCustomizerState.ice,
        serve: activeCustomizerState.serve,
        addons: [...activeCustomizerState.addons],
        note: activeCustomizerState.note,
        customsSummary,
        qty: activeCustomizerState.qty
    };

    if (activeCustomizerState.mode === "edit" && activeCustomizerState.cartIndex >= 0) {
        cartItems[activeCustomizerState.cartIndex] = cartItem;
        showToast(`Updated ${cartItem.title} in cart!`);
    } else {
        const existing = cartItems.find(i => i.id === cartItem.id);
        if (existing) {
            existing.qty += cartItem.qty;
        } else {
            cartItems.push(cartItem);
        }
        showToast(`Added ${cartItem.qty}× ${cartItem.title} to cart!`);
        bounceCart();
    }

    updateCartBadge();
    renderCartModal();
}

/* ==========================================================================
   7. CHECKOUT & CART MODAL SYSTEM
   ========================================================================== */
function initCheckoutAndCartSystem() {
    const cartTrigger = document.getElementById("cartTrigger");
    const checkoutModal = document.getElementById("checkoutModal");
    const checkoutBackdrop = document.getElementById("checkoutBackdrop");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    const clearCartBtn = document.getElementById("clearCartBtn");
    const confirmPayBtn = document.getElementById("confirmPayBtn");
    const newOrderBtn = document.getElementById("newOrderBtn");
    const downloadReceiptBtn = document.getElementById("downloadReceiptBtn");

    // 1. "+ Add to Cart" buttons on cards
    document.querySelectorAll(".cart.add-btn").forEach(button => {
        button.addEventListener("click", () => {
            const card = button.closest(".cart-card");
            if (!card) return;

            const item = extractQuickCardData(card);
            addItemToCart(item);
            showToast(`Added ${item.qty}× ${item.title} to cart!`);
            bounceCart();
        });
    });

    // 2. "⚡ Buy Now" buttons (Instant Add & Open Checkout)
    document.querySelectorAll(".buy-now-btn").forEach(button => {
        button.addEventListener("click", () => {
            const card = button.closest(".cart-card");
            if (!card) return;

            const item = extractQuickCardData(card);
            addItemToCart(item);
            bounceCart();
            openCheckoutModal();
        });
    });

    // 3. Floating Cart Trigger
    if (cartTrigger) {
        cartTrigger.addEventListener("click", () => {
            openCheckoutModal();
        });
    }

    // 4. Close Modal
    function closeCheckout() {
        if (checkoutModal) checkoutModal.classList.remove("open");
        if (checkoutBackdrop) checkoutBackdrop.classList.remove("open");
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeCheckout);
    if (checkoutBackdrop) checkoutBackdrop.addEventListener("click", closeCheckout);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && checkoutModal && checkoutModal.classList.contains("open")) {
            closeCheckout();
        }
    });

    // 5. Clear Cart
    if (clearCartBtn) {
        clearCartBtn.addEventListener("click", () => {
            cartItems = [];
            updateCartBadge();
            renderCartModal();
            showToast("Food cart cleared");
        });
    }

    // 6. Dining Option Pills Switcher
    document.querySelectorAll(".dining-options .option-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".dining-options .option-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            const radio = pill.querySelector("input");
            if (radio) radio.checked = true;
        });
    });

    // 7. Payment Methods Switcher
    document.querySelectorAll(".payment-methods-grid .payment-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".payment-methods-grid .payment-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            const radio = pill.querySelector("input");
            if (radio) radio.checked = true;
        });
    });

    // 8. Place Order & Pay Brewing Flow (Connected to real Laravel / Supabase API)
    if (confirmPayBtn) {
        confirmPayBtn.addEventListener("click", async () => {
            if (cartItems.length === 0) {
                showToast("Your cart is empty! Please choose a beverage or pastry.");
                return;
            }

            const totalAmount = calculateCartTotal();
            const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked')?.value || "GCash / Maya";
            const selectedPickup = document.querySelector('input[name="pickupStyle"]:checked')?.value || "To-Go Cup & Bag";
            const custName = document.getElementById("custName")?.value.trim() || "Valued Customer";
            const custEmail = document.getElementById("custEmail")?.value.trim() || "guest@kkeopi.bar";
            const custPhone = document.getElementById("custPhone")?.value.trim() || "";
            const baristaNote = document.getElementById("baristaNote")?.value.trim() || "";

            confirmPayBtn.classList.add("is-brewing");
            const loaderText = confirmPayBtn.querySelector(".loader-text");
            const barFill = confirmPayBtn.querySelector(".loader-bar-fill");

            if (barFill) barFill.style.width = "0%";
            setTimeout(() => { if (barFill) barFill.style.width = "40%"; }, 50);
            if (loaderText) loaderText.textContent = "Connecting to barista order bar...";

            // Map cart items into API payload
            const orderPayload = {
                customer_name: custName,
                customer_email: custEmail,
                user_id: window.kopiClient?.getCurrentUser()?.id || null,
                notes: `${selectedPickup} • Phone: ${custPhone || 'N/A'} • Note: ${baristaNote || 'None'} • Payment: ${selectedPayment}`,
                items: cartItems.map(item => ({
                    product_id: item.productId || 1,
                    product_name: `${item.title} (${item.customsSummary})`,
                    price: item.unitPrice,
                    quantity: item.qty,
                    subtotal: item.unitPrice * item.qty
                }))
            };

            let createdOrder = null;

            try {
                if (window.kopiClient) {
                    if (barFill) barFill.style.width = "75%";
                    if (loaderText) loaderText.textContent = "Transmitting ticket to kitchen via WebSocket...";
                    const res = await window.kopiClient.createOrder(orderPayload);
                    if (res && res.data) {
                        createdOrder = res.data;
                    }
                }
            } catch (err) {
                console.warn("Direct API fallback:", err);
            }

            // Fallback object if server unavailable
            if (!createdOrder) {
                createdOrder = {
                    id: Math.floor(1000 + Math.random() * 9000),
                    customer_name: custName,
                    customer_email: custEmail,
                    total_amount: totalAmount,
                    status: "PENDING",
                    items: orderPayload.items,
                    created_at: new Date().toISOString()
                };
            }

            if (barFill) barFill.style.width = "100%";
            if (loaderText) loaderText.textContent = "Order queued! Ticket printed.";

            setTimeout(() => {
                confirmPayBtn.classList.remove("is-brewing");
                if (barFill) barFill.style.width = "0%";

                const ticketId = `#${createdOrder.id}`;
                const receiptTicketEl = document.getElementById("receiptTicketId");
                const receiptCustNameEl = document.getElementById("receiptCustName");
                const receiptOrderTypeEl = document.getElementById("receiptOrderType");
                const receiptPayMethodEl = document.getElementById("receiptPaymentMethod");
                const receiptTotalEl = document.getElementById("receiptTotalPaid");
                const receiptItemsListEl = document.getElementById("receiptItemsList");
                const trackOrderLiveBtn = document.getElementById("trackOrderLiveBtn");

                if (receiptTicketEl) receiptTicketEl.textContent = ticketId;
                if (receiptCustNameEl) receiptCustNameEl.textContent = custName;
                if (receiptOrderTypeEl) receiptOrderTypeEl.textContent = selectedPickup.includes("To-Go") ? "To-Go" : "Dine-In Bench";
                if (receiptPayMethodEl) receiptPayMethodEl.textContent = `${selectedPayment} (Paid)`;
                if (receiptTotalEl) receiptTotalEl.textContent = `₱${createdOrder.total_amount || totalAmount}`;

                if (trackOrderLiveBtn) {
                    trackOrderLiveBtn.href = `order-status.html?id=${createdOrder.id}`;
                }

                if (receiptItemsListEl) {
                    receiptItemsListEl.innerHTML = cartItems.map(item => `
                        <div class="receipt-item-row">
                            <span><strong>${item.qty}×</strong> ${item.title} (${item.customsSummary})</span>
                            <span>₱${item.unitPrice * item.qty}</span>
                        </div>
                    `).join("");
                }

                const formView = document.getElementById("checkoutFormView");
                const receiptView = document.getElementById("receiptView");

                if (formView) formView.style.display = "none";
                if (receiptView) receiptView.classList.add("active");

                // Save to local recent orders so customer can track later
                try {
                    let recents = JSON.parse(localStorage.getItem('kkeopi_recent_orders') || '[]');
                    recents = recents.filter(o => String(o.id) !== String(createdOrder.id));
                    recents.unshift({
                        id: createdOrder.id,
                        total: createdOrder.total_amount || totalAmount,
                        status: "PENDING",
                        date: new Date().toISOString(),
                        itemsSummary: cartItems.map(it => `${it.qty}x ${it.title}`).join(', ')
                    });
                    localStorage.setItem('kkeopi_recent_orders', JSON.stringify(recents.slice(0, 5)));
                } catch(e) {}

                cartItems = [];
                updateCartBadge();

                if (window.kopiClient) {
                    window.kopiClient.playChime('ping');
                }

                showToast(`Order #${createdOrder.id} placed! Kitchen is preparing.`);
            }, 1000);
        });
    }

    if (newOrderBtn) {
        newOrderBtn.addEventListener("click", () => {
            const formView = document.getElementById("checkoutFormView");
            const receiptView = document.getElementById("receiptView");
            if (receiptView) receiptView.classList.remove("active");
            if (formView) formView.style.display = "flex";
            closeCheckout();
        });
    }

    if (downloadReceiptBtn) {
        downloadReceiptBtn.addEventListener("click", () => {
            const ticketId = document.getElementById("receiptTicketId")?.textContent || "#KK-8888";
            const total = document.getElementById("receiptTotalPaid")?.textContent || "₱0";
            const summaryText = `KKEOPI FOOD CART RECEIPT\nOrder: ${ticketId}\nTotal: ${total}\nStatus: Brewing at Food Cart\nThank you for supporting KKEOPI!`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(summaryText).catch(() => {});
            }
            showToast(`Ticket ${ticketId} copied to clipboard!`);
        });
    }
}

function extractQuickCardData(card) {
    const title = card.getAttribute("data-title") || card.querySelector("h2")?.textContent || "Specialty Drink";
    const basePrice = parseInt(card.getAttribute("data-base-price") || "150", 10);
    const category = card.getAttribute("data-category") || "signature";
    const type = card.getAttribute("data-type") || (category === "pastries" ? "pastry" : "coffee");
    const img = card.querySelector("img")?.src || "";
    const desc = card.querySelector(".desc")?.textContent || "";

    const activeSize = card.querySelector(".size-chips .chip.active");
    const sizeVal = activeSize ? (activeSize.getAttribute("data-size") || activeSize.textContent.split(" ")[0]) : "Regular";
    const sizeExtra = activeSize ? parseInt(activeSize.getAttribute("data-extra") || "0", 10) : 0;

    const activeSugar = card.querySelector(".sugar-chips .chip.active");
    const sugarVal = activeSugar ? (activeSugar.getAttribute("data-sugar") || activeSugar.textContent) : "50%";

    const isPastry = category === "pastries" || type === "pastry";
    let unitPrice = basePrice;
    let customsList = [];

    if (isPastry) {
        customsList.push(sugarVal);
    } else {
        unitPrice += sizeExtra;
        customsList.push(sizeVal);
        if (sugarVal) customsList.push(`${sugarVal} sugar`);
    }

    const customsSummary = customsList.join(" • ");
    const qty = parseInt(card.querySelector(".quantity span")?.textContent || "1", 10);

    return {
        id: `${title}-${customsSummary}`,
        title,
        basePrice,
        unitPrice,
        category,
        type,
        img,
        desc,
        size: sizeVal,
        sizeExtra,
        milk: "Whole Milk",
        milkExtra: 0,
        sugar: sugarVal,
        ice: "Regular Ice",
        serve: sugarVal,
        addons: [],
        note: "",
        customsSummary,
        qty
    };
}

function addItemToCart(newItem) {
    const existing = cartItems.find(i => i.id === newItem.id);
    if (existing) {
        existing.qty += newItem.qty;
    } else {
        cartItems.push({ ...newItem });
    }
    updateCartBadge();
    renderCartModal();
}

function updateCartBadge() {
    const cartCountEl = document.getElementById("cartCount");
    const totalCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
    if (cartCountEl) cartCountEl.textContent = totalCount;
}

function calculateCartTotal() {
    return cartItems.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
}

function openCheckoutModal() {
    const checkoutModal = document.getElementById("checkoutModal");
    const checkoutBackdrop = document.getElementById("checkoutBackdrop");
    const formView = document.getElementById("checkoutFormView");
    const receiptView = document.getElementById("receiptView");

    if (receiptView) receiptView.classList.remove("active");
    if (formView) formView.style.display = "flex";

    renderCartModal();
    if (checkoutModal) checkoutModal.classList.add("open");
    if (checkoutBackdrop) checkoutBackdrop.classList.add("open");
}

function renderCartModal() {
    const itemsListEl = document.getElementById("cartItemsList");
    const modalItemCount = document.getElementById("modalItemCount");
    const subtotalEl = document.getElementById("summarySubtotal");
    const totalEl = document.getElementById("summaryTotal");
    const payBtnAmount = document.getElementById("payBtnAmount");
    const optionsSection = document.getElementById("checkoutOptionsSection");
    const custSection = document.getElementById("customerInfoSection");
    const paySection = document.getElementById("paymentMethodSection");
    const priceSection = document.getElementById("priceSummarySection");
    const confirmBtn = document.getElementById("confirmPayBtn");

    const totalCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
    const totalAmount = calculateCartTotal();

    if (modalItemCount) modalItemCount.textContent = totalCount;
    if (subtotalEl) subtotalEl.textContent = `₱${totalAmount}`;
    if (totalEl) totalEl.textContent = `₱${totalAmount}`;
    if (payBtnAmount) payBtnAmount.textContent = `₱${totalAmount}`;

    if (!itemsListEl) return;

    if (cartItems.length === 0) {
        itemsListEl.innerHTML = `
            <div class="empty-cart-state" id="emptyCartState">
                <div class="empty-cart-icon"><i class="fa-solid fa-mug-saucer"></i></div>
                <p class="empty-title">Your food cart is empty</p>
                <p class="empty-sub">Choose any delicious brew or fresh pastry to get started.</p>
            </div>
        `;
        if (optionsSection) optionsSection.style.display = "none";
        if (custSection) custSection.style.display = "none";
        if (paySection) paySection.style.display = "none";
        if (priceSection) priceSection.style.display = "none";
        if (confirmBtn) confirmBtn.style.display = "none";
        return;
    }

    if (optionsSection) optionsSection.style.display = "flex";
    if (custSection) custSection.style.display = "flex";
    if (paySection) paySection.style.display = "flex";
    if (priceSection) priceSection.style.display = "flex";
    if (confirmBtn) confirmBtn.style.display = "flex";

    itemsListEl.innerHTML = cartItems.map((item, index) => `
        <div class="cart-item-row" data-index="${index}">
            <div class="item-thumb-col">
                <img src="${item.img}" alt="${item.title}">
                <div class="item-details">
                    <span class="item-name">${item.title}</span>
                    <span class="item-customs">${item.customsSummary}</span>
                    <button class="item-edit-btn" data-index="${index}" title="Edit Customizations">
                        <i class="fa-solid fa-sliders"></i> Edit
                    </button>
                </div>
            </div>
            <div class="item-controls-col">
                <div class="item-qty-pill">
                    <button class="cart-minus-btn" data-index="${index}"><i class="fa-solid fa-minus"></i></button>
                    <span>${item.qty}</span>
                    <button class="cart-plus-btn" data-index="${index}"><i class="fa-solid fa-plus"></i></button>
                </div>
                <span class="item-price-col">₱${item.unitPrice * item.qty}</span>
                <button class="item-remove-btn" data-index="${index}" title="Remove item"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>
    `).join("");

    // Wire "Edit Customization" button inside cart row
    itemsListEl.querySelectorAll(".item-edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-index") || "0", 10);
            openCustomizerForCartItem(idx);
        });
    });

    // Wire item quantity buttons inside modal
    itemsListEl.querySelectorAll(".cart-plus-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-index") || "0", 10);
            if (cartItems[idx]) {
                cartItems[idx].qty++;
                updateCartBadge();
                renderCartModal();
            }
        });
    });

    itemsListEl.querySelectorAll(".cart-minus-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-index") || "0", 10);
            if (cartItems[idx]) {
                if (cartItems[idx].qty > 1) {
                    cartItems[idx].qty--;
                } else {
                    cartItems.splice(idx, 1);
                }
                updateCartBadge();
                renderCartModal();
            }
        });
    });

    itemsListEl.querySelectorAll(".item-remove-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-index") || "0", 10);
            const removed = cartItems.splice(idx, 1);
            if (removed.length > 0) {
                showToast(`Removed ${removed[0].title}`);
            }
            updateCartBadge();
            renderCartModal();
        });
    });
}

function bounceCart() {
    const trigger = document.getElementById("cartTrigger");
    if (trigger) {
        trigger.style.transform = "scale(1.2) translateY(-6px)";
        setTimeout(() => {
            trigger.style.transform = "";
        }, 250);
    }
}

function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2400);
}

/* ==========================================================================
   8. FAVORITE HEARTS
   ========================================================================== */
function initHeartFavorites() {
    document.querySelectorAll(".heart").forEach(heart => {
        heart.addEventListener("click", (e) => {
            e.stopPropagation();
            heart.classList.toggle("active");
            const icon = heart.querySelector("i");
            if (icon) {
                if (heart.classList.contains("active")) {
                    icon.classList.remove("fa-regular");
                    icon.classList.add("fa-solid");
                    showToast("Saved to favorites!");
                } else {
                    icon.classList.remove("fa-solid");
                    icon.classList.add("fa-regular");
                }
            }
        });
    });
}

/* ==========================================================================
   9. SUPABASE GOOGLE AUTHENTICATION INTEGRATION
   ========================================================================== */
function initGoogleAuthIntegration() {
    const client = window.kopiClient;
    const quickBtn = document.getElementById("googleQuickSignInBtn");
    const container = document.getElementById("googleAuthContainer");
    const custNameInput = document.getElementById("custName");
    const custEmailInput = document.getElementById("custEmail");

    function renderUserStatus(user) {
        if (!container) return;
        if (user) {
            if (custNameInput && !custNameInput.value) custNameInput.value = user.name;
            if (custEmailInput && !custEmailInput.value) custEmailInput.value = user.email;

            container.innerHTML = `
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop'}" 
                             alt="Avatar" class="rounded-circle" style="width: 28px; height: 28px; object-fit: cover; border: 1.5px solid #BB8C64;">
                        <div>
                            <div class="text-white small fw-bold" style="font-size: 0.82rem;">${escapeHtml(user.name)}</div>
                            <div class="text-secondary small" style="font-size: 0.72rem;"><i class="fa-brands fa-google text-warning me-1"></i> ${escapeHtml(user.email)}</div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill py-0 px-2 text-white-50" id="googleSignOutBtn" style="font-size: 0.72rem;">
                        Sign Out
                    </button>
                </div>
            `;
            const signOutBtn = document.getElementById("googleSignOutBtn");
            if (signOutBtn) {
                signOutBtn.addEventListener("click", () => {
                    if (client) client.logout();
                    renderUserStatus(null);
                    showToast("Signed out of Google account");
                });
            }
        } else {
            container.innerHTML = `
                <div class="d-flex align-items-center justify-content-between">
                    <span class="small text-secondary"><i class="fa-brands fa-google text-warning me-1"></i> Faster ordering with Google:</span>
                    <button type="button" class="btn btn-sm btn-outline-warning rounded-pill py-0 px-2" id="googleQuickSignInBtn" style="font-size: 0.75rem;">
                        <i class="fa-brands fa-google me-1"></i> Continue with Google
                    </button>
                </div>
            `;
            const newQuickBtn = document.getElementById("googleQuickSignInBtn");
            if (newQuickBtn) {
                newQuickBtn.addEventListener("click", handleGoogleSignIn);
            }
        }
    }

    async function handleGoogleSignIn() {
        if (!client) return;
        try {
            await client.signInWithGoogle();
        } catch (err) {
            showToast("Google sign in: " + (err.message || err));
        }
    }

    if (quickBtn) {
        quickBtn.addEventListener("click", handleGoogleSignIn);
    }

    if (client) {
        client.on("auth:change", (user) => {
            renderUserStatus(user);
        });
        client.on("auth:changed", (user) => {
            renderUserStatus(user);
        });
        renderUserStatus(client.getCurrentUser());
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

