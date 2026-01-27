// 默认配置数据 (仅用于预设填充)
const PRESETS = {
    '6well': {
        name: '六孔板规格',
        optiA: 125, lipo: 5, optiB: 125, sirna: 5
    },
    '60mm': {
        name: '中皿规格',
        optiA: 250, lipo: 10, optiB: 250, sirna: 10
    }
};

let groups = [
    { id: 1, name: 'NC (对照)', wells: 1 },
    { id: 1002, name: 'siRNA-Target1', wells: 3 }
];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadPreset(); // 加载默认预设数值到输入框
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

// 渲染分组列表
function renderGroups() {
    const list = document.getElementById('groupsList');
    list.innerHTML = '';
    
    groups.forEach((group, index) => {
        const div = document.createElement('div');
        div.className = 'group-item';
        div.innerHTML = `
            <input type="text" placeholder="分组名称 (如 NC)" value="${group.name}" onchange="updateGroup(${index}, 'name', this.value)">
            <input type="number" placeholder="孔数" value="${group.wells}" min="0" step="1" onchange="updateGroup(${index}, 'wells', this.value)">
            <button class="btn-remove" onclick="removeGroup(${index})" title="删除分组"><i class="fas fa-times"></i></button>
        `;
        list.appendChild(div);
    });
}

// 添加分组
function addGroup() {
    groups.push({ id: Date.now(), name: `Group ${groups.length + 1}`, wells: 1 });
    renderGroups();
}

// 删除分组
function removeGroup(index) {
    if (groups.length <= 1) {
        alert("至少保留一个分组！");
        return;
    }
    groups.splice(index, 1);
    renderGroups();
}

// 更新分组数据
function updateGroup(index, field, value) {
    if (field === 'wells') {
        value = parseFloat(value);
        if (value < 0) value = 0;
    }
    groups[index][field] = value;
}

// 计算主函数
function calculate() {
    // 获取当前设置的体积参数
    const settings = {
        name: document.getElementById('plateType').options[document.getElementById('plateType').selectedIndex].text.split('(')[0].trim(),
        optiA: parseFloat(document.getElementById('volOptiA').value) || 0,
        lipo: parseFloat(document.getElementById('volLipo').value) || 0,
        optiB: parseFloat(document.getElementById('volOptiB').value) || 0,
        sirna: parseFloat(document.getElementById('volSiRNA').value) || 0
    };

    const groupExtra = parseFloat(document.getElementById('groupExtraWells').value) || 0;
    const tubeAExtra = parseFloat(document.getElementById('extraWells').value) || 0;
    
    // 1. 计算每个组需要的配制量 = 实际孔数 + 分组富裕量
    let totalWellsForTubeA = 0;
    
    const groupCalculations = groups.map(group => {
        const calcWells = group.wells + groupExtra; // 每个组配制量 = 实际 + Group富裕
        totalWellsForTubeA += calcWells;
        
        return {
            ...group,
            calcWells: calcWells,
            optiB: calcWells * settings.optiB,
            sirna: calcWells * settings.sirna
        };
    });

    // 2. 计算 Tube A 总量
    // Tube A 总需求 = Sum(各个 Tube B 的孔数需求) + Tube A 自身富裕量
    const finalTubeAWells = totalWellsForTubeA + tubeAExtra;
    
    const tubeA = {
        totalWells: finalTubeAWells,
        optiA: finalTubeAWells * settings.optiA,
        lipo: finalTubeAWells * settings.lipo,
        totalVol: finalTubeAWells * (settings.optiA + settings.lipo)
    };

    // 3. 渲染结果
    displayResults(settings, tubeA, groupCalculations, groupExtra, tubeAExtra);
}

function displayResults(settings, tubeA, groupResults, groupExtra, tubeAExtra) {
    const resultSection = document.getElementById('resultSection');
    resultSection.style.display = 'block';
    
    const totalActual = groupResults.reduce((sum, g) => sum + g.wells, 0);

    // 摘要
    document.getElementById('summaryText').textContent = 
        `${settings.name} | 实际孔数:${totalActual} | 分组富裕:+${groupExtra}孔/组 | A管富裕:+${tubeAExtra}孔`;

    // Tube A
    const totalActualWells = groupResults.reduce((sum, g) => sum + g.wells, 0);
    const totalGroupExtra = groupResults.length * groupExtra;

    const tubeAHtml = `
        <table class="recipe-table">
            <tr>
                <th>试剂</th>
                <th>单孔量</th>
                <th>总配制量 (共满足 ${formatNum(tubeA.totalWells)} 孔份量)</th>
            </tr>
            <tr>
                <td>Opti-MEM</td>
                <td>${settings.optiA} µL</td>
                <td class="highlight">${formatNum(tubeA.optiA)} µL</td>
            </tr>
            <tr>
                <td>Lipofectamine 3000</td>
                <td>${settings.lipo} µL</td>
                <td class="highlight">${formatNum(tubeA.lipo)} µL</td>
            </tr>
            <tr>
                <td><strong>A管总计</strong></td>
                <td>${settings.optiA + settings.lipo} µL</td>
                <td><strong>${formatNum(tubeA.totalVol)} µL</strong></td>
            </tr>
        </table>
        <div style="margin-top:15px; background:#f8f9fa; padding:10px; border-radius:4px; border-left: 3px solid #2ecc71; font-size: 0.9em; color:#555;">
            <strong><i class="fas fa-calculator"></i> A 管配制量构成 (已自动包含所有需求):</strong><br>
            <div style="padding-left: 10px; margin-top: 5px; line-height: 1.6;">
                1. 实际实验所需: <strong>${formatNum(totalActualWells)}</strong> 孔<br>
                2. 满足各组富裕: ${groupResults.length}个组 × ${groupExtra} = <strong>${formatNum(totalGroupExtra)}</strong> 孔 (确保每个B管都够分)<br>
                3. A 管自身富裕: <strong>${tubeAExtra}</strong> 孔 (确保A管分液时有余量)<br>
                <div style="border-top:1px solid #ddd; margin-top:5px; padding-top:2px;">
                    <strong>总计算基数: ${formatNum(totalActualWells)} + ${formatNum(totalGroupExtra)} + ${tubeAExtra} = <span style="color:#e74c3c; font-size:1.1em;">${formatNum(tubeA.totalWells)}</span> 孔</strong>
                </div>
            </div>
        </div>
    `;
    document.getElementById('tubeAContent').innerHTML = tubeAHtml;

    // Tube B List
    let tubeBHtml = '';
    groupResults.forEach(group => {
        const volFromA = group.calcWells * (settings.optiA + settings.lipo);
        const actualVol = group.wells * (settings.optiA + settings.lipo + settings.optiB + settings.sirna);

        tubeBHtml += `
            <div style="margin-bottom: 20px; border-bottom: 1px dashed #eee; padding-bottom: 15px;">
                <h5 style="margin-bottom:8px; color:#2980b9; font-size:1.1em;">
                    <i class="fas fa-tag"></i> ${group.name} 
                    <span style="font-size:0.8em; color:#777; font-weight:normal;">
                        (实际用 ${group.wells} 孔, 配制 ${formatNum(group.calcWells)} 孔)
                    </span>
                </h5>
                <table class="recipe-table">
                    <tr>
                        <th width="40%">成分</th>
                        <th>加入量</th>
                        <th>操作</th>
                    </tr>
                    <tr>
                        <td>Opti-MEM</td>
                        <td class="highlight">${formatNum(group.optiB)} µL</td>
                        <td>加入空离心管</td>
                    </tr>
                    <tr>
                        <td>${group.name} siRNA</td>
                        <td class="highlight">${formatNum(group.sirna)} µL</td>
                        <td>加入并混匀</td>
                    </tr>
                    <tr style="background:#f0f9ff;">
                        <td>+ 来自 A 管的混合液</td>
                        <td class="highlight">${formatNum(volFromA)} µL</td>
                        <td>取 A 管液加入此管</td>
                    </tr>
                </table>
                 <p style="margin-top:5px; font-size: 0.8em; color:#999;">
                    <i class="fas fa-info-circle"></i> 配制总量: ${formatNum(group.calcWells * (settings.optiA + settings.lipo + settings.optiB + settings.sirna))} µL (每孔加样约 ${formatNum(settings.optiA + settings.lipo + settings.optiB + settings.sirna)} µL)
                </p>
            </div>
        `;
    });
    document.getElementById('tubeBList').innerHTML = tubeBHtml;

    // Generate Protocol Text
    generateProtocol(settings, tubeA, groupResults);
}

function generateProtocol(settings, tubeA, groupResults) {
    const date = new Date().toLocaleDateString();
    let text = `实验流程单 - siRNA 转染 (${settings.name})\n`;
    text += `日期: ${date}\n`;
    text += `----------------------------------------\n`;
    text += `1. 准备试管 A (Lipofectamine 3000 Master Mix):\n`;
    text += `   - 取一只 1.5mL EP 管，标记为 "Tube A"\n`;
    text += `   - 加入 Opti-MEM: ${formatNum(tubeA.optiA)} µL\n`;
    text += `   - 加入 Lipofectamine 3000: ${formatNum(tubeA.lipo)} µL\n`;
    text += `   - 轻轻混匀 (Vortex 2-3秒 或 弹击管壁)\n\n`;

    text += `2. 准备试管 B (各个 siRNA 分组):\n`;
    groupResults.forEach(group => {
        text += `   [分组: ${group.name}]\n`;
        text += `   - 取管，加入 Opti-MEM: ${formatNum(group.optiB)} µL\n`;
        text += `   - 加入 ${group.name} siRNA: ${formatNum(group.sirna)} µL\n`;
        text += `   - 轻轻混匀\n`; 
    });
    text += `\n`;

    text += `3. 混合转染复合物:\n`;
    groupResults.forEach(group => {
        const volFromA = group.calcWells * (settings.optiA + settings.lipo);
        text += `   - 向 [${group.name}] 管中加入 Tube A 溶液: ${formatNum(volFromA)} µL\n`;
    });
    text += `   - 充分混匀，室温孵育 10-15 分钟。\n\n`;

    text += `4. 加样:\n`;
    const finalVolPerWell = (settings.optiA + settings.lipo) + (settings.optiB + settings.sirna);
    text += `   - 每孔滴加转染复合物: ${formatNum(finalVolPerWell)} µL\n`;
    text += `   - 轻轻摇晃培养板混匀，放回培养箱。\n`;

    document.getElementById('protocolText').value = text;
}

function formatNum(num) {
    // 避免出现 125.00000001 这种精度问题; 若是整数显示整数，否则1位小数
    return parseFloat(num.toFixed(1));
}

function copyProtocol() {
    const copyText = document.getElementById("protocolText");
    copyText.select();
    document.execCommand("copy");
    alert("流程已复制到剪贴板！");
}
