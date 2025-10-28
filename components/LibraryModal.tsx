
import React, { useState, useEffect, useCallback } from 'react';
import type { Niche } from '../types';
import { BookmarkIcon, XIcon, DownloadIcon, TrashIcon, GoogleIcon, CheckCircleIcon, ExclamationTriangleIcon } from './icons/Icons';
import { generateNichesCsvContent } from '../utils/export';
import { themes } from '../theme';

// --- Google API Configuration ---
// BƯỚC QUAN TRỌNG: Thay thế giá trị dưới đây bằng Client ID của bạn từ Google Cloud Console.
// Hướng dẫn: https://developers.google.com/drive/api/quickstart/js#authorize_credentials_for_a_web_application
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedNiches: Niche[];
  onDeleteNiche: (nicheName: string) => void;
  onDeleteAll: () => void;
  onExport: () => void;
  theme: string;
}

const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose, savedNiches, onDeleteNiche, onDeleteAll, onExport, theme }) => {
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const themeGradient = themes[theme]?.gradient || themes.teal.gradient;
  const isGoogleDriveConfigured = CLIENT_ID && CLIENT_ID !== 'YOUR_CLIENT_ID.apps.googleusercontent.com';

  useEffect(() => {
    if (isOpen && isGoogleDriveConfigured) {
        // Dynamically load Google API scripts only when the modal is open and configured
        const scriptGapi = document.createElement('script');
        scriptGapi.src = 'https://apis.google.com/js/api.js';
        scriptGapi.async = true;
        scriptGapi.defer = true;
        scriptGapi.onload = () => (window as any).gapi.load('client', () => setGapiReady(true));
        document.body.appendChild(scriptGapi);

        const scriptGis = document.createElement('script');
        scriptGis.src = 'https://accounts.google.com/gsi/client';
        scriptGis.async = true;
        scriptGis.defer = true;
        scriptGis.onload = () => setGisReady(true);
        document.body.appendChild(scriptGis);

        return () => {
          // Cleanup scripts when component unmounts
          document.body.removeChild(scriptGapi);
          document.body.removeChild(scriptGis);
        };
    }
  }, [isOpen, isGoogleDriveConfigured]);
  
  const initGoogleClient = useCallback(() => {
    if (gapiReady && gisReady && (window as any).google && (window as any).gapi) {
        try {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        (window as any).gapi.client.setToken(tokenResponse);
                        setIsSignedIn(true);
                    }
                },
            });
            setTokenClient(client);
        } catch (e: any) {
             console.error("Error initializing Google Client:", e);
             setUploadMessage({ type: 'error', text: `Lỗi khởi tạo Google Client. Vui lòng kiểm tra lại Client ID. Lỗi: ${e.message}` });
        }
    }
  }, [gapiReady, gisReady]);

  useEffect(() => {
    if (isGoogleDriveConfigured) {
      initGoogleClient();
    }
  }, [initGoogleClient, isGoogleDriveConfigured]);
  

  const handleAuthClick = () => {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };
  
  const handleSignoutClick = () => {
    const token = (window as any).gapi.client.getToken();
    if (token !== null) {
        (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
            (window as any).gapi.client.setToken(null);
            setIsSignedIn(false);
            setUploadMessage(null);
        });
    }
  };
  
  const handleUploadToDrive = async () => {
    if (savedNiches.length === 0) return;
    setIsUploadingToDrive(true);
    setUploadMessage(null);

    const csvContent = generateNichesCsvContent(savedNiches);
    const fileName = `youtube_niche_library_${new Date().toISOString().split('T')[0]}.csv`;
    const metadata = {
        name: fileName,
        mimeType: 'text/csv',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/csv\r\n\r\n' +
        csvContent +
        close_delim;
    
    try {
        await (window as any).gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: {
                'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body: multipartRequestBody,
        });
        setUploadMessage({ type: 'success', text: `Tệp "${fileName}" đã được lưu thành công vào Google Drive của bạn.` });
    } catch (error: any) {
        console.error('Error uploading to Drive:', error);
        setUploadMessage({ type: 'error', text: `Lỗi khi tải lên: ${error.result?.error?.message || 'Vui lòng thử lại.'}` });
    } finally {
        setIsUploadingToDrive(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const renderGoogleDriveSection = () => {
      if (!isGoogleDriveConfigured) {
          return (
              <div className="text-sm text-yellow-300 bg-yellow-900/50 p-3 rounded-md border border-yellow-700/80 flex items-start gap-3">
                  <div className="text-yellow-400 mt-0.5"><ExclamationTriangleIcon /></div>
                  <div>
                      <p className="font-bold">Tính năng Đồng bộ Google Drive chưa được cấu hình.</p>
                      <p className="text-yellow-400">Để kích hoạt, nhà phát triển cần thêm Google Client ID hợp lệ vào file <code>components/LibraryModal.tsx</code>.</p>
                  </div>
              </div>
          );
      }
      
      if (!isSignedIn) {
           return (
                <button
                    onClick={handleAuthClick}
                    disabled={!gapiReady || !gisReady}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <GoogleIcon />
                    <span>Đăng nhập với Google</span>
                </button>
           );
      }

      return (
            <div className="space-y-3">
                 <button
                    onClick={handleUploadToDrive}
                    disabled={isUploadingToDrive || savedNiches.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {isUploadingToDrive ? (
                        <>
                            <div className="w-5 h-5 border-2 border-t-white border-blue-800 rounded-full animate-spin"></div>
                            <span>Đang tải lên...</span>
                        </>
                    ) : (
                        <>
                            <GoogleIcon />
                            <span>Lưu vào Google Drive</span>
                        </>
                    )}
                </button>
                 <button onClick={handleSignoutClick} className="w-full text-xs text-gray-400 hover:underline">
                    Đăng xuất
                </button>
            </div>
      );
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="text-teal-400">
                    <BookmarkIcon />
                </div>
                <div>
                    <h2 className={`text-xl font-bold bg-gradient-to-r ${themeGradient} text-transparent bg-clip-text`}>Thư viện ý tưởng đã lưu</h2>
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
        
        <div className="p-4 border-t border-gray-700 space-y-4">
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <h3 className={`font-semibold mb-3 bg-gradient-to-r ${themeGradient} text-transparent bg-clip-text`}>Đồng bộ với Google Drive</h3>
                {renderGoogleDriveSection()}
                {uploadMessage && (
                    <div className={`mt-3 p-2 rounded-md text-sm flex items-start gap-2 ${uploadMessage.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        <div className="mt-0.5"><CheckCircleIcon /></div>
                        <span>{uploadMessage.text}</span>
                    </div>
                )}
            </div>
            
             <div className="flex justify-end items-center gap-4">
                <button
                    onClick={() => savedNiches.length > 0 && onDeleteAll()}
                    disabled={savedNiches.length === 0}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/80 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                    <TrashIcon />
                    <span>Xóa tất cả</span>
                </button>
                <button
                    onClick={() => savedNiches.length > 0 && onExport()}
                    disabled={savedNiches.length === 0}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                    <DownloadIcon />
                    <span>Tải về máy (.csv)</span>
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
    </div>
  );
};

export default LibraryModal;