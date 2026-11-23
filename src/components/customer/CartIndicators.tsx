import { Motorbike, ShoppingBasket } from "lucide-react";
import { DEFAULT_FREE_DELIVERY_ABOVE } from "@/lib/pricing/constants";

export function FreeDeliveryProgress({ subtotal }: { subtotal: number }) {
  const threshold = DEFAULT_FREE_DELIVERY_ABOVE;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(1, Math.max(0, subtotal / threshold));

  return (
    <div className="space-y-2 border-t border-[color:var(--theme-line)] px-[14px] py-3">
      <p className="text-[13px] font-semibold text-[color:var(--theme-ink)]">
        {remaining > 0
          ? `Add ₹${remaining.toLocaleString("en-IN", { maximumFractionDigits: 2 })} more for free delivery`
          : "You unlocked free delivery"}
      </p>
      <div
        role="progressbar"
        aria-label="Free delivery progress"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.min(threshold, Math.max(0, subtotal))}
        className="h-2 overflow-hidden rounded-full bg-[var(--peach)]"
      >
        <span className="cart-delivery-fill block h-full origin-left rounded-full bg-[var(--theme-orange-fill)]"
          style={{ "--cart-delivery-progress": progress } as React.CSSProperties} />
      </div>
      <div aria-hidden="true" className="relative mx-1 mt-2 h-5 border-b-2 border-dashed border-[color:var(--theme-line)] [container-type:inline-size]">
        <span className="cart-scooter absolute bottom-[-4px] left-0 grid size-[26px] place-items-center rounded-full bg-[var(--peach-light)] text-[color:var(--theme-orange-text)]">
          <Motorbike className="size-5" />
        </span>
      </div>
    </div>
  );
}

export function EmptyCartBasket() {
  return <div className="mx-auto grid size-20 place-items-center rounded-full bg-[var(--peach-light)] text-[color:var(--theme-orange-text)]">
    <ShoppingBasket aria-hidden="true" className="empty-cart-basket size-11 stroke-[1.6]" />
  </div>;
}
