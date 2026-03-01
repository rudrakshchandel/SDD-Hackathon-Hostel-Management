type LiquidLoaderProps = {
  label?: string;
  compact?: boolean;
};

export default function LiquidLoader({
  label = "Loading...",
  compact = false
}: LiquidLoaderProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${
        compact ? "w-full min-h-[164px]" : "mx-auto h-[300px] w-full"
      }`}
    >
      <div
        className={`liquid-loader-panel relative z-10 flex items-center justify-center ${
          compact ? "w-full min-h-[164px] p-3" : "h-[300px] w-full p-5"
        }`}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <p className={`text-slate-700 ${compact ? "text-sm" : "text-base font-medium"}`}>
            {label}
          </p>
          <div className="mt-2 inline-flex gap-1">
            <span className="glass-loader-dot" style={{ animationDelay: "0ms" }} />
            <span className="glass-loader-dot" style={{ animationDelay: "120ms" }} />
            <span className="glass-loader-dot" style={{ animationDelay: "240ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
