
import React, { useState, useEffect } from 'react';
import type { ApiKeyStatus } from '../App';
import { CheckCircleIcon, XCircleIcon, TrashIcon } from './icons/Icons';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndCheckGemini: (apiKeys: string[]) => Promise<void>;
  onSaveAndCheckOpenAI: (apiKey: string) => Promise<void>;
  onRecheck: (apiKeys: string[]) => Promise<void>;
  onDeleteKey: (index: number) => void;
  currentApiKeys: string[];
  activeApiKeyIndex: number | null;
  apiKeyStatuses: ApiKeyStatus[];
  currentOpenAIApiKey: string;
  openAIApiKeyStatus: ApiKeyStatus;
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


const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
    isOpen, onClose, onSaveAndCheckGemini, onSaveAndCheckOpenAI, onRecheck, onDeleteKey, 
    currentApiKeys, activeApiKeyIndex, apiKeyStatuses,
    currentOpenAIApiKey, openAIApiKeyStatus
}) => {
  const [keysInput, setKeysInput] = useState('');
  const [openAiKeyInput, setOpenAiKeyInput] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeysInput(currentApiKeys.join('\n'));
      setOpenAiKeyInput(currentOpenAIApiKey);
    }
  }, [isOpen, currentApiKeys, currentOpenAIApiKey]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsChecking(true);
    const newGeminiKeys = keysInput.split('\n').map(k => k.trim()).filter(Boolean);
    
    // Run checks in parallel
    await Promise.all([
      onSaveAndCheckGemini(newGeminiKeys),
      onSaveAndCheckOpenAI(openAiKeyInput)
    ]);
    
    setIsChecking(false);
  };

  const handleRecheckCurrentKeys = async () => {
    setIsChecking(true);
    await onRecheck(currentApiKeys);
    setIsChecking(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 flex flex-col h-[85vh] md:h-[75vh]" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-2">Quản lý API Keys</h2>
        <p className="text-gray-400 mb-4 text-sm">
          Thêm hoặc chỉnh sửa API Keys cho Google Gemini và OpenAI.
        </p>
        
        {/* --- OpenAI Section --- */}
        <div className="mb-4">
            <h3 className="text-md font-bold text-gray-300 mb-2">OpenAI API Key</h3>
             <p className="text-gray-400 mb-2 text-xs">
                Bạn có thể lấy key từ <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">trang tổng quan OpenAI</a>.
            </p>
            <div className="flex items-center space-x-3 bg-gray-900/50 p-2 rounded-lg border border-gray-700">
                <StatusIcon status={openAIApiKeyStatus} />
                <input
                    type="password"
                    value={openAiKeyInput}
                    onChange={(e) => setOpenAiKeyInput(e.target.value)}
                    placeholder="Dán OpenAI Key (sk-...)"
                    className="flex-grow p-2 bg-transparent border-none rounded-md font-mono text-sm text-gray-300 focus:ring-0 outline-none"
                />
            </div>
        </div>


        {/* --- Gemini Section --- */}
        <div className="flex-grow flex flex-col min-h-0">
            <h3 className="text-md font-bold text-gray-300 mb-2">Google Gemini API Keys</h3>
             <p className="text-gray-400 mb-2 text-xs">
                Hệ thống sẽ tự động thử các key hợp lệ theo thứ tự nếu một key gặp lỗi.
            </p>
            <div className="max-h-32 overflow-y-auto bg-gray-900/50 p-3 rounded-lg border border-gray-700 mb-4">
                {currentApiKeys.length > 0 ? (
                    <ul className="space-y-2">
                        {currentApiKeys.map((key, index) => (
                            <li key={index} className={`flex items-center justify-between p-2 rounded-md transition-colors ${index === activeApiKeyIndex ? 'bg-teal-900/70' : 'bg-gray-700'}`}>
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <StatusIcon status={apiKeyStatuses[index] || 'idle'} />
                                    <span className="font-mono text-sm text-gray-300 truncate">
                                        {`Key ${index + 1}: ************${key.slice(-4)}`}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                    {index === activeApiKeyIndex && (
                                        <span className="text-xs text-teal-300 font-bold bg-teal-800/80 px-2 py-1 rounded-full">
                                            HOẠT ĐỘNG
                                        </span>
                                    )}
                                    <button
                                        onClick={() => onDeleteKey(index)}
                                        className="p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors"
                                        aria-label={`Xóa Key ${index + 1}`}
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm py-4">
                        Chưa có Gemini API key nào.
                    </div>
                )}
            </div>
        
            <label htmlFor="api-keys-textarea" className="text-sm font-semibold text-gray-400 mb-2">Chỉnh sửa Keys Gemini (mỗi key một dòng)</label>
            <textarea
                id="api-keys-textarea"
                value={keysInput}
                onChange={(e) => setKeysInput(e.target.value)}
                placeholder="Dán các Gemini API Key vào đây..."
                className="flex-grow p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all duration-300 font-mono text-sm resize-none"
            />
        </div>


        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={handleRecheckCurrentKeys}
            disabled={isChecking || currentApiKeys.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 rounded-md text-sm text-gray-300 hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking && <div className="w-4 h-4 border-2 border-t-white border-gray-800 rounded-full animate-spin"></div>}
            <span>Kiểm tra lại Gemini Keys</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isChecking}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 rounded-md text-sm text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking && <div className="w-4 h-4 border-2 border-t-white border-teal-800 rounded-full animate-spin"></div>}
            <span>{isChecking ? 'Đang kiểm tra...' : 'Lưu và kiểm tra tất cả'}</span>
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
