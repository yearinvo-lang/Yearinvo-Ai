import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  showText?: boolean;
  textClassName?: string;
}

export const YearInfoLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textClassName = '',
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 36, text: 'text-lg', sub: 'text-[10px]' },
    lg: { icon: 48, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 64, text: 'text-3xl', sub: 'text-sm' },
    custom: { icon: 40, text: 'text-lg', sub: 'text-xs' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Geometric Logo Container matching user-uploaded brand asset */}
      <div
        className="relative flex items-center justify-center rounded-xl bg-[#090714] p-1.5 shadow-lg border border-purple-500/40 ring-1 ring-purple-600/30 group-hover:border-purple-400 transition-all duration-300"
        style={{
          width: currentSize.icon,
          height: currentSize.icon,
          boxShadow: '0 0 20px -3px rgba(147, 51, 234, 0.35)',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left geometric arm & stem (White) */}
          <path
            d="M 18 18 L 40 18 L 47 43 L 47 78 L 34 78 L 34 50 L 25 36 L 18 18 Z"
            fill="#FFFFFF"
          />
          {/* Purple accent parallelogram at top right */}
          <path
            d="M 46 29 L 60 18 L 80 18 L 66 29 Z"
            fill="#8B5CF6"
          />
          {/* Right angled shard (White) completing the monogram */}
          <path
            d="M 52 35 L 75 24 L 75 66 L 62 60 L 62 47 L 52 56 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-wider text-white ${currentSize.text}`}>
              YEAR
            </span>
            <span className={`font-black tracking-wider text-purple-400 ${currentSize.text}`}>
              INFO
            </span>
            <span className="ml-0.5 rounded bg-gradient-to-r from-purple-600 to-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm shadow-purple-500/20">
              AI
            </span>
          </div>
          <span className={`font-semibold tracking-[0.2em] text-slate-400 uppercase mt-0.5 ${currentSize.sub}`}>
            CONNECT • CONVERSE • CONVERT
          </span>
        </div>
      )}
    </div>
  );
};
