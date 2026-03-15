export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center backdrop-blur-md">
      <div className="flex min-w-[220px] flex-col items-center gap-5 px-8 py-7 text-center text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">
            U-NIT ME
          </p>
          <p className="mt-2 text-lg font-medium tracking-[-0.03em]">
            I&apos;m thinking
          </p>
        </div>
      </div>
    </div>
  );
}
