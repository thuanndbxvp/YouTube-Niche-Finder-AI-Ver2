import type { Niche, ContentPlanResult } from '../types';

function removeVietnameseTones(str: string): string {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y");
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    // Some system encode vietnamese combining accent as individual utf-8 characters
    // Combining Diacritical Marks
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // ̀ ́ ̃ ̉ ̣
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // ˆ ̆ ̛
    return str;
}


function escapeCsvCell(cellData: string | number): string {
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
        const escapedString = stringData.replace(/"/g, '""');
        return `"${escapedString}"`;
    }
    return stringData;
}

export function generateNichesCsvContent(niches: Niche[]): string {
    if (!niches || niches.length === 0) {
        return '';
    }

    const maxIdeas = Math.max(...niches.map(n => (n.video_ideas || []).length), 0);

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
            const idea = niche.video_ideas ? niche.video_ideas[i] : undefined;
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

    return [headers.join(','), ...rows].join('\n');
}


export function exportNichesToCsv(niches: Niche[], filename: string = 'youtube_niche_ideas.csv') {
    const csvContent = generateNichesCsvContent(niches);
    if (!csvContent) {
        alert("Không có dữ liệu để xuất.");
        return;
    }

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

export function exportContentPlanToTxt(contentPlan: ContentPlanResult, nicheName: string) {
    if (!contentPlan || contentPlan.content_ideas.length === 0) {
        alert("Không có nội dung để xuất.");
        return;
    }

    let content = `KẾ HOẠCH NỘI DUNG CHI TIẾT\n`;
    content += `Ngách: ${nicheName}\n\n`;
    content += "========================================\n\n";

    contentPlan.content_ideas.forEach((idea, index) => {
        content += `Ý TƯỞNG VIDEO ${index + 1}\n`;
        content += `----------------------------------------\n`;
        content += `   > Tiêu đề (Original): ${idea.title.original}\n`;
        content += `   > Tiêu đề (Tiếng Việt): ${idea.title.translated}\n\n`;
        content += `   > Mở đầu (Hook):\n     ${idea.hook.replace(/\n/g, '\n     ')}\n\n`;
        content += `   > Các luận điểm chính:\n`;
        idea.main_points.forEach(point => {
            content += `     - ${point}\n`;
        });
        content += `\n`;
        content += `   > Gợi ý hình ảnh (Visuals):\n     ${idea.visual_suggestions.replace(/\n/g, '\n     ')}\n\n`;
        content += `   > Kêu gọi hành động (CTA):\n     ${idea.call_to_action.replace(/\n/g, '\n     ')}\n\n`;
        content += "========================================\n\n";
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const deAccentedName = removeVietnameseTones(nicheName);
    const sanitizedFileName = deAccentedName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_.-]/gi, '');
    const filename = `content_plan_${sanitizedFileName}.txt`;

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

export function exportVideoIdeasToTxt(niche: Niche) {
    if (!niche.video_ideas || niche.video_ideas.length === 0) {
        alert("Không có ý tưởng video nào để xuất.");
        return;
    }

    let content = `DANH SÁCH Ý TƯỞNG VIDEO\n`;
    content += `Ngách: ${niche.niche_name.original} (${niche.niche_name.translated})\n\n`;
    content += "========================================\n\n";

    niche.video_ideas.forEach((idea, index) => {
        content += `Ý TƯỞNG ${index + 1}\n`;
        content += `----------------------------------------\n`;
        content += `   > Tiêu đề (Original): ${idea.title.original}\n`;
        content += `   > Tiêu đề (Tiếng Việt): ${idea.title.translated}\n\n`;
        content += `   > Nội dung phác họa:\n     ${idea.draft_content.replace(/\n/g, '\n     ')}\n\n`;
        content += "========================================\n\n";
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const deAccentedName = removeVietnameseTones(niche.niche_name.original);
    const sanitizedFileName = deAccentedName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_.-]/gi, '');
    const filename = `video_ideas_${sanitizedFileName}.txt`;

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