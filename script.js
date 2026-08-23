/* ============================================================
   ShopEasy — storefront logic (no backend, LocalStorage cart)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Catalogue ---------- */
  const PRODUCTS = [
    {
      id: "elec-01",
      name: "Aura ANC Headphones",
      category: "Electronics",
      price: 7499,
      mrp: 9999,
      image: "/images/headphones.png",
      desc: "Over-ear active noise cancelling with 40-hour battery.",
    },
    {
      id: "elec-02",
      name: "Pulse Smartwatch 2",
      category: "Electronics",
      price: 4299,
      mrp: 5499,
      image: "/images/smartwatch.png",
      desc: "AMOLED display, SpO2 tracking and 10-day standby.",
    },
    {
      id: "elec-03",
      name: "Bolt Mini Speaker",
      category: "Electronics",
      price: 1899,
      mrp: 2499,
      image: "/images/speaker.png",
      desc: "Pocket Bluetooth speaker, IPX7 water resistant.",
    },
    {
      id: "fash-01",
      name: "Court Leather Sneakers",
      category: "Fashion",
      price: 2999,
      mrp: 3999,
      image: "/images/sneakers.png",
      desc: "Full-grain leather uppers on a cushioned cup sole.",
    },
    {
      id: "fash-02",
      name: "Indigo Denim Jacket",
      category: "Fashion",
      price: 2599,
      mrp: 3499,
      image: "/images/jacket.png",
      desc: "Heavyweight 12oz denim with a relaxed trucker cut.",
    },
    {
      id: "fash-03",
      name: "Everyday Canvas Tote",
      category: "Fashion",
      price: 999,
      mrp: 1399,
      image: "/images/tote.png",
      desc: "16oz cotton canvas with tan leather handles.",
    },
    {
      id: "home-01",
      name: "Linen Shade Table Lamp",
      category: "Home",
      price: 2199,
      mrp: 2899,
      image: "/images/lamp.png",
      desc: "Hand-thrown ceramic base with a warm linen shade.",
    },
    {
      id: "home-02",
      name: "Stoneware Mug Set of 4",
      category: "Home",
      price: 1299,
      mrp: 1799,
      image: "/images/mugs.png",
      desc: "Reactive-glaze stoneware, microwave and dishwasher safe.",
    },
    {
      id: "home-03",
      name: "Cotton Bedsheet Set",
      category: "Home",
      price: 1799,
      mrp: 2499,
      image: "/images/bedding.png",
      desc: "300 TC combed cotton, double bed with two covers.",
    },
  ];

  const STORAGE_KEY = "shopeasy.cart.v1";
  const FREE_SHIPPING_FROM = 999;
  const SHIPPING_FLAT = 79;

  /* ---------- Elements ---------- */
  const el = {
    grid: document.getElementById("product-grid"),
    empty: document.getElementById("empty"),
    count: document.getElementById("result-count"),
    filters: document.querySelectorAll("[data-filter]"),
    searchForm: document.getElementById("search-form"),
    search: document.getElementById("search"),
    cart: document.getElementById("cart"),
    cartBody: document.getElementById("cart-body"),
    cartOpen: document.getElementById("cart-open"),
    cartClose: document.getElementById("cart-close"),
    cartCount: document.getElementById("cart-count"),
    overlay: document.getElementById("overlay"),
    subtotal: document.getElementById("cart-subtotal"),
    shipping: document.getElementById("cart-shipping"),
    shipLabel: document.getElementById("ship-label"),
    total: document.getElementById("cart-total"),
    checkout: document.getElementById("checkout"),
    cartMsg: document.getElementById("cart-msg"),
    menuBtn: document.getElementById("menu-btn"),
    nav: document.getElementById("nav"),
    newsForm: document.getElementById("news-form"),
    newsMsg: document.getElementById("news-msg"),
    email: document.getElementById("email"),
    toast: document.getElementById("toast"),
    year: document.getElementById("year"),
  };

  /* ---------- State ---------- */
  let cart = load();
  let activeCategory = "all";
  let query = "";

  const rupees = (value) => "₹" + value.toLocaleString("en-IN");

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((line) => PRODUCTS.some((p) => p.id === line.id))
        .map((line) => ({ id: line.id, qty: Math.max(1, Math.min(99, Number(line.qty) || 1)) }));
    } catch (error) {
      console.log("[v0] Could not read cart from storage:", error);
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.log("[v0] Could not save cart:", error);
    }
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), 2200);
  }

  /* ---------- Product grid ---------- */
  function visibleProducts() {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      const byCategory = activeCategory === "all" || p.category === activeCategory;
      const byQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q);
      return byCategory && byQuery;
    });
  }

  function renderProducts() {
    const list = visibleProducts();

    el.grid.innerHTML = list
      .map(
        (p) => `
        <article class="card">
          <div class="card__media">
            <img src="${p.image}" alt="${p.name}" width="600" height="600" loading="lazy" />
            <span class="card__tag">${p.category}</span>
          </div>
          <div class="card__body">
            <h3 class="card__name">${p.name}</h3>
            <p class="card__desc">${p.desc}</p>
            <div class="card__foot">
              <p class="card__price">${rupees(p.price)}<s>${rupees(p.mrp)}</s></p>
              <button class="add" type="button" data-add="${p.id}">Add to Cart</button>
            </div>
          </div>
        </article>`
      )
      .join("");

    el.empty.hidden = list.length > 0;
    el.count.textContent =
      list.length === PRODUCTS.length
        ? `${PRODUCTS.length} products`
        : `${list.length} of ${PRODUCTS.length} products`;
  }

  /* ---------- Cart ---------- */
  function findProduct(id) {
    return PRODUCTS.find((p) => p.id === id);
  }

  function totals() {
    const subtotal = cart.reduce((sum, line) => sum + findProduct(line.id).price * line.qty, 0);
    const items = cart.reduce((sum, line) => sum + line.qty, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FLAT;
    return { subtotal, items, shipping, total: subtotal + shipping };
  }

  function renderCart() {
    const { subtotal, items, shipping, total } = totals();

    el.cartCount.textContent = String(items);
    el.cartCount.dataset.empty = items === 0 ? "true" : "false";

    if (cart.length === 0) {
      el.cartBody.innerHTML = `<p class="cart__empty">Your cart is empty.<br />Add something you love from the catalogue.</p>`;
    } else {
      el.cartBody.innerHTML = cart
        .map((line) => {
          const p = findProduct(line.id);
          return `
          <div class="line">
            <img src="${p.image}" alt="${p.name}" width="64" height="64" />
            <div>
              <p class="line__name">${p.name}</p>
              <p class="line__meta">${p.category} · ${rupees(p.price)}</p>
              <div class="line__foot">
                <span class="qty">
                  <button type="button" data-dec="${p.id}" aria-label="Decrease quantity of ${p.name}">−</button>
                  <span>${line.qty}</span>
                  <button type="button" data-inc="${p.id}" aria-label="Increase quantity of ${p.name}">+</button>
                </span>
                <strong>${rupees(p.price * line.qty)}</strong>
                <button class="line__remove" type="button" data-remove="${p.id}">Remove</button>
              </div>
            </div>
          </div>`;
        })
        .join("");
    }

    el.subtotal.textContent = rupees(subtotal);
    el.shipping.textContent = shipping === 0 ? "Free" : rupees(shipping);
    el.shipLabel.textContent =
      subtotal > 0 && shipping > 0
        ? `Shipping (free over ${rupees(FREE_SHIPPING_FROM)})`
        : "Shipping";
    el.total.textContent = rupees(total);
    el.checkout.disabled = cart.length === 0;
  }

  function addToCart(id) {
    const line = cart.find((item) => item.id === id);
    if (line) {
      line.qty = Math.min(99, line.qty + 1);
    } else {
      cart.push({ id, qty: 1 });
    }
    save();
    renderCart();
    toast(`${findProduct(id).name} added to cart`);
  }

  function changeQty(id, delta) {
    const line = cart.find((item) => item.id === id);
    if (!line) return;
    line.qty += delta;
    if (line.qty < 1) {
      cart = cart.filter((item) => item.id !== id);
    } else {
      line.qty = Math.min(99, line.qty);
    }
    save();
    renderCart();
  }

  function removeFromCart(id) {
    cart = cart.filter((item) => item.id !== id);
    save();
    renderCart();
    toast("Item removed");
  }

  /* ---------- Drawer ---------- */
  function openCart() {
    el.cart.classList.add("is-open");
    el.cart.setAttribute("aria-hidden", "false");
    el.cartOpen.setAttribute("aria-expanded", "true");
    el.overlay.hidden = false;
    document.body.classList.add("is-locked");
    el.cartClose.focus();
  }

  function closeCart() {
    el.cart.classList.remove("is-open");
    el.cart.setAttribute("aria-hidden", "true");
    el.cartOpen.setAttribute("aria-expanded", "false");
    el.overlay.hidden = true;
    document.body.classList.remove("is-locked");
    el.cartMsg.textContent = "";
    el.cartOpen.focus();
  }

  /* ---------- Events ---------- */
  el.grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add]");
    if (!button) return;
    addToCart(button.dataset.add);
    button.classList.add("is-added");
    button.textContent = "Added ✓";
    setTimeout(() => {
      button.classList.remove("is-added");
      button.textContent = "Add to Cart";
    }, 1200);
  });

  el.cartBody.addEventListener("click", (event) => {
    const inc = event.target.closest("[data-inc]");
    const dec = event.target.closest("[data-dec]");
    const remove = event.target.closest("[data-remove]");
    if (inc) changeQty(inc.dataset.inc, 1);
    else if (dec) changeQty(dec.dataset.dec, -1);
    else if (remove) removeFromCart(remove.dataset.remove);
  });

  el.filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.filter;
      el.filters.forEach((b) => b.classList.toggle("is-active", b === button));
      renderProducts();
    });
  });

  el.search.addEventListener("input", (event) => {
    query = event.target.value;
    renderProducts();
  });

  el.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    document.getElementById("products").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  el.cartOpen.addEventListener("click", openCart);
  el.cartClose.addEventListener("click", closeCart);
  el.overlay.addEventListener("click", closeCart);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && el.cart.classList.contains("is-open")) closeCart();
  });

  el.checkout.addEventListener("click", () => {
    const { total, items } = totals();
    el.cartMsg.textContent = `Demo checkout — ${items} item(s) for ${rupees(total)}. Cart cleared.`;
    cart = [];
    save();
    renderCart();
    toast("Order placed. Thanks for shopping!");
  });

  el.menuBtn.addEventListener("click", () => {
    const open = el.nav.classList.toggle("is-open");
    el.menuBtn.setAttribute("aria-expanded", String(open));
  });

  el.nav.addEventListener("click", (event) => {
    if (event.target.tagName === "A") {
      el.nav.classList.remove("is-open");
      el.menuBtn.setAttribute("aria-expanded", "false");
    }
  });

  el.newsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = el.email.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    el.newsMsg.textContent = valid
      ? `Thanks! We'll write to ${value} once a week.`
      : "Please enter a valid email address.";
    if (valid) el.newsForm.reset();
  });

  /* ---------- Boot ---------- */
  el.year.textContent = String(new Date().getFullYear());
  renderProducts();
  renderCart();
})();
