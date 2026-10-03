import React from 'react';

export interface PaymentSuccessCheckmarkProps {
  /** Size preset or custom width/height in px */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** 'gpay' (Google Pay outer ring & light green), 'filled', or 'outline' */
  variant?: 'gpay' | 'filled' | 'outline';
  /** Extra CSS classes */
  className?: string;
  /** Optional delay before checkmark animation starts in ms */
  delayMs?: number;
}

/**
 * Professional Success Checkmark Animation / Payment Success Animation
 *
 * Modeled after Google Pay (GPay) & Apple Pay:
 * 1. Delicate outer framing ring with subtle mint halo.
 * 2. Signature GPay light-green inner disc (#E6F4EA).
 * 3. Animated circular perimeter stroke (#059669).
 * 4. Animated checkmark drawing stroke (#059669) from left to right.
 * 5. Completely static aura — strictly NO radar pulse / animate-ping.
 */
export const PaymentSuccessCheckmark: React.FC<PaymentSuccessCheckmarkProps> = ({
  size = 'lg',
  variant = 'gpay',
  className = '',
  delayMs = 0
}) => {
  const getDimensions = () => {
    if (typeof size === 'number') {
      return { width: size, height: size, style: { width: `${size}px`, height: `${size}px` } };
    }
    switch (size) {
      case 'sm':
        return { width: 56, height: 56, className: 'w-14 h-14' };
      case 'md':
        return { width: 72, height: 72, className: 'w-18 h-18' };
      case 'xl':
        return { width: 120, height: 120, className: 'w-28 h-28 sm:w-32 sm:h-32' };
      case 'lg':
      default:
        return { width: 96, height: 96, className: 'w-24 h-24 sm:w-26 sm:h-26' };
    }
  };

  const dim = getDimensions();
  const animDelayStyle = delayMs > 0 ? { animationDelay: `${delayMs}ms` } : {};
  const checkDelay = `${(delayMs + 320) / 1000}s`;

  return (
    <div
      className={`relative flex items-center justify-center select-none ${dim.className || ''} ${className}`}
      style={dim.style}
    >
      {/* Soft static diffuse aura - completely static, no pulsating radar */}
      <div className="absolute inset-1 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />

      {/* SVG Canvas */}
      <svg
        className="w-full h-full relative z-10 overflow-visible"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="paymentSuccessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gpayLightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e6f4ea" />
            <stop offset="100%" stopColor="#d1fae5" />
          </linearGradient>
          <filter id="checkmarkDropShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#047857" floodOpacity="0.2" />
          </filter>
        </defs>

        {variant === 'gpay' ? (
          <>
            {/* === Exact Match to User Reference: Outer Ring + Gap + Inner Green Disc + White Checkmark === */}

            {/* 1. Outer Ring (#22c55e, animated stroke draw) */}
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="#22c55e"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="origin-center -rotate-90 animate-[gpayOuterRing289_0.45s_cubic-bezier(0.65,0,0.45,1)_forwards]"
              style={{
                strokeDasharray: 289,
                strokeDashoffset: 289,
                ...animDelayStyle
              }}
            />

            {/* 2. Inner Circle (#22c55e, spring pop-in with clean gap to outer ring) */}
            <circle
              cx="50"
              cy="50"
              r="37"
              fill="#22c55e"
              className="origin-center animate-[successCirclePop_0.42s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              style={{
                ...animDelayStyle,
                filter: 'drop-shadow(0 2px 8px rgba(34,197,94,0.22))'
              }}
            />

            {/* 3. Bold White Checkmark (#ffffff, stroke-draw animation) */}
            <path
              d="M34 52 L45 63 L67 38"
              stroke="#ffffff"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 50,
                strokeDashoffset: 50,
                animation: `checkmarkStrokeDraw50 0.38s ${checkDelay} cubic-bezier(0.65, 0, 0.45, 1) forwards`
              }}
            />
          </>
        ) : variant === 'filled' ? (
          <>
            {/* Apple Pay / Solid Emerald Variant */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="url(#paymentSuccessGradient)"
              className="origin-center animate-[successCirclePop_0.42s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              style={{ ...animDelayStyle, filter: 'drop-shadow(0 4px 12px rgba(16,185,129,0.32))' }}
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#6ee7b7"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="origin-center -rotate-90 animate-[successCircleDraw_0.45s_cubic-bezier(0.65,0,0.45,1)_forwards]"
              style={{
                strokeDasharray: 277,
                strokeDashoffset: 277,
                ...animDelayStyle
              }}
            />
            <path
              d="M30 52 L43 65 L70 37"
              stroke="#ffffff"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 65,
                strokeDashoffset: 65,
                animation: `checkmarkStrokeDraw 0.38s ${checkDelay} cubic-bezier(0.65, 0, 0.45, 1) forwards`
              }}
            />
          </>
        ) : (
          <>
            {/* Outline Variant */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="#ecfdf5"
              className="origin-center animate-[successCirclePop_0.42s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              style={animDelayStyle}
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="origin-center -rotate-90 animate-[successCircleDraw_0.45s_cubic-bezier(0.65,0,0.45,1)_forwards]"
              style={{
                strokeDasharray: 277,
                strokeDashoffset: 277,
                ...animDelayStyle
              }}
            />
            <path
              d="M30 52 L43 65 L70 37"
              stroke="#059669"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 65,
                strokeDashoffset: 65,
                animation: `checkmarkStrokeDraw 0.38s ${checkDelay} cubic-bezier(0.65, 0, 0.45, 1) forwards`
              }}
            />
          </>
        )}
      </svg>
    </div>
  );
};

// Aliases matching industry naming conventions referenced by user
export const AnimatedSuccessCheckmark = PaymentSuccessCheckmark;
export const BookingSuccessAnimation = PaymentSuccessCheckmark;
export const PaymentConfirmationAnimation = PaymentSuccessCheckmark;
export default PaymentSuccessCheckmark;
