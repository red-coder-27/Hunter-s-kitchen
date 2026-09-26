import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  hasError?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  hasError = false
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of individual characters
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanDigits = rawVal.replace(/\D/g, '');

    if (!cleanDigits) {
      // Deletion or invalid character
      const nextDigits = [...digits];
      nextDigits[index] = '';
      const newOtp = nextDigits.join('');
      onChange(newOtp);
      return;
    }

    if (cleanDigits.length > 1) {
      // If user typed a new digit while the box had a previous digit (e.g. "48")
      // Take the last entered character if length is 2, otherwise treat as paste
      if (cleanDigits.length === 2 && digits[index]) {
        const charToUse = cleanDigits.replace(digits[index], '') || cleanDigits[cleanDigits.length - 1];
        const nextDigits = [...digits];
        nextDigits[index] = charToUse;
        const newOtp = nextDigits.join('');
        onChange(newOtp);

        if (newOtp.length === length && onComplete) {
          onComplete(newOtp);
        }

        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus();
          inputRefs.current[index + 1]?.select();
        }
        return;
      }

      // Pasted multi-character string
      handlePasteDigits(index, cleanDigits);
      return;
    }

    const singleDigit = cleanDigits;
    const nextDigits = [...digits];
    nextDigits[index] = singleDigit;
    const newOtp = nextDigits.join('');
    onChange(newOtp);

    if (newOtp.length === length && onComplete) {
      onComplete(newOtp);
    }

    // Auto-advance to next box
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is already empty, move to previous box and clear it
        e.preventDefault();
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        const newOtp = nextDigits.join('');
        onChange(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const cleanDigits = pasteData.replace(/\D/g, '').slice(0, length);
    if (!cleanDigits) return;

    onChange(cleanDigits);
    if (cleanDigits.length === length && onComplete) {
      onComplete(cleanDigits);
    }
    const focusIndex = Math.min(cleanDigits.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handlePasteDigits = (startIndex: number, pastedString: string) => {
    const clean = pastedString.replace(/\D/g, '');
    const current = digits.slice(0, startIndex);
    const combined = (current.join('') + clean).slice(0, length);
    onChange(combined);
    if (combined.length === length && onComplete) {
      onComplete(combined);
    }
    const focusIndex = Math.min(combined.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-sm mx-auto">
      {Array.from({ length }).map((_, index) => {
        const isFilled = Boolean(digits[index]);
        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            value={digits[index]}
            disabled={disabled}
            onChange={(e) => handleInputChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border transition-all duration-150 outline-none select-all ${
              hasError
                ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:border-red-600 focus:ring-4 focus:ring-red-500/15'
                : isFilled
                ? 'border-stone-400 bg-stone-50/60 text-stone-900 font-black shadow-xs focus:border-red-600 focus:ring-4 focus:ring-red-500/15 focus:bg-white'
                : 'border-stone-300 bg-stone-50/80 text-stone-900 hover:border-stone-400 focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-500/15 focus:shadow-sm'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          />
        );
      })}
    </div>
  );
};
