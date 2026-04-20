const XLSX = require('xlsx');

// ========== 时间配置（格式A：键名去掉空格） ==========
const TIME_SLOT_CONFIG = {
    '上午12节': { start: '08:00', end: '09:40' },
    '上午34节': { start: '10:00', end: '11:40' },
    '下午56节': { start: '14:00', end: '15:40' },
    '下午78节': { start: '16:00', end: '17:40' },
    '晚上910节': { start: '19:00', end: '20:40' },
    '晚上1112节': { start: '20:50', end: '22:30' },
};

// 备用：模糊匹配映射
const TIME_SLOT_FUZZY_MAP = [
    { pattern: /上午.*12/, slot: { start: '08:00', end: '09:40' } },
    { pattern: /上午.*34/, slot: { start: '10:00', end: '11:40' } },
    { pattern: /下午.*56/, slot: { start: '14:00', end: '15:40' } },
    { pattern: /下午.*78/, slot: { start: '16:00', end: '17:40' } },
    { pattern: /晚上.*910/, slot: { start: '19:00', end: '20:40' } },
    { pattern: /晚上.*1112/, slot: { start: '20:50', end: '22:30' } },
];

// ========== 格式B：时间节次映射 ==========
const TIME_SLOT_MAP_B = {
    '第1,2节': { start: '08:00', end: '09:40' },
    '第3,4节': { start: '10:00', end: '11:40' },
    '第5,6节': { start: '14:00', end: '15:40' },
    '第7,8节': { start: '16:00', end: '17:40' },
    '第9,10节': { start: '19:00', end: '20:40' },
    '第9,10,11节': { start: '19:00', end: '21:15' },
    '第11,12节': { start: '20:50', end: '22:30' },
};

// ========== 标准列格式：节次到时间映射 ==========
const SESSION_TO_TIME = {
    '1-2': { start: '08:00', end: '09:40' },
    '3-4': { start: '10:00', end: '11:40' },
    '5-6': { start: '14:00', end: '15:40' },
    '7-8': { start: '16:00', end: '17:40' },
    '9-10': { start: '19:00', end: '20:40' },
    '9-11': { start: '19:00', end: '21:15' },
    '11-12': { start: '20:50', end: '22:30' },
};

// ========== 标准列格式：星期映射 ==========
const DAY_NAME_TO_NUMBER = {
    '星期一': 1, '周一': 1, '一': 1,
    '星期二': 2, '周二': 2, '二': 2,
    '星期三': 3, '周三': 3, '三': 3,
    '星期四': 4, '周四': 4, '四': 4,
    '星期五': 5, '周五': 5, '五': 5,
    '星期六': 6, '周六': 6, '六': 6,
    '星期日': 7, '周日': 7, '日': 7, '星期天': 7, '周天': 7,
};

// ========== 格式B：星期映射 ==========
const DAY_MAP_B = {
    '周一': 1, '星期一': 1,
    '周二': 2, '星期二': 2,
    '周三': 3, '星期三': 3,
    '周四': 4, '星期四': 4,
    '周五': 5, '星期五': 5,
    '周六': 6, '星期六': 6,
    '周日': 7, '星期日': 7,
};

// ========== 星期识别正则（支持更多格式） ==========
const DAY_PATTERNS = [
    { day: 1, patterns: [/星期一/, /周一/, /Mon/i, /Monday/i, /^一$/, /^１$/] },
    { day: 2, patterns: [/星期二/, /周二/, /Tue/i, /Tuesday/i, /^二$/, /^２$/] },
    { day: 3, patterns: [/星期三/, /周三/, /Wed/i, /Wednesday/i, /^三$/, /^３$/] },
    { day: 4, patterns: [/星期四/, /周四/, /Thu/i, /Thursday/i, /^四$/, /^４$/] },
    { day: 5, patterns: [/星期五/, /周五/, /Fri/i, /Friday/i, /^五$/, /^５$/] },
    { day: 6, patterns: [/星期六/, /周六/, /Sat/i, /Saturday/i, /^六$/, /^６$/] },
    { day: 7, patterns: [/星期日/, /星期天/, /周日/, /周天/, /Sun/i, /Sunday/i, /^日$/, /^天$/, /^７$/] },
];

/**
 * 根据单元格内容识别星期几
 */
function recognizeDay(cellValue) {
    const cell = String(cellValue || '').trim();
    for (const { day, patterns } of DAY_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(cell)) {
                return day;
            }
        }
    }
    return null;
}

/**
 * 检测课表 Excel 的格式类型
 * @param {Array} rawData - 原始数据
 * @returns {string} 格式类型：'format_a' | 'format_b' | 'standard_columns' | 'unknown'
 */
function detectFormat(rawData) {
    const sampleRows = rawData.slice(0, 20);
    const sampleText = JSON.stringify(sampleRows);
    
    // 标准列格式特征：表头同时包含「课程」「教师」「星期」
    if (sampleRows.length > 0) {
        const headerRow = sampleRows[0] || [];
        const headerText = headerRow.map(cell => String(cell || '')).join('');
        const hasCourse = headerText.includes('课程');
        const hasTeacher = headerText.includes('教师');
        const hasDay = headerText.includes('星期') || headerText.includes('周');
        
        if (hasCourse && hasTeacher && hasDay) {
            console.log('检测到标准列格式');
            return 'standard_columns';
        }
    }
    
    // 格式B特征：包含「第1,2节（第1-16周）」这类模式
    if (sampleText.includes('第') && sampleText.includes('节（第') && sampleText.includes('周）')) {
        return 'format_b';
    }
    
    // 格式B特征：包含「周二第1,2节」这类模式
    const timePatternB = /(周[一二三四五六日]|星期[一二三四五六日])第[\d,]+节/;
    if (timePatternB.test(sampleText)) {
        return 'format_b';
    }
    
    // 格式A特征：第一列为「时间」，且包含「上午」「下午」
    const firstColumn = sampleRows.map(row => String(row[0] || '')).join('');
    if (firstColumn.includes('上午') && firstColumn.includes('下午')) {
        return 'format_a';
    }
    
    // 格式A特征：包含星期表头（使用更灵活的识别）
    for (const row of sampleRows) {
        let dayCount = 0;
        for (const cell of (row || [])) {
            if (recognizeDay(cell) !== null) {
                dayCount++;
            }
        }
        if (dayCount >= 3) {
            return 'format_a';
        }
    }
    
    return 'unknown';
}

// ========== 主解析函数 ==========
function parseCourseExcel(fileBuffer) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log('=== 课表解析开始 ===');
    console.log('总行数:', rawData.length);
    
    if (rawData.length === 0) {
        console.error('Excel文件为空');
        return { courses: [], error: 'Excel文件为空，请检查文件内容' };
    }
    
    // 检测格式
    const format = detectFormat(rawData);
    console.log('检测到的格式:', format);
    
    let courses = [];
    let parseError = null;
    
    if (format === 'standard_columns') {
        courses = parseStandardColumns(rawData);
    } else if (format === 'format_a') {
        courses = parseFormatA(rawData);
    } else if (format === 'format_b') {
        courses = parseFormatB(rawData);
    } else {
        // 尝试所有格式，取结果最多的
        console.log('未知格式，尝试所有解析方式...');
        const coursesStandard = parseStandardColumns(rawData);
        const coursesA = parseFormatA(rawData);
        const coursesB = parseFormatB(rawData);
        
        const allResults = [
            { name: '标准列格式', courses: coursesStandard },
            { name: '格式A', courses: coursesA },
            { name: '格式B', courses: coursesB }
        ];
        
        const best = allResults.reduce((prev, curr) => 
            curr.courses.length > prev.courses.length ? curr : prev
        );
        
        courses = best.courses;
        console.log('各格式解析结果:', allResults.map(r => `${r.name}:${r.courses.length}门`).join(', '));
        console.log('选择:', best.name);
    }
    
    console.log('解析完成，共', courses.length, '门课程');
    
    if (courses.length === 0) {
        parseError = '未能识别课表格式。请确保Excel包含星期表头（如"星期一"、"周一"、"一"等），或使用标准列格式（课程名称、教师、星期、节次、周次、地点）。';
    }
    
    return { courses, error: parseError };
}

/**
 * 解析格式 A 课表（原有格式）
 */
function parseFormatA(rawData) {
    const courses = [];
    
    // 找表头行（使用更灵活的识别方式）
    let headerRowIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i] || [];
        let dayCount = 0;
        for (const cell of row) {
            if (recognizeDay(cell) !== null) {
                dayCount++;
            }
        }
        // 如果一行中有3个以上星期识别，认为是表头行
        if (dayCount >= 3) {
            headerRowIndex = i;
            break;
        }
    }
    
    if (headerRowIndex === -1) {
        console.error('格式A：未找到表头行');
        console.log('前10行数据:');
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
            console.log(`行${i}:`, JSON.stringify(rawData[i]));
        }
        return courses;
    }
    
    console.log('表头行(索引', headerRowIndex, '):', JSON.stringify(rawData[headerRowIndex]));
    
    // 建立列索引到星期的映射（使用新的识别函数）
    const headerRow = rawData[headerRowIndex];
    const colToDay = {};
    for (let col = 0; col < headerRow.length; col++) {
        const day = recognizeDay(headerRow[col]);
        if (day !== null) {
            colToDay[col] = day;
        }
    }
    console.log('格式A 列->星期映射:', colToDay);
    
    // 当前时间段
    let currentTimeSlot = { start: '08:00', end: '09:40' };
    
    // 逐行扫描
    for (let row = headerRowIndex + 1; row < rawData.length; row++) {
        const dataRow = rawData[row] || [];
        const firstCell = String(dataRow[0] || '').trim();
        const secondCell = String(dataRow[1] || '').trim();
        
        // 检测时间段（合并第一列和第二列，去掉空格）
        const timeKey = (firstCell + secondCell).replace(/\s+/g, '');
        let timeSlot = TIME_SLOT_CONFIG[timeKey];
        
        // 精确匹配失败，尝试模糊匹配
        if (!timeSlot) {
            const combined = firstCell + secondCell;
            for (const item of TIME_SLOT_FUZZY_MAP) {
                if (item.pattern.test(combined)) {
                    timeSlot = item.slot;
                    console.log('模糊匹配时间段:', combined, '→', timeSlot);
                    break;
                }
            }
        }
        
        if (timeSlot) {
            currentTimeSlot = timeSlot;
            console.log('时间段切换:', timeKey, '→', timeSlot);
        }
        
        // 跳过空行
        if (dataRow.every(cell => !String(cell).trim())) {
            continue;
        }
        
        // 扫描所有列
        for (let col = 0; col < dataRow.length; col++) {
            const cellValue = String(dataRow[col] || '').trim();
            if (!cellValue) continue;
            
            const dayOfWeek = colToDay[col];
            if (!dayOfWeek) continue;
            
            // 判断是否是课程名行
            if (isCourseNameRow(cellValue)) {
                const course = extractCourseInfo(rawData, row, col, dayOfWeek, currentTimeSlot);
                if (course) {
                    // 去重
                    const exists = courses.some(c => 
                        c.name === course.name && 
                        c.dayOfWeek === course.dayOfWeek && 
                        c.startTime === course.startTime &&
                        c.teacher === course.teacher
                    );
                    if (!exists) {
                        courses.push(course);
                    }
                }
            }
        }
    }
    
    return courses;
}

/**
 * 解析格式 B 课表（新格式）
 */
function parseFormatB(rawData) {
    const courses = [];
    
    // 遍历所有单元格，查找课程信息
    for (let row = 0; row < rawData.length; row++) {
        for (let col = 0; col < (rawData[row]?.length || 0); col++) {
            const cell = String(rawData[row][col] || '').trim();
            
            // 查找包含时间信息的单元格（如「周二第1,2节（第1-16周）」）
            const timePattern = /(周[一二三四五六日]|星期[一二三四五六日])第([\d,]+)节[（(]第(\d+)[-~～](\d+)周[）)]/;
            const match = cell.match(timePattern);
            
            if (match) {
                const dayStr = match[1];
                const sessionStr = '第' + match[2] + '节';
                const startWeek = parseInt(match[3]);
                const endWeek = parseInt(match[4]);
                
                const dayOfWeek = DAY_MAP_B[dayStr];
                
                // 课程名通常在附近单元格（同行或上一行）
                let courseName = '';
                let teacher = '';
                let location = '';
                
                // 查找课程名（当前格或左边格）
                if (col > 0) {
                    const leftCell = String(rawData[row][col - 1] || '').trim();
                    if (leftCell && !leftCell.includes('第') && !leftCell.includes('周') && leftCell.length > 2) {
                        courseName = leftCell;
                    }
                }
                
                // 如果左边没找到，尝试上一行同列
                if (!courseName && row > 0) {
                    const upperCell = String(rawData[row - 1][col] || '').trim();
                    if (upperCell && !upperCell.includes('第') && !upperCell.includes('周') && upperCell.length > 2) {
                        courseName = upperCell;
                    }
                }
                
                // 查找教师（下一行同列）
                if (row + 1 < rawData.length) {
                    const teacherCell = String(rawData[row + 1][col] || '').trim();
                    // 教师名通常是2-4个中文字符
                    if (teacherCell && /^[\u4e00-\u9fa5]{2,4}$/.test(teacherCell)) {
                        teacher = teacherCell;
                    }
                }
                
                // 查找地点（再下一行同列或同行其他位置）
                if (row + 2 < rawData.length) {
                    location = String(rawData[row + 2][col] || '').trim();
                    // 清理地点中的编号信息
                    location = location.replace(/[（(]\d{4}[^）)]*[）)]/g, '').trim();
                }
                
                if (courseName && dayOfWeek) {
                    const timeSlot = TIME_SLOT_MAP_B[sessionStr] || { start: '08:00', end: '09:40' };
                    
                    const course = {
                        name: courseName,
                        teacher: teacher || '待定',
                        classroom: location || '待定',
                        dayOfWeek: dayOfWeek,
                        startTime: timeSlot.start,
                        endTime: timeSlot.end,
                        startWeek: startWeek,
                        endWeek: endWeek,
                        weeks: { start: startWeek, end: endWeek },
                        weeksDisplay: `${startWeek}-${endWeek}周`
                    };
                    
                    // 去重
                    const exists = courses.some(c => 
                        c.name === course.name && 
                        c.dayOfWeek === course.dayOfWeek && 
                        c.startTime === course.startTime
                    );
                    
                    if (!exists) {
                        console.log('格式B解析课程:', course.name, '周', dayOfWeek, sessionStr, `${startWeek}-${endWeek}周`);
                        courses.push(course);
                    }
                }
            }
        }
    }
    
    return courses;
}

/**
 * 解析标准列格式课表
 * 表头：星期、课程名称、教师、节次、周次、地点
 */
function parseStandardColumns(rawData) {
    const courses = [];
    
    if (rawData.length < 2) {
        console.error('标准列格式：数据行数不足');
        return courses;
    }
    
    const headerRow = rawData[0] || [];
    console.log('标准列格式表头:', headerRow);
    
    // 建立列名到索引的映射
    const colIndex = {};
    for (let i = 0; i < headerRow.length; i++) {
        const colName = String(headerRow[i] || '').trim();
        if (colName.includes('星期') || colName === '周') {
            colIndex.day = i;
        } else if (colName.includes('课程名称') || colName === '课程') {
            colIndex.name = i;
        } else if (colName.includes('教师')) {
            colIndex.teacher = i;
        } else if (colName.includes('节次') || colName === '节') {
            colIndex.session = i;
        } else if (colName.includes('周次')) {
            colIndex.weeks = i;
        } else if (colName.includes('地点') || colName.includes('教室')) {
            colIndex.classroom = i;
        }
    }
    
    console.log('列索引映射:', colIndex);
    
    // 检查必要列是否存在
    if (colIndex.name === undefined) {
        console.error('标准列格式：未找到课程名称列');
        return courses;
    }
    
    // 解析数据行
    for (let row = 1; row < rawData.length; row++) {
        const dataRow = rawData[row] || [];
        
        // 获取课程名称
        const courseName = colIndex.name !== undefined 
            ? String(dataRow[colIndex.name] || '').trim() 
            : '';
        
        if (!courseName) {
            continue;
        }
        
        // 解析星期
        let dayOfWeek = 1;
        if (colIndex.day !== undefined) {
            const dayStr = String(dataRow[colIndex.day] || '').trim();
            dayOfWeek = DAY_NAME_TO_NUMBER[dayStr] || parseDayFromText(dayStr) || 1;
        }
        
        // 解析教师
        const teacher = colIndex.teacher !== undefined 
            ? String(dataRow[colIndex.teacher] || '').trim() || '待定'
            : '待定';
        
        // 解析节次
        let startTime = '08:00';
        let endTime = '09:40';
        if (colIndex.session !== undefined) {
            const sessionStr = String(dataRow[colIndex.session] || '').trim();
            const timeSlot = parseSession(sessionStr);
            if (timeSlot) {
                startTime = timeSlot.start;
                endTime = timeSlot.end;
            }
        }
        
        // 解析周次
        let weeks = null;
        let weeksDisplay = '全学期';
        if (colIndex.weeks !== undefined) {
            const weeksStr = String(dataRow[colIndex.weeks] || '').trim();
            const weeksResult = parseWeeks(weeksStr);
            if (weeksResult) {
                weeks = weeksResult;
                weeksDisplay = `${weeks.start}-${weeks.end}周`;
            }
        }
        
        // 解析地点
        const classroom = colIndex.classroom !== undefined 
            ? String(dataRow[colIndex.classroom] || '').trim() || '待定'
            : '待定';
        
        const course = {
            name: courseName,
            teacher: teacher,
            classroom: classroom,
            dayOfWeek: dayOfWeek,
            startTime: startTime,
            endTime: endTime,
            weeks: weeks,
            weeksDisplay: weeksDisplay
        };
        
        // 去重
        const exists = courses.some(c => 
            c.name === course.name && 
            c.dayOfWeek === course.dayOfWeek && 
            c.startTime === course.startTime
        );
        
        if (!exists) {
            console.log('标准列格式解析课程:', course.name, '周', dayOfWeek, `${startTime}-${endTime}`, weeksDisplay);
            courses.push(course);
        }
    }
    
    return courses;
}

/**
 * 从文本中解析星期
 */
function parseDayFromText(text) {
    for (const { day, patterns } of DAY_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return day;
            }
        }
    }
    return null;
}

/**
 * 解析节次字符串
 * 支持：1-2节、9-11节、第1-2节等格式
 */
function parseSession(sessionStr) {
    const str = sessionStr.replace(/[节第\s]/g, '');
    
    // 匹配数字范围：1-2, 9-11 等
    const match = str.match(/(\d+)\s*[-~～]\s*(\d+)/);
    if (match) {
        const key = `${match[1]}-${match[2]}`;
        if (SESSION_TO_TIME[key]) {
            return SESSION_TO_TIME[key];
        }
    }
    
    // 尝试直接查找
    if (SESSION_TO_TIME[str]) {
        return SESSION_TO_TIME[str];
    }
    
    return null;
}

/**
 * 解析周次字符串
 * 支持：1-16周、2-5周、第1-16周等格式
 */
function parseWeeks(weeksStr) {
    const str = weeksStr.replace(/[周第\s]/g, '');
    
    // 匹配数字范围
    const match = str.match(/(\d+)\s*[-~～]\s*(\d+)/);
    if (match) {
        return {
            start: parseInt(match[1]),
            end: parseInt(match[2])
        };
    }
    
    // 单周次
    const singleMatch = str.match(/^(\d+)$/);
    if (singleMatch) {
        const week = parseInt(singleMatch[1]);
        return { start: week, end: week };
    }
    
    return null;
}

/**
 * 判断是否是课程名行
 */
function isCourseNameRow(cellValue) {
    const str = String(cellValue);
    
    // 排除教师名（纯中文2-4字）
    if (/^[\u4e00-\u9fa5]{2,4}$/.test(str) && !str.includes('概论') && !str.includes('英语')) {
        return false;
    }
    
    // 排除地点信息
    if (str.includes('幢') || str.includes('楼') || (str.includes('-') && str.length < 15)) {
        return false;
    }
    
    // 排除纯数字
    if (/^\d+$/.test(str)) {
        return false;
    }
    
    return str.length > 2;
}

/**
 * 提取完整课程信息（格式A）
 */
function extractCourseInfo(rawData, startRow, col, dayOfWeek, timeSlot) {
    const courseNameRaw = String(rawData[startRow][col] || '').trim();
    
    let courseName = courseNameRaw
        .replace(/[\(（]\d+[-]?\d*节[\)）]?/g, '')
        .replace(/[\(（]\d+节[\)）]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    if (!courseName) {
        courseName = courseNameRaw;
    }
    
    // 向下查找教师（下一行）
    let teacher = '';
    if (startRow + 1 < rawData.length) {
        const nextRow = rawData[startRow + 1] || [];
        teacher = String(nextRow[col] || '').trim();
    }
    
    // 向下查找地点+周次（再下一行）
    let classroom = '';
    let weeks = null;
    let weeksDisplay = '';
    
    if (startRow + 2 < rawData.length) {
        const row2 = rawData[startRow + 2] || [];
        const locationCell = String(row2[col] || '').trim();
        
        if (locationCell) {
            const parts = parseLocationAndWeeks(locationCell);
            classroom = parts.classroom;
            weeks = parts.weeks;
            weeksDisplay = parts.weeksDisplay;
        }
    }
    
    // 如果教师为空，尝试从下一行的同一列找
    if (!teacher && startRow + 1 < rawData.length) {
        const nextRow = rawData[startRow + 1] || [];
        teacher = String(nextRow[col] || '').trim();
    }
    
    console.log('解析课程:', { 
        name: courseName, 
        teacher: teacher || '待定', 
        classroom: classroom || '待定', 
        weeks: weeksDisplay,
        day: dayOfWeek,
        time: `${timeSlot.start}-${timeSlot.end}`
    });
    
    return {
        name: courseName,
        teacher: teacher || '待定',
        classroom: classroom || '待定',
        dayOfWeek: dayOfWeek,
        startTime: timeSlot.start,
        endTime: timeSlot.end,
        weeks: weeks,
        weeksDisplay: weeksDisplay
    };
}

/**
 * 解析地点+周次合并的字符串
 */
function parseLocationAndWeeks(cellValue) {
    const str = String(cellValue).trim();
    
    // 匹配周次部分
    const weekMatch = str.match(/(\d+)\s*[-~～]\s*(\d+)\s*$/);
    
    let classroom = str;
    let weeks = null;
    let weeksDisplay = '';
    
    if (weekMatch) {
        const start = parseInt(weekMatch[1]);
        const end = parseInt(weekMatch[2]);
        weeks = { start, end };
        weeksDisplay = `${start}-${end}周`;
        
        classroom = str.substring(0, weekMatch.index).trim();
    }
    
    return { classroom, weeks, weeksDisplay };
}

function validateExcelFile(fileBuffer) {
    if (!fileBuffer || fileBuffer.length === 0) {
        return { valid: false, message: '文件内容为空' };
    }
    try {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            return { valid: false, message: '无法读取Excel文件' };
        }
        return { valid: true };
    } catch (error) {
        return { valid: false, message: '文件格式不正确' };
    }
}

// ========== 导出配置 ==========
const DAY_NUMBER_TO_NAME = {
    1: '星期一', 2: '星期二', 3: '星期三', 4: '星期四',
    5: '星期五', 6: '星期六', 7: '星期日'
};

const TIME_TO_SESSION = [
    { start: '08:00', end: '09:40', label: '1-2节' },
    { start: '10:00', end: '11:40', label: '3-4节' },
    { start: '14:00', end: '15:40', label: '5-6节' },
    { start: '16:00', end: '17:40', label: '7-8节' },
    { start: '19:00', end: '20:40', label: '9-10节' },
    { start: '19:00', end: '21:15', label: '9-11节' },
    { start: '20:50', end: '22:30', label: '11-12节' }
];

function getTimeSessionLabel(startTime, endTime) {
    const exact = TIME_TO_SESSION.find(s => s.start === startTime && s.end === endTime);
    if (exact) return exact.label;
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    for (const slot of TIME_TO_SESSION) {
        const slotStart = timeToMinutes(slot.start);
        const slotEnd = timeToMinutes(slot.end);
        if (startMinutes >= slotStart && endMinutes <= slotEnd) {
            return slot.label;
        }
    }
    
    return `${startTime}-${endTime}`;
}

function timeToMinutes(timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    return parseInt(match[1]) * 60 + parseInt(match[2]);
}

/**
 * 导出课表为标准列格式Excel
 * @param {Array} courses - 课程数据数组
 * @param {string} semesterName - 学期名称
 * @returns {Buffer} Excel文件buffer
 */
function exportCourseExcel(courses, semesterName = '课表') {
    const rows = [
        ['星期', '课程名称', '教师', '节次', '周次', '地点']
    ];
    
    const dayOrder = [1, 2, 3, 4, 5, 6, 7];
    const sortedCourses = [...courses].sort((a, b) => {
        const dayDiff = (a.dayOfWeek || 1) - (b.dayOfWeek || 1);
        if (dayDiff !== 0) return dayDiff;
        return (a.startTime || '').localeCompare(b.startTime || '');
    });
    
    for (const course of sortedCourses) {
        const dayName = DAY_NUMBER_TO_NAME[course.dayOfWeek] || '星期一';
        const sessionLabel = getTimeSessionLabel(course.startTime, course.endTime);
        const weeksLabel = course.weeks 
            ? `${course.weeks.start}-${course.weeks.end}周` 
            : '1-16周';
        
        rows.push([
            dayName,
            course.name || '',
            course.teacher || '',
            sessionLabel,
            weeksLabel,
            course.classroom || ''
        ]);
    }
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    
    worksheet['!cols'] = [
        { wch: 10 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 20 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '课表');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 导出课表为表格格式Excel（周视图）
 * @param {Array} courses - 课程数据数组
 * @param {string} semesterName - 学期名称
 * @returns {Buffer} Excel文件buffer
 */
function exportCourseExcelTable(courses, semesterName = '课表') {
    const timeSlots = [
        { label: '第1-2节', time: '08:00-09:40' },
        { label: '第3-4节', time: '10:00-11:40' },
        { label: '第5-6节', time: '14:00-15:40' },
        { label: '第7-8节', time: '16:00-17:40' },
        { label: '第9-10节', time: '19:00-20:40' }
    ];
    
    const dayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
    
    const header = ['时间', ...dayNames];
    const rows = [header];
    
    for (const slot of timeSlots) {
        const row = [slot.label];
        
        for (let day = 1; day <= 7; day++) {
            const course = courses.find(c => {
                if (c.dayOfWeek !== day) return false;
                const session = getTimeSessionLabel(c.startTime, c.endTime);
                return session === slot.label || 
                       (c.startTime && c.startTime.startsWith(slot.time.split('-')[0]));
            });
            
            if (course) {
                const info = [
                    course.name || '',
                    course.teacher || '',
                    course.classroom || ''
                ].filter(s => s && s !== '待定').join('\n');
                row.push(info || course.name || '');
            } else {
                row.push('');
            }
        }
        
        rows.push(row);
    }
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    
    worksheet['!cols'] = [
        { wch: 12 },
        { wch: 18 }, { wch: 18 }, { wch: 18 },
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }
    ];
    
    worksheet['!rows'] = rows.map((_, i) => i === 0 ? { hpt: 20 } : { hpt: 60 });
    
    XLSX.utils.book_append_sheet(workbook, worksheet, semesterName.substring(0, 31));
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { 
    parseCourseExcel, 
    validateExcelFile,
    exportCourseExcel,
    exportCourseExcelTable
};
