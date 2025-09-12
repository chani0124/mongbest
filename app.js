(function(){
  const data = window.MB_DATA || { brands: [] };

  const fmt = (n)=> new Intl.NumberFormat('ko-KR').format(n||0);
  const includeShipEl = document.querySelector('#includeShip');
  const updatedEl = document.querySelector('#updated');
  const variantEl = document.querySelector('#variant');
  const grid = document.querySelector('#brandGrid');
  const search = document.querySelector('#search');
  const yearEl = document.querySelector('#year'); 
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  if(updatedEl && data.lastUpdated){
    updatedEl.textContent = new Date(data.lastUpdated)
      .toLocaleString('ko-KR', { timeZone:'Asia/Seoul' });
  }
  if(variantEl && data.variant) variantEl.textContent = data.variant;

  function finalPrice(s){
    const ship = includeShipEl?.checked ? (s.shippingKRW||0) : 0;
    return (s.priceKRW||0) + ship;
  }

  function rowHTML(s){
    const ship = (s.shippingKRW && s.shippingKRW>0) ? `₩${fmt(s.shippingKRW)}` : '무료';
    const href = s.url || '#';
    return `
      <tr>
        <td class="seller">${s.name||'-'}</td>
        <td>₩${fmt(s.priceKRW||0)}</td>
        <td>${ship}</td>
        <td class="final">₩${fmt(finalPrice(s))}</td>
        <td>${s.delivery||'-'}</td>
        <td class="buy">
          <a class="btn" href="${href}" target="_blank" rel="noopener nofollow">구매하러 가기</a>
        </td>
      </tr>
    `;
  }

  function cardHTML(b){
    const sellers = [...(b.sellers||[])].sort((a,b)=> finalPrice(a)-finalPrice(b));
    const rows = sellers.length ? sellers.map(rowHTML).join('')
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
              <tr><th>판매처</th><th>가격</th><th>배송비</th><th>최종가</th><th>배송</th><th>구매</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>
    `;
  }

  function render(){
    const q = (search?.value || "").trim();
    const brands = (data.brands||[]).filter(b => !q || (b.name.includes(q) || b.id.includes(q)));
    grid.innerHTML = brands.map(cardHTML).join('');
  }

  includeShipEl?.addEventListener('change', render);
  search?.addEventListener('input', render);
  document.querySelector('#refresh')?.addEventListener('click', ()=>location.reload());

  render();
})();
