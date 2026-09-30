/* =========================================================
  /* =======================================================
     16. REFRESH COUNTS AFTER CART CHANGES
     ======================================================= */

  window.addEventListener(
    "storage",
    () => {

      updateCartCount();
      updateWishlistCount();

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

