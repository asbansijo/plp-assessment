(function () {
  if (window.isShopScriptLoaded) return;
  window.isShopScriptLoaded = true;

  const CLOSE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg>`;
  const MINUS_ICON = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12h14" stroke="currentColor" stroke-width="2"/></svg>`;
  const PLUS_ICON = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2"/></svg>`;

  let productsList = window.northgrainProducts || [];
  let cartItems = [];
  let isCartDrawerOpen = false;
  let toastTimerId = null;


  function cleanText(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }


  function formatMoney(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");    
  }

  function renderProducts() {
    const container = document.querySelector("[data-north-products]");
    if (!container) return;

    if (productsList.length === 0) {
      container.innerHTML = "<p>No products available.</p>";
      return;
    }

    let html = "";
    for (let i = 0; i < productsList.length; i++) {
      const item = productsList[i];
      let optionsHtml = "";

      if (item.variants) {
        for (let j = 0; j < item.variants.length; j++) {
          const v = item.variants[j];
          optionsHtml += `<option value="${cleanText(v)}">${cleanText(v)}</option>`;
        }
      }

      const oldPrice = item.originalPrice
        ? `<span class="northComparePrice">${formatMoney(item.originalPrice)}</span>`
        : "";

      html += `
        <article class="northProductCard" data-product-id="${cleanText(item.id)}">
          <div class="northProductImage" style="background: ${item.gradient};">
          </div>
          <div class="northProductContent">
            <h2 class="northProductName">${cleanText(item.name)}</h2>
            <div class="wrapper-price-container" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <p class="northProductCategory">${cleanText(item.category)}</p>
            <div class="northProductPrice">
              <strong>${formatMoney(item.price)}</strong>
              ${oldPrice}
            </div>
            </div>
            
            <div class="northProductActions">
              <select class="northVariantSelect">${optionsHtml}</select>
              <button type="button" class="northAddButton" data-product-id="${cleanText(item.id)}">
                Add
              </button>
            </div>
          </div>
        </article>
      `;
    }

    container.innerHTML = html;
  }


  function getTotalCount() {
    let count = 0;
    for (let i = 0; i < cartItems.length; i++) {
      count += cartItems[i].quantity;
    }
    return count;
  }


  function getTotalPrice() {
    let total = 0;
    for (let i = 0; i < cartItems.length; i++) {
      total += cartItems[i].price * cartItems[i].quantity;
    }
    return total;
  }

  function updateCartBadge() {
    const badge = document.querySelector("[data-north-cart-count]");
    if (!badge) return;

    const count = getTotalCount();
    badge.textContent = count;
    badge.hidden = count === 0;
  }

  function renderCartDrawer() {
    const drawer = document.querySelector("[data-north-cart]");
    const overlay = document.querySelector("[data-north-overlay]");

    if (!drawer) return;

    drawer.classList.toggle("northCartOpen", isCartDrawerOpen);
    drawer.setAttribute("aria-hidden", !isCartDrawerOpen);

    if (overlay) {
      overlay.classList.toggle("northOverlayVisible", isCartDrawerOpen);
      overlay.setAttribute("aria-hidden", !isCartDrawerOpen);
    }
    document.body.classList.toggle("northCartIsOpen", isCartDrawerOpen);

    let itemsHtml = "";

    if (cartItems.length === 0) {
      itemsHtml = `
        <div class="northCartEmpty">
          <h3>Your cart is empty</h3>
          <p>Add something from the collection to get started.</p>
        </div>
      `;
    } else {
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        const lineTotal = formatMoney(item.price * item.quantity);

        itemsHtml += `
          <article class="northCartRow" data-product-id="${cleanText(item.productId)}" data-variant="${cleanText(item.variant)}">
            <div class="northCartThumbnail" style="background: ${item.gradient};">
            </div>
            <div class="northCartItem">
              <h3>${cleanText(item.name)}</h3>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
              <p>${cleanText(item.variant)}</p>
              <p>${lineTotal}</p>
              </div>
              <div class="northCartControls">
                <button class="northQuantityDecrease">${MINUS_ICON}</button>
                <span>${item.quantity}</span>
                <button class="northQuantityIncrease">${PLUS_ICON}</button>
                <button class="northRemoveButton">Remove</button>
              </div>
            </div>
          </article>
        `;
      }
    }

    drawer.innerHTML = `
      <div class="northCartHeader">
        <h2>Your cart</h2>
        <button class="northCartClose" aria-label="Close cart">${CLOSE_ICON}</button>
      </div>
      <div class="northCartBody">${itemsHtml}</div>
      <footer class="northCartFooter">
        <div class="northSubtotal">
          <span>Subtotal</span>
          <strong>${formatMoney(getTotalPrice())}</strong>
        </div>
        <button class="northCheckoutButton" ${cartItems.length ? "" : "disabled"}>
          Checkout
        </button>
      </footer>
    `;
  }

  function showToastNotification(message) {
    let toast = document.querySelector("[data-north-toast]");

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "northToast";
      toast.setAttribute("data-north-toast", "");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("northToastVisible");

    clearTimeout(toastTimerId);
    toastTimerId = setTimeout(function () {
      toast.classList.remove("northToastVisible");
    }, 2200);
  }


  function addItemToCart(productId, selectedVariant) {
    let foundProduct = null;

    for (let i = 0; i < productsList.length; i++) {
      if (productsList[i].id === productId) {
        foundProduct = productsList[i];
        break;
      }
    }

    if (!foundProduct) return;

    let existingCartItem = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].productId === productId && cartItems[i].variant === selectedVariant) {
        existingCartItem = cartItems[i];
        break;
      }
    }

    if (existingCartItem) {
      existingCartItem.quantity += 1;
    } else {
      cartItems.push({
        productId: foundProduct.id,
        name: foundProduct.name,
        category: foundProduct.category,
        price: foundProduct.price,
        gradient: foundProduct.gradient,
        variant: selectedVariant,
        quantity: 1
      });
    }

    renderCartDrawer();
    updateCartBadge();
    showToastNotification(foundProduct.name + " added to cart.");
  }

  function modifyItemQuantity(productId, variant, changeAmount) {
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].productId === productId && cartItems[i].variant === variant) {
        cartItems[i].quantity += changeAmount;
        if (cartItems[i].quantity <= 0) {
          cartItems.splice(i, 1);
        }
        break;
      }
    }
    renderCartDrawer();
    updateCartBadge();
  }

  function removeCartItem(productId, variant) {
    cartItems = cartItems.filter(function (item) {
      return !(item.productId === productId && item.variant === variant);
    });
    renderCartDrawer();
    updateCartBadge();
  }

  function setupEvents() {
    const productGrid = document.querySelector("[data-north-products]");
    const cartDrawer = document.querySelector("[data-north-cart]");
    const openCartBtn = document.querySelector("[data-north-cart-open]");
    const overlay = document.querySelector("[data-north-overlay]");

    if (productGrid) {
      productGrid.addEventListener("click", function (event) {
        const addBtn = event.target.closest(".northAddButton");
        if (!addBtn) return;

        const productId = addBtn.getAttribute("data-product-id");
        const card = addBtn.closest(".northProductCard");
        const select = card ? card.querySelector(".northVariantSelect") : null;
        const variant = select ? select.value : "";

        addItemToCart(productId, variant);
      });
    }

    if (cartDrawer) {
      cartDrawer.addEventListener("click", function (event) {
        if (event.target.closest(".northCartClose")) {
          isCartDrawerOpen = false;
          renderCartDrawer();
          return;
        }

        const row = event.target.closest(".northCartRow");
        if (row) {
          const pId = row.getAttribute("data-product-id");
          const vName = row.getAttribute("data-variant");

          if (event.target.closest(".northQuantityIncrease")) {
            modifyItemQuantity(pId, vName, 1);
            return;
          }

          if (event.target.closest(".northQuantityDecrease")) {
            modifyItemQuantity(pId, vName, -1);
            return;
          }

          if (event.target.closest(".northRemoveButton")) {
            removeCartItem(pId, vName);
            return;
          }
        }

        const checkoutBtn = event.target.closest(".northCheckoutButton");
        if (checkoutBtn && !checkoutBtn.disabled) {
          showToastNotification("Checkout is ready to be connected.");
        }
      });
    }

    if (openCartBtn) {
      openCartBtn.addEventListener("click", function () {
        isCartDrawerOpen = true;
        renderCartDrawer();
      });
    }

    if (overlay) {
      overlay.addEventListener("click", function () {
        isCartDrawerOpen = false;
        renderCartDrawer();
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isCartDrawerOpen) {
        isCartDrawerOpen = false;
        renderCartDrawer();
      }
    });
  }

  renderProducts();
  renderCartDrawer();
  updateCartBadge();
  setupEvents();
})();