// Decorative. pointer-events-none means it never blocks a click underneath it.
export function Cloud() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-28 overflow-hidden"
    >
      <div className="absolute -bottom-10 left-[-5%] h-24 w-[45%] rounded-full bg-white/90 blur-md" />
      <div className="absolute -bottom-12 left-[30%] h-28 w-[50%] rounded-full bg-white blur-md" />
      <div className="absolute right-[-5%] -bottom-10 h-24 w-[45%] rounded-full bg-white/90 blur-md" />
    </div>
  );
}
