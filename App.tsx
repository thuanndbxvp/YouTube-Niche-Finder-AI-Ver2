
import React, { useState, useEffect, useRef } from 'react';
import { analyzeNicheIdea, getTrainingResponse, generateContentPlan, validateApiKey, developVideoIdeas, generateVideoIdeasForNiche, validateOpenAiApiKey, analyzeNicheIdeaWithOpenAI, generateVideoIdeasForNicheWithOpenAI, developVideoIdeasWithOpenAI, generateContentPlanWithOpenAI, getTrainingResponseWithOpenAI } from './services/aiService';
import type { AnalysisResult, ChatMessage, Part, Niche, FilterLevel, ContentPlanResult, Notification as NotificationType, VideoIdea } from './types';
import SearchBar from './components/SearchBar';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';
import ApiKeyModal from './components/ApiKeyModal';
import TrainAiModal from './components/TrainAiModal';
import { BookmarkIcon } from './components/icons/Icons';
import InitialSuggestions from './components/InitialSuggestions';
import PasswordModal from './components/PasswordModal';
import ContentPlanModal from './components/ContentPlanModal';
import ErrorModal from './components/ErrorModal';
import NotificationCenter from './components/NotificationCenter';
import LibraryModal from './components/LibraryModal';
import { keyFindingTranscript, nicheKnowledgeBase, parseKnowledgeBaseForSuggestions } from './data/knowledgeBase';
import { exportNichesToCsv } from './utils/export';

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
    tooltipText: string;
}> = ({ label, value, onChange, disabled, tooltipText }) => (
    <div className="relative group">
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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            {tooltipText}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-900"></div>
        </div>
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
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-pro');

  // Filters
  const [interestLevel, setInterestLevel] = useState<FilterLevel>('all');
  const [monetizationLevel, setMonetizationLevel] = useState<FilterLevel>('all');
  const [competitionLevel, setCompetitionLevel] = useState<FilterLevel>('all');
  const [sustainabilityLevel, setSustainabilityLevel] = useState<FilterLevel>('all');

  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [apiKeyStatuses, setApiKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [activeApiKeyIndex, setActiveApiKeyIndex] = useState<number | null>(null);
  const [openAiApiKey, setOpenAiApiKey] = useState<string>('');
  const [openAiApiKeyStatus, setOpenAiApiKeyStatus] = useState<ApiKeyStatus>('idle');

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isTrainAiModalOpen, setIsTrainAiModalOpen] = useState<boolean>(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);

  const [trainingChatHistory, setTrainingChatHistory] = useState<ChatMessage[]>([]);
  const [isTrainingLoading, setIsTrainingLoading] = useState<boolean>(false);
  
  const [trainingPassword, setTrainingPassword] = useState<string>('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [passwordModalMode, setPasswordModalMode] = useState<'login' | 'change'>('login');
  
  // Content Plan State
  const [contentPlan, setContentPlan] = useState<ContentPlanResult | null>(null);
  const [isContentPlanModalOpen, setIsContentPlanModalOpen] = useState<boolean>(false);
  const [generatingNiches, setGeneratingNiches] = useState<Set<string>>(new Set());
  const [generatingVideoIdeas, setGeneratingVideoIdeas] = useState<Set<string>>(new Set());
  const [contentPlanCache, setContentPlanCache] = useState<Record<string, ContentPlanResult>>({});
  const [activeNicheForContentPlan, setActiveNicheForContentPlan] = useState<Niche | null>(null);
  const [isContentPlanLoadingMore, setIsContentPlanLoadingMore] = useState<boolean>(false);
  
  // Notifications State
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Helper function to validate keys and set statuses
  const checkAndSetApiKeys = async (keysToCheck: string[]) => {
    if (keysToCheck.length === 0) {
        setApiKeyStatuses([]);
        localStorage.setItem('geminiApiKeyStatuses', JSON.stringify([]));
        return;
    }
    
    setApiKeyStatuses(keysToCheck.map(() => 'checking'));
    
    const validationPromises = keysToCheck.map(key => validateApiKey(key));
    const results = await Promise.all(validationPromises);
    
    const finalStatuses = results.map(isValid => (isValid ? 'valid' : 'invalid'));
    setApiKeyStatuses(finalStatuses);
    localStorage.setItem('geminiApiKeyStatuses', JSON.stringify(finalStatuses));
  };


  useEffect(() => {
    // Load API keys and their statuses from localStorage on initial load
    const loadApiConfig = () => {
      try {
        const storedApiKeys = localStorage.getItem('geminiApiKeys');
        const storedStatuses = localStorage.getItem('geminiApiKeyStatuses');
        const storedOpenAiKey = localStorage.getItem('openAiApiKey');
        const storedOpenAiStatus = localStorage.getItem('openAiApiKeyStatus');

        if (storedApiKeys) {
          const parsedKeys = JSON.parse(storedApiKeys);
          if (Array.isArray(parsedKeys)) {
            setApiKeys(parsedKeys);

            let statuses: ApiKeyStatus[] = [];
            if (storedStatuses) {
              const parsedStatuses = JSON.parse(storedStatuses);
              if (Array.isArray(parsedStatuses) && parsedStatuses.length === parsedKeys.length) {
                statuses = parsedStatuses;
              }
            }
            
            if (statuses.length !== parsedKeys.length) {
              statuses = parsedKeys.map(() => 'idle');
              localStorage.setItem('geminiApiKeyStatuses', JSON.stringify(statuses));
            }
            setApiKeyStatuses(statuses);
          }
        }

        if (storedOpenAiKey) {
            setOpenAiApiKey(storedOpenAiKey);
            setOpenAiApiKeyStatus((storedOpenAiStatus as ApiKeyStatus) || 'idle');
        }

      } catch (e) {
        console.error("Could not parse API config from localStorage", e);
        localStorage.removeItem('geminiApiKeys');
        localStorage.removeItem('geminiApiKeyStatuses');
        localStorage.removeItem('openAiApiKey');
        localStorage.removeItem('openAiApiKeyStatus');
      }
    };
    
    loadApiConfig();

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

  const handleSaveAndCheckGeminiApiKeys = async (newApiKeys: string[]) => {
    setApiKeys(newApiKeys);
    localStorage.setItem('geminiApiKeys', JSON.stringify(newApiKeys));
    await checkAndSetApiKeys(newApiKeys);
  };

  const handleSaveAndCheckOpenAiApiKey = async (newApiKey: string) => {
    setOpenAiApiKey(newApiKey);
    localStorage.setItem('openAiApiKey', newApiKey);
    setOpenAiApiKeyStatus('checking');
    const isValid = await validateOpenAiApiKey(newApiKey);
    const newStatus = isValid ? 'valid' : 'invalid';
    setOpenAiApiKeyStatus(newStatus);
    localStorage.setItem('openAiApiKeyStatus', newStatus);
  };
  
  const handleDeleteApiKey = (indexToDelete: number) => {
    const newKeys = apiKeys.filter((_, i) => i !== indexToDelete);
    const newStatuses = apiKeyStatuses.filter((_, i) => i !== indexToDelete);
    
    setApiKeys(newKeys);
    setApiKeyStatuses(newStatuses);
    localStorage.setItem('geminiApiKeys', JSON.stringify(newKeys));
    localStorage.setItem('geminiApiKeyStatuses', JSON.stringify(newStatuses));


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

  const showNoApiKeyError = (provider: 'gemini' | 'openai') => {
    const commonBody = (
      <>
        <p className="mb-4">Vui lòng nhập một API Key hợp lệ cho <strong>{provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}</strong> bằng cách bấm vào nút "API" ở góc trên bên phải để sử dụng model này.</p>
        <div className="text-left bg-gray-900/50 p-3 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-gray-200 mb-2">Làm thế nào để lấy API Key?</h4>
          {provider === 'gemini' ? (
            <ol className="list-decimal list-inside text-gray-400 text-sm space-y-1">
              <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">Google AI Studio</a>.</li>
              <li>Đăng nhập bằng tài khoản Google của bạn.</li>
              <li>Nhấp vào nút "Get API Key" hoặc "Create API key".</li>
              <li>Sao chép key và dán vào công cụ của chúng tôi thông qua nút "API".</li>
            </ol>
          ) : (
             <ol className="list-decimal list-inside text-gray-400 text-sm space-y-1">
              <li>Truy cập <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">OpenAI API Keys</a>.</li>
              <li>Đăng nhập hoặc đăng ký tài khoản OpenAI.</li>
              <li>Nhấp vào nút "Create new secret key".</li>
              <li>Sao chép key và dán vào công cụ của chúng tôi thông qua nút "API".</li>
            </ol>
          )}
        </div>
      </>
    );

    setError({
        title: 'Yêu cầu API Key',
        body: commonBody,
        actionText: 'Cài đặt API',
        onAction: () => {
            setError(null);
            setIsApiKeyModalOpen(true);
        }
    });
  };

  const onKeyFailure = (index: number) => {
    setApiKeyStatuses(prev => {
        const newStatuses = [...prev];
        if (newStatuses[index] !== 'invalid') {
            newStatuses[index] = 'invalid';
            localStorage.setItem('geminiApiKeyStatuses', JSON.stringify(newStatuses));
        }
        return newStatuses;
    });
  };

  const onOpenAIKeyFailure = () => {
    setOpenAiApiKeyStatus('invalid');
    localStorage.setItem('openAiApiKeyStatus', 'invalid');
  };

  const runAnalysis = async (idea: string, isNewSearch: boolean, isLoadMore: boolean = false) => {
    const isGemini = selectedModel.startsWith('gemini');
    
    if (isGemini && (apiKeys.length === 0 || !apiKeyStatuses.includes('valid'))) {
      showNoApiKeyError('gemini');
      return;
    }
    if (!isGemini && openAiApiKeyStatus !== 'valid') {
      showNoApiKeyError('openai');
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

      let result: AnalysisResult;

      if (isGemini) {
        const { result: geminiResult, successfulKeyIndex } = await analyzeNicheIdea(idea, marketToAnalyze, apiKeys, trainingChatHistory, options, onKeyFailure);
        result = geminiResult;
        setActiveApiKeyIndex(successfulKeyIndex);
      } else {
        result = await analyzeNicheIdeaWithOpenAI(idea, marketToAnalyze, openAiApiKey, selectedModel, trainingChatHistory, options, onOpenAIKeyFailure);
        setActiveApiKeyIndex(null); // No index for single OpenAI key
      }

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
  
  const handleScrollView = () => {
    suggestionsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleGenerateVideoIdeas = async (nicheToUpdate: Niche) => {
    const nicheName = nicheToUpdate.niche_name.original;
    if (generatingVideoIdeas.has(nicheName)) return;

    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && (apiKeys.length === 0 || !apiKeyStatuses.includes('valid'))) {
        showNoApiKeyError('gemini');
        return;
    }
    if (!isGemini && openAiApiKeyStatus !== 'valid') {
        showNoApiKeyError('openai');
        return;
    }

    setGeneratingVideoIdeas(prev => new Set(prev).add(nicheName));
    setError(null);

    try {
        const existingTitles = nicheToUpdate.video_ideas?.map(idea => idea.title.original) || [];
        const options = { existingIdeasToAvoid: existingTitles };

        let result: { video_ideas: VideoIdea[] };

        if (isGemini) {
          const { result: geminiResult, successfulKeyIndex } = await generateVideoIdeasForNiche(nicheToUpdate, apiKeys, trainingChatHistory, options, onKeyFailure);
          result = geminiResult;
          setActiveApiKeyIndex(successfulKeyIndex);
        } else {
          result = await generateVideoIdeasForNicheWithOpenAI(nicheToUpdate, openAiApiKey, selectedModel, trainingChatHistory, options, onOpenAIKeyFailure);
          setActiveApiKeyIndex(null);
        }


        setAnalysisResult(prevResult => {
            if (!prevResult) return null;
            const newNiches = prevResult.niches.map(niche => {
                if (niche.niche_name.original === nicheName) {
                    const existingIdeas = niche.video_ideas || [];
                    const newIdeas = result.video_ideas || [];
                    return { ...niche, video_ideas: [...existingIdeas, ...newIdeas] };
                }
                return niche;
            });
            return { niches: newNiches };
        });

    } catch (err: any) {
        console.error(err);
        setNotifications(prev => [...prev, {
            id: Date.now(),
            message: `Lỗi khi tạo ý tưởng video cho niche: "${nicheToUpdate.niche_name.translated}". ${err.message || 'Vui lòng thử lại.'}`,
            type: 'error'
        }]);
        setActiveApiKeyIndex(null);
    } finally {
        setGeneratingVideoIdeas(prev => {
            const newSet = new Set(prev);
            newSet.delete(nicheName);
            return newSet;
        });
    }
  };
  
  const handleUseNiche = async (niche: Niche) => {
    const nicheName = niche.niche_name.original;
    if (generatingNiches.has(nicheName)) return;

    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && (apiKeys.length === 0 || !apiKeyStatuses.includes('valid'))) {
        showNoApiKeyError('gemini');
        return;
    }
    if (!isGemini && openAiApiKeyStatus !== 'valid') {
        showNoApiKeyError('openai');
        return;
    }

    setGeneratingNiches(prev => new Set(prev).add(nicheName));
    setError(null);

    try {
        let result: ContentPlanResult;
        if (isGemini) {
          const { result: geminiResult, successfulKeyIndex } = await developVideoIdeas(niche, apiKeys, trainingChatHistory, onKeyFailure);
          result = geminiResult;
          setActiveApiKeyIndex(successfulKeyIndex);
        } else {
          result = await developVideoIdeasWithOpenAI(niche, openAiApiKey, selectedModel, trainingChatHistory, onOpenAIKeyFailure);
          setActiveApiKeyIndex(null);
        }
        
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

    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && (apiKeys.length === 0 || !apiKeyStatuses.includes('valid'))) {
        showNoApiKeyError('gemini');
        return;
    }
    if (!isGemini && openAiApiKeyStatus !== 'valid') {
        showNoApiKeyError('openai');
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

      let newContent: ContentPlanResult;

      if (isGemini) {
        const { result: geminiResult, successfulKeyIndex } = await generateContentPlan(
          activeNicheForContentPlan, apiKeys, trainingChatHistory, options, onKeyFailure
        );
        newContent = geminiResult;
        setActiveApiKeyIndex(successfulKeyIndex);
      } else {
        newContent = await generateContentPlanWithOpenAI(
          activeNicheForContentPlan, openAiApiKey, selectedModel, trainingChatHistory, options, onOpenAIKeyFailure
        );
        setActiveApiKeyIndex(null);
      }
      
      const updatedContentPlan = {
          content_ideas: [...contentPlan.content_ideas, ...newContent.content_ideas]
      };

      setContentPlan(updatedContentPlan);
      setContentPlanCache(prevCache => ({
        ...prevCache,
        [activeNicheForContentPlan.niche_name.original]: updatedContentPlan
      }));

      // Update the main analysisResult state to reflect the new video ideas
      setAnalysisResult(prevResult => {
          if (!prevResult || !activeNicheForContentPlan) return prevResult;
          
          const newNiches = prevResult.niches.map(niche => {
              if (niche.niche_name.original === activeNicheForContentPlan.niche_name.original) {
                  // Convert detailed content ideas to simple video ideas
                  const newVideoIdeasFromPlan: VideoIdea[] = newContent.content_ideas.map(detailedIdea => ({
                      title: detailedIdea.title,
                      // The hook is a good summary for the draft content.
                      draft_content: detailedIdea.hook, 
                  }));

                  const existingVideoIdeas = niche.video_ideas || [];
                  return {
                      ...niche,
                      video_ideas: [...existingVideoIdeas, ...newVideoIdeasFromPlan],
                  };
              }
              return niche;
          });

          return { ...prevResult, niches: newNiches };
      });

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

  const handleDeleteSavedNiche = (nicheNameToDelete: string) => {
    setSavedNiches(prev => {
        const newSavedNiches = prev.filter(saved => saved.niche_name.original !== nicheNameToDelete);
        localStorage.setItem('savedNiches', JSON.stringify(newSavedNiches));
        return newSavedNiches;
    });
  };

  const handleSendTrainingMessage = async (message: string, files: File[]) => {
    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && (apiKeys.length === 0 || !apiKeyStatuses.includes('valid'))) {
        const errorMsg: ChatMessage = { role: 'model', parts: [{ text: "Lỗi: Vui lòng cấu hình API Key hợp lệ cho Gemini trước khi bắt đầu cuộc hội thoại."}] };
        updateTrainingHistory([...trainingChatHistory, errorMsg]);
        return;
    }
     if (!isGemini && openAiApiKeyStatus !== 'valid') {
        const errorMsg: ChatMessage = { role: 'model', parts: [{ text: "Lỗi: Vui lòng cấu hình API Key hợp lệ cho OpenAI trước khi bắt đầu cuộc hội thoại."}] };
        updateTrainingHistory([...trainingChatHistory, errorMsg]);
        return;
    }

    const userMessageParts: Part[] = [];
    let combinedText = message;

    if (files.length > 0) {
        if (isGemini) {
          const fileNames = files.map(f => `- ${f.name}`).join('\n');
          combinedText += `\n\n--- Tệp đã tải lên ---\n${fileNames}`;
        } else {
          combinedText += `\n\n[OpenAI model không thể xử lý trực tiếp tệp đính kèm trong chế độ này. Nội dung tệp cần được dán vào.]`;
        }
    }

    if (combinedText.trim()) {
        userMessageParts.push({ text: combinedText.trim() });
    }

    if (isGemini) {
      const fileParts = await Promise.all(files.map(fileToGenerativePart));
      userMessageParts.push(...fileParts);
    }
    
    if (userMessageParts.length === 0) return;

    const userMessage: ChatMessage = { role: 'user', parts: userMessageParts };
    const newHistory = [...trainingChatHistory, userMessage];
    updateTrainingHistory(newHistory);
    setIsTrainingLoading(true);

    try {
        let responseText: string;
        if (isGemini) {
          const { result, successfulKeyIndex } = await getTrainingResponse(newHistory, apiKeys, onKeyFailure);
          responseText = result;
          setActiveApiKeyIndex(successfulKeyIndex);
        } else {
          responseText = await getTrainingResponseWithOpenAI(newHistory, openAiApiKey, selectedModel, onOpenAIKeyFailure);
          setActiveApiKeyIndex(null);
        }
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
        className="h-10 w-10 text-youtube-red"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        />
      </svg>
      <h1 className="text-3xl font-bold tracking-tight">
        YouTube Niche Finder{' '}
        <span className="bg-gradient-to-r from-blue-400 to-teal-400 text-transparent bg-clip-text">AI</span>
      </h1>
    </a>
  );

  const hasValidGeminiKey = apiKeyStatuses.includes('valid');
  const hasValidOpenAiKey = openAiApiKeyStatus === 'valid';
  const hasAnyValidKey = hasValidGeminiKey || hasValidOpenAiKey;

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-200">
      <NotificationCenter notifications={notifications} onRemove={removeNotification} />
      <header className="absolute top-0 right-0 p-4 z-10">
        <div className="flex items-center space-x-2">
            <button
                onClick={() => setIsLibraryModalOpen(true)}
                className="relative flex items-center space-x-2 px-4 py-2 bg-gray-800/80 border border-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Thư viện"
            >
                <BookmarkIcon />
                <span>Thư viện</span>
                {savedNiches.length > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-youtube-red text-xs font-bold text-white">
                        {savedNiches.length}
                    </span>
                )}
            </button>
            <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className={`px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors duration-300 border ${
                    hasAnyValidKey
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label htmlFor="model-select" className="block text-sm font-medium text-gray-400 mb-2">AI Model</label>
                        <select
                            id="model-select"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all duration-300"
                            disabled={isLoading}
                        >
                            <optgroup label="Google Gemini">
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            </optgroup>
                            <optgroup label="OpenAI">
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            </optgroup>
                        </select>
                    </div>
                    <div className="md:col-span-1">
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
                    <div className="md:col-span-1">
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
                    <FilterDropdown 
                        label="Mức độ quan tâm" 
                        value={interestLevel} 
                        onChange={setInterestLevel} 
                        disabled={isLoading}
                        tooltipText="Lọc các ngách dựa trên mức độ quan tâm và khối lượng tìm kiếm của khán giả. 'Cao' có nghĩa là rất phổ biến."
                    />
                    <FilterDropdown 
                        label="Tiềm năng kiếm tiền" 
                        value={monetizationLevel} 
                        onChange={setMonetizationLevel} 
                        disabled={isLoading}
                        tooltipText="Lọc các ngách dựa trên khả năng kiếm tiền (quảng cáo, affiliate, v.v.). 'Cao' có nghĩa là RPM ước tính cao hơn."
                    />
                    <FilterDropdown 
                        label="Mức độ cạnh tranh" 
                        value={competitionLevel} 
                        onChange={setCompetitionLevel} 
                        disabled={isLoading}
                        tooltipText="Lọc các ngách dựa trên mức độ cạnh tranh. 'Thấp' có nghĩa là ít cạnh tranh hơn, dễ dàng hơn để nổi bật."
                    />
                    <FilterDropdown 
                        label="Tính bền vững" 
                        value={sustainabilityLevel} 
                        onChange={setSustainabilityLevel} 
                        disabled={isLoading}
                        tooltipText="Lọc các ngách dựa trên tiềm năng lâu dài và khả năng tạo nội dung bền vững. 'Cao' có nghĩa là ngách có tính evergreen."
                    />
                </div>
            </div>
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                    onClick={handleAnalysis}
                    disabled={isLoading}
                    className="w-full sm:flex-1 px-8 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-blue-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2"
                >
                    <span>{isLoading ? 'Đang phân tích...' : 'Phân Tích Ý Tưởng'}</span>
                </button>
                {!analysisResult && !isLoading && !error && (
                    <button
                        onClick={handleScrollView}
                        disabled={isLoading}
                        className="w-full sm:flex-1 px-6 py-3 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        <span>Xem gợi ý</span>
                    </button>
                )}
             </div>
          </div>
          
          <div className="w-full pt-8" ref={suggestionsRef}>
            {isLoading && <Loader />}
            
            {analysisResult && !isLoading ? (
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
                  onGenerateVideoIdeas={handleGenerateVideoIdeas}
                  generatingVideoIdeas={generatingVideoIdeas}
                />
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
        onSaveAndCheckGemini={handleSaveAndCheckGeminiApiKeys}
        onSaveAndCheckOpenAI={handleSaveAndCheckOpenAiApiKey}
        onRecheck={checkAndSetApiKeys}
        onDeleteKey={handleDeleteApiKey}
        currentApiKeys={apiKeys}
        activeApiKeyIndex={activeApiKeyIndex}
        apiKeyStatuses={apiKeyStatuses}
        currentOpenAIApiKey={openAiApiKey}
        openAIApiKeyStatus={openAiApiKeyStatus}
      />
      <TrainAiModal
        isOpen={isTrainAiModalOpen}
        onClose={() => setIsTrainAiModalOpen(false)}
        chatHistory={trainingChatHistory}
        onSendMessage={handleSendTrainingMessage}
        isLoading={isTrainingLoading}
        onChangePassword={openChangePasswordModal}
        selectedModel={selectedModel}
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
      <LibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        savedNiches={savedNiches}
        onDeleteNiche={handleDeleteSavedNiche}
        onDeleteAll={handleClearSavedNiches}
        onExport={handleExportSaved}
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
