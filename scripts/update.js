fetch('../products.json')
  .then(response => response.json())
  .then(data => {
    const list = document.getElementById('product-list');
    data.forEach(product => {
      const item = document.createElement('div');
      item.className = 'product';
      item.innerHTML = `
        <h3>${product.name}</h3>
        <p>가격: ${product.price}</p>
        <a href="${product.link}" target="_blank">구매하러 가기</a>
      `;
      list.appendChild(item);
    });
  })
  .catch(error => console.error('데이터 로드 실패:', error));