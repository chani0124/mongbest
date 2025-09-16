// 쿠팡 검색결과 1위 카드에서 가격 긁어서 data/prices.js 갱신
import { chromium } from "playwright";
import fs from "fs";

const HEADLESS = true;

// ✅ 브랜드 타겟(검색 URL은 필요시 수정 가능)
const TARGETS = [
  { id: "mongbest",  name: "몽베스트",          search: "https://www.coupang.com/np/search?component=&q=%EB%AA%BD%EB%B2%A0%EC%8A%A4%ED%8A%B8+2L+12&channel=user" },
  { id: "samdasoo",  name: "삼다수",            search: "https://www.coupang.com/np/search?component=&q=%EC%82%BC%EB%8B%A4%EC%88%98+2L+12&channel=user" },
  { id: "baeksansu", name: "백산수",            search: "https://www.coupang.com/np/search?component=&q=%EB%B0%B1%EC%82%B0%EC%88%98+2L+12&channel=user" },
  { id: "icysis",    name: "아이시스",          search: "https://www.coupang.com/np/search?component=&q=%EC%95%84%EC%9D%B4%EC%8B%9C%EC%8A%A4+2L+12&channel=user" },
  { id: "sparkle",   name: "스파클",            search: "https://www.coupang.com/np/search?component=&q=%EC%8A%A4%ED%8C%8C%ED%81%B4+2L+12&channel=user" },
  { id: "evian",     name: "에비앙 500ml × 24", search: "https://www.coupang.com/np/search?component=&q=%EC%97%90%EB%B9%84%EC%95%99+500ml+24&channel=user" }
];

// ✅ 브랜드별 제휴 딥링크(버튼 이동용) — 네가 주신 값
const AFF = {
  mongbest:  "https://link.coupang.com/a/cQ9CKO",
  samdasoo:  "https://link.coupang.com/a/cRajbw",
  baeksansu: "https://link.coupang.com/a/cQ95Bd",
  icysis:    "https://link.coupang.com/a/cRagPq",
  sparkle:   "https://link.coupang.com/a/cQ9FQR",
  evian:     "https://link.coupang.com/a/cQ9HDG"
};

function toNumber(txt) {
  if (!txt) return null;
  const m = txt.replace(/[^\d]/g, "");
  return m ? parseInt(m, 10) : null;
}

// 검색 결과 1위 카드에서 가격 찾기 (여러 셀렉터 시도)
async function extractTopPrice(page) {
  // 검색 카드 로드 대기
  await page.waitForTimeout(2000);
  const selectors = [
    'li.search-product .price-value',
    'li.search-product strong.price-value',
    '.search-product .price > strong',
    '[class*="price-value"]',
    '.search-product .price-value'
  ];

  for (const sel of selectors) {
    const el = await page.locator(sel).first();
    if (await el.count()) {
      const t = (await el.innerText()).trim();
      const n = toNumber(t);
      if (n) return n;
    }
  }

  // 최후: 페이지 전체 텍스트에서 첫 번째 "원" 가격 패턴
  const body = await page.locator("body").innerText();
  const m = body.match(/([\d,]{3,})\s*원/);
  if (m) return toNumber(m[1]);
  return null;
}

async function scrapeOne(browser, t) {
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    viewport: { width: 1366, height: 900 }
  });
  const page = await ctx.newPage();

  try {
    await page.goto(t.search, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // 쿠키/모달 닫기 시도
    await page.keyboard.press("Escape").catch(()=>{});
    await page.waitForTimeout(1500);

    const price = await extractTopPrice(page);
    return {
      id: t.id,
      name: t.name,
      sellers: [{
        name: "coupang",
        url: AFF[t.id] || t.search,
        priceKRW: price ?? null,
        shippingKRW: 0,
        delivery: "일반"
      }]
    };
  } catch (e) {
    console.error(`❌ ${t.name} 에러:`, e.message);
    return {
      id: t.id,
      name: t.name,
      sellers: [] // 실패 시 빈 셀러
    };
  } finally {
    await ctx.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: HEADLESS });

  const results = [];
  for (const t of TARGETS) {
    results.push(await scrapeOne(browser, t));
    // 사이트 보호 회피용 살짝 지연
    await new Promise(r => setTimeout(r, 1200));
  }
  await browser.close();

  const payload = {
    lastUpdated: new Date().toISOString(),
    variant: "2L × 12",
    brands: results
  };

  const js = "window.MB_DATA = " + JSON.stringify(payload, null, 2);
  fs.writeFileSync("data/prices.js", js, "utf8");
  console.log("✅ data/prices.js 업데이트 완료");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
