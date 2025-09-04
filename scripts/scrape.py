from datetime import datetime
from zoneinfo import ZoneInfo
import re, math
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

QUERY = "몽베스트 2L 12"
EXCLUDE = ["공병","빈병","라벨지","스티커"]
PRICE_RE = re.compile(r"(\d[\d,\.]*)\s*원?")

def to_int_krw(s):
    if not s: return math.inf
    s = s.replace(",", "")
    m = PRICE_RE.search(s)
    if m:
        try: return int(float(m.group(1)))
        except: return math.inf
    digits = re.sub(r"[^\d]","",s)
    return int(digits) if digits.isdigit() else math.inf

def is_target(title):
    t = title or ""
    if not ("몽베스트" in t and ("2L" in t or "2 L" in t or "2리터" in t) and ("12" in t or "12개" in t or "12입" in t)): return False
    if any(x in t for x in EXCLUDE): return False
    return True

def best(items):
    items = [i for i in items if isinstance(i.get("price"), (int,float)) and i["price"]<10_000_000]
    for i in items: i["total"] = i.get("price",0) + i.get("shipping",0)
    return sorted(items, key=lambda x:x["total"])[0] if items else None

def crawl_coupang(page):
    url = f"https://www.coupang.com/np/search?q={QUERY}"
    try:
        page.goto(url, timeout=60000)
        page.wait_for_selector("ul.search-product-list", timeout=20000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for li in soup.select("ul.search-product-list li.search-product"):
            name = (li.select_one(".name") or {}).get_text("", strip=True)
            link = li.select_one("a.search-product-link")
            price = (li.select_one(".price-value") or {}).get_text("", strip=True)
            if not (name and link): continue
            if not is_target(name): continue
            href = "https://www.coupang.com" + link.get("href","")
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"로켓/일반","shipping":0})
        b = best(items)
        if b: return {"id":"coupang","name":"쿠팡","url":b["url"],"priceKRW":b["price"],"shippingKRW":b["shipping"],"delivery":b["delivery"]}
    except Exception as e: print("쿠팡 실패:", e)
    return None

def crawl_11st(page):
    url = f"https://search.11st.co.kr/Search.tmall?kwd={QUERY}"
    try:
        page.goto(url, timeout=60000)
        page.wait_for_selector("div.product_list", timeout=20000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for p in soup.select("div.product_list div.c_product_top"):
            a = p.select_one("a.c_prd_name"); price_el = p.select_one("strong.c_prd_price")
            if not a: continue
            name = a.get_text("", strip=True)
            if not is_target(name): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = a.get("href",""); 
            if href and not href.startswith("http"): href = "https:"+href
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"일반","shipping":0})
        b = best(items)
        if b: return {"id":"11st","name":"11번가","url":b["url"],"priceKRW":b["price"],"shippingKRW":0,"delivery":b["delivery"]}
    except Exception as e: print("11번가 실패:", e)
    return None

def crawl_gmarket(page):
    url = f"https://browse.gmarket.co.kr/search?keyword={QUERY}"
    try:
        page.goto(url, timeout=60000)
        page.wait_for_selector("div.box__component-itemcard", timeout=20000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for c in soup.select("div.box__component-itemcard"):
            name_el = c.select_one(".text__item"); price_el = c.select_one(".box__price-seller strong"); link_el = c.select_one("a.link__item")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = link_el.get("href","")
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"일반","shipping":3000})
        b = best(items)
        if b: return {"id":"gmarket","name":"G마켓","url":b["url"],"priceKRW":b["price"],"shippingKRW":3000,"delivery":b["delivery"]}
    except Exception as e: print("G마켓 실패:", e)
    return None

def crawl_ssg(page):
    url = f"https://www.ssg.com/search.ssg?query={QUERY}"
    try:
        page.goto(url, timeout=60000)
        page.wait_for_selector("div.csrch_lst", timeout=20000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for it in soup.select("div.csrch_lst li"):
            name_el = it.select_one(".tit"); link_el = it.select_one("a"); price_el = it.select_one(".ssg_price")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = "https://www.ssg.com"+link_el.get("href","")
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"쓱배송","shipping":0})
        b = best(items)
        if b: return {"id":"ssg","name":"SSG","url":b["url"],"priceKRW":b["price"],"shippingKRW":0,"delivery":b["delivery"]}
    except Exception as e: print("SSG 실패:", e)
    return None

def crawl_danawa(page):
    url = f"https://search.danawa.com/dsearch.php?query={QUERY}"
    try:
        page.goto(url, timeout=60000)
        page.wait_for_selector("ul.product_list", timeout=20000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for li in soup.select("ul.product_list li.prod_item"):
            name_el = li.select_one(".prod_name"); price_el = li.select_one(".price_sect strong"); link_el = li.select_one(".prod_name a")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = link_el.get("href","")
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"일반","shipping":0})
        b = best(items)
        if b: return {"id":"danawa","name":"다나와","url":b["url"],"priceKRW":b["price"],"shippingKRW":0,"delivery":b["delivery"]}
    except Exception as e: print("다나와 실패:", e)
    return None

def crawl_naver(page):
    url = f"https://search.shopping.naver.com/search/all?query={QUERY}"
    try:
        page.goto(url, timeout=60000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for a in soup.select("a"):
            title = a.get_text(" ", strip=True)[:150]
            href = a.get("href","")
            if not href: continue
            if not is_target(title): continue
            parent = a.parent
            text_block = parent.get_text(" ", strip=True) if parent else title
            price = to_int_krw(text_block)
            if href.startswith("/"):
                href = "https://search.shopping.naver.com"+href
            items.append({"name":title,"price":price,"url":href,"delivery":"스토어별","shipping":2500})
        b = best(items)
        if b: return {"id":"naver","name":"네이버쇼핑","url":b["url"],"priceKRW":b["price"],"shippingKRW":2500,"delivery":b["delivery"]}
    except Exception as e: print("네이버 실패:", e)
    return None

def run_all():
    sellers=[]; now = datetime.now(ZoneInfo("Asia/Seoul")).isoformat()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(locale="ko-KR")
        try:
            for fn in [crawl_coupang, crawl_danawa, crawl_11st, crawl_gmarket, crawl_ssg, crawl_naver]:
                try:
                    r = fn(page)
                    if r: sellers.append(r)
                except Exception as e:
                    print("에러:", e)
        finally:
            browser.close()
    content = f\"\"\"
/* Auto-generated by scripts/scrape.py */
window.MB_DATA = {{
  product: "몽베스트 생수 2L x 12",
  lastUpdated: "{now}",
  sellers: {sellers}
}};
\"\"\".strip() + "\\n"
    with open("prices.js","w",encoding="utf-8") as f: f.write(content)
    print("prices.js updated at", now, "count:", len(sellers))

if __name__ == "__main__":
    run_all()
