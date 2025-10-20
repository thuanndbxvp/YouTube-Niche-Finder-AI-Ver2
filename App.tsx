import React, { useState, useEffect } from 'react';
import { analyzeNicheIdea, getTrainingResponse, generateContentPlan, validateApiKey } from './services/geminiService';
import type { AnalysisResult, ChatMessage, Part, Niche, FilterLevel, ContentPlanResult } from './types';
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
  const [generatingContentForNiche, setGeneratingContentForNiche] = useState<string | null>(null);
  const [contentPlanCache, setContentPlanCache] = useState<Record<string, ContentPlanResult>>({});
  const [activeNicheForContentPlan, setActiveNicheForContentPlan] = useState<Niche | null>(null);
  const [isContentPlanLoadingMore, setIsContentPlanLoadingMore] = useState<boolean>(false);

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
        const keyFindingTranscript = `Ok xin chào tất cả các bạn nha hôm nay ND group sẽ hướng dẫn các bạn cách để tìm kiếm một ky ngon một cách đơn giản nhất và mình sẽ hướng dẫn bạn chi tiết từ A đến Z tại sao phải là ki ngon Bởi vì tất cả những ai làm YouTube thì đều biết rằng là việc tìm kiếm ra một cái ky ngon đã quyết định đến 60 đến 70 ph thành công của kênh của bạn và hôm nay thì mình sẽ chia sẻ cho bạn năm cái cách để có thể tìm kiếm ki ngon một cách đơn giản nhất chưa ạ cách đầu tiên thì chúng ta dùng bằng thanh công cụ của Tìm kiếm của YouTube thứ hai là chúng ta sẽ dùng
thanh công cụ tìm kiếm của Google thứ ba là chúng ta sẽ dùng Google chen và thứ tư là chúng ta sẽ dùng công cụ viq và thứ năm thì có lẽ là một công cụ mà cá nhân mình đánh giá là mạnh nhất tối ưu thời gian nhất tiết kiệm được cái công sức của các bạn nhiều nhất và nó cũng là đơn giản nhất thì muốn biết cá công cụ thứ năm nào thì bạn có thể là xem hết video nhá mình sẽ tiết lộ ở cuối video đúng không ạ Bây giờ mình sẽ vào việc luôn này cách đầu tiên thì chúng ta sử dụng thanh gợi ý của YouTube tìm kiếm thì mình sẽ chọn một cái chủ đề nhá Ví
dụ mình chọn luôn cái chủ đề là funny đi thì bạn ấy gõ cái từ khóa ví dụ là funny sau đó ấn dấu cách thì sẽ nó sẽ gợi ý ra các gợi ý mà người dùng hay tìm kiếm sau đó thì bạn hãy lần lượt thay thế bằng các ký tự như là a b c d thì tiếp tục cho ra rất nhiều những cái gợi ý khác nhau nữa mình sẽ để demo luôn cho bạn nhá ví dụ này mình gõ cụm từ khóa à funny Sau đó mình ấn dấu cách ra thì chúng ta có thể ở đây sẽ gợi ý cho chúng ta rất nhiều những cụm từ khóa tìm kiếm mà người dùng Họ đang tìm nhiều nhất đúng không ạ thì sau đó thì
chúng ta có thể gõ bằng những chữ cái đầu tiên thì ví dụ như bạn để chúng ta tiếp tục tìm chủ đề thì chủ funny ấy Bạn có thể thấy không Funny Animal này funny Anime funny ai này funny animation này rất nhiều chủ đề funny thì bạn hãy chọn một cái chủ đề mà bạn cảm thấy là phù hợp với mình cảm thấy hứng thú khi bạn làm cái chủ đề này được không ạ Nếu như bạn vẫn không thích thì tiếp tục chúng ta có thể bấm vào chữ B để chúng chúng ta chọn được tiếp các cái chủ đề khác nhau ví dụ bạn thấy đấy ạ chủ đề funny baby funny B funny Bunny funny Bear
và nếu chúng ta không thích thì chúng tiếp tục chúng ta tìm bằng các cái chữ cái Tiếp theo sẽ gợi ý cho bạn những cái chủ đề tìm kiếm về chủ đề f nhiều nhất rồi sau đó thì bạn hãy nhớ giúp mình đó là tìm ít nhất 10 từ khóa và sau đó nốt lại được chưa ạ Chúng ta sẽ sang Cách thứ hai đó là sử dụng Google để tìm kiếm thì chúng ta hãy tiếp tục với cả chủ đề funny nhé Hãy gõ cái từ khóa ví dụ đó là funny sau đó dấu cách ra thì bạn sẽ được các gợi ý mà người dùng hay tìm kiếm và sau đó là kéo xuống dưới cùng để có cái
tìm kiếm liên quan mình sẽ hướng dẫn bạn luôn nhé Ok chúng ta vào Google rồi nếu như bạn không biết được là những cái ngách nhỏ hơn của cái chủ đề funny thì chúng ta hãy gõ funny sau đó enter được chưa ạ đó chúng ta sẽ kéo xuống dưới cùng thì các bạn có thể thấy đ ạ Đây là những cái từ khóa mà được người dùng người ta tìm kiếm người ta xem nhiều nhất người ta tìm kiếm nhiều nhất thì bạn hoàn toàn có có thể sử dụng những cái từ khóa này ví dụ như là mình thấy đây ch một chủ đề đó là game Funny đi đó game Funny
đi Ok mình sẽ copy cái từ khóa này mình thả vào bên YouTube rồi và khi mình thả vào thì mình sẽ thấy được rất là nhiều cái kênh và mình hoàn toàn mình có thể tham khảo các cái kênh Hay là các cái dạng video ở đây đấy có rất nhiều nhiều lượt xem Đây là những lượt xem cao nhất thì thêm một mẹo nữa nhá thì bạn có thể sử dụng thêm cái bộ lọc đó tháng này bộ lọc ở đây để giúp bạn tìm ra được những cái video chất lượng nhất những video hay nhất đó đây chúng ta có rất là nhiều kênh đúng không ạ rất nhiều kênh trong 1 tháng trước hai
ngày trước này đó rồi ok tiếp theo chúng ta sang cái Cách thứ ba đó là sử dụng Google chen thì chúng ta lại tiếp tục với cái chủ đề funny nhá thì khi mà sử dụng Google chen ấy thì bạn hãy gõ cái từ khóa ví dụ là funny để chúng ta có thể xem được cái lượng quan tâm của người dùng và khi mà bạn sử dụng Google chen ấy thì cái Google chen nó sẽ có cái tác dụng nó sẽ cung cấp cho bạn từ khóa quan tâm gần nhất với cái chủ đề của bạn khi mà người dùng YouTube hay tìm kiếm hay khi họ xem các chủ đề tương tự Okay nhá cụ thể nhá Mình sẽ hướng dẫn
cho bạn luôn này chúng ta vào Google chan Ok chưa rồi sau đó thì chúng ta hãy gõ một cái từ khóa tìm kiếm cùng với chủ đề đó từ khóa fny rồi Bên cạnh đấy một chút nhá thì vì ý mình ấ mình thường mình sẽ hướng tới là các cái chủ đề funny view ngoại kiếm tiền view Ngoại nên là mình sẽ muốn hướng tới đó là Hoa Kỳ tại sao phải là mỹ Bởi vì đơn giản thôi Mỹ là họ trả tiền nhiều nhất trên a mỗi 1000 review Ok chúng ta sẽ gõ đây funny sau đó ấn khám phá rồi mình thay đổi một chút cái thông số nhá Tìm kiếm web này tìm kiếm trên
YouTube này đó và mình muốn là tìm kiếm trong khoảng 90 ngày qua thì bạn hoàn toàn có thể thấy là cái cụm từ funny là một cái chủ đề mà rất là nhiều người quan tâm và gần như là nó ở mức cao nhất đúng không ạ Ai cũng muốn là trong cuộc sống mình có những tiếng cười thì tiếp theo ở dưới đây Chúng ta có thể thấy được là đây là những cái tiểu vùng những cái khu vực mà nhiều người họ xem cái chủ đề funny nhất ở trên đất nước Mỹ chúng ta hoàn toàn có thể dựa vàoo đây để sau này chúng ta sẽ target đúng đối tượng hơn tiếp theo nữa
là dưới này đó là các cái từ khóa liên quan thì bạn có thể thấy ạ Ờ đây chủ đề về Funny Animal loại truyện tranh thì đây cũng là một trong những cái chủ đề mà bạn thấy không ạ Đây cũng cũng là một trong chủ đề mà người ta xem rất là nhiều thì chúng ta có thể thấy ở đây này đó đây các từ khóa liên quan này ví dụ như animal video Đột Phá tức là người ta xem rất là nhiều hay là những cái bức ảnh vui vẻ của động vật này đấy hay là truyện tranh cái bức tranh đấy dạng truyện tranh về động vật này hay là video Funny Animal Nếu mà không thích
thì chúng ta có thể quay lại và chúng ta tìm tiếp ở cái khu vực này Chúng ta thấy đúng không ạ chủ đề funny paring tip này các cặp đôi thì bạn hoàn toàn có thể dựa vào đây chúng ta lấy những cái từ khóa và chúng ta đưa lên YouTube đúng không ạ Và chúng ta tìm kiếm thì sẽ ra bạn sẽ thấy được rằng là nó sẽ ra rất là nhiều những cái kênh và chúng ta có thể tham khảo cái đối thủ để chúng ta có thể là làm cái kênh của chúng ta một cách hiệu quả nhất đúng không ạ Đây là những cái kênh mà đang được tìm kiếm nhiều nhất đang được xem
nhiều nhất và bạn hoàn toàn bạn có thể dựa vàoo đây để chúng là làm nên một cái video chất lượng hơn ok nhá và lưu ý giúp mình là khi mà sử dụng Google chan để tìm kiếm ấ thì hãy tìm và nốt lại 5 đến 10 từ khóa các bạn nhé rồi Tiếp theo cách thứ tư đó là chúng ta sử dụng cái công cụ viq thì mình nói qua một chút cho những bạn mà chưa nắm được về viq thì cái viq công cụ viq ấ nó có tác dụng đó là nó kiểm tra cái độ cạnh tranh của từ khóa này đó Cái lượt Tìm kiếm hàng tháng của từ khóa này gợi ý các cái từ khóa liên quan khi mà
chúng ta up video và chấm điểm sale cho cái video đó cụ thể hơn thì mình sẽ đi vào này để cho các bạn hiểu này Ờ vi IQ đấy Bạn nhớ nhá vào cài cài extension with EQ này đó bấm vào thì vì mình đã cài rồi nên là mình sẽ không nói quá sâu về cái phần là cài đặt này nhá đó mình sẽ đi vào vấn đề luôn rồi mình sẽ tiếp tục mình sau khi mình mình tiếp tục mình chọn được cái chủ đề là funny parent Ring tip thì mình các bạn có thể xem này khi mình cài viq này các bạn thể xem này Đây là một cái chủ đề này đó B có thể thấy là đánh giá điểm
nó là thấp 30/100 cái Dung lượng thì dung lượng người xem thì ở mức trung bình đó Cái độ cạnh tranh thì rất là cao và chúng ta có thể xem được là trung bình cái À cái view cao nhất nó rơi khoảng ba 36 triệu view và trung bình ấ nó rơi khoảng hơn 5 triệu view đó Ngoài ra thì khi mà chúng ta cài cái vi IQ ấy chúng ta có thể xem được là tot những cái kênh mà về cái cái chủ đề funny parenting tip này thì có đây đây là những kênh hàng đầu họ đang làm về cái chủ đề này thì chúng ta chúng ta hoàn toàn chúng ta có thể tham khảo các kênh
từ đối thủ ngoài ra thì chúng ta sẽ có những cái từ khóa TC đó các bạn có thể thấy ở đây đó rồi Tiếp theo nhá là chúng ta có thể xem chúng ta sẽ có thể ví dụ như mình mình mình muốn là tham khảo cái video này vì rất là nhiều view đúng không ạ của đối thủ Ok thì tiếp theo đó khi mình bấm vào video thì bạn có thể xem này là cái lượt view của họ ấy đó đây hơn 2 triệu sub này 875 triệu view này rồi chúng ta có thể thể đấy là cái video này họ làm này được chưa ạ hơn 122 triệu view này cái điểm sale của họ là 57 trên 100 cũng là
một cái điểm sale khá là cao Ngoài ra thì chúng ta có thể xem được các cái cái cái tag ấy các cái tag của cái kênh của họ đúng không ạ Họ t rất là nhiều chúng ta có thể dựa vàoo các cái t này để chúng ta Lọc ra các cái từ khóa cho mình Sau đó thì những cái vấn đề này Đây là những cái mà bạn cần quan tâm này đó Nó là video tag thì bạn hoàn hoàn toàn và bạn thấy các số đây không ạ Đấy là top những cái từ khóa mà đang dẫn đầu thì dựa vào những cái video T này chúng ta có thể copy chúng ta có thể tải về được chưa ạ
Để lấy các cái từ khóa này và đưa lên trên mục tìm kiếm để chúng ta tiếp tục chúng ta tìm ra được những cái video hữu ích hơn bên cạnh đó thì bạn có thể thấy cái cột phía bên tay phải đúng không ạ đó sẽ cho bạn biết được là được là những cái chủ đề liên quan những cái kênh làm cùng về chủ đề liên quan ví dụ bạn thấy không ạ Đây ạ đó Hơn một triệu m lượt xem trong 2 tháng trước đúng không ạ đó đây các bạn có thể thấy và hoàn toàn chúng ta có thể tham khảo từ các mục này được chưa ạ OK nhá và hãy nhớ giúp mình đó là hãy tìm và nốt lại 10 cái từ khóa
liên quan mà đang được xếp hạn ok chưa ạ và mình sẽ chia sẻ bạn là cách Cách thứ năm đó là cái cách mà mình vẫn đang làm Để tối ưu hóa được cái thời gian công sức trong cái việc tìm kiếm các key ngon đó là mình sử dụng cái công cụ TP thì cái công cụ t này thì nó có cái tác dụng gì đầu tiên ấ là nó tìm cái từ khóa một cách siêu nhanh luôn và xuất cái file từ khóa chỉ trong muốn bấm thôi cực kỳ tiết kiệm thời gian thứ hai đóa là tìm một cái chen giúp bạn tìm cái chen mới nhanh nhất thứ ba đó là video bạn tìm video và
các cái kênh liên quan ấy cũng siêu nhanh luôn vẫ chỉ bằng một nút bấm thôi và thứ tư ấy đó là mình cái cái công cụ này nó có một cái hay nữ là lấy được cái video của đối thủ sau đó nó chuyển thành tex Và bạn hoàn toàn có thể sửa đổi lại cái tex của đối thủ biến nó thành content của mình được chưa ạ rồi thì mình sẽ giới thiệu bạn qua một chút về cái công cụ tu nhá Đây là công cụ mình đang sử dụng này là sẽ có là bạn sẽ tìm kiếm qua từ khóa đấy Tìm kiếm chen tìm kiếm qua video ra video đấy và tìm kiếm các kênh Hay là đây video totech đây thì
mình sẽ chia sẻ một chút Thế nhá Ờ mình sẽ gõ cái từ khóa khi mà mình không Mình chỉ biết được là cái chủ đề mà mình muốn làm là chủ đề funny mình không biết được là các cái ngách nhỏ chuyên sâu ở bên trong ấy là gì thì mình gõ chung chung là funny sau đó đất nước vì mình làm view ngoại mình muốn tập trung vào thị trường Mỹ nên là mình đ United st us được chưa ạ sau đó sau khi mình generate các bạn có thể thấy được là nó sẽ xổ ra hàng hàng loạt các từ khóa đúng không ạ chúng ta không phải mất không phải thủ
công làm những cái việc như trước nữa mà chúng ta hoàn toàn dựa vào cái từ khóa và các bạn để ý nhá Đây là phần rank này xếp hạng này đó thì chúng ta sẽ dựa vào cái xếp hạng này Đây là xếp hạng hàng đầu thì đây là những cái từ khóa mà được nhiều người tìm kiếm nhất nhiều người quan tâm nhất thì việc của chúng ta chỉ là copy các từ khóa này và đưa lên mục tìm kiếm đúng không ạ Và chúng ta sẽ ra được cái tìm được những cái cái kênh đối thủ để chúng ta tham khảo hay tìm được rất nhiều những cái nguồn video về funny mà
bạn hoàn toàn có thể làm được chưa ạ tiếp theo thì mình giới thiệu một chút về cái phần chen này đây nó sẽ giúp bạn tìm chen thôi tiếp theo nữa đó là cái video thì về cái phần video ấy bạn hoàn toàn có thể gõ cái từ khóa vào đây đó và ấn ấn tìm kiếm thì nó sẽ ra cho bạn tất cả những cái video về cái chủ đề liên quan trong kênh funny Và bạn hoàn toàn có thể tham khảo các cái nguồn rất là nhanh đúng không ạ tiếp theo nó là về kênh thì cũng vẫn đây gõ vào chủ đề funny và nó sẽ ra tất cả những cái nguồn video à các cái nguồn kênh bao gồm
cả các bạn thấy không ạ Đây nguồn kênh đấy kênh và hashtag này đó rất là nhiều luôn kéo xống cuối cùng này chúng ta có cả các cái thẻ tác này đúng không ạ các cái từ khóa để chúng ta chúng ta lấy về chúng ta tìm kiếm một cách nhanh hơn đó và ngoài ra thì tex video thì chúng ta chỉ cần thả cái đường link của video đấy vào thôi Ví dụ mình lấy một cái đường link link đó sau đó thì sau đó thì mình thả nó vào đây và mình chỉ ấn convert thôi là rất là nhanh đúng không ạ Chưa tới 1 giây là đã ra được toàn bộ cái text này
rồi chúng ta có thể dùng cái tex này sửa đổi lại nội dung cho phù hợp và biến thành content của mình được chưa ạ Rồi hôm nay mình sã chia sẻ với bạn là năm cái cách để tìm từ khóa một cách đơn giản đó và khi bạn đã xem xong video này thì hãy like comment và subscribe vào kênh của mình nhé và để lại bất kỳ một cái com nào nếu như bạn thắc mắc rồi cảm ơn bạn rất là nhiều video dừng đến đây`;

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
                role: 'model', 
                parts: [{ text: 'Chào bạn, tôi là AI phân tích ngách YouTube. Bạn có thể cung cấp thêm cho tôi bất kỳ kiến thức, tài liệu, hoặc văn bản nào để tôi học hỏi. Kiến thức này sẽ được tôi ghi nhớ và áp dụng để cải thiện chất lượng các phân tích.'}] 
            }
        ];
        setTrainingChatHistory(defaultHistory);
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
  
    try {
      const options = {
        countToGenerate: 5,
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
  
  const handleUseNiche = async (niche: Niche) => {
    // 1. Check cache first
    const cachedPlan = contentPlanCache[niche.niche_name.original];
    if (cachedPlan) {
        setContentPlan(cachedPlan);
        setActiveNicheForContentPlan(niche);
        setIsContentPlanModalOpen(true);
        return;
    }

    // 2. If not in cache, proceed with API call
    const hasValidKey = apiKeyStatuses.includes('valid');
    if (apiKeys.length === 0 || !hasValidKey) {
      showNoApiKeyError();
      return;
    }
    setGeneratingContentForNiche(niche.niche_name.original);
    setError(null);
    try {
        const { result, successfulKeyIndex } = await generateContentPlan(niche, apiKeys, trainingChatHistory);
        setActiveApiKeyIndex(successfulKeyIndex);
        
        // 3. Save to state and cache
        setContentPlan(result);
        setContentPlanCache(prevCache => ({
            ...prevCache,
            [niche.niche_name.original]: result
        }));
        setActiveNicheForContentPlan(niche);
        setIsContentPlanModalOpen(true);
    } catch (err: any) {
        console.error(err);
        setError({ title: 'Không thể tạo kế hoạch', body: `Lỗi: ${err.message || 'Vui lòng thử lại.'}` });
        setActiveApiKeyIndex(null);
    } finally {
        setGeneratingContentForNiche(null);
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
        if (isSaved) {
            return prev.filter(saved => saved.niche_name.original !== niche.niche_name.original);
        } else {
            return [...prev, niche];
        }
    });
  };

  const handleExportSaved = () => {
    exportNichesToCsv(savedNiches, `saved_niches_${new Date().toISOString().split('T')[0]}.csv`);
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
    <div className="flex items-center space-x-3">
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
    </div>
  );

  const hasValidApiKey = apiKeyStatuses.includes('valid');

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-200">
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
            />
            <div className="w-full text-left bg-gray-800/50 border border-gray-700 p-4 rounded-lg space-y-4">
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
                    {targetMarket === 'Custom' && (
                        <input
                            type="text"
                            value={customMarket}
                            onChange={(e) => setCustomMarket(e.target.value)}
                            placeholder="Nhập thị trường khác (ví dụ: 'Ấn Độ', 'Brazil')"
                            className="w-full mt-2 p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all duration-300 placeholder-gray-500"
                            disabled={isLoading}
                        />
                    )}
                </div>
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
                    <ActionBar savedCount={savedNiches.length} onExport={handleExportSaved} />
                    <ResultsDisplay 
                      result={analysisResult} 
                      onDevelop={handleDevelopIdea}
                      analysisDepth={analysisDepth}
                      onLoadMore={handleLoadMore}
                      isLoadingMore={isLoadingMore}
                      onToggleSave={handleToggleSaveNiche}
                      savedNiches={savedNiches}
                      onUseNiche={handleUseNiche}
                      generatingContentForNiche={generatingContentForNiche}
                      contentPlanCache={contentPlanCache}
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
