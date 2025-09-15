(function(){
  // ====== 데이터/DOM ======
  const data = window.MB_DATA || { brands: [] };

  const fmt = (n)=> new Intl.NumberFormat('ko-KR').format(n||0);
  const includeShipEl = document.querySelector('#includeShip');
  const updatedEl = document.querySelector('#updated');
  const variantEl = document.querySelector('#variant');
  const grid = document.querySelector('#brandGrid');
  const search = document.querySelector('#search');
  const yearEl = document.querySelector('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (updatedEl && data.lastUpdated){
    try {
      updatedEl.textContent = new Date(data.lastUpdated)
        .toLocaleString('ko-KR', { timeZone:'Asia/Seoul' });
    } catch(e){
      updatedEl.textContent = data.lastUpdated;
    }
  }
  if (variantEl && data.variant) variantEl.textContent = data.variant;

  // ====== 제휴 링크 설정 (혼합 전략) ======
  // 1) 글로벌 폴백: 어떤 상황이든 최소한 이 링크로 수익화
  const GLOBAL_AFFIL = "https://link.coupang.com/a/cQZHEI";

  // 2) 판매처/브랜드별 맵 (필요 시 확장)
  //    예: 쿠팡 외에 11번가/네이버 제휴키 생기면 여기에 추가하면 자동 적용
  const SELLER_AFFIL_MAP = {
    // scraper의 sellers[].id 기준
    // "coupang": "https://link.coupang.com/a/XXXXXX",
    "coupang": "https://link.coupang.com/a/cQZHEI",
  };

  const BRAND_AFFIL_MAP = {
    // MB_DATA 상의 brand id 기준 (원하면 추가)
    // "mongbest": "https://link.coupang.com/a/....",
  };

  // 3) 실제 버튼에 들어갈 링크를 결정
  function getAffiliateLink(sellerItem, brandObj){
    // 3-1) 판매처별 우선
    if (sellerItem && sellerItem.id && SELLER_AFFIL_MAP[sellerItem.id]) {
      return SELLER_AFFIL_MAP[sellerItem.id];
    }
    // 3-2) 브랜드별 우선 (원하면 사용)
    if (brandObj && brandObj.id && BRAND_AFFIL_MAP[brandObj.id]) {
      return BRAND_AFFIL_MAP[brandObj.id];
    }
    // 3-3) 위가 없으면 글로벌
    return GLOBAL_AFFIL;
  }

  // ====== 가격 계산/정렬 ======
  function finalPrice(s){
    const ship = includeShipEl?.checked ? (s.shippingKRW||0) : 0;
    return (s.priceKRW||0) + ship;
  }

  // ====== UI ======
  function rowHTML(s, brand){
    const ship = (s.shippingKRW && s.shippingKRW>0) ? `₩${fmt(s.shippingKRW)}` : '무료';
    const sellerUrl = s.url || "";                          // 원 판매처 최저가 상세 페이지
    const affUrl = getAffiliateLink(s, brand) || sellerUrl; // 메인 버튼은 제휴 링크 우선
    const safe = (u)=> (u || "#");

    return `
      <tr>
        <td class="seller">${s.name || '-'}</td>
        <td>₩${fmt(s.priceKRW || 0)}</td>
        <td>${ship}</td>
        <td class="final">₩${fmt(finalPrice(s))}</td>
        <td>${s.delivery || '-'}</td>
        <td class="buy">
          <!-- 메인: 제휴 링크로 새창 이동(수익화) -->
          <a class="btn" href="${safe(affUrl)}" target="_blank" rel="noopener nofollow">구매하러 가기</a>
          <!-- 보조: 실제 스크랩 원 판매처 상세(신뢰/편의) -->
          ${sellerUrl ? `<div style="margin-top:6px;font-size:12px">
            <a href="${safe(sellerUrl)}" target="_blank" rel="noopener nofollow" class="muted">원 판매처 상세보기 →</a>
          </div>` : ``}
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
          <div class="updated">판매처 ${sellers.length}개</div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>판매처</th>
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
