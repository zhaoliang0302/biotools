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

let qpcrGroups = [
    { id: 1, name: 'Control', rnaConc: 120 },
    { id: 2, name: 'Treatment', rnaConc: 95 }
];

let qpcrGenes = [
    { id: 1, name: 'GAPDH' },
    { id: 2, name: 'GeneX' }
];

let lastQpcrData = null;

document.addEventListener('DOMContentLoaded', () => {
    loadPreset();
    renderGroups();
    renderQpcrGroups();
    renderQpcrGenes();
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

function formatQpcr(num) {
    return Number(num).toFixed(2);
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

function renderQpcrGroups() {
    const list = document.getElementById('qpcrGroupsList');
    if (!list) return;
    list.innerHTML = '';

    qpcrGroups.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'group-item qpcr-group-item';
        div.innerHTML = `
            <input type="text" placeholder="分组名称" value="${item.name}" onchange="updateQpcrGroup(${index}, 'name', this.value)">
            <div class="input-with-unit" style="margin-bottom:0; flex:1;">
                <input type="number" placeholder="RNA浓度" value="${item.rnaConc}" min="0.1" step="0.1" onchange="updateQpcrGroup(${index}, 'rnaConc', this.value)">
                <span style="font-size:0.75rem;">ng/µL</span>
            </div>
            <button class="btn-icon" onclick="removeQpcrGroup(${index})" title="删除"><i class="fas fa-trash-alt"></i></button>
        `;
        list.appendChild(div);
    });
}

function addQpcrGroup() {
    qpcrGroups.push({ id: Date.now(), name: `Group-${qpcrGroups.length + 1}`, rnaConc: 100 });
    renderQpcrGroups();
}

function updateQpcrGroup(index, field, value) {
    if (field === 'rnaConc') {
        const conc = parseFloat(value);
        qpcrGroups[index].rnaConc = Number.isNaN(conc) ? '' : conc;
        return;
    }
    qpcrGroups[index].name = value;
}

function removeQpcrGroup(index) {
    if (qpcrGroups.length <= 1) {
        alert('至少保留一个分组。');
        return;
    }
    qpcrGroups.splice(index, 1);
    renderQpcrGroups();
}

function renderQpcrGenes() {
    const list = document.getElementById('qpcrGenesList');
    if (!list) return;
    list.innerHTML = '';

    qpcrGenes.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'group-item qpcr-gene-item';
        div.innerHTML = `
            <input type="text" placeholder="基因名称" value="${item.name}" onchange="updateQpcrGene(${index}, this.value)">
            <button class="btn-icon" onclick="removeQpcrGene(${index})" title="删除"><i class="fas fa-trash-alt"></i></button>
        `;
        list.appendChild(div);
    });
}

function addQpcrGene() {
    qpcrGenes.push({ id: Date.now(), name: `Gene-${qpcrGenes.length + 1}` });
    renderQpcrGenes();
}

function updateQpcrGene(index, value) {
    qpcrGenes[index].name = value;
}

function removeQpcrGene(index) {
    if (qpcrGenes.length <= 1) {
        alert('至少保留一个基因。');
        return;
    }
    qpcrGenes.splice(index, 1);
    renderQpcrGenes();
}

function calculateQpcr() {
    const targetRnaNg = parseFloat(document.getElementById('qpcrTargetRnaNg').value) || 0;
    const cdnaConc = targetRnaNg / 20;
    const cdnaNgPerWell = parseFloat(document.getElementById('qpcrCdnaNgPerWell').value) || 0;
    const replicates = parseInt(document.getElementById('qpcrReplicates').value, 10) || 0;
    const extraWells = parseInt(document.getElementById('qpcrExtraWells').value, 10) || 0;

    const cleanGroups = qpcrGroups
        .map(g => ({
            ...g,
            name: String(g.name || '').trim(),
            rnaConc: parseFloat(g.rnaConc)
        }))
        .filter(g => g.name);
    const cleanGenes = qpcrGenes
        .map(g => ({ ...g, name: String(g.name || '').trim() }))
        .filter(g => g.name);

    if (targetRnaNg <= 0 || cdnaNgPerWell <= 0) {
        alert('请填写有效的浓度和含量参数。');
        return;
    }
    if (replicates <= 0) {
        alert('平行孔数必须大于 0。');
        return;
    }
    if (cleanGroups.length === 0 || cleanGenes.length === 0) {
        alert('请至少填写一个分组和一个基因。');
        return;
    }
    const invalidGroup = cleanGroups.find(g => !Number.isFinite(g.rnaConc) || g.rnaConc <= 0);
    if (invalidGroup) {
        alert(`请填写有效的分组 RNA 浓度：${invalidGroup.name}`);
        return;
    }

    const reactionCount = cleanGroups.length * cleanGenes.length * replicates;
    if (reactionCount > 96) {
        alert(`当前需要 ${reactionCount} 孔，超过 96 孔板容量。请减少分组/基因或平行孔数。`);
        return;
    }

    const minRnaGroup = cleanGroups.reduce((min, g) => (g.rnaConc < min.rnaConc ? g : min), cleanGroups[0]);
    const minRnaConc = minRnaGroup.rnaConc;
    const rtRnaVolUl = targetRnaNg / minRnaConc;
    const dilutionRatio = cdnaConc / cdnaNgPerWell;
    const rtPlans = buildRtPlans(cleanGroups, targetRnaNg);

    const design = buildQpcrPlateDesign(cleanGroups, cleanGenes, replicates);
    const tube1Plans = buildTube1Plans(cleanGroups.length, cleanGenes, replicates, extraWells);
    const tube2Plans = buildTube2Plans(cleanGenes.length, cleanGroups, replicates, extraWells);

    renderQpcrResults({
        minRnaConc,
        targetRnaNg,
        cdnaConc,
        cdnaNgPerWell,
        replicates,
        extraWells,
        reactionCount,
        rtRnaVolUl,
        dilutionRatio,
        minRnaGroup,
        cleanGroups,
        cleanGenes,
        rtPlans,
        design,
        tube1Plans,
        tube2Plans
    });
}

function buildRtPlans(groupsList, targetRnaNg) {
    return groupsList.map(group => {
        const rnaVol = targetRnaNg / group.rnaConc;
        const gdnaMix = 2;
        const evoMix = 4;
        const water = 20 - gdnaMix - evoMix - rnaVol;
        return {
            group: group.name,
            rnaConc: group.rnaConc,
            targetRnaNg,
            rnaVol,
            gdnaMix,
            evoMix,
            water
        };
    });
}

function buildQpcrPlateDesign(groupsList, genesList, replicates) {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = 12;
    const plate = Array.from({ length: 8 }, () => Array.from({ length: cols }, () => null));
    const assignments = [];
    const columnPlan = [];
    genesList.forEach(gene => {
        for (let rep = 1; rep <= replicates; rep += 1) {
            columnPlan.push({ gene: gene.name, rep });
        }
    });

    const useReadableLayout = groupsList.length <= 8 && columnPlan.length <= 12;
    if (useReadableLayout) {
        groupsList.forEach((group, rowIndex) => {
            columnPlan.forEach((colMeta, colIndex) => {
                const well = `${rows[rowIndex]}${colIndex + 1}`;
                const sample = {
                    group: group.name,
                    gene: colMeta.gene,
                    rep: colMeta.rep,
                    well
                };
                plate[rowIndex][colIndex] = sample;
                assignments.push(sample);
            });
        });

        const rowLabels = rows.map((rowName, rowIndex) => (
            rowIndex < groupsList.length ? `${rowName} | ${groupsList[rowIndex].name}` : `${rowName} | -`
        ));
        const colLabels = Array.from({ length: cols }, (_, colIndex) => (
            colIndex < columnPlan.length ? `${colIndex + 1} | ${columnPlan[colIndex].gene}` : `${colIndex + 1} | -`
        ));

        return { plate, assignments, rowLabels, colLabels, useReadableLayout };
    }

    // Fallback: keep full 96 孔兼容，但标签只展示首个命中，避免出现混合字符串。
    let idx = 0;
    genesList.forEach(gene => {
        groupsList.forEach(group => {
            for (let rep = 1; rep <= replicates; rep += 1) {
                const rowIndex = Math.floor(idx / cols);
                const colIndex = idx % cols;
                const well = `${rows[rowIndex]}${colIndex + 1}`;
                const sample = { group: group.name, gene: gene.name, rep, well };
                plate[rowIndex][colIndex] = sample;
                assignments.push(sample);
                idx += 1;
            }
        });
    });

    const rowLabels = rows.map((rowName, rowIndex) => {
        const first = plate[rowIndex].find(Boolean);
        return `${rowName} | ${first ? first.group : '-'}`;
    });
    const colLabels = Array.from({ length: cols }, (_, colIndex) => {
        let first = null;
        for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
            if (plate[rowIndex][colIndex]) {
                first = plate[rowIndex][colIndex];
                break;
            }
        }
        return `${colIndex + 1} | ${first ? first.gene : '-'}`;
    });

    return { plate, assignments, rowLabels, colLabels, useReadableLayout };
}

function buildTube1Plans(groupCount, genesList, replicates, extraWells) {
    return genesList.map(gene => {
        const baseWells = groupCount * replicates;
        const totalWells = baseWells + extraWells;
        return {
            name: `管一（${gene.name}）`,
            gene: gene.name,
            baseWells,
            totalWells,
            sybr: totalWells * 10,
            water: totalWells * 4,
            primerF: totalWells * 0.5,
            primerR: totalWells * 0.5,
            totalVol: totalWells * 15
        };
    });
}

function buildTube2Plans(geneCount, groupsList, replicates, extraWells) {
    return groupsList.map(group => {
        const baseWells = geneCount * replicates;
        const totalWells = baseWells + extraWells;
        return {
            name: `管二（${group.name}）`,
            group: group.name,
            baseWells,
            totalWells,
            cdna: totalWells * 1,
            water: totalWells * 4,
            totalVol: totalWells * 5
        };
    });
}

function renderQpcrResults(data) {
    lastQpcrData = data;
    document.getElementById('qpcrResultPlaceholder').style.display = 'none';
    document.getElementById('qpcrResultContent').style.display = 'block';

    document.getElementById('qpcrSummaryText').innerText =
        `共 ${data.reactionCount} 个反应孔（${data.cleanGroups.length} 组 × ${data.cleanGenes.length} 基因 × ${data.replicates} 平行）`;

    renderQpcrAlerts(data);
    renderQpcrCalcTable(data);
    renderQpcrRtTable(data.rtPlans, data.dilutionRatio);
    renderQpcrTubePlans(data);
    renderQpcrPlate(data.design);
    generateQpcrProtocolText(data);
}

function renderQpcrAlerts(data) {
    const alerts = [];
    if (data.targetRnaNg < 500 || data.targetRnaNg > 1000) {
        alerts.push(`目标逆转录 RNA 含量为 ${formatQpcr(data.targetRnaNg)} ng，建议保持在 500-1000 ng。`);
    }
    if (data.rtRnaVolUl > 20) {
        alerts.push(`计算得到 RNA 体积 ${formatQpcr(data.rtRnaVolUl)} µL，超过 20 µL 逆转录体系，请降低目标 RNA 含量或提高样本浓度。`);
    }
    const noWaterGroups = data.rtPlans.filter(p => p.water < 0).map(p => p.group);
    if (noWaterGroups.length > 0) {
        alerts.push(`以下样品在 20 µL 逆转录体系中无酶水体积为负（RNA 体积过大）：${noWaterGroups.join('、')}。请降低目标 RNA 含量或提高 RNA 浓度。`);
    }
    if (data.cdnaNgPerWell < 5 || data.cdnaNgPerWell > 10) {
        alerts.push(`每孔 cDNA 含量为 ${formatQpcr(data.cdnaNgPerWell)} ng，建议范围 5-10 ng。`);
    }

    const container = document.getElementById('qpcrAlerts');
    if (alerts.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = alerts.map(text => `<div class="summary-badge qpcr-warn"><i class="fas fa-exclamation-triangle"></i><span>${text}</span></div>`).join('');
}

function renderQpcrCalcTable(data) {
    const ratioText = data.dilutionRatio >= 1
        ? `约 1:${formatQpcr(data.dilutionRatio)}（原液:稀释后）`
        : `当前浓度不足（比值 ${formatQpcr(data.dilutionRatio)}），建议减少每孔 cDNA ng 或提高逆转录产物浓度`;
    const rows = [
        ['最低 RNA 浓度', `${formatQpcr(data.minRnaConc)} ng/µL（${data.minRnaGroup.name}）`],
        ['目标逆转录 RNA 含量', `${formatQpcr(data.targetRnaNg)} ng`],
        ['需要加入 RNA 体积', `${formatQpcr(data.rtRnaVolUl)} µL`],
        ['逆转录 cDNA 浓度', `${formatQpcr(data.cdnaConc)} ng/µL`],
        ['每孔 cDNA 含量', `${formatQpcr(data.cdnaNgPerWell)} ng`],
        ['建议稀释比例', ratioText]
    ];
    document.getElementById('qpcrCalcBody').innerHTML = rows.map(item => `
        <tr>
            <td>${item[0]}</td>
            <td class="val-highlight">${item[1]}</td>
        </tr>
    `).join('');
}

function renderQpcrRtTable(rtPlans, dilutionRatio) {
    const head = rtPlans.map(plan => `<th>${plan.group}</th>`).join('');
    const dilutionWaterFor20ul = getDilutionWaterFor20ul(dilutionRatio);
    const buildRow = (label, getter, highlight = false) => {
        const cells = rtPlans.map(plan => {
            const val = getter(plan);
            const cls = highlight ? 'val-highlight' : '';
            return `<td class="${cls}">${val}</td>`;
        }).join('');
        return `<tr><td>${label}</td>${cells}</tr>`;
    };

    const html = `
        <div class="rt-table-wrap">
            <table class="data-table rt-table">
                <thead>
                    <tr>
                        <th>组分</th>
                        ${head}
                    </tr>
                </thead>
                <tbody>
                    ${buildRow('RNA 浓度 (ng/µL)', p => formatQpcr(p.rnaConc))}
                    ${buildRow('目标 RNA (ng)', p => formatQpcr(p.targetRnaNg))}
                    ${buildRow('RNA 体积 (µL)', p => formatQpcr(p.rnaVol), true)}
                    ${buildRow('gDNA Mix (µL)', p => formatQpcr(p.gdnaMix))}
                    ${buildRow('5X Evo Reaction Mix (µL)', p => formatQpcr(p.evoMix))}
                    ${buildRow('无酶水 (µL)', p => formatQpcr(p.water), true)}
                    ${buildRow('总量 (µL)', () => '20.00')}
                    ${buildRow('cDNA 稀释加无酶水 (µL)', () => formatQpcr(dilutionWaterFor20ul), true)}
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('qpcrRtContainer').innerHTML = html;
}

function renderQpcrTubePlans(data) {
    const tube1Html = data.tube1Plans.map(plan => `
        <div class="group-card">
            <div class="group-card-header">
                <span>${plan.name}</span>
                <span style="font-weight:400; font-size:0.9em; color:var(--text-muted);">${plan.baseWells}孔 + 富余${data.extraWells}孔</span>
            </div>
            <table class="data-table" style="font-size:0.85rem;">
                <tr><td>SYBR Green</td><td class="val-highlight">${formatQpcr(plan.sybr)} µL</td></tr>
                <tr><td>无酶水</td><td class="val-highlight">${formatQpcr(plan.water)} µL</td></tr>
                <tr><td>Primer F</td><td class="val-highlight">${formatQpcr(plan.primerF)} µL</td></tr>
                <tr><td>Primer R</td><td class="val-highlight">${formatQpcr(plan.primerR)} µL</td></tr>
                <tr style="background-color: #f8fafc; font-weight:600;"><td>总量</td><td>${formatQpcr(plan.totalVol)} µL</td></tr>
            </table>
        </div>
    `).join('');

    const tube2Html = data.tube2Plans.map(plan => `
        <div class="group-card">
            <div class="group-card-header">
                <span>${plan.name}</span>
                <span style="font-weight:400; font-size:0.9em; color:var(--text-muted);">${plan.baseWells}孔 + 富余${data.extraWells}孔</span>
            </div>
            <table class="data-table" style="font-size:0.85rem;">
                <tr><td>cDNA</td><td class="val-highlight">${formatQpcr(plan.cdna)} µL</td></tr>
                <tr><td>无酶水</td><td class="val-highlight">${formatQpcr(plan.water)} µL</td></tr>
                <tr style="background-color: #f8fafc; font-weight:600;"><td>总量</td><td>${formatQpcr(plan.totalVol)} µL</td></tr>
            </table>
        </div>
    `).join('');

    document.getElementById('qpcrTube1Container').innerHTML = tube1Html;
    document.getElementById('qpcrTube2Container').innerHTML = tube2Html;
}

function renderQpcrPlate(design) {
    const rowNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const headCells = Array.from({ length: 12 }, (_, i) => `
        <th>
            <div class="axis-main">${i + 1}</div>
            <div class="axis-note">${(design.colLabels && design.colLabels[i]) ? design.colLabels[i].split(' | ')[1] : '-'}</div>
        </th>
    `).join('');

    const bodyRows = rowNames.map((rowName, rowIndex) => {
        const rowCells = design.plate[rowIndex].map(cell => {
            if (!cell) return '<td class="plate-cell empty">-</td>';
            return '<td class="plate-cell filled"><span class="well-dot">●</span></td>';
        }).join('');
        return `
            <tr>
                <th>
                    <div class="axis-main">${rowName}</div>
                    <div class="axis-note">${(design.rowLabels && design.rowLabels[rowIndex]) ? design.rowLabels[rowIndex].split(' | ')[1] : '-'}</div>
                </th>
                ${rowCells}
            </tr>
        `;
    }).join('');

    const layoutHint = design.useReadableLayout
        ? '<div class="plate-hint">当前模式：行对应分组，列对应基因（保留 A-H 与 1-12）</div>'
        : '<div class="plate-hint plate-hint-warn">当前为兼容排布（分组或基因数量较多），标签显示首个映射。若需严格一一对应，建议控制为 ≤8 组 且（基因数×平行数）≤12。</div>';

    document.getElementById('qpcrPlateContainer').innerHTML = `
        ${layoutHint}
        <div class="plate-wrap">
            <table class="plate-table">
                <thead><tr><th></th>${headCells}</tr></thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </div>
    `;
}

function generateQpcrProtocolText(data) {
    const date = new Date().toLocaleDateString('zh-CN');
    const dilutionWaterFor20ul = getDilutionWaterFor20ul(data.dilutionRatio);
    const wellRows = getQpcrWellRows(data.design);
    let text = `实验：qPCR 配置 | ${date}\n`;
    text += `分组：${data.cleanGroups.map(g => g.name).join('、')}\n`;
    text += `基因：${data.cleanGenes.map(g => g.name).join('、')}\n`;
    text += `总反应孔：${data.reactionCount}（每组/基因 ${data.replicates} 平行）\n`;
    text += `富余孔：+${data.extraWells}\n\n`;
    text += `[1. 逆转录与稀释计算]\n`;
    text += `  - 最低 RNA 浓度：${formatQpcr(data.minRnaConc)} ng/µL（${data.minRnaGroup.name}）\n`;
    text += `  - 目标逆转录 RNA 含量：${formatQpcr(data.targetRnaNg)} ng\n`;
    text += `  - 需加 RNA 体积：${formatQpcr(data.rtRnaVolUl)} µL（20 µL 体系）\n\n`;
    text += `[2. qPCR cDNA]\n`;
    text += `  - 逆转录 cDNA 浓度：${formatQpcr(data.cdnaConc)} ng/µL\n`;
    text += `  - 每孔 cDNA 含量：${formatQpcr(data.cdnaNgPerWell)} ng\n`;
    text += `  - 推荐稀释倍数：${data.dilutionRatio >= 1 ? `1:${formatQpcr(data.dilutionRatio)}` : `浓度不足（比值 ${formatQpcr(data.dilutionRatio)}）`}\n\n`;
    text += `[3. 逆转录体系配置（20 µL/样品）]\n`;
    text += `  - cDNA 稀释加无酶水（每 20 µL 稀释液）：${formatQpcr(dilutionWaterFor20ul)} µL\n`;
    data.rtPlans.forEach(plan => {
        text += `  > ${plan.group}\n`;
        text += `    - RNA（${formatQpcr(plan.rnaConc)} ng/µL）：${formatQpcr(plan.rnaVol)} µL\n`;
        text += `    - gDNA Mix：${formatQpcr(plan.gdnaMix)} µL\n`;
        text += `    - 5X Evo Reaction Mix：${formatQpcr(plan.evoMix)} µL\n`;
        text += `    - 无酶水：${formatQpcr(plan.water)} µL\n`;
    });
    text += `\n[4. 上板规则]\n`;
    text += `  - 96 孔板，20 µL/孔\n`;
    text += `  - 先加管一（SYBR + 4 µL 水 + 引物），再加管二（cDNA + 4 µL 水）\n`;
    text += `  - 单孔构成：10 µL SYBR + 8 µL 无酶水 + 1 µL cDNA + 0.5 µL Primer F + 0.5 µL Primer R\n\n`;
    text += `[5. 体系 A（引物预混管，按基因）]\n`;
    data.tube1Plans.forEach(plan => {
        text += `  > ${plan.name}：${plan.baseWells} 孔 + 富余 ${data.extraWells} 孔\n`;
        text += `    - SYBR Green：${formatQpcr(plan.sybr)} µL\n`;
        text += `    - 无酶水：${formatQpcr(plan.water)} µL\n`;
        text += `    - Primer F：${formatQpcr(plan.primerF)} µL\n`;
        text += `    - Primer R：${formatQpcr(plan.primerR)} µL\n`;
    });
    text += `\n[6. 体系 B（cDNA 样品管，按分组）]\n`;
    data.tube2Plans.forEach(plan => {
        text += `  > ${plan.name}：${plan.baseWells} 孔 + 富余 ${data.extraWells} 孔\n`;
        text += `    - cDNA：${formatQpcr(plan.cdna)} µL\n`;
        text += `    - 无酶水：${formatQpcr(plan.water)} µL\n`;
    });
    text += `\n[7. 加样顺序]\n`;
    text += `  - 步骤1：按基因向对应孔加入 15 µL 管一\n`;
    text += `  - 步骤2：按分组向对应孔加入 5 µL 管二\n`;
    text += `  - 步骤3：轻拍/短暂离心后上机\n`;
    text += `\n[8. 96 孔板排序（孔位 -> 分组 / 基因 / 平行）]\n`;
    wellRows.forEach(item => {
        text += `  - ${item.well} -> ${item.group} / ${item.gene} / Rep${item.rep}\n`;
    });

    document.getElementById('qpcrProtocolText').innerText = text;
}

function copyQpcrProtocol() {
    const text = document.getElementById('qpcrProtocolText').innerText.trim();
    if (!text) {
        alert('请先点击“生成方案”。');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        alert("已复制到剪贴板");
    });
}

function downloadQpcrProtocolTxt() {
    const text = document.getElementById('qpcrProtocolText').innerText.trim();
    if (!text) {
        alert('请先点击“生成方案”。');
        return;
    }
    downloadBlobFile(getQpcrExportFilename('record', 'txt'), text, 'text/plain;charset=utf-8');
}

function downloadQpcrPrintHtml() {
    if (!lastQpcrData) {
        alert('请先点击“生成方案”。');
        return;
    }
    const html = buildQpcrPrintHtml(lastQpcrData);
    downloadBlobFile(getQpcrExportFilename('print', 'html'), html, 'text/html;charset=utf-8');
}

function getDilutionWaterFor20ul(dilutionRatio) {
    return dilutionRatio > 1 ? 20 * (dilutionRatio - 1) : 0;
}

function getQpcrWellRows(design) {
    const rows = [];
    const rowNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
        for (let colIndex = 0; colIndex < 12; colIndex += 1) {
            const cell = design.plate[rowIndex][colIndex];
            if (!cell) continue;
            rows.push({
                well: `${rowNames[rowIndex]}${colIndex + 1}`,
                group: cell.group,
                gene: cell.gene,
                rep: cell.rep
            });
        }
    }
    return rows;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getQpcrExportFilename(suffix, ext) {
    const now = new Date();
    const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('');
    return `qpcr-${suffix}-${stamp}.${ext}`;
}

function downloadBlobFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function buildQpcrPrintHtml(data) {
    const dilutionWaterFor20ul = getDilutionWaterFor20ul(data.dilutionRatio);
    const rtHead = data.rtPlans.map(plan => `<th>${escapeHtml(plan.group)}</th>`).join('');
    const rtRow = (name, getter) => `
        <tr>
            <td>${escapeHtml(name)}</td>
            ${data.rtPlans.map(plan => `<td>${escapeHtml(getter(plan))}</td>`).join('')}
        </tr>
    `;
    const plateHead = Array.from({ length: 12 }, (_, i) => {
        const raw = (data.design.colLabels && data.design.colLabels[i]) ? data.design.colLabels[i] : '';
        const mapped = raw.includes(' | ') ? raw.split(' | ')[1] : '-';
        return `<th>${i + 1} (${escapeHtml(mapped)})</th>`;
    }).join('');
    const plateBody = data.design.plate.map((row, rowIndex) => `
        <tr>
            <th>${String.fromCharCode(65 + rowIndex)} (${escapeHtml((data.design.rowLabels && data.design.rowLabels[rowIndex]) ? data.design.rowLabels[rowIndex].split(' | ')[1] : '-')})</th>
            ${row.map(cell => `<td>${cell ? '●' : '-'}</td>`).join('')}
        </tr>
    `).join('');

    const tube1Rows = data.tube1Plans.map(plan => `
        <tr>
            <td>${escapeHtml(plan.name)}</td>
            <td>${escapeHtml(`${plan.baseWells} + ${data.extraWells}`)}</td>
            <td>${escapeHtml(formatQpcr(plan.sybr))}</td>
            <td>${escapeHtml(formatQpcr(plan.water))}</td>
            <td>${escapeHtml(formatQpcr(plan.primerF))}</td>
            <td>${escapeHtml(formatQpcr(plan.primerR))}</td>
            <td>${escapeHtml(formatQpcr(plan.totalVol))}</td>
        </tr>
    `).join('');

    const tube2Rows = data.tube2Plans.map(plan => `
        <tr>
            <td>${escapeHtml(plan.name)}</td>
            <td>${escapeHtml(`${plan.baseWells} + ${data.extraWells}`)}</td>
            <td>${escapeHtml(formatQpcr(plan.cdna))}</td>
            <td>${escapeHtml(formatQpcr(plan.water))}</td>
            <td>${escapeHtml(formatQpcr(plan.totalVol))}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>qPCR 打印记录</title>
<style>
body { font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif; color: #0f172a; margin: 20px; }
h1, h2 { margin: 0 0 10px; }
h1 { font-size: 20px; }
h2 { margin-top: 18px; font-size: 16px; }
p { margin: 4px 0; }
table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 12px; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; white-space: nowrap; }
th { background: #f8fafc; }
.rt th:first-child, .rt td:first-child { background: #f8fafc; font-weight: 600; }
.muted { color: #475569; }
@media print { body { margin: 10mm; } h2 { page-break-after: avoid; } }
</style>
</head>
<body>
<h1>qPCR 实验打印记录</h1>
<p>日期：${escapeHtml(new Date().toLocaleString('zh-CN'))}</p>
<p>分组：${escapeHtml(data.cleanGroups.map(g => g.name).join('、'))}</p>
<p>基因：${escapeHtml(data.cleanGenes.map(g => g.name).join('、'))}</p>
<p>总反应孔：${escapeHtml(`${data.reactionCount}`)}（每组/基因 ${escapeHtml(`${data.replicates}`)} 平行）</p>

<h2>1. 逆转录体系配置（20 µL/样品）</h2>
<table class="rt">
<thead><tr><th>组分</th>${rtHead}</tr></thead>
<tbody>
${rtRow('RNA 浓度 (ng/µL)', p => formatQpcr(p.rnaConc))}
${rtRow('目标 RNA (ng)', p => formatQpcr(p.targetRnaNg))}
${rtRow('RNA 体积 (µL)', p => formatQpcr(p.rnaVol))}
${rtRow('gDNA Mix (µL)', p => formatQpcr(p.gdnaMix))}
${rtRow('5X Evo Reaction Mix (µL)', p => formatQpcr(p.evoMix))}
${rtRow('无酶水 (µL)', p => formatQpcr(p.water))}
${rtRow('总量 (µL)', () => '20.00')}
${rtRow('cDNA 稀释加无酶水 (µL)', () => formatQpcr(dilutionWaterFor20ul))}
</tbody>
</table>
<p class="muted">建议稀释比例：${data.dilutionRatio >= 1 ? `1:${escapeHtml(formatQpcr(data.dilutionRatio))}` : `浓度不足（比值 ${escapeHtml(formatQpcr(data.dilutionRatio))}）`}</p>

<h2>2. qPCR 上板体系 A（引物预混管）</h2>
<table>
<thead><tr><th>名称</th><th>孔数(基础+富余)</th><th>SYBR</th><th>无酶水</th><th>Primer F</th><th>Primer R</th><th>总量</th></tr></thead>
<tbody>${tube1Rows}</tbody>
</table>

<h2>3. qPCR 上板体系 B（cDNA 样品管）</h2>
<table>
<thead><tr><th>名称</th><th>孔数(基础+富余)</th><th>cDNA</th><th>无酶水</th><th>总量</th></tr></thead>
<tbody>${tube2Rows}</tbody>
</table>

<h2>4. 96 孔板排布示意</h2>
<table>
<thead><tr><th></th>${plateHead}</tr></thead>
<tbody>${plateBody}</tbody>
</table>
</body>
</html>`;
}
