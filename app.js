(function(){
  const data = window.MB_DATA || { sellers: [] };
  const fmt = (n)=> new Intl.NumberFormat('ko-KR').format(n||0);
  const includeShipEl = document.querySelector('#includeShip');
  const tbody = document.querySelector('#rows');
  const updatedEl = document.querySelector('#updated');
  const productEl = document.querySelector('#productName');
  const yearEl = document.querySelector('#year'); if(yearEl) yearEl.textContent = new Date().getFullYear();
  productEl.textContent = data.product || '몽베스트 생수';

  function effectivePrice(s){ const ship = includeShipEl && includeShipEl.checked ? (s.shippingKRW||0) : 0; return (s.priceKRW||0)+ship; }
  function render(){
    if(updatedEl) updatedEl.textContent = (data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}) : new Date().toLocaleString('ko-KR'));
    const sellers = [...(data.sellers||[])].sort((a,b)=>effectivePrice(a)-effectivePrice(b));
    tbody.innerHTML = sellers.map(s=>{
      const final = effectivePrice(s);
      const shipText = (s.shippingKRW && s.shippingKRW>0) ? `₩${fmt(s.shippingKRW)}` : '무료';
      const href = s.url || '#';
      return `
        <tr>
          <td class="seller">${s.name||'-'}</td>
          <td class="price">₩${fmt(s.priceKRW||0)}</td>
          <td class="ship">${shipText}</td>
          <td class="final">₩${fmt(final)}</td>
          <td class="deliv">${s.delivery||'-'}</td>
          <td class="buy"><a class="btn" href="${href}" target="_blank" rel="noopener nofollow" aria-label="${s.name}에서 구매하기">구매하러 가기</a></td>
        </tr>`
    }).join('');
  }
  if(includeShipEl) includeShipEl.addEventListener('change', render);
  document.querySelector('#refresh')?.addEventListener('click', ()=>location.reload());
  render();
})();