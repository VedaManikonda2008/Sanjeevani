/* ==========================================
   SANJEEVANI
   WISHLIST + CART PAGE
========================================== */

const collectionProfile = JSON.parse(
  localStorage.getItem("sanjeevaniProfile") || "null",
);

function collectionStorageKey(name) {
  const email = collectionProfile?.email?.trim().toLowerCase();
  return email ? `${name}:${encodeURIComponent(email)}` : name;
}

function readCollection(name) {
  const saved = JSON.parse(
    localStorage.getItem(collectionStorageKey(name)) || "[]",
  );

  return saved.map((entry) => {
    if (typeof entry === "string") {
      return {
        id: entry,
        name: entry,
        image: "",
        price: 0,
        quantity: 1,
      };
    }

    const itemName = entry.name || "Product";

    return {
      ...entry,
      id: String(entry.id || itemName),
      name: itemName,
      image: entry.image || "",
      price: Number(entry.price ?? entry.unitPrice) || 0,
      quantity: Number(entry.quantity) || 1,
    };
  });
}

let wishlist = readCollection("sanjeevaniWishlist");
let cart = readCollection("sanjeevaniCart");

/* ==========================================
   LOAD PRODUCT DATA
========================================== */

async function loadProductCatalog() {
  const response = await fetch("products.html", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not load products.html (${response.status})`);
  }

  const html = await response.text();

  const parser = new DOMParser();

  const doc = parser.parseFromString(html, "text/html");

  const productMap = new Map();

  doc.querySelectorAll(".box").forEach((box) => {
    const nameElement = box.querySelector(".product-name");

    const imageElement = box.querySelector(".image img");

    const priceElement = box.querySelector(".price");

    if (!nameElement || !imageElement) {
      return;
    }

    const name = nameElement.textContent.trim();

    const rawImage = imageElement.getAttribute("src") || "";

    let image = "";

    if (rawImage) {
      try {
        image = new URL(rawImage, document.baseURI).href;
      } catch (error) {
        image = rawImage;
      }
    }

    const priceText = priceElement?.textContent || "";

    const price = Number(priceText.replace(/[^0-9.]/g, "")) || 0;

    productMap.set(name.toLowerCase(), {
      name,
      image,
      price,
    });
  });

  return productMap;
}

/* ==========================================
   NORMALIZE PRODUCT NAME
========================================== */

function getBaseProductName(value) {
  return String(value || "")
    .replace(/\s+\(\d+\s+grams\)$/i, "")
    .trim()
    .toLowerCase();
}

/* ==========================================
   REPAIR OLD WISHLIST ITEMS
========================================== */

async function repairLegacyWishlist(productMap) {
  let changed = false;

  wishlist = wishlist.map((item) => {
    const name = String(item.name || item.id || "").trim();

    const product = productMap.get(getBaseProductName(name));

    if (!product) {
      return item;
    }

    const repaired = {
      ...item,

      id: item.id || name,

      name,

      image: item.image || product.image,

      price: Number(item.price) || product.price,

      quantity: Number(item.quantity) || 1,
    };

    if (
      repaired.image !== item.image ||
      repaired.price !== Number(item.price) ||
      repaired.quantity !== Number(item.quantity)
    ) {
      changed = true;
    }

    return repaired;
  });

  if (changed) {
    saveWishlist();
  }
}

/* ==========================================
   REPAIR OLD CART ITEMS
========================================== */

async function repairLegacyCart(productMap) {
  let changed = false;

  cart = cart.map((item) => {
    const name = String(item.name || item.id || "").trim();

    const product = productMap.get(getBaseProductName(name));

    if (!product) {
      return item;
    }

    const repaired = {
      ...item,

      id: item.id || `${product.name}::1000`,

      name,

      image: item.image || product.image,

      price: Number(item.price) || Number(item.unitPrice) || product.price,

      unitPrice: Number(item.unitPrice) || Number(item.price) || product.price,

      quantity: Number(item.quantity) || 1,
    };

    if (
      repaired.image !== item.image ||
      repaired.price !== Number(item.price) ||
      repaired.unitPrice !== Number(item.unitPrice) ||
      repaired.quantity !== Number(item.quantity)
    ) {
      changed = true;
    }

    return repaired;
  });

  if (changed) {
    saveCart();
  }
}

/* ==========================================
   SAVE
========================================== */

function saveWishlist() {
  localStorage.setItem(
    collectionStorageKey("sanjeevaniWishlist"),
    JSON.stringify(wishlist),
  );
}

function saveCart() {
  localStorage.setItem(
    collectionStorageKey("sanjeevaniCart"),
    JSON.stringify(cart),
  );
}

/* ==========================================
   ELEMENTS
========================================== */

const wishlistGrid = document.getElementById("wishlistGrid");

const wishlistEmpty = document.getElementById("wishlistEmpty");

const cartProducts = document.getElementById("cartProducts");

const cartEmpty = document.getElementById("cartEmpty");

/* ==========================================
   TABS
========================================== */

document.querySelectorAll(".wellness-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".wellness-tab").forEach((item) => {
      item.classList.remove("active");
    });

    document.querySelectorAll(".wellness-section").forEach((section) => {
      section.classList.remove("active");
    });

    tab.classList.add("active");

    document.getElementById(tab.dataset.section).classList.add("active");
  });
});

/* ==========================================
   WISHLIST RENDER
========================================== */

function renderWishlist() {
  wishlistGrid.innerHTML = "";

  document.getElementById("wishlistTabCount").textContent = wishlist.length;

  document.getElementById("wishlistSummary").textContent =
    `${wishlist.length} product${wishlist.length === 1 ? "" : "s"}`;

  if (wishlist.length === 0) {
    wishlistEmpty.classList.add("show");

    return;
  }

  wishlistEmpty.classList.remove("show");

  wishlist.forEach((product) => {
    const card = document.createElement("article");

    card.className = "wishlist-card";

    card.innerHTML = `

        <div class="wishlist-image">

          <img
            src="${product.image}"
            alt="${escapeHTML(product.name)}"
            onerror="this.style.display='none';"
          >

          <button
            class="remove-wishlist"
            data-id="${product.id}"
            aria-label="Remove from wishlist"
          >
            ♥
          </button>

        </div>


        <div class="wishlist-info">

          <div class="product-rating">
            ★ 4.8
          </div>

          <h3>
            ${escapeHTML(product.name)}
          </h3>

          <div class="wishlist-price">
            ₹${Number(product.price).toLocaleString("en-IN")}
          </div>

          <button
            class="wishlist-cart-btn"
            data-id="${product.id}"
          >
            Add to cart
          </button>

        </div>

      `;

    wishlistGrid.appendChild(card);
  });

  attachWishlistEvents();
}

/* ==========================================
   WISHLIST EVENTS
========================================== */

function attachWishlistEvents() {
  document.querySelectorAll(".remove-wishlist").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;

      wishlist = wishlist.filter((item) => item.id !== id);

      saveWishlist();

      renderWishlist();

      showToast("Removed from wishlist");
    });
  });

  document.querySelectorAll(".wishlist-cart-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const product = wishlist.find((item) => item.id === button.dataset.id);

      if (!product) {
        return;
      }

      addToCart(product);
    });
  });
}

/* ==========================================
   ADD TO CART
========================================== */

function addToCart(product) {
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity = (Number(existing.quantity) || 1) + 1;

    existing.image = existing.image || product.image;

    existing.price = Number(existing.price) || Number(product.price) || 0;

    existing.unitPrice =
      Number(existing.unitPrice) || Number(product.price) || 0;
  } else {
    cart.push({
      ...product,

      image: product.image || "",

      price: Number(product.price) || 0,

      unitPrice: Number(product.unitPrice || product.price) || 0,

      quantity: 1,
    });
  }

  saveCart();

  renderCart();

  showToast(`${product.name} added to cart`);
}

/* ==========================================
   CART RENDER
========================================== */

function renderCart() {
  cartProducts.innerHTML = "";

  const itemCount = cart.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  );

  const subtotal = cart.reduce(
    (total, item) =>
      total + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0,
  );

  document.getElementById("cartTabCount").textContent = itemCount;

  document.getElementById("cartSummary").textContent = `${itemCount} item${
    itemCount === 1 ? "" : "s"
  }`;

  document.getElementById("summaryItems").textContent = itemCount;

  document.getElementById("summarySubtotal").textContent =
    `₹${subtotal.toLocaleString("en-IN")}`;

  document.getElementById("summaryTotal").textContent =
    `₹${subtotal.toLocaleString("en-IN")}`;

  if (cart.length === 0) {
    cartEmpty.classList.add("show");

    return;
  }

  cartEmpty.classList.remove("show");

  cart.forEach((item) => {
    const row = document.createElement("article");

    row.className = "cart-product";

    const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);

    row.innerHTML = `

      <div class="cart-product-image">

        <img
          src="${item.image}"
          alt="${escapeHTML(item.name)}"
          onerror="this.style.display='none';"
        >

      </div>


      <div class="cart-product-info">

        <h3>
          ${escapeHTML(item.name)}
        </h3>

        <p>
          Ayurvedic wellness collection
        </p>

        <div class="cart-product-price">

          ₹${Number(item.price).toLocaleString("en-IN")}

        </div>


        <div class="quantity-box">

          <button
            class="quantity-minus"
            data-id="${item.id}"
          >
            −
          </button>

          <span>
            ${item.quantity}
          </span>

          <button
            class="quantity-plus"
            data-id="${item.id}"
          >
            +
          </button>

        </div>

      </div>


      <div class="cart-product-total">

        <strong>
          ₹${itemTotal.toLocaleString("en-IN")}
        </strong>

        <button
          class="remove-cart-btn"
          data-id="${item.id}"
        >
          Remove
        </button>

      </div>

    `;

    cartProducts.appendChild(row);
  });

  attachCartEvents();
}

/* ==========================================
   CART EVENTS
========================================== */

function attachCartEvents() {
  document.querySelectorAll(".quantity-minus").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuantity(button.dataset.id, -1);
    });
  });

  document.querySelectorAll(".quantity-plus").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuantity(button.dataset.id, 1);
    });
  });

  document.querySelectorAll(".remove-cart-btn").forEach((button) => {
    button.addEventListener("click", () => {
      removeFromCart(button.dataset.id);
    });
  });
}

/* ==========================================
   QUANTITY
========================================== */

function updateQuantity(id, change) {
  const item = cart.find((product) => product.id === id);

  if (!item) {
    return;
  }

  item.quantity = (Number(item.quantity) || 0) + change;

  if (item.quantity <= 0) {
    cart = cart.filter((product) => product.id !== id);
  }

  saveCart();

  renderCart();
}

/* ==========================================
   REMOVE
========================================== */

function removeFromCart(id) {
  cart = cart.filter((product) => product.id !== id);

  saveCart();

  renderCart();

  showToast("Removed from cart");
}

/* ==========================================
   CHECKOUT
========================================== */

const checkoutButton = document.getElementById("checkoutButton");

if (checkoutButton) {
  checkoutButton.addEventListener("click", () => {
    if (cart.length === 0) {
      showToast("Your cart is empty");

      return;
    }

    window.location.href = "checkout.html";
  });
}

/* ==========================================
   TOAST
========================================== */

function showToast(message) {
  const toast = document.getElementById("wellnessToast");

  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

/* ==========================================
   SECURITY / TEXT
========================================== */

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ==========================================
   INITIALIZE
========================================== */

(async function initializeCollections() {
  try {
    const productMap = await loadProductCatalog();

    await Promise.all([
      repairLegacyWishlist(productMap),

      repairLegacyCart(productMap),
    ]);
  } catch (error) {
    console.warn("Could not repair wishlist/cart images:", error);
  } finally {
    renderWishlist();

    renderCart();
  }
})();