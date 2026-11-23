let cartOrigin = "/";
let pendingProductOrigin = false;

export function rememberCartOrigin() {
  const { pathname, search, hash } = window.location;
  if (pathname !== "/cart" && pathname !== "/checkout") {
    cartOrigin = pathname + search + hash;
    pendingProductOrigin = pathname.startsWith("/product/");
  }
}

export function getCartOrigin() {
  return cartOrigin;
}

export function consumeProductCartOrigin() {
  const fromProduct = pendingProductOrigin;
  pendingProductOrigin = false;
  return fromProduct;
}
