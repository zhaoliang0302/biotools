// 默认配置数据
const PRESETS = {
    '6well': {
        name: '六孔板 (6-well)',
        optiA: 125, lipo: 7.5, optiB: 125, sirna: 5, plasmid: 2.5, p3000: 5
    },
    '12well': {
        name: '12孔板 (12-well)',
        optiA: 50, lipo: 3, optiB: 50, sirna: 2.5, plasmid: 1, p3000: 2
    },
    '60mm': {
        name: '60mm 培养皿',
        optiA: 250, lipo: 17, optiB: 250, sirna: 10, plasmid: 6, p3000: 12
    }
};

const LIPO_MODE_LABELS = {
    sirna: {
        experiment: 'siRNA 转染',
        payload: 'siRNA',
        payloadLower: 'siRNA',
        tubeB: 'siRNA 稀释液',
        componentTitle: 'siRNA 组分',
        addText: 'siRNA',
        placeholder: 'siRNA名称',
        defaultPrefix: 'siRNA',
        configApp: 'biotools-lipo3000',
        filePrefix: 'lipo3000'
    },
    plasmid: {
        experiment: '质粒转染',
        payload: '质粒',
        payloadLower: '质粒',
        tubeB: '质粒稀释液',
        componentTitle: '质粒组分',
        addText: '质粒',
        placeholder: '质粒名称',
        defaultPrefix: 'OE',
        configApp: 'biotools-lipo3000-plasmid',
        filePrefix: 'lipo3000-plasmid'
    }
};

const TIC_PRESETS = {
    '6well': { name: '六孔板', volPerWell: 2 },
    '12well': { name: '12孔板', volPerWell: 1 }
};

let groups = [
    { id: 1, name: 'siNC', wells: 1, optiB: 125, sirnas: [{ id: 11, name: 'siNC', volume: 5 }] },
    { id: 1002, name: 'siRNA-1', wells: 3, optiB: 125, sirnas: [{ id: 10021, name: 'siRNA-1', volume: 5 }] }
];

let qpcrGroups = [
    { id: 1, name: 'Control', rnaConc: 120 },
    { id: 2, name: 'Treatment', rnaConc: 95 }
];

let qpcrGenes = [
    { id: 1, name: 'GAPDH' },
    { id: 2, name: 'GeneX' }
];

const QPCR_GENE_COLORS = [
    { background: '#e0f2fe', text: '#075985', border: '#7dd3fc' },
    { background: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    { background: '#dcfce7', text: '#166534', border: '#86efac' },
    { background: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
    { background: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    { background: '#cffafe', text: '#155e75', border: '#67e8f9' },
    { background: '#ffedd5', text: '#9a3412', border: '#fdba74' },
    { background: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
    { background: '#ecfccb', text: '#3f6212', border: '#bef264' },
    { background: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' }
];

let lastQpcrData = null;
let lastLipoPlan = null;
let lastTicData = null;

let ticGroups = [
    { id: 1, name: 'TIC 1X', wells: 6, factor: 1 },
    { id: 2, name: 'TIC 1/2', wells: 0, factor: 0.5 }
];

document.addEventListener('DOMContentLoaded', () => {
    loadPreset();
    loadTicPreset();
    renderGroups();
    renderTicGroups();
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
    const mode = getLipoMode();
    const type = document.getElementById('plateType').value;
    const previousOptiB = parseFloat(document.getElementById('volOptiB').value);
    const previousPayload = parseFloat(document.getElementById('volSiRNA').value);
    const previousP3000 = parseFloat(document.getElementById('volP3000').value);
    const p = PRESETS[type];
    const payloadDefault = getLipoPayloadDefault(p, mode);
    const p3000Default = mode === 'plasmid' ? p.p3000 : 0;
    updateLipoModeLabels(mode);
    document.getElementById('volOptiA').value = p.optiA;
    document.getElementById('volLipo').value = p.lipo;
    document.getElementById('volOptiB').value = p.optiB;
    document.getElementById('volSiRNA').value = payloadDefault;
    document.getElementById('volP3000').value = p3000Default;
    groups.forEach(group => {
        ensureGroupBConfig(group);
        if (!Number.isFinite(previousOptiB) || group.optiB === previousOptiB) {
            group.optiB = p.optiB;
        }
        group.sirnas.forEach(sirna => {
            if (!Number.isFinite(previousPayload) || sirna.volume === previousPayload) {
                sirna.volume = payloadDefault;
            }
        });
        if (!Number.isFinite(previousP3000) || group.p3000 === previousP3000) {
            group.p3000 = p3000Default;
        }
    });
    renderGroups();
}

function switchLipoMode() {
    const mode = getLipoMode();
    groups = createDefaultLipoGroups(mode);
    loadPreset();
    clearLipoResult();
}

function getLipoMode() {
    const modeEl = document.getElementById('transfectionMode');
    return modeEl && modeEl.value === 'plasmid' ? 'plasmid' : 'sirna';
}

function getLipoLabels(mode = getLipoMode()) {
    return LIPO_MODE_LABELS[mode] || LIPO_MODE_LABELS.sirna;
}

function getLipoPayloadDefault(preset, mode = getLipoMode()) {
    return mode === 'plasmid' ? preset.plasmid : preset.sirna;
}

function updateLipoModeLabels(mode = getLipoMode()) {
    const labels = getLipoLabels(mode);
    const tubeBTitle = document.getElementById('tubeBTitle');
    const payloadDefaultLabel = document.getElementById('payloadDefaultLabel');
    const p3000Block = document.getElementById('p3000DefaultBlock');
    if (tubeBTitle) tubeBTitle.textContent = labels.tubeB;
    if (payloadDefaultLabel) payloadDefaultLabel.textContent = labels.payload;
    if (p3000Block) p3000Block.style.display = mode === 'plasmid' ? 'block' : 'none';
}

function createDefaultLipoGroups(mode = getLipoMode()) {
    const plateType = document.getElementById('plateType') ? document.getElementById('plateType').value : '6well';
    const preset = PRESETS[plateType] || PRESETS['6well'];
    const payloadDefault = getLipoPayloadDefault(preset, mode);
    const p3000Default = mode === 'plasmid' ? preset.p3000 : 0;
    const definitions = mode === 'plasmid'
        ? [{ name: 'OE-NC', wells: 1 }, { name: 'OE-1', wells: 3 }]
        : [{ name: 'siNC', wells: 1 }, { name: 'siRNA-1', wells: 3 }];
    const idBase = Date.now();
    return definitions.map((item, index) => ({
        id: idBase + index,
        name: item.name,
        wells: item.wells,
        optiB: preset.optiB,
        p3000: p3000Default,
        sirnas: [{ id: idBase + index * 10 + 1, name: item.name, volume: payloadDefault }]
    }));
}

function clearLipoResult() {
    lastLipoPlan = null;
    const placeholder = document.getElementById('resultPlaceholder');
    const content = document.getElementById('resultContent');
    if (placeholder) placeholder.style.display = 'block';
    if (content) content.style.display = 'none';
    const printArea = document.getElementById('printArea');
    if (printArea) printArea.innerHTML = '';
}

function renderGroups() {
    const mode = getLipoMode();
    const labels = getLipoLabels(mode);
    const list = document.getElementById('groupsList');
    list.innerHTML = '';
    
    groups.forEach((group, index) => {
        ensureGroupBConfig(group);
        const div = document.createElement('div');
        div.className = 'group-item';
        const sirnaRows = group.sirnas.map((sirna, sirnaIndex) => `
            <div class="sirna-row">
                <input type="text" placeholder="${labels.placeholder}" value="${escapeHtml(sirna.name)}" onchange="updateGroupSirna(${index}, ${sirnaIndex}, 'name', this.value)">
                <div class="input-with-unit" style="margin-bottom:0;">
                    <input type="number" placeholder="单孔量" value="${sirna.volume}" min="0" step="0.1" onchange="updateGroupSirna(${index}, ${sirnaIndex}, 'volume', this.value)">
                    <span style="font-size:0.75rem;">µL/孔</span>
                </div>
                <button class="btn-icon" onclick="removeGroupSirna(${index}, ${sirnaIndex})" title="删除${labels.payload}"><i class="fas fa-minus"></i></button>
            </div>
        `).join('');
        const p3000Row = mode === 'plasmid' ? `
            <label class="input-label-small">P3000 单孔量</label>
            <div class="input-with-unit">
                <input type="number" value="${group.p3000}" min="0" step="0.1" onchange="updateGroup(${index}, 'p3000', this.value)">
                <span>µL/孔</span>
            </div>
        ` : '';
        div.innerHTML = `
            <div class="group-main-row">
                <input type="text" placeholder="分组名称" value="${escapeHtml(group.name)}" onchange="updateGroup(${index}, 'name', this.value)">
                <div class="input-with-unit" style="margin-bottom:0;">
                    <input type="number" placeholder="孔数" value="${group.wells}" min="0" step="1" onchange="updateGroup(${index}, 'wells', this.value)">
                    <span style="font-size:0.75rem;">孔</span>
                </div>
                <div class="group-actions">
                    <button class="btn-icon" onclick="duplicateGroup(${index})" title="复制分组"><i class="far fa-copy"></i></button>
                    <button class="btn-icon" onclick="removeGroup(${index})" title="删除分组"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            <div class="group-b-config">
                <div class="group-b-title">
                    <span><span class="tag tag-b">B 管</span> ${escapeHtml(group.name || `分组${index + 1}`)}</span>
                    <button class="btn-inline" onclick="addGroupSirna(${index})"><i class="fas fa-plus"></i> ${labels.addText}</button>
                </div>
                <label class="input-label-small">B 管 Opti-MEM 单孔量</label>
                <div class="input-with-unit">
                    <input type="number" value="${group.optiB}" min="0" step="1" onchange="updateGroup(${index}, 'optiB', this.value)">
                    <span>µL/孔</span>
                </div>
                ${p3000Row}
                <label class="input-label-small">${labels.componentTitle}</label>
                <div class="sirna-list">${sirnaRows}</div>
            </div>
        `;
        list.appendChild(div);
    });
}

function addGroup() {
    const nextIndex = getNextSiRnaIndex();
    const labels = getLipoLabels();
    const name = getLipoMode() === 'plasmid' && nextIndex === 0 ? 'OE-NC' : `${labels.defaultPrefix}-${nextIndex}`;
    groups.push(createGroup(name, 1));
    renderGroups();
}

function duplicateGroup(index) {
    const source = groups[index];
    if (!source) return;
    ensureGroupBConfig(source);
    const nextName = getDuplicatedGroupName(source.name);
    const idBase = Date.now();
    const duplicatedSirnas = source.sirnas.map((item, itemIndex) => ({
        id: idBase + itemIndex + 1,
        name: item.name === source.name ? nextName : item.name,
        volume: parseFloat(item.volume) || 0
    }));
    groups.splice(index + 1, 0, {
        id: idBase,
        name: nextName,
        wells: parseFloat(source.wells) || 0,
        optiB: parseFloat(source.optiB) || 0,
        p3000: parseFloat(source.p3000) || 0,
        sirnas: duplicatedSirnas.length ? duplicatedSirnas : [{ id: idBase + 1, name: nextName, volume: parseFloat(document.getElementById('volSiRNA').value) || 0 }]
    });
    clearLipoResult();
    renderGroups();
}

function getDuplicatedGroupName(name) {
    const currentName = String(name || getLipoLabels().defaultPrefix);
    const existingNames = new Set(groups.map(group => String(group.name)));
    const numericMatch = currentName.match(/^(.*?)(\d+)$/);
    if (numericMatch) {
        const prefix = numericMatch[1];
        let maxNumber = 0;
        const prefixPattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);
        existingNames.forEach(item => {
            const match = item.match(prefixPattern);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!Number.isNaN(num)) maxNumber = Math.max(maxNumber, num);
            }
        });
        let candidate = `${prefix}${maxNumber + 1}`;
        while (existingNames.has(candidate)) {
            maxNumber += 1;
            candidate = `${prefix}${maxNumber + 1}`;
        }
        return candidate;
    }
    let copyIndex = 1;
    let candidate = `${currentName}-副本`;
    while (existingNames.has(candidate)) {
        copyIndex += 1;
        candidate = `${currentName}-副本${copyIndex}`;
    }
    return candidate;
}

function createGroup(name, wells) {
    const mode = getLipoMode();
    const defaultOptiB = parseFloat(document.getElementById('volOptiB').value) || PRESETS['6well'].optiB;
    const defaultSirna = parseFloat(document.getElementById('volSiRNA').value) || getLipoPayloadDefault(PRESETS['6well'], mode);
    const defaultP3000 = mode === 'plasmid' ? (parseFloat(document.getElementById('volP3000').value) || PRESETS['6well'].p3000) : 0;
    const id = Date.now();
    return {
        id,
        name,
        wells,
        optiB: defaultOptiB,
        p3000: defaultP3000,
        sirnas: [{ id: id + 1, name, volume: defaultSirna }]
    };
}

function ensureGroupBConfig(group) {
    const mode = getLipoMode();
    if (typeof group.optiB !== 'number') {
        group.optiB = parseFloat(document.getElementById('volOptiB').value) || PRESETS['6well'].optiB;
    }
    if (typeof group.p3000 !== 'number') {
        group.p3000 = mode === 'plasmid' ? (parseFloat(document.getElementById('volP3000').value) || PRESETS['6well'].p3000) : 0;
    }
    if (!Array.isArray(group.sirnas) || group.sirnas.length === 0) {
        const labels = getLipoLabels(mode);
        const defaultSirna = parseFloat(document.getElementById('volSiRNA').value) || getLipoPayloadDefault(PRESETS['6well'], mode);
        group.sirnas = [{ id: Date.now(), name: group.name || labels.payload, volume: defaultSirna }];
    }
}

function getNextSiRnaIndex() {
    if (getLipoMode() === 'plasmid') {
        let maxIndex = 0;
        let hasNc = false;
        groups.forEach(group => {
            if (String(group.name).toUpperCase() === 'OE-NC') hasNc = true;
            const match = String(group.name).match(/^OE[- ]?(\d+)$/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!Number.isNaN(num)) maxIndex = Math.max(maxIndex, num);
            }
        });
        return hasNc ? maxIndex + 1 : 0;
    }
    const labels = getLipoLabels();
    const escapedPrefix = labels.defaultPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const specificPattern = new RegExp(`${escapedPrefix}[- ]?(\\d+)`, 'i');
    let maxIndex = 0;
    groups.forEach(group => {
        const match = String(group.name).match(specificPattern);
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
    if (field === 'wells' || field === 'optiB' || field === 'p3000') {
        value = parseFloat(value);
        if (value < 0) value = 0;
    }
    groups[index][field] = value;
}

function addGroupSirna(groupIndex) {
    const group = groups[groupIndex];
    ensureGroupBConfig(group);
    const nextNumber = group.sirnas.length + 1;
    const labels = getLipoLabels();
    const defaultSirna = parseFloat(document.getElementById('volSiRNA').value) || getLipoPayloadDefault(PRESETS['6well']);
    group.sirnas.push({
        id: Date.now(),
        name: `${labels.defaultPrefix}-${nextNumber}`,
        volume: defaultSirna
    });
    renderGroups();
}

function updateGroupSirna(groupIndex, sirnaIndex, field, value) {
    const group = groups[groupIndex];
    ensureGroupBConfig(group);
    if (field === 'volume') {
        value = parseFloat(value);
        if (!Number.isFinite(value) || value < 0) value = 0;
    }
    group.sirnas[sirnaIndex][field] = value;
}

function removeGroupSirna(groupIndex, sirnaIndex) {
    const group = groups[groupIndex];
    ensureGroupBConfig(group);
    if (group.sirnas.length <= 1) {
        alert(`每个 B 管至少保留一个${getLipoLabels().payload}组分。`);
        return;
    }
    group.sirnas.splice(sirnaIndex, 1);
    renderGroups();
}

function calculate() {
    // 1. Get Settings
    const mode = getLipoMode();
    const labels = getLipoLabels(mode);
    const settings = {
        mode,
        labels,
        name: document.getElementById('plateType').options[document.getElementById('plateType').selectedIndex].text,
        optiA: parseFloat(document.getElementById('volOptiA').value) || 0,
        lipo: parseFloat(document.getElementById('volLipo').value) || 0,
        optiB: parseFloat(document.getElementById('volOptiB').value) || 0,
        sirna: parseFloat(document.getElementById('volSiRNA').value) || 0,
        p3000: mode === 'plasmid' ? (parseFloat(document.getElementById('volP3000').value) || 0) : 0
    };

    const groupExtra = parseFloat(document.getElementById('groupExtraWells').value) || 0;
    const tubeAExtra = parseFloat(document.getElementById('extraWells').value) || 0;

    // 2. Logic
    let totalWellsForTubeA = 0;
    const groupResults = groups.map(group => {
        ensureGroupBConfig(group);
        const calcWells = group.wells + groupExtra; 
        totalWellsForTubeA += calcWells;
        const sirnas = group.sirnas.map(sirna => ({
            ...sirna,
            volume: parseFloat(sirna.volume) || 0,
            total: calcWells * (parseFloat(sirna.volume) || 0)
        }));
        const totalSirnaPerWell = sirnas.reduce((sum, sirna) => sum + sirna.volume, 0);
        const p3000PerWell = settings.mode === 'plasmid' ? (parseFloat(group.p3000) || 0) : 0;
        
        return {
            ...group,
            calcWells: calcWells,
            optiBPerWell: parseFloat(group.optiB) || 0,
            optiB: calcWells * (parseFloat(group.optiB) || 0),
            p3000PerWell,
            p3000: calcWells * p3000PerWell,
            sirnas,
            totalSirnaPerWell,
            totalSirna: calcWells * totalSirnaPerWell
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
    lastLipoPlan = { settings, tubeA, groupResults, groupExtra, tubeAExtra };
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
        const p3000Row = settings.mode === 'plasmid' ? `
                    <tr>
                        <td>P3000 <span style="color:var(--text-muted);">(${formatNum(group.p3000PerWell)} µL/孔)</span></td>
                        <td class="val-highlight">${formatNum(group.p3000)} µL</td>
                    </tr>
        ` : '';
        tubeBHtml += `
            <div class="group-card">
                <div class="group-card-header">
                    <span>${escapeHtml(group.name)}</span>
                    <span style="font-weight:400; font-size:0.9em; color:var(--text-muted);">${group.wells}孔 (配${formatNum(group.calcWells)})</span>
                </div>
                <table class="data-table" style="font-size:0.85rem;">
                    <tr>
                        <td width="50%">Opti-MEM</td>
                        <td class="val-highlight">${formatNum(group.optiB)} µL</td>
                    </tr>
                    ${p3000Row}
                    ${group.sirnas.map(sirna => `
                        <tr>
                            <td>${escapeHtml(sirna.name || settings.labels.payload)} <span style="color:var(--text-muted);">(${formatNum(sirna.volume)} µL/孔)</span></td>
                            <td class="val-highlight">${formatNum(sirna.total)} µL</td>
                        </tr>
                    `).join('')}
                    <tr style="color:var(--primary);">
                        <td>加入 A 管混合液</td>
                        <td class="val-highlight">${formatNum(volFromA)} µL</td>
                    </tr>
                    <tr style="background-color: #f8fafc; font-weight:600;">
                        <td>每孔转染复合物</td>
                        <td>${formatNum((settings.optiA + settings.lipo) + group.optiBPerWell + group.p3000PerWell + group.totalSirnaPerWell)} µL</td>
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
    let text = `实验：${settings.labels.experiment} | ${date}\n`;
    text += `体系：${settings.name}\n\n`;
    text += `[1. A 管混合液]\n`;
    text += `  - Opti-MEM：     ${formatNum(tubeA.optiA)} µL\n`;
    text += `  - Lipo3000：     ${formatNum(tubeA.lipo)} µL\n`;
    text += `  - 总体积：       ${formatNum(tubeA.totalVol)} µL（轻轻混匀）\n\n`;

    text += `[2. 各组 B 管配制]\n`;
    groupResults.forEach(g => {
        text += `  > 分组：${g.name}\n`;
        text += `    - Opti-MEM：  ${formatNum(g.optiB)} µL\n`;
        if (settings.mode === 'plasmid') {
            text += `    - P3000：     ${formatNum(g.p3000)} µL（${formatNum(g.p3000PerWell)} µL/孔）\n`;
        }
        g.sirnas.forEach(sirna => {
            text += `    - ${sirna.name || settings.labels.payload}： ${formatNum(sirna.total)} µL（${formatNum(sirna.volume)} µL/孔）\n`;
        });
        const volFromA = g.calcWells * (settings.optiA + settings.lipo);
        text += `    - 加入 A 管： ${formatNum(volFromA)} µL\n`;
        text += `    - 每孔转染复合物：${formatNum((settings.optiA + settings.lipo) + g.optiBPerWell + g.p3000PerWell + g.totalSirnaPerWell)} µL\n`;
        text += `    - 轻轻混匀，室温静置 10-15 分钟\n\n`;
    });
    
    text += `[3. 加入细胞]\n`;
    text += `  - 按各组 B 管设置加入对应转染复合物，体积见上方各组记录。\n`;

    document.getElementById('protocolText').innerText = text;
}

function formatNum(num) {
    return parseFloat(num.toFixed(1));
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

function collectLipoConfig() {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }
    groups.forEach(ensureGroupBConfig);
    const mode = getLipoMode();
    const labels = getLipoLabels(mode);
    return {
        app: labels.configApp,
        version: 1,
        exportedAt: new Date().toISOString(),
        module: 'lipo3000',
        transfectionMode: mode,
        plateType: document.getElementById('plateType').value,
        defaults: {
            optiA: parseFloat(document.getElementById('volOptiA').value) || 0,
            lipo: parseFloat(document.getElementById('volLipo').value) || 0,
            optiB: parseFloat(document.getElementById('volOptiB').value) || 0,
            sirna: parseFloat(document.getElementById('volSiRNA').value) || 0,
            payload: parseFloat(document.getElementById('volSiRNA').value) || 0,
            p3000: mode === 'plasmid' ? (parseFloat(document.getElementById('volP3000').value) || 0) : 0
        },
        extra: {
            groupExtraWells: parseFloat(document.getElementById('groupExtraWells').value) || 0,
            tubeAExtraWells: parseFloat(document.getElementById('extraWells').value) || 0
        },
        groups: groups.map(group => ({
            id: group.id,
            name: group.name,
            wells: parseFloat(group.wells) || 0,
            optiB: parseFloat(group.optiB) || 0,
            p3000: mode === 'plasmid' ? (parseFloat(group.p3000) || 0) : 0,
            sirnas: group.sirnas.map(sirna => ({
                id: sirna.id,
                name: sirna.name,
                volume: parseFloat(sirna.volume) || 0
            }))
        }))
    };
}

function exportLipoConfig() {
    const config = collectLipoConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${getLipoLabels(config.transfectionMode).filePrefix}-config-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function triggerImportLipoConfig() {
    document.getElementById('lipoConfigFile').click();
}

function importLipoConfig(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const config = JSON.parse(reader.result);
            applyLipoConfig(config);
            calculate();
        } catch (error) {
            alert('配置文件无法读取，请确认导入的是本工具导出的 JSON 文件。');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function applyLipoConfig(config) {
    if (!config || config.module !== 'lipo3000' || !config.defaults || !Array.isArray(config.groups)) {
        throw new Error('Invalid lipo config');
    }
    const mode = config.transfectionMode === 'plasmid' ? 'plasmid' : 'sirna';
    document.getElementById('transfectionMode').value = mode;
    const plateType = PRESETS[config.plateType] ? config.plateType : '6well';
    document.getElementById('plateType').value = plateType;
    updateLipoModeLabels(mode);
    const payloadFallback = getLipoPayloadDefault(PRESETS[plateType], mode);
    document.getElementById('volOptiA').value = parseNumber(config.defaults.optiA, PRESETS[plateType].optiA);
    document.getElementById('volLipo').value = parseNumber(config.defaults.lipo, PRESETS[plateType].lipo);
    document.getElementById('volOptiB').value = parseNumber(config.defaults.optiB, PRESETS[plateType].optiB);
    document.getElementById('volSiRNA').value = parseNumber(config.defaults.payload ?? config.defaults.sirna, payloadFallback);
    document.getElementById('volP3000').value = mode === 'plasmid' ? parseNumber(config.defaults.p3000, PRESETS[plateType].p3000) : 0;
    document.getElementById('groupExtraWells').value = parseNumber(config.extra && config.extra.groupExtraWells, 0.4);
    document.getElementById('extraWells').value = parseNumber(config.extra && config.extra.tubeAExtraWells, 0.8);

    groups = config.groups.map((group, index) => {
        const name = String(group.name || `Group-${index + 1}`);
        const labels = getLipoLabels(mode);
        const id = Number.isFinite(parseFloat(group.id)) ? parseFloat(group.id) : Date.now() + index;
        const sirnas = Array.isArray(group.sirnas) && group.sirnas.length > 0
            ? group.sirnas.map((sirna, sirnaIndex) => ({
                id: Number.isFinite(parseFloat(sirna.id)) ? parseFloat(sirna.id) : Date.now() + index * 100 + sirnaIndex,
                name: String(sirna.name || `${labels.defaultPrefix}-${sirnaIndex + 1}`),
                volume: parseNumber(sirna.volume, parseNumber(config.defaults.payload ?? config.defaults.sirna, payloadFallback))
            }))
            : [{ id: Date.now() + index, name, volume: parseNumber(config.defaults.payload ?? config.defaults.sirna, payloadFallback) }];
        return {
            id,
            name,
            wells: parseNumber(group.wells, 1),
            optiB: parseNumber(group.optiB, parseNumber(config.defaults.optiB, PRESETS[plateType].optiB)),
            p3000: mode === 'plasmid' ? parseNumber(group.p3000, parseNumber(config.defaults.p3000, PRESETS[plateType].p3000)) : 0,
            sirnas
        };
    });
    if (groups.length === 0) {
        groups = [createGroup(`${getLipoLabels(mode).defaultPrefix}-1`, 1)];
    }
    renderGroups();
}

function exportLipoPrintPdf() {
    if (!lastLipoPlan) {
        calculate();
    }
    if (!lastLipoPlan) return;
    renderLipoPrintArea(lastLipoPlan);
    window.print();
}

function renderLipoPrintArea(plan) {
    const tubeARows = `
        <tr><td>Opti-MEM</td><td>${formatNum(plan.tubeA.optiA)} µL</td></tr>
        <tr><td>Lipo3000</td><td>${formatNum(plan.tubeA.lipo)} µL</td></tr>
        <tr><td>合计</td><td>${formatNum(plan.tubeA.totalVol)} µL</td></tr>
    `;
    const groupCards = plan.groupResults.map(group => {
        const volFromA = group.calcWells * (plan.settings.optiA + plan.settings.lipo);
        const finalPerWell = (plan.settings.optiA + plan.settings.lipo) + group.optiBPerWell + group.p3000PerWell + group.totalSirnaPerWell;
        const p3000Line = plan.settings.mode === 'plasmid'
            ? `<tr><td>P3000</td><td>${formatNum(group.p3000)} µL</td></tr>`
            : '';
        const sirnaLines = group.sirnas.map(sirna => `
            <tr><td>${escapeHtml(sirna.name || plan.settings.labels.payload)}</td><td>${formatNum(sirna.total)} µL</td></tr>
        `).join('');
        return `
            <section class="print-group">
                <h3>${escapeHtml(group.name)} <span>${group.wells}孔，配 ${formatNum(group.calcWells)} 孔</span></h3>
                <table>
                    <tbody>
                        <tr><td>Opti-MEM</td><td>${formatNum(group.optiB)} µL</td></tr>
                        ${p3000Line}
                        ${sirnaLines}
                        <tr><td>加入 A 管混合液</td><td>${formatNum(volFromA)} µL</td></tr>
                        <tr><td>每孔加入转染复合物</td><td>${formatNum(finalPerWell)} µL</td></tr>
                    </tbody>
                </table>
            </section>
        `;
    }).join('');

    document.getElementById('printArea').innerHTML = `
        <div class="print-sheet">
            <section class="print-block">
                <h2>1. A 管共用混合液</h2>
                <table><thead><tr><th>成分</th><th>最终配制量</th></tr></thead><tbody>${tubeARows}</tbody></table>
            </section>
            <section class="print-block">
                <h2>2. 各组 B 管</h2>
                <div class="print-group-grid">${groupCards}</div>
            </section>
            <section class="print-note">
                A 管与各 B 管按上表混合，轻轻混匀，室温静置 10-15 分钟后加入细胞。不同组按对应 B 管体积执行。
            </section>
        </div>
    `;
}

function parseNumber(value, fallback) {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
}

function loadTicPreset() {
    const type = document.getElementById('ticPlateType').value;
    const preset = TIC_PRESETS[type] || TIC_PRESETS['6well'];
    document.getElementById('ticVolPerWell').value = preset.volPerWell;
}

function renderTicGroups() {
    const list = document.getElementById('ticGroupsList');
    if (!list) return;
    list.innerHTML = '';
    ticGroups.forEach((group, index) => {
        const div = document.createElement('div');
        div.className = 'group-item';
        div.innerHTML = `
            <div class="group-main-row tic-group-row">
                <input type="text" placeholder="处理组名称" value="${escapeHtml(group.name)}" onchange="updateTicGroup(${index}, 'name', this.value)">
                <div class="input-with-unit" style="margin-bottom:0;">
                    <input type="number" placeholder="孔数" value="${group.wells}" min="0" step="1" oninput="updateTicGroup(${index}, 'wells', this.value)" onchange="updateTicGroup(${index}, 'wells', this.value)">
                    <span style="font-size:0.75rem;">孔</span>
                </div>
                <div class="input-with-unit" style="margin-bottom:0;">
                    <input type="number" placeholder="TIC倍数" value="${group.factor}" min="0" max="1" step="0.01" oninput="updateTicGroup(${index}, 'factor', this.value)" onchange="updateTicGroup(${index}, 'factor', this.value)">
                    <span style="font-size:0.75rem;">x</span>
                </div>
                <button class="btn-icon" onclick="removeTicGroup(${index})" title="删除处理组"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

function updateTicGroup(index, field, value) {
    if (!ticGroups[index]) return;
    if (field === 'wells' || field === 'factor') {
        ticGroups[index][field] = parseFloat(value) || 0;
    } else {
        ticGroups[index][field] = value;
    }
}

function addTicGroup() {
    const id = Date.now();
    ticGroups.push({ id, name: `TIC 1/${ticGroups.length + 1}`, wells: 1, factor: 0.5 });
    renderTicGroups();
}

function syncTicGroupsFromDom() {
    const items = document.querySelectorAll('#ticGroupsList .group-item');
    if (!items.length) return;
    ticGroups = Array.from(items).map((item, index) => {
        const nameInput = item.querySelector('input[placeholder="处理组名称"]');
        const wellsInput = item.querySelector('input[placeholder="孔数"]');
        const factorInput = item.querySelector('input[placeholder="TIC倍数"]');
        const existing = ticGroups[index] || {};
        return {
            id: existing.id || Date.now() + index,
            name: nameInput ? nameInput.value : (existing.name || `TIC-${index + 1}`),
            wells: wellsInput ? parseFloat(wellsInput.value) || 0 : parseFloat(existing.wells) || 0,
            factor: factorInput ? parseFloat(factorInput.value) || 0 : parseFloat(existing.factor) || 0
        };
    });
}

function removeTicGroup(index) {
    if (ticGroups.length <= 1) {
        alert('至少保留一个处理组。');
        return;
    }
    ticGroups.splice(index, 1);
    renderTicGroups();
}

function calculateTic() {
    syncTicGroupsFromDom();
    const extraWells = parseFloat(document.getElementById('ticExtraWells').value) || 0;
    const mixExtraWells = parseFloat(document.getElementById('ticMixExtraWells').value) || 0;
    const volPerWell = parseFloat(document.getElementById('ticVolPerWell').value) || 0;

    const tnfStock = parseFloat(document.getElementById('ticTnfStock').value) || 0;
    const il1Stock = parseFloat(document.getElementById('ticIl1Stock').value) || 0;
    const c1qStockMg = parseFloat(document.getElementById('ticC1qStock').value) || 0;

    const tnfWork = parseFloat(document.getElementById('ticTnfWork').value) || 0;
    const il1Work = parseFloat(document.getElementById('ticIl1Work').value) || 0;
    const c1qWork = parseFloat(document.getElementById('ticC1qWork').value) || 0;

    const cleanGroups = ticGroups
        .map((group, index) => ({
            id: group.id || Date.now() + index,
            name: String(group.name || `TIC-${index + 1}`),
            wells: parseFloat(group.wells) || 0,
            factor: parseFloat(group.factor) || 0
        }))
        .filter(group => group.wells > 0);

    if (cleanGroups.length === 0 || volPerWell <= 0) {
        alert('请输入有效的处理组孔数和每孔体积。');
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
    if (cleanGroups.some(group => group.factor < 0 || group.factor > 1)) {
        alert('TIC 倍数请输入 0 到 1 之间的数值，例如 1、0.5、0.333。');
        return;
    }

    const groupPlans = cleanGroups.map(group => {
        const calcWells = group.wells + extraWells;
        const totalVolMl = calcWells * volPerWell;
        return {
            ...group,
            calcWells,
            totalVolMl,
            ticMixMl: totalVolMl * group.factor,
            dilutionMediumMl: totalVolMl * (1 - group.factor)
        };
    });
    const totalActualWells = cleanGroups.reduce((sum, group) => sum + group.wells, 0);
    const totalCalcWells = groupPlans.reduce((sum, group) => sum + group.calcWells, 0);
    const totalFinalVolMl = groupPlans.reduce((sum, group) => sum + group.totalVolMl, 0);
    const oneXNeededMl = groupPlans.reduce((sum, group) => sum + group.ticMixMl, 0);
    const oneXExtraMl = mixExtraWells * volPerWell;
    const oneXVolMl = oneXNeededMl + oneXExtraMl;
    if (oneXVolMl <= 0) {
        alert('至少需要一个处理组的 TIC 倍数大于 0。');
        return;
    }

    const c1qStockNg = c1qStockMg * 1000000;
    const tnfVolMl = (tnfWork / tnfStock) * oneXVolMl;
    const il1VolMl = (il1Work / il1Stock) * oneXVolMl;
    const c1qVolMl = (c1qWork / c1qStockNg) * oneXVolMl;
    let mediumVolMl = oneXVolMl - tnfVolMl - il1VolMl - c1qVolMl;
    if (mediumVolMl < -1e-6) {
        alert('工作浓度过高，培养基体积为负，请检查参数。');
        return;
    }
    if (mediumVolMl < 0) mediumVolMl = 0;

    const mix = {
        plateType: document.getElementById('ticPlateType').value,
        plateName: (TIC_PRESETS[document.getElementById('ticPlateType').value] || TIC_PRESETS['6well']).name,
        volPerWell,
        extraWells,
        mixExtraWells,
        totalActualWells,
        totalCalcWells,
        totalFinalVolMl,
        oneXNeededMl,
        oneXExtraMl,
        oneXVolMl,
        tnfVolMl,
        il1VolMl,
        c1qVolMl,
        mediumVolMl,
        dilutionMediumMl: groupPlans.reduce((sum, group) => sum + group.dilutionMediumMl, 0),
        groupPlans,
        concentrations: { tnfStock, il1Stock, c1qStockMg, tnfWork, il1Work, c1qWork }
    };

    renderTicResults(mix);
}

function renderTicResults(mix) {
    lastTicData = mix;
    document.getElementById('ticResultPlaceholder').style.display = 'none';
    document.getElementById('ticResultContent').style.display = 'block';

    document.getElementById('ticSummaryText').innerText =
        `${mix.plateName} | 实际 ${mix.totalActualWells} 孔，配 ${formatMl(mix.totalCalcWells)} 孔，最终体系 ${formatMl(mix.totalFinalVolMl)} mL`;

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

    const tubePlan = buildTubePlan(mix.oneXVolMl);
    document.getElementById('ticTubeSuggestion').innerHTML = tubePlan.summary;
    document.getElementById('ticPerTubeBody').innerHTML = buildTicGroupRows(mix);

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

function buildTicGroupRows(mix) {
    return mix.groupPlans.map(group => {
        return `
            <tr>
                <td>${escapeHtml(group.name)}</td>
                <td>${formatTicFactor(group.factor)}</td>
                <td>${formatMl(group.wells)} + ${formatMl(mix.extraWells)}</td>
                <td class="val-highlight">${formatVol(group.ticMixMl)}</td>
                <td>${formatVol(group.dilutionMediumMl)}</td>
                <td>${formatVol(group.totalVolMl)}</td>
            </tr>
        `;
    }).join('');
}

function generateTicProtocolText(mix, tubePlan) {
    const date = new Date().toLocaleDateString('zh-CN');
    let text = `实验：TIC 配制 | ${date}\n`;
    text += `规格：${mix.plateName}，每孔 ${formatMl(mix.volPerWell)} mL\n`;
    text += `实际孔数：${mix.totalActualWells}；配制孔数：${formatMl(mix.totalCalcWells)}（每组富余 +${formatMl(mix.extraWells)}）\n`;
    text += `最终培养体系：${formatMl(mix.totalFinalVolMl)} mL\n\n`;
    text += `[1X TIC 工作液]\n`;
    text += `  - 各组分装需要：${formatVol(mix.oneXNeededMl)}\n`;
    text += `  - 分装富余：${formatVol(mix.oneXExtraMl)}（+${formatMl(mix.mixExtraWells)}孔）\n`;
    text += `  - 实际配制 1X 工作液：${formatVol(mix.oneXVolMl)}\n`;
    text += `  - 培养基： ${formatVol(mix.mediumVolMl)}\n`;
    text += `  - TNF：   ${formatVol(mix.tnfVolMl)}\n`;
    text += `  - IL-1α： ${formatVol(mix.il1VolMl)}\n`;
    text += `  - C1q：   ${formatVol(mix.c1qVolMl)}\n`;
    text += `\n[管子建议]\n  - ${tubePlan.summary}\n`;
    text += `\n[各组稀释与加样]\n`;
    mix.groupPlans.forEach(group => {
        text += `  - ${group.name}（${formatTicFactor(group.factor)}，${formatMl(group.wells)}孔，配${formatMl(group.calcWells)}孔）：`;
        text += `1X TIC ${formatVol(group.ticMixMl)} + 培养基 ${formatVol(group.dilutionMediumMl)}；每孔加入 ${formatMl(mix.volPerWell)} mL\n`;
    });
    document.getElementById('ticProtocolText').innerText = text;
}

function formatTicFactor(factor) {
    if (Math.abs(factor - 1) < 0.001) return '1X';
    if (factor > 0) {
        const denominator = 1 / factor;
        if (Math.abs(denominator - Math.round(denominator)) < 0.02) {
            return `1/${Math.round(denominator)}X`;
        }
    }
    return `${formatMl(factor)}X`;
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

function collectTicConfig() {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }
    syncTicGroupsFromDom();
    return {
        app: 'biotools-tic',
        version: 1,
        exportedAt: new Date().toISOString(),
        module: 'tic',
        plateType: document.getElementById('ticPlateType').value,
        params: {
            volPerWell: parseFloat(document.getElementById('ticVolPerWell').value) || 0,
            extraWells: parseFloat(document.getElementById('ticExtraWells').value) || 0,
            mixExtraWells: parseFloat(document.getElementById('ticMixExtraWells').value) || 0,
            tnfStock: parseFloat(document.getElementById('ticTnfStock').value) || 0,
            il1Stock: parseFloat(document.getElementById('ticIl1Stock').value) || 0,
            c1qStockMg: parseFloat(document.getElementById('ticC1qStock').value) || 0,
            tnfWork: parseFloat(document.getElementById('ticTnfWork').value) || 0,
            il1Work: parseFloat(document.getElementById('ticIl1Work').value) || 0,
            c1qWork: parseFloat(document.getElementById('ticC1qWork').value) || 0
        },
        groups: ticGroups.map(group => ({
            id: group.id,
            name: group.name,
            wells: parseFloat(group.wells) || 0,
            factor: parseFloat(group.factor) || 0
        }))
    };
}

function exportTicConfig() {
    const config = collectTicConfig();
    downloadBlobFile(getTicExportFilename('config', 'json'), JSON.stringify(config, null, 2), 'application/json;charset=utf-8');
}

function triggerImportTicConfig() {
    document.getElementById('ticConfigFile').click();
}

function importTicConfig(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const config = JSON.parse(reader.result);
            applyTicConfig(config);
            calculateTic();
        } catch (error) {
            alert('配置文件无法读取，请确认导入的是本工具导出的 TIC JSON 文件。');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function applyTicConfig(config) {
    if (!config || config.module !== 'tic' || !config.params || !Array.isArray(config.groups)) {
        throw new Error('Invalid TIC config');
    }
    const plateType = TIC_PRESETS[config.plateType] ? config.plateType : '6well';
    document.getElementById('ticPlateType').value = plateType;
    document.getElementById('ticVolPerWell').value = parseNumber(config.params.volPerWell, TIC_PRESETS[plateType].volPerWell);
    document.getElementById('ticExtraWells').value = parseNumber(config.params.extraWells, 1);
    document.getElementById('ticMixExtraWells').value = parseNumber(config.params.mixExtraWells, 0.5);
    document.getElementById('ticTnfStock').value = parseNumber(config.params.tnfStock, 2500);
    document.getElementById('ticIl1Stock').value = parseNumber(config.params.il1Stock, 2500);
    document.getElementById('ticC1qStock').value = parseNumber(config.params.c1qStockMg, 1.04);
    document.getElementById('ticTnfWork').value = parseNumber(config.params.tnfWork, 30);
    document.getElementById('ticIl1Work').value = parseNumber(config.params.il1Work, 3);
    document.getElementById('ticC1qWork').value = parseNumber(config.params.c1qWork, 400);
    ticGroups = config.groups.map((group, index) => ({
        id: Number.isFinite(parseFloat(group.id)) ? parseFloat(group.id) : Date.now() + index,
        name: String(group.name || `TIC-${index + 1}`),
        wells: parseNumber(group.wells, 1),
        factor: Math.min(1, Math.max(0, parseNumber(group.factor, 1)))
    }));
    if (ticGroups.length === 0) {
        ticGroups = [{ id: Date.now(), name: 'TIC 1X', wells: 1, factor: 1 }];
    }
    renderTicGroups();
}

function exportTicPrintPdf() {
    lastTicData = null;
    calculateTic();
    if (!lastTicData) return;
    renderTicPrintArea(lastTicData);
    window.print();
}

function renderTicPrintArea(mix) {
    const oneXRows = `
        <tr><td>培养基</td><td>${formatVol(mix.mediumVolMl)}</td></tr>
        <tr><td>TNF</td><td>${formatVol(mix.tnfVolMl)}</td></tr>
        <tr><td>IL-1α</td><td>${formatVol(mix.il1VolMl)}</td></tr>
        <tr><td>C1q</td><td>${formatVol(mix.c1qVolMl)}</td></tr>
        <tr><td>各组分装需要</td><td>${formatVol(mix.oneXNeededMl)}</td></tr>
        <tr><td>分装富余</td><td>${formatVol(mix.oneXExtraMl)}</td></tr>
        <tr><td>合计 1X TIC 工作液</td><td>${formatVol(mix.oneXVolMl)}</td></tr>
    `;
    const groupLabelRow = `
        <tr class="print-label-row">
            <td>处理组</td>
            <td>1X TIC 工作液</td>
            <td>培养基</td>
            <td>加样</td>
        </tr>
    `;
    const groupRows = mix.groupPlans.map(group => `
        <tr>
            <td>${escapeHtml(group.name)}（${formatTicFactor(group.factor)}，${formatMl(group.wells)}孔，配${formatMl(group.calcWells)}孔）</td>
            <td>${formatVol(group.ticMixMl)}</td>
            <td>${formatVol(group.dilutionMediumMl)}</td>
            <td>${formatMl(mix.volPerWell)} mL/孔</td>
        </tr>
    `).join('');
    const tubePlan = buildTubePlan(mix.oneXVolMl);

    document.getElementById('printArea').innerHTML = `
        <div class="print-sheet">
            <section class="print-block">
                <h2>1. 配制 1X TIC 工作液</h2>
                <table><tbody>${oneXRows}</tbody></table>
            </section>
            <section class="print-block">
                <h2>2. 各组稀释与加样</h2>
                <table><tbody>${groupLabelRow}${groupRows}</tbody></table>
            </section>
            <section class="print-note">
                ${escapeHtml(tubePlan.summary)}。低浓度组用 1X TIC 工作液与培养基按上表稀释后，每孔加入对应总体积。
            </section>
        </div>
    `;
}

function getTicExportFilename(suffix, ext) {
    const now = new Date();
    const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('');
    return `tic-${suffix}-${stamp}.${ext}`;
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
            ${index === 0 ? '<span class="inline-tip qpcr-ref-tip">内参</span>' : '<span></span>'}
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

    const minRnaGroup = cleanGroups.reduce((min, g) => (g.rnaConc < min.rnaConc ? g : min), cleanGroups[0]);
    const minRnaConc = minRnaGroup.rnaConc;
    const rtRnaVolUl = targetRnaNg / minRnaConc;
    const dilutionRatio = cdnaConc / cdnaNgPerWell;
    const rtPlans = buildRtPlans(cleanGroups, targetRnaNg);

    const design = buildQpcrPlateDesign(cleanGroups, cleanGenes, replicates);
    if (design.error) {
        alert(design.error);
        return;
    }
    const tube1Plans = buildTube1Plans(cleanGroups.length, cleanGenes, replicates, extraWells, design);
    const tube2Plans = buildTube2Plans(cleanGroups, extraWells, design);

    renderQpcrResults({
        minRnaConc,
        targetRnaNg,
        cdnaConc,
        cdnaNgPerWell,
        replicates,
        extraWells,
        reactionCount: design.reactionCount,
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
    const reactionsPerGene = groupsList.length * replicates;
    const maxGenesPerPlateByCapacity = Math.floor((rows.length * cols) / reactionsPerGene);
    const getLayoutModeForGeneCount = geneCount => {
        if (groupsList.length <= rows.length && geneCount * replicates <= cols) return 'group-rows';
        if (geneCount <= rows.length && groupsList.length * replicates <= cols) return 'gene-rows';
        if (geneCount * replicates <= rows.length && groupsList.length <= cols) return 'gene-rep-rows';
        if (groupsList.length * replicates <= rows.length && geneCount <= cols) return 'group-rep-rows';
        return null;
    };
    const getMixedLayoutPlan = geneCount => {
        const groupCount = groupsList.length;
        const standardPerShelf = Math.floor(cols / replicates);
        const rotatedPerShelf = Math.floor(cols / groupCount);
        if (standardPerShelf < 1 || rotatedPerShelf < 1 || groupCount > rows.length || replicates > rows.length) {
            return null;
        }

        let bestPlan = null;
        for (let standardCount = geneCount; standardCount >= 0; standardCount -= 1) {
            const rotatedCount = geneCount - standardCount;
            const standardShelves = standardCount > 0 ? Math.ceil(standardCount / standardPerShelf) : 0;
            const rotatedShelves = rotatedCount > 0 ? Math.ceil(rotatedCount / rotatedPerShelf) : 0;
            const usedRows = standardShelves * groupCount + rotatedShelves * replicates;
            if (usedRows > rows.length) continue;

            const candidate = {
                standardCount,
                rotatedCount,
                standardPerShelf,
                rotatedPerShelf,
                standardShelves,
                rotatedShelves,
                usedRows
            };
            if (!bestPlan || candidate.usedRows < bestPlan.usedRows ||
                (candidate.usedRows === bestPlan.usedRows && candidate.standardCount > bestPlan.standardCount)) {
                bestPlan = candidate;
            }
        }
        return bestPlan;
    };
    const getLayoutPlanForGeneCount = geneCount => ({
        mode: getLayoutModeForGeneCount(geneCount),
        mixed: getMixedLayoutPlan(geneCount)
    });
    let maxGenesPerPlate = 0;
    for (let geneCount = 1; geneCount <= Math.min(genesList.length, maxGenesPerPlateByCapacity); geneCount += 1) {
        const layoutPlan = getLayoutPlanForGeneCount(geneCount);
        if (layoutPlan.mode || layoutPlan.mixed) {
            maxGenesPerPlate = geneCount;
        }
    }
    if (maxGenesPerPlate < 1) {
        return {
            error: `当前分组和平行孔设置无法形成整齐矩阵排布。请减少分组或平行孔数。`
        };
    }

    const referenceGene = genesList[0];
    const targetGenes = genesList.slice(1);
    const onePlateWells = genesList.length * reactionsPerGene;
    let plateGeneSets = [genesList];
    let duplicatedReference = false;

    const completeLayoutPlan = getLayoutPlanForGeneCount(genesList.length);
    if (onePlateWells > 96 || (!completeLayoutPlan.mode && !completeLayoutPlan.mixed)) {
        const maxTargetsPerPlate = maxGenesPerPlate - 1;
        if (maxTargetsPerPlate < 1) {
            return {
                error: `当前分组和平行孔设置下，两块板模式中每块板只能容纳内参，无法加入待测基因。请减少分组或平行孔数。`
            };
        }
        plateGeneSets = [];
        for (let start = 0; start < targetGenes.length; start += maxTargetsPerPlate) {
            plateGeneSets.push([referenceGene, ...targetGenes.slice(start, start + maxTargetsPerPlate)]);
        }
        duplicatedReference = true;
    }

    const buildSinglePlate = (plateGenes, plateNumber) => {
        const plate = Array.from({ length: 8 }, () => Array.from({ length: cols }, () => null));
        const assignments = [];
        const layoutMode = getLayoutModeForGeneCount(plateGenes.length);
        const mixedLayout = getMixedLayoutPlan(plateGenes.length);
        if (!layoutMode && !mixedLayout) {
            return {
                error: `板 ${plateNumber} 无法形成整齐矩阵排布。请减少该板基因数、分组数或平行孔数。`
            };
        }
        const columnPlan = [];
        plateGenes.forEach((gene, plateGeneIndex) => {
            const geneIndex = genesList.indexOf(gene);
            for (let rep = 1; rep <= replicates; rep += 1) {
                columnPlan.push({ gene: gene.name, geneIndex: geneIndex >= 0 ? geneIndex : plateGeneIndex, rep });
            }
        });

        if (layoutMode === 'group-rows') {
            groupsList.forEach((group, rowIndex) => {
                columnPlan.forEach((colMeta, colIndex) => {
                    const well = `${rows[rowIndex]}${colIndex + 1}`;
                    const sample = {
                        plate: plateNumber,
                        group: group.name,
                        gene: colMeta.gene,
                        geneIndex: colMeta.geneIndex,
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

            return {
                plate,
                assignments,
                rowLabels,
                colLabels,
                useReadableLayout: true,
                layoutMode: 'group-rows',
                plateNumber,
                genes: plateGenes.map(g => g.name),
                geneIndices: plateGenes.map(g => genesList.indexOf(g))
            };
        }

        const sampleColumns = [];
        groupsList.forEach(group => {
            for (let rep = 1; rep <= replicates; rep += 1) {
                sampleColumns.push({ group: group.name, rep });
            }
        });
        if (layoutMode === 'gene-rows') {
            plateGenes.forEach((gene, rowIndex) => {
                sampleColumns.forEach((sampleCol, colIndex) => {
                    const well = `${rows[rowIndex]}${colIndex + 1}`;
                    const sample = {
                        plate: plateNumber,
                        group: sampleCol.group,
                        gene: gene.name,
                        geneIndex: genesList.indexOf(gene),
                        rep: sampleCol.rep,
                        well
                    };
                    plate[rowIndex][colIndex] = sample;
                    assignments.push(sample);
                });
            });

            const rowLabels = rows.map((rowName, rowIndex) => (
                rowIndex < plateGenes.length ? `${rowName} | ${plateGenes[rowIndex].name}` : `${rowName} | -`
            ));
            const colLabels = Array.from({ length: cols }, (_, colIndex) => (
                colIndex < sampleColumns.length ? `${colIndex + 1} | ${sampleColumns[colIndex].group} R${sampleColumns[colIndex].rep}` : `${colIndex + 1} | -`
            ));

            return {
                plate,
                assignments,
                rowLabels,
                colLabels,
                useReadableLayout: true,
                layoutMode: 'gene-rows',
                plateNumber,
                genes: plateGenes.map(g => g.name),
                geneIndices: plateGenes.map(g => genesList.indexOf(g))
            };
        }

        if (layoutMode === 'gene-rep-rows') {
            const geneRepRows = [];
            plateGenes.forEach(gene => {
                for (let rep = 1; rep <= replicates; rep += 1) {
                    geneRepRows.push({ gene: gene.name, geneIndex: genesList.indexOf(gene), rep });
                }
            });
            geneRepRows.forEach((rowMeta, rowIndex) => {
                groupsList.forEach((group, colIndex) => {
                    const well = `${rows[rowIndex]}${colIndex + 1}`;
                    const sample = {
                        plate: plateNumber,
                        group: group.name,
                        gene: rowMeta.gene,
                        geneIndex: rowMeta.geneIndex,
                        rep: rowMeta.rep,
                        well
                    };
                    plate[rowIndex][colIndex] = sample;
                    assignments.push(sample);
                });
            });
            const rowLabels = rows.map((rowName, rowIndex) => (
                rowIndex < geneRepRows.length ? `${rowName} | ${geneRepRows[rowIndex].gene} R${geneRepRows[rowIndex].rep}` : `${rowName} | -`
            ));
            const colLabels = Array.from({ length: cols }, (_, colIndex) => (
                colIndex < groupsList.length ? `${colIndex + 1} | ${groupsList[colIndex].name}` : `${colIndex + 1} | -`
            ));
            return {
                plate,
                assignments,
                rowLabels,
                colLabels,
                useReadableLayout: true,
                layoutMode: 'gene-rep-rows',
                plateNumber,
                genes: plateGenes.map(g => g.name),
                geneIndices: plateGenes.map(g => genesList.indexOf(g))
            };
        }

        if (layoutMode === null && mixedLayout) {
            const placeSample = (rowIndex, colIndex, gene, geneIndex, group, rep) => {
                const well = `${rows[rowIndex]}${colIndex + 1}`;
                const sample = {
                    plate: plateNumber,
                    group: group.name,
                    gene: gene.name,
                    geneIndex,
                    rep,
                    well
                };
                plate[rowIndex][colIndex] = sample;
                assignments.push(sample);
            };

            plateGenes.slice(0, mixedLayout.standardCount).forEach((gene, index) => {
                const shelf = Math.floor(index / mixedLayout.standardPerShelf);
                const slot = index % mixedLayout.standardPerShelf;
                const rowStart = shelf * groupsList.length;
                const colStart = slot * replicates;
                groupsList.forEach((group, groupIndex) => {
                    for (let rep = 1; rep <= replicates; rep += 1) {
                        placeSample(rowStart + groupIndex, colStart + rep - 1, gene, genesList.indexOf(gene), group, rep);
                    }
                });
            });

            const rotatedRowStart = mixedLayout.standardShelves * groupsList.length;
            plateGenes.slice(mixedLayout.standardCount).forEach((gene, index) => {
                const shelf = Math.floor(index / mixedLayout.rotatedPerShelf);
                const slot = index % mixedLayout.rotatedPerShelf;
                const rowStart = rotatedRowStart + shelf * replicates;
                const colStart = slot * groupsList.length;
                for (let rep = 1; rep <= replicates; rep += 1) {
                    groupsList.forEach((group, groupIndex) => {
                        placeSample(rowStart + rep - 1, colStart + groupIndex, gene, genesList.indexOf(gene), group, rep);
                    });
                }
            });

            return {
                plate,
                assignments,
                rowLabels: rows.map((rowName, rowIndex) => {
                    if (rowIndex < rotatedRowStart) {
                        const group = groupsList[rowIndex % groupsList.length];
                        return `${rowName} | ${group ? group.name : '-'}`;
                    }
                    if (mixedLayout.rotatedCount > 0 && rowIndex < mixedLayout.usedRows) {
                        return `${rowName} | 混合排布`;
                    }
                    return `${rowName} | -`;
                }),
                colLabels: Array.from({ length: cols }, (_, colIndex) => `${colIndex + 1} | 混合排布`),
                useReadableLayout: true,
                layoutMode: 'mixed',
                plateNumber,
                genes: plateGenes.map(g => g.name),
                geneIndices: plateGenes.map(g => genesList.indexOf(g))
            };
        }

        const groupRepRows = [];
        groupsList.forEach(group => {
            for (let rep = 1; rep <= replicates; rep += 1) {
                groupRepRows.push({ group: group.name, rep });
            }
        });
        groupRepRows.forEach((rowMeta, rowIndex) => {
            plateGenes.forEach((gene, colIndex) => {
                const well = `${rows[rowIndex]}${colIndex + 1}`;
                const sample = {
                    plate: plateNumber,
                    group: rowMeta.group,
                    gene: gene.name,
                    geneIndex: genesList.indexOf(gene),
                    rep: rowMeta.rep,
                    well
                };
                plate[rowIndex][colIndex] = sample;
                assignments.push(sample);
            });
        });
        const rowLabels = rows.map((rowName, rowIndex) => (
            rowIndex < groupRepRows.length ? `${rowName} | ${groupRepRows[rowIndex].group} R${groupRepRows[rowIndex].rep}` : `${rowName} | -`
        ));
        const colLabels = Array.from({ length: cols }, (_, colIndex) => (
            colIndex < plateGenes.length ? `${colIndex + 1} | ${plateGenes[colIndex].name}` : `${colIndex + 1} | -`
        ));
        return {
            plate,
            assignments,
            rowLabels,
            colLabels,
            useReadableLayout: true,
            layoutMode: 'group-rep-rows',
            plateNumber,
            genes: plateGenes.map(g => g.name),
            geneIndices: plateGenes.map(g => genesList.indexOf(g))
        };
    };

    const plates = [];
    for (let index = 0; index < plateGeneSets.length; index += 1) {
        const plateDesign = buildSinglePlate(plateGeneSets[index], index + 1);
        if (plateDesign.error) return plateDesign;
        plates.push(plateDesign);
    }
    const assignments = plates.flatMap(plate => plate.assignments);
    const genePlateCounts = {};
    plateGeneSets.forEach(plateGenes => {
        plateGenes.forEach(gene => {
            genePlateCounts[gene.name] = (genePlateCounts[gene.name] || 0) + 1;
        });
    });
    const firstPlate = plates[0];
    return {
        ...firstPlate,
        plates,
        assignments,
        plateCount: plates.length,
        duplicatedReference,
        referenceGene: referenceGene.name,
        genePlateCounts,
        reactionCount: assignments.length
    };
}

function buildTube1Plans(groupCount, genesList, replicates, extraWells, design) {
    return genesList.map((gene, index) => {
        const plateCount = design.genePlateCounts[gene.name] || 1;
        const baseWells = groupCount * replicates * plateCount;
        const totalWells = baseWells + extraWells;
        const refLabel = index === 0 ? '，内参' : '';
        const plateLabel = plateCount > 1 ? `，${plateCount}块板` : '';
        return {
            name: `管一（${gene.name}${refLabel}${plateLabel}）`,
            gene: gene.name,
            isReference: index === 0,
            plateCount,
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

function buildTube2Plans(groupsList, extraWells, design) {
    const wellsByGroup = {};
    design.assignments.forEach(item => {
        wellsByGroup[item.group] = (wellsByGroup[item.group] || 0) + 1;
    });
    return groupsList.map(group => {
        const baseWells = wellsByGroup[group.name] || 0;
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
        `共 ${data.reactionCount} 个反应孔，${data.design.plateCount} 块板（首个基因 ${data.design.referenceGene} 为内参）`;

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
    if (data.rtRnaVolUl > 14) {
        alerts.push(`最低 RNA 浓度计算得到需加入 RNA ${formatQpcr(data.rtRnaVolUl)} µL，超出体系范围（20 µL 逆转录体系中 RNA 建议不超过 14 µL）。请降低目标逆转录 RNA 含量。`);
    }
    if (data.rtRnaVolUl > 20) {
        alerts.push(`计算得到 RNA 体积 ${formatQpcr(data.rtRnaVolUl)} µL，超过 20 µL 逆转录体系。请降低目标逆转录 RNA 含量。`);
    }
    const noWaterGroups = data.rtPlans.filter(p => p.water < 0).map(p => p.group);
    if (noWaterGroups.length > 0) {
        alerts.push(`以下样品在 20 µL 逆转录体系中无酶水体积为负（RNA 体积过大）：${noWaterGroups.join('、')}。请降低目标 RNA 含量或提高 RNA 浓度。`);
    }
    if (data.cdnaNgPerWell < 5 || data.cdnaNgPerWell > 10) {
        alerts.push(`每孔 cDNA 含量为 ${formatQpcr(data.cdnaNgPerWell)} ng，建议范围 5-10 ng。`);
    }
    if (data.design.duplicatedReference) {
        alerts.push(`当前基因数量超过单块 96 孔板容量，已自动切换为 ${data.design.plateCount} 块板模式；内参 ${data.design.referenceGene} 已按两块板需求量配置。`);
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
        ['排板模式', `${data.design.plateCount} 块 96 孔板${data.design.duplicatedReference ? `（内参 ${data.design.referenceGene} 两块板均配置）` : ''}`],
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
    const html = design.plates.map(plate => renderSingleQpcrPlate(plate, design)).join('');
    document.getElementById('qpcrPlateContainer').innerHTML = html;
}

function getQpcrGeneCellStyle(geneIndex) {
    const safeIndex = Number.isFinite(geneIndex) && geneIndex >= 0 ? geneIndex : 0;
    const color = QPCR_GENE_COLORS[safeIndex % QPCR_GENE_COLORS.length];
    return `--gene-bg:${color.background};--gene-text:${color.text};--gene-border:${color.border};`;
}

function renderSingleQpcrPlate(plateDesign, design) {
    const rowNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const headCells = Array.from({ length: 12 }, (_, i) => `
        <th>
            <div class="axis-main">${i + 1}</div>
            <div class="axis-note">${(plateDesign.colLabels && plateDesign.colLabels[i]) ? plateDesign.colLabels[i].split(' | ')[1] : '-'}</div>
        </th>
    `).join('');

    const bodyRows = rowNames.map((rowName, rowIndex) => {
        const rowCells = plateDesign.plate[rowIndex].map(cell => {
            if (!cell) return '<td class="plate-cell empty">-</td>';
            return `
                <td class="plate-cell filled" style="${getQpcrGeneCellStyle(cell.geneIndex)}">
                    <div class="plate-gene">${escapeHtml(cell.gene)}</div>
                    <div class="plate-sample">${escapeHtml(cell.group)} R${cell.rep}</div>
                </td>
            `;
        }).join('');
        return `
            <tr>
                <th>
                    <div class="axis-main">${rowName}</div>
                    <div class="axis-note">${(plateDesign.rowLabels && plateDesign.rowLabels[rowIndex]) ? plateDesign.rowLabels[rowIndex].split(' | ')[1] : '-'}</div>
                </th>
                ${rowCells}
            </tr>
        `;
    }).join('');

    const plateGenes = plateDesign.genes.join('、');
    const layoutText = plateDesign.layoutMode === 'mixed'
        ? '混合方向紧凑排布，剩余区域自动转置'
        : plateDesign.layoutMode === 'gene-rows'
        ? '行对应基因，列对应样本/平行孔'
        : plateDesign.layoutMode === 'gene-rep-rows'
            ? '行对应基因/平行孔，列对应样本'
            : plateDesign.layoutMode === 'group-rep-rows'
                ? '行对应样本/平行孔，列对应基因'
                : '行对应样本，列对应基因/平行孔';
    const layoutHint = `<div class="plate-hint">板 ${plateDesign.plateNumber}/${design.plateCount}：${layoutText}；包含 ${plateGenes}</div>`;
    const legend = `
        <div class="plate-gene-legend">
            ${plateDesign.genes.map((gene, index) => `
                <span class="plate-gene-key" style="${getQpcrGeneCellStyle((plateDesign.geneIndices || [])[index])}">
                    <i></i>${escapeHtml(gene)}${(plateDesign.geneIndices || [])[index] === 0 ? '（内参）' : ''}
                </span>
            `).join('')}
        </div>
    `;

    return `
        ${layoutHint}
        ${legend}
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
    text += `基因：${data.cleanGenes.map((g, index) => (index === 0 ? `${g.name}（内参）` : g.name)).join('、')}\n`;
    text += `板数：${data.design.plateCount} 块${data.design.duplicatedReference ? `（内参 ${data.design.referenceGene} 覆盖两块板）` : ''}\n`;
    text += `总反应孔：${data.reactionCount}（按实际排板计算）\n`;
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
    text += `\n[8. 96 孔板排序（板号 / 孔位 -> 分组 / 基因 / 平行）]\n`;
    wellRows.forEach(item => {
        text += `  - 板${item.plate} ${item.well} -> ${item.group} / ${item.gene} / Rep${item.rep}\n`;
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

function collectQpcrConfig() {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }
    return {
        app: 'biotools-qpcr',
        version: 1,
        exportedAt: new Date().toISOString(),
        module: 'qpcr',
        params: {
            targetRnaNg: parseFloat(document.getElementById('qpcrTargetRnaNg').value) || 0,
            cdnaNgPerWell: parseFloat(document.getElementById('qpcrCdnaNgPerWell').value) || 0,
            replicates: parseInt(document.getElementById('qpcrReplicates').value, 10) || 0,
            extraWells: parseInt(document.getElementById('qpcrExtraWells').value, 10) || 0
        },
        groups: qpcrGroups.map(group => ({
            id: group.id,
            name: group.name,
            rnaConc: parseFloat(group.rnaConc) || 0
        })),
        genes: qpcrGenes.map(gene => ({
            id: gene.id,
            name: gene.name
        }))
    };
}

function exportQpcrConfig() {
    const config = collectQpcrConfig();
    downloadBlobFile(getQpcrExportFilename('config', 'json'), JSON.stringify(config, null, 2), 'application/json;charset=utf-8');
}

function triggerImportQpcrConfig() {
    document.getElementById('qpcrConfigFile').click();
}

function importQpcrConfig(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const config = JSON.parse(reader.result);
            applyQpcrConfig(config);
            calculateQpcr();
        } catch (error) {
            alert('配置文件无法读取，请确认导入的是本工具导出的 qPCR JSON 文件。');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function applyQpcrConfig(config) {
    if (!config || config.module !== 'qpcr' || !config.params || !Array.isArray(config.groups) || !Array.isArray(config.genes)) {
        throw new Error('Invalid qPCR config');
    }
    document.getElementById('qpcrTargetRnaNg').value = parseNumber(config.params.targetRnaNg, 1000);
    document.getElementById('qpcrCdnaNgPerWell').value = parseNumber(config.params.cdnaNgPerWell, 10);
    document.getElementById('qpcrReplicates').value = parseInt(parseNumber(config.params.replicates, 3), 10);
    document.getElementById('qpcrExtraWells').value = parseInt(parseNumber(config.params.extraWells, 3), 10);

    qpcrGroups = config.groups.map((group, index) => ({
        id: Number.isFinite(parseFloat(group.id)) ? parseFloat(group.id) : Date.now() + index,
        name: String(group.name || `Group-${index + 1}`),
        rnaConc: parseNumber(group.rnaConc, 100)
    }));
    qpcrGenes = config.genes.map((gene, index) => ({
        id: Number.isFinite(parseFloat(gene.id)) ? parseFloat(gene.id) : Date.now() + index,
        name: String(gene.name || `Gene-${index + 1}`)
    }));
    if (qpcrGroups.length === 0) {
        qpcrGroups = [{ id: Date.now(), name: 'Group-1', rnaConc: 100 }];
    }
    if (qpcrGenes.length === 0) {
        qpcrGenes = [{ id: Date.now(), name: 'Gene-1' }];
    }
    renderQpcrGroups();
    renderQpcrGenes();
}

function exportQpcrPrintPdf() {
    lastQpcrData = null;
    calculateQpcr();
    if (!lastQpcrData) return;
    renderQpcrPrintArea(lastQpcrData);
    window.print();
}

function renderQpcrPrintArea(data) {
    const dilutionWaterFor20ul = getDilutionWaterFor20ul(data.dilutionRatio);
    const rtHead = data.rtPlans.map(plan => `<th>${escapeHtml(plan.group)}</th>`).join('');
    const rtRow = (name, getter) => `
        <tr>
            <td>${escapeHtml(name)}</td>
            ${data.rtPlans.map(plan => `<td>${escapeHtml(getter(plan))}</td>`).join('')}
        </tr>
    `;
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
    const plateSections = (data.design.plates || [data.design]).map(plateDesign => {
        const plateHead = Array.from({ length: 12 }, (_, i) => {
            const raw = (plateDesign.colLabels && plateDesign.colLabels[i]) ? plateDesign.colLabels[i] : '';
            const mapped = raw.includes(' | ') ? raw.split(' | ')[1] : '-';
            return `<th>${i + 1}<br><span>${escapeHtml(mapped)}</span></th>`;
        }).join('');
        const plateBody = plateDesign.plate.map((row, rowIndex) => {
            const raw = (plateDesign.rowLabels && plateDesign.rowLabels[rowIndex]) ? plateDesign.rowLabels[rowIndex] : '';
            const mapped = raw.includes(' | ') ? raw.split(' | ')[1] : '-';
            return `
                <tr>
                    <th>${String.fromCharCode(65 + rowIndex)}<br><span>${escapeHtml(mapped)}</span></th>
                    ${row.map(cell => `
                        <td class="${cell ? 'plate-cell-print filled' : 'plate-cell-print'}"${cell ? ` style="${getQpcrGeneCellStyle(cell.geneIndex)}"` : ''}>
                            ${cell ? `<strong>${escapeHtml(cell.gene)}</strong><br><span>${escapeHtml(cell.group)} R${cell.rep}</span>` : '-'}
                        </td>
                    `).join('')}
                </tr>
            `;
        }).join('');
        return `
            <h3 class="print-plate-title">板 ${plateDesign.plateNumber || 1}/${data.design.plateCount}：${escapeHtml((plateDesign.genes || []).join('、'))}</h3>
            <table class="print-plate-table">
                <thead><tr><th></th>${plateHead}</tr></thead>
                <tbody>${plateBody}</tbody>
            </table>
        `;
    }).join('');

    document.getElementById('printArea').innerHTML = `
        <div class="print-sheet">
            <section class="print-block">
                <h2>1. 逆转录与稀释计算</h2>
                <table>
                    <tbody>
                        <tr><td>最低 RNA 浓度</td><td>${formatQpcr(data.minRnaConc)} ng/µL（${escapeHtml(data.minRnaGroup.name)}）</td></tr>
                        <tr><td>目标 RNA 含量</td><td>${formatQpcr(data.targetRnaNg)} ng</td></tr>
                        <tr><td>最低浓度样本 RNA 体积</td><td>${formatQpcr(data.rtRnaVolUl)} µL</td></tr>
                        <tr><td>建议稀释比例</td><td>${data.dilutionRatio >= 1 ? `1:${formatQpcr(data.dilutionRatio)}` : `浓度不足（比值 ${formatQpcr(data.dilutionRatio)}）`}</td></tr>
                    </tbody>
                </table>
            </section>
            <section class="print-block">
                <h2>2. 逆转录体系（20 µL/样品）</h2>
                <table>
                    <thead><tr><th>组分</th>${rtHead}</tr></thead>
                    <tbody>
                        ${rtRow('RNA 体积 (µL)', p => formatQpcr(p.rnaVol))}
                        ${rtRow('gDNA Mix (µL)', p => formatQpcr(p.gdnaMix))}
                        ${rtRow('5X Evo Reaction Mix (µL)', p => formatQpcr(p.evoMix))}
                        ${rtRow('无酶水 (µL)', p => formatQpcr(p.water))}
                        ${rtRow('总量 (µL)', () => '20.00')}
                        ${rtRow('cDNA 稀释加无酶水 (µL)', () => formatQpcr(dilutionWaterFor20ul))}
                    </tbody>
                </table>
            </section>
            <section class="print-block">
                <h2>3. qPCR 上板体系 A（引物预混管）</h2>
                <table>
                    <thead><tr><th>名称</th><th>孔数</th><th>SYBR</th><th>无酶水</th><th>Primer F</th><th>Primer R</th><th>总量</th></tr></thead>
                    <tbody>${tube1Rows}</tbody>
                </table>
            </section>
            <section class="print-block">
                <h2>4. qPCR 上板体系 B（cDNA 样品管）</h2>
                <table>
                    <thead><tr><th>名称</th><th>孔数</th><th>cDNA</th><th>无酶水</th><th>总量</th></tr></thead>
                    <tbody>${tube2Rows}</tbody>
                </table>
            </section>
            <section class="print-block">
                <h2>5. 96 孔板排布示例</h2>
                ${plateSections}
            </section>
            <section class="print-note">
                上板顺序：每孔先加 15 µL 体系 A，再加 5 µL 体系 B；轻拍混匀或短暂离心后上机。
            </section>
        </div>
    `;
}

function getDilutionWaterFor20ul(dilutionRatio) {
    return dilutionRatio > 1 ? 20 * (dilutionRatio - 1) : 0;
}

function getQpcrWellRows(design) {
    const rows = [];
    const rowNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const plates = design.plates || [design];
    plates.forEach(plateDesign => {
        for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
            for (let colIndex = 0; colIndex < 12; colIndex += 1) {
                const cell = plateDesign.plate[rowIndex][colIndex];
                if (!cell) continue;
                rows.push({
                    plate: plateDesign.plateNumber || 1,
                    well: `${rowNames[rowIndex]}${colIndex + 1}`,
                    group: cell.group,
                    gene: cell.gene,
                    rep: cell.rep
                });
            }
        }
    });
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
    const plateSections = (data.design.plates || [data.design]).map(plateDesign => {
        const plateHead = Array.from({ length: 12 }, (_, i) => {
            const raw = (plateDesign.colLabels && plateDesign.colLabels[i]) ? plateDesign.colLabels[i] : '';
            const mapped = raw.includes(' | ') ? raw.split(' | ')[1] : '-';
            return `<th>${i + 1} (${escapeHtml(mapped)})</th>`;
        }).join('');
        const plateBody = plateDesign.plate.map((row, rowIndex) => `
            <tr>
                <th>${String.fromCharCode(65 + rowIndex)} (${escapeHtml((plateDesign.rowLabels && plateDesign.rowLabels[rowIndex]) ? plateDesign.rowLabels[rowIndex].split(' | ')[1] : '-')})</th>
                ${row.map(cell => `<td${cell ? ` class="plate-gene-cell" style="${getQpcrGeneCellStyle(cell.geneIndex)}"` : ''}>${cell ? `${escapeHtml(cell.gene)}<br><small>${escapeHtml(cell.group)} R${cell.rep}</small>` : '-'}</td>`).join('')}
            </tr>
        `).join('');
        return `
            <h3>板 ${plateDesign.plateNumber || 1}/${data.design.plateCount}：${escapeHtml((plateDesign.genes || []).join('、'))}</h3>
            <table>
                <thead><tr><th></th>${plateHead}</tr></thead>
                <tbody>${plateBody}</tbody>
            </table>
        `;
    }).join('');

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
h2 { margin-top: 18px; font-size: 16px; }
p { margin: 4px 0; }
table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 12px; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; white-space: nowrap; }
th { background: #f8fafc; }
.plate-gene-cell { background: var(--gene-bg); color: var(--gene-text); border-color: var(--gene-border); font-weight: 700; }
.plate-gene-cell small { color: #334155; font-weight: 500; }
.rt th:first-child, .rt td:first-child { background: #f8fafc; font-weight: 600; }
.muted { color: #475569; }
@media print { body { margin: 10mm; } h2 { page-break-after: avoid; } }
</style>
</head>
<body>
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
${plateSections}
</body>
</html>`;
}
