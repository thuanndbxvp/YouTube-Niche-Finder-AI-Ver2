import React from 'react';
import { DownloadIcon } from './icons/Icons';

interface ActionBarProps {
    savedCount: number;
    onExport: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({ savedCount, onExport }) => {
    return (
        <div className="w-full bg-gray-800/80 border border-gray-700 rounded-lg p-3 mb-6 flex items-center justify-between">
            <p className="text-gray-300">
                <span className="font-bold">{savedCount}</span> ý tưởng đã được lưu vào bộ nhớ đệm.
            </p>
            <button
                onClick={onExport}
                disabled={savedCount === 0}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
                <DownloadIcon />
                <span>Xuất File Excel</span>
            </button>
        </div>
    );
};

export default ActionBar;