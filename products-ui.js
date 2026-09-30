/* =========================================================
  /* =======================================================
     15. FLOATING CART
     ======================================================= */

  const floatingCart =
    document.createElement("a");

  floatingCart.href =
    "collection.html";

  floatingCart.className =
    "floating-cart";

  floatingCart.innerHTML = `
    🛒

    <span>
      View Cart
    </span>

    <span
      class="floating-cart-count"
      id="floatingCartCount"
    >
      0
    </span>
  `;

  document.body.appendChild(
    floatingCart
  );


  function syncFloatingCart() {

    const mainCount =
      document.getElementById(
        "cartCount"
      );

    const floatingCount =
      document.getElementById(
        "floatingCartCount"
      );

    if (
      mainCount &&
      floatingCount
    ) {

      floatingCount.textContent =
        mainCount.textContent;

    }

  }

  syncFloatingCart();


  /* =======================================================
     16. REFRESH COUNTS AFTER CART CHANGES
     ======================================================= */

  window.addEventListener(
    "storage",
    () => {

      updateCartCount();
      updateWishlistCount();
      syncFloatingCart();

    }
  );


  /* =======================================================
     17. STAGGER PRODUCT ANIMATIONS
     ======================================================= */

  productCards.forEach(
    (card, index) => {

      card.style.animationDelay =
        `${Math.min(index * 0.035, 0.45)}s`;

    }
  );


  /* =======================================================
     18. PRODUCT HOVER MICRO-INTERACTION
     ======================================================= */

  productCards.forEach(card => {

    card.addEventListener(
      "mouseenter",
      () => {

        card.style.zIndex = "5";

      }
    );

    card.addEventListener(
      "mouseleave",
      () => {

        card.style.zIndex = "";

      }
    );

  });


  /* =======================================================
     19. INITIAL COUNT
     ======================================================= */

  updateProductCount();

