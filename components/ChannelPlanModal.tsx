import React, { useState } from 'react';
import type { Niche } from '../types';
import { DocumentTextIcon, XIcon, ArrowsExpandIcon, ArrowsShrinkIcon, DownloadIcon } from './icons/Icons';
import { themes } from '../theme';
import { exportTextToTxt } from '../utils/export';

interface ChannelPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planContent: string | null;
  activeNiche: Niche | null;
  theme: string;
}

const ChannelPlanModal: React.FC<ChannelPlanModalProps> = ({ isOpen, onClose, planContent, activeNiche, theme }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen || !planContent) return null;

  const currentTheme = themes[theme] || themes.teal;

  const handleDownload = () => {
    if (planContent && activeNiche) {
        exportTextToTxt(planContent, `channel_plan_${activeNiche.niche_name.original}`);
    }
  };
  
  // A simple markdown to HTML renderer for basic formatting
  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-200 mt-4 mb-2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-300 mt-3 mb-1">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-6 list-disc">$1</li>')
      .replace(/^( {2,})- (.*$)/gim, (match, spaces, content) => {
          const indentLevel = Math.floor(spaces.length / 2);
          return `<li style="margin-left: ${indentLevel * 1.5}rem;" class="list-disc">${content}</li>`
      })
      .replace(/\n/g, '<br />');

    // Remove <br /> between list items and before headers to clean up spacing
    html = html.replace(/<\/li><br \/><li>/g, '</li><li>');
    html = html.replace(/<br \/>(<h[23]>)/g, '$1');

    return <div className="text-sm text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  };


  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" 
        onClick={onClose}
    >
      <div 
        className={`bg-gray-800 rounded-lg shadow-xl flex flex-col transition-all duration-300 ${isMaximized ? 'w-full h-full max-w-full max-h-full rounded-none' : 'w-full max-w-4xl h-[90vh]'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
                <div className="text-teal-400">
                    <DocumentTextIcon />
                </div>
                <div>
                    <h2 className={`text-xl font-bold bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>Kế hoạch phát triển kênh</h2>
                    <p className="text-sm text-gray-400">Phân tích chi tiết cho ngách: <span className="font-semibold text-gray-300">{activeNiche?.niche_name.translated}</span></p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                    aria-label={isMaximized ? "Thu nhỏ" : "Phóng to"}
                >
                    {isMaximized ? <ArrowsShrinkIcon /> : <ArrowsExpandIcon />}
                </button>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="Đóng"
                >
                    <XIcon />
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900/50">
           {renderMarkdown(planContent)}
        </div>
        
         <footer className="p-4 border-t border-gray-700 flex justify-end items-center gap-4 flex-shrink-0">
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-gray-200 rounded-md text-sm hover:bg-gray-500 hover:text-white font-semibold transition-colors"
            >
                <DownloadIcon/>
                <span>Tải về (.txt)</span>
            </button>
            <button
                onClick={onClose}
                className={`px-4 py-2 rounded-md text-sm text-white transition-colors font-semibold ${currentTheme.bg} ${currentTheme.bgHover}`}
            >
                Đóng
            </button>
         </footer>
      </div>
    </div>
  );
};

export default ChannelPlanModal;
