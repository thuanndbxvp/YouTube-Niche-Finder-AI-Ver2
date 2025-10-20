import type { Niche } from '../types';

function escapeCsvCell(cellData: string | number): string {
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
        const escapedString = stringData.replace(/"/g, '""');
        return `"${escapedString}"`;
    }
    return stringData;
}

export function exportNichesToCsv(niches: Niche[], filename: string = 'youtube_niche_ideas.csv') {
    if (!niches || niches.length === 0) {
        alert("Không có dữ liệu để xuất.");
        return;
    }

    const maxIdeas = Math.max(...niches.map(n => n.video_ideas.length), 5);

    const headers = [
        'Niche Name (Original)',
        'Niche Name (Translated)',
        'Description',
        'Audience Demographics',
        'Interest Score',
        'Interest Explanation',
        'Monetization Score',
        'RPM Estimate',
        'Monetization Explanation',
        'Competition Score',
        'Competition Explanation',
        'Sustainability Score',
        'Sustainability Explanation',
        'Content Strategy',
    ];

    for (let i = 1; i <= maxIdeas; i++) {
        headers.push(`Video Idea ${i} - Title (Original)`);
        headers.push(`Video Idea ${i} - Title (Translated)`);
        headers.push(`Video Idea ${i} - Draft Content`);
    }


    const rows = niches.map(niche => {
        const row = [
            escapeCsvCell(niche.niche_name.original),
            escapeCsvCell(niche.niche_name.translated),
            escapeCsvCell(niche.description),
            escapeCsvCell(niche.audience_demographics),
            escapeCsvCell(niche.analysis.interest_level.score),
            escapeCsvCell(niche.analysis.interest_level.explanation),
            escapeCsvCell(niche.analysis.monetization_potential.score),
            escapeCsvCell(niche.analysis.monetization_potential.rpm_estimate),
            escapeCsvCell(niche.analysis.monetization_potential.explanation),
            escapeCsvCell(niche.analysis.competition_level.score),
            escapeCsvCell(niche.analysis.competition_level.explanation),
            escapeCsvCell(niche.analysis.sustainability.score),
            escapeCsvCell(niche.analysis.sustainability.explanation),
            escapeCsvCell(niche.content_strategy),
        ];

        for (let i = 0; i < maxIdeas; i++) {
            const idea = niche.video_ideas[i];
            if (idea) {
                row.push(escapeCsvCell(idea.title.original));
                row.push(escapeCsvCell(idea.title.translated));
                row.push(escapeCsvCell(idea.draft_content));
            } else {
                row.push('', '', '');
            }
        }
        return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}