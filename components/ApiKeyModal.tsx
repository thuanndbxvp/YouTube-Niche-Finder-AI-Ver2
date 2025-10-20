import React, { useState, useEffect } from 'react';
import type { ApiKeyStatus } from '../App';
import { CheckCircleIcon, XCircleIcon } from './icons/Icons';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndCheck: (apiKeys: string[]) => Promise<void>;
  currentApiKeys: string[];
  activeApiKeyIndex: number | null;
  apiKeyStatuses: ApiKeyStatus[];
}

const StatusIcon: React.FC<{ status: ApiKeyStatus }> = ({ status }) => {
    if (status === 'checking') {
        return <div className="w-4 h-4 border-2 border-t-teal-400 border-gray-500 rounded-full animate-spin"></div>;
    }
    if (status === 'valid') {
        return <div className="text-green-400"><CheckCircleIcon /></div>;
    }
    if (status === 'invalid') {
        return <div className="text-red-400"><XCircleIcon /></div>;
    }
    return <div className="w-4 h-4"></div>; // Placeholder for 'idle'
};


const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSaveAndCheck, currentApiKeys, activeApiKeyIndex, apiKeyStatuses }) => {
  const [keysInput, setKeysInput] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeysInput(currentApiKeys.join('\n'));
    }
  }, [isOpen, currentApiKeys]);

  if (!isOpen) return null;

  const handleSaveAndCheck = async () => {
    setIsChecking(true);
    const newKeys = keysInput.split('\n').map(k => k.trim()).filter(Boolean);
    await onSaveAndCheck(newKeys);
    setIsChecking(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-2">Quản lý API Keys</h2>
        <p className="text-gray-400 mb-4 text-sm">
          Thêm hoặc chỉnh sửa nhiều Gemini API Key. Bấm "Lưu và kiểm tra" để xác thực các key. Hệ thống sẽ tự động thử các key hợp lệ theo thứ tự nếu một key gặp lỗi.
        </p>
        
        <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Danh sách Keys hiện tại</h3>
            <div className="max-h-32 overflow-y-auto bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                {currentApiKeys.length > 0 ? (
                    <ul className="space-y-2">
                        {currentApiKeys.map((key, index) => (
                            <li key={index} className={`flex items-center justify-between p-2 rounded-md transition-colors ${index === activeApiKeyIndex ? 'bg-teal-900/70' : 'bg-gray-700'}`}>
                                <div className="flex items-center space-x-3">
                                    <StatusIcon status={apiKeyStatuses[index] || 'idle'} />
                                    <span className="font-mono text-sm text-gray-300 truncate">
                                        {`Key ${index + 1}: ************${key.slice(-4)}`}
                                    </span>
                                </div>
                                {index === activeApiKeyIndex && (
                                    <span className="text-xs text-teal-300 font-bold bg-teal-800/80 px-2 py-1 rounded-full">
                                        ĐANG HOẠT ĐỘNG
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm py-4">
                        Chưa có API key nào.
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex-grow flex flex-col">
          <label htmlFor="api-keys-textarea" className="text-sm font-semibold text-gray-400 mb-2">Chỉnh sửa Keys (mỗi key một dòng)</label>
          <textarea
            id="api-keys-textarea"
            value={keysInput}
            onChange={(e) => setKeysInput(e.target.value)}
            placeholder="Dán các API Key vào đây, mỗi key trên một dòng..."
            className="flex-grow p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all duration-300 font-mono text-sm resize-none"
          />
        </div>


        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={handleSaveAndCheck}
            disabled={isChecking}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 rounded-md text-sm text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking && <div className="w-4 h-4 border-2 border-t-white border-teal-800 rounded-full animate-spin"></div>}
            <span>{isChecking ? 'Đang kiểm tra...' : 'Lưu và kiểm tra'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;