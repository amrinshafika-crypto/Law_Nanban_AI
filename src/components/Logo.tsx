import { Scale, BrainCircuit } from 'lucide-react';

export function Logo({ size = 40, withText = true, light = false }: { size?: number; withText?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-navy-700 to-navy-900" />
        <div className="absolute inset-0 rounded-lg bg-grid-pattern bg-[length:8px_8px] opacity-30" />
        <div className="relative flex items-center justify-center">
          <Scale size={size * 0.55} className="text-gold-400" strokeWidth={2} />
          <BrainCircuit size={size * 0.4} className="text-accent-300 absolute -bottom-0.5 -right-0.5 bg-navy-900 rounded-full p-0.5" strokeWidth={2.5} />
        </div>
      </div>
      {withText && (
        <div className="leading-none">
          <div className={`font-serif text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>
            Law Nanban<span className="text-gold-500"> AI</span>
          </div>
          <div className={`text-[10px] font-medium tracking-wide uppercase ${light ? 'text-navy-200' : 'text-navy-500'}`}>
            Justice through Intelligence
          </div>
        </div>
      )}
    </div>
  );
}
