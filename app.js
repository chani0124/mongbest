(function(){
  // ===== 데이터/DOM =====
  const data = window.MB_DATA || { brands: [] };

  const byId = (s)=> document.querySelector(s);
  const includeShipEl = byId('#includeShip');
  const updatedEl = byId('#updated');
  const variantEl = byId('#variant');
  const grid = byId('#brandGrid');
  const search = byId('#search');

  const fmt = (n)=> new Intl.NumberFormat('ko-KR').format(n||0);

  if (updatedEl && data.lastUpdated){
    try {
      updatedEl.textContent = new Date(data.lastUpdated).toLocaleString('ko-KR',{ timeZone:'Asia/Seoul' });
    } catch(e){ updatedEl.textContent = data.lastUpdated; }
  }
  if (variantEl && data.variant) variantEl.textContent = data.variant;

  // ===== 수익화 설정 (업그레이드 혼합 전략) =====
  // 0) 전역(폴백) 제휴 링크 — chani가 알려준 코드
  const GLOBAL_AFFIL = "https://link.coupang.com/a/cQZHEI";

  // 1) 브랜드별 제휴 링크(있으면 우선 적용) — 필요할 때 값만 넣으면 자동 반영
  //    예시는 전부 동일 링크로 시작. 이후 각 브랜드별로 쿠팡 파트너스에서 생성한 링크로 교체해줘.
  const BRAND_AFFIL_MAP = {
    "mongbest": "https://link.coupang.com/a/cQZHEI",
    "samdasoo": "https://link.coupang.com/a/cQZHEI",
    "baeksansu": "https://link.coupang.com/a/cQZHEI",
    "icysis": "https://link.coupang.com/a/cQZHEI",
    "sparkle": "https://link.coupang.com/a/cQZHEI",
    "crystal-geyser": "https://link.coupang.com/a/cQZHEI"
  };

  // 2) 판매처 도메인 인식(출처 보정용)
  const DOMAIN_FROM_URL = (u)=>{
    try{ return new URL(u).hostname.replace(/^www\./,''); } catch(e){ return ""; }
  };

  // 3) 메인 버튼에 쓸 제휴 링크 결정
  function decideAffiliateLink(brandObj, sellerItem){
    // a) 브랜드별 링크 우선
    if (brandObj && brandObj.id && BRAND_AFFIL_MAP[brandObj.id]) {
      // 간단 추적용으로 brand id를 붙여도 무해 (쿠팡 파라미터 무시되어도 문제 없음)
      return BRAND_AFFIL_MAP[brandObj.id] + "?src=mongbest&brand=" + encodeURIComponent(brandObj.id);
    }
    // b) 전역 폴백
    return GLOBAL_AFFIL + "?src=mongbest&brand=" + encodeURIComponent(brandObj?.id || "unknown");
  }

  // ===== 가격 계산/정렬 =====
  function finalPrice(s){
    const ship = includeShipEl?.checked ? (s.shippingKRW||0) : 0;
    return (s.priceKRW||0) + ship;
  }

  // ===== 행/카드 렌더링 =====
  function rowHTML(s, brand){
    const outSrc = s.url || "";
    const domain = DOMAIN_FROM_URL(outSrc);
    const srcLabel = domain ? domain : (s.name || '출처');

    const ship = (s.shippingKRW && s.shippingKRW>0) ? `₩${fmt(s.shippingKRW)}` : '무료';

    // 메인: 제휴 링크 (브랜드별 맵 → 없으면 전역)
    const affUrl = decideAffiliateLink(brand, s);
    const safe = (u)=> (u || "#");

    return `
      <tr>
        <td class="seller">${srcLabel}</td>
        <td>₩${fmt(s.priceKRW || 0)}</td>
        <td>${ship}</td>
        <td class="final">₩${fmt(finalPrice(s))}</td>
        <td>${s.delivery || '-'}</td>
        <td class="buy">
          <a class="btn" href="${safe(affUrl)}" target="_blank" rel="noopener sponsored nofollow">구매하러 가기</a>
          ${outSrc ? `<div style="margin-top:6px;font-size:12px">
            <a href="${safe(outSrc)}" target="_blank" rel="noopener nofollow" class="muted">원 판매처 상세보기 →</a>
            <span aria-hidden="true" style="color:#2b3b52"> · </span>
            <a href="${GLOBAL_AFFIL + '?src=mongbest&search=' + encodeURIComponent((brand?.name||'')+' 2L 12')}"
               target="_blank" rel="noopener sponsored nofollow" class="muted">쿠팡에서 검색</a>
          </div>` : `
          <div style="margin-top:6px;font-size:12px">
            <a href="${GLOBAL_AFFIL + '?src=mongbest&search=' + encodeURIComponent((brand?.name||'')+' 2L 12')}"
               target="_blank" rel="noopener sponsored nofollow" class="muted">쿠팡에서 검색</a>
          </div>`}
        </td>
      </tr>
    `;
  }

  function cardHTML(b){
    const sellers = [...(b.sellers||[])].sort((a,b)=> finalPrice(a)-finalPrice(b));
    const rows = sellers.length
      ? sellers.map(s => rowHTML(s, b)).join('')
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

  function render(){
    const q = (search?.value || "").trim();
    const brands = (data.brands||[]).filter(b => !q || (b.name.includes(q) || (b.id||"").includes(q)));
    grid.innerHTML = brands.map(cardHTML).join('');
  }

  includeShipEl?.addEventListener('change', render);
  search?.addEventListener('input', render);
  document.querySelector('#refresh')?.addEventListener('click', ()=>location.reload());

  render();
})();
