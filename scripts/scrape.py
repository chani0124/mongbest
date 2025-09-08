from datetime import datetime
from zoneinfo import ZoneInfo
import re, math, time, sys, traceback
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

# ---------- CONFIG ----------
QUERY = "몽베스트 2L 12"
EXCLUDE = ["공병","빈병","라벨지","스티커","사은품","증정"]
# Per-site time budget (seconds)
GOTO_TIMEOUT = 10000   # 10s
WAIT_TIMEOUT = 8000    # 8s
SITE_BUDGET = 12       # at most ~12s per site
# ----------------------------

PRICE_RE = re.compile(r"(\d[\d,\.]*)\s*원?")

def log(*args):
    print("[MB]", *args, flush=True)

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
    t = (title or "").strip()
    if not ("몽베스트" in t and ("2L" in t or "2 L" in t or "2리터" in t) and ("12" in t or "12개" in t or "12입" in t)):
        return False
    if any(x in t for x in EXCLUDE): return False
    return True

def best(items):
    items = [i for i in items if isinstance(i.get("price"), (int,float)) and i["price"]<10_000_000]
    for i in items: i["total"] = i.get("price",0) + i.get("shipping",0)
    items.sort(key=lambda x:x["total"])
    return items[0] if items else None

def goto_fast(page, url):
    page.goto(url, wait_until="domcontentloaded", timeout=GOTO_TIMEOUT)

def content_fast(page):
    return page.content()

# --------- Site Crawlers (fast/lenient) ---------
def crawl_coupang(page):
    url = f"https://www.coupang.com/np/search?q={QUERY}"
    try:
        goto_fast(page, url); time.sleep(0.8)
        soup = BeautifulSoup(content_fast(page), "lxml")
        items=[]
        for li in soup.select("li.search-product"):
            name_el = li.select_one(".name"); link_el = li.select_one("a.search-product-link")
            price_el = li.select_one(".price-value") or li.select_one(".sale-price strong")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = "https://www.coupang.com" + link_el.get("href","")
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"로켓/일반","shipping":0})
        b = best(items)
        if b: return {"id":"coupang","name":"쿠팡","url":b["url"],"priceKRW":b["price"],"shippingKRW":b["shipping"],"delivery":b["delivery"]}
    except Exception as e:
        log("쿠팡 예외:", e)
    return None

def crawl_11st(page):
    url = f"https://search.11st.co.kr/Search.tmall?kwd={QUERY}&sortCd=NP"
    try:
        goto_fast(page, url); time.sleep(0.8)
        soup = BeautifulSoup(content_fast(page), "lxml")
        items=[]
        for p in soup.select("div.product_list div.c_product_top"):
            a = p.select_one("a.c_prd_name"); price_el = p.select_one("strong.c_prd_price")
            if not a: continue
            name = a.get_text("", strip=True)
            if not is_target(name): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = a.get("href","")
            if href and not href.startswith("http"): href = "https:"+href
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"일반","shipping":0})
        b = best(items)
        if b: return {"id":"11st","name":"11번가","url":b["url"],"priceKRW":b["price"],"shippingKRW":0,"delivery":b["delivery"]}
    except Exception as e:
        log("11번가 예외:", e)
    return None

def crawl_gmarket(page):
    url = f"https://browse.gmarket.co.kr/search?keyword={QUERY}&sort=lowest_price"
    try:
        goto_fast(page, url); time.sleep(0.8)
        soup = BeautifulSoup(content_fast(page), "lxml")
        items=[]
        for c in soup.select("div.box__component-itemcard"):
            name_el = c.select_one(".text__item"); link_el = c.select_one("a.link__item"); price_el = c.select_one(".box__price-seller strong")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = link_el.get("href","")
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"일반","shipping":3000})
        b = best(items)
        if b: return {"id":"gmarket","name":"G마켓","url":b["url"],"priceKRW":b["price"],"shippingKRW":3000,"delivery":b["delivery"]}
    except Exception as e:
        log("G마켓 예외:", e)
    return None

def crawl_ssg(page):
    url = f"https://www.ssg.com/search.ssg?query={QUERY}"
    try:
        goto_fast(page, url); time.sleep(0.8)
        soup = BeautifulSoup(content_fast(page), "lxml")
        items=[]
        for it in soup.select("div.csrch_lst li"):
            name_el = it.select_one(".tit"); link_el = it.select_one("a"); price_el = it.select_one(".ssg_price")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = "https://www.ssg.com" + link_el.get("href","")
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"쓱배송","shipping":0})
        b = best(items)
        if b: return {"id":"ssg","name":"SSG","url":b["url"],"priceKRW":b["price"],"shippingKRW":0,"delivery":b["delivery"]}
    except Exception as e:
        log("SSG 예외:", e)
    return None

def crawl_danawa(page):
    url = f"https://search.danawa.com/dsearch.php?query={QUERY}"
    try:
        goto_fast(page, url); time.sleep(0.8)
        soup = BeautifulSoup(content_fast(page), "lxml")
        items=[]
        for li in soup.select("ul.product_list li.prod_item"):
            name_el = li.select_one(".prod_name"); link_el = li.select_one(".prod_name a"); price_el = li.select_one(".price_sect strong")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = link_el.get("href","")
            items.append({"name":name,"price":to_int_krw(price),"url":href,"delivery":"일반","shipping":0})
        b = best(items)
        if b: return {"id":"danawa","name":"다나와","url":b["url"],"priceKRW":b["price"],"shippingKRW":0,"delivery":b["delivery"]}
    except Exception as e:
        log("다나와 예외:", e)
    return None

def crawl_naver(page):
    url = f"https://search.shopping.naver.com/search/all?sort=price_asc&query={QUERY}"
    try:
        goto_fast(page, url); time.sleep(0.8)
        soup = BeautifulSoup(content_fast(page), "lxml")
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
    except Exception as e:
        log("네이버 예외:", e)
    return None

def run_all():
    sellers=[]; now = datetime.now(ZoneInfo("Asia/Seoul")).isoformat()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0", viewport={"width":1280,"height":800}, locale="ko-KR")
        page = context.new_page()
        try:
            for name, fn in [
                ("coupang", crawl_coupang),
                ("danawa", crawl_danawa),
                ("11st",   crawl_11st),
                ("gmarket",crawl_gmarket),
                ("ssg",    crawl_ssg),
                ("naver",  crawl_naver),
            ]:
                res = None
                try:
                    res = fn(page)
                except Exception as e:
                    log(f"{name} 실패:", e)
                if res: sellers.append(res)
        finally:
            context.close(); browser.close()

    content = f"""
/* Auto-generated by scripts/scrape.py (fast mode) */
window.MB_DATA = {{
  product: "몽베스트 생수 2L x 12",
  lastUpdated: "{now}",
  sellers: {sellers}
}};
""".strip()+"\n"
    with open("prices.js","w",encoding="utf-8") as f: f.write(content)
    log("RESULT sellers:", len(sellers))
    print("prices.js updated at", now, "count:", len(sellers))

if __name__ == "__main__":
    run_all()
