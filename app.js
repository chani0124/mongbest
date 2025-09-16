(function () {
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

  // ===== 제휴 링크 설정 =====
  const GLOBAL_AFFIL = "https://link.coupang.com/a/cQZHEI"; // 폴백 (예비용)

  const BRAND_AFFIL_MAP = {
    mongbest: "https://link.coupang.com/a/cQ9CKO",       // 몽베스트
    samdasoo: "https://link.coupang.com/a/cQ92gB",       // ✅ 삼다수
    baeksansu: "https://link.coupang.com/a/cQ95Bd",      // ✅ 백산수
    icysis: "https://link.coupang.com/a/cQ97ld",         // ✅ 아이시스
    sparkle: "https://link.coupang.com/a/cQ9FQR",        // 스파클
    evian: "https://link.coupang.com/a/cQ9HDG",          // 에비앙 (500ml × 24)
  };

  // 모든 출처를 쿠팡으로 표시
  const FORCE_COUPANG_SOURCE = true;
  const COUPANG_LABEL = "coupang.com";

  const domainOf = (u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  };

  function affiliateForBrand(brand) {
    const id = brand?.id || "";
    const aff = BRAND_AFFIL_MAP[id];
    if (aff && aff.startsWith("https://link.coupang.com/")) return aff;
    return GLOBAL_AFFIL;
  }

  function finalPrice(s) {
    const ship = includeShipEl?.checked ? s.shippingKRW || 0 : 0;
    return (s.priceKRW || 0) + ship;
  }

  function rowHTML(s, brand) {
    const ship =
      s.shippingKRW && s.shippingKRW > 0 ? `₩${fmt(s.shippingKRW)}` : "무료";

    const affUrl = affiliateForBrand(brand);
    const labelSrc = FORCE_COUPANG_SOURCE
      ? COUPANG_LABEL
      : domainOf(s.url) || s.name || "출처";

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
            <a href="${affUrl}" target="_blank" rel="noopener sponsored nofollow" class="muted">쿠팡 상세 보기 →</a>
          </div>
        </td>
      </tr>
    `;
  }

  function cardHTML(b) {
    const sellers = [...(b.sellers || [])].sort(
      (a, c) => finalPrice(a) - finalPrice(c)
    );
    const rows = sellers.length
      ? sellers.map((s) => rowHTML(s, b)).join("")
      : `<tr><td colspan="6" class="muted">데이터 수집 대기 중…</td></tr>`;

    return `
      <article class="card">
        <div class="head">
          <div class="brandname">${b.name}</div>
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
    const brands = (data.brands || []).filter(
      (b) => !q || b.name.includes(q) || (b.id || "").includes(q)
    );
    grid.innerHTML = brands.map(cardHTML).join("");
  }

  includeShipEl?.addEventListener("change", render);
  search?.addEventListener("input", render);
  document.querySelector("#refresh")?.addEventListener("click", () =>
    location.reload()
  );

  render();
})();
