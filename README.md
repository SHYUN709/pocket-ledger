# 주머니 가계부

아이폰에서 혼자 쓰는 개인 가계부 PWA. 서버·로그인 없이 모든 데이터는 폰 안(IndexedDB)에만 저장된다.

**원칙: 지출 하나 기록하는 데 3초 이내.** 금액을 누르고 카테고리를 탭하면 바로 저장된다.

## 기능

| 기능 | 설명 |
|---|---|
| 빠른 입력 | 앱을 열면 바로 키패드. 금액 → 카테고리 탭 = 저장. 메모·날짜는 선택. 저장 후 3~5초간 **되돌리기** |
| 즐겨찾기 | "학식 5,000" 같은 프리셋을 한 번 탭으로 기록. 칩을 길게 누르면 삭제 |
| 지갑 2개 | 💳 내 돈 / 🎓 장학 포인트. 마지막에 쓴 지갑이 기본값 |
| 포인트 규칙 | 술자리·오락처럼 포인트를 못 쓰는 카테고리는 🎓 지갑에서 저장 불가. 💳로 냈는데 포인트로 낼 수 있었으면 "이거 포인트로 낼 수 있었어 🎓" |
| 만족·후회 | 지출 저장 직후 😊 / 😩 / ⏳. 안 누르면 건너뛰기. ⏳는 7일 뒤 메인에 "다시 판정" 카드로 |
| 고정 항목 | 월급, 장학 포인트, 통신비, 구독 등. 날짜가 되면 자동 기록하지 않고 확인 카드 → 탭해서 기록(이번 달 금액 수정 가능) 또는 건너뛰기 |
| 남은 돈 | 💳 이번 달 남은 돈 = 이번 달 💳 수입 + 확인 안 된 💳 고정 수입 − 이번 달 💳 지출 − 확인 안 된 💳 고정 지출. 🎓 포인트는 누적(이월) 잔액 |
| 스트릭 | 그날 기록 1개 이상 또는 "오늘 무지출" 버튼 → 달성. 연속 일수와 최고 기록 |
| 기록 목록 | 월별·날짜별 목록, 탭해서 수정·삭제 |
| JSON 백업 | 설정 → 백업 파일 만들기 / 불러오기(덮어쓰기 전 확인) |

## 개발

```bash
npm install
npm run dev        # http://localhost:5173/pocket-ledger/
npm test           # 계산 로직·DB·백업 테스트 (Vitest)
npm run build      # dist/ 생성
npm run preview    # 빌드 결과 확인 (Service Worker 포함) http://localhost:4173/pocket-ledger/
```

아이콘을 바꾸려면 `public/icon.svg`를 고친 뒤 `npm run icons`.

### 구조

```
src/
├─ db/         schema.ts(Dexie 테이블) · seed.ts(기본 카테고리) · repo.ts(쓰기 함수) · backup.ts
├─ domain/     화면과 무관한 계산 (남은 돈, 고정 항목, 스트릭, 포인트 규칙, 날짜·금액)
├─ hooks/      useData.ts — useLiveQuery 기반 데이터 훅, 메인 화면 계산(useLedger)
├─ screens/    QuickEntry(입력) · History(기록) · Settings(설정) · Managers(고정·카테고리·즐겨찾기 관리)
└─ components/ Keypad · CategoryGrid · TodayCards · FeelingPicker · Toast · Sheet …
```

- 금액은 원 단위 정수, 날짜는 현지 기준 `YYYY-MM-DD`
- 카테고리는 지우면 실제 삭제 대신 숨김(`archived`) — 옛 기록이 깨지지 않게
- 고정 항목의 이번 달 확인 여부는 `recurringLog`(`[recurringId+month]`)에 기록
- 스트릭은 "기록한 날"(createdAt) 기준 — 어제 쓴 돈을 오늘 적어도 오늘 달성

## GitHub Pages 배포

1. GitHub에 **`pocket-ledger`** 라는 이름으로 새 저장소를 만든다 (Private도 가능 — 단 무료 계정은 Pages가 Public 저장소에서만 된다).
   - 다른 이름을 쓰려면 `vite.config.ts`의 `BASE`와 `index.html`의 아이콘 경로(`/pocket-ledger/…`)를 같은 이름으로 바꾼다.
2. 코드를 올린다.
   ```bash
   git add .
   git commit -m "첫 커밋"
   git remote add origin https://github.com/<아이디>/pocket-ledger.git
   git push -u origin main
   ```
3. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꾼다.
4. **Actions** 탭에서 "Deploy to GitHub Pages"가 초록색이 되면 끝. 주소는
   `https://<아이디>.github.io/pocket-ledger/`
5. 이후에는 `main`에 push할 때마다 자동으로 테스트 → 빌드 → 배포된다. 앱은 다음에 열 때 새 버전으로 바뀐다(데이터는 그대로).

## 아이폰 홈 화면에 설치

1. 아이폰 **Safari**로 `https://<아이디>.github.io/pocket-ledger/` 접속 (크롬 앱 말고 Safari)
2. 아래쪽 **공유 버튼(□↑)** → **홈 화면에 추가** → 이름 확인 → **추가**
3. 홈 화면의 "가계부" 아이콘으로 실행하면 주소창 없는 앱처럼 뜬다. 한 번 열고 나면 **오프라인에서도 동작**한다.

## ⚠️ 데이터 보관 주의

- 데이터는 **그 폰의 그 홈 화면 앱 안에만** 있다. Safari에서 연 페이지와 홈 화면 앱은 저장소가 따로다.
- 홈 화면 아이콘을 지우거나, 설정 → Safari → 방문 기록 및 웹사이트 데이터 지우기를 하면 **데이터가 사라진다.**
- 그래서 가끔 **설정 → 백업 파일 만들기 → 공유 시트에서 "파일에 저장"** 으로 iCloud Drive에 보관하자. 폰을 바꾸면 새 폰에서 설치 후 **백업 파일 불러오기**.

## 참고한 오픈소스 (코드 복사 없음, 구조만)

- [ExTrack](https://github.com/gammaSpeck/expense-tracker) — PWA 설정과 iOS 메타 태그
- [tailexpense](https://github.com/tonmoydeb404/tailexpense) — 카테고리·예산 데이터 구조, 날짜 인덱스
- [Cent](https://github.com/glink25/Cent) — 백업 파일에 버전·고정 id 두기, 한 트랜잭션으로 복원
