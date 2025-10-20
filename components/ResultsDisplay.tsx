import React from 'react';
import type { AnalysisResult, Niche, ContentPlanResult } from '../types';
import NicheCard from './NicheCard';
import { PlusCircleIcon } from './icons/Icons';

interface ResultsDisplayProps {
  result: AnalysisResult;
  onDevelop: (nicheName: string) => void;
  analysisDepth: number;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  onToggleSave: (niche: Niche) => void;
  savedNiches: Niche[];
  onUseNiche: (niche: Niche) => void;
  generatingContentForNiche: string | null;
  contentPlanCache: Record<string, ContentPlanResult>;
  numResults: string;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onDevelop, analysisDepth, onLoadMore, isLoadingMore, onToggleSave, savedNiches, onUseNiche, generatingContentForNiche, contentPlanCache, numResults }) => {
  
  const numToAdd = parseInt(numResults, 10);

  return (
    <div className="w-full flex flex-col gap-8">
      {result.niches.map((niche, index) => {
        const isSaved = savedNiches.some(saved => saved.niche_name.original === niche.niche_name.original);
        const hasContentPlan = !!contentPlanCache[niche.niche_name.original];
        return (
            <NicheCard 
              key={`${niche.niche_name.original}-${index}`} 
              niche={niche}
              index={index}
              onDevelop={onDevelop}
              analysisDepth={analysisDepth}
              onToggleSave={onToggleSave}
              isSaved={isSaved}
              onUseNiche={onUseNiche}
              isGeneratingContent={generatingContentForNiche === niche.niche_name.original}
              hasContentPlan={hasContentPlan}
            />
        );
      })}
      <div className="flex justify-center mt-4">
        <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoadingMore ? (
                <>
                    <div className="w-5 h-5 border-2 border-t-teal-400 border-gray-500 rounded-full animate-spin"></div>
                    <span>Đang tải thêm...</span>
                </>
            ) : (
                <>
                    <PlusCircleIcon />
                    <span>Thêm {numToAdd} kết quả</span>
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;