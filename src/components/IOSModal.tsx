import React, { useEffect } from 'react';

export interface IOSAlertProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const IOSAlert: React.FC<IOSAlertProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  isDestructive = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in">
      <div className="w-full max-w-[280px] bg-[#252528]/95 backdrop-blur-2xl border border-white/10 rounded-[20px] shadow-2xl overflow-hidden text-center transition-all scale-100 animate-fade-in">
        {/* Title & Message */}
        <div className="px-5 pt-5 pb-4">
          <h3 className="font-semibold text-white text-[17px] leading-snug tracking-tight">{title}</h3>
          {message && (
            <p className="text-[#8E8E93] text-[13px] leading-normal mt-1.5 text-center">{message}</p>
          )}
        </div>

        {/* Buttons with iOS hairline divider */}
        <div className={`border-t-[0.5px] border-white/15 ${onCancel ? 'grid grid-cols-2' : 'flex'}`}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-11 text-[17px] text-[#0A84FF] font-normal border-r-[0.5px] border-white/15 active:bg-white/[0.08] transition-colors flex items-center justify-center"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-11 text-[17px] font-semibold flex items-center justify-center active:bg-white/[0.08] transition-colors ${
              isDestructive ? 'text-[#FF453A]' : 'text-[#0A84FF]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface IOSSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  children: React.ReactNode;
}

export const IOSSheet: React.FC<IOSSheetProps> = ({
  isOpen,
  onClose,
  title,
  cancelText = '取消',
  confirmText,
  onConfirm,
  confirmDisabled = false,
  children
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/65 backdrop-blur-md animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg mx-auto bg-[#1C1C1E] border-t border-white/10 rounded-t-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pb-safe-bottom animate-sheet-up z-10">
        {/* Grabber Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>

        {/* Sheet Navigation Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b-[0.5px] border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="text-[17px] text-[#0A84FF] font-normal active:opacity-60 transition-opacity"
          >
            {cancelText}
          </button>
          {title && (
            <h3 className="text-[17px] font-semibold text-white tracking-tight">{title}</h3>
          )}
          {confirmText ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`text-[17px] font-semibold transition-opacity ${
                confirmDisabled ? 'text-white/30 cursor-not-allowed' : 'text-[#0A84FF] active:opacity-60'
              }`}
            >
              {confirmText}
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
