# 🏫 쌤자리 (SSAM-ZARI)

**"저기요" 대신 이름을 불러주는 앱 — 강사 선생님들을 위한 자리 매칭형 출석부**

![쌤자리 썸네일](./thumbnail.png)

[![Status](https://img.shields.io/badge/Status-v1.0-6366f1?style=flat-square)](https://github.com)
[![Stack](https://img.shields.io/badge/Stack-HTML_|_CSS_|_JS_|_GAS-a78bfa?style=flat-square)](https://github.com)
[![Cost](https://img.shields.io/badge/Server_Cost-₩0-10b981?style=flat-square)](https://github.com)

---

## 💡 이런 앱입니다

주 1회 방과후/동아리 수업을 나가는 강사에게, **학생 이름 외우기**는 쉽지 않은 일입니다.

쌤자리는 **자리 배치표 위에 학생 이름을 매칭**하여, 수업 시작 전 핸드폰 한 번 보는 것만으로 "저기요" 대신 이름을 불러줄 수 있게 해주는 앱입니다.

> 서로의 이름을 알고 이름을 불러가며 수업을 한다는 건 생각보다 의미 있는 행동이며,  
> 그 작은 행위만으로도 서로에게 작은 신뢰를 쌓아가게 해 줍니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|:---|:---|
| ✅ **출석체크** | 학교→학년→반 필터 후 원클릭 출결 체크, 구글 시트 자동 저장 |
| 🪑 **자리배치** | 행/열 설정 후 드래그&드롭으로 학생을 원하는 자리에 배치 |
| 📋 **명단관리** | 텍스트 일괄 입력 또는 엑셀 파일 업로드로 빠른 등록 |
| ⚙️ **설정** | GAS 웹앱 URL 한 줄 입력으로 구글 시트 연동 완료 |
| 🌗 **테마** | 라이트/다크 모드 지원 — 밝은 교실에서도, 밤 준비에서도 |

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|:---|:---|
| **프론트엔드** | HTML5, Vanilla CSS, JavaScript (ES6+) |
| **스타일링** | Tailwind CSS v4 (CDN) + 커스텀 CSS 디자인 시스템 |
| **폰트** | Google Fonts — Outfit |
| **백엔드** | Google Apps Script (GAS) — 서버 비용 **₩0** |
| **데이터 저장** | Google Spreadsheet + localStorage |
| **파일 파싱** | SheetJS (XLSX) |

---

## 🚀 시작하기

### 1. 프론트엔드
```
index.html을 브라우저에서 열면 바로 사용 가능합니다.
```

### 2. 백엔드 (구글 시트 연동)
1. Google Spreadsheet를 새로 생성합니다.
2. **확장 프로그램 > Apps Script**를 엽니다.
3. `gas_backend.js` 파일의 내용을 전체 복사하여 붙여넣습니다.
4. **배포 > 웹 앱으로 배포** → 액세스: **"모든 사용자"** 설정
5. 생성된 URL을 앱의 **⚙️ 설정** 화면에 입력 후 저장

---

## 📁 파일 구조

```
SSAM-ZARI/
├── index.html        # 메인 HTML
├── style.css         # CSS 디자인 시스템 (라이트/다크)
├── app.js            # 핵심 로직
├── gas_backend.js    # GAS 코드 (복사용)
├── GAS_CODE.md       # GAS 설정 가이드
├── PRD.md            # 초안 제품 요구사항
├── final_prd.md      # 최종 제품 요구사항
├── thumbnail.png     # 앱 소개 이미지
└── README.md         # 이 문서
```

---

## 🎯 이런 분들에게 추천합니다

- 📚 방과후/동아리 수업 강사
- 🏫 여러 학교를 돌며 수업하는 프리랜서 강사
- 👩‍🏫 학생 이름-자리 매칭이 필요한 모든 교육자

---

## 🔗 링크

- 🏠 **아크랩스**: [https://litt.ly/aklabs](https://litt.ly/aklabs)

---

© 2026 쌤자리 (SSAM-ZARI) · Made with 💜 by [AKLABS](https://litt.ly/aklabs)
