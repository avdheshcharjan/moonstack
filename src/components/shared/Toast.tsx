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
  const label = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info';

  return (
    <div
      className={`max-w-md rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in ${bgColor} text-white`}
    >
      <div className="flex-1">
        <div className="font-semibold mb-1">
          {icon} {label}
        </div>
        <div className="text-sm">{message}</div>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline mt-2 inline-block hover:text-blue-100"
          >
            View on BaseScan →
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
