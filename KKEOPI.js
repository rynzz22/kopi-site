/* ==========================================================
   KKEOPI - CRAFTED COFFEE & FOOD CART JAVASCRIPT ENGINE
   - Interactive Liquid Coffee Canvas & Tactile Ripples
   - Floating Steaming Coffee Cups & Warm Crema Embers
   - Liquid Frosted Nav with Physics-based Sliding Pill
   - Mobile Hamburger Navigation Drawer
   - Minimal Food Cart Menu Filter, Custom Chips & Dynamic Price
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initLiquidCoffeeCanvas();
    initLiquidSlidingPillNav();
    initMobileNavDrawer();
    initFoodCartMenu();
    initPaymentAndCheckoutSystem();
    initParallaxAndGlow();
    initRippleButtons();
    initFloatingCards();
});

/* ==========================================================
   1. INTERACTIVE LIQUID COFFEE CANVAS & AMBIENT ELEMENTS
========================================================== */
function initLiquidCoffeeCanvas() {
    const canvas = document.getElementById("coffeeRippleCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.scale(dpr, dpr);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const ripples = [];
    const droplets = [];
    const floatingCoffees = [];

    const cremaColors = [
        { r: 187, g: 140, b: 100 }, // Caramel Crema
        { r: 230, g: 200, b: 167 }, // Latte foam
        { r: 107, g: 74,  b: 53  }, // Espresso roast
        { r: 255, g: 245, b: 230 }  // Milk sheen
    ];

    let mouseX = -1000;
    let mouseY = -1000;

    /* ----------------------------------------------------
       FLOATING STEAMING COFFEE CUP
    ---------------------------------------------------- */
    class FloatingCoffeeCup {
        constructor(isInitial = false) {
            this.reset(isInitial);
        }

        reset(isInitial = false) {
            this.x = Math.random() * width;
            this.y = isInitial ? Math.random() * height : -45 - Math.random() * 80;
            this.depth = 0.4 + Math.random() * 0.5;
            this.scale = (0.7 + Math.random() * 0.5) * this.depth;
            this.speedY = (0.35 + Math.random() * 0.55) * this.depth;
            this.swaySpeed = 0.012 + Math.random() * 0.015;
            this.swayOffset = Math.random() * Math.PI * 2;
            this.angle = (Math.random() - 0.5) * 0.3;
            this.rotSpeed = (Math.random() - 0.5) * 0.008;
            this.opacity = (0.3 + Math.random() * 0.38) * this.depth;
            this.steamPhase = Math.random() * Math.PI * 2;
            this.vx = 0;
            this.vy = 0;
        }

        update() {
            this.y += this.speedY + this.vy;
            this.swayOffset += this.swaySpeed;
            this.x += Math.sin(this.swayOffset) * 0.9 * this.depth + this.vx;
            this.angle += this.rotSpeed;
            this.steamPhase += 0.04;

            this.vx *= 0.95;
            this.vy *= 0.95;

            // Mouse proximity push
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const dist = Math.hypot(dx, dy);
            const repelRadius = 120;

            if (dist < repelRadius && dist > 0) {
                const force = (1 - dist / repelRadius) * 2.0 * this.depth;
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
            }

            if (this.y > height + 60) {
                this.reset(false);
            }
            if (this.x < -50) this.x = width + 40;
            if (this.x > width + 50) this.x = -40;
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.scale(this.scale, this.scale);
            ctx.globalAlpha = this.opacity;

            // 1. Steam Trails rising
            ctx.strokeStyle = `rgba(255, 245, 235, ${0.45 * this.depth})`;
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';

            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                const sx = i * 6;
                const sy = -16;
                const wave1 = Math.sin(this.steamPhase + i) * 4;
                const wave2 = Math.cos(this.steamPhase + i * 1.5) * 4;
                ctx.moveTo(sx, sy);
                ctx.bezierCurveTo(sx + wave1, sy - 8, sx + wave2, sy - 16, sx + wave1 * 0.5, sy - 24);
                ctx.stroke();
            }

            // 2. Coffee Cup Body (Ceramic / Latte Mug)
            ctx.beginPath();
            ctx.moveTo(-14, -12);
            ctx.lineTo(14, -12);
            ctx.bezierCurveTo(13, 8, 9, 14, -0, 14);
            ctx.bezierCurveTo(-9, 14, -13, 8, -14, -12);
            ctx.closePath();

            const cupGrad = ctx.createLinearGradient(-14, -12, 14, 14);
            cupGrad.addColorStop(0, '#FFFFFF');
            cupGrad.addColorStop(0.6, '#F5ECE3');
            cupGrad.addColorStop(1, '#DFCABB');
            ctx.fillStyle = cupGrad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(107, 74, 53, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // 3. Coffee Liquid Surface (Espresso Crema)
            ctx.beginPath();
            ctx.ellipse(0, -12, 13, 4, 0, 0, Math.PI * 2);
            const cremaGrad = ctx.createRadialGradient(0, -12, 2, 0, -12, 12);
            cremaGrad.addColorStop(0, '#D4A373');
            cremaGrad.addColorStop(0.7, '#8C5835');
            cremaGrad.addColorStop(1, '#4A2B18');
            ctx.fillStyle = cremaGrad;
            ctx.fill();

            // 4. Cup Handle
            ctx.beginPath();
            ctx.arc(15, -2, 7, -Math.PI * 0.4, Math.PI * 0.6);
            ctx.strokeStyle = '#DFCABB';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // 5. Saucer underneath
            ctx.beginPath();
            ctx.ellipse(0, 15, 18, 3, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#EBDCCB';
            ctx.fill();
            ctx.strokeStyle = 'rgba(107, 74, 53, 0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
        }
    }

    /* ----------------------------------------------------
       WARM AROMATIC CREMA EMBER
    ---------------------------------------------------- */
    class AromaticEmber {
        constructor(isInitial = false) {
            this.reset(isInitial);
        }

        reset(isInitial = false) {
            this.x = Math.random() * width;
            this.y = isInitial ? Math.random() * height : height + 10 + Math.random() * 40;
            this.depth = 0.3 + Math.random() * 0.7;
            this.radius = (1.5 + Math.random() * 3.5) * this.depth;
            this.speedY = -(0.3 + Math.random() * 0.7) * this.depth; // Drifts upward
            this.swaySpeed = 0.02 + Math.random() * 0.03;
            this.swayOffset = Math.random() * Math.PI * 2;
            this.opacity = (0.2 + Math.random() * 0.4) * this.depth;
            this.color = cremaColors[Math.floor(Math.random() * cremaColors.length)];
        }

        update() {
            this.y += this.speedY;
            this.swayOffset += this.swaySpeed;
            this.x += Math.sin(this.swayOffset) * 0.6;

            if (this.y < -20) {
                this.reset(false);
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
            ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.5)`;
            ctx.shadowBlur = 8 * this.depth;
            ctx.fill();
            ctx.restore();
        }
    }

    // Populate Background Elements ONLY on homepage
    const isHomePage = Boolean(document.querySelector('.hero') && !document.querySelector('.products-grid') && !document.querySelector('.gallery-grid') && !document.querySelector('.about-grid'));

    if (isHomePage) {
        const cupCount = Math.min(Math.floor(window.innerWidth / 220), 5);
        for (let i = 0; i < cupCount; i++) {
            floatingCoffees.push(new FloatingCoffeeCup(true));
        }

        const emberCount = 12;
        for (let i = 0; i < emberCount; i++) {
            floatingCoffees.push(new AromaticEmber(true));
        }
    }

    /* ----------------------------------------------------
       RIPPLES & DROPLET SPLASHES
    ---------------------------------------------------- */
    class CoffeeRipple {
        constructor(x, y, power = 1) {
            this.x = x;
            this.y = y;
            this.radius = 2;
            this.maxRadius = Math.min(180 * power, 260);
            this.speed = (2.2 + Math.random() * 1.2) * power;
            this.opacity = 0.65;
            this.decay = 0.008 / power;
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.08;
            this.lineWidth = 2.5 * power;
            this.color = cremaColors[Math.floor(Math.random() * cremaColors.length)];
        }

        update() {
            this.radius += this.speed;
            this.speed *= 0.985;
            this.opacity -= this.decay;
            this.wobblePhase += this.wobbleSpeed;
            return this.opacity > 0 && this.radius < this.maxRadius;
        }

        draw(ctx) {
            if (this.opacity <= 0) return;

            ctx.save();
            ctx.beginPath();

            const segments = 24;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const distortion = Math.sin(angle * 3 + this.wobblePhase) * (this.radius * 0.035);
                const r = Math.max(0, this.radius + distortion);
                const px = this.x + Math.cos(angle) * r;
                const py = this.y + Math.sin(angle) * r;

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }

            ctx.closePath();

            ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${Math.max(0, this.opacity * 0.55)})`;
            ctx.lineWidth = this.lineWidth;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0, this.radius * 0.72), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 245, 235, ${Math.max(0, this.opacity * 0.28)})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
        }
    }

    class CoffeeDroplet {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.8 + Math.random() * 4.5;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed - 1.2;
            this.gravity = 0.12;
            this.radius = 1.8 + Math.random() * 2.6;
            this.opacity = 0.85;
            this.color = cremaColors[Math.floor(Math.random() * cremaColors.length)];
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += this.gravity;
            this.vx *= 0.98;
            this.opacity -= 0.022;
            return this.opacity > 0;
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
            ctx.fill();
            ctx.restore();
        }
    }

    function addRipple(x, y, power = 1) {
        if (ripples.length > 35) ripples.shift();
        ripples.push(new CoffeeRipple(x, y, power));
    }

    function addSplash(x, y, count = 7) {
        addRipple(x, y, 1.4);
        for (let i = 0; i < count; i++) {
            droplets.push(new CoffeeDroplet(x, y));
        }

        // Nudge nearby floating coffees
        floatingCoffees.forEach(item => {
            const dx = item.x - x;
            const dy = item.y - y;
            const dist = Math.hypot(dx, dy);
            if (dist < 180 && dist > 0) {
                item.vx += (dx / dist) * 4.5;
                item.vy += (dy / dist) * 4.5;
                if (item.rotSpeed !== undefined) {
                    item.rotSpeed += (Math.random() - 0.5) * 0.04;
                }
            }
        });
    }

    let lastMoveTime = 0;
    let lastX = 0;
    let lastY = 0;

    window.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        const now = performance.now();
        const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);

        if (dist > 35 && now - lastMoveTime > 45) {
            const speedScale = Math.min(dist / 40, 1.5);
            addRipple(e.clientX, e.clientY, 0.75 * speedScale);
            lastMoveTime = now;
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });

    window.addEventListener("mouseleave", () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    window.addEventListener("mousedown", (e) => {
        addSplash(e.clientX, e.clientY, 8);
    });

    window.addEventListener("touchmove", (e) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
            addRipple(touch.clientX, touch.clientY, 0.9);
        }
    }, { passive: true });

    window.addEventListener("touchstart", (e) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
            addSplash(touch.clientX, touch.clientY, 6);
        }
    }, { passive: true });

    /* ----------------------------------------------------
       MAIN ANIMATION LOOP
    ---------------------------------------------------- */
    function animate() {
        ctx.clearRect(0, 0, width, height);

        // 1. Draw Floating Coffee Cups & Warm Crema Embers
        for (let i = 0; i < floatingCoffees.length; i++) {
            const coffee = floatingCoffees[i];
            coffee.update();
            coffee.draw(ctx);
        }

        // 2. Draw Liquid Ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
            const ripple = ripples[i];
            if (ripple.update()) {
                ripple.draw(ctx);
            } else {
                ripples.splice(i, 1);
            }
        }

        // 3. Draw Splash Droplets
        for (let i = droplets.length - 1; i >= 0; i--) {
            const drop = droplets[i];
            if (drop.update()) {
                drop.draw(ctx);
            } else {
                droplets.splice(i, 1);
            }
        }

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

/* ==========================================================
   2. LIQUID SLIDING PILL NAVIGATION INDICATOR
========================================================== */
function initLiquidSlidingPillNav() {
    const navWrapper = document.querySelector(".nav-links-wrapper");
    const pill = document.getElementById("navPill");
    const navList = document.getElementById("navList");

    if (!navWrapper || !pill || !navList) return;

    const navItems = navList.querySelectorAll("li");
    let activeItem = navList.querySelector("li.active") || navItems[0];

    function movePillTo(element, squish = false) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const parentRect = navWrapper.getBoundingClientRect();

        const offsetLeft = rect.left - parentRect.left;
        const itemWidth = rect.width;

        pill.style.opacity = "1";
        pill.style.width = `${itemWidth}px`;
        pill.style.transform = `translateX(${offsetLeft}px) ${squish ? "scaleX(1.06)" : "scaleX(1)"}`;
    }

    if (activeItem) {
        setTimeout(() => {
            movePillTo(activeItem);
        }, 100);
    }

    navItems.forEach(item => {
        item.addEventListener("mouseenter", () => {
            movePillTo(item, true);
        });
    });

    navWrapper.addEventListener("mouseleave", () => {
        if (activeItem) {
            movePillTo(activeItem, false);
        } else {
            pill.style.opacity = "0";
        }
    });

    window.addEventListener("resize", () => {
        if (activeItem) {
            movePillTo(activeItem, false);
        }
    });
}

/* ==========================================================
   3. MOBILE RESPONSIVE HAMBURGER DRAWER
========================================================== */
function initMobileNavDrawer() {
    const mobileBtn = document.getElementById("mobileMenuBtn");
    const drawer = document.getElementById("mobileDrawer");
    const drawerClose = document.getElementById("drawerClose");
    const backdrop = document.getElementById("drawerBackdrop");

    if (!drawer) return;

    function openDrawer() {
        drawer.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeDrawer() {
        drawer.classList.remove("open");
        document.body.style.overflow = "";
    }

    if (mobileBtn) mobileBtn.addEventListener("click", openDrawer);
    if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && drawer.classList.contains("open")) {
            closeDrawer();
        }
    });
}

/* ==========================================================
   4. MINIMAL FOOD CART INTERACTIONS & CHIPS
========================================================== */
function initFoodCartMenu() {
    // 1. Category Filter Switching
    const filterButtons = document.querySelectorAll(".filter-chip");
    const cards = document.querySelectorAll(".cart-card, .productCard, .gallery-card");

    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const filter = btn.getAttribute("data-filter");

            cards.forEach(card => {
                const category = card.getAttribute("data-category");
                if (filter === "all" || category === filter) {
                    card.style.display = "flex";
                } else {
                    card.style.display = "none";
                }
            });
        });
    });

    // Gallery Card Tap
    document.querySelectorAll(".gallery-card").forEach(card => {
        card.addEventListener("click", () => {
            const title = card.querySelector("h3")?.textContent || "Specialty Item";
            showToast(`${title} — Freshly prepared at our cart!`);
        });
    });

    // 2. Chip Option Selectors & Dynamic Pricing
    cards.forEach(card => {
        const basePrice = parseInt(card.getAttribute("data-base-price") || "150", 10);
        const priceTag = card.querySelector(".price-tag");

        // Size chips with extra cost
        const sizeChips = card.querySelectorAll(".size-chips .chip");
        sizeChips.forEach(chip => {
            chip.addEventListener("click", () => {
                sizeChips.forEach(c => c.classList.remove("active"));
                chip.classList.add("active");

                const extra = parseInt(chip.getAttribute("data-extra") || "0", 10);
                if (priceTag) {
                    priceTag.textContent = `₱${basePrice + extra}`;
                }
            });
        });

        // Other chips in the card
        card.querySelectorAll(".chips:not(.size-chips)").forEach(group => {
            const chips = group.querySelectorAll(".chip");
            chips.forEach(chip => {
                chip.addEventListener("click", () => {
                    chips.forEach(c => c.classList.remove("active"));
                    chip.classList.add("active");
                });
            });
        });

        // Quantity controls
        let qty = 1;
        const minus = card.querySelector(".minus");
        const plus = card.querySelector(".plus");
        const qtySpan = card.querySelector(".quantity span");

        if (minus && plus && qtySpan) {
            plus.onclick = () => {
                qty++;
                qtySpan.textContent = qty;
            };

            minus.onclick = () => {
                if (qty > 1) {
                    qty--;
                    qtySpan.textContent = qty;
                }
            };
        }
    });

    // 3. Heart Favorite Toggle
    document.querySelectorAll(".heart").forEach(button => {
        button.addEventListener("click", () => {
            button.classList.toggle("active");
            const icon = button.querySelector("i");
            if (icon) {
                if (button.classList.contains("active")) {
                    icon.classList.remove("fa-regular");
                    icon.classList.add("fa-solid");
                    showToast("Saved to favorites");
                } else {
                    icon.classList.remove("fa-solid");
                    icon.classList.add("fa-regular");
                    showToast("Removed from favorites");
                }
            }
        });
    });
}

/* ==========================================================
   5. COMPLETE MINIMAL PAYMENT & CHECKOUT ENGINE
========================================================== */
let cartItems = [];

function initPaymentAndCheckoutSystem() {
    const cartTrigger = document.getElementById("cartTrigger");
    const checkoutModal = document.getElementById("checkoutModal");
    const checkoutBackdrop = document.getElementById("checkoutBackdrop");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    const clearCartBtn = document.getElementById("clearCartBtn");
    const confirmPayBtn = document.getElementById("confirmPayBtn");
    const newOrderBtn = document.getElementById("newOrderBtn");
    const downloadReceiptBtn = document.getElementById("downloadReceiptBtn");

    // 1. Wire "+ Add to Cart" buttons
    document.querySelectorAll(".cart.add-btn, .cart").forEach(button => {
        button.addEventListener("click", () => {
            const card = button.closest(".cart-card") || button.closest(".productCard");
            if (!card) return;

            const item = extractCardData(card);
            addItemToCart(item);
            showToast(`Added ${item.qty}× ${item.title} to food cart!`);
            bounceCart();
        });
    });

    // 2. Wire "⚡ Buy Now" buttons (Instant Add & Open Checkout)
    document.querySelectorAll(".buy-now-btn").forEach(button => {
        button.addEventListener("click", () => {
            const card = button.closest(".cart-card") || button.closest(".productCard");
            if (!card) return;

            const item = extractCardData(card);
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
    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeCheckoutModal);
    if (checkoutBackdrop) checkoutBackdrop.addEventListener("click", closeCheckoutModal);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && checkoutModal && checkoutModal.classList.contains("open")) {
            closeCheckoutModal();
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

    // 8. "Place Order & Pay" Brewing Animation & Receipt Flow
    if (confirmPayBtn) {
        confirmPayBtn.addEventListener("click", () => {
            if (cartItems.length === 0) {
                showToast("Your cart is empty! Please select an item first.");
                return;
            }

            const totalAmount = calculateCartTotal();
            const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked')?.value || "GCash / Maya";
            const selectedPickup = document.querySelector('input[name="pickupStyle"]:checked')?.value || "To-Go Cup & Bag";
            const custName = document.getElementById("custName")?.value.trim() || "Valued Customer";

            // Phase 1: Morph button into brewing state
            confirmPayBtn.classList.add("is-brewing");
            const loaderText = confirmPayBtn.querySelector(".loader-text");
            const barFill = confirmPayBtn.querySelector(".loader-bar-fill");

            if (barFill) barFill.style.width = "0%";
            setTimeout(() => { if (barFill) barFill.style.width = "100%"; }, 50);

            if (loaderText) loaderText.textContent = "Grinding fresh beans & brewing...";

            setTimeout(() => {
                if (loaderText) loaderText.textContent = "Pouring silky crema & preparing cup...";
            }, 850);

            setTimeout(() => {
                if (loaderText) loaderText.textContent = "Processing food cart payment...";
            }, 1500);

            // Phase 2: Finish brewing, celebrate with confetti, & show receipt
            setTimeout(() => {
                confirmPayBtn.classList.remove("is-brewing");
                if (barFill) barFill.style.width = "0%";

                createPaymentConfetti();

                // Populate Receipt
                const ticketId = `#KK-${Math.floor(1000 + Math.random() * 9000)}`;
                const receiptTicketEl = document.getElementById("receiptTicketId");
                const receiptCustNameEl = document.getElementById("receiptCustName");
                const receiptOrderTypeEl = document.getElementById("receiptOrderType");
                const receiptPayMethodEl = document.getElementById("receiptPaymentMethod");
                const receiptTotalEl = document.getElementById("receiptTotalPaid");
                const receiptItemsListEl = document.getElementById("receiptItemsList");

                if (receiptTicketEl) receiptTicketEl.textContent = ticketId;
                if (receiptCustNameEl) receiptCustNameEl.textContent = custName;
                if (receiptOrderTypeEl) receiptOrderTypeEl.textContent = selectedPickup.includes("To-Go") ? "To-Go Takeaway" : "Dine-In Bench";
                if (receiptPayMethodEl) receiptPayMethodEl.textContent = `${selectedPayment} (Confirmed)`;
                if (receiptTotalEl) receiptTotalEl.textContent = `₱${totalAmount}`;

                // Populate itemized breakdown in receipt
                if (receiptItemsListEl) {
                    receiptItemsListEl.innerHTML = cartItems.map(item => `
                        <div class="receipt-item-row">
                            <span><strong>${item.qty}×</strong> ${item.title} (${item.customsSummary})</span>
                            <span>₱${item.unitPrice * item.qty}</span>
                        </div>
                    `).join("");
                }

                // Switch views
                const formView = document.getElementById("checkoutFormView");
                const receiptView = document.getElementById("receiptView");

                if (formView) formView.style.display = "none";
                if (receiptView) receiptView.classList.add("active");

                // Clear active cart & reset count
                cartItems = [];
                updateCartBadge();

                showToast(`Order ${ticketId} placed! Brewing now.`);
            }, 2100);
        });
    }

    // 9. Receipt View Actions
    if (newOrderBtn) {
        newOrderBtn.addEventListener("click", () => {
            closeCheckoutModal();
        });
    }

    if (downloadReceiptBtn) {
        downloadReceiptBtn.addEventListener("click", () => {
            const ticketId = document.getElementById("receiptTicketId")?.textContent || "#KK-8888";
            const total = document.getElementById("receiptTotalPaid")?.textContent || "₱0";
            
            // Copy receipt summary to clipboard
            const summaryText = `KKEOPI FOOD CART RECEIPT\nOrder Ticket: ${ticketId}\nTotal: ${total}\nStatus: Brewing at Food Cart\nThank you for supporting KKEOPI!`;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(summaryText).catch(() => {});
            }

            showToast(`Ticket ${ticketId} saved! Show at food cart counter.`);
        });
    }
}

/* ----------------------------------------------------
   EXTRACT PRODUCT CARD DATA
---------------------------------------------------- */
function extractCardData(card) {
    const rawTitle = card.querySelector("h2")?.textContent || "Specialty Drink";
    const title = rawTitle.replace(/^[^\w가-힣a-zA-Z0-9]+/, "").trim(); // Clean leading emoji
    
    const basePrice = parseInt(card.getAttribute("data-base-price") || "150", 10);
    const activeSizeChip = card.querySelector(".size-chips .chip.active");
    const sizeExtra = activeSizeChip ? parseInt(activeSizeChip.getAttribute("data-extra") || "0", 10) : 0;
    const sizeLabel = activeSizeChip ? activeSizeChip.textContent.split(" ")[0] : "Reg";

    const otherActiveChips = Array.from(card.querySelectorAll(".chips:not(.size-chips) .chip.active"))
        .map(c => c.textContent.trim());

    const customs = [sizeLabel, ...otherActiveChips];
    const customsSummary = customs.join(", ");

    const qtySpan = card.querySelector(".quantity span");
    const qty = qtySpan ? parseInt(qtySpan.textContent || "1", 10) : 1;

    const img = card.querySelector("img")?.src || "";
    const unitPrice = basePrice + sizeExtra;

    return {
        id: `${title}-${customsSummary}`,
        title,
        unitPrice,
        sizeLabel,
        customsSummary,
        qty,
        img
    };
}

/* ----------------------------------------------------
   CART DATA MANAGEMENT & MODAL RENDERING
---------------------------------------------------- */
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

function renderCartModal() {
    const itemsListEl = document.getElementById("cartItemsList");
    const emptyStateEl = document.getElementById("emptyCartState");
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
            if (cartItems[idx]) {
                const removedName = cartItems[idx].title;
                cartItems.splice(idx, 1);
                updateCartBadge();
                renderCartModal();
                showToast(`Removed ${removedName}`);
            }
        });
    });
}

function openCheckoutModal() {
    const modal = document.getElementById("checkoutModal");
    const backdrop = document.getElementById("checkoutBackdrop");
    const formView = document.getElementById("checkoutFormView");
    const receiptView = document.getElementById("receiptView");

    if (!modal || !backdrop) return;

    // Reset views
    if (formView) formView.style.display = "flex";
    if (receiptView) receiptView.classList.remove("active");

    renderCartModal();

    backdrop.classList.add("open");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeCheckoutModal() {
    const modal = document.getElementById("checkoutModal");
    const backdrop = document.getElementById("checkoutBackdrop");

    if (modal) modal.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    document.body.style.overflow = "";
}

/* ----------------------------------------------------
   CELEBRATION CONFETTI BURST
---------------------------------------------------- */
function createPaymentConfetti() {
    const colors = ["#BB8C64", "#E6C8A7", "#4B2F20", "#10B981", "#F59E0B", "#FFF2E2"];
    const count = 40;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement("div");
        particle.className = "confetti-particle";

        const size = Math.random() * 8 + 6;
        particle.style.width = `${size}px`;
        particle.style.height = `${size * (Math.random() > 0.5 ? 1.4 : 1)}px`;
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = `50%`;
        particle.style.top = `45%`;

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 260 + 80;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance + 60; // Bias downward
        const rot = (Math.random() - 0.5) * 720;

        particle.style.setProperty("--tx", `${tx}px`);
        particle.style.setProperty("--ty", `${ty}px`);
        particle.style.setProperty("--rot", `${rot}deg`);

        document.body.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 2300);
    }
}

/* ==========================================================
   5. TOAST NOTIFICATION
========================================================== */
function showToast(text) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = text;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 20);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            toast.remove();
        }, 350);
    }, 2200);
}

/* ==========================================================
   6. CART BOUNCE
========================================================== */
function bounceCart() {
    const cart = document.querySelector(".floatingCart");
    if (!cart) return;

    cart.animate([
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-14px) scale(1.12)" },
        { transform: "translateY(0) scale(1)" }
    ], {
        duration: 400,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)"
    });
}

/* ==========================================================
   7. PARALLAX & AMBIENT GLOW
========================================================== */
function initParallaxAndGlow() {
    const glow = document.querySelector(".mouseGlow");
    const wave = document.querySelector(".wave");

    document.addEventListener("mousemove", (e) => {
        const x = e.clientX;
        const y = e.clientY;

        if (glow) {
            glow.style.transform = `translate(${x - 160}px, ${y - 160}px)`;
        }

        if (wave) {
            const moveX = (window.innerWidth / 2 - x) / 45;
            const moveY = (window.innerHeight / 2 - y) / 45;
            wave.style.transform = `translateY(calc(-50% + ${moveY}px)) translateX(${moveX}px)`;
        }
    });
}

/* ==========================================================
   8. BUTTON RIPPLE EFFECT
========================================================== */
function initRippleButtons() {
    document.querySelectorAll("button, .buttons a, .order").forEach(button => {
        button.addEventListener("click", (e) => {
            const circle = document.createElement("span");
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            circle.style.width = diameter + "px";
            circle.style.height = diameter + "px";
            circle.style.left = (e.offsetX - diameter / 2) + "px";
            circle.style.top = (e.offsetY - diameter / 2) + "px";
            circle.classList.add("ripple");

            button.appendChild(circle);

            setTimeout(() => {
                circle.remove();
            }, 600);
        });
    });
}

/* ==========================================================
   9. 3D CARD INTERACTIONS
========================================================== */
function initFloatingCards() {
    document.querySelectorAll(".cart-card, .productCard").forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const rotateY = (x - rect.width / 2) / 35;
            const rotateX = (rect.height / 2 - y) / 35;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "";
        });
    });
}
