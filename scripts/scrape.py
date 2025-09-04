from datetime import datetime
from zoneinfo import ZoneInfo
import re, math
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

QUERY = "몽베스트 2L 12"

PRICE_RE = re.compile(r"(\d[\d,\.]+)\s*원?")

def to_int_krw(s: str) -> int:
    if not s: return math.inf
    s = s.replace(",", "")
    m = PRICE_RE.search(s)
    if m:
        try:
            return int(float(m.group(1)))
        except:
            return math.inf
    digits = re.sub(r"[^\d]", "", s)
    return int(digits) if digits.isdigit() else math.inf

def pick_min(items):
    items = [i for i in items if isinstance(i.get("price"), (int, float)) and i["price"] < 10_000_000]
    if not items: return None
    return sorted(items, key=lambda x: x["price"])[0]

def crawl_coupang(page):
    url = f"https://www.coupang.com/np/search?q={QUERY}"
    try:
        page.goto(url, timeout=45000)
        page.wait_for_selector("ul.search-product-list", timeout=15000)
        soup = BeautifulSoup(page.content(), "lxml")
        items = []
        for li in soup.select("ul.search-product-list li.search-product"):
            name_el = li.select_one(".name")
            price_el = li.select_one(".price-value")
            link_el = li.select_one("a.search-product-link")
            if not name_el or not link_el: continue
            name = name_el.get_text("", strip=True)
            price = price_el.get_text("", strip=True) if price_el else ""
            href = "https://www.coupang.com" + link_el.get("href", "")
            if "몽베스트" in name:
                items.append({"name": name, "price": to_int_krw(price), "url": href, "delivery": "로켓/일반", "shipping": 0})
        best = pick_min(items)
        if best:
            return {"id":"coupang","name":"쿠팡","url":best["url"],"priceKRW":best["price"],"shippingKRW":0,"delivery":best["delivery"]}
    except Exception as e:
        pass
    return None

def crawl_11st(page):
    url = f"https://search.11st.co.kr/Search.tmall?kwd={QUERY}"
    try:
        page.goto(url, timeout=45000)
        page.wait_for_selector("div.product_list", timeout=15000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for p in soup.select("div.product_list div.c_product_top"):
            name_el = p.select_one("a.c_prd_name")
            price_el = p.select_one("strong.c_prd_price")
            if not name_el: continue
            name = name_el.get_text("", strip=True)
            price = price_el.get_text("", strip=True) if price_el else ""
            href = name_el.get("href", "")
            if href and not href.startswith("http"):
                href = "https:" + href
            if "몽베스트" in name:
                items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"일반","shipping":0})
        best = pick_min(items)
        if best:
            return {"id":"11st","name":"11번가","url":best["url"],"priceKRW":best["price"],"shippingKRW":0,"delivery":best["delivery"]}
    except Exception as e:
        pass
    return None

def crawl_gmarket(page):
    url = f"https://browse.gmarket.co.kr/search?keyword={QUERY}"
    try:
        page.goto(url, timeout=45000)
        page.wait_for_selector("div.box__component-itemcard", timeout=15000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for c in soup.select("div.box__component-itemcard"):
            name_el = c.select_one(".text__item")
            price_el = c.select_one(".box__price-seller strong")
            link_el = c.select_one("a.link__item")
            if not name_el or not link_el: continue
            name = name_el.get_text("", strip=True)
            price = price_el.get_text("", strip=True) if price_el else ""
            href = link_el.get("href", "")
            if "몽베스트" in name:
                items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"일반","shipping":3000})
        best = pick_min(items)
        if best:
            return {"id":"gmarket","name":"G마켓","url":best["url"],"priceKRW":best["price"],"shippingKRW":3000,"delivery":best["delivery"]}
    except Exception as e:
        pass
    return None

def crawl_ssg(page):
    url = f"https://www.ssg.com/search.ssg?query={QUERY}"
    try:
        page.goto(url, timeout=45000)
        page.wait_for_selector("div.csrch_lst", timeout=15000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for it in soup.select("div.csrch_lst li"):
            name_el = it.select_one(".tit")
            price_el = it.select_one(".ssg_price")
            link_el = it.select_one("a")
            if not name_el or not link_el: continue
            name = name_el.get_text("", strip=True)
            price = price_el.get_text("", strip=True) if price_el else ""
            href = "https://www.ssg.com" + link_el.get("href", "")
            if "몽베스트" in name:
                items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"쓱배송","shipping":0})
        best = pick_min(items)
        if best:
            return {"id":"ssg","name":"SSG","url":best["url"],"priceKRW":best["price"],"shippingKRW":0,"delivery":best["delivery"]}
    except Exception as e:
        pass
    return None

def crawl_danawa(page):
    url = f"https://search.danawa.com/dsearch.php?query={QUERY}"
    try:
        page.goto(url, timeout=45000)
        page.wait_for_selector("ul.product_list", timeout=15000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for li in soup.select("ul.product_list li.prod_item"):
            name_el = li.select_one(".prod_name")
            price_el = li.select_one(".price_sect strong")
            if not name_el: continue
            name = name_el.get_text("", strip=True)
            price = price_el.get_text("", strip=True) if price_el else ""
            link_el = li.select_one(".prod_name a")
            href = link_el.get("href", "") if link_el else ""
            if "몽베스트" in name:
                items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"일반","shipping":0})
        best = pick_min(items)
        if best:
            return {"id":"danawa","name":"다나와","url":best["url"],"priceKRW":best["price"],"shippingKRW":0,"delivery":best["delivery"]}
    except Exception as e:
        pass
    return None

def crawl_naver(page):
    url = f"https://search.shopping.naver.com/search/all?query={QUERY}"
    try:
        page.goto(url, timeout=45000)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for it in soup.select("div.product_item, div.basicList_info_area__"):
            title = it.get_text(" ", strip=True)[:120]
            if "몽베스트" not in title: 
                continue
            price_text = ""
            cand = it.select_one(".price_num__") or it.select_one(".price_num") or it.select_one(".price") or it.select_one("strong")
            if cand:
                price_text = cand.get_text(" ", strip=True)
            link_el = it.select_one("a")
            href = link_el.get("href", "") if link_el else ""
            if href.startswith("/"):
                href = "https://search.shopping.naver.com" + href
            items.append({"name":title,"price":to_int_krw(price_text),"url":href,"delivery":"스토어별","shipping":2500})
        best = pick_min(items)
        if best:
            return {"id":"naver","name":"네이버쇼핑","url":best["url"],"priceKRW":best["price"],"shippingKRW":2500,"delivery":best["delivery"]}
    except Exception as e:
        pass
    return None

def run_all():
    sellers=[]
    kst = ZoneInfo("Asia/Seoul")
    now = datetime.now(kst).isoformat()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(locale="ko-KR")
        try:
            for fn in [crawl_coupang, crawl_danawa, crawl_11st, crawl_gmarket, crawl_ssg, crawl_naver]:
                try:
                    res = fn(page)
                    if res: sellers.append(res)
                except Exception:
                    pass
        finally:
            browser.close()

    content = f"""/* Auto-generated by scripts/scrape.py */
window.MB_DATA = {{
  product: "몽베스트 생수 2L x 12",
  lastUpdated: "{now}",
  sellers: {sellers}
}};
""".strip() + "\n"

    with open("prices.js", "w", encoding="utf-8") as f:
        f.write(content)

    print("prices.js updated at", now, "count:", len(sellers))

if __name__ == "__main__":
    run_all()
