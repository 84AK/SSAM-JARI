/**
 * 쌤자리 (SSAM-ZARI) - Core Logic
 * 2026-05-15
 */

// --- State Management ---
const state = {
    currentScreen: 'attendance',
    gasUrl: localStorage.getItem('ssam_zari_gas_url') || '',
    classes: ['1반', '2반', '3반'],
    selectedClass: localStorage.getItem('ssam_seating_class') || '',
    selectedDate: new Date().toISOString().split('T')[0],
    students: [],
    isLoading: false,
    tempUploadData: [],
    filterSchool: 'all',
    filterClass: 'all',
    attendanceSchool: 'all',
    attendanceGrade: 'all',
    attendanceClass: 'all',
    seatingCols: parseInt(localStorage.getItem('ssam_seating_cols')) || 5,
    seatingRows: parseInt(localStorage.getItem('ssam_seating_rows')) || 4,
    seatingSchool: localStorage.getItem('ssam_seating_school') || 'all',
    seatingGrade: localStorage.getItem('ssam_seating_grade') || 'all',
    disabledSlots: JSON.parse(localStorage.getItem('ssam_disabled_slots') || '{}'),
};

// --- Local Storage Sync ---
function syncToLocal() {
    localStorage.setItem('ssam_zari_students', JSON.stringify(state.students));
}

function loadFromLocal() {
    const saved = localStorage.getItem('ssam_zari_students');
    if (saved) state.students = JSON.parse(saved);
}

// --- Screen Templates ---
const screens = {
    attendance: () => {
        const schools = getUniqueValues('school');
        const grades = getUniqueValues('grade');
        const classes = getUniqueValues('class');

        return `
        <div class="animate-slide-up" style="display:flex;flex-direction:column;gap:20px;">

            <!-- 날짜 선택 -->
            <div class="card" style="padding:18px 20px;">
                <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:8px;">📅 수업 날짜</label>
                <input type="date" value="${state.selectedDate}" onchange="updateState('selectedDate', this.value)"
                    style="background:none;border:none;font-size:17px;font-weight:700;color:var(--text-primary);width:100%;outline:none;font-family:'Outfit',sans-serif;">
            </div>

            <!-- 필터 -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
                <div class="card" style="padding:14px 16px;">
                    <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:8px;">학교</label>
                    <select onchange="state.attendanceSchool = this.value; switchScreen('attendance')"
                        style="background:none;border:none;font-size:14px;font-weight:700;color:var(--text-primary);width:100%;outline:none;font-family:'Outfit',sans-serif;cursor:pointer;">
                        <option value="all">전체</option>
                        ${schools.map(s => `<option value="${s}" ${state.attendanceSchool === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="card" style="padding:14px 16px;">
                    <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:8px;">학년</label>
                    <select onchange="state.attendanceGrade = this.value; switchScreen('attendance')"
                        style="background:none;border:none;font-size:14px;font-weight:700;color:var(--text-primary);width:100%;outline:none;font-family:'Outfit',sans-serif;cursor:pointer;">
                        <option value="all">전체</option>
                        ${grades.map(g => `<option value="${g}" ${String(state.attendanceGrade) === String(g) ? 'selected' : ''}>${g}학년</option>`).join('')}
                    </select>
                </div>
                <div class="card" style="padding:14px 16px;">
                    <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:8px;">반</label>
                    <select onchange="state.attendanceClass = this.value; switchScreen('attendance')"
                        style="background:none;border:none;font-size:14px;font-weight:700;color:var(--text-primary);width:100%;outline:none;font-family:'Outfit',sans-serif;cursor:pointer;">
                        <option value="all">전체</option>
                        ${classes.map(c => `<option value="${c}" ${state.attendanceClass === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- 출석 목록 -->
            <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <h2 class="screen-title" style="font-size:20px;">✅ 출석 목록</h2>
                    <span class="stat-chip blue">${state.attendanceSchool === 'all' ? '전체 학교' : state.attendanceSchool}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:12px;" id="attendance-list">
                    ${renderAttendanceList()}
                </div>
            </div>

            <!-- 저장 버튼 -->
            <button onclick="saveAttendance()" class="btn btn-primary" style="width:100%;padding:16px;font-size:16px;border-radius:18px;">
                <i data-lucide="save" style="width:20px;height:20px;"></i>
                출석부 저장하기
            </button>

        </div>
        `;
    },
    seating: () => {
        const schools = getUniqueValues('school');
        const grades = getUniqueValues('grade');
        const filteredClasses = getSeatingFilteredClasses();
        const cols = state.seatingCols;
        const rows = state.seatingRows;
        const totalSeats = cols * rows;
        const classStudents = state.selectedClass
            ? state.students.filter(s => s.class === state.selectedClass)
            : [];
        const occupiedCount = classStudents.filter(s => s.position !== null).length;
        const unassignedCount = classStudents.filter(s => s.position === null).length;

        return `
        <div class="animate-slide-up" style="display:flex;flex-direction:column;gap:20px;">

            <!-- 타이틀 + 버튼 -->
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                <h2 class="screen-title">🪑 자리 배치</h2>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="saveSeatingToGAS()" class="btn-sm btn-success" style="padding:10px 16px;font-size:13px;border-radius:12px;border:none;cursor:pointer;font-weight:700;color:#fff;background:#10b981;">
                        ☁️ 시트 저장
                    </button>
                    <button onclick="autoArrange()" class="btn-sm btn-ghost" style="padding:10px 16px;font-size:13px;border-radius:12px;cursor:pointer;font-weight:700;">자동 정렬</button>
                    <button onclick="clearSeating()" class="btn-sm btn-danger-ghost" style="padding:10px 16px;font-size:13px;border-radius:12px;cursor:pointer;font-weight:700;">초기화</button>
                </div>
            </div>

            <!-- ① 그리드 설정 -->
            <div class="card" style="padding:20px 24px;">
                <p class="section-label" style="margin-bottom:14px;">① 자리 그리드 설정</p>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
                    <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;">가로 (열 수)</label>
                        <input type="number" min="1" max="12" value="${cols}"
                            onchange="state.seatingCols = Math.max(1, parseInt(this.value)||1); localStorage.setItem('ssam_seating_cols', state.seatingCols); switchScreen('seating')"
                            class="form-input" style="text-align:center;font-size:22px;font-weight:900;padding:14px;">
                    </div>
                    <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;">세로 (행 수)</label>
                        <input type="number" min="1" max="12" value="${rows}"
                            onchange="state.seatingRows = Math.max(1, parseInt(this.value)||1); localStorage.setItem('ssam_seating_rows', state.seatingRows); switchScreen('seating')"
                            class="form-input" style="text-align:center;font-size:22px;font-weight:900;padding:14px;">
                    </div>
                    <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;">총 자리 수</label>
                        <div style="text-align:center;font-size:22px;font-weight:900;padding:14px;border-radius:var(--radius-sm);background:rgba(99,102,241,0.08);border:2px solid rgba(99,102,241,0.2);color:var(--accent);">${totalSeats}</div>
                    </div>
                </div>
            </div>

            <!-- ② 학생 불러오기 -->
            <div class="card" style="padding:20px 24px;">
                <p class="section-label" style="margin-bottom:14px;">② 학생 불러오기</p>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
                    <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;">학교</label>
                        <select onchange="state.seatingSchool = this.value; localStorage.setItem('ssam_seating_school', this.value); switchScreen('seating')"
                            class="form-select" style="padding:12px 14px;font-size:14px;cursor:pointer;">
                            <option value="all">전체</option>
                            ${schools.map(s => `<option value="${s}" ${state.seatingSchool === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;">학년</label>
                        <select onchange="state.seatingGrade = this.value; localStorage.setItem('ssam_seating_grade', this.value); switchScreen('seating')"
                            class="form-select" style="padding:12px 14px;font-size:14px;cursor:pointer;">
                            <option value="all">전체</option>
                            ${grades.map(g => `<option value="${g}" ${String(state.seatingGrade) === String(g) ? 'selected' : ''}>${g}학년</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;">반</label>
                        <select onchange="state.selectedClass = this.value; localStorage.setItem('ssam_seating_class', this.value); switchScreen('seating')"
                            class="form-select" style="padding:12px 14px;font-size:14px;cursor:pointer;">
                            <option value="">선택</option>
                            ${filteredClasses.map(c => `<option value="${c}" ${state.selectedClass === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                ${state.selectedClass ? `<p style="font-size:13px;font-weight:700;color:#059669;margin-top:12px;">✓ ${state.selectedClass} 학생 ${classStudents.length}명 로드됨</p>` : '<p style="font-size:13px;color:var(--text-faint);margin-top:12px;">반을 선택하면 학생 리스트가 자동으로 표시됩니다.</p>'}
            </div>

            ${state.selectedClass ? `
            <!-- Stats -->
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <span class="stat-chip slate">자리 ${totalSeats}칸</span>
                <span class="stat-chip blue">전체 ${classStudents.length}명</span>
                <span class="stat-chip green">배치됨 ${occupiedCount}명</span>
                <span class="stat-chip amber">대기 ${unassignedCount}명</span>
            </div>

            <!-- 그리드 -->
            <div id="seating-grid" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr));">
                ${renderSeatingGrid()}
            </div>

            <!-- 배치 대기 풀 -->
            <div class="card" style="padding:20px 24px;">
                <p class="section-label" style="margin-bottom:12px;">배치 대기 (${unassignedCount}명)</p>
                <div id="unassigned-zone" style="display:flex;flex-wrap:wrap;gap:10px;min-height:48px;"
                    ondragover="allowDrop(event)" ondrop="dropToUnassigned(event)">
                    ${renderUnassignedStudents()}
                </div>
            </div>
            <p style="font-size:12px;color:var(--text-faint);text-align:center;">빈 슬롯 더블클릭 → 비활성화/활성화 | 학생 드래그 → 이동/교환</p>
            ` : `
            <div class="card" style="padding:48px 24px;text-align:center;">
                <p style="font-size:40px;margin-bottom:12px;">🏫</p>
                <p style="font-size:16px;font-weight:700;color:var(--text-muted);">②단계에서 학교 → 학년 → 반을 선택하면</p>
                <p style="font-size:14px;color:var(--text-faint);margin-top:6px;">학생 리스트를 불러와 자리를 배치할 수 있습니다.</p>
            </div>
            `}
        </div>
        `;
    },
    management: () => {
        const schools = getUniqueValues('school');
        const classes = getUniqueValues('class');
        
        return `
        <div class="animate-slide-up" style="display:flex;flex-direction:column;gap:20px;">

            <!-- 타이틀 + 버튼 -->
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                <h2 class="screen-title">📋 명단 관리</h2>
                <div style="display:flex;gap:8px;">
                    <button onclick="triggerFileUpload()" class="btn-sm btn-ghost" style="padding:10px 16px;font-size:13px;border-radius:12px;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;">
                        📄 파일 업로드
                    </button>
                    <button onclick="openMultiAddModal()" class="btn-sm" style="padding:10px 16px;font-size:13px;border-radius:12px;cursor:pointer;font-weight:700;background:var(--accent);color:#fff;border:none;">
                        ✏️ 직접 입력
                    </button>
                </div>
            </div>

            <!-- 필터 -->
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">
                <div class="card" style="padding:16px 20px;">
                    <label style="display:block;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">학교 필터</label>
                    <select onchange="state.filterSchool = this.value; switchScreen('management')"
                        style="background:none;border:none;font-size:15px;font-weight:700;color:var(--text-primary);width:100%;outline:none;font-family:'Outfit',sans-serif;cursor:pointer;">
                        <option value="all">전체 학교</option>
                        ${schools.map(s => `<option value="${s}" ${state.filterSchool === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="card" style="padding:16px 20px;">
                    <label style="display:block;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">반 필터</label>
                    <select onchange="state.filterClass = this.value; switchScreen('management')"
                        style="background:none;border:none;font-size:15px;font-weight:700;color:var(--text-primary);width:100%;outline:none;font-family:'Outfit',sans-serif;cursor:pointer;">
                        <option value="all">전체 반</option>
                        ${classes.map(c => `<option value="${c}" ${state.filterClass === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- 학생 목록 -->
            <div style="display:flex;flex-direction:column;gap:10px;">
                ${renderManagementList()}
            </div>
        </div>
        `;
    },
    settings: () => `
        <div class="animate-slide-up" style="display:flex;flex-direction:column;gap:24px;">
            <h2 class="screen-title">⚙️ 시스템 설정</h2>

            <!-- Google Sheets 연동 -->
            <div class="card" style="padding:24px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                    <span style="font-size:22px;">📊</span>
                    <h3 style="font-size:18px;font-weight:800;color:var(--text-primary);">Google Sheets 연동</h3>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">GAS 웹앱 URL</label>
                    <input type="text" id="gas-url-input" value="${state.gasUrl}" placeholder="https://script.google.com/macros/s/..."
                        class="form-input" style="font-size:14px;padding:14px 16px;">
                </div>
                <button onclick="saveSettings()" class="btn btn-primary" style="width:100%;padding:16px;font-size:16px;border-radius:14px;">
                    설정 저장
                </button>
            </div>

            <!-- 사용 가이드 -->
            <div class="card" style="padding:24px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                    <span style="font-size:22px;">📖</span>
                    <h3 style="font-size:18px;font-weight:800;color:var(--text-primary);">사용 가이드</h3>
                </div>
                <ol style="font-size:14px;color:var(--text-muted);line-height:2;padding-left:20px;font-weight:600;">
                    <li>제공된 GAS 코드를 구글 시트 도구 > 스크립트 편집기에 붙여넣으세요.</li>
                    <li>웹앱으로 배포하고 생성된 URL을 위에 입력하세요.</li>
                    <li>학생 명단을 입력하고 출석을 체크하면 시트에 자동 기록됩니다.</li>
                </ol>
            </div>
        </div>
    `
};

// --- Rendering Helpers ---
function renderAttendanceList() {
    const filtered = state.students.filter(s =>
        (state.attendanceSchool === 'all' || s.school === state.attendanceSchool) &&
        (state.attendanceGrade === 'all' || String(s.grade) === String(state.attendanceGrade)) &&
        (state.attendanceClass === 'all' || s.class === state.attendanceClass)
    );
    if (filtered.length === 0) return `
        <div class="card" style="padding:40px 20px;text-align:center;">
            <p style="font-size:32px;margin-bottom:10px;">🔍</p>
            <p style="font-size:15px;font-weight:600;color:var(--text-muted);">필터에 해당하는 학생이 없습니다.</p>
        </div>`;

    return filtered.map(s => `
        <div class="card card-hover" style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
            <div>
                <p style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:0.04em;margin-bottom:4px;">
                    ${s.school ? s.school + ' · ' : ''}${s.grade ? s.grade + '학년 ' : ''}${s.class}
                </p>
                <p style="font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:-0.02em;">
                    ${s.number ? s.number + '. ' : ''}${s.name}
                </p>
            </div>
            <div class="attendance-group">
                <button onclick="toggleAttendance(${s.id}, 'present')" class="attendance-btn present ${s.attendance === 'present' ? 'selected' : ''}">출석</button>
                <button onclick="toggleAttendance(${s.id}, 'absent')" class="attendance-btn absent ${s.attendance === 'absent' ? 'selected' : ''}">결석</button>
            </div>
        </div>
    `).join('');
}

function renderSeatingGrid() {
    const cols = state.seatingCols;
    const rows = state.seatingRows;
    const totalSlots = cols * rows;
    const classStudents = state.selectedClass
        ? state.students.filter(s => s.class === state.selectedClass)
        : [];
    const maxPos = classStudents.reduce((max, s) => s.position !== null ? Math.max(max, s.position) : max, -1);
    const actualTotal = Math.ceil(Math.max(totalSlots, maxPos + 1) / cols) * cols;
    const disabled = state.disabledSlots[state.selectedClass] || [];

    let html = '';
    for (let i = 0; i < actualTotal; i++) {
        const student = classStudents.find(s => s.position === i);
        const isDisabled = disabled.includes(i);

        if (isDisabled) {
            html += `
            <div class="seat-slot disabled" data-index="${i}" ondblclick="toggleSlotDisabled(${i})" title="더블클릭으로 활성화">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:rgba(255,255,255,0.2)">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </div>`;
        } else if (student) {
            html += `
            <div class="seat-slot occupied" data-index="${i}" ondragover="seatDragOver(event)" ondrop="seatDrop(event, ${i})" ondragleave="seatDragLeave(event)">
                <div class="student-card" draggable="true" data-student-id="${student.id}" data-slot="${i}"
                    ondragstart="studentDragStart(event)" ondragend="studentDragEnd(event)">
                    <span style="font-size:11px;color:var(--text-muted);font-weight:700;">${student.number || ''}</span>
                    <span style="font-size:14px;font-weight:800;color:var(--text-primary);">${student.name}</span>
                    <span style="position:absolute;bottom:4px;right:6px;font-size:9px;color:var(--accent);opacity:0.5;font-weight:700;font-family:monospace;">#${i}</span>
                </div>
            </div>`;
        } else {
            html += `
            <div class="seat-slot empty" data-index="${i}" ondragover="seatDragOver(event)" ondrop="seatDrop(event, ${i})" ondragleave="seatDragLeave(event)" ondblclick="toggleSlotDisabled(${i})" title="더블클릭으로 비활성화" style="position:relative;">
                <span style="position:absolute;bottom:4px;right:6px;font-size:9px;color:var(--text-faint);opacity:0.4;font-weight:700;font-family:monospace;">#${i}</span>
            </div>`;
        }
    }
    return html;
}

function renderUnassignedStudents() {
    const unassigned = state.students.filter(s => s.class === state.selectedClass && s.position === null);
    if (unassigned.length === 0) return '<p style="font-size:11px;color:#475569;">모든 학생이 배치되었습니다 🎉</p>';
    return unassigned.map(s => `
        <div class="unassigned-card" draggable="true" data-student-id="${s.id}" data-slot="-1"
            ondragstart="studentDragStart(event)" ondragend="studentDragEnd(event)">
            ${s.number ? s.number + '. ' : ''}${s.name}
        </div>
    `).join('');
}

// --- Core Actions ---
function switchScreen(screenName) {
    state.currentScreen = screenName;
    
    // Update nav UI
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.screen === screenName);
    });

    // Render content
    const contentArea = document.getElementById('main-content');
    contentArea.innerHTML = screens[screenName]();
    
    // Re-init icons
    lucide.createIcons();
}

function updateState(key, value) {
    state[key] = value;
    switchScreen(state.currentScreen); // Re-render
}

function toggleAttendance(studentId, status) {
    const student = state.students.find(s => s.id === studentId);
    if (student) {
        student.attendance = status;
        syncToLocal();
        switchScreen(state.currentScreen);
        showToast(`${student.name} 학생 ${status === 'present' ? '출석' : '결석'} 처리됨`, status === 'present' ? 'check' : 'x');
    }
}

async function fetchStudents() {
    if (!state.gasUrl) return;
    setLoading(true);
    try {
        const response = await fetch(`${state.gasUrl}?action=getStudents`);
        const data = await response.json();
        if (data.status === 'success') {
            state.students = data.data;
            syncToLocal();
            showToast('데이터를 동기화했습니다!', 'refresh-cw');
            switchScreen(state.currentScreen);
        }
    } catch (error) {
        console.error(error);
        showToast('데이터를 가져오는데 실패했습니다.', 'alert-triangle');
    } finally {
        setLoading(false);
    }
}

async function saveAttendance() {
    if (!state.gasUrl) {
        showToast('설정에서 GAS URL을 먼저 입력해주세요.', 'alert-circle');
        return;
    }
    
    setLoading(true);
    const attendanceData = state.students
        .filter(s => s.class === state.selectedClass)
        .map(s => ({ 
            school: s.school || '',
            grade: s.grade || '', 
            class: s.class, 
            number: s.number || '', 
            name: s.name, 
            status: s.attendance, 
            date: state.selectedDate 
        }));

    try {
        const response = await fetch(state.gasUrl, {
            method: 'POST',
            mode: 'no-cors', // Redirect issues with GAS often require no-cors for simple POST
            body: JSON.stringify({ action: 'saveAttendance', data: attendanceData })
        });
        showToast('출석 데이터가 전송되었습니다!', 'check-circle');
    } catch (error) {
        showToast('저장 중 오류가 발생했습니다.', 'x');
    } finally {
        setLoading(false);
    }
}

function openMultiAddModal() {
    const modal = document.getElementById('multi-add-modal');
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'all';
}

function closeMultiAddModal() {
    const modal = document.getElementById('multi-add-modal');
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    document.getElementById('multi-input-area').value = '';
}

async function processMultiAdd() {
    const school = document.getElementById('multi-school').value;
    const grade = document.getElementById('multi-grade').value;
    const className = document.getElementById('multi-class').value;
    const input = document.getElementById('multi-input-area').value;
    
    if (!school || !grade || !className || !input.trim()) {
        showToast('모든 대분류 정보를 입력해주세요.', 'alert-circle');
        return;
    }

    setBtnLoading(true);
    
    const lines = input.split('\n');
    const newStudents = [];
    let currentNum = 1;
    
    lines.forEach(line => {
        if (!line.trim()) return;
        const parts = line.trim().split(/\s+/);
        
        let number, name;
        if (parts.length >= 2 && !isNaN(parts[0])) {
            // [Number, Name] format
            number = parts[0];
            name = parts.slice(1).join(' ');
            currentNum = parseInt(number) + 1;
        } else {
            // [Name] only format - auto assign number
            number = currentNum.toString();
            name = line.trim();
            currentNum++;
        }

        newStudents.push({
            id: Date.now() + Math.random(),
            school: school,
            grade: grade,
            class: className.endsWith('반') ? className : className + '반',
            number: number,
            name: name,
            attendance: 'present',
            position: null
        });
    });

    if (newStudents.length > 0) {
        state.students = [...state.students, ...newStudents];
        syncToLocal();
        
        if (state.gasUrl) {
            await saveBulkStudentsToGAS(newStudents);
        }

        setTimeout(() => {
            setBtnLoading(false);
            closeMultiAddModal();
            switchScreen('management');
            showToast(`${newStudents.length}명의 학생이 추가되었습니다.`, 'users');
        }, 500); // Small delay for visual feedback
    } else {
        setBtnLoading(false);
        showToast('입력된 명단이 올바르지 않습니다.', 'alert-triangle');
    }
}

function setBtnLoading(isLoading) {
    const btn = document.getElementById('multi-add-btn');
    const text = document.getElementById('btn-text');
    const loader = document.getElementById('btn-loader');
    
    if (isLoading) {
        btn.classList.add('opacity-80', 'pointer-events-none');
        text.innerText = '저장 중...';
        loader.classList.remove('hidden');
    } else {
        btn.classList.remove('opacity-80', 'pointer-events-none');
        text.innerText = '추가하기';
        loader.classList.add('hidden');
    }
}

function deleteStudent(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        state.students = state.students.filter(s => s.id !== id);
        syncToLocal();
        switchScreen(state.currentScreen);
    }
}

function setLoading(val) {
    state.isLoading = val;
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.opacity = val ? '1' : '0';
        loader.style.pointerEvents = val ? 'all' : 'none';
    }
}

// --- Bulk Upload Logic ---
function triggerFileUpload() {
    document.getElementById('file-upload-input').click();
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
        const data = e.target.result;
        let parsedData = [];

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);
            parsedData = processExcelData(json);
        } else {
            const text = new TextDecoder().decode(data);
            parsedData = processTextData(text);
        }

        if (parsedData.length > 0) {
            state.tempUploadData = parsedData;
            showUploadModal(parsedData);
        } else {
            showToast('데이터를 인식할 수 없습니다.', 'alert-triangle');
        }
        setLoading(false);
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.readAsBinaryString(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

function processExcelData(json) {
    return json.map(row => {
        const name = row['이름'] || row['성명'] || Object.values(row)[0];
        const className = row['반'] || row['학급'] || state.selectedClass;
        const number = row['번호'] || row['번호'] || '';
        return { name, class: className, number };
    });
}

function processTextData(text) {
    const lines = text.split('\n');
    const students = [];
    
    // Regex Patterns: 1) 1반 5번 홍길동 2) 1-5 홍길동 3) 홍길동 (1-5)
    const patterns = [
        /(\d+)\s*반\s*(\d+)\s*번\s*([가-힣a-zA-Z]+)/, // 1반 5번 홍길동
        /(\d+)\s*-\s*(\d+)\s+([가-힣a-zA-Z]+)/,       // 1-5 홍길동
        /([가-힣a-zA-Z]+)\s*\((\d+)\s*-\s*(\d+)\)/,   // 홍길동 (1-5)
        /([가-힣a-zA-Z]+)\s+(\d+)\s*-\s*(\d+)/,       // 홍길동 1-5
        /([가-힣a-zA-Z]+)\s+(\d+)\s*반\s*(\d+)\s*번/  // 홍길동 1반 5번
    ];

    lines.forEach(line => {
        if (!line.trim()) return;
        let matched = false;
        
        for (const regex of patterns) {
            const match = line.match(regex);
            if (match) {
                if (regex.source.startsWith('([가-힣')) { // Name first patterns
                    students.push({ name: match[1], class: match[2] + '반', number: match[3] });
                } else { // Class/Number first patterns
                    students.push({ name: match[3], class: match[1] + '반', number: match[2] });
                }
                matched = true;
                break;
            }
        }

        if (!matched) {
            // Simple space separation: 홍길동 1-5 or 1-5 홍길동
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                students.push({ name: parts[0], class: state.selectedClass, number: parts[1] });
            }
        }
    });
    return students;
}

function showUploadModal(data) {
    const modal = document.getElementById('upload-modal');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div class="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl mb-4">
            <p class="text-xs text-indigo-400 font-medium">총 ${data.length}명의 학생이 감지되었습니다.</p>
        </div>
        <table class="w-full text-sm">
            <thead class="text-slate-500 text-[10px] uppercase font-bold">
                <tr>
                    <th class="text-left py-2">이름</th>
                    <th class="text-left py-2">반</th>
                    <th class="text-left py-2">번호</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
                ${data.map(s => `
                    <tr>
                        <td class="py-3 font-bold">${s.name}</td>
                        <td class="py-3 text-slate-400">${s.class}</td>
                        <td class="py-3 text-slate-400">${s.number}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    modal.style.opacity = '1';
    modal.style.pointerEvents = 'all';
    lucide.createIcons();
}

function closeModal() {
    const modal = document.getElementById('upload-modal');
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
}

async function confirmBulkUpload() {
    const newStudents = state.tempUploadData.map(s => ({
        id: Date.now() + Math.random(),
        name: s.name,
        class: s.class,
        attendance: 'present',
        position: null
    }));

    state.students = [...state.students, ...newStudents];
    syncToLocal();
    closeModal();
    switchScreen('management');
    showToast(`${newStudents.length}명의 학생이 추가되었습니다.`, 'users');
    
    // Optional: Sync to GAS if URL exists
    if (state.gasUrl) {
        saveBulkStudentsToGAS(newStudents);
    }
}

async function saveBulkStudentsToGAS(students) {
    try {
        await fetch(state.gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'saveStudents', data: students })
        });
    } catch (e) {
        console.error('GAS Sync Error:', e);
    }
}

// --- Helpers for Filtering ---
function getUniqueValues(key) {
    const values = [...new Set(state.students.map(s => s[key]))];
    return values.filter(v => v).sort();
}

function getSeatingFilteredClasses() {
    return [...new Set(
        state.students
            .filter(s =>
                (state.seatingSchool === 'all' || String(s.school) === String(state.seatingSchool)) &&
                (state.seatingGrade === 'all' || String(s.grade) === String(state.seatingGrade))
            )
            .map(s => s.class)
    )].filter(Boolean).sort();
}

function renderManagementList() {
    const filtered = state.students.filter(s =>
        (state.filterSchool === 'all' || s.school === state.filterSchool) &&
        (state.filterClass === 'all' || s.class === state.filterClass)
    );

    if (filtered.length === 0) return `
        <div class="card" style="padding:48px 24px;text-align:center;">
            <p style="font-size:32px;margin-bottom:10px;">📭</p>
            <p style="font-size:15px;font-weight:600;color:var(--text-muted);">검색 결과가 없습니다.</p>
        </div>`;

    return filtered.map(s => `
        <div class="card card-hover" style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
            <div>
                <p style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:0.04em;margin-bottom:4px;">
                    ${s.school} · ${s.grade}학년 ${s.class}
                </p>
                <p style="font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:-0.02em;">
                    ${s.number}. ${s.name}
                </p>
            </div>
            <button style="padding:10px;border-radius:12px;background:rgba(239,68,68,0.08);border:1.5px solid rgba(239,68,68,0.2);color:#ef4444;cursor:pointer;transition:all 0.15s;" onclick="deleteStudent(${s.id})">
                🗑️
            </button>
        </div>
    `).join('');
}

function saveSettings() {
    const url = document.getElementById('gas-url-input').value;
    state.gasUrl = url;
    localStorage.setItem('ssam_zari_gas_url', url);
    showToast('설정이 저장되었습니다!', 'check');
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const status = document.getElementById('connection-status');
    if (state.gasUrl) {
        status.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 연결됨';
        status.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium';
    } else {
        status.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> 연결 필요';
        status.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium';
    }
}

// --- Drag & Drop (Seating) ---
let _dragId = null;
let _dragSourceSlot = null;

function studentDragStart(ev) {
    const el = ev.currentTarget;
    _dragId = parseFloat(el.dataset.studentId);
    _dragSourceSlot = parseInt(el.dataset.slot);
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', _dragId);
    setTimeout(() => el.classList.add('dragging'), 0);
}

function studentDragEnd(ev) {
    ev.currentTarget.classList.remove('dragging');
}

function seatDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    ev.currentTarget.classList.add('drag-over');
}

function seatDragLeave(ev) {
    ev.currentTarget.classList.remove('drag-over');
}

function seatDrop(ev, targetSlot) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('drag-over');
    if (_dragId === null) return;

    const student = state.students.find(s => s.id === _dragId);
    if (!student) return;

    // Swap if target is occupied
    const existing = state.students.find(s => s.class === state.selectedClass && s.position === targetSlot);
    if (existing && existing.id !== _dragId) {
        existing.position = _dragSourceSlot === -1 ? null : _dragSourceSlot;
    }

    student.position = targetSlot;
    _dragId = null;
    _dragSourceSlot = null;
    syncToLocal();
    switchScreen('seating');
}

function dropToUnassigned(ev) {
    ev.preventDefault();
    if (_dragId === null) return;
    const student = state.students.find(s => s.id === _dragId);
    if (student) {
        student.position = null;
        _dragId = null;
        syncToLocal();
        switchScreen('seating');
    }
}

function allowDrop(ev) { ev.preventDefault(); }

// --- Seating Utilities ---
function toggleSlotDisabled(index) {
    const key = state.selectedClass;
    if (!state.disabledSlots[key]) state.disabledSlots[key] = [];
    const hasStudent = state.students.find(s => s.class === key && s.position === index);
    if (hasStudent) return;
    const idx = state.disabledSlots[key].indexOf(index);
    if (idx > -1) {
        state.disabledSlots[key].splice(idx, 1);
    } else {
        state.disabledSlots[key].push(index);
    }
    localStorage.setItem('ssam_disabled_slots', JSON.stringify(state.disabledSlots));
    switchScreen('seating');
}

function autoArrange() {
    const classStudents = state.students.filter(s => s.class === state.selectedClass);
    const disabled = state.disabledSlots[state.selectedClass] || [];
    const sorted = [...classStudents].sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
    let pos = 0;
    sorted.forEach(student => {
        while (disabled.includes(pos)) pos++;
        student.position = pos++;
    });
    syncToLocal();
    switchScreen('seating');
    showToast('자동 정렬 완료!', 'check-circle');
}

function clearSeating() {
    if (!confirm('이 반의 자리 배치를 초기화하시겠습니까?')) return;
    state.students.filter(s => s.class === state.selectedClass).forEach(s => s.position = null);
    syncToLocal();
    switchScreen('seating');
    showToast('자리 배치가 초기화되었습니다.', 'refresh-cw');
}

async function saveSeatingToGAS() {
    if (!state.gasUrl) {
        showToast('설정에서 GAS URL을 먼저 입력해주세요.', 'alert-circle');
        return;
    }
    if (!state.selectedClass) {
        showToast('반을 먼저 선택해주세요.', 'alert-circle');
        return;
    }

    setLoading(true);

    const classStudents = state.students.filter(s => s.class === state.selectedClass);
    const payload = classStudents.map(s => ({
        id: s.id,
        position: s.position !== null && s.position !== undefined ? s.position : null
    }));

    try {
        await fetch(state.gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'saveSeating', data: payload })
        });
        showToast(`${state.selectedClass} 자리 배치가 시트에 저장되었습니다!`, 'check-circle');
    } catch (e) {
        showToast('저장 중 오류가 발생했습니다.', 'alert-triangle');
        console.error(e);
    } finally {
        setLoading(false);
    }
}

// --- UI Feedback ---
function showToast(message, icon = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    
    toastMessage.innerText = message;
    toastIcon.innerHTML = `<i data-lucide="${icon}"></i>`;
    lucide.createIcons();
    
    toast.classList.remove('translate-y-[-200%]');
    toast.classList.add('translate-y-0');
    
    setTimeout(() => {
        toast.classList.remove('translate-y-0');
        toast.classList.add('translate-y-[-200%]');
    }, 3000);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocal();
    switchScreen('attendance');
    updateConnectionStatus();
    lucide.createIcons();
    
    if (state.gasUrl) {
        fetchStudents();
    }
});
