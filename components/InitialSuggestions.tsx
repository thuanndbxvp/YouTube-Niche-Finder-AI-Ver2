import React, { useState, useEffect, useMemo } from 'react';
import { nicheKnowledgeBase, parseKnowledgeBaseForSuggestions } from '../data/knowledgeBase';

// Fisher-Yates shuffle algorithm
const shuffleArray = (array: string[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const NUMBER_OF_SUGGESTIONS_TO_SHOW = 50;

const InitialSuggestions: React.FC<{ setUserInput: (value: string) => void }> = ({ setUserInput }) => {
  const [displayedSuggestions, setDisplayedSuggestions] = useState<string[]>([]);
  
  // Parse the knowledge base to get a pool of suggestions.
  // useMemo ensures this expensive operation only runs once.
  const suggestionsPool = useMemo(() => parseKnowledgeBaseForSuggestions(nicheKnowledgeBase), []);


  useEffect(() => {
    // Shuffle the pool and take the desired number of suggestions to display.
    const shuffled = shuffleArray(suggestionsPool);
    setDisplayedSuggestions(shuffled.slice(0, NUMBER_OF_SUGGESTIONS_TO_SHOW));
  }, [suggestionsPool]);

  return (
    <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-700 rounded-xl">
      <p className="text-xl font-medium">Kết quả phân tích ngách sẽ xuất hiện ở đây.</p>
      <p className="mt-4 mb-4">Bắt đầu bằng cách nhập một ý tưởng, hoặc chọn một trong các gợi ý dưới đây:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {displayedSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => setUserInput(suggestion)}
            className="px-3 py-1 bg-gray-800 text-gray-400 text-sm rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InitialSuggestions;
