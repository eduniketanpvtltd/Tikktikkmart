import "./home.css";

export function RiderDropsSkeleton() {
  return (
    <div className="divide-y divide-[var(--r-line)]" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-center gap-2.5 py-3">
          <i className="layout-block size-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <i className="layout-block h-3 w-24 max-w-full" />
            <i className="layout-block h-2.5 w-3/4" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <i className="layout-block h-3 w-12" />
            <i className="layout-block h-2.5 w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RiderEarningsSkeleton() {
  return (
    <section className="rider-card rider-metrics-card" role="status" aria-label="Loading rider earnings">
      <div className="rider-metric-strip" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col items-center justify-center gap-2">
            <i className="layout-block h-2.5 w-10" />
            <i className="layout-block h-4 w-12" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function RiderHomeSkeleton() {
  return (
    <div className="rider-home" role="status" aria-label="Loading rider dashboard">
      <div className="rider-shell" aria-hidden="true">
        <div className="rider-top flex items-center gap-3">
          <i className="layout-block size-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <i className="layout-block h-4 w-32 max-w-full" />
            <i className="layout-block h-3 w-3/4" />
          </div>
          <i className="layout-block size-[46px] shrink-0 rounded-full" />
        </div>
        <div className="rider-content">
          <div className="rider-card">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <i className="layout-block h-4 w-28" />
                <i className="layout-block h-3 w-4/5" />
              </div>
              <i className="layout-block h-11 w-[82px] shrink-0 rounded-full" />
            </div>
            <div className="rider-duty-zone"><i className="layout-block h-4 w-1/2" /></div>
          </div>
          <div className="flex h-6 items-center justify-between">
            <i className="layout-block h-4 w-28" />
            <i className="layout-block h-3 w-16" />
          </div>
          <div className="rider-card px-4 py-5">
            <div className="rider-radar"><div className="layout-block size-[54px] rounded-full" /></div>
            <i className="layout-block mx-auto my-1 h-[19px] w-44" />
            <i className="layout-block mx-auto mt-2 h-4 w-2/3" />
          </div>
          <RiderEarningsSkeleton />
          <div className="rider-card flex items-center gap-3">
            <i className="layout-block size-11 shrink-0" />
            <div className="flex-1 space-y-2">
              <i className="layout-block h-3.5 w-32 max-w-full" />
              <i className="layout-block h-2.5 w-20" />
            </div>
            <i className="layout-block h-11 w-16" />
          </div>
          <div className="rider-card">
            <div className="flex h-11 items-center"><i className="layout-block h-4 w-28" /></div>
            <RiderDropsSkeleton />
          </div>
        </div>
        <div className="rider-tabs">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex h-12 flex-col items-center justify-center gap-1">
              <i className="layout-block size-5 rounded-md" />
              <i className="layout-block h-2.5 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
