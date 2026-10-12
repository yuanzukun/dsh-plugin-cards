#!/usr/bin/env python3
"""只读对比：本地出厂快照(2026-09-25T14:11Z) vs GitHub topic:dsh-plugin 当前状态。
未认证限流 10 req/min -> 请求间 sleep 7s。"""
import json, time, urllib.request, urllib.parse, ssl

CUTOFF = "2026-09-25T13:56:40Z"   # 快照数据截止时刻
CREATED_AFTER = "2026-09-25"       # 新插件判定
QDATE = "2025-09-28"               # quality 口径：近12月
HEADERS = {"Accept": "application/vnd.github+json", "User-Agent": "dsh-plugin-cards-dev"}
ctx = ssl.create_default_context()

def api(q, per_page=100, page=1):
    url = "https://api.github.com/search/repositories?" + urllib.parse.urlencode({
        "q": q, "sort": "updated", "order": "desc", "per_page": per_page, "page": page})
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            print(f"  retry {attempt+1}: {e}")
            time.sleep(65 if "403" in str(e) or "429" in str(e) else 10)
    return {}

QUALITY = f"topic:dsh-plugin stars:>=3 pushed:>={QDATE} dsh in:name,description,topics"

results = {}

# 1) quality 口径当前总数
d = api(QUALITY + f" created:<{CREATED_AFTER}")
results["quality_total_existing"] = d.get("total_count")
print("① quality口径(剔除新建) total =", d.get("total_count"))
time.sleep(7)

# 2) 快照后新建的仓库（新插件）
d = api(f"topic:dsh-plugin created:>{CREATED_AFTER}", per_page=100)
new_repos = [{"full_name": it["full_name"], "stars": it["stargazers_count"],
              "created_at": it["created_at"], "pushed_at": it["pushed_at"],
              "description": (it.get("description") or "")[:80],
              "archived": it.get("archived"), "fork": it.get("fork")}
             for it in d.get("items", []) if not it.get("fork") and not it.get("archived")]
results["new_repos_total"] = d.get("total_count")
results["new_repos"] = new_repos
print(f"② 快照后新建仓库 total = {d.get('total_count')}，有效(非fork非archived)={len(new_repos)}")
for r in new_repos[:30]:
    print("   +", r["created_at"][:10], r["full_name"], "★"+str(r["stars"]), "|", r["description"])
time.sleep(7)

# 3) 快照截止后有推送的仓库数（quality 口径）
d = api(QUALITY + f" pushed:>{CUTOFF}", per_page=30)
pushed = [{"full_name": it["full_name"], "stars": it["stargazers_count"], "pushed_at": it["pushed_at"]}
          for it in d.get("items", []) if not it.get("fork") and not it.get("archived")]
results["quality_pushed_total"] = d.get("total_count")
results["quality_pushed_top"] = pushed[:30]
print(f"③ quality口径 快照后有推送 total = {d.get('total_count')}")
for r in pushed[:15]:
    print("   ~", r["pushed_at"][:16], r["full_name"], "★"+str(r["stars"]))
time.sleep(7)

# 4) 全口径当前总数（topic 一致性）
d = api("topic:dsh-plugin", per_page=1)
results["all_total_now"] = d.get("total_count")
print("④ topic:dsh-plugin 全口径 total =", d.get("total_count"))

with open(r"D:/导航/dsh-plugin/scripts/sync-check-result.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print("saved -> scripts/sync-check-result.json")
