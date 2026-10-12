import React from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-6 animate-fade-in">
      <div className="w-full max-w-[280px] bg-[#252528] border border-white/10 rounded-[18px] shadow-2xl overflow-hidden text-center transition-all scale-100 animate-fade-in">
        {/* Title & Message */}
        <div className="px-4 pt-5 pb-4">
          <h3 className="font-semibold text-white text-[17px] leading-snug">{title}</h3>
          {message && (
            <p className="text-[#8E8E93] text-[13px] leading-normal mt-1.5 text-center">{message}</p>
          )}
        </div>

        {/* Buttons */}
        <div className={`border-t border-white/[0.12] ${onCancel ? 'grid grid-cols-2' : 'flex'}`}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-11 text-[17px] text-[#007AFF] font-normal border-r border-white/[0.12] active:bg-white/[0.08] transition-colors flex items-center justify-center"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-11 text-[17px] font-semibold flex items-center justify-center active:bg-white/[0.08] transition-colors ${
              isDestructive ? 'text-[#FF3B30]' : 'text-[#007AFF]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
