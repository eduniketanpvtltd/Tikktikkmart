import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white rounded-3xl border border-gray-100 p-8 max-w-md w-full shadow-sm space-y-4">
        <span className="text-4xl">🥦</span>
        <h1 className="text-xl font-black text-gray-900">Page Not Found</h1>
        <p className="text-xs text-gray-500">
          The shelf or item you are looking for has been moved or does not exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0c831f] text-white text-xs font-black uppercase tracking-wider hover:bg-[#096718] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
        </Link>
      </div>
    </div>
  );
}

