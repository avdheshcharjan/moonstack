import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  txHash?: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, txHash, onClose }) => {
  const bgColor = type === 'success'
    ? 'bg-green-500'
    : type === 'error'
    ? 'bg-red-500'
    : 'bg-blue-500';

  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';

  return (
    <div
      className={`max-w-md rounded-lg shadow-lg p-2 flex items-center gap-2 animate-slide-in ${bgColor} text-white`}
    >
      <div className="flex-1 flex items-center gap-2">
        <span className="font-semibold">{icon}</span>
        <span className="text-sm">{message}</span>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline ml-2 hover:text-blue-100"
          >
            View →
          </a>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
