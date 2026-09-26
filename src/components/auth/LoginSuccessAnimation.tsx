import React, { useEffect } from 'react';
import { User } from '../../types';
import { PaymentSuccessCheckmark } from '../PaymentSuccessCheckmark';

interface LoginSuccessAnimationProps {
  user?: User;
  onComplete: () => void;
  durationMs?: number;
}

export const LoginSuccessAnimation: React.FC<LoginSuccessAnimationProps> = ({
  onComplete,
  durationMs = 2000
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onComplete]);

  return (
    <div
      onClick={onComplete}
      className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center p-6 select-none cursor-pointer animate-in fade-in duration-200"
    >
      {/* Animated Tick Checkmark */}
      <div className="flex items-center justify-center mb-6">
        <PaymentSuccessCheckmark
          size="xl"
          variant="gpay"
          className="scale-110 sm:scale-125 transition-transform"
        />
      </div>

      {/* Title Alone */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight text-center animate-[fadeUp_0.4s_0.2s_ease-out_both]">
        Signed in Successfully!
      </h1>

      {/* Embedded CSS Keyframe */}
      <style>{`
        @keyframes fadeUp {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default LoginSuccessAnimation;
