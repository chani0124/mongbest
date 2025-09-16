(function () {
  const data = window.MB_DATA || { brands: [] };

  // -------- DOM / Utils --------
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
    } catch {
      updatedEl.textContent = data.lastUpdated;
    }
  }
  if (variantEl && data.variant) variantEl.textContent = data.variant;

  // -------- 제휴 링크(브랜드별) --------
  // 폴백(예비용)
  const GLOBAL_AFFIL = "https://link.coupang.com/a/cQZHEI";

  // chani 제공 딥링크 전부 반영 ✅
  const BRAND_AFFIL_MAP = {
    mongbest: "https://link.coupang.com/a/cQ9CKO",  // 몽베스트
    samdasoo: "https://link.coupang.com/a/cRajbw",  // ✅ 삼다수(최신)
    baeksansu: "https://link.coupang.com/a/cQ95Bd", // 백산수
    icysis: "https://link.coupang.com/a/cRagPq",    // ✅ 아이시스(최신)
    sparkle: "https://link.coupang.com/a/cQ9FQR",   // 스파클
    evian: "https://link.coupang.com/a/cQ9HDG"      // 에비앙 500ml×24
  };

  // “crystal-geyser”로 들어온 데이터는 evian으로 취급(예전 데이터 호환용)
  const ID_ALIASES = { "crystal-geyser": "evian" };
  const DISPLAY_NAME_OVERRIDE = { evian: "에비앙 500ml × 24" };

  // 모든 “출처” 표기는 coupang.com으로 고정(요청사항)
  const FORCE_COUPANG_SOURCE = true;
  const COUPANG_LABEL = "coupang.com";

  const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  const effectiveId = (id) => ID_ALIASES[id] || id;
  const niceBrandName = (b) => DISPLAY_NAME_OVERRIDE[effectiveId(b.id)] || b.name || b.id || "브랜드";

  const affiliateForBrand = (brand) => {
    const id = effectiveId(brand?.id || "");
    const url = BRAND_AFFIL_MAP[id];
    return (url && url.startsWith("https://link.coupang.com/")) ? url : GLOBAL_AFFIL;
  };

  const finalPrice = (s) => (s.priceKRW || 0) + (includeShipEl?.checked ? (s.shippingKRW || 0) : 0);

  // -------- 한 줄 렌더 --------
  function rowHTML(s, brand) {
    const ship = (s.shippingKRW && s.shippingKRW > 0) ? `₩${fmt(s.shippingKRW)}` : "무료";
    const affUrl = affiliateForBrand(brand);
    const labelSrc = FORCE_COUPANG_SOURCE ? COUPANG_LABEL : (domainOf(s.url) || s.name || "출처");

    return `
      <tr>
        <td class="seller">${labelSrc}</td>
        <td>₩${fmt(s.priceKRW || 0)}</td>
        <td>${ship}</td>
        <td class="final">₩${fmt(finalPrice(s))}</td>
        <td>${s.delivery || "-"}</td>
        <td class="buy">
          <a class="btn" href="${affUrl}" target="_blank" rel="noopener sponsored nofollow">구매하러 가기</a>
          <div style="margin-top:6px;font-size:12px">
            <a href="${affUrl}" target="_blank" rel="noopener sponsored nofollow" class="muted">쿠팡 상세 보기 →</a>
          </div>
        </td>
      </tr>
    `;
  }

  // -------- 카드 렌더 --------
  function cardHTML(b) {
    const sellers = [...(b.sellers || [])].sort((a, c) => finalPrice(a) - finalPrice(c));
    const rows = sellers.length
      ? sellers.map((s) => rowHTML(s, b)).join("")
      : `<tr><td colspan="6" class="muted">데이터 수집 대기 중…</td></tr>`;

    return `
      <article class="card">
        <div class="head">
          <div class="brandname">${niceBrandName(b)}</div>
          <div class="updated">출처 ${sellers.length}개</div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>출처</th><th>가격</th><th>배송비</th><th>최종가</th><th>배송</th><th>구매</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>
    `;
  }

  // -------- 렌더 파이프라인 --------
  function ensureEvianCard(list) {
    // 데이터에 evian도 crystal-geyser도 없으면 ‘빈 카드’라도 추가해서 항상 보이게
    const hasEvian = list.some(b => effectiveId(b.id) === "evian");
    if (!hasEvian) list.push({ id: "evian", name: "에비앙 500ml × 24", sellers: [] });
    return list;
  }

  function normalize(brands) {
    return brands.map(b => ({
      ...b,
      id: effectiveId(b.id),
      name: niceBrandName(b)
    }));
  }

  function render() {
    let brands = Array.isArray(data.brands) ? [...data.brands] : [];
    brands = normalize(ensureEvianCard(brands));

    const q = (search?.value || "").trim();
    if (q) brands = brands.filter(b => (b.name || "").includes(q) || (b.id || "").includes(q));

    grid.innerHTML = brands.map(cardHTML).join("");
  }

  includeShipEl?.addEventListener("change", render);
  search?.addEventListener("input", render);
  document.querySelector("#refresh")?.addEventListener("click", () => location.reload());

  render();
})();
