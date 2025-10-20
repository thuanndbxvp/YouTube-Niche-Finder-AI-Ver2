
import React from 'react';
import type { Niche } from '../types';
import { BookmarkIcon, XIcon, DownloadIcon, TrashIcon } from './icons/Icons';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedNiches: Niche[];
  onDeleteNiche: (nicheName: string) => void;
  onDeleteAll: () => void;
  onExport: () => void;
}

const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose, savedNiches, onDeleteNiche, onDeleteAll, onExport }) => {
  if (!isOpen) return null;

  const handleExportClick = () => {
    if (savedNiches.length > 0) {
      onExport();
    }
  };
  
  const handleDeleteAllClick = () => {
    if (savedNiches.length > 0) {
        onDeleteAll();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="text-teal-400">
                    <BookmarkIcon />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Thư viện ý tưởng đã lưu</h2>
                    <p className="text-sm text-gray-400">Quản lý và xuất các ý tưởng ngách bạn đã lưu.</p>
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

        <div className="flex-1 overflow-y-auto p-4">
          {savedNiches.length > 0 ? (
            <ul className="space-y-2">
              {savedNiches.map((niche, index) => (
                <li key={index} className="flex items-center justify-between p-3 rounded-md bg-gray-900/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors">
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-gray-200 truncate" title={niche.niche_name.original}>{niche.niche_name.original}</p>
                    <p className="text-sm text-gray-400 truncate" title={niche.niche_name.translated}>{niche.niche_name.translated}</p>
                  </div>
                  <button
                    onClick={() => onDeleteNiche(niche.niche_name.original)}
                    className="p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors flex-shrink-0 ml-4"
                    aria-label={`Xóa niche ${niche.niche_name.translated}`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <p className="text-gray-500">Thư viện của bạn trống.<br/>Hãy bấm "Lưu kết quả" trên một ý tưởng để thêm vào đây.</p>
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-gray-700 flex justify-end items-center gap-4">
            <button
                onClick={handleDeleteAllClick}
                disabled={savedNiches.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/80 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
                <TrashIcon />
                <span>Xóa tất cả</span>
            </button>
            <button
                onClick={handleExportClick}
                disabled={savedNiches.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
                <DownloadIcon />
                <span>Xuất File Excel</span>
            </button>
            <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-600 transition-colors"
            >
                Đóng
            </button>
        </footer>
      </div>
    </div>
  );
};

export default LibraryModal;
