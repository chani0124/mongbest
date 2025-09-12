from datetime import datetime
from zoneinfo import ZoneInfo
import re, math, time, json, os
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

# ===== 설정 =====
BRANDS = [
    {"id":"mongbest",  "name":"몽베스트"},
    {"id":"samdasu",   "name":"삼다수"},
    {"id":"baeksansu", "name":"백산수"},
    {"id":"icisis",    "name":"아이시스"},
    {"id":"sparkle",   "name":"스파클"},
    {"id":"crystal",   "name":"크리스탈가이저"},
]
VARIANT = "2L × 12"
QUERY_TMPL = "{brand} 2L 12"

GOTO_TIMEOUT = 10_000   # 페이지 로드 10s
SITE_BUDGET  = 12       # 사이트별 최대 12초 가이드
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"

PRICE_RE = re.compile(r"(\d[\d,\.]*)\s*원?")
EXCLUDE = ["공병","빈병","라벨지","스티커","사은품","증정"]

def log(*args): print("[MB]", *args, flush=True)

def to_int_krw(s):
    if not s: return math.inf
    s = s.replace(",", "")
    m = PRICE_RE.search(s)
    if m:
        try: return int(float(m.group(1)))
        except: return math.inf
    digits = re.sub(r"[^\d]","",s)
    return int(digits) if digits.isdigit() else math.inf

def is_target(title, brand):
    t = (title or "").strip()
    ok = (brand in t) and (("2L" in t) or ("2 L" in t) or ("2리터" in t)) and ("12" in t or "12개" in t or "12입" in t)
    bad = any(x in t for x in EXCLUDE)
    return ok and not bad

def best(items):
    items = [i for i in items if isinstance(i.get("price"), (int,float)) and i["price"] < 10_000_000]
    for i in items:
        i["total"] = (i.get("price",0) + i.get("shipping",0))
    items.sort(key=lambda x:x["total"])
    return items[0] if items else None

def goto(page, url):
    page.goto(url, wait_until="domcontentloaded", timeout=GOTO_TIMEOUT)

# ----- 각 사이트 크롤러 (빠르게/관대하게) -----
def crawl_coupang(page, q, brand):
    url = f"https://www.coupang.com/np/search?q={q}"
    try:
        goto(page, url); time.sleep(0.8)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for li in soup.select("li.search-product"):
            name_el = li.select_one(".name"); link_el = li.select_one("a.search-product-link")
            price_el = li.select_one(".price-value") or li.select_one(".sale-price strong")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name, brand): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = "https://www.coupang.com" + link_el.get("href","")
            items.append({"name":name, "price":to_int_krw(price), "url":href, "delivery":"로켓/일반", "shipping":0})
        return best(items)
    except Exception as e:
        log("쿠팡 예외:", e); return None

def crawl_11st(page, q, brand):
    url = f"https://search.11st.co.kr/Search.tmall?kwd={q}&sortCd=NP"  # 낮은가격순
    try:
        goto(page, url); time.sleep(0.8)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for p in soup.select("div.product_list div.c_product_top"):
            a = p.select_one("a.c_prd_name"); price_el = p.select_one("strong.c_prd_price")
            if not a: continue
            name = a.get_text("", strip=True)
            if not is_target(name, brand): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = a.get("href","")
            if href and not href.startswith("http"): href = "https:"+href
            items.append({"name":name, "price":to_int_krw(price), "url":href, "delivery":"일반", "shipping":0})
        return best(items)
    except Exception as e:
        log("11번가 예외:", e); return None

def crawl_gmarket(page, q, brand):
    url = f"https://browse.gmarket.co.kr/search?keyword={q}&sort=lowest_price"
    try:
        goto(page, url); time.sleep(0.8)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for c in soup.select("div.box__component-itemcard"):
            name_el = c.select_one(".text__item"); link_el = c.select_one("a.link__item")
            price_el = c.select_one(".box__price-seller strong")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name, brand): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = link_el.get("href","")
            items.append({"name":name, "price":to_int_krw(price), "url":href, "delivery":"일반", "shipping":3000})
        return best(items)
    except Exception as e:
        log("G마켓 예외:", e); return None

def crawl_ssg(page, q, brand):
    url = f"https://www.ssg.com/search.ssg?query={q}"
    try:
        goto(page, url); time.sleep(0.8)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for it in soup.select("div.csrch_lst li"):
            name_el = it.select_one(".tit"); link_el = it.select_one("a"); price_el = it.select_one(".ssg_price")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name, brand): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = "https://www.ssg.com" + link_el.get("href","")
            items.append({"name":name, "price":to_int_krw(price), "url":href, "delivery":"쓱배송", "shipping":0})
        return best(items)
    except Exception as e:
        log("SSG 예외:", e); return None

def crawl_danawa(page, q, brand):
    url = f"https://search.danawa.com/dsearch.php?query={q}"
    try:
        goto(page, url); time.sleep(0.8)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for li in soup.select("ul.product_list li.prod_item"):
            name_el = li.select_one(".prod_name"); link_el = li.select_one(".prod_name a")
            price_el = li.select_one(".price_sect strong")
            if not (name_el and link_el): continue
            name = name_el.get_text("", strip=True)
            if not is_target(name, brand): continue
            price = price_el.get_text("", strip=True) if price_el else ""
            href = link_el.get("href","")
            items.append({"name":name, "price":to_int_krw(price), "url":href, "delivery":"일반", "shipping":0})
        return best(items)
    except Exception as e:
        log("다나와 예외:", e); return None

def crawl_naver(page, q, brand):
    url = f"https://search.shopping.naver.com/search/all?sort=price_asc&query={q}"
    try:
        goto(page, url); time.sleep(0.8)
        soup = BeautifulSoup(page.content(), "lxml")
        items=[]
        for a in soup.select("a"):
            title = a.get_text(" ", strip=True)[:150]
            href = a.get("href","")
            if not href: continue
            if not is_target(title, brand): continue
            parent = a.parent
            text_block = parent.get_text(" ", strip=True) if parent else title
            price = to_int_krw(text_block)
            if href.startswith("/"):
                href = "https://search.shopping.naver.com"+href
            items.append({"name":title, "price":price, "url":href, "delivery":"스토어별", "shipping":2500})
        return best(items)
    except Exception as e:
        log("네이버 예외:", e); return None

SITES = [
    ("쿠팡","coupang",  crawl_coupang,  0),
    ("다나와","danawa",  crawl_danawa,  0),
    ("11번가","11st",    crawl_11st,    0),
    ("G마켓","gmarket",  crawl_gmarket, 3000),
    ("SSG","ssg",        crawl_ssg,     0),
    ("네이버쇼핑","naver", crawl_naver,   2500),
]

def run():
    kst = ZoneInfo("Asia/Seoul")
    now = datetime.now(kst).isoformat()
    out = {"lastUpdated": now, "variant": VARIANT, "brands":[]}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=UA, viewport={"width":1280,"height":800}, locale="ko-KR")
        page = context.new_page()

        for b in BRANDS:
            brand = b["name"]
            q = QUERY_TMPL.format(brand=brand)
            sellers=[]
            log("== BRAND:", brand, "| QUERY:", q)
            for (site_name, site_id, fn, ship) in SITES:
                start = time.time()
                try:
                    res = fn(page, q, brand)
                    if res:
                        sellers.append({
                            "id": site_id, "name": site_name,
                            "url": res["url"], "priceKRW": res["price"],
                            "shippingKRW": ship, "delivery": res.get("delivery","")
                        })
                        log(site_id, "ok", res["price"], res["url"][:100])
                    else:
                        log(site_id, "no result")
                except Exception as e:
                    log(site_id, "error:", e)
                remain = SITE_BUDGET - (time.time()-start)
                if remain > 0:
                    time.sleep(min(remain, 0.3))
            out["brands"].append({"id": b["id"], "name": brand, "sellers": sellers})

        context.close(); browser.close()

    os.makedirs("data", exist_ok=True)
    js = "window.MB_DATA = " + json.dumps(out, ensure_ascii=False) + ";\n"
    with open("data/prices.js","w",encoding="utf-8") as f:
        f.write(js)
    log("RESULT brands:", len(out["brands"]))

if __name__ == "__main__":
    run()
