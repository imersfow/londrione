export default function Loading() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center">
      <div className="rounded-3xl border border-white/80 bg-white/70 px-6 py-5 text-center shadow-sm backdrop-blur-xl">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
        <div className="mt-3 text-sm font-bold text-slate-700">Memuat...</div>
      </div>
    </div>
  );
}
