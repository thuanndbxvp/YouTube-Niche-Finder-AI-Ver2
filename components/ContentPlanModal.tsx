import React from 'react';
import type { ContentPlanResult, Niche } from '../types';
import { DocumentTextIcon, XIcon, SparklesIcon, LightBulbIcon, DownloadIcon } from './icons/Icons';
import { exportContentPlanToTxt } from '../utils/export';

interface ContentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentPlan: ContentPlanResult | null;
  activeNiche: Niche | null;
}

const ContentPlanModal: React.FC<ContentPlanModalProps> = ({ isOpen, onClose, contentPlan, activeNiche }) => {
  if (!isOpen || !contentPlan) return null;

  const handleDownload = () => {
    if (contentPlan && activeNiche) {
        exportContentPlanToTxt(contentPlan, activeNiche.niche_name.original);
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" 
        onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="text-teal-400">
                    <DocumentTextIcon />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Kế hoạch nội dung chi tiết</h2>
                    <p className="text-sm text-gray-400">Dưới đây là các ý tưởng kịch bản chi tiết cho ngách: <span className="font-semibold text-gray-300">{activeNiche?.niche_name.translated}</span></p>
                </div>
            </div>
            <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Đóng"
            >
                <XIcon />
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-900/50">
          {contentPlan.content_ideas.map((idea, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h3 className="text-xl font-bold text-teal-300">{idea.title.original}</h3>
              <h4 className="text-md text-gray-400 italic mb-4">{idea.title.translated}</h4>

              <div className="space-y-4">
                <div>
                  <h5 className="font-semibold text-gray-200 flex items-center gap-2 mb-2"><SparklesIcon /> <span>Mở đầu (Hook)</span></h5>
                  <p className="text-gray-400 text-sm pl-7 border-l-2 border-gray-700 ml-2.5 py-1">{idea.hook}</p>
                </div>
                
                <div>
                  <h5 className="font-semibold text-gray-200 flex items-center gap-2 mb-2"><LightBulbIcon /> <span>Các luận điểm chính</span></h5>
                  <ul className="list-disc list-outside text-gray-400 text-sm space-y-1 pl-12 border-l-2 border-gray-700 ml-2.5 py-1">
                    {idea.main_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-200 flex items-center gap-2 mb-2">💡 <span>Gợi ý hình ảnh (Visuals)</span></h5>
                  <p className="text-gray-400 text-sm pl-7 border-l-2 border-gray-700 ml-2.5 py-1">{idea.visual_suggestions}</p>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-200 flex items-center gap-2 mb-2">🎯 <span>Kêu gọi hành động (CTA)</span></h5>
                   <p className="text-gray-400 text-sm pl-7 border-l-2 border-gray-700 ml-2.5 py-1">{idea.call_to_action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
         <footer className="p-4 border-t border-gray-700 flex justify-end items-center gap-4">
             <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-gray-200 rounded-md text-sm hover:bg-gray-500 hover:text-white font-semibold transition-colors"
             >
                <DownloadIcon/>
                <span>Tải về (.txt)</span>
             </button>
             <button
                onClick={onClose}
                className="px-4 py-2 bg-teal-600 rounded-md text-sm text-white hover:bg-teal-700 transition-colors font-semibold"
            >
                Đóng
            </button>
         </footer>
      </div>
    </div>
  );
};

export default ContentPlanModal;