/**
 * 쌤자리 (SSAM-ZARI) 백엔드 스크립트
 * ----------------------------------------
 * 사용법:
 *   1. 구글 스프레드시트 생성
 *   2. 확장 프로그램 > Apps Script 클릭
 *   3. 이 파일 전체 복사(Cmd+A → Cmd+C) 후 붙여넣기
 *   4. 저장(Ctrl+S) 후 배포 > 새 배포 클릭
 *   5. 유형: 웹 앱 / 실행 사용자: 나 / 액세스: 모든 사용자
 *   6. 생성된 URL을 쌤자리 앱 설정 화면에 입력
 * ----------------------------------------
 */

/**
 * 시트 생성 및 헤더 스타일 적용 함수
 */
function createSheetWithHeader(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);

    // 헤더 범위 선택 (1행 전체)
    const headerRange = sheet.getRange(1, 1, 1, headers.length);

    // 스타일 적용: 옅은 하늘색 배경, 가운데 정렬, 굵게
    headerRange.setBackground('#CFE2F3') // Light Blue
               .setHorizontalAlignment('center')
               .setFontWeight('bold')
               .setBorder(true, true, true, true, true, true, '#999999', SpreadsheetApp.BorderStyle.SOLID);

    // 열 너비 자동 조정
    sheet.setColumnWidths(1, headers.length, 120);
  }
  return sheet;
}

/**
 * GET 요청 처리 (학생 목록 조회)
 */
function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'getStudents') {
    const sheet = createSheetWithHeader(ss, 'Students', ['ID', '학교', '학년', '반', '번호', '이름', '자리번호']);
    const data = sheet.getDataRange().getValues();
    const students = [];

    for (let i = 1; i < data.length; i++) {
      students.push({
        id: data[i][0],
        school: data[i][1],
        grade: data[i][2],
        class: data[i][3],
        number: data[i][4],
        name: data[i][5],
        attendance: 'present',
        position: data[i][6] === "" ? null : data[i][6]
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: students }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST 요청 처리 (출석 저장 / 학생 저장 / 자리배치 저장)
 */
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  // ─── 출석 저장 ───────────────────────────────────────
  if (action === 'saveAttendance') {
    const sheet = createSheetWithHeader(ss, 'Attendance', ['날짜', '학교', '학년', '반', '번호', '이름', '출결상태']);
    const data = body.data;
    data.forEach(item => {
      sheet.appendRow([item.date, item.school, item.grade, item.class, item.number, item.name, item.status]);
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ─── 학생 명단 일괄 저장 ─────────────────────────────
  if (action === 'saveStudents') {
    const sheet = createSheetWithHeader(ss, 'Students', ['ID', '학교', '학년', '반', '번호', '이름', '자리번호']);
    const data = body.data;
    data.forEach(item => {
      sheet.appendRow([
        item.id,
        item.school,
        item.grade,
        item.class,
        item.number,
        item.name,
        item.position !== null && item.position !== undefined ? item.position : ""
      ]);
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ─── 자리배치 저장 (ID 기준 자리번호 업데이트) ─────────
  if (action === 'saveSeating') {
    const sheet = ss.getSheetByName('Students');
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Students 시트가 없습니다.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheetData = sheet.getDataRange().getValues();
    const updates = body.data; // [{id, position}, ...]

    updates.forEach(update => {
      for (let i = 1; i < sheetData.length; i++) {
        if (String(sheetData[i][0]) === String(update.id)) {
          // G열(1-indexed: 7번째) = 자리번호
          sheet.getRange(i + 1, 7).setValue(
            update.position !== null && update.position !== undefined ? update.position : ''
          );
          break;
        }
      }
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 시트 초기화 함수 (최초 1회 실행 권장)
 * Apps Script 편집기에서 이 함수를 직접 실행하세요.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createSheetWithHeader(ss, 'Students', ['ID', '학교', '학년', '반', '번호', '이름', '자리번호']);
  createSheetWithHeader(ss, 'Attendance', ['날짜', '학교', '학년', '반', '번호', '이름', '출결상태']);
  SpreadsheetApp.getUi().alert('✅ 시트 초기화 완료! Students 및 Attendance 시트가 생성되었습니다.');
}
