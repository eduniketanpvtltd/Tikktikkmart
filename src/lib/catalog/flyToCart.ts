export function flyToCart(source: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const origin = source.getBoundingClientRect();
  const x = origin.left + origin.width / 2;
  const y = origin.top + origin.height / 2;

  // Measure the pill after the cart update renders.
  requestAnimationFrame(() => {
    const detailCart = document.querySelector<HTMLElement>("[data-product-cart]");
    const cart = detailCart ?? document.querySelector<HTMLElement>("[data-cart-pill]");
    if (!cart) return;

    const target = (cart.querySelector("[data-cart-thumbnail]") ?? cart).getBoundingClientRect();
    const dock = cart.closest("[data-cart-dock]");
    const dockMatrix = dock ? getComputedStyle(dock).transform : "none";
    const dockOffset = dockMatrix === "none" ? 0 : new DOMMatrixReadOnly(dockMatrix).m42;
    const dx = target.left + target.width / 2 - x;
    const dy = target.top - dockOffset + target.height / 2 - y;
    const dot = document.createElement("span");
    dot.className = "storefront-cart-dot";
    dot.setAttribute("aria-hidden", "true");
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    document.body.appendChild(dot);

    const flight = dot.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.48}px, ${dy * 0.45 - 60}px) scale(1.15)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.4)`, opacity: 0.45 },
    ], { duration: 650, easing: "cubic-bezier(.4, 0, .6, 1)" });

    void flight.finished.then(() => {
      if (!cart.isConnected) return;
      const badge = detailCart?.querySelector<HTMLElement>("[data-product-cart-count]");
      const animated = badge ?? cart;
      animated.getAnimations().find((animation) => animation.id === "storefront-cart-bump")?.cancel();
      const bump = animated.animate(badge ? [
        { transform: "scale(1)" },
        { transform: "scale(1.4)", offset: 0.4 },
        { transform: "scale(1)" },
      ] : [
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-5px) scale(1.06)", offset: 0.4 },
        { transform: "translateY(0) scale(1)" },
      ], { duration: 400, easing: "cubic-bezier(.18,.85,.35,1.05)" });
      bump.id = "storefront-cart-bump";
    }).catch(() => {}).finally(() => dot.remove());
  });
}
