import json
from datetime import datetime

# 실제 크롤링 로직은 여기에 구현해야 함 (쿠팡, 다나와 등)
products = [
    {
        "source": "쿠팡",
        "name": "몽베스트 생수 2L x 12병",
        "price": "8,900원",
        "image": "https://via.placeholder.com/250x150?text=Mongbest",
        "link": "https://www.coupang.com/vp/products/123"
    },
    {
        "source": "다나와",
        "name": "몽베스트 500ml x 80",
        "price": "22,680원",
        "image": "https://via.placeholder.com/250x150?text=Danawa",
        "link": "https://prod.danawa.com/info/?pcode=456"
    }
]

with open("data/products.json", "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=2)
