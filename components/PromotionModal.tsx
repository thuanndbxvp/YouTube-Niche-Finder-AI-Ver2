import React from 'react';
import { XIcon } from './icons/Icons';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 border border-gray-600 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden animate-fade-in-down">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-full"
        >
          <XIcon />
        </button>
        
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-3">Gợi ý công cụ hữu ích</h3>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Chúng tôi có tool ghép tạo video từ ảnh/video khớp lời thoại với Audio, Voice chạy tới đâu là Ảnh/video hiển thị tới đó.
          </p>
          
          <a 
            href="https://www.ai86.pro/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-500/25"
          >
            Mời các bạn tham khảo: AI86.Pro
          </a>
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;
