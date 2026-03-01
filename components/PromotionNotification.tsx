import React, { useState, useEffect } from 'react';
import { XIcon } from './icons/Icons';

const PromotionNotification: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show initially after 5 minutes
    const timer = setInterval(() => {
      setIsVisible(true);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[90] max-w-sm w-full bg-gray-800/95 backdrop-blur border border-gray-600 rounded-xl shadow-2xl p-5 animate-fade-in-up transition-all duration-300 transform hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wide">Gợi ý công cụ</h4>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded-full transition-colors"
        >
          <XIcon />
        </button>
      </div>
      
      <p className="text-gray-300 text-sm mb-4 leading-relaxed">
        Chúng tôi có tool ghép tạo video từ ảnh/video khớp lời thoại với Audio, Voice chạy tới đâu là Ảnh/video hiển thị tới đó.
      </p>
      
      <a 
        href="https://www.ai86.pro/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full text-center bg-gray-700 hover:bg-gray-600 text-blue-400 hover:text-blue-300 text-sm font-semibold py-2 rounded-lg transition-colors"
      >
        Mời các bạn tham khảo: AI86.Pro
      </a>
    </div>
  );
};

export default PromotionNotification;
