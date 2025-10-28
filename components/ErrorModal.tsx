// Fix: Implement a reusable error modal component.
import React from 'react';
import { ExclamationTriangleIcon } from './icons/Icons';
import { themes } from '../theme';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  theme: string;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, title, children, actionText, onAction, theme }) => {
  if (!isOpen) return null;
  
  const themeGradient = themes[theme]?.gradient || themes.teal.gradient;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="text-red-400 p-2 bg-red-900/40 rounded-full mt-1">
            <ExclamationTriangleIcon />
          </div>
          <div>
            <h2 className={`text-xl font-bold bg-gradient-to-r ${themeGradient} text-transparent bg-clip-text`}>{title}</h2>
            <div className="text-sm text-gray-400 mt-2">{children}</div>
          </div>
        </div>
        <div className="flex justify-end items-center space-x-4 mt-6">
           {actionText && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2 bg-teal-600 rounded-md text-sm text-white hover:bg-teal-700 transition-colors font-semibold"
            >
              {actionText}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-700 rounded-md text-sm text-gray-200 hover:bg-gray-600 transition-colors font-semibold"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;