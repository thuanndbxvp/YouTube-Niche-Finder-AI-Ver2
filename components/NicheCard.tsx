// Fix: Implement the NicheCard component to display analysis results.
import React from 'react';
import type { Niche } from '../types';
import {
  DollarSignIcon,
  UserGroupIcon,
  SparklesIcon,
  TrendingUpIcon,
  LightBulbIcon,
  TargetIcon,
  ShieldCheckIcon,
  ChevronDoubleRightIcon,
  CheckCircleIcon,
  SaveIcon,
} from './icons/Icons';

interface NicheCardProps {
  niche: Niche;
  onDevelop: (nicheName: string) => void;
  showUseThisNicheButton: boolean;
  onToggleSave: (niche: Niche) => void;
  isSaved: boolean;
}

interface AnalysisMetricProps {
    icon: React.ReactNode;
    label: string;
    score: number;
    explanation: string;
    rpm?: string;
    isCompetition?: boolean;
}

const AnalysisMetric: React.FC<AnalysisMetricProps> = ({ icon, label, score, explanation, rpm, isCompetition = false }) => {
    const getProgressBarColor = (s: number) => {
        if (isCompetition) { // lower is better
            if (s <= 33) return 'bg-green-500';
            if (s <= 66) return 'bg-yellow-500';
            return 'bg-red-500';
        } else { // higher is better
            if (s >= 66) return 'bg-green-500';
            if (s >= 33) return 'bg-yellow-500';
            return 'bg-red-500';
        }
    };
    const color = getProgressBarColor(score);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2 font-semibold text-gray-300">
                    {icon}
                    <span>{label}</span>
                    {rpm && <span className="text-xs font-mono bg-gray-700 px-2 py-0.5 rounded">{rpm}</span>}
                </div>
                <span className="font-bold">{score}/100</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 pt-1">{explanation}</p>
        </div>
    );
};


const NicheCard: React.FC<NicheCardProps> = ({ niche, onDevelop, showUseThisNicheButton, onToggleSave, isSaved }) => {
    
    const handleUseNiche = () => {
        // Placeholder for future functionality
        console.log("Using niche:", niche.niche_name.original);
        alert(`Chức năng "Sử dụng Niche này" cho "${niche.niche_name.translated}" sẽ được phát triển trong các phiên bản sau.`);
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl shadow-lg p-6 w-full text-left transition-all duration-300 hover:border-teal-500 hover:shadow-teal-500/10 flex flex-col">
            <div className="flex-grow">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 text-transparent bg-clip-text">{niche.niche_name.original}</h2>
                <h3 className="text-lg text-gray-400 -mt-1 mb-3">{niche.niche_name.translated}</h3>
                <p className="text-gray-400 mb-6">{niche.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Left Column */}
                    <div className="md:col-span-1 flex flex-col gap-6">
                        <div className="bg-gray-900/50 p-4 rounded-lg space-y-4 flex-1">
                            <h3 className="font-semibold text-gray-200 flex items-center"><TargetIcon /> <span className="ml-2">Đối tượng mục tiêu</span></h3>
                            <p className="text-gray-400 text-sm">{niche.audience_demographics}</p>
                        </div>
                         <div className="bg-gray-900/50 p-4 rounded-lg space-y-4 flex-1">
                            <h3 className="font-semibold text-gray-200 flex items-center"><LightBulbIcon /> <span className="ml-2">Chiến lược nội dung</span></h3>
                            <p className="text-gray-400 text-sm">{niche.content_strategy}</p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-2 bg-gray-900/50 p-4 rounded-lg space-y-5">
                        <h3 className="font-semibold text-gray-200 mb-2">Phân Tích Ngách</h3>
                        <AnalysisMetric icon={<TrendingUpIcon />} label="Mức Độ Quan Tâm" score={niche.analysis.interest_level.score} explanation={niche.analysis.interest_level.explanation} />
                        <AnalysisMetric icon={<DollarSignIcon />} label="Tiềm Năng Kiếm Tiền" score={niche.analysis.monetization_potential.score} explanation={niche.analysis.monetization_potential.explanation} rpm={niche.analysis.monetization_potential.rpm_estimate} />
                        <AnalysisMetric icon={<SparklesIcon />} label="Mức Độ Cạnh Tranh" score={niche.analysis.competition_level.score} explanation={niche.analysis.competition_level.explanation} isCompetition={true} />
                        <AnalysisMetric icon={<ShieldCheckIcon />} label="Tính Bền Vững" score={niche.analysis.sustainability.score} explanation={niche.analysis.sustainability.explanation} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center"><UserGroupIcon /> <span className="ml-2">Ý tưởng Video</span></h3>
                        <div className="overflow-x-auto bg-gray-900/50 rounded-lg border border-gray-700/50">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-700/30">
                                    <tr>
                                        <th className="text-left font-semibold text-gray-300 p-3 w-1/3">Tiêu đề</th>
                                        <th className="text-left font-semibold text-gray-300 p-3 w-2/3">Nội dung phác họa (sơ thảo)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {niche.video_ideas.map((idea, i) => (
                                        <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-800/50 transition-colors">
                                            <td className="p-3 align-top">
                                                <p className="font-semibold text-gray-200">{idea.title.original}</p>
                                                <p className="text-xs text-gray-400 italic">{idea.title.translated}</p>
                                            </td>
                                            <td className="p-3 text-gray-400 align-top">
                                                {idea.draft_content}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700/60 flex flex-col sm:flex-row items-center justify-end gap-3">
                 <button
                    onClick={() => onToggleSave(niche)}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 ${
                        isSaved 
                            ? 'bg-teal-600 text-white hover:bg-teal-700' 
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500 hover:text-white'
                    }`}
                >
                    <SaveIcon />
                    <span>{isSaved ? 'Đã lưu' : 'Lưu kết quả'}</span>
                </button>
                {showUseThisNicheButton && (
                     <button
                        onClick={handleUseNiche}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-300 transform hover:scale-105"
                    >
                        <CheckCircleIcon />
                        <span>Sử dụng Niche này</span>
                    </button>
                )}
                 <button
                    onClick={() => onDevelop(niche.niche_name.original)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-300"
                >
                    <ChevronDoubleRightIcon />
                    <span>Phát triển thêm ý tưởng</span>
                </button>
            </div>
        </div>
    );
};

export default NicheCard;