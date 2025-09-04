# mongbest.com (v2 automation)
- 구매 버튼: 새 창에서 열림
- GitHub Actions: 3시간마다 `scripts/scrape.py` 실행 → `prices.js` 갱신
- 동적 페이지를 위해 Playwright 사용(Chromium 설치 포함)

## 수동 테스트
- GitHub → Actions → `Update prices (every 3h)` → Run workflow
- 완료 후 `prices.js` diff가 있으면 자동 커밋
