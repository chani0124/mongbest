# mongbest.com
몽베스트 생수 가격을 비교해 최저가로 안내하는 경량 웹사이트.

## 개발
- `index.html`, `style.css`, `app.js`, `prices.js`로 구성된 정적 사이트입니다.
- `prices.js`는 처음엔 수동으로 채우고, 이후 GitHub Actions(`update-prices.yml`)가 3시간마다 `scripts/scrape.py`를 실행해 자동으로 갱신합니다.

## 배포
- GitHub Pages 사용 (Settings → Pages → Deploy from branch)
- 커스텀 도메인 `mongbest.com`은 `CNAME` 파일과 DNS 설정으로 연결합니다.
