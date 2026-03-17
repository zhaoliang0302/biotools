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
    bindTabs();
});

function bindTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            document.querySelectorAll('.module').forEach(module => {
                module.classList.toggle('active', module.id === target);
            });
        });
    });
}

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

function calculateTic() {
    const wells = parseFloat(document.getElementById('ticWells').value) || 0;
    const extraWells = parseFloat(document.getElementById('ticExtraWells').value) || 0;
    const volPerWell = parseFloat(document.getElementById('ticVolPerWell').value) || 0;

    const tnfStock = parseFloat(document.getElementById('ticTnfStock').value) || 0;
    const il1Stock = parseFloat(document.getElementById('ticIl1Stock').value) || 0;
    const c1qStockMg = parseFloat(document.getElementById('ticC1qStock').value) || 0;

    const tnfWork = parseFloat(document.getElementById('ticTnfWork').value) || 0;
    const il1Work = parseFloat(document.getElementById('ticIl1Work').value) || 0;
    const c1qWork = parseFloat(document.getElementById('ticC1qWork').value) || 0;

    if (wells <= 0 || volPerWell <= 0) {
        alert('请输入有效的孔数和每孔体积。');
        return;
    }
    if (tnfStock <= 0 || il1Stock <= 0 || c1qStockMg <= 0) {
        alert('请输入有效的母液浓度。');
        return;
    }
    if (tnfWork < 0 || il1Work < 0 || c1qWork < 0) {
        alert('请输入有效的工作浓度。');
        return;
    }

    const totalWells = wells + extraWells;
    const totalVolMl = totalWells * volPerWell;

    const c1qStockNg = c1qStockMg * 1000000;
    const tnfVolMl = (tnfWork / tnfStock) * totalVolMl;
    const il1VolMl = (il1Work / il1Stock) * totalVolMl;
    const c1qVolMl = (c1qWork / c1qStockNg) * totalVolMl;
    let mediumVolMl = totalVolMl - tnfVolMl - il1VolMl - c1qVolMl;
    if (mediumVolMl < -1e-6) {
        alert('工作浓度过高，培养基体积为负，请检查参数。');
        return;
    }
    if (mediumVolMl < 0) mediumVolMl = 0;

    const mix = {
        totalWells,
        totalVolMl,
        tnfVolMl,
        il1VolMl,
        c1qVolMl,
        mediumVolMl
    };

    renderTicResults(mix);
}

function renderTicResults(mix) {
    document.getElementById('ticResultPlaceholder').style.display = 'none';
    document.getElementById('ticResultContent').style.display = 'block';

    document.getElementById('ticSummaryText').innerText =
        `实际 ${mix.totalWells} 孔，总体积 ${formatMl(mix.totalVolMl)} mL（含富余）`;

    const rows = [
        { name: '培养基', vol: mix.mediumVolMl },
        { name: 'TNF', vol: mix.tnfVolMl },
        { name: 'IL-1α', vol: mix.il1VolMl },
        { name: 'C1q', vol: mix.c1qVolMl }
    ];

    document.getElementById('ticMixBody').innerHTML = rows.map(item => {
        const formatted = formatVol(item.vol);
        return `
            <tr>
                <td>${item.name}</td>
                <td class="val-highlight">${formatted}</td>
            </tr>
        `;
    }).join('');

    const tubePlan = buildTubePlan(mix.totalVolMl);
    document.getElementById('ticTubeSuggestion').innerHTML = tubePlan.summary;
    document.getElementById('ticPerTubeBody').innerHTML = buildPerTubeRows(mix, tubePlan);

    generateTicProtocolText(mix, tubePlan);
}

function buildTubePlan(totalVolMl) {
    const tubeSize = chooseTubeSize(totalVolMl);
    const tubeCount = Math.ceil(totalVolMl / tubeSize);
    const perTube = totalVolMl / tubeCount;
    const summary = tubeCount === 1
        ? `建议使用 ${tubeSize} mL 管 1 支（总体积 ${formatMl(totalVolMl)} mL）`
        : `建议分成 ${tubeCount} 个 ${tubeSize} mL 管，每管约 ${formatMl(perTube)} mL（同规格分装）`;
    return { tubeSize, tubeCount, perTube, summary };
}

function chooseTubeSize(totalVolMl) {
    const sizes = [1.5, 5, 10, 15, 50];
    let bestSize = sizes[sizes.length - 1];
    let bestCount = Infinity;
    sizes.forEach(size => {
        const count = Math.ceil(totalVolMl / size);
        if (count < bestCount) {
            bestCount = count;
            bestSize = size;
        }
    });
    return bestSize;
}

function buildPerTubeRows(mix, tubePlan) {
    const factor = tubePlan.perTube / mix.totalVolMl;
    const rows = [
        { name: '培养基', vol: mix.mediumVolMl * factor },
        { name: 'TNF', vol: mix.tnfVolMl * factor },
        { name: 'IL-1α', vol: mix.il1VolMl * factor },
        { name: 'C1q', vol: mix.c1qVolMl * factor }
    ];
    return rows.map(item => {
        return `
            <tr>
                <td>${item.name}</td>
                <td class="val-highlight">${formatVol(item.vol)}</td>
            </tr>
        `;
    }).join('');
}

function generateTicProtocolText(mix, tubePlan) {
    const date = new Date().toLocaleDateString('zh-CN');
    let text = `实验：TIC 配制 | ${date}\n`;
    text += `孔数（含富余）：${mix.totalWells}\n`;
    text += `总体积：${formatMl(mix.totalVolMl)} mL\n\n`;
    text += `[TIC 混合液]\n`;
    text += `  - 培养基： ${formatVol(mix.mediumVolMl)}\n`;
    text += `  - TNF：   ${formatVol(mix.tnfVolMl)}\n`;
    text += `  - IL-1α： ${formatVol(mix.il1VolMl)}\n`;
    text += `  - C1q：   ${formatVol(mix.c1qVolMl)}\n`;
    text += `\n[管子建议]\n  - ${tubePlan.summary}\n`;
    if (tubePlan.tubeCount > 1) {
        text += `\n[每管配制量]\n`;
        text += `  - 培养基： ${formatVol(mix.mediumVolMl * (tubePlan.perTube / mix.totalVolMl))}\n`;
        text += `  - TNF：   ${formatVol(mix.tnfVolMl * (tubePlan.perTube / mix.totalVolMl))}\n`;
        text += `  - IL-1α： ${formatVol(mix.il1VolMl * (tubePlan.perTube / mix.totalVolMl))}\n`;
        text += `  - C1q：   ${formatVol(mix.c1qVolMl * (tubePlan.perTube / mix.totalVolMl))}\n`;
    }
    document.getElementById('ticProtocolText').innerText = text;
}

function formatMl(num) {
    return parseFloat(num.toFixed(3));
}

function formatVol(ml) {
    const mlVal = formatMl(ml);
    const ulVal = parseFloat((ml * 1000).toFixed(1));
    return `${mlVal} mL (${ulVal} µL)`;
}

function copyTicProtocol() {
    const text = document.getElementById('ticProtocolText').innerText;
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => {
        alert("已复制到剪贴板");
    });
}
