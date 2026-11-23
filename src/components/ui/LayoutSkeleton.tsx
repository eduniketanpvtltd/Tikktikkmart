type Shape = "shop" | "table" | "metrics" | "order" | "list" | "products";

export function LayoutSkeleton({ shape, label = "Loading" }: { shape: Shape; label?: string }) {
  if (shape === "products") return (
    <div role="status" aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 6 }, (_, i) => <i key={i} className="layout-block block aspect-[.73]" />)}
    </div>
  );

  return (
    <div role="status" aria-label={label}
      className={`layout-skeleton ${shape === "metrics" ? "max-w-6xl" : shape === "order" || shape === "list" ? "max-w-2xl" : "max-w-5xl"}`}>
      {shape !== "list" && <i className="layout-block layout-heading" />}
      {shape === "shop" ? (
        <>
          <i className="layout-block block h-24" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }, (_, i) => <i key={i} className="layout-block block aspect-square" />)}
          </div>
        </>
      ) : shape === "metrics" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <i key={i} className="layout-block block h-23" />)}
        </div>
      ) : (
        <>
          {shape === "order" && <i className="layout-block block h-55" />}
          {Array.from({ length: shape === "table" ? 6 : 3 }, (_, i) => (
            <div key={i} className="layout-row">
              <i className="layout-block size-10 shrink-0" />
              <div><i className="layout-block h-3 w-2/3" /><i className="layout-block h-2.5 w-1/3" /></div>
              <i className="layout-block h-6 w-15" />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
