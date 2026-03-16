// 默认配置数据
const PRESETS = {
    '6well': {
        name: '六孔板 (6-well)',
        optiA: 125, lipo: 5, optiB: 125, sirna: 5
    },
    '60mm': {
        name: '60mm 培养皿',
        optiA: 250, lipo: 10, optiB: 250, sirna: 10
    }
};

let groups = [
    { id: 1, name: 'siNC', wells: 1 },
    { id: 1002, name: 'siRNA-1', wells: 3 }
];

document.addEventListener('DOMContentLoaded', () => {
    loadPreset();
    renderGroups();
});

function loadPreset() {
    const type = document.getElementById('plateType').value;
    const p = PRESETS[type];
    document.getElementById('volOptiA').value = p.optiA;
    document.getElementById('volLipo').value = p.lipo;
    document.getElementById('volOptiB').value = p.optiB;
    document.getElementById('volSiRNA').value = p.sirna;
}

function renderGroups() {
    const list = document.getElementById('groupsList');
    list.innerHTML = '';
    
    groups.forEach((group, index) => {
        const div = document.createElement('div');
        div.className = 'group-item';
        div.innerHTML = `
            <input type="text" placeholder="分组名称" value="${group.name}" onchange="updateGroup(${index}, 'name', this.value)">
            <div class="input-with-unit" style="margin-bottom:0; flex:1;">
                <input type="number" placeholder="孔数" value="${group.wells}" min="0" step="1" onchange="updateGroup(${index}, 'wells', this.value)">
                <span style="font-size:0.75rem;">孔</span>
            </div>
            <button class="btn-icon" onclick="removeGroup(${index})" title="删除"><i class="fas fa-trash-alt"></i></button>
        `;
        list.appendChild(div);
    });
}

function addGroup() {
    const nextIndex = getNextSiRnaIndex();
    groups.push({ id: Date.now(), name: `siRNA-${nextIndex}`, wells: 1 });
    renderGroups();
}

function getNextSiRnaIndex() {
    let maxIndex = 0;
    groups.forEach(group => {
        const match = String(group.name).match(/sirna[- ]?(\\d+)/i);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!Number.isNaN(num)) maxIndex = Math.max(maxIndex, num);
        }
    });
    return maxIndex + 1;
}

function removeGroup(index) {
    if (groups.length <= 1) {
        alert("至少保留一个分组！");
        return;
    }
    groups.splice(index, 1);
    renderGroups();
}

function updateGroup(index, field, value) {
    if (field === 'wells') {
        value = parseFloat(value);
        if (value < 0) value = 0;
    }
    groups[index][field] = value;
}

function calculate() {
    // 1. Get Settings
    const settings = {
        name: document.getElementById('plateType').options[document.getElementById('plateType').selectedIndex].text,
        optiA: parseFloat(document.getElementById('volOptiA').value) || 0,
        lipo: parseFloat(document.getElementById('volLipo').value) || 0,
        optiB: parseFloat(document.getElementById('volOptiB').value) || 0,
        sirna: parseFloat(document.getElementById('volSiRNA').value) || 0
    };

    const groupExtra = parseFloat(document.getElementById('groupExtraWells').value) || 0;
    const tubeAExtra = parseFloat(document.getElementById('extraWells').value) || 0;

    // 2. Logic
    let totalWellsForTubeA = 0;
    const groupResults = groups.map(group => {
        const calcWells = group.wells + groupExtra; 
        totalWellsForTubeA += calcWells;
        
        return {
            ...group,
            calcWells: calcWells,
            optiB: calcWells * settings.optiB,
            sirna: calcWells * settings.sirna
        };
    });

    const finalTubeAWells = totalWellsForTubeA + tubeAExtra;
    const tubeA = {
        totalWells: finalTubeAWells,
        optiA: finalTubeAWells * settings.optiA,
        lipo: finalTubeAWells * settings.lipo,
        totalVol: finalTubeAWells * (settings.optiA + settings.lipo)
    };

    // 3. Render
    renderResults(settings, tubeA, groupResults, groupExtra, tubeAExtra);
}

function renderResults(settings, tubeA, groupResults, groupExtra, tubeAExtra) {
    // Show sections
    document.getElementById('resultPlaceholder').style.display = 'none';
    document.getElementById('resultContent').style.display = 'block';

    // Summary
    const totalActual = groupResults.reduce((sum, g) => sum + g.wells, 0);
    document.getElementById('summaryText').innerText = 
        `共 ${groupResults.length} 组，实际 ${totalActual} 孔（A管富余 +${tubeAExtra}，分组富余 +${groupExtra}）`;

    // Tube A Table
    const tubeATable = `
        <tr>
            <td>Opti-MEM</td>
            <td>${settings.optiA} µL</td>
            <td class="val-highlight">${formatNum(tubeA.optiA)} µL</td>
        </tr>
        <tr>
            <td>Lipofectamine 3000</td>
            <td>${settings.lipo} µL</td>
            <td class="val-highlight">${formatNum(tubeA.lipo)} µL</td>
        </tr>
        <tr style="background-color: #f8fafc; font-weight:600;">
            <td>总体积</td>
            <td>-</td>
            <td>${formatNum(tubeA.totalVol)} µL</td>
        </tr>
    `;
    document.getElementById('tubeABody').innerHTML = tubeATable;

    // Tube B List
    let tubeBHtml = '';
    groupResults.forEach(group => {
        const volFromA = group.calcWells * (settings.optiA + settings.lipo);
        tubeBHtml += `
            <div class="group-card">
                <div class="group-card-header">
                    <span>${group.name}</span>
                    <span style="font-weight:400; font-size:0.9em; color:var(--text-muted);">${group.wells}孔 (配${formatNum(group.calcWells)})</span>
                </div>
                <table class="data-table" style="font-size:0.85rem;">
                    <tr>
                        <td width="50%">Opti-MEM</td>
                        <td class="val-highlight">${formatNum(group.optiB)} µL</td>
                    </tr>
                    <tr>
                        <td>siRNA</td>
                        <td class="val-highlight">${formatNum(group.sirna)} µL</td>
                    </tr>
                    <tr style="color:var(--primary);">
                        <td>加入 A 管混合液</td>
                        <td class="val-highlight">${formatNum(volFromA)} µL</td>
                    </tr>
                </table>
            </div>
        `;
    });
    document.getElementById('tubeBContainer').innerHTML = tubeBHtml;

    // Protocol Text
    generateProtocolText(settings, tubeA, groupResults);
}

function generateProtocolText(settings, tubeA, groupResults) {
    const date = new Date().toLocaleDateString('zh-CN');
    let text = `实验：siRNA 转染 | ${date}\n`;
    text += `体系：${settings.name}\n\n`;
    text += `[1. A 管混合液]\n`;
    text += `  - Opti-MEM：     ${formatNum(tubeA.optiA)} µL\n`;
    text += `  - Lipo3000：     ${formatNum(tubeA.lipo)} µL\n`;
    text += `  - 总体积：       ${formatNum(tubeA.totalVol)} µL（轻轻混匀）\n\n`;

    text += `[2. 各组 B 管配制]\n`;
    groupResults.forEach(g => {
        text += `  > 分组：${g.name}\n`;
        text += `    - Opti-MEM：  ${formatNum(g.optiB)} µL\n`;
        text += `    - siRNA：     ${formatNum(g.sirna)} µL\n`;
        const volFromA = g.calcWells * (settings.optiA + settings.lipo);
        text += `    - 加入 A 管： ${formatNum(volFromA)} µL\n`;
        text += `    - 轻轻混匀，室温静置 10-15 分钟\n\n`;
    });
    
    const finalVol = (settings.optiA + settings.lipo) + (settings.optiB + settings.sirna);
    text += `[3. 加入细胞]\n`;
    text += `  - 每孔加入转染复合物 ${formatNum(finalVol)} µL\n`;

    document.getElementById('protocolText').innerText = text;
}

function formatNum(num) {
    return parseFloat(num.toFixed(1));
}

function copyProtocol() {
    const text = document.getElementById('protocolText').innerText;
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => {
        // Could show a toast here
        alert("已复制到剪贴板");
    });
}
