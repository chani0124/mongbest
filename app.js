(function () {
  // ====== 기본 데이터/DOM ======
  const data = window.MB_DATA || { brands: [] };

  const $ = (s) => document.querySelector(s);
  const includeShipEl = $("#includeShip");
  const updatedEl = $("#updated");
  const variantEl = $("#variant");
  const grid = $("#brandGrid");
  const search = $("#search");
  const fmt = (n) => new Intl.NumberFormat("ko-KR").format(n || 0);

  if (updatedEl && data.lastUpdated) {
    try {
      updatedEl.textContent = new Date(data.lastUpdated).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
      });
    } catch (e) {
      updatedEl.textContent = data.lastUpdated;
    }
  }
  if (variantEl && data.variant) variantEl.textContent = data.variant;

  // ====== 수익화 설정 ======
  // 전역(폴백) 링크 — 혹시 브랜드별 링크가 없을 때 사용
  const GLOBAL_AFFIL = "https://link.coupang.com/a/cQZHEI";

  // ✅ chani가 준 브랜드별 쿠팡 제휴 링크
  const BRAND_AFFIL_MAP = {
    // MB_DATA의 brand.id 기준
    mongbest: "https://link.coupang.com/a/cQ9CKO",       // 몽베스트
    samdasoo: "https://link.coupang.com/a/cQ9Bnu",       // 삼다수
    baeksansu: "https://link.coupang.com/a/cQ9D0w",      // 백산수
    icysis: "https://link.coupang.com/a/cQ9E6m",         // 아이시스
    sparkle: "https://link.coupang.com/a/cQ9FQR",        // 스파클
    evian: "https://link.coupang.com/a/cQ9HDG",          // 에비앙 500ml × 24
  };

  // 👉 기존 데이터에 'crystal-geyser'가 있을 수 있어 그걸 'evian'으로 취급
  const ID_ALIASES = { "crystal-geyser": "evian" };

  // 화면에 보이는 브랜드 이름을 바꾸고 싶을 때(요청: 에비앙 표기)
  const DISPLAY_NAME_OVERRIDE = { evian: "에비앙 500ml × 24" };

  // 요청: 모든 ‘출처’를 쿠팡으로 보이게
  const FORCE_COUPANG_SOURCE = true;
  const COUPANG_LABEL = "coupang.com";

  // ====== 유틸 ======
  const domainOf = (u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  };

  const effectiveId = (id) => ID_ALIASES[id] || id;

  const brandNameForView = (b) =>
    DISPLAY_NAME_OVERRIDE[effectiveId(b.id)] || b.name || b.id || "브랜드";

  function affiliateForBrand(brand) {
    const id = effectiveId(brand?.id || "");
    const url = BRAND_AFFIL_MAP[id];
    if (url && url.startsWith("https://link.coupang.com/")) return url;
    return GLOBAL_AFFIL;
  }

  function finalPrice(s) {
    const ship = includeShipEl?.checked ? s.shippingKRW || 0 : 0;
    return (s.priceKRW || 0) + ship;
  }

  // ====== 렌더링 ======
  function rowHTML(s, brand) {
    const ship =
      s.shippingKRW && s.shippingKRW > 0 ? `₩${fmt(s.shippingKRW)}` : "무료";

    // 메인 CTA: 브랜드별 쿠팡 제휴 링크
    const affUrl = affiliateForBrand(brand);
    const labelSrc = FORCE_COUPANG_SOURCE
      ? COUPANG_LABEL
      : domainOf(s.url) || s.name || "출처";

    // 보조 링크: 전부 쿠팡으로 유도 (요청사항)
    // - 상세: 브랜드별 제휴 링크 재사용
    // - 검색: 전역 링크(쿠팡 홈 제휴) — 필요하면 브랜드 키워드 파라미터 붙여도 OK
    const moreUrl = GLOBAL_AFFIL;

    return `
      <tr>
        <td class="seller">${labelSrc}</td>
        <td>₩${fmt(s.priceKRW || 0)}</td>
        <td>${ship}</td>
        <td class="final">₩${fmt(finalPrice(s))}</td>
        <td>${s.delivery || "-"}</td>
        <td class="buy">
          <a class="btn" href="${affUrl}" target="_blank" rel="noopener sponsored nofollow">
            구매하러 가기
          </a>
          <div style="margin-top:6px;font-size:12px">
            <a href="${affUrl}" target="_blank" rel="noopener sponsored nofollow" class="muted">쿠팡 상세/추천 보기 →</a>
            <span aria-hidden="true" style="color:#2b3b52"> · </span>
            <a href="${moreUrl}" target="_blank" rel="noopener sponsored nofollow" class="muted">쿠팡에서 더 보기</a>
          </div>
        </td>
      </tr>
    `;
  }

  function cardHTML(b) {
    const name = brandNameForView(b);
    const sellers = [...(b.sellers || [])].sort(
      (a, c) => finalPrice(a) - finalPrice(c)
    );
    const rows = sellers.length
      ? sellers.map((s) => rowHTML(s, b)).join("")
      : `<tr><td colspan="6" class="muted">데이터 수집 대기 중…</td></tr>`;

    return `
      <article class="card">
        <div class="head">
          <div class="brandname">${name}</div>
          <div class="updated">출처 ${sellers.length}개</div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>출처</th>
                <th>가격</th>
                <th>배송비</th>
                <th>최종가</th>
                <th>배송</th>
                <th>구매</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>
    `;
  }

  function render() {
    const q = (search?.value || "").trim();
    const brands = (data.brands || []).map((b) => ({
      ...b,
      id: effectiveId(b.id),
      name: brandNameForView(b),
    }));
    const filtered = brands.filter(
      (b) => !q || b.name.includes(q) || (b.id || "").includes(q)
    );
    grid.innerHTML = filtered.map(cardHTML).join("");
  }

  includeShipEl?.addEventListener("change", render);
  search?.addEventListener("input", render);
  document.querySelector("#refresh")?.addEventListener("click", () =>
    location.reload()
  );

  render();
})();
