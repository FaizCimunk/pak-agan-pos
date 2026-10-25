import React from 'react';

type Props = {
  className?: string;
  isDark?: boolean;
};

export default function AiBadgeFooter({ className = "", isDark = false }: Props) {
  return (
    <footer className={`py-3 text-center select-none print:hidden flex justify-center items-center ${className}`}>
      <div 
        className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-[11px] md:text-xs transition-all ${
          isDark 
            ? 'bg-gray-800/90 text-gray-300 border border-gray-700/80 backdrop-blur-md shadow-sm' 
            : 'bg-white/95 text-gray-700 border border-gray-200/90 backdrop-blur-md shadow-xs'
        }`}
      >
        <span className="font-semibold tracking-tight">Web App</span>
        
        {/* Titik hijau status */}
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span className={`inline-flex rounded-full h-1.5 w-1.5 ${
            isDark ? 'bg-emerald-400' : 'bg-emerald-600'
          }`} />
        </span>

        <span className="font-semibold tracking-tight">
          Powered by{' '}
          <a 
            href="https://ivokgrup.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`font-black tracking-normal transition-colors underline underline-offset-2 decoration-1 ${
              isDark 
                ? 'text-white hover:text-emerald-400 decoration-white/40' 
                : 'text-gray-900 hover:text-emerald-600 decoration-gray-400'
            }`}
          >
            ivokgrup
          </a>
        </span>
      </div>
    </footer>
  );
}
