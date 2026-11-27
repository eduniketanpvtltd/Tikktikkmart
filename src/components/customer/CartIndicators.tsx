import { Motorbike, ShoppingBasket } from "lucide-react";
import { DEFAULT_FREE_DELIVERY_ABOVE } from "@/lib/pricing/constants";

export function FreeDeliveryProgress({ subtotal }: { subtotal: number }) {
  const threshold = DEFAULT_FREE_DELIVERY_ABOVE;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(1, Math.max(0, subtotal / threshold));

  return (
    <div className="space-y-2 border-t border-[#F0E4D2] px-[14px] py-3">
      <p className={`text-[13px] font-bold ${remaining > 0 ? "text-[#3A2418]" : "text-[#2E7D4F]"}`}>
        {remaining > 0
          ? `Add ₹${remaining.toLocaleString("en-IN", { maximumFractionDigits: 2 })} more for free delivery`
          : "Free delivery unlocked"}
      </p>
      <div
        role="progressbar"
        aria-label="Free delivery progress"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.min(threshold, Math.max(0, subtotal))}
        className="h-1.5 overflow-hidden rounded-full bg-[#FBE3CF]"
      >
        <span
          className={`cart-delivery-fill block h-full origin-left rounded-full ${remaining > 0 ? "bg-[#A8421A]" : "bg-[#2E7D4F]"}`}
          style={{ "--cart-delivery-progress": progress } as React.CSSProperties}
        />
      </div>
      <div aria-hidden="true" className="relative mx-1 mt-2 h-5 border-b-2 border-dashed border-[#F0E4D2] [container-type:inline-size]">
        <span
          className={`cart-scooter absolute bottom-[-4px] grid size-[26px] place-items-center rounded-full transition-[left] duration-500 ease-out ${remaining > 0 ? "bg-[#FBE3CF] text-[#A8421A]" : "bg-[#E3F0DA] text-[#2E7D4F]"}`}
          style={{ left: `calc(${progress * 100}% - ${progress * 26}px)` }}
        >
          <Motorbike className="size-4" />
        </span>
      </div>
    </div>
  );
}

export function EmptyCartBasket() {
  return <div className="mx-auto grid size-20 place-items-center rounded-full bg-[#FBE3CF] text-[#A8421A]">
    <ShoppingBasket aria-hidden="true" className="empty-cart-basket size-11 stroke-[1.6]" />
  </div>;
}
