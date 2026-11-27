import { Check, ChevronLeft, Clock, Navigation, Phone } from "lucide-react";
import { formatRupees } from "@/components/customer/AnimatedRupees";

export type DeliveryOrder = {
  id: string;
  orderNumber: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  customerName: string;
  customerAddress: string;
  customerArea?: string;
  customerPhone: string;
  itemsCount: number;
  items: { name: string; quantity: number }[];
  estimatedMinutes: number;
  distanceKm: number;
  pickupDistanceKm?: number;
  pickupMinutes?: number;
  dropMinutes?: number;
  payout: number | null;
  demoDeliveryOtp?: string;
  pickupPin: string;
  codAmount?: number;
  offerId?: string;
  offeredAt?: string;
};

const routePath = "M85 266 C135 266 112 200 162 180 S232 150 258 116 S298 92 322 66";

function RoutePreview({ step }: { step: number }) {
  const arrivedAtDrop = step >= 3;
  return (
    <svg className="rider-map-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="300" fill="#e9edf5" />
      <path d="M-10 90H410M-10 200H410M70-10V310M190-10V310M310-10V310" stroke="#fff" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M-10 145H410M130-10V310M250-10V310" stroke="#d6dcea" strokeWidth="2" fill="none" />
      <g fill="#d8e8dd"><rect x="205" y="215" width="90" height="60" rx="12" /><rect x="80" y="30" width="80" height="45" rx="12" /></g>
      <path d={routePath} stroke="#c5cde0" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path className="rider-map-progress" d={routePath} pathLength="100" strokeDasharray="100" strokeDashoffset={arrivedAtDrop ? 0 : 60} strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="162" cy="180" r="15" fill="#0f1a3c" />
      <circle cx="322" cy="66" r="15" fill="#12b76a" />
      <g fill="#fff" fontSize="14" fontWeight="800" textAnchor="middle"><text x="162" y="185">P</text><text x="322" y="71">D</text></g>
      <g className="rider-map-position" data-drop={arrivedAtDrop}>
        <circle className="rider-map-pulse" r="18" fill="#fd5e00" opacity=".25" />
        <circle r="11" fill="#fd5e00" stroke="#fff" strokeWidth="4" />
      </g>
    </svg>
  );
}

type Props = {
  order: DeliveryOrder;
  step: 1 | 2 | 3 | 4;
  pending: boolean;
  preparing: boolean;
  instructions?: string | null;
  gpsError: boolean;
  otp: string;
  otpError: string;
  onOtp: (value: string) => void;
  checked: number[];
  onCheck: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
};

export function RiderDelivery({ order, step, pending, preparing, instructions, gpsError, otp, otpError, onOtp, checked, onCheck, onBack, onNext }: Props) {
  const pickup = step < 3;
  const address = pickup ? order.storeAddress || order.storeName : order.customerAddress;
  const destination = pickup ? order.storeName : order.customerArea || order.customerName;
  const minutes = pickup ? order.pickupMinutes : order.dropMinutes;
  const phone = pickup ? order.storePhone : order.customerPhone;
  const mapsUrl = address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : null;
  const title = [
    `Head to ${order.storeName}`,
    order.itemsCount ? `Pick up ${order.itemsCount} ${order.itemsCount === 1 ? "item" : "items"}` : "Pick up the order",
    `Deliver to ${order.customerName}`,
    "Hand over the order",
  ][step - 1];
  const subtitle = [
    preparing ? "The store is still preparing this order." : order.pickupDistanceKm != null && minutes != null ? `${order.pickupDistanceKm} km · about ${minutes} min` : "Go to the pickup location.",
    "Check every item before leaving.",
    order.distanceKm && minutes != null ? `${order.distanceKm} km · about ${minutes} min` : "Go to the customer’s drop-off address.",
    "Ask the customer for their 4-digit OTP.",
  ][step - 1];
  const nextLabel = ["I’ve arrived at the store", "Items verified · Start delivery", "I’ve reached the drop", "Confirm delivery"][step - 1];

  return (
    <main className="rider-delivery" aria-labelledby="rider-stage-title">
      <div className="rider-map">
        <RoutePreview step={step} />
        <button type="button" className="rider-icon-action rider-map-back" onClick={onBack} aria-label="Back to rider home"><ChevronLeft size={25} aria-hidden="true" /></button>
        {mapsUrl && <a className="rider-map-navigate" href={mapsUrl} target="_blank" rel="noreferrer"><Navigation size={16} aria-hidden="true" /> Navigate</a>}
        {!order.demoDeliveryOtp && <span className="rider-map-label">Route overview</span>}
      </div>
      <div className="rider-delivery-panel">
        <div className="rider-grab" aria-hidden="true" />
        <ol className="rider-stage-bars" aria-label="Delivery progress">
          {["Go to store", "Pick up", "Go to customer", "Hand over"].map((label, index) => (
            <li key={label} aria-current={index + 1 === step ? "step" : undefined} data-done={index + 1 < step}><span className="sr-only">{label}</span></li>
          ))}
        </ol>
        {!order.demoDeliveryOtp && <div className="rider-stage-reference"><span>{order.orderNumber}</span>{order.payout != null && <strong>{formatRupees(order.payout)}</strong>}</div>}
        <h1 id="rider-stage-title">{title}</h1>
        <p className="rider-muted mt-1 text-sm">{subtitle}</p>
        {(step === 1 || step === 3) && <>
          <div className="rider-location">
            <div className="rider-location-icon">{pickup ? "P" : "D"}</div>
            <div className="min-w-0 flex-1">
              <strong>{destination}</strong>
              <p>{address || "Address unavailable"}</p>
              {!pickup && instructions && <p>Delivery instructions: {instructions}</p>}
            </div>
            {pickup && mapsUrl && <a className="rider-icon-action" href={mapsUrl} aria-label="Navigate to pickup" target="_blank" rel="noreferrer"><Navigation size={18} fill="currentColor" aria-hidden="true" /></a>}
            {phone && <a className="rider-icon-action" href={`tel:${phone}`} aria-label={pickup ? "Call the store" : "Call customer"}><Phone size={18} aria-hidden="true" /></a>}
          </div>
          {minutes != null && <p className="rider-stage-eta"><Clock size={14} aria-hidden="true" /> {minutes} min away</p>}
        </>}
        {step === 2 && <>
          {order.pickupPin && !order.demoDeliveryOtp && <div className="rider-location"><div><p>Show pickup PIN to store staff</p><strong className="rider-pickup-pin">{order.pickupPin}</strong></div></div>}
          {order.items.length > 0 && <div className="rider-checklist" aria-label="Pickup checklist">
            {order.items.map((item, index) => (
              <label key={index}>
                <input type="checkbox" checked={checked.includes(index)} onChange={() => onCheck(index)} />
                <span className="rider-check-box" aria-hidden="true"><Check size={16} /></span>
                <span className="min-w-0 flex-1">{item.name}</span>
                <span className="rider-muted shrink-0">×{item.quantity}</span>
              </label>
            ))}
          </div>}
        </>}
        {step === 4 && <div className="mt-4">
          <input className="rider-otp" aria-label="Customer delivery code" autoComplete="one-time-code"
            inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="••••" value={otp}
            aria-invalid={Boolean(otpError)} onChange={(event) => onOtp(event.target.value.replace(/\D/g, "").slice(0, 4))} />
          {otpError && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{otpError}</p>}
          {order.demoDeliveryOtp && <button type="button" className="rider-inline-action mt-1" onClick={() => onOtp(order.demoDeliveryOtp ?? "")}>Use demo OTP ({order.demoDeliveryOtp})</button>}
          {!!order.codAmount && <div className="rider-location"><div><strong>Collect cash</strong><p>{formatRupees(order.codAmount)} due on delivery</p></div></div>}
        </div>}
        {(step === 3 || step === 4) && gpsError && <p className="rider-muted mt-3 text-xs">Location is unavailable. Check location access to share your progress.</p>}
        <button type="button" className="rider-primary rider-flow-cta" onClick={onNext}
          disabled={pending || preparing || (step === 2 && checked.length !== order.items.length) || (step === 4 && otp.length !== 4)}>
          {pending ? "Updating…" : nextLabel}
        </button>
      </div>
    </main>
  );
}

export function RiderDeliveryReceipt({ order, onHome }: { order: DeliveryOrder; onHome: () => void }) {
  return (
    <main className="rider-receipt" aria-labelledby="rider-receipt-title">
      <div className="rider-receipt-check"><Check size={42} strokeWidth={3} aria-hidden="true" /></div>
      <h1 id="rider-receipt-title">Delivered!</h1>
      {order.payout != null && <><p className="rider-receipt-amount">{formatRupees(order.payout)}</p><p className="rider-muted">{order.demoDeliveryOtp ? "added to your earnings" : "Delivery earnings"}</p></>}
      <dl className="rider-card rider-receipt-details">
        {order.demoDeliveryOtp && order.payout != null ? <>
          <div><dt>Base fare</dt><dd>{formatRupees(order.payout - 25)}</dd></div>
          <div><dt>Distance ({order.distanceKm} km)</dt><dd>₹15</dd></div>
          <div><dt>Customer tip</dt><dd>₹10</dd></div>
        </> : <div><dt>Order</dt><dd>{order.orderNumber}</dd></div>}
        {!order.demoDeliveryOtp && order.distanceKm > 0 && <div><dt>Delivery distance</dt><dd>{order.distanceKm} km</dd></div>}
        {!!order.codAmount && <div><dt>Cash collected</dt><dd>{formatRupees(order.codAmount)}</dd></div>}
      </dl>
      {order.demoDeliveryOtp && <div className="rider-card rider-receipt-rating"><span>★</span><div><strong>Customer rated you 5 stars</strong><p className="rider-muted text-xs">Great job, Vikram</p></div></div>}
      <button type="button" className="rider-primary rider-flow-cta" onClick={onHome}>Back to home</button>
    </main>
  );
}
