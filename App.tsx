import React, { useState, useEffect } from 'react';
import { analyzeNicheIdea, getTrainingResponse, generateContentPlan, validateApiKey, developVideoIdeas } from './services/geminiService';
import type { AnalysisResult, ChatMessage, Part, Niche, FilterLevel, ContentPlanResult, Notification as NotificationType } from './types';
import SearchBar from './components/SearchBar';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';
import ApiKeyModal from './components/ApiKeyModal';
import TrainAiModal from './components/TrainAiModal';
import { BrainIcon } from './components/icons/Icons';
import InitialSuggestions from './components/InitialSuggestions';
import ActionBar from './components/ActionBar';
import { exportNichesToCsv } from './utils/export';
import PasswordModal from './components/PasswordModal';
import ContentPlanModal from './components/ContentPlanModal';
import ErrorModal from './components/ErrorModal';
import NotificationCenter from './components/NotificationCenter';
import { keyFindingTranscript, nicheKnowledgeBase, parseKnowledgeBaseForSuggestions } from './data/knowledgeBase';

export type ApiKeyStatus = 'idle' | 'checking' | 'valid' | 'invalid';

// Helper to convert File to a part for Gemini API
async function fileToGenerativePart(file: File): Promise<Part> {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
}

const FilterDropdown: React.FC<{
    label: string;
    value: FilterLevel;
    onChange: (value: FilterLevel) => void;
    disabled: boolean;
}> = ({ label, value, onChange, disabled }) => (
    <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as FilterLevel)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all duration-300"
            disabled={disabled}
        >
            <option value="all">Tất cả</option>
            <option value="low">Thấp</option>
            <option value="medium">Trung Bình</option>
            <option value="high">Cao</option>
        </select>
    </div>
);

// Fisher-Yates shuffle algorithm
const shuffleArray = (array: string[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};


const App: React.FC = () => {
  const [userInput, setUserInput] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<{ title: string; body: React.ReactNode; actionText?: string; onAction?: () => void; } | null>(null);
  const [targetMarket, setTargetMarket] = useState<string>('Quốc tế');
  const [customMarket, setCustomMarket] = useState<string>('');
  const [analysisDepth, setAnalysisDepth] = useState<number>(0);
  const [savedNiches, setSavedNiches] = useState<Niche[]>([]);
  const [numResults, setNumResults] = useState<string>('5');
  const [searchPlaceholder, setSearchPlaceholder] = useState<string>("ví dụ: 'Khám phá không gian', 'Dự án DIY tại nhà', 'Nấu ăn'");

  // Filters
  const [interestLevel, setInterestLevel] = useState<FilterLevel>('all');
  const [monetizationLevel, setMonetizationLevel] = useState<FilterLevel>('all');
  const [competitionLevel, setCompetitionLevel] = useState<FilterLevel>('all');
  const [sustainabilityLevel, setSustainabilityLevel] = useState<FilterLevel>('all');

  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [apiKeyStatuses, setApiKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [activeApiKeyIndex, setActiveApiKeyIndex] = useState<number | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isTrainAiModalOpen, setIsTrainAiModalOpen] = useState<boolean>(false);

  const [trainingChatHistory, setTrainingChatHistory] = useState<ChatMessage[]>([]);
  const [isTrainingLoading, setIsTrainingLoading] = useState<boolean>(false);
  
  const [trainingPassword, setTrainingPassword] = useState<string>('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [passwordModalMode, setPasswordModalMode] = useState<'login' | 'change'>('login');
  
  // Content Plan State
  const [contentPlan, setContentPlan] = useState<ContentPlanResult | null>(null);
  const [isContentPlanModalOpen, setIsContentPlanModalOpen] = useState<boolean>(false);
  const [generatingNiches, setGeneratingNiches] = useState<Set<string>>(new Set());
  const [contentPlanCache, setContentPlanCache] = useState<Record<string, ContentPlanResult>>({});
  const [activeNicheForContentPlan, setActiveNicheForContentPlan] = useState<Niche | null>(null);
  const [isContentPlanLoadingMore, setIsContentPlanLoadingMore] = useState<boolean>(false);
  
  // Notifications State
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  // Helper function to validate keys and set statuses
  const checkAndSetApiKeys = async (keysToCheck: string[]) => {
    if (keysToCheck.length === 0) {
        setApiKeyStatuses([]);
        return;
    }
    
    // Set statuses to 'checking' to provide immediate feedback
    setApiKeyStatuses(keysToCheck.map(() => 'checking'));
    
    // Validate each key in parallel
    const validationPromises = keysToCheck.map(key => validateApiKey(key));
    const results = await Promise.all(validationPromises);
    
    const finalStatuses = results.map(isValid => (isValid ? 'valid' : 'invalid'));
    setApiKeyStatuses(finalStatuses);
  };


  useEffect(() => {
    // Auto-validate API keys on initial load
    const autoValidateApiKeys = async () => {
        try {
            const storedApiKeys = localStorage.getItem('geminiApiKeys');
            if (storedApiKeys) {
                const parsedKeys = JSON.parse(storedApiKeys);
                if (Array.isArray(parsedKeys) && parsedKeys.length > 0) {
                    setApiKeys(parsedKeys);
                    await checkAndSetApiKeys(parsedKeys); // Auto-validate stored keys
                }
            }
        } catch (e) {
            console.error("Could not parse API keys from localStorage", e);
            localStorage.removeItem('geminiApiKeys');
        }
    };
    
    autoValidateApiKeys();

    // Load saved niches
    try {
        const storedNiches = localStorage.getItem('savedNiches');
        if (storedNiches) {
            setSavedNiches(JSON.parse(storedNiches));
        }
    } catch (e) {
        console.error("Could not parse saved niches from localStorage", e);
        localStorage.removeItem('savedNiches');
    }
    
    // Training Password
    const storedPassword = localStorage.getItem('trainingPassword');
    if (storedPassword) {
      setTrainingPassword(storedPassword);
    } else {
      const defaultPassword = 'Nhocyeu1';
      localStorage.setItem('trainingPassword', defaultPassword);
      setTrainingPassword(defaultPassword);
    }

    // Training History
    const storedTrainingHistory = localStorage.getItem('trainingChatHistory');
    if (storedTrainingHistory) {
      setTrainingChatHistory(JSON.parse(storedTrainingHistory));
    } else {
        const defaultHistory: ChatMessage[] = [
            {
                role: 'user',
                parts: [{ text: `Hãy ghi nhớ và học hỏi kiến thức sau đây về cách tìm và đánh giá từ khóa (key) trên YouTube. Đây là kiến thức nền tảng bạn phải sử dụng cho mọi phân tích trong tương lai.\n\n--- BẮT ĐẦU KIẾN THỨC ---\n\n${keyFindingTranscript}\n\n--- KẾT THÚC KIẾN THỨC ---` }]
            },
            {
                role: 'model',
                parts: [{ text: 'Cảm ơn bạn. Tôi đã tiếp thu và ghi nhớ kiến thức về 5 phương pháp tìm kiếm và đánh giá từ khóa YouTube. Tôi sẽ áp dụng những chiến lược này vào các phân tích ngách trong tương lai để đưa ra kết quả chất lượng hơn.' }]
            },
            {
                role: 'user',
                parts: [{ text: `Tuyệt vời. Bây giờ, hãy tiếp tục học hỏi cơ sở kiến thức sau đây về hàng trăm ngách và chủ đề YouTube tiềm năng. Đây là nguồn dữ liệu quan trọng để bạn đưa ra các đề xuất đa dạng và chính xác.\n\n--- BẮT ĐẦU CƠ SỞ KIẾN THỨC NGÁCH ---\n\n${nicheKnowledgeBase}\n\n--- KẾT THÚC CƠ SỞ KIẾN THỨC NGÁCH ---` }]
            },
            {
                role: 'model',
                parts: [{ text: 'Cảm ơn bạn. Tôi đã tiếp thu và ghi nhớ cơ sở kiến thức toàn diện về các ngách YouTube. Tôi sẽ sử dụng thông tin này để làm giàu và cải thiện độ chính xác cho các phân tích và đề xuất của mình.' }]
            },
            { 
                role: 'model', 
                parts: [{ text: 'Chào bạn, tôi là AI phân tích ngách YouTube, đã được trang bị kiến thức chuyên sâu. Bạn có thể cung cấp thêm cho tôi bất kỳ kiến thức, tài liệu, hoặc văn bản nào để tôi học hỏi thêm, hoặc bắt đầu tìm kiếm ý tưởng ngách ngay bây giờ.'}] 
            }
        ];
        setTrainingChatHistory(defaultHistory);
    }

    // Set random placeholder for search bar
    const suggestionsPool = parseKnowledgeBaseForSuggestions(nicheKnowledgeBase);
    const shuffled = shuffleArray(suggestionsPool);
    const placeholderSuggestions = shuffled.slice(0, 3);
    if (placeholderSuggestions.length === 3) {
        setSearchPlaceholder(`ví dụ: '${placeholderSuggestions[0]}', '${placeholderSuggestions[1]}', '${placeholderSuggestions[2]}'`);
    }
  }, []);
  
  const markets = ['Quốc tế', 'US/Canada', 'Anh', 'Úc', 'Đức', 'Pháp', 'Việt Nam', 'Nhật', 'Hàn', 'Custom'];

  const handleSaveAndCheckApiKeys = async (newApiKeys: string[]) => {
    // Save keys first to update the UI list
    setApiKeys(newApiKeys);
    localStorage.setItem('geminiApiKeys', JSON.stringify(newApiKeys));
    await checkAndSetApiKeys(newApiKeys);
  };
  
  const handleDeleteApiKey = (indexToDelete: number) => {
    const newKeys = apiKeys.filter((_, i) => i !== indexToDelete);
    const newStatuses = apiKeyStatuses.filter((_, i) => i !== indexToDelete);
    
    setApiKeys(newKeys);
    setApiKeyStatuses(newStatuses);
    localStorage.setItem('geminiApiKeys', JSON.stringify(newKeys));

    // Adjust active key index if necessary
    if (activeApiKeyIndex === indexToDelete) {
        setActiveApiKeyIndex(null);
    } else if (activeApiKeyIndex !== null && indexToDelete < activeApiKeyIndex) {
        setActiveApiKeyIndex(prev => (prev !== null ? prev - 1 : null));
    }
  };


  const updateTrainingHistory = (newHistory: ChatMessage[]) => {
      setTrainingChatHistory(newHistory);
      localStorage.setItem('trainingChatHistory', JSON.stringify(newHistory));
  };
  
  const verifyTrainingPassword = (password: string) => {
    return password === trainingPassword;
  };

  const handlePasswordSuccess = (newPassword?: string) => {
    setIsPasswordModalOpen(false);
    if (passwordModalMode === 'login') {
      setIsTrainAiModalOpen(true);
    } else if (newPassword) {
      setTrainingPassword(newPassword);
      localStorage.setItem('trainingPassword', newPassword);
      // Optionally, give user feedback that password was changed
    }
  };
  
  const openChangePasswordModal = () => {
    setIsTrainAiModalOpen(false); // Close training modal first
    setPasswordModalMode('change');
    setIsPasswordModalOpen(true);
  };

  const showNoApiKeyError = () => {
    setError({
        title: 'Yêu cầu API Key',
        body: (
          <>
            <p className="mb-4">Vui lòng nhập ít nhất một API Key bằng cách bấm vào nút "API" ở góc trên bên phải để sử dụng công cụ.</p>
            <div className="text-left bg-gray-900/50 p-3 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-gray-200 mb-2">Làm thế nào để lấy API Key?</h4>
              <ol className="list-decimal list-inside text-gray-400 text-sm space-y-1">
                <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">Google AI Studio</a>.</li>
                <li>Đăng nhập bằng tài khoản Google của bạn.</li>
                <li>Nhấp vào nút "Get API Key" hoặc "Create API key".</li>
                <li>Sao chép key và dán vào công cụ của chúng tôi thông qua nút "API".</li>
              </ol>
            </div>
          </>
        ),
        actionText: 'Cài đặt API',
        onAction: () => {
            setError(null);
            setIsApiKeyModalOpen(true);
        }
    });
  };

  const runAnalysis = async (idea: string, isNewSearch: boolean, isLoadMore: boolean = false) => {
    const hasValidKey = apiKeyStatuses.includes('valid');
    if (apiKeys.length === 0 || !hasValidKey) {
      showNoApiKeyError();
      return;
    }
    if (!idea.trim()) {
      setError({ title: 'Lỗi đầu vào', body: 'Vui lòng nhập một ý tưởng ngách.' });
      return;
    }
    if (targetMarket === 'Custom' && !customMarket.trim()) {
      setError({ title: 'Lỗi đầu vào', body: 'Vui lòng nhập thị trường tùy chỉnh.' });
      return;
    }
  
    if (isLoadMore) {
        setIsLoadingMore(true);
    } else {
        setIsLoading(true);
        setAnalysisResult(null);
    }
    setError(null);
    setUserInput(idea);

    if (isNewSearch) {
        setAnalysisDepth(0);
    }
  
    const marketToAnalyze = targetMarket === 'Custom' ? customMarket : targetMarket;
    const countToGenerate = parseInt(numResults, 10);
  
    try {
      const options = {
        countToGenerate,
        existingNichesToAvoid: (isLoadMore && analysisResult) ? analysisResult.niches.map(n => n.niche_name.original) : [],
        filters: {
            interest: interestLevel,
            monetization: monetizationLevel,
            competition: competitionLevel,
            sustainability: sustainabilityLevel
        }
      };
      const { result, successfulKeyIndex } = await analyzeNicheIdea(idea, marketToAnalyze, apiKeys, trainingChatHistory, options);

      setActiveApiKeyIndex(successfulKeyIndex);

      if (isLoadMore) {
        setAnalysisResult(prev => prev ? { niches: [...prev.niches, ...result.niches] } : result);
      } else {
        setAnalysisResult(result);
      }
      
      setAnalysisDepth(prev => isNewSearch ? 1 : prev + 1);

    } catch (err: any) {
      console.error(err);
      setError({ title: 'Không thể phân tích', body: `Lỗi: ${err.message || 'Vui lòng kiểm tra lại API Keys và thử lại.'}` });
      setActiveApiKeyIndex(null);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleAnalysis = () => runAnalysis(userInput, true);
  const handleDevelopIdea = (idea: string) => runAnalysis(idea, false);
  const handleLoadMore = () => runAnalysis(userInput, false, true);
  
  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const handleUseNiche = async (niche: Niche) => {
    const nicheName = niche.niche_name.original;
    if (generatingNiches.has(nicheName)) return;

    const hasValidKey = apiKeyStatuses.includes('valid');
    if (apiKeys.length === 0 || !hasValidKey) {
      showNoApiKeyError();
      return;
    }

    setGeneratingNiches(prev => new Set(prev).add(nicheName));
    setError(null);

    try {
        const { result, successfulKeyIndex } = await developVideoIdeas(niche, apiKeys, trainingChatHistory);
        setActiveApiKeyIndex(successfulKeyIndex);
        
        setContentPlanCache(prevCache => ({
            ...prevCache,
            [nicheName]: result
        }));
        
        setNotifications(prev => [...prev, {
            id: Date.now(),
            message: `Đã phát triển xong 5 ý tưởng ban đầu cho niche: "${niche.niche_name.translated}"`,
            type: 'success'
        }]);

    } catch (err: any) {
        console.error(err);
        setNotifications(prev => [...prev, {
            id: Date.now(),
            message: `Lỗi khi phát triển kế hoạch cho niche: "${niche.niche_name.translated}". ${err.message || 'Vui lòng thử lại.'}`,
            type: 'error'
        }]);
        setActiveApiKeyIndex(null);
    } finally {
        setGeneratingNiches(prev => {
            const newSet = new Set(prev);
            newSet.delete(nicheName);
            return newSet;
        });
    }
  };

  const handleViewPlan = (niche: Niche) => {
    const cachedPlan = contentPlanCache[niche.niche_name.original];
    if (cachedPlan) {
        setContentPlan(cachedPlan);
        setActiveNicheForContentPlan(niche);
        setIsContentPlanModalOpen(true);
    }
  };
  
  const handleLoadMoreContentPlan = async () => {
    if (!activeNicheForContentPlan || !contentPlan) return;

    const hasValidKey = apiKeyStatuses.includes('valid');
    if (apiKeys.length === 0 || !hasValidKey) {
      showNoApiKeyError();
      return;
    }

    setIsContentPlanLoadingMore(true);
    setError(null);

    try {
      const existingIdeas = contentPlan.content_ideas.map(idea => idea.title.original);
      const options = {
          countToGenerate: 5,
          existingIdeasToAvoid: existingIdeas,
      };

      const { result: newContent, successfulKeyIndex } = await generateContentPlan(
        activeNicheForContentPlan,
        apiKeys,
        trainingChatHistory,
        options
      );

      setActiveApiKeyIndex(successfulKeyIndex);
      
      const updatedContentPlan = {
          content_ideas: [...contentPlan.content_ideas, ...newContent.content_ideas]
      };

      setContentPlan(updatedContentPlan);
      setContentPlanCache(prevCache => ({
        ...prevCache,
        [activeNicheForContentPlan.niche_name.original]: updatedContentPlan
      }));

    } catch (err: any) {
      console.error(err);
      setError({ title: 'Không thể tạo thêm kế hoạch', body: `Lỗi: ${err.message || 'Vui lòng thử lại.'}` });
      setActiveApiKeyIndex(null);
    } finally {
      setIsContentPlanLoadingMore(false);
    }
  };


  const handleToggleSaveNiche = (niche: Niche) => {
    setSavedNiches(prev => {
        const isSaved = prev.some(saved => saved.niche_name.original === niche.niche_name.original);
        let newSavedNiches;
        if (isSaved) {
            newSavedNiches = prev.filter(saved => saved.niche_name.original !== niche.niche_name.original);
        } else {
            newSavedNiches = [...prev, niche];
        }
        localStorage.setItem('savedNiches', JSON.stringify(newSavedNiches));
        return newSavedNiches;
    });
  };

  const handleExportSaved = () => {
    exportNichesToCsv(savedNiches, `saved_niches_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const handleClearSavedNiches = () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tất cả ${savedNiches.length} ý tưởng đã lưu không? Hành động này không thể hoàn tác.`)) {
        setSavedNiches([]);
        localStorage.removeItem('savedNiches');
    }
  };

  const handleSendTrainingMessage = async (message: string, files: File[]) => {
    const hasValidKey = apiKeyStatuses.includes('valid');
    if (apiKeys.length === 0 || !hasValidKey) {
        const errorMsg: ChatMessage = { role: 'model', parts: [{ text: "Lỗi: Vui lòng cấu hình API Key hợp lệ trước khi bắt đầu cuộc hội thoại."}] };
        updateTrainingHistory([...trainingChatHistory, errorMsg]);
        return;
    }

    const userMessageParts: Part[] = [];
    let combinedText = message;

    if (files.length > 0) {
        const fileNames = files.map(f => `- ${f.name}`).join('\n');
        combinedText += `\n\n--- Tệp đã tải lên ---\n${fileNames}`;
    }

    if (combinedText.trim()) {
        userMessageParts.push({ text: combinedText.trim() });
    }

    const fileParts = await Promise.all(files.map(fileToGenerativePart));
    userMessageParts.push(...fileParts);
    
    if (userMessageParts.length === 0) return;

    const userMessage: ChatMessage = { role: 'user', parts: userMessageParts };
    const newHistory = [...trainingChatHistory, userMessage];
    updateTrainingHistory(newHistory);
    setIsTrainingLoading(true);

    try {
        const { result: responseText, successfulKeyIndex } = await getTrainingResponse(newHistory, apiKeys);
        setActiveApiKeyIndex(successfulKeyIndex);
        const modelMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
        updateTrainingHistory([...newHistory, modelMessage]);
    } catch(e: any) {
        console.error(e);
        const errorMsg: ChatMessage = { role: 'model', parts: [{ text: `Đã có lỗi xảy ra khi giao tiếp với AI. Lỗi: ${e.message}`}] };
        updateTrainingHistory([...trainingChatHistory, userMessage, errorMsg]);
        setActiveApiKeyIndex(null);
    } finally {
        setIsTrainingLoading(false);
    }
};

  const Logo: React.FC = () => (
    <a href="/" className="flex items-center space-x-3">
      <svg
        className="h-10 w-10 text-red-500"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.73,18.78 17.93,18.84C17.13,18.91 16.44,18.94 15.84,18.94L12,19C9.81,19 8.2,18.84 7.17,18.56C6.27,18.31 5.69,17.73 5.44,16.83C5.31,16.36 5.22,15.73 5.16,14.93C5.09,14.13 5.06,13.44 5.06,12.84L5,12C5,9.81 5.16,8.2 5.44,7.17C5.69,6.27 6.27,5.69 7.17,5.44C7.64,5.31 8.27,5.22 9.07,5.16C9.87,5.09 10.56,5.06 11.16,5.06L12,5C14.19,5 15.8,5.16 16.83,5.44C17.73,5.69 18.31,6.27 18.56,7.17Z" />
      </svg>
      <h1 className="text-3xl font-bold tracking-tight">
        YouTube Niche Finder{' '}
        <span className="bg-gradient-to-r from-blue-400 to-teal-400 text-transparent bg-clip-text">AI</span>
      </h1>
    </a>
  );

  const hasValidApiKey = apiKeyStatuses.includes('valid');

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-200">
      <NotificationCenter notifications={notifications} onRemove={removeNotification} />
      <header className="absolute top-0 right-0 p-4 z-10">
        <div className="flex items-center space-x-2">
            <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className={`px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors duration-300 border ${
                    hasValidApiKey
                        ? 'bg-green-600 hover:bg-green-700 border-green-500'
                        : 'bg-orange-500 hover:bg-orange-600 border-orange-400'
                }`}
                aria-label="Nhập API Key"
            >
                API
            </button>
            <button
                onClick={() => {
                    setPasswordModalMode('login');
                    setIsPasswordModalOpen(true);
                }}
                className="px-4 py-2 bg-gray-800/80 border border-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Train AI Tool"
            >
                Train AI Tool
            </button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
          <Logo />
          <p className="text-base text-gray-400 max-w-2xl">
            Nhập một ý tưởng, từ khóa, hoặc đam mê. AI của chúng tôi sẽ phân tích các chiến lược thành công trên YouTube để đề xuất những ngách có tiềm năng cao và ý tưởng video viral.
          </p>

          <div className="w-full max-w-2xl space-y-6">
            <SearchBar
              userInput={userInput}
              setUserInput={setUserInput}
              handleAnalysis={handleAnalysis}
              isLoading={isLoading}
              placeholder={searchPlaceholder}
            />
            <div className="w-full text-left bg-gray-800/50 border border-gray-700 p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="market-select" className="block text-sm font-medium text-gray-400 mb-2">Thị trường hướng đến</label>
                        <select
                            id="market-select"
                            value={targetMarket}
                            onChange={(e) => setTargetMarket(e.target.value)}
                            className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all duration-300"
                            disabled={isLoading}
                        >
                            {markets.map(m => <option key={m} value={m}>{m === 'Custom' ? 'Tùy chỉnh...' : m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="num-results-select" className="block text-sm font-medium text-gray-400 mb-2">Số kết quả trả về</label>
                        <select
                            id="num-results-select"
                            value={numResults}
                            onChange={(e) => setNumResults(e.target.value)}
                            className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all duration-300"
                            disabled={isLoading}
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                        </select>
                    </div>
                </div>

                {targetMarket === 'Custom' && (
                    <input
                        type="text"
                        value={customMarket}
                        onChange={(e) => setCustomMarket(e.target.value)}
                        placeholder="Nhập thị trường khác (ví dụ: 'Ấn Độ', 'Brazil')"
                        className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all duration-300 placeholder-gray-500"
                        disabled={isLoading}
                    />
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <FilterDropdown label="Mức độ quan tâm" value={interestLevel} onChange={setInterestLevel} disabled={isLoading} />
                    <FilterDropdown label="Tiềm năng kiếm tiền" value={monetizationLevel} onChange={setMonetizationLevel} disabled={isLoading} />
                    <FilterDropdown label="Mức độ cạnh tranh" value={competitionLevel} onChange={setCompetitionLevel} disabled={isLoading} />
                    <FilterDropdown label="Tính bền vững" value={sustainabilityLevel} onChange={setSustainabilityLevel} disabled={isLoading} />
                </div>
            </div>
             <button
                onClick={handleAnalysis}
                disabled={isLoading}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-blue-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? 'Đang phân tích...' : 'Phân Tích Ý Tưởng'}</span>
              </button>
          </div>
          
          <div className="w-full pt-8">
            {isLoading && <Loader />}
            
            {analysisResult && !isLoading ? (
                <>
                    <ActionBar savedCount={savedNiches.length} onExport={handleExportSaved} onClearSaved={handleClearSavedNiches} />
                    <ResultsDisplay 
                      result={analysisResult} 
                      onDevelop={handleDevelopIdea}
                      analysisDepth={analysisDepth}
                      onLoadMore={handleLoadMore}
                      isLoadingMore={isLoadingMore}
                      onToggleSave={handleToggleSaveNiche}
                      savedNiches={savedNiches}
                      onUseNiche={handleUseNiche}
                      onViewPlan={handleViewPlan}
                      generatingNiches={generatingNiches}
                      contentPlanCache={contentPlanCache}
                      numResults={numResults}
                    />
                </>
            ) : (
                !isLoading && !error && (
                    <InitialSuggestions setUserInput={setUserInput} />
                )
            )}
          </div>
        </div>
      </main>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaveAndCheck={handleSaveAndCheckApiKeys}
        onDeleteKey={handleDeleteApiKey}
        currentApiKeys={apiKeys}
        activeApiKeyIndex={activeApiKeyIndex}
        apiKeyStatuses={apiKeyStatuses}
      />
      <TrainAiModal
        isOpen={isTrainAiModalOpen}
        onClose={() => setIsTrainAiModalOpen(false)}
        chatHistory={trainingChatHistory}
        onSendMessage={handleSendTrainingMessage}
        isLoading={isTrainingLoading}
        onChangePassword={openChangePasswordModal}
      />
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
        mode={passwordModalMode}
        verifyPassword={verifyTrainingPassword}
      />
      <ContentPlanModal
        isOpen={isContentPlanModalOpen}
        onClose={() => setIsContentPlanModalOpen(false)}
        contentPlan={contentPlan}
        activeNiche={activeNicheForContentPlan}
        onLoadMore={handleLoadMoreContentPlan}
        isLoadingMore={isContentPlanLoadingMore}
      />
      <ErrorModal
        isOpen={!!error}
        onClose={() => setError(null)}
        title={error?.title || 'Đã có lỗi xảy ra'}
        actionText={error?.actionText}
        onAction={error?.onAction}
      >
        {error?.body}
      </ErrorModal>
    </div>
  );
};

export default App;