function createCommunitySection(ctx, form) {
  var pm = ctx.remote.pluginManager
  return function CommunitySection() {
    useLocaleTick()
    // ⚠️ 同 ConfigCardView：实例方法必须经箭头/包装函数调用保住 this
    var snapshot = useSyncExternalStore(
      function (cb) { return form.subscribe(cb) },
      function () { return form.getSnapshot() },
    )
    var rawUrl = (snapshot.status === 'ready' && snapshot.value && typeof snapshot.value.catalogUrl === 'string')
      ? snapshot.value.catalogUrl.trim() : ''
    var catalogUrl = rawUrl || DEFAULT_CATALOG_URL
    // 0.3.3：LLM 翻译配置（OpenAI 兼容端点；key 为空 → MyMemory 回退）
    var llv = (snapshot.status === 'ready' && snapshot.value) || {}
    var llmCfg = {
      endpoint: typeof llv.llmEndpoint === 'string' ? llv.llmEndpoint.trim() : '',
      model: typeof llv.llmModel === 'string' ? llv.llmModel.trim() : '',
      key: typeof llv.llmApiKey === 'string' ? llv.llmApiKey.trim() : '',
    }
    var llmReady = llmCfg.endpoint !== '' && llmCfg.model !== '' && llmCfg.key !== ''
    var itemsState = useState(null)
    var items = itemsState[0], setItems = itemsState[1]
    var errState = useState('')
    var error = errState[0], setError = errState[1]
    // 0.9.28：q/tab/cat/sub 持久化（dcards.mktview.v1）——卸载/安装完成后宿主整页刷新重挂载本块，
    // 不恢复则搜索词清空、被踢出市场上下文（真机 E2E 实证）；形状校验在 marketViewLoad 内
    var mktView0 = marketViewLoad() || {}
    var queryState = useState(mktView0.q || '')
    var query = queryState[0], setQuery = queryState[1]
    var busyState = useState('')
    var busy = busyState[0], setBusy = busyState[1]
    var msgState = useState('')
    var message = msgState[0], setMessage = msgState[1]
    // 0.3.0：分页 / 质量过滤 / 分类 / 话题 chips；0.4.0：经典分页（页码+每页条数）与排序切换
    var pageState = useState(1)
    var page = pageState[0], setPage = pageState[1]
    var totalState = useState(null)
    var totalCount = totalState[0], setTotalCount = totalState[1]
    var pageSizeState = useState(50)
    var pageSize = pageSizeState[0], setPageSize = pageSizeState[1]
    var sortState = useState('stars') // 'stars' | 'updated'
    var sortBy = sortState[0], setSortBy = sortState[1]
    // 0.8.2：星数门槛 chip（0=全部 / 3 / 10），过滤 0 星长尾噪音；注意纯 npm 条目无星数，门槛 >0 时会被隐藏
    var starMinState = useState(0)
    var starMin = starMinState[0], setStarMin = starMinState[1]
    var pagingState = useState(false) // 翻页/刷新请求进行中
    var paging = pagingState[0], setPaging = pagingState[1]
    var qualityState = useState(true) // 默认开：★>=0（不限星数，1.1.0）+ 近 12 个月更新 + dsh 关键词，覆盖官方 topic 页并压无关噪音
    var qualityOn = qualityState[0], setQualityOn = qualityState[1]
    // 0.7.0：仅可安装过滤默认开、口径收紧为「只显示可安装」：installable===false（未声明 dsh.bundle，宿主拒装）
    // 与 null（快照存在但未快筛）一律隐藏；undefined（实时 Search 兜底路径，无快筛数据可查）保留，否则兜底目录会整体消失。
    var onlyInstState = useState(true)
    var onlyInstallable = onlyInstState[0], setOnlyInstallable = onlyInstState[1]
    // 1.1.0：npm 渠道开关（默认关）。source==='npm' 条目不在官方 topic 页（github.com/topics/dsh-plugin），
    // 不符合「目录条目须来自官方社区仓库」的口径，默认隐藏；打开后在快照索引构建时纳入（缓存键含此开关）。
    var npmChanState = useState(true) // 0.9.5：默认开（用户决策变更，原 1.1.0 默认关=只看官方 topic 口径）
    var npmChan = npmChanState[0], setNpmChan = npmChanState[1]
    // 1.2.0：引擎兼容开关（默认开）。engineCompat===0（dsh.engine 与桌面端运行时不兼容）条目
    // 装上即坏，与「不可安装」同级默认隐藏；null（未声明/未校验）保留，宿主安装时终审。
    var engineState = useState(true)
    var engineOn = engineState[0], setEngineOn = engineState[1]
    // 0.9.12 P2：目录视图模式（grid|list），记忆于 localStorage
    var VIEW_KEY = 'dcards.viewMode'
    var viewModeState = useState((function () { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid' } catch (eVm) { return 'grid' } })())
    var viewMode = viewModeState[0], setViewMode = viewModeState[1]
    var catState = useState(mktView0.cat || '') // '' = 全部分类（0.9.28：初始值从持久化恢复）
    var activeCat = catState[0], setActiveCat = catState[1]
    var catExpandState = useState(false) // 0.9.23：分类行折叠态（默认单行，「更多 ▾」展开全量）
    var catExpand = catExpandState[0], setCatExpand = catExpandState[1]
    var subCatState = useState(mktView0.sub || '') // 0.9.11 二级分类：'' = 子类·全部（0.9.28：从持久化恢复，load 时已保证依附 cat）
    var activeSub = subCatState[0], setSubCat = subCatState[1]
    // 0.5.4 全量精确统计：{ status:'loading'|'ready'|'error', done, total, items, counts, builtAt }
    // items = 全量 compact 条目（按 ★ 降序）；counts = {分类: 精确条数}
    var catIdxState = useState(null)
    var catIdx = catIdxState[0], setCatIdx = catIdxState[1]
    // 跨页过滤模式的客户端页码（选中分类且索引就绪时生效）
    var viewPageState = useState(1)
    var viewPage = viewPageState[0], setViewPage = viewPageState[1]
    // 0.7.0：已安装完整 BundleInfo 列表（listBundles @Remote；null = 尚未拿到）——管理区块与卡片更新检测共用
    var bundlesState = useState(null)
    var bundles = bundlesState[0], setBundles = bundlesState[1]
    // 0.3.2：描述中文翻译恒开（无开关；txRef 为真值源，txTick 仅驱动重渲染）
    var txRef = useRef(txCacheLoad())
    var txInflightRef = useRef({})
    var txQuotaRef = useRef({ until: 0, tries: 0 }) // 0.9.16：429 不再会话永久停用——记录退避截止时间，到期自动恢复重试
    var txTickState = useState(0)
    var setTxTick = txTickState[1]
    // 0.9.14 P1-3：手动重试翻译 —— 清「本轮停用」标记并重跑翻译 effect（txRetryTick 为 effect 依赖）
    var txRetryState = useState(0)
    var txRetryTick = txRetryState[0], setTxRetry = txRetryState[1]
    // 0.8.11 官方源同步：effect 内部持有 startHarvest 闭包，按钮经此 ref 直采（避免为触发同步重跑整个 effect）
  var harvestKickRef = useRef(null)
  var snapKickRef = useRef(null)
  var ghSearch = isGithubSearchApi(resolveCatalogApi(catalogUrl))

    /** 拉取指定页（0.4.0 经典分页：整页替换，不再追加合并）。 */
    var load = useCallback(function (reqPage) {
      setError(''); setMessage('')
      setPaging(true)
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
      var timer = ctrl ? setTimeout(function () { ctrl.abort() }, CATALOG_TIMEOUT_MS) : null
      var opts = { headers: { Accept: 'application/vnd.github+json' } }
      if (ctrl) opts.signal = ctrl.signal
      var resolved = resolveCatalogApi(catalogUrl)
      // 官方 Search API：注入分页/每页条数/排序与质量限定符；自建源：原样取（无分页语义）
      var url = ghSearch
        ? buildSearchUrl(topicOfSearchUrl(resolved) || 'dsh-plugin', reqPage, qualityOn, pageSize, sortBy)
        : resolved
      fetch(url, opts)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)) })
        .then(function (data) {
          if (timer) clearTimeout(timer)
          // 兼容三种形态：数组 / {items:[…]}（Search API）/ 其他对象（如 404 的 {message}）
          var list = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : [])
          if (!list.length && data && data.message) throw new Error(T('mk.errSource') + data.message)
          list = list.filter(function (it) { return it && !it.fork && !it.archived })
          list.sort(rankSort)
          setItems(list)
          setTotalCount(ghSearch && data && typeof data.total_count === 'number' ? data.total_count : null)
          setPage(reqPage)
        })
        .catch(function (e) {
          if (timer) clearTimeout(timer)
          var msg = String((e && e.message) || e)
          if (e && e.name === 'AbortError') msg = T('mk.timeout', { s: Math.round(CATALOG_TIMEOUT_MS / 1000) })
          if (msg.indexOf('403') !== -1) msg = T('mk.err403')
          setError(msg)
        })
        .then(function () { setPaging(false) })
    }, [catalogUrl, qualityOn, ghSearch, pageSize, sortBy])

    // 0.7.0：已安装名单与版本（refreshInstalled 供安装/卸载/启停/更新完成后统一刷新）
    var useEffectFn = react.useEffect
    var refreshInstalled = useCallback(function () {
      return Promise.resolve()
        .then(function () { return pm.listBundles() })
        .then(unwrapRpc)
        .then(function (list) { setBundles(Array.isArray(list) ? list : []) })
        .catch(function () { setBundles([]) })
    }, [pm])
    useEffectFn(function () { refreshInstalled() }, [refreshInstalled])
    // 派生：bundle 包名名单 + 已装版本表（卡片按包名 ≈ 仓库名匹配，失败静默降级为未知）
    var installed = null
    var installedVer = {}
    if (bundles !== null) {
      installed = {}
      for (var bi = 0; bi < bundles.length; bi++) {
        var bb = bundles[bi]
        if (bb && bb.installed && bb.name) {
          installed[bb.name] = true
          if (bb.version) installedVer[bb.name] = bb.version
        }
      }
    }
    // 0.8.3 实时版本表：{ bundleName: { v: '最新版'|null, at } }；v=null 表示无 npm 包（git-only），回退快筛比较
    var rtVerState = useState({})
    var rtVer = rtVerState[0], setRtVer = rtVerState[1]
    // 0.9.28：repo → 实际 bundle 名映射（localStorage 持久化）——一仓多包（root 包名 ≠ 仓库名）场景，
    // 已安装判定候选键 [npm, name] 全 miss，凭安装成功时学到的映射补第三键（installedNameFor 消费）
    var repoPkgState = useState(repoPkgMapLoad)
    var repoPkg = repoPkgState[0], setRepoPkg = repoPkgState[1]
    useEffectFn(function () {
      if (bundles === null || !bundles.length) return
      var cache = rtverCacheLoad()
      var parts = rtverPartition(cache, bundles, Date.now())
      var seeded = parts.seeded
      // 0.8.16 SWR：先渲染已有缓存（含 stale 旧值），后台刷新完成后再热更新——不再让界面干等全部查询
      if (!parts.pending.length && !parts.revalidate.length) { setRtVer(seeded); return }
      setRtVer(seeded)
      Promise.all(parts.pending.concat(parts.revalidate).map(function (n) {
        return fetchNpmLatest(n).then(function (v) {
          var rec = { v: v, at: Date.now() }
          seeded[n] = rec
          cache[n] = rec
        })
      })).then(function () {
        rtverCacheSave(cache)
        setRtVer(Object.assign({}, seeded))
      })
    }, [bundles])

    // 打开页面/切换质量过滤·排序·每页条数时自动回到第 1 页（0.2.3 踩坑：手动点「刷新目录」体验差）
    // （useEffectFn 已在上方已安装名单 effect 前声明，勿在此重复赋值）
    useEffectFn(function () { load(1) }, [load])

    // 0.5.4 全量精确统计：后台分桶抓取该 topic 全部仓库，逐条分类后缓存 24h。
    // Search API 单查询上限 1000 条（第 11 页起 422）→ 按星数区间分桶递归（同星数堆积时按 pushed 日期拆）。
    // 页间 7s（未认证限流 10 次/分钟），403/429 退避 65s；全量约需数分钟，期间分类行显示进度、点击仅过滤本页。
    useEffectFn(function () {
      if (!ghSearch || totalCount === null || totalCount <= 0) return
      var cancelled = false
      var cached = catIdxCacheLoad((qualityOn ? 1 : 0) + (npmChan ? 2 : 0) + (engineOn ? 4 : 0), totalCount)
      // 0.8.20：面板常驻自动刷新 —— 每 30min 检查一次，1h 节流闸门限频（实际拉取 ≥1h 一次）；
      // builtAt 更新才无缝替换，无更新零渲染零流量；组件卸载（关面板/切 Tab）随 cleanup 清除。
      // 局限：面板完全关闭时组件未挂载，无法后台运行（宿主无插件后台钩子）——「开着面板」即全自动。
      var snapTimer = setInterval(function () {
        if (cancelled) return
        var lastAuto = 0
        try { lastAuto = Number(localStorage.getItem('dsh-plugin-cards.snapRefreshAt') || 0) } catch (eT0) { lastAuto = 0 }
        if (Date.now() - lastAuto <= 3600000) return
        try { localStorage.setItem('dsh-plugin-cards.snapRefreshAt', String(Date.now())) } catch (eT1) { /* 隐私模式静默 */ }
        var minAuto = (cached && typeof cached.builtAt === 'number') ? cached.builtAt : null
        trySnap(snapshotUrlCandidates(), minAuto).then(function (okAuto) {
          if (okAuto && !cancelled) maybeOfficialSync() // 快照更新后顺带检查 24h 直采是否到期
        })
      }, 1800000)
      // 0.8.23 修复：ref 赋值必须在 cached 分支之前 —— 原先在无缓存路径（0.5.5 重构起），缓存命中时
      // 提前 return 导致两个 ref 恒为 null，「同步快照」「官方源同步」点击静默无反应。
      // startHarvest / trySnap / maybeOfficialSync 均为函数声明（提升），此处可安全引用。
      harvestKickRef.current = function () { startHarvest(false) }
      snapKickRef.current = function () {
        var min = (cached && typeof cached.builtAt === 'number') ? cached.builtAt : null
        return trySnap(snapshotUrlCandidates(), min)
      }
      if (cached) {
        setCatIdx({ status: 'ready', done: cached.items.length, total: totalCount, items: cached.items, counts: cached.counts, builtAt: cached.builtAt })
        // 0.8.7 R2 refresh-on-open：缓存先上屏，后台静默拉最新快照（builtAt 更新才无缝替换）。
        // 1h 节流：避免每次开面板都拉 2.8MB；写时间戳在拉取前，失败也计入节流。
        try { var lastRef = Number(localStorage.getItem('dsh-plugin-cards.snapRefreshAt') || 0) } catch (e0) { lastRef = 0 }
        if (Date.now() - lastRef > 3600000) {
          try { localStorage.setItem('dsh-plugin-cards.snapRefreshAt', String(Date.now())) } catch (e1) { /* 隐私模式静默 */ }
          trySnap(snapshotUrlCandidates(), cached.builtAt)
        }
        // 0.8.11：缓存命中也要检查官方源同步是否到期（快照只保证 ≤72h，官方 topic 直采 ≤24h）
        maybeOfficialSync()
        return function () { cancelled = true; clearInterval(snapTimer); harvestKickRef.current = null; snapKickRef.current = null }
      }
      // 0.5.5：收割主体包成 startHarvest——快照候选全部失败/过期后才进入（历史分桶方案保留为兜底）。
      // silent=true：出厂快照已先行上屏，收割作为后台静默升级，完成时无缝替换（不显示「统计中」）。
      function startHarvest(silent) {
        if (cancelled) return
        var resolved = resolveCatalogApi(catalogUrl)
        var topic = topicOfSearchUrl(resolved) || 'dsh-plugin'
        var seen = {}
        var collected = []
        // 0.9.16：直采前留存 zh 映射（full_name → descZh）——GitHub Search API 原始数据无中文，
        // 不回填的话直采完成即整表英文，把带 zh 的快照数据顶掉（本轮「市场仍有英文」的闭环根因）。
        // 数据源优先级：zhmap.v1（随每次 catIdxCacheSave 持久化的快照/回填译文，不随 catidx 被顶掉）> 现有 catidx
        var zhMap = {}
        try {
          var zm0 = JSON.parse(localStorage.getItem('dsh-plugin-cards.zhmap.v1') || '{}')
          if (zm0 && typeof zm0 === 'object') for (var zk in zm0) { if (zm0[zk]) zhMap[zk] = zm0[zk] }
        } catch (eZm0) { /* 无持久化映射，退化用 catidx */ }
        try {
          var prevCat = catIdxCacheLoad((qualityOn ? 1 : 0) + (npmChan ? 2 : 0) + (engineOn ? 4 : 0), totalCount)
          if (prevCat && Array.isArray(prevCat.items)) {
            for (var zi = 0; zi < prevCat.items.length; zi++) {
              var zIt = prevCat.items[zi]
              if (zIt && zIt.full_name && zIt.descZh && !zhMap[zIt.full_name]) zhMap[zIt.full_name] = zIt.descZh
            }
          }
        } catch (eZm) { /* zhMap 保持已有内容 */ }
        if (!silent) setCatIdx({ status: 'loading', done: 0, total: totalCount, items: null, counts: null, builtAt: 0 })

      function bucketUrl(bucket, pg) { return buildSearchUrl(topic, pg, qualityOn, 100, 'stars', bucket) }
      function fetchBucketPage(bucket, pg, attempt) {
        if (cancelled) return Promise.reject(new Error('__cancelled__'))
        return fetch(bucketUrl(bucket, pg), { headers: { Accept: 'application/vnd.github+json' } })
          .then(function (r) {
            if (cancelled) return Promise.reject(new Error('__cancelled__'))
            if (r.status === 403 || r.status === 429) {
              if (attempt >= 2) throw new Error('HTTP 403')
              return new Promise(function (res) { setTimeout(res, 65000) }).then(function () { return fetchBucketPage(bucket, pg, attempt + 1) })
            }
            if (!r.ok) throw new Error('HTTP ' + r.status)
            return r.json()
          })
      }
      function absorb(list) {
        var added = 0
        for (var i = 0; i < list.length; i++) {
          var it = compactItem(list[i])
          if (!it.full_name || seen[it.full_name]) continue
          seen[it.full_name] = true
          collected.push(it)
          added++
        }
        return added
      }
      function progress() {
        if (!cancelled) setCatIdx(function (prev) {
          return prev && prev.status === 'loading' ? Object.assign({}, prev, { done: collected.length }) : prev
        })
      }
      function waitGap() { return new Promise(function (r2) { setTimeout(r2, CATIDX_INTERVAL_MS) }) }
      // ---- 0.9.18：日期维度二分切点（直采兜底）。f(x)=count(dim:>=x) 单调递减，收敛到 f(x)≈total/2。
      // pushed 与 created 属不同限定符类型可共存取交集；同星数堆积且 pushed 天粒度无切点（0★/1★ 新仓潮
      // 1.2 万条 pushed 全压最近 2 天，f 只会等于 total/0，二分必空转 ~14 发）时降级 created 维度。 ----
      function withDim(bucket, key, val) { var nb = {}, k; for (k in bucket) nb[k] = bucket[k]; nb[key] = val; return nb }
      function probeTotal(bucket) {
        return fetchBucketPage(bucket, 1, 0).then(function (d) {
          return d && typeof d.total_count === 'number' ? d.total_count : -1
        })
      }
      function bisectDim(bucket, total, field, lo, hi, tries) {
        if (cancelled) return Promise.resolve(null)
        if (tries <= 0 || hi - lo <= 36 * 3600 * 1000) return Promise.resolve(hi)
        var mid = new Date((lo + hi) / 2).toISOString().slice(0, 10)
        return waitGap().then(function () {
          return probeTotal(withDim(bucket, field === 'pushed' ? 'pmin' : 'cmin', mid))
        }).then(function (n) {
          if (n < 0) return null
          return n > total / 2
            ? bisectDim(bucket, total, field, Date.parse(mid), hi, tries - 1)
            : bisectDim(bucket, total, field, lo, Date.parse(mid), tries - 1)
        })
      }
      function findDimSplit(bucket, total, field) {
        var DAY = 24 * 3600 * 1000
        var lo, hi
        if (field === 'pushed') {
          lo = bucket.pmin ? Date.parse(bucket.pmin) : Date.now() - 365 * DAY
          hi = bucket.pmax ? Date.parse(bucket.pmax) : Date.now() + DAY
        } else {
          lo = bucket.cmin ? Date.parse(bucket.cmin) : Date.parse('2015-01-01') // DSH 生态无更早仓库
          hi = bucket.cmax ? Date.parse(bucket.cmax) : Date.now() + DAY
        }
        return bisectDim(bucket, total, field, lo, hi, 14).then(function (hi2) {
          if (hi2 === null) return null
          return waitGap().then(function () {
            return probeTotal(withDim(bucket, field === 'pushed' ? 'pmin' : 'cmin', new Date(hi2).toISOString().slice(0, 10)))
          }).then(function (fh) {
            // 切点两侧都必须非空，否则子桶与父桶同量级递归空转
            return fh > 0 && fh < total ? new Date(hi2).toISOString().slice(0, 10) : null
          })
        })
      }
      // 收割一个桶：页 1..min(10, 总页数)；未收完则以下界星数递归，同星数堆积改按 pushed/created 日期拆
      function fetchBucket(bucket, depth) {
        return fetchBucketPage(bucket, 1, 0).then(function (d) {
          if (cancelled) return
          var total = d && typeof d.total_count === 'number' ? d.total_count : 0
          var list1 = d && Array.isArray(d.items) ? d.items : []
          list1 = list1.filter(function (it) { return it && !it.fork && !it.archived })
          var before = collected.length
          absorb(list1)
          progress()
          if (total === 0) return
          var pages = Math.min(Math.ceil(total / 100), SEARCH_RESULT_CAP / 100)
          var lastList = list1
          var chain = Promise.resolve()
          for (var p = 2; p <= pages; p++) {
            ;(function (pg) {
              chain = chain.then(function () {
                return fetchBucketPage(bucket, pg, 0).then(function (dd) {
                  if (cancelled) return
                  lastList = (dd.items || []).filter(function (it) { return it && !it.fork && !it.archived })
                  absorb(lastList)
                  progress()
                  return waitGap()
                })
              })
            })(p)
          }
          return chain.then(function () {
            if (cancelled) return
            if (total <= SEARCH_RESULT_CAP || pages < SEARCH_RESULT_CAP / 100) return // 本桶已收完
            var s = lastList.length ? lastList[lastList.length - 1].stargazers_count : 0
            var next = null
            if (bucket.smax == null || s < bucket.smax) {
              // 星数下界切分：父桶前 1000 页已覆盖 stars > s，剩余收 [smin..s]；继承全部日期约束
              next = function () { return fetchBucket(withDim(bucket, 'smax', s), depth) }
            } else if (depth < 24) {
              next = function () {
                // 0.9.18：同星数堆积 → 日期维度二分。先一发探测 pushed 是否退化
                //（f(≥now-2d)=total → 天粒度无切点，二分必空转 ~14 发），退化直接走 created
                var tailB = withDim(bucket, 'pmin', new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 10))
                return waitGap().then(function () { return probeTotal(tailB) }).then(function (tailN) {
                  var pushedTry = tailN >= total ? Promise.resolve(null) : findDimSplit(bucket, total, 'pushed')
                  return pushedTry.then(function (ps) {
                    if (ps) {
                      return fetchBucket(withDim(bucket, 'pmax', ps), depth + 1)
                        .then(function () { return waitGap() })
                        .then(function () { return fetchBucket(withDim(bucket, 'pmin', ps), depth + 1) })
                    }
                    return findDimSplit(bucket, total, 'created').then(function (cs) {
                      if (!cs) return null // pushed/created 都拆不开：极端同质数据保留已抓部分
                      return fetchBucket(withDim(bucket, 'cmax', cs), depth + 1)
                        .then(function () { return waitGap() })
                        .then(function () { return fetchBucket(withDim(bucket, 'cmin', cs), depth + 1) })
                    })
                  })
                })
              }
            } else {
              return null // 深度护栏：极端同质数据保留已抓部分
            }
            return waitGap().then(next)
          })
        })
      }
      fetchBucket({}, 0).then(function () {
        if (cancelled) return
        // 0.9.16：直采条目回填快照 zh（zhMap 缺失时维持原文，走运行时翻译兜底）
        for (var zi2 = 0; zi2 < collected.length; zi2++) {
          var cIt = collected[zi2]
          if (cIt && !cIt.descZh && zhMap[cIt.full_name]) cIt.descZh = zhMap[cIt.full_name]
        }
        // 排序（★ 降序）+ 逐条分类计数
        collected.sort(rankSort)
        var counts = {}
        for (var m = 0; m < collected.length; m++) {
          var lab = classifyItem(collected[m])
          counts[lab] = (counts[lab] || 0) + 1
        }
        var builtAt = Date.now()
        catIdxCacheSave({ v: CATIDX_RULES_VER, q: (qualityOn ? 1 : 0) + (npmChan ? 2 : 0) + (engineOn ? 4 : 0), total: totalCount, builtAt: builtAt, counts: counts, items: collected })
        try { localStorage.setItem(OFFICIAL_SYNC_AT_KEY, String(builtAt)) } catch (eS) { /* 隐私模式静默 */ }
        setCatIdx({ status: 'ready', done: collected.length, total: totalCount, items: collected, counts: counts, builtAt: builtAt })
      }).catch(function (e) {
        if (cancelled) return
        if (e && String(e.message) === '__cancelled__') return
        if (!silent) setCatIdx({ status: 'error', done: 0, total: 0, items: null, counts: null, builtAt: 0 }) // 静默升级失败时保留现有快照数据
        // 0.8.18：直采失败退避 1h —— 把 maybeOfficialSync 预写的 24h 时间戳改写为「1h 后到期」，
        // 失败不再死等 24h（旧行为：预写时间戳在拉取前，一次失败 = 24h 内不再自动直采）
        try { localStorage.setItem(OFFICIAL_SYNC_AT_KEY, String(Date.now() - OFFICIAL_SYNC_TTL_MS + 3600000)) } catch (eB) { /* 隐私模式静默 */ }
      })
      }
      // 0.8.11 官方源同步调度：距上次全量直采超过 24h 时静默重跑收割（官方 topic 全量直采，
      // 不依赖 hub 快照构建节奏）；写时间戳在拉取前做节流，成功完成后再刷新为完成时刻。
      function maybeOfficialSync() {
        if (cancelled) return
        var last = 0
        try { last = Number(localStorage.getItem(OFFICIAL_SYNC_AT_KEY) || 0) } catch (e0) { last = 0 }
        if (Date.now() - last > OFFICIAL_SYNC_TTL_MS) {
          try { localStorage.setItem(OFFICIAL_SYNC_AT_KEY, String(Date.now())) } catch (e1) { /* 隐私模式静默 */ }
          setTimeout(function () { if (!cancelled) startHarvest(true) }, 3000)
        }
      }
      // 0.8.23：ref 赋值已上移到 cached 分支之前（缓存命中也要能触发按钮）
      // 0.5.5：串行尝试快照候选（每个 10s 超时），任一成功即秒级就绪；全部失败回退出厂快照/收割。
      // 0.8.7 R2：minBuiltAt 传入时跳过 72h 新鲜度检查，改为「builtAt 更新才接受」——供缓存命中后的后台静默刷新。
      // 0.9.22：两处新鲜度补强（2026-10-12 实测 jsDelivr 三域名缓存分裂：主域已刷新版、fastly/gcore 滞后 ~12h 且带 38 条旧英文残留）——
      //   ① 递归丢失 minBuiltAt 修复：原 trySnap(urls.slice(1)) 把刷新链路的 builtAt 下限丢掉，首个源被拒后
      //      后续源无检查地接受，可能把已有缓存降级覆盖成更旧快照；现全参数透传。
      //   ② 初始链路陈旧守卫：正常产出节奏 12h/版，builtAt 超 SNAP_STALE_MS 的源不再「首个 200 即接受」，
      //      记为 bestStale 继续尝试下一个源；全源耗尽取 builtAt 最新的陈旧版兜底（仍优于出厂快照/直采）。
      var SNAP_STALE_MS = 13 * 3600 * 1000
      function trySnap(urls, minBuiltAt, bestStale) {
        if (cancelled || !urls || !urls.length) {
          if (minBuiltAt == null && bestStale && bestStale.data) {
            var stS = catIdxFromSnapshot(bestStale.data, qualityOn, totalCount, CATIDX_SNAPSHOT_TTL_MS, npmChan, engineOn)
            if (stS) { setCatIdx(stS); return Promise.resolve(true) }
          }
          return Promise.resolve(false)
        }
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
        // 0.8.18：快照膨胀至 ~3.9MB（8313 条）后 10s 在大陆直连经常拉不完 → 60s；
        // URL 加 cache-busting 防桌面端 webview HTTP 缓存返回旧响应（旧 builtAt 会被 minBuiltAt 静默拒绝，表现为目录永远不更新）
        var timer = ctrl ? setTimeout(function () { ctrl.abort() }, 60000) : null
        var u = urls[0] + (urls[0].indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now()
        return fetch(u, { headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
          .then(function (data) {
            if (cancelled) return false
            // R2 防护：catIdxFromSnapshot 会回写缓存，旧快照必须先于它拦截
            if (minBuiltAt != null && data && typeof data.builtAt === 'number' && data.builtAt <= minBuiltAt) return false
            // 0.9.22：初始链路陈旧守卫——记住最新陈旧版并继续尝试下一个源（全源陈旧时用它兜底）
            if (minBuiltAt == null && data && typeof data.builtAt === 'number' && Date.now() - data.builtAt > SNAP_STALE_MS) {
              if (!bestStale || data.builtAt > (bestStale.builtAt || 0)) bestStale = { data: data, builtAt: data.builtAt }
              return false
            }
            var st = catIdxFromSnapshot(data, qualityOn, totalCount, minBuiltAt != null ? null : CATIDX_SNAPSHOT_TTL_MS, npmChan, engineOn)
            if (!st) return false
            setCatIdx(st)
            return true
          })
          .catch(function () { return false })
          .then(function (ok) {
            if (timer) clearTimeout(timer)
            if (ok) return true
            return new Promise(function (r2) { setTimeout(r2, 300) }).then(function () { return trySnap(urls.slice(1), minBuiltAt, bestStale) })
          })
      }
      // 快照四级链路：localStorage 缓存(24h) → 在线快照(≤72h) → 出厂快照(内联+后台静默收割升级) → 分桶收割
      trySnap(snapshotUrlCandidates()).then(function (ok) {
        if (cancelled) return
        if (ok) { maybeOfficialSync(); return } // 0.8.11：快照就绪 ≠ 官方源新鲜，仍按 24h 节流直采官方 topic
        var st = catIdxFromSnapshot(FACTORY_SNAPSHOT, qualityOn, totalCount, null, npmChan, engineOn)
        if (st) { setCatIdx(st); startHarvest(true); return }
        startHarvest(false)
      })
      return function () { cancelled = true; clearInterval(snapTimer); harvestKickRef.current = null; snapKickRef.current = null }
    }, [catalogUrl, qualityOn, npmChan, engineOn, ghSearch, totalCount])

    // ---- 0.5.4 数据源与过滤（置于翻译 effect 之前，供其作用于当前渲染条目） ----
    // 索引就绪 → 全部视图与分类视图都走全量索引（客户端分页/跨页过滤/全局搜索）；
    // 未就绪 → 维持服务端分页（分类仅过滤本页）。
    var idxReady = !!(catIdx && catIdx.status === 'ready' && catIdx.items)
    var crossPage = !!(activeCat && idxReady)
    function matchQuery(it) {
      if (!query) return true
      var spec = specOf(it) || ''
      // 0.9.14：搜索域纳入 descZh（hub 预翻译中文）——中文关键词可命中英文描述插件（descZh 与 description 原文同时可搜）
      var text = spec + ' ' + (it.description || '') + ' ' + (it.descZh || '')
      return text.toLowerCase().indexOf(query.toLowerCase()) !== -1
    }
    var filtered = null
    if (idxReady) {
      var hasSubs = !!(activeCat && subsOf(activeCat)) // 0.9.11：父类有子类定义时才启用子类过滤
      filtered = catIdx.items.filter(function (it) {
        if (onlyInstallable && (it.installable === false || it.installable === null)) return false
        if (activeCat && classifyItem(it) !== activeCat) return false
        if (hasSubs && activeSub && classifySub(it, activeCat) !== activeSub) return false
        if (starMin > 0 && (it.stargazers_count || 0) < starMin) return false
        return matchQuery(it)
      })
      if (sortBy === 'updated') {
        filtered = filtered.slice().sort(function (a, b) { return String(b.updated_at || '').localeCompare(String(a.updated_at || '')) })
      }
    } else if (items) {
      filtered = items.filter(function (item) {
        if (onlyInstallable && (item.installable === false || item.installable === null)) return false
        if (!matchCat(item, activeCat)) return false
        if (starMin > 0 && (item.stargazers_count || 0) < starMin) return false
        return matchQuery(item)
      })
    }
    var viewTotalPages = idxReady ? Math.max(1, Math.ceil((filtered ? filtered.length : 0) / pageSize)) : 1
    var effViewPage = idxReady ? Math.min(Math.max(1, viewPage), viewTotalPages) : 1
    var pageItems = idxReady && filtered ? filtered.slice((effViewPage - 1) * pageSize, effViewPage * pageSize) : filtered
    var txSig = (idxReady ? 'i:' + (activeCat || 'all') + ':' + effViewPage + ':' + sortBy : 'p:' + page) + ':' + (pageItems ? pageItems.length : 0) + ':' + query + ':' + (qualityOn ? 1 : 0)

    // 0.9.14 P1-3：本页未翻译计数（英文描述、无 hub 译文、无缓存/在途翻译）；随 txTick 重渲染自动刷新
    var txMissingN = 0
    if (pageItems && pageItems.length) {
      for (var tmi = 0; tmi < pageItems.length; tmi++) {
        var tmIt = pageItems[tmi]
        var tmD = tmIt && tmIt.description
        if (!tmD || /[\u4e00-\u9fff]/.test(tmD)) continue
        if (isPlaceholderDesc(tmD, tmIt.name)) continue // 0.9.16：占位描述不算未翻译
        var tmH = hashStr(tmD)
        if (tmIt.descZh || txRef.current[tmH] || txInflightRef.current[tmH]) continue
        txMissingN++
      }
    }

    // 描述批量翻译（0.3.3）：LLM 批量优先（15 条/请求，串行），失败或未配置 key 时回退 MyMemory（并发 4 单条）。
    // 结果进 localStorage 持久缓存；MyMemory 配额耗尽本轮停用，LLM 故障本轮停用（避免反复打错误端点）。
    var llmSig = llmReady ? llmCfg.endpoint + '|' + llmCfg.model + '|' + hashStr(llmCfg.key) : ''
    var llmDownRef = useRef(false)
    var llmSigRef = useRef(llmSig)
    if (llmSigRef.current !== llmSig) { llmSigRef.current = llmSig; llmDownRef.current = false }
    useEffectFn(function () {
      if (!pageItems || !pageItems.length) return
      var llmDown = llmDownRef.current, mmQuota = Date.now() < txQuotaRef.current.until
      var missing = []
      var seen = {}
      for (var i = 0; i < pageItems.length; i++) {
        var d = pageItems[i] && pageItems[i].description
        if (!d || d.length > TX_MAX_LEN) continue
        if (/[\u4e00-\u9fff]/.test(d)) continue // 本身是中文，跳过
        if (isPlaceholderDesc(d, pageItems[i].name)) continue // 0.9.16：占位描述不可译，跳过
        var h = hashStr(d)
        if (txRef.current[h] || seen[h] || txInflightRef.current[h]) continue
        seen[h] = true
        missing.push({ h: h, d: d })
      }
      if (!missing.length) return
      var cancelled = false
      var save = function () {
        if (cancelled) return
        txCacheSave(txRef.current)
        setTxTick(function (v) { return v + 1 })
      }

      // ---- 路径一：LLM 批量（15 条/请求，串行；失败置 llmDown 并把剩余交给 MyMemory） ----
      function runLLM() {
        var BATCH = 15
        var p = Promise.resolve()
        for (var start = 0; start < missing.length; start += BATCH) {
          ;(function (s) {
            p = p.then(function () {
              if (cancelled || llmDownRef.current) return
              var chunk = {}
              var n = Math.min(s + BATCH, missing.length)
              for (var j = s; j < n; j++) {
                txInflightRef.current[missing[j].h] = true
                chunk[missing[j].h] = missing[j].d
              }
              return txBatchLLM(chunk, llmCfg).then(function (map) {
                for (var k in map) {
                  if (!cancelled) txRef.current[k] = map[k]
                  delete txInflightRef.current[k]
                }
                save()
              }).catch(function (e) {
                llmDownRef.current = true
                for (var k in chunk) delete txInflightRef.current[k]
                console.warn('[dsh-plugin-cards] LLM 翻译失败，本会话回退 MyMemory:', (e && e.message) || e)
              })
            })
          })(start)
        }
        return p
      }

      // ---- 路径二：MyMemory 单条并发（原 0.3.1 逻辑） ----
      function runMM(list) {
        var idx = 0
        function worker() {
          if (cancelled || Date.now() < txQuotaRef.current.until || idx >= list.length) return Promise.resolve()
          var job = list[idx++]
          txInflightRef.current[job.h] = true
          return txOne(job.d).then(function (t) {
            delete txInflightRef.current[job.h]
            if (t && !cancelled) txRef.current[job.h] = t
            return worker()
          }).catch(function (e) {
            delete txInflightRef.current[job.h]
            if (String((e && e.message) || '').indexOf('quota') !== -1) {
              var q = txQuotaRef.current // 0.9.16：指数退避——10min 起 ×2，封顶 320min，到期自动恢复（txSig 触发重跑）
              q.tries = Math.min(q.tries + 1, TX_MM_BACKOFF_MAX_SHIFT + 1)
              q.until = Date.now() + TX_MM_BACKOFF_BASE * (1 << (q.tries - 1))
              console.warn('[dsh-plugin-cards] MyMemory 限额，退避 ' + Math.round((q.until - Date.now()) / 60000) + ' 分钟后自动重试')
            }
            return Promise.resolve()
          })
        }
        var ws = []
        for (var w = 0; w < TX_CONCURRENCY; w++) ws.push(worker())
        return Promise.all(ws)
      }

      var flow = llmReady && !llmDown && !mmQuota ? runLLM() : Promise.resolve()
      flow.then(function () {
        // LLM 未覆盖的（回退触发/部分成功/未配置）：交给 MyMemory 兜底
        var rest = missing.filter(function (j) { return !txRef.current[j.h] && !txInflightRef.current[j.h] })
        return rest.length ? runMM(rest) : null
      }).then(save)
      return function () { cancelled = true }
    }, [txSig, llmSig, txRetryTick])

    // 0.7.0：卸载两步确认 + pnpm 构建授权待重试信息（{ spec, keys }）
    var confirmRemoveState = useState('')
    var confirmRemove = confirmRemoveState[0], setConfirmRemove = confirmRemoveState[1]
    var pendingBuildsState = useState(null)
    var pendingBuilds = pendingBuildsState[0], setPendingBuilds = pendingBuildsState[1]
    // 0.9.6：上次操作结果卡片数据（kind ok/warn/fail + msg + 用时 + 失败阶段 + 退出码 + 重试参数）——beginOp/clearMsg 时清除
    var lastResultState = useState(null)
    var lastResult = lastResultState[0], setLastResult = lastResultState[1]
    // 0.9.6：操作起点统一清场（message + 结果卡片一起清，避免 toggle 等无 prog 操作残留旧结果卡）
    var clearMsg = useCallback(function () { setMessage(''); setLastResult(null) }, [])
    // 0.9.6：操作收尾 → 写结果卡片（用时/失败阶段/退出码取自 activeOpRef 镜像；msg 仍写 message 供无 prog 场景兜底）
    var finishOp = useCallback(function (kind, msg, retry) {
      var op = activeOpRef.current
      setLastResult({ kind: kind, msg: msg, display: op ? op.display : '', elapsed: op ? Math.max(0, Date.now() - op.startedAt) : 0, step: op ? op.step : '', exitCode: op ? op.exitCode : null, retry: retry || null })
      setMessage(msg)
    }, [])
    // 0.9.6：安装队列（多插件批量）——market/自定义安装统一走确认弹窗，busy 时「加入队列」；
    // 串行执行（pnpm 同 profile 并发有锁冲突风险）；queueRef 镜像供定时器/事件回调读最新值
    var installQueueState = useState([])
    var installQueue = installQueueState[0], setInstallQueue = installQueueState[1]
    var queueRef = useRef([])
    var pumpTimerRef = useRef(null)
    var QUEUE_MAX = 20
    var enqueueInstall = useCallback(function (spec, repoName, fbPlan) {
      if (!spec) return
      if (queueRef.current.length >= QUEUE_MAX) return // 容量护栏
      if (activeOpRef.current && activeOpRef.current.spec === spec) return // 正在安装中的同一 spec 不入队
      for (var i = 0; i < queueRef.current.length; i++) { if (queueRef.current[i].spec === spec) return } // 去重：已在队列不重复入
      queueRef.current = queueRef.current.concat([{ spec: spec, repoName: repoName || '', display: repoName || shortSpecName(spec), fbPlan: fbPlan || null }]) // 0.9.24：fbPlan 随队（降级梯需要条目级 tgz 信息）
      setInstallQueue(queueRef.current)
    }, [])
    var removeQueued = useCallback(function (idx) {
      queueRef.current = queueRef.current.filter(function (_, j) { return j !== idx })
      setInstallQueue(queueRef.current)
    }, [])
    var pumpQueue = useCallback(function () {
      var q = queueRef.current
      if (!q.length) return
      if (activeOpRef.current) return // 0.9.6 并发护栏：已有操作进行中（如泵延迟窗口内用户手动新装）→ 跳过，该操作的收尾泵会接续
      var next = q[0]
      queueRef.current = q.slice(1)
      setInstallQueue(queueRef.current)
      installRef.current(next.spec, next.repoName, { fbPlan: next.fbPlan })
    }, [])
    var installRef = useRef(null) // pumpQueue → install 循环引用解法：install 定义后回填

    // 0.8.0：Tab 导航（market 插件市场 / installed 已安装 / custom 自定义安装 / settings 设置）
    // 0.9.28：tab 从持久化恢复（卸载后整页刷新被踢回会话列表 → 重挂载直接回到原 Tab）
    var tabState = useState(mktView0.tab || 'market')
    var tab = tabState[0], setTab = tabState[1]
    // 安装确认弹窗：{ spec, name, href, cli, gitOnly }（点市场卡片或自定义安装先弹确认，确认后才执行安装）
    var confirmInstState = useState(null)
    var confirmInst = confirmInstState[0], setConfirmInst = confirmInstState[1]
    // 自定义安装输入（npm 包名 / github:owner/repo / 本地 tgz 路径）
    var customSpecState = useState('')
    var customSpec = customSpecState[0], setCustomSpec = customSpecState[1]

    // 0.7.1：pnpm 操作实时进度（宿主事件流：plugin-manager/install-log 输出分块 + install-state 阶段机）
    var progState = useState(null)
    var prog = progState[0], setProg = progState[1]
    var activeOpRef = useRef(null) // { requestId, startedAt, step, exitCode, op, display, spec }——0.9.6 扩展：结果卡片从镜像取用时/失败阶段/退出码
    // 0.9.6：规范步骤键 → 徽章文案（进度卡片步骤条共用；宿主 install-state 阶段经 KEYMAP 归一到这些键）
    var STEP_PHASE = { prepare: 'mk.preparing', verify: 'mk.stepVerify', download: 'mk.stepDownload', enable: 'mk.stepEnabling', done: 'mk.stOn', failed: 'mk.stepFailed' }
    var STEP_LABEL = { prepare: 'mk.preparing', verify: 'mk.sbarVerify', download: 'mk.sbarDownload', enable: 'mk.sbarEnable' }
    // 0.9.6：op 类型 → 步骤条组成（remove 单步无步骤条；build 授权重试从下载开始）
    var OP_STEPS = { install: ['verify', 'download', 'enable'], update: ['verify', 'download', 'enable'], build: ['download', 'enable'], remove: [] }
    var beginOp = useCallback(function (label, requestId, op, display, spec) {
      activeOpRef.current = { requestId: requestId || null, startedAt: Date.now(), step: 'prepare', exitCode: null, op: op || '', display: display || label, spec: spec || '' }
      setProg({ label: label, op: op || '', display: display || label, spec: spec || '', phase: T('mk.preparing'), startedAt: Date.now(), line: '', exitCode: null, counts: null, step: 'prepare' })
      setLastResult(null)
    }, [])
    var stepOp = useCallback(function (key) {
      if (activeOpRef.current) activeOpRef.current.step = key
      setProg(function (prev) { return prev ? Object.assign({}, prev, { step: key, phase: T(STEP_PHASE[key] || key) }) : prev })
    }, [])
    var endOp = useCallback(function () {
      activeOpRef.current = null
      setProg(null)
    }, [])
    useEffectFn(function () {
      var remote = ctx.remote
      if (!remote || typeof remote.$on !== 'function') return
      var lastLineOf = function (text) {
        var parts = String(text || '').split('\n')
        for (var i = parts.length - 1; i >= 0; i--) {
          var s = parts[i].trim()
          if (s) return s.length > 110 ? s.slice(0, 110) + '…' : s
        }
        return ''
      }
      var disposers = [
        remote.$on('plugin-manager/changed', function (chg) {
          // 0.8.9：宿主热卸载后浏览器仍残留旧插件 JS —— 收到卸载事件延迟刷新页面，彻底清除残留功能
          // ⚠️ 事件负载可能是对象或数组（官方客户端测试用 emit(..., [{reason}]) 形态），两种都兼容
          var ev = Array.isArray(chg) ? chg[0] : chg
          if (ev && ev.reason === 'remove' && !pageReloadTimer) {
            pageReloadTimer = setTimeout(function () { window.location.reload() }, 1200)
          }
        }),
        remote.$on('plugin-manager/install-log', function (chunk) {
          var op = activeOpRef.current
          if (!op) return
          // 有 requestId 的分块必须匹配当前操作；无 requestId 的分块（remove/setEnabled）只在当前操作本身无 requestId 时接受
          if (chunk.requestId && op.requestId && chunk.requestId !== op.requestId) return
          if (!chunk.requestId && op.requestId) return
          var patch = {}
          var line = lastLineOf(chunk.text)
          if (line) {
            patch.line = line
            var counts = parsePnpmCounts(line) // 0.9.6：pnpm 计数行 → 结构化计数（卡片人读展示；构建输出等非计数行走原样行兜底）
            if (counts) patch.counts = counts
          }
          if (chunk.exitCode !== undefined && chunk.exitCode !== null) {
            patch.exitCode = chunk.exitCode
            op.exitCode = chunk.exitCode // 0.9.6：镜像到操作引用，结果卡片失败态取用
          }
          if (patch.line !== undefined || patch.exitCode !== undefined) {
            setProg(function (prev) { return prev ? Object.assign({}, prev, patch) : prev })
          }
        }),
        remote.$on('plugin-manager/install-state', function (st) {
          var op = activeOpRef.current
          if (!op || !st || !st.phase || !op.requestId || st.requestId !== op.requestId) return
          // 0.9.6：宿主阶段 → 规范步骤键（步骤条 + 徽章统一由 STEP_PHASE 出文案）
          var KEYMAP = { checking: 'verify', starting: 'download', running: 'download', installing: 'download', installing_deps: 'download', applying: 'enable', unconfirmed: 'enable', cancelling: 'enable', done: 'done', failed: 'failed' }
          var key = KEYMAP[st.phase]
          if (!key) return
          if (activeOpRef.current) activeOpRef.current.step = key
          setProg(function (prev) { return prev ? Object.assign({}, prev, { step: key, phase: T(STEP_PHASE[key] || key) }) : prev })
        }),
      ]
      return function () {
        // 注意：刻意不清 pageReloadTimer（模块作用域）—— 卸载后组件即使卸载重挂，刷新也要继续
        for (var i = 0; i < disposers.length; i++) { try { disposers[i]() } catch (e) { /* 卸载订阅失败可忽略 */ } }
      }
    }, [])
    // 已用时秒表（仅进度激活时每秒重渲染一次）
    useEffectFn(function () {
      if (!prog) return
      var t = setInterval(function () {
        setProg(function (prev) { return prev ? Object.assign({}, prev, { _now: Date.now() }) : prev })
      }, 1000)
      return function () { clearInterval(t) }
    }, [prog ? prog.startedAt : 0])

    /** 0.7.0：两段式安装（官方 ui-plugin-manager 同款）：installBundle enabled:false 落地依赖，
     *  成功后对「新出现的 bundle」逐个 setBundleEnabled(true)。
     *  ⚠️ 实测坑：installBundle 传 enabled:true（或旧字段 activate）会在运行中的 profile 上触发
     *  安装期重载，RPC 永不返回（面板假死）；enabled:false + 事后启用则稳定。 */
    var newUuid = function () {
      return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'req-' + Date.now() + '-' + Math.floor(Math.random() * 1e6)
    }
    var snapshotNames = function () {
      return Promise.resolve().then(function () { return pm.listBundles().then(unwrapRpc) }).then(function (list) {
        var names = {}
        var arr = Array.isArray(list) ? list : []
        for (var i = 0; i < arr.length; i++) { if (arr[i] && arr[i].name) names[arr[i].name] = true }
        return names
      })
    }
    /** 0.8.24：启用失败不再静默——收集失败名单交调用方展示。0.8.23 前失败被空 catch 吞掉，
     *  安装横幅恒报「已安装并启用」，启用失败用户无从得知。
     *  0.9.28：返回 { failed, added, verMap }——added 为本次新出现（安装落地）的 bundle 名名单，
     *  供 install() 学习 repo → 实际包名映射（卡名≠包名判重修正）；verMap 为名→实装版本
     *  （宿主 BundleInfo.version），安装成功横幅带真实版本（市场卡快照版本会滞后 HEAD 实装）。 */
    var enableNewBundles = function (before) {
      return Promise.resolve().then(function () { return pm.listBundles().then(unwrapRpc) }).then(function (list) {
        var arr = Array.isArray(list) ? list : []
        var failed = []
        var added = []
        var verMap = {}
        var seq = Promise.resolve()
        for (var i = 0; i < arr.length; i++) {
          (function (b) {
            if (b && b.name && !before[b.name]) {
              added.push(b.name)
              if (b.version) verMap[b.name] = b.version
              seq = seq.then(function () {
                return pm.setBundleEnabled(b.name, true).then(unwrapRpc).then(function (res) {
                  checkChange(res, T('mk.opEnable', { name: b.name }))
                }).catch(function (e) {
                  var em = String((e && e.message) || e)
                  // 0.9.29：启用失败分类人话化——import 失败（作者打包/宿主兼容性）换自助指引，其余原文
                  failed.push(T('mk.enableFailedItem', { name: b.name, msg: classifyEnableFailure(em) === 'import' ? T('mk.errImportFail') : em }))
                })
              })
            }
          })(arr[i])
        }
        return seq.then(function () { return { failed: failed, added: added, verMap: verMap } })
      })
    }

    /** 0.9.24：npm 渠道候选探测（jsDelivr CDN，CORS * 大陆可达；客户端已在用其拉快照）。
     * 查 <name>@latest 的 package.json 并做仓库一致性校验（verifyNpmCandidate 防同名抢注）。
     * 返回 npm 包名（候选可用）或 null（无候选/校验不过/探测失败）。 */
    function probeNpmCandidate(cand) {
      var ctrl = new AbortController()
      var timer = setTimeout(function () { ctrl.abort() }, 8000)
      return fetch('https://cdn.jsdelivr.net/npm/' + encodeURIComponent(cand.npmName) + '/package.json', { signal: ctrl.signal })
        .then(function (r) { return r.ok ? r.json() : null })
        .then(function (pkg) { return verifyNpmCandidate(pkg, cand.owner, cand.repo) ? cand.npmName : null })
        .catch(function () { return null })
        .then(function (x) { clearTimeout(timer); return x })
    }

    var install = useCallback(function (spec, repoName, opts) {
      setBusy(spec); clearMsg()
      var qPause = false // 0.9.6：队列泵暂停标记（失败/构建拦截时置 true，等用户处理后手动继续）
      var requestId = newUuid()
      beginOp(T('mk.opInstall', { spec: spec }), requestId, 'install', repoName || shortSpecName(spec), spec)
      Promise.resolve()
        .then(function () { return snapshotNames() })
        .then(function (before) { stepOp('verify'); return pm.inspect(spec, {}).then(unwrapRpc).then(function (inspection) { return { before: before, inspection: inspection } }) })
        .then(function (ctx2) {
          if (!ctx2.inspection || ctx2.inspection.status !== 'accepted') {
            var reason = ctx2.inspection && ctx2.inspection.reason ? ctx2.inspection.reason : T('mk.reasonUnknown')
            throw new Error(T('mk.reject') + reason)
          }
          stepOp('download')
          return pm.installBundle(spec, { enabled: false, requestId: requestId }).then(unwrapRpc).then(function (res) { return { before: ctx2.before, app: checkChange(res, T('mk.opInstall', { spec: spec })) } })
        })
        .then(function (ctx2) {
          stepOp('enable')
          return enableNewBundles(ctx2.before).then(function (res) { return { failedEnables: res.failed, added: res.added, verMap: res.verMap, app: ctx2.app } })
        })
        .then(function (ctx3) {
          // 0.9.28：学习 repo → 实际 bundle 名（安装落地的新 bundle diff）——卡名≠包名判重修正
          if (repoName && ctx3.added && ctx3.added.length) {
            setRepoPkg(function (prev) {
              var next = prev
              for (var ai = 0; ai < ctx3.added.length; ai++) next = mergeRepoPkg(next, repoName, ctx3.added[ai])
              repoPkgMapSave(next)
              return next
            })
          }
          return ctx3
        })
        .then(function (ctx3) { return refreshInstalled().then(function () { return ctx3 }) })
        .then(function (ctx3) {
          if (ctx3.failedEnables.length) finishOp('warn', T('mk.installedEnableFailed', { spec: spec, list: ctx3.failedEnables.join('；') }), null)
          else {
            // 0.9.28：横幅带实装版本（verMap 首个非空版本；多 bundle 新增时取第一个有版本者）
            var okVer = ''
            var vm = ctx3.verMap || {}
            for (var vk in vm) { if (vm[vk]) { okVer = vm[vk]; break } }
            var restart0 = ctx3.app === 'restart-required'
            finishOp('ok', T(okVer ? (restart0 ? 'mk.installedOkRestartVer' : 'mk.installedOkVer') : (restart0 ? 'mk.installedOkRestart' : 'mk.installedOk'), { spec: spec, ver: okVer }), null)
          }
        })
        .catch(function (e) {
          var m = String((e && e.message) || e)
          // 0.9.28：构建授权键源——优先 checkChange 随 Error 传递的权威键（宿主 pendingBuilds 优先，
          // 见其注释）；RPC reject 直出（未经 checkChange）时对 m 兜底提取
          var eKeys = (e && e.buildKeys && e.buildKeys.length) ? e.buildKeys : extractBuildKeys(m)
          var eIsGit = e && e.buildKind ? e.buildKind === 'git'
            : (function () { var g0 = extractGitDepInfo(m); return !!(g0.keys.length || g0.pkg) })()
          var retryPlan = (opts && opts.fbPlan) || null // 0.9.24：降级梯随失败卡片（重试按钮续用完整梯计划）
          var retrySpec0 = retryPlan ? retryPlan.ghSpec : spec
          qPause = true // 0.9.6：失败/构建拦截 → 队列暂停（结果卡片/授权重试行需要用户看见并处理）
          if (eKeys.length && !eIsGit) {
            // 0.9.28：generic 构建拦截（registry 包 Ignored build scripts）——pnpm 预写 allowBuilds 占位
            // → 宿主 approveBuilds 可批 → 授权重试流可用
            setPendingBuilds({ spec: spec, keys: eKeys })
            finishOp('warn', T('mk.buildBlocked'), null)
          } else if (eIsGit) {
            // 0.9.28：git 依赖构建授权拦截 → 失败卡片带人话 + 精确键，**不给授权重试钮**——
            // 宿主 approveBuilds 的可批准集 = pnpm-workspace.yaml 里 pnpm 预写的占位条目
            // （app.asar build-approval.js 取证：names.some(!pending.includes) → stale-approval），
            // 而 GIT_DEP_PREPARE 硬失败路径 pnpm 不写占位 → pending 恒空 → 重试必 stale-approval
            // （真机两轮 + 源码双证，上游结构性缺口）。出路 = 手动把键写入 allowBuilds 或改走 npm 渠道。
            finishOp('fail', T('mk.installFailed') + friendlyManageError(e), { spec: retrySpec0, repoName: repoName, fbPlan: retryPlan })
          } else {
            finishOp('fail', T('mk.installFailed') + friendlyManageError({ message: m }), { spec: retrySpec0, repoName: repoName, fbPlan: retryPlan }) // 0.9.6：失败卡片带重试（构建拦截走专属授权重试行，不给裸重试）；0.9.23：网络类天书换人话；0.9.24：retry 带降级梯计划
            // 0.9.24：网络类失败自动降级梯（不开 VPN 也要能装）——
            // 真机取证：直连 github.com 主站间歇劣化（时通时断），预检侥幸通过 ≠ 后续 git clone 能撑住。
            // 0.9.27：走位决策外提为纯函数 ladderNext（40 块；走位矩阵与逐级单测见其函数头注释），
            // 本处只消费动作对象（probe 的异步探测 / install 的延时重装与文案映射）。
            var fb = opts || {}
            var netHit = (e && e.netKey) || classifyNetError(m) // 0.9.24b：ChangeResult 路径的分类随 Error 传递（译文正则认不出）
            var step = ladderNext(netHit, fb, spec)
            if (step && step.kind === 'probe') {
              // 0.9.24c：探测 promise 自身网络失败也要落到下一级（此前无 .catch → 梯子静默死亡，
              // 真机嫌疑：NDF1Sc 超时后梯子无后续 op，探测挂了整条链就断了）
              var probeGo = function (npmName) {
                setTimeout(function () {
                  if (npmName) {
                    setMessage(T('mk.netFbTryNpm', { name: npmName }))
                    installRef.current(npmName, repoName || step.plan.repo, { netFbDone: true })
                  } else {
                    installRef.current(spec, repoName, { netSeq: 1, fbPlan: step.plan })
                  }
                }, step.delay)
              }
              probeNpmCandidate(step.plan).then(probeGo, function () { probeGo('') })
            } else if (step && step.kind === 'install') {
              var goLadder = function () {
                if (step.msgKey === 'tgz') setMessage(T('mk.netFbTryTgz', { name: step.fb.fbPlan.repo }))
                else if (step.msgKey === 'cdl') setMessage(T('mk.netFbTryCdl', { repo: step.fb.fbPlan.repo }))
                else if (step.msgKey === 'retry') setMessage(T('mk.netFbRetry', { spec: step.spec }))
                installRef.current(step.spec, step.repoFallback ? (repoName || step.repoFallback) : repoName, step.fb)
              }
              if (step.delay) setTimeout(goLadder, step.delay)
              else goLadder()
            }
          }
          return refreshInstalled() // 失败也要刷新已安装区块（宿主可能已落地部分状态）
        })
        .then(function () {
          setBusy(''); endOp()
          // 0.9.6：队列泵——成功/部分成功 → 稍候 1.2s（让结果卡片可见）自动开始下一个；失败/构建拦截 → 暂停，队列区亮「继续安装」
          if (!queueRef.current.length || qPause) return
          if (pumpTimerRef.current) return
          pumpTimerRef.current = setTimeout(function () { pumpTimerRef.current = null; pumpQueue() }, 1200)
        })
    }, [pm, refreshInstalled, beginOp, stepOp, endOp, clearMsg, finishOp, pumpQueue])
    installRef.current = install // 0.9.6：pumpQueue 经 ref 调最新 install（解循环引用）

    /** 宿主管理操作错误 → 面板友好文案（源码错误码：stop-profile / bundle-in-use / not-removable / management-required）。 */
    function friendlyManageError(e) {
      var m = String((e && e.message) || e)
      // 0.9.23：网络类预检失败先行识别（此前英文天书直出——desktop/web 双端真机踩坑 2026-10-12）
      var netKey = classifyNetError(m)
      if (netKey === 'github') return T('mk.errNetGithub')
      if (netKey === 'net') return T('mk.errNet')
      // 0.9.23：宿主 ChangeResult 的 kind 键（classifyInstallFailure 产物）直接命中网络类
      if (m === 'network' || m === 'timeout') return T('mk.errNet')
      if (m.indexOf('already-installed') !== -1) return T('mk.errAlreadyInstalled')
      // 0.9.7：pnpm 11 默认 24h 新包冷却拦截（装完刚发布的版本再卸载/更新必踩）→ 原因 + 自救，替代天书
      if (m.indexOf('ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION') !== -1 || m.indexOf('minimumReleaseAge cutoff') !== -1) {
        var flagged = (/\n\s+(\S+@\S+) was published at/.exec(m) || [])[1] || ''
        return T('mk.errMinAge', { pkg: flagged || '?' }) + T('mk.errMinAgeFix')
      }
      // 0.9.28：pnpm 11 git 依赖构建授权拦截（ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED）→ 原因 + 自救，替代天书；
      // 优先取 checkChange 随 Error 传递的原始提取（译文不可二次识别），直出场景对原文兜底
      var gitPrep = (e && e.buildKeys && e.buildKeys.length && e.buildKind === 'git')
        ? { keys: e.buildKeys, pkg: e.gitDepPkg || '' }
        : extractGitDepInfo(m)
      if (gitPrep.keys.length || gitPrep.pkg) {
        var gMsg = T('mk.errGitPrepare', { pkg: gitPrep.pkg || '?' }) + T('mk.errGitPrepareFix')
        if (gitPrep.keys.length) gMsg += T('mk.errGitPrepareKey', { key: gitPrep.keys.join('　') })
        return gMsg
      }
      // 0.9.28：宿主 stale-approval——授权键与本次尝试的待构建清单不匹配（每次安装尝试独立记录）
      if (m.indexOf('stale-approval') !== -1) return T('mk.errStaleApproval')
      // 0.9.29：宿主 import 失败（插件本体已装好，作者打包/宿主兼容性问题）→ 人话 + 反馈指引
      if (classifyEnableFailure(m) === 'import') return T('mk.errImportFail')
      if (m.indexOf('stop-profile') !== -1) return T('mk.errStopProfile')
      if (m.indexOf('bundle-in-use') !== -1) return T('mk.errInUse')
      if (m.indexOf('not-removable') !== -1) return T('mk.errNotRemovable')
      if (m.indexOf('management-required') !== -1 || m.indexOf('readOnly') !== -1) return T('mk.errManaged')
      return m
    }

    /** 0.8.24：ChangeResult.error → 人读消息。diagnostic 为 pnpm 完整输出：去 ANSI、优先取错误摘要行；
     *  含构建授权键时附上（保住「授权构建并重试」流程对 extractBuildKeys 的输入）。 */
    function changeResultMessage(res) {
      var err = (res && res.error) || {}
      if (err.diagnostic) {
        var text = String(err.diagnostic).replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
        // 0.9.7：pnpm 11 24h 新包冷却拦截优先短路——逐行挑选出的 ERR 摘要行对用户无 actionable 信息；
        // 从完整诊断文本解析被拦包名，给原因 + 自救步骤
        if (text.indexOf('ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION') !== -1 || text.indexOf('minimumReleaseAge cutoff') !== -1) {
          var flagged = (/\n\s+(\S+@\S+) was published at/.exec(text) || [])[1] || ''
          return T('mk.errMinAge', { pkg: flagged || '?' }) + T('mk.errMinAgeFix') + T('mk.fullLog')
        }
        // 0.9.23：网络类预检失败优先短路——GitHub 5s 连接探测 / registry 超时 / DNS 失败
        // 的原始行对用户无 actionable 信息，换人话 + 自救（重试/查代理/CLI）
        var netKeyDiag = classifyNetError(text)
        if (netKeyDiag) return T(netKeyDiag === 'github' ? 'mk.errNetGithub' : 'mk.errNet') + T('mk.fullLog')
        // 0.9.28：git 依赖构建授权拦截短路（天书 = pnpm 硬失败全文直出；键已自动提取可复制）
        var gitPrepDiag = extractGitDepInfo(text)
        if (gitPrepDiag.keys.length || gitPrepDiag.pkg) {
          var gMsg = T('mk.errGitPrepare', { pkg: gitPrepDiag.pkg || '?' }) + T('mk.errGitPrepareFix') + T('mk.fullLog')
          if (gitPrepDiag.keys.length) gMsg += T('mk.errGitPrepareKey', { key: gitPrepDiag.keys.join('　') })
          return gMsg
        }
        var lines = text.split('\n')
        var picked = ''
        for (var i = lines.length - 1; i >= 0; i--) {
          var s = lines[i].trim()
          if (s && /ERR_PNPM_|ELIFECYCLE|✗|error:/i.test(s)) { picked = s; break }
        }
        if (!picked) { for (var j = lines.length - 1; j >= 0; j--) { var t = lines[j].trim(); if (t) { picked = t; break } } }
        if (picked.length > 200) picked = picked.slice(0, 200) + '…'
        var keys = extractBuildKeys(text)
        if (keys.length) {
          var shown = keys.slice(0, 3).join('、') + (keys.length > 3 ? T('mk.andMore', { n: keys.length }) : '')
          picked = picked + T('mk.buildsInvolved') + shown
        }
        return picked + T('mk.fullLog')
      }
      return friendlyManageError({ message: err.code || T('mk.errNoDetail') })
    }

    /** 0.8.24：宿主 ChangeResult 业务层检查。宿主管理操作失败不 reject RPC，只在 application 字段
     *  报告（plugin-manager change() 实现）；漏检会把 pnpm 失败当成功展示——0.8.23 实测
     *  minimumReleaseAge 策略拦截安装后仍提示「已安装并启用」（假成功 bug）。官方 ui-plugin-manager
     *  （manager-store.ts）有同款检查。
     *  0.9.5：返回 application（''|'applied'|'restart-required'|'overridden'）交调用方分支文案——
     *  桌面端宿主无 HMR，change() 默认 application='restart-required'（安装只落盘不加载，
     *  官方 UI 同款语义：「已安装，下次启动后加载」）。 */
    function checkChange(res, label) {
      if (!res || typeof res !== 'object') return ''
      if (res.application === 'failed') {
        var e2 = new Error(T('mk.opFailLabel', { label: label }) + changeResultMessage(res))
        // 0.9.24b：网络分类随 Error 传递——m 已被 changeResultMessage 翻成中文，
        // catch 里 classifyNetError(m) 的英文正则认不出译文，梯子会整体跳过（17:05 真机踩坑：
        // 预检 Empty reply → 中文报错「自动降级未成功」但梯子根本没跑）。这里从原始 diagnostic 重分类。
        e2.netKey = netKeyFromChange(res)
        // 0.9.28：构建授权信息随 Error 传递（0.9.25 方法论——译文不可二次识别）。
        // 键源优先级：res.pendingBuilds（宿主对本次尝试记录的权威待构建清单，重试必须逐字匹配，
        // 否则 stale-approval——真机实测 hint 文案里的键与宿主记录不一致）> 原始 diagnostic 解析
        // （git 依赖 GIT_DEP_PREPARE_NOT_ALLOWED 的 hint 键）> 客户端 extractBuildKeys（catch 兜底）。
        var pbHost = res && Array.isArray(res.pendingBuilds) ? res.pendingBuilds.filter(Boolean) : []
        var gitRaw = extractGitDepInfo(String((res.error && res.error.diagnostic) || ''))
        var buildKeysArr = pbHost.length ? pbHost : gitRaw.keys
        if (buildKeysArr.length) {
          e2.buildKeys = buildKeysArr
          e2.buildKind = (gitRaw.keys.length || gitRaw.pkg) ? 'git' : 'generic'
          e2.gitDepPkg = gitRaw.pkg
        }
        throw e2
      }
      if (res.application === 'cancelled') throw new Error(T('mk.opCancelled', { label: label }))
      return res.application || ''
    }

    // 0.7.0 已安装管理：启停（setBundleEnabled）/ 卸载（removeBundle）/ 更新（installBundle 重装最新）
    var toggleBundle = useCallback(function (name, enabled) {
      setBusy('toggle:' + name); clearMsg()
      Promise.resolve().then(function () { return pm.setBundleEnabled(name, enabled).then(unwrapRpc).then(function (res) { return checkChange(res, enabled ? T('mk.opEnable', { name: name }) : T('mk.opDisable', { name: name })) }) })
        .then(function (app) { return refreshInstalled().then(function () { return app }) })
        .then(function (app) { setMessage(T(app === 'restart-required' ? (enabled ? 'mk.enabledOkRestart' : 'mk.disabledOkRestart') : (enabled ? 'mk.enabledOk' : 'mk.disabledOk'), { name: name })) })
        .catch(function (e) { setMessage(T('mk.opFailed') + friendlyManageError(e)) })
        .then(function () { setBusy('') })
    }, [pm, refreshInstalled])

    var uninstallBundle = useCallback(function (name) {
      if (confirmRemove !== name) { setConfirmRemove(name); return } // 两步确认，防误删
      setConfirmRemove('')
      setBusy('remove:' + name); clearMsg()
      beginOp(T('mk.opRemove', { name: name }), null, 'remove', name, name)
      Promise.resolve().then(function () { return pm.removeBundle(name).then(unwrapRpc).then(function (res) { return checkChange(res, T('mk.opRemove', { name: name })) }) })
        .then(function (app) { return refreshInstalled().then(function () { return app }) })
        .then(function (app) { finishOp('ok', T(app === 'restart-required' ? 'mk.removedOkRestart' : 'mk.removedOk', { name: name }), null) })
        .catch(function (e) { finishOp('fail', T('mk.removeFailed') + friendlyManageError(e), null) })
        .then(function () { setBusy(''); endOp() })
    }, [pm, refreshInstalled, confirmRemove, beginOp, endOp, clearMsg, finishOp])

    var updateBundle = useCallback(function (name, spec, targetV) {
      // 0.8.17：有精确目标版本时用 name@version 安装（绕开镜像 @latest dist-tag 滞后装旧版的坑，实测 whale 装到 0.3.14）；
      // git:/tgz/path spec 原样（追加 @version 语义不同）
      var use = spec || (name + '@latest')
      if (targetV) {
        if (!spec) use = name + '@' + targetV
        else if (spec.indexOf('github:') !== 0 && !/(\.tgz|\.tar\.gz)$/i.test(spec) && !/^[./~]|[a-zA-Z]:[\\/]/.test(spec)) use = spec + '@' + targetV
      }
      setBusy('update:' + name); clearMsg()
      var requestId = newUuid()
      beginOp(T('mk.opUpdate', { name: name }), requestId, 'update', name, use)
      Promise.resolve()
        .then(function () { stepOp('verify'); return pm.inspect(use, {}).then(unwrapRpc) })
        .then(function (inspection) {
          if (!inspection || inspection.status !== 'accepted') {
            var reason = inspection && inspection.reason ? inspection.reason : T('mk.reasonUnknown')
            var probe = String((inspection && inspection.problem) || '') + ' ' + reason
            // 0.8.17 宿主 inspect 对已装包一律 refused already-installed（index.ts:372/377），更新语义下这不是错误 → 跳过预检
            // ⚠️ 跳过预检 ≠ 跳过安装：无论走哪个分支都必须落到下方 installBundle（0.8.17 首版曾在此 return undefined 导致假成功）
            if (probe.indexOf('already-installed') === -1) throw new Error(T('mk.reject') + reason)
          }
          stepOp('download')
          return pm.installBundle(use, { enabled: false, requestId: requestId }).then(unwrapRpc).then(function (res) { return checkChange(res, T('mk.opUpdate', { name: name })) })
        })
        .then(function (app) { stepOp('enable'); return pm.setBundleEnabled(name, true).then(unwrapRpc).catch(function () { /* 保持原启用状态失败时回退 */ }).then(function () { return app }) })
        .then(function (app) { return refreshInstalled().then(function () { return app }) })
        .then(function (app) {
          finishOp('ok', T(app === 'restart-required' ? 'mk.updatedOkRestart' : 'mk.updatedOk', { name: name }), null)
          // 0.8.22：更新成功后自动整页刷新（复用卸载同款 pageReloadTimer 机制）。
          // 关闭设置浮层 ≠ 刷新页面：旧版插件 JS 仍驻留内存，界面/版本号不会变——必须整页重载才会加载新 client.js
          if (!pageReloadTimer) pageReloadTimer = setTimeout(function () { window.location.reload() }, 1500)
        })
        .catch(function (e) { finishOp('fail', T('mk.updateFailed') + friendlyManageError(e), null) })
        .then(function () { setBusy(''); endOp() })
    }, [pm, refreshInstalled, beginOp, stepOp, endOp, clearMsg, finishOp])

    var retryWithBuilds = useCallback(function () {
      if (!pendingBuilds) return
      var p = pendingBuilds
      setPendingBuilds(null)
      setBusy(p.spec); clearMsg()
      // 0.9.28：宿主 wire schema 为 approvedBuilds: array(string())（app.asar 取证）——
      // 旧实现传 { key: true } 对象必被边界校验拒绝（wire field "options" failed boundary
      // validation），授权重试流在宿主 0.2.0-rc.2 上整体失效（本次 git 依赖 E2E 实测暴露）
      var approved = []
      for (var i = 0; i < p.keys.length; i++) approved.push(p.keys[i])
      var requestId = newUuid()
      beginOp(T('mk.opInstallBuild', { spec: p.spec }), requestId, 'build', shortSpecName(p.spec), p.spec)
      Promise.resolve()
        .then(function () { return snapshotNames() })
        .then(function (before) { stepOp('download'); return pm.installBundle(p.spec, { enabled: false, requestId: requestId, approvedBuilds: approved }).then(unwrapRpc).then(function (res) { return { before: before, app: checkChange(res, T('mk.opInstall', { spec: p.spec })) } }) })
        .then(function (ctx2) { stepOp('enable'); return enableNewBundles(ctx2.before).then(function (res) { return { failedEnables: res.failed, verMap: res.verMap, app: ctx2.app } }) })
        .then(function (ctx3) { return refreshInstalled().then(function () { return ctx3 }) })
        .then(function (ctx3) {
          if (ctx3.failedEnables.length) finishOp('warn', T('mk.installedEnableFailed', { spec: p.spec, list: ctx3.failedEnables.join('；') }), null)
          else {
            // 0.9.28：横幅带实装版本（与 install 主链同款；grantedOk 文案附版本后缀）
            var okVer = ''
            var vm = ctx3.verMap || {}
            for (var vk in vm) { if (vm[vk]) { okVer = vm[vk]; break } }
            var restart1 = ctx3.app === 'restart-required'
            var base = T(restart1 ? 'mk.grantedOkRestart' : 'mk.grantedOk', { spec: p.spec })
            finishOp('ok', okVer ? base + '（v' + okVer + '）' : base, null)
          }
        })
        .catch(function (e) { finishOp('fail', T('mk.installFailed') + friendlyManageError(e), { spec: p.spec, repoName: '' }) }) // 0.9.23：网络类天书换人话（与 install 主链同款）
        .then(function () { setBusy(''); endOp() })
    }, [pm, refreshInstalled, pendingBuilds, beginOp, stepOp, endOp, clearMsg, finishOp])

    // （matchCat 已外提至 40-market-helpers）

    // （0.5.4：filtered/pageItems 已在上方数据源块计算——索引就绪走全量，未就绪走本页）

    // 分类计数（0.7.0：计数基数随「仅可安装」口径同步收紧；0.8.2 随星数门槛同步收紧；本页口径仅用于未就绪时 chip 可见性判断）
    var countBase = idxReady ? catIdx.items : items
    if (countBase && onlyInstallable) {
      countBase = countBase.filter(function (it) { return it && it.installable !== false && it.installable !== null })
    }
    if (countBase && starMin > 0) {
      countBase = countBase.filter(function (it) { return it && (it.stargazers_count || 0) >= starMin })
    }
    var catCounts = {}
    var subCounts = {} // 0.9.11：{ 父类: { 子类: 精确条数 } }（无 subs 的父类不产生键）
    if (countBase) {
      for (var ci = 0; ci < countBase.length; ci++) {
        var lab = classifyItem(countBase[ci])
        catCounts[lab] = (catCounts[lab] || 0) + 1
        if (subsOf(lab)) {
          var slab = classifySub(countBase[ci], lab)
          if (slab) {
            if (!subCounts[lab]) subCounts[lab] = {}
            subCounts[lab][slab] = (subCounts[lab][slab] || 0) + 1
          }
        }
      }
    }
    // 分类行（0.5.4）：索引就绪 → 全量精确数（逐条分类统计，0.7.0 起按「仅可安装」基数）；未就绪 → 显示「…」不编数字
    var catChips = []
    if (countBase) {
      catChips.push({ label: '全部', display: T('mk.catAll'), count: idxReady ? countBase.length : (totalCount !== null ? totalCount : countBase.length), exact: true, value: '' })
      for (var ri = 0; ri < CATEGORY_RULES.length; ri++) {
        var lab2 = CATEGORY_RULES[ri].label
        var pc = catCounts[lab2] || 0
        var ec = idxReady ? (catCounts[lab2] || 0) : null
        if (pc > 0 || (ec !== null && ec > 0) || activeCat === lab2) {
          catChips.push({ label: lab2, display: catLabel(lab2), count: pc, exact: ec, value: lab2 })
        }
      }
      var co2 = catCounts[CATEGORY_OTHER] || 0
      var eo = idxReady ? (catCounts[CATEGORY_OTHER] || 0) : null
      if (co2 > 0 || (eo !== null && eo > 0) || activeCat === CATEGORY_OTHER) {
        catChips.push({ label: CATEGORY_OTHER, display: catLabel(CATEGORY_OTHER), count: co2, exact: eo, value: CATEGORY_OTHER })
      }
      // 0.9.10：自适应排列——「全部」恒居首，其余分类按条数降序自动排（常用大类排前面；exact 优先，未就绪退 count）
      var tail = catChips.slice(1).sort(function (a, b) {
        return (b.exact != null ? b.exact : b.count) - (a.exact != null ? a.exact : a.count)
      })
      catChips = [catChips[0]].concat(tail)
    }

    // （CHIP_STYLE_BASE/chipStyle/catChipStyle 已外提至 40-market-helpers）

    // ---- 0.8.0：Tab 导航 + 安装确认弹窗辅助 ----
    // （cliCmdFor 已外提至 40-market-helpers）
    /** 自定义安装输入 → 确认弹窗数据（区分 npm / github / 本地 tgz）。
     * 0.8.14：完整 GitHub URL（https://github.com/owner/repo[.git][/...]）自动归一化为 github:owner/repo，
     * 修复被误判成 npm 包名导致来源链接/授权提示全错；并对显式版本与 tgz 目标做同版本重装警示。 */
    function mkCustomConfirm(rawSpec) {
      var spec = String(rawSpec || '').trim()
      var mUrl = spec.match(/^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/.*)?$/i)
      if (mUrl) spec = 'github:' + mUrl[1] + '/' + mUrl[2]
      var gitOnly = spec.indexOf('github:') === 0
      var isTgz = /\.tgz$/i.test(spec) || /\.tar\.gz$/i.test(spec)
      var href = gitOnly ? 'https://github.com/' + spec.slice(7)
        : isTgz ? undefined
        : 'https://www.npmjs.com/package/' + spec
      var name = isTgz ? spec.replace(/\\/g, '/').split('/').pop() : spec
      // 0.8.14 重装保护：目标可解析出版本（name@x.y.z 或 tgz 文件名含版本）且 ≤ 已装版本 → 警示不阻断
      var reinstallWarn = ''
      if (bundles && !gitOnly) {
        var pkg = spec, target = ''
        if (!isTgz) {
          var at = spec.indexOf('@', 1) // 跳过 scoped 包首字符 @
          if (at > 0) { pkg = spec.slice(0, at); target = spec.slice(at + 1) }
        } else {
          var mVer = name.match(/-(\d[\w.-]*?)\.tgz$/i) || name.match(/-(\d[\w.-]*?)\.tar\.gz$/i)
          if (mVer) target = mVer[1]
          pkg = (name.replace(/\.tgz$/i, '').replace(/\.tar\.gz$/i, '').replace(/-\d[\w.-]*$/, '') || name).toLowerCase()
        }
        var inst = bundles.filter(function (b) {
          return b && b.installed && b.name && (b.name === pkg || (isTgz && String(b.name).toLowerCase() === pkg))
        })[0]
        if (inst && inst.version && target && cmpVersion(target, inst.version) <= 0) {
          reinstallWarn = T('mk.reinstallWarn', { name: inst.name, ver: inst.version, target: target })
        }
      }
      return { spec: spec, name: name, href: href, cli: cliCmdFor(spec), gitOnly: gitOnly, reinstallWarn: reinstallWarn }
    }
    var installedCount = bundles ? bundles.filter(function (b) { return b && b.installed && b.name }).length : 0
    // （TAB_BASE/tabStyle 已外提至 40-market-helpers）
    // 0.8.17 数据同步时间 + 官方源同步：上移到 Tab 行右上角（市场 Tab 专用），窄面板随 Tab 行换行
    var syncChip = null
    if (catIdx && catIdx.builtAt) {
      var officialAtTs = 0
      try { officialAtTs = Number(localStorage.getItem(OFFICIAL_SYNC_AT_KEY) || 0) } catch (eO) { /* 隐私模式静默 */ }
      var syncTip = T('mk.syncTipBase', { at: fmtStamp(catIdx.builtAt) })
      if (officialAtTs > 0) {
        syncTip += T('mk.syncTipOfficial', { at: fmtStamp(officialAtTs) })
      }
      var isFreshSync = officialAtTs > 0 && Math.abs(officialAtTs - catIdx.builtAt) < 60000
      // 0.8.18：数据超 48h 未更新时高亮提醒（快照静默拉取失败的可见化，避免用户长期停留在旧目录而无感知）
      var staleMs = Date.now() - catIdx.builtAt
      var isStale = staleMs > 48 * 3600 * 1000
      if (isStale) syncTip += T('mk.syncTipStale', { d: Math.floor(staleMs / 86400000) })
      syncChip = jsx('span', { key: 'synct', style: { fontSize: '12px', color: isStale ? 'var(--dsw-alias-state-warn-label)' : 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'default' },
        title: syncTip, children: (isStale ? T('mk.chipStale') : isFreshSync ? T('mk.chipDirect') : T('mk.chipTime')) + fmtStamp(catIdx.builtAt) })
    }
    var osyncBtn = ghSearch ? jsx('button', { key: 'osync', style: Object.assign({}, BTN_GHOST_STYLE, { whiteSpace: 'nowrap', flexShrink: 0 }),
      disabled: paging || (catIdx && catIdx.status === 'loading'),
      title: T('mk.osyncTitle'),
      onClick: function () {
        if (!harvestKickRef.current) return
        setMessage(T('mk.osyncDone'))
        harvestKickRef.current()
      },
      children: catIdx && catIdx.status === 'loading' ? T('mk.osyncBusy') : T('mk.osyncBtn') }) : null
    var sbtn = ghSearch ? jsx('button', { key: 'ssnap', style: Object.assign({}, BTN_GHOST_STYLE, { whiteSpace: 'nowrap', flexShrink: 0 }),
      disabled: paging || (catIdx && catIdx.status === 'loading'),
      title: T('mk.ssnapTitle'),
      onClick: function () {
        if (!snapKickRef.current) return
        setMessage(T('mk.ssnapDoing'))
        snapKickRef.current().then(function (ok) {
          setMessage(ok ? '' : T('mk.ssnapFail'))
        })
      },
      children: T('mk.ssnapBtn') }) : null
    // ---- 0.9.12 P2-11：增量渲染——visN 键化（页码/搜索/分类/排序任一变化即重置），纯派生、无渲染期副作用 ----
    var VIS_INIT = 60
    var visState = useState({ key: '', n: VIS_INIT })
    var visKey = 'p' + effViewPage + '|' + query + '|' + activeCat + '|' + (activeSub || '') + '|' + sortBy + '|' + starMin + '|' + (onlyInstallable ? 1 : 0) + '|' + viewMode
    var visN = visState[0].key === visKey ? visState[0].n : VIS_INIT
    var visMore = function () { visState[1]({ key: visKey, n: visN + 60 }) }

    var tabsBar = jsx('div', { key: 'tabs', style: { display: 'flex', alignItems: 'center', gap: '2px', borderBottom: '1px solid var(--dsw-alias-border-l2)', marginBottom: '8px', flexWrap: 'wrap' }, children: [
      jsx('button', { key: 't-market', style: tabStyle(tab === 'market'), onClick: function () { setTab('market'); marketViewSave({ tab: 'market' }) }, children: T('mk.tabMarket') }),
      jsx('button', { key: 't-installed', style: tabStyle(tab === 'installed'), title: T('mk.instTitleTip'),
        onClick: function () { setTab('installed'); marketViewSave({ tab: 'installed' }); refreshInstalled() },
        children: T('mk.tabInstalled') + (installedCount ? '（' + installedCount + '）' : '') }),
      jsx('button', { key: 't-custom', style: tabStyle(tab === 'custom'), onClick: function () { setTab('custom'); marketViewSave({ tab: 'custom' }) }, children: T('mk.tabCustom') }),
      jsx('button', { key: 't-settings', style: tabStyle(tab === 'settings'), onClick: function () { setTab('settings'); marketViewSave({ tab: 'settings' }) }, children: T('mk.tabSettings') }),
      (tab === 'market' && (syncChip || osyncBtn)) ? jsx('div', { key: 'tabs-right', className: 'dcards-tabsright', style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }, children: [syncChip, sbtn, osyncBtn] }) : null,
    ] })

    // 0.9.23：折叠态选中分类提位——chips 按条数降序，低频分类被选中时高亮 chip 藏进折叠区、状态反馈丢失；
    // 折叠时把 active chip 移到「全部」后保证首行恒可见（展开态保持计数降序不动）
    var chipsShown = catExpand ? catChips : promoteActiveCat(catChips, activeCat)

    return jsx('div', { style: SECTION_WRAP, children: [
      jsx('style', { key: 'css', dangerouslySetInnerHTML: { __html: MARKET_CSS } }),
      // 0.9.12 P1：Tabs + 搜索行吸顶——长列表滚动时筛选不丢；滚动容器非本区块时 sticky 自动退化为常态布局
      jsx('div', { key: 'stickyhead', style: { position: 'sticky', top: 0, zIndex: 4, background: 'var(--dsw-alias-bg-layer-1)', margin: '0 -2px', padding: '2px' }, children: [
      tabsBar,
      tab === 'market' ? jsx('div', { key: 'head', style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }, children: [
        jsx('input', {
          key: 'q', style: { flex: '1 1 160px', minWidth: '160px', maxWidth: '320px', padding: '3px 10px', height: '26px', boxSizing: 'border-box',
            border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '6px', fontSize: '13px' }, // 0.9.12：26px 与 chips/按钮统一控件高度
          placeholder: idxReady
            ? (activeCat ? T('mk.searchInCat', { n: filtered.length }) : T('mk.searchAll', { n: countBase.length }))
            : T('mk.searchPage', { n: items ? items.length : 0 }),
          value: query,
          onChange: function (e) { setQuery(e.target.value); marketViewSave({ q: e.target.value }) },
        }),
        jsx('button', { key: 'sort', style: Object.assign(chipStyle(sortBy === 'updated'), { height: '26px', boxSizing: 'border-box' }), title: T('mk.sortTip'), // 0.9.23：与 ghost 按钮/搜索框 26px 统一（审计①：chip 按钮 22px vs ghost 26px 混排）
          onClick: function () { setSortBy(sortBy === 'updated' ? 'stars' : 'updated') },
          children: sortBy === 'updated' ? T('mk.sortUpdated') : T('mk.sortStars') }),
        jsx('button', { key: 'starchip', style: Object.assign(chipStyle(starMin > 0), { height: '26px', boxSizing: 'border-box' }), title: T('mk.starTip'),
          onClick: function () { setStarMin(starMin === 0 ? 10 : (starMin === 10 ? 50 : 0)); setViewPage(1) },
          children: starMin === 0 ? T('mk.starAll') : T('mk.starMin', { n: starMin }) }),
        jsx('button', { key: 'refresh', style: Object.assign({}, BTN_GHOST_STYLE, { whiteSpace: 'nowrap', flexShrink: 0 }), disabled: paging, onClick: function () { load(page) }, children: paging ? T('mk.loading') : T('mk.refresh') }),
        // 0.9.12 P2：网格/列表视图切换（记忆于 localStorage）
        jsx('span', { key: 'viewtoggle', style: { display: 'inline-flex', flexShrink: 0 }, children: [
          jsx('button', { key: 'vg', title: T('mk.viewTip'), style: Object.assign(chipStyle(viewMode === 'grid'), { borderRadius: '6px 0 0 6px', height: '26px', boxSizing: 'border-box' }),
            onClick: function () { setViewMode('grid'); try { localStorage.setItem(VIEW_KEY, 'grid') } catch (eVg) {} }, children: T('mk.viewGrid') }),
          jsx('button', { key: 'vl', title: T('mk.viewTip'), style: Object.assign(chipStyle(viewMode === 'list'), { borderRadius: '0 6px 6px 0', height: '26px', boxSizing: 'border-box' }),
            onClick: function () { setViewMode('list'); try { localStorage.setItem(VIEW_KEY, 'list') } catch (eVl) {} }, children: T('mk.viewList') }),
        ] }),
        // 0.9.14 P1-3：未翻译弱提示（本页英文描述未译出时才显示；点击重置停用通道并重试）
        // 0.9.23：明示退避状态（审计③：MyMemory 429 限流后用户只看到计数、不知会自动重试）——退避中显示剩余分钟
        txMissingN > 0 ? jsx('button', { key: 'txmissing', style: Object.assign({}, BTN_GHOST_STYLE, { whiteSpace: 'nowrap', flexShrink: 0, opacity: 0.75 }),
          title: (function () {
            var left = txQuotaRef.current.until - Date.now()
            return T('mk.txMissingTip', { n: txMissingN, m: left > 0 ? Math.max(1, Math.round(left / 60000)) : 0 })
          })(),
          onClick: function () { llmDownRef.current = false; txQuotaRef.current = { until: 0, tries: 0 }; setTxRetry(function (v) { return v + 1 }) },
          children: T('mk.txMissing', { n: txMissingN > 99 ? '99+' : txMissingN }) }) : null, // 2026-10-11 审计⑤：计数 99+ 封顶防数字跳动（title 保留精确数）
      ] }) : null,
      ] }),
      tab === 'market' && catChips.length ? jsx('div', { key: 'filterbar', className: 'dcards-filterbar', children: [
        // 0.9.23：分类行默认单行折叠（审计②：2 行 69px 常驻把首屏卡片推低 ~46px）——「更多 ▾」展开全量；
        // 窄屏（≤480px）整块 chips 换成下拉选择器（审计⑤：420px 下分类+子类 chip 墙 432px，内容被推到两屏外）
        jsx('div', { key: 'cats', className: 'dcards-chiprow dcats-chipwrap' + (catExpand ? '' : ' dcats-collapsed'), children: [ // 0.9.10：自适应换行（自动排列铺满行宽），不做强制横滚
          jsx('span', { key: 'clabel', className: 'dcards-rowlabel', children: T('mk.catLabel') }),
          jsx('button', { key: 'catmore', className: 'dcards-morebtn',
            onClick: function () { setCatExpand(!catExpand) },
            children: catExpand ? T('mk.catLess') : T('mk.catMore') }),
          chipsShown.map(function (chip) { // 0.9.23：折叠态为提位序（active 恒在首行），展开态为计数降序原序
            var text = chip.value === ''
              ? chip.display + '（' + chip.count + '）'
              : chip.exact !== null
                ? chip.display + '（' + chip.exact + '）'
                : chip.display + '（…）'
            var tip = chip.value === ''
              ? (idxReady ? T('mk.tipExactAll', { n: chip.count }) : T('mk.tipApiAll', { n: chip.count }))
              : chip.exact !== null
                ? T('mk.tipExact', { n: chip.exact })
                : T('mk.tipExactRunning')
            return jsx('button', {
              key: 'cat-' + chip.value, style: catChipStyle(activeCat === chip.value),
              title: tip,
              onClick: function () { setActiveCat(chip.value); setSubCat(''); setViewPage(1); marketViewSave({ cat: chip.value, sub: '' }) }, // 0.9.11：换父类重置子类；0.9.28：持久化
              children: text,
            })
          })
        ] }),
        // 0.9.23：窄屏分类下拉（宽屏 CSS 隐藏）——与上方 chips 行数据同源
        jsx('div', { key: 'catsel', className: 'dcards-catsel', children: [
          jsx('span', { key: 'clabel2', className: 'dcards-rowlabel', children: T('mk.catLabel') }),
          jsx('select', { key: 'catselmain', value: activeCat,
            onChange: function (e) { setActiveCat(e.target.value); setSubCat(''); setViewPage(1); marketViewSave({ cat: e.target.value, sub: '' }) },
            children: catChips.map(function (chip) {
              var text = chip.value === ''
                ? chip.display + '（' + chip.count + '）'
                : chip.exact !== null ? chip.display + '（' + chip.exact + '）' : chip.display
              return jsx('option', { key: 'co-' + chip.value, value: chip.value, children: text })
            }) }),
        ] }),
        // 0.9.11 二级分类：选中父类且有子类定义时，浮出子类行（与父类 AND 过滤；取消父类即收起）
        (activeCat && subsOf(activeCat) && idxReady) ? jsx('div', { key: 'subcats', className: 'dcards-chiprow dcats-chipwrap', children: [
          jsx('span', { key: 'slabel', className: 'dcards-rowlabel', children: T('mk.subLabel') }),
          (function () {
            var sc = subCounts[activeCat] || {}
            var chips = [{ label: '', display: T('mk.subAll'), count: catCounts[activeCat] || 0 }]
            var subs = subsOf(activeCat).slice().sort(function (a, b) { return (sc[b.label] || 0) - (sc[a.label] || 0) })
            for (var i = 0; i < subs.length; i++) {
              var n = sc[subs[i].label] || 0
              if (n > 0 || activeSub === subs[i].label) chips.push({ label: subs[i].label, display: subs[i].label, count: n })
            }
            return chips.map(function (schip) {
              return jsx('button', {
                key: 'sub-' + schip.label, style: catChipStyle(activeSub === schip.label),
                title: T('mk.tipExact', { n: schip.count }),
                onClick: function () { setSubCat(schip.label); setViewPage(1); marketViewSave({ sub: schip.label }) }, // 0.9.28：持久化
                children: schip.display + '（' + schip.count + '）',
              })
            })
          })(),
        ] }) : null,
        // 0.9.23：窄屏子类下拉（与上方子类 chips 行数据同源，宽屏隐藏）
        (activeCat && subsOf(activeCat) && idxReady) ? jsx('div', { key: 'subsel', className: 'dcards-catsel', children: (function () {
          var sc = subCounts[activeCat] || {}
          var chips = [{ label: '', display: T('mk.subAll'), count: catCounts[activeCat] || 0 }]
          var subs = subsOf(activeCat).slice().sort(function (a, b) { return (sc[b.label] || 0) - (sc[a.label] || 0) })
          for (var i = 0; i < subs.length; i++) {
            var n = sc[subs[i].label] || 0
            if (n > 0 || activeSub === subs[i].label) chips.push({ label: subs[i].label, display: subs[i].label, count: n })
          }
          return [
            jsx('span', { key: 'slabel2', className: 'dcards-rowlabel', children: T('mk.subLabel') }),
            jsx('select', { key: 'subselmain', value: activeSub,
              onChange: function (e) { setSubCat(e.target.value); setViewPage(1); marketViewSave({ sub: e.target.value }) },
              children: chips.map(function (schip) {
                return jsx('option', { key: 'so-' + schip.label, value: schip.label, children: schip.display + '（' + schip.count + '）' })
              }) }),
          ]
        })() }) : null,
        // 0.9.12 P0：scope 说明两行并一行——常驻只留摘要，完整两行说明收进 title tooltip（省 ~34px 纵向）
        jsx('div', { key: 'scope', title: (function () {
          var l1 = idxReady
            ? T('mk.scopeReady', { n: countBase.length }) + (onlyInstallable ? T('mk.scopeInst') : '') + T('mk.scopeClose')
            : catIdx && catIdx.status === 'loading' ? T('mk.idxLoading', { done: catIdx.done })
              : catIdx && catIdx.status === 'error' ? T('mk.idxError') : T('mk.idxLocal')
          var l2 = idxReady
            ? (catIdx.snapshot
              ? T('mk.scopeSnapshot') + (catIdx.factory ? T('mk.srcFactory') : T('mk.srcHub'))
                + ' ' + new Date(catIdx.builtAt).toISOString().slice(0, 10)
              : T('mk.scopeAuto')) + T('mk.scopeClick') : ''
          return l2 ? l1 + '\n' + l2 : l1
        })(), style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)', lineHeight: '17px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: (function () {
          var l1 = idxReady
            ? T('mk.scopeReady', { n: countBase.length }) + (onlyInstallable ? T('mk.scopeInst') : '') + T('mk.scopeClose')
            : catIdx && catIdx.status === 'loading' ? T('mk.idxLoading', { done: catIdx.done })
              : catIdx && catIdx.status === 'error' ? T('mk.idxError') : T('mk.idxLocal')
          if (idxReady && catIdx && catIdx.snapshot) l1 += ' · ' + new Date(catIdx.builtAt).toISOString().slice(0, 10)
          return l1
        })() }),
      ] }) : null,
      tab === 'market' && error ? jsx('p', { key: 'err', style: { color: 'var(--dsw-alias-state-error-primary)' }, children: T('mk.fetchFailed') + error }) : null,
      // 0.9.6：操作进行中 → 进度卡片（spinner + 短名 + 阶段徽章 + 步骤条 + pnpm 计数条 + 已用时）——全局显示（跨 Tab）
      prog ? jsx('div', { key: 'prog', className: 'dcards-progcard', children: (function () {
        var nodes = []
        nodes.push(jsx('div', { key: 'head', style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }, children: [
          jsx('span', { key: 'spin', className: 'dcards-spin' }),
          jsx('span', { key: 'nm', style: { fontWeight: 600, fontSize: '13px', color: 'var(--dsw-alias-label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: prog.spec || prog.label, children: prog.display || prog.label }),
          jsx('span', { key: 'ph', className: 'dcards-badge', style: { background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)', flexShrink: 0 }, children: prog.phase }),
          jsx('span', { key: 'gap', style: { flex: 1 } }),
          jsx('span', { key: 'tm', style: { fontFamily: 'monospace', fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)', flexShrink: 0 }, children: fmtMMSS(Math.max(0, (prog._now || Date.now()) - prog.startedAt)) }),
        ] }))
        var steps = OP_STEPS[prog.op] || []
        if (steps.length) {
          var cur = steps.indexOf(prog.step)
          var allDone = prog.step === 'done'
          var bar = []
          for (var si = 0; si < steps.length; si++) {
            var stDone = allDone || cur > si
            var stCur = !allDone && (cur === si || (cur === -1 && si === 0)) // prepare 态视为第一步进行中
            if (si > 0) bar.push(jsx('span', { key: 'ln' + si, style: { flex: 1, height: '1px', background: stDone ? 'var(--dsw-alias-state-success-tertiary)' : 'var(--dsw-alias-border-l2)' } }))
            bar.push(jsx('span', { key: 'st' + si, style: { display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }, children: [
              jsx('span', { key: 'd', className: 'dcards-stepdot', style: stDone ? { background: 'var(--dsw-alias-state-success-tertiary)', color: 'var(--dsw-alias-state-success-primary)' } : stCur ? { border: '2px solid var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' } : { border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-tertiary)' }, children: stDone ? '✓' : String(si + 1) }),
              jsx('span', { key: 't', style: { fontSize: '12px', whiteSpace: 'nowrap', fontWeight: stCur ? 600 : 400, color: stDone ? 'var(--dsw-alias-state-success-primary)' : stCur ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-tertiary)' }, children: T(STEP_LABEL[steps[si]] || steps[si]) }),
            ] }))
          }
          nodes.push(jsx('div', { key: 'bar', style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: bar }))
        }
        if (prog.counts) {
          nodes.push(jsx('div', { key: 'counts', className: 'dcards-counts', title: T('mk.countsTip'), children: T('mk.counts', prog.counts) }))
        } else if (prog.line && !prog.exitCode) {
          nodes.push(jsx('div', { key: 'raw', className: 'dcards-counts', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: prog.line, children: prog.line }))
        }
        return nodes
      })() }) : null,
      // 0.9.6：操作结束 → 结果卡片（成功/部分/失败 + 用时 + 失败阶段 + 退出码 + 重试）；无结果数据时回退原 message banner
      !prog && lastResult ? jsx('div', { key: 'result', style: { margin: '6px 0', padding: '8px 12px', background: 'var(--dsw-alias-bg-layer-2)', borderLeft: '3px solid ' + (lastResult.kind === 'ok' ? 'var(--dsw-alias-state-success-primary)' : lastResult.kind === 'warn' ? 'var(--dsw-alias-state-warn-label)' : 'var(--dsw-alias-state-error-primary)'), borderRadius: '6px', fontSize: '12px', color: 'var(--dsw-alias-label-primary)' }, children: [
        jsx('div', { key: 'head', style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }, children: [
          jsx('span', { key: 'nm', style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: lastResult.msg, children: lastResult.display }),
          jsx('span', { key: 'kd', className: 'dcards-badge', style: { background: lastResult.kind === 'ok' ? 'var(--dsw-alias-state-success-tertiary)' : lastResult.kind === 'warn' ? 'var(--dsw-alias-state-warn-tertiary)' : 'var(--dsw-alias-state-error-tertiary)', color: lastResult.kind === 'ok' ? 'var(--dsw-alias-state-success-primary)' : lastResult.kind === 'warn' ? 'var(--dsw-alias-state-warn-label)' : 'var(--dsw-alias-state-error-primary)', flexShrink: 0 }, children: T(lastResult.kind === 'ok' ? 'mk.rsOk' : lastResult.kind === 'warn' ? 'mk.rsWarn' : 'mk.rsFail') }),
          jsx('span', { key: 'gap', style: { flex: 1 } }),
          jsx('span', { key: 'tm', style: { fontFamily: 'monospace', fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)', flexShrink: 0 }, children: T('mk.rsElapsed', { t: fmtMMSS(lastResult.elapsed) }) }),
        ] }),
        jsx('div', { key: 'msg', style: { marginTop: '4px', color: 'var(--dsw-alias-label-secondary)', lineHeight: '17px', wordBreak: 'break-all' }, children: lastResult.msg }),
        ((lastResult.kind === 'fail' && lastResult.step && lastResult.step !== 'prepare') || lastResult.exitCode || lastResult.retry) ? jsx('div', { key: 'meta', style: { marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: 'var(--dsw-alias-label-tertiary)' }, children: [
          lastResult.kind === 'fail' && lastResult.step && lastResult.step !== 'prepare' ? jsx('span', { key: 'fs', children: T('mk.rsFailedAt', { step: T(STEP_LABEL[lastResult.step] || lastResult.step) }) }) : null,
          lastResult.exitCode ? jsx('span', { key: 'ex', children: T('mk.rsExit', { code: lastResult.exitCode }) }) : null,
          lastResult.retry ? jsx('button', { key: 'rt', style: Object.assign({}, BTN_GHOST_STYLE, { padding: '1px 10px', fontSize: '12px', flexShrink: 0 }), onClick: function () { var r = lastResult.retry; if (r) install(r.spec, r.repoName, { fbPlan: r.fbPlan }) }, title: T('mk.rsRetryTip'), children: T('mk.rsRetry') }) : null,
        ] }) : null,
      ] }) : null,
      // 0.9.6：安装队列区（批量安装：排队行 + 暂停时亮「继续安装」；运行中由队列泵自动推进）
      installQueue.length ? jsx('div', { key: 'queue', style: { margin: '6px 0', border: '1px dashed var(--dsw-alias-border-l2)', borderRadius: '8px', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }, children: (function () {
        var queuePaused = !prog && (!!pendingBuilds || (!!lastResult && lastResult.kind === 'fail')) // 失败/构建拦截暂停（成功后 1.2s 泵延迟窗口不算暂停）
        var nodes = [jsx('div', { key: 'qh', style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }, children: [
          jsx('span', { key: 't', style: { fontSize: '12px', fontWeight: 600, color: 'var(--dsw-alias-label-secondary)' }, children: T('mk.queueTitle', { n: installQueue.length }) }),
          queuePaused ? jsx('span', { key: 'pz', className: 'dcards-badge', style: { background: 'var(--dsw-alias-state-warn-tertiary)', color: 'var(--dsw-alias-state-warn-label)' }, children: T('mk.queuePaused') }) : null,
          jsx('span', { key: 'gap', style: { flex: 1 } }),
          queuePaused ? jsx('button', { key: 'go', style: Object.assign({}, BTN_GHOST_STYLE, { padding: '1px 10px', fontSize: '12px' }), onClick: function () { pumpQueue() }, title: T('mk.queueAddTip'), children: T('mk.queueContinue', { n: installQueue.length }) }) : null,
        ] })]
        for (var qi = 0; qi < installQueue.length; qi++) {
          ;(function (it, idx) {
            nodes.push(jsx('div', { key: 'q' + idx, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }, children: [
              jsx('span', { key: 'n', style: { color: 'var(--dsw-alias-label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: it.spec, children: it.display }),
              jsx('span', { key: 'b', className: 'dcards-badge', style: { background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-tertiary)', flexShrink: 0 }, children: T('mk.queued') }),
              jsx('span', { key: 'gap', style: { flex: 1 } }),
              jsx('button', { key: 'rm', style: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)', flexShrink: 0, padding: '0 4px' }, onClick: function () { removeQueued(idx) }, title: T('mk.queueRemove'), children: '✕' }),
            ] }))
          })(installQueue[qi], qi)
        }
        return nodes
      })() }) : null,
      !prog && !lastResult && message ? jsx('div', { key: 'msg', style: { margin: '6px 0', padding: '8px 12px',
        background: 'var(--dsw-alias-bg-layer-2)', borderLeft: '3px solid var(--dsw-alias-brand-primary)',
        borderRadius: '6px', fontSize: '12px', color: 'var(--dsw-alias-label-primary)' }, children: message }) : null,
      pendingBuilds ? jsx('div', { key: 'buildretry', style: { margin: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }, children: [
        jsx('button', { key: 'ok', style: BTN_STYLE, disabled: busy !== '',
          onClick: function () { retryWithBuilds() },
          title: T('mk.buildRetryTip'),
          children: T('mk.buildRetryBtn', { spec: pendingBuilds.spec }) }),
        jsx('button', { key: 'no', style: BTN_GHOST_STYLE, onClick: function () { setPendingBuilds(null) }, children: T('mk.ignore') }),
      ] }) : null,
      // 0.8.0 已安装 Tab（数据：listBundles；操作：setBundleEnabled / removeBundle / installBundle 重装）
      tab === 'installed' ? (function () {
        if (bundles === null) return jsx('p', { key: 'instloading', style: HINT_STYLE, children: T('mk.instLoading') })
        var rows = bundles.filter(function (b) { return b && b.installed && b.name })
        if (!rows.length) return jsx('div', { key: 'instempty', style: { margin: '20px 0', padding: '28px 12px', textAlign: 'center', color: 'var(--dsw-alias-label-tertiary)', fontSize: '13px' }, children: [
          jsx('p', { key: 'p1', style: { margin: '0 0 10px' }, children: T('mk.instEmpty') }),
          jsx('button', { key: 'go', style: BTN_GHOST_STYLE, onClick: function () { setTab('market') }, children: T('mk.goMarket') }),
        ] })
        // 0.8.17 去掉面板内重复的「已安装（N）」标题（与 Tab 名重复），直接列行
        return jsx('div', { key: 'installed', style: { margin: '6px 0 10px', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '8px', padding: '8px 10px' },
          children: rows.map(function (b, i) {
            var opBusy = busy === 'toggle:' + b.name || busy === 'remove:' + b.name || busy === 'update:' + b.name
            // 0.8.16 已安装行接入实时版本检测：npm 实时命中且过期 → 亮「有更新 → vX」+「更新到 vX」；0.8.17 已最新不显示更新按钮
            var rtRec = rtVer[b.name]
            var hasRt = !!(rtRec && rtRec.v)
            var curV = b.version || ''
            var outdated = hasRt && curV !== '' && cmpVersion(rtRec.v, curV) > 0
            return jsx('div', { key: 'b-' + i + '-' + b.name, className: 'dcards-instrow', style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', flexWrap: 'wrap', borderTop: i === 0 ? 'none' : '1px dashed var(--dsw-alias-border-l2)' }, children: [
              jsx('span', { key: 'n', style: { fontWeight: 500 }, title: b.description || b.name, children: b.name }),
              b.version ? jsx('span', { key: 'v', style: { fontFamily: 'monospace', fontSize: '11px' }, title: b.version, children: 'v' + b.version }) : null,
              outdated ? jsx('span', { key: 'upd', className: 'dcards-badge', style: { background: 'var(--dsw-alias-state-warn-tertiary)', color: 'var(--dsw-alias-state-warn-label)' }, title: T('mk.hasUpdateTip', { latest: rtRec.v, cur: curV }), children: T('mk.hasUpdate') }) : null,
              jsx('span', { key: 'st', className: 'dcards-badge', style: b.enabled ? { background: 'var(--dsw-alias-state-success-tertiary)', color: 'var(--dsw-alias-state-success-primary)' } : { background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-tertiary)' }, children: b.enabled ? T('mk.stOn') : T('mk.stOff') }),
              jsx('span', { key: 'sp', style: { flex: 1 } }),
              jsx('button', { key: 'en', style: Object.assign({}, BTN_GHOST_STYLE, { whiteSpace: 'nowrap', flexShrink: 0 }), disabled: busy !== '', title: b.enabled ? T('mk.disableTip') : T('mk.enableTip'), onClick: function () { toggleBundle(b.name, !b.enabled) }, children: opBusy ? '…' : (b.enabled ? T('mk.disableBtn') : T('mk.enableBtn')) }),
              // 0.8.17 只在有更新时显示更新按钮；已最新不占位（如需强制重装走卸载重装）
              outdated ? jsx('button', { key: 'up', style: Object.assign({}, BTN_STYLE, { whiteSpace: 'nowrap', flexShrink: 0 }), disabled: busy !== '', title: T('mk.updateTip', { v: rtRec.v }), onClick: function () { updateBundle(b.name, null, rtRec.v) }, children: opBusy ? '…' : T('mk.updateTo', { v: rtRec.v }) }) : null,
              jsx('button', { key: 'rm', style: confirmRemove === b.name ? Object.assign({}, BTN_STYLE, { background: 'var(--dsw-alias-state-error-primary)', borderColor: 'var(--dsw-alias-state-error-primary)', whiteSpace: 'nowrap', flexShrink: 0 }) : Object.assign({}, BTN_GHOST_STYLE, { whiteSpace: 'nowrap', flexShrink: 0 }),
                disabled: busy !== '' || b.removable === false,
                title: b.removable === false ? T('mk.uninstallBlockedTip') : (confirmRemove === b.name ? T('mk.uninstallTip2') : T('mk.uninstallTip')),
                onClick: function () { uninstallBundle(b.name) },
                children: b.removable === false ? T('mk.uninstall') : (busy === 'remove:' + b.name ? T('mk.uninstalling') : (confirmRemove === b.name ? T('mk.confirmUninstall') : T('mk.uninstall'))) }),
            ] })
          }) })
      })() : null,
      tab === 'market' && items === null && !error ? jsx('div', { key: 'skel', className: 'dcards-grid', children:
        [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return jsx('div', { key: 'sk-' + i, className: 'dcards-skel' }) }) // 2026-10-11 审计④：6→9 张，大视口 3 列铺满 3 行
      }) : null,
      // 0.9.12 P2：网格/列表双视图（P2-10）+ 增量渲染（P2-11：先渲 visN 条，翻页/筛选变化自动重置）
      tab === 'market' && pageItems !== null ? jsx('div', { key: 'list', className: viewMode === 'list' ? 'dcards-list' : 'dcards-grid', children: pageItems.slice(0, visN).map(function (item, index) {
        var spec = specOf(item)
        var repo = item.full_name || (item.npm || '') || (spec ? spec.replace(/^github:/, '') : item.name) || ''
        var href = item.html_url
          || (item.npm ? 'https://www.npmjs.com/package/' + item.npm : undefined)
          || (repo ? 'https://github.com/' + repo : undefined)
        var key = spec || String(index)
        var stars = item.stargazers_count
        var updated = typeof item.updated_at === 'string' ? item.updated_at.slice(0, 10) : undefined
        var updatedRel = relTime(item.updated_at) // 0.8.15：相对时间展示，hover 显绝对日期
        var notInstallable = item.installable === false // 快筛未声明 dsh.bundle（官方插件硬要求）
        var cat = classifyItem(item)
        var catColor = CATEGORY_COLORS[cat] || OTHER_COLOR
        // 0.8.1 已安装回显：bundle 名 = package.json name = npm 包名（item.npm）；
        // GitHub 仓库条目的仓库名（item.name）也可能即 bundle 名。
        // 0.9.28：候选键扩展第三键 repoPkg[item.full_name]（安装成功时学到的实际包名）——
        // 一仓多包（root 包名 ≠ 仓库名，如 routing-suite 实装 @dsh-external/dsh-super-injector）时前两键全 miss。
        var instHit = installedNameFor(item, installed, repoPkg)
        var instName = instHit.name
        var isInstalled = !!instName
        // 0.7.0 更新检测 → 0.8.3 升级：npm 包实时查 registry 最新版（1h 缓存），git-only 无 npm 包回退快筛版本
        var rtRec = instName ? rtVer[instName] : null
        var latestVer = rtRec && rtRec.v ? rtRec.v : item.version
        var latestSrc = rtRec && rtRec.v ? T('mk.srcRt') : T('mk.srcFast')
        // 0.8.5：实时校验命中时徽章直接显示 npm 最新版（未命中保持快照版本）——快照层 version 滞后不再误导
        var ver = rtRec && rtRec.v ? 'v' + rtRec.v : (typeof item.version === 'string' && item.version ? 'v' + item.version : null)
        var canUpdate = isInstalled && !!spec && !!latestVer && cmpVersion(latestVer, installedVer[instName]) > 0
        // 0.9.13：双行头部——短名为主、owner·更新时间为副；★ 上移头部右侧
        var slashIdx = repo.lastIndexOf('/')
        var shortName = slashIdx >= 0 ? repo.slice(slashIdx + 1) : (repo || item.name || '')
        var ownerName = slashIdx >= 0 ? repo.slice(0, slashIdx) : ''
        var headName = href
          ? jsx('a', { key: 'name', className: 'dcards-name', href: href, target: '_blank', rel: 'noreferrer', title: repo, children: shortName || T('mk.unnamed') })
          : jsx('span', { key: 'name', className: 'dcards-name', title: repo, children: shortName || T('mk.unnamed') })
        var subLine = ownerName + (ownerName && updated ? ' · ' : '') + (updated ? T('mk.updatedRel', { rel: updatedRel }) : '')
        var btnSolid = Object.assign({}, BTN_STYLE, { background: catColor }) // 0.9.13：安装/更新钮分类色实底（与左条/色点同色系）
        // 0.9.16：卡片元素抽取（网格/列表共用），方案 A 列表堆叠：l1 名称+owner+★ / l2 描述 / l3 元数据 + 右侧安装钮
        // 2026-10-11 UI 审计①：0★ 卡（1.37 万口径长尾占 48%）此前星数完全隐藏——列表中与高星卡并排无热度信号；
        // 改为 0★ 显示弱化灰「★ 0」（opacity 0.55），有数据与无数据（undefined）仍不显示
        var starsEl = stars === undefined || stars === null ? null
          : stars ? jsx('span', { key: 'stars', className: 'dcards-stars', title: stars >= 1000 ? String(stars) : undefined, style: Object.assign({ flexShrink: 0 }, META_STYLE), children: '★ ' + fmtStars(stars) }) // 0.9.28 UI 巡检：≥1000 缩写 11.5k，title 保留精确数
          : jsx('span', { key: 'stars', className: 'dcards-stars', title: T('mk.zeroStarTip'), style: Object.assign({ flexShrink: 0, opacity: 0.55 }, META_STYLE), children: '★ 0' })
        var avatarEl = jsx('span', { key: 'avatar', className: 'dcards-avatar', 'aria-hidden': true,
          style: { background: catColor },
          title: catLabel(cat), children: (shortName || '?').charAt(0).toUpperCase() })
        var catDotInner = [
          jsx('span', { key: 'dot', 'aria-hidden': true, style: { width: '7px', height: '7px', borderRadius: '50%', background: catColor, flexShrink: 0 } }),
          catLabel(cat),
        ]
        var offBadge = isOfficial(item) ? jsx('span', { key: 'off', className: 'dcards-badge',
          style: { background: 'transparent', border: '1px solid var(--dsw-alias-interactive-bg-hover)', color: 'var(--dsw-alias-brand-primary)' }, children: T('mk.badgeOfficial') }) : null
        var engBadge = item.ec === 0 ? jsx('span', { key: 'engbad', className: 'dcards-badge',
          style: { background: 'var(--dsw-alias-state-error-tertiary)', color: 'var(--dsw-alias-state-error-primary)' },
          title: T('mk.engineBadTip'), children: '⚠ ' + T('mk.engineBad') }) : null
        var verEl = ver ? jsx('span', { key: 'ver', style: META_STYLE,
          title: rtRec && rtRec.v ? T('mk.verTipRt') : T('mk.verTipPkg'), children: ver }) : null // 0.9.13：修复 vv 双前缀（ver 已含 v）
        // 2026-10-11 UI 审计③：排队中按钮 disabled 但仍实底亮色——补弱化视觉（opacity .5 + not-allowed）
        var queuedInst = spec !== undefined && installQueue.some(function (it) { return it.spec === spec })
        var btnEl = isInstalled && !canUpdate ? jsx('span', { key: 'btn', style: BTN_DISABLED_STYLE, title: instHit.via === 'map' ? T('mk.installedViaMap', { name: instName }) : T('mk.installedTip'), children: T('mk.installedBadge') })
          : canUpdate ? jsx('button', {
            key: 'btn', style: busy === spec ? BTN_GHOST_STYLE : btnSolid, disabled: busy !== '',
            title: T('mk.updateCardTip', { cur: installedVer[instName] || '?', src: latestSrc, latest: latestVer }),
            onClick: function () { updateBundle(instName, spec, latestVer) },
            children: busy === spec ? T('mk.updating') : T('mk.hasUpdate'),
          })
          : notInstallable ? jsx('span', { key: 'btn', style: BTN_DISABLED_STYLE,
            title: T('mk.notInstallableTip'), children: '🚫 ' + T('mk.notInstallable') })
          : spec === undefined ? null : jsx('button', {
            key: 'btn', style: Object.assign({}, busy === spec ? BTN_GHOST_STYLE : btnSolid, queuedInst ? { opacity: 0.5, cursor: 'not-allowed' } : null),
            disabled: queuedInst, // 0.9.6：已在队列 → 禁用防重复入队
            // 0.8.0：先弹安装确认（安全提示 + 来源 + CLI 命令），确认后才执行安装；0.9.6 busy 时确认后入队
            onClick: function () {
              setConfirmInst({
                spec: spec, name: repo || item.name, href: href, cli: cliCmdFor(spec),
                gitOnly: item.source === 'github' || !item.npm,
                fbPlan: fbPlanFor(item, spec), // 0.9.24：网络失败降级梯计划（tgz 镜像 + codeload 端点）
              })
            },
            children: busy === spec ? T('mk.installing') : queuedInst ? T('mk.queuedBadge') : T('mk.install'),
          })
        var descEl = (function () {
          // 0.9.10：展示优先级 条目自带 zh（hub 预翻译 descZh）> 运行时翻译缓存 > 原文；连续「|」分隔符清洗为「·」
          // 0.9.16：占位描述（描述=包名本身或纯 topic 词）视为无描述，不译不显示
          var rawDesc = String(item.description || '')
          var isPh = isPlaceholderDesc(rawDesc, item.name)
          var descZh = isPh ? null : (item.descZh || (item.description ? txRef.current[hashStr(item.description)] : null) || null)
          // 0.9.21：空描述/占位描述显示弱化「暂无描述」（市场界面全中文收尾——hub tx-cache 已全量覆盖自然语言描述，0.9.20 实测客户端口径未翻译=0）
          var noDesc = !rawDesc || isPh
          var shown = noDesc ? T('mk.noDesc') : String(descZh || rawDesc).replace(/\s*\|\s*(?:\|\s*)*/g, ' · ').replace(/\s*·\s*$/, '')
          return jsx('p', { key: 'desc', className: 'dcards-desc', style: noDesc ? { opacity: 0.55 } : undefined, title: noDesc ? undefined : rawDesc, children: shown }) // 空描述也渲染：撑起 min-height 齐底；title 恒给完整原文（2026-10-11 审计②）
        })()
        return jsx('div', { key: key, className: 'dcards-card', style: { borderLeft: '3px solid ' + catColor }, children: viewMode !== 'list' ? [ // 0.9.13：分类色左条；网格维持双行头部结构
          jsx('div', { key: 'head', className: 'dcards-head', children: [
            avatarEl,
            jsx('div', { key: 'namewrap', className: 'dcards-namewrap', children: [
              headName,
              subLine ? jsx('div', { key: 'sub', className: 'dcards-sub', children: subLine }) : null,
            ] }),
            starsEl,
          ] }),
          descEl,
          // 0.9.13：meta 行并入底部操作行——分类色点 + 官方/警示徽章 + 版本靠左，安装钮靠右
          jsx('div', { key: 'actions', className: 'dcards-actions', children: [
            jsx('span', { key: 'cat', className: 'dcards-catdot', style: { color: catColor, marginRight: 'auto' },
              title: catLabel(cat), children: catDotInner }),
            offBadge, engBadge, verEl, btnEl,
          ] }),
        ] : [
          // 0.9.16 方案 A（参考 VS Code 扩展视图 / Obsidian 社区插件范式）：窄容器纵向堆叠，名称不再与描述横向竞争
          avatarEl,
          jsx('div', { key: 'main', className: 'dcards-main', children: [
            jsx('div', { key: 'l1', className: 'dcards-l1', children: [
              headName,
              ownerName ? jsx('span', { key: 'owner', className: 'dcards-l1owner', title: repo, children: ownerName }) : null,
              starsEl,
            ] }),
            descEl,
            jsx('div', { key: 'l3', className: 'dcards-l3', children: [
              jsx('span', { key: 'cat', className: 'dcards-catdot', style: { color: catColor }, title: catLabel(cat), children: catDotInner }),
              offBadge, engBadge, verEl,
              updated ? jsx('span', { key: 'upd', style: META_STYLE, title: updated, children: T('mk.updatedRel', { rel: updatedRel }) }) : null,
            ] }),
          ] }),
          btnEl,
        ] })
      }) }) : null,
      // 0.9.12 P2-11：增量渲染「加载更多」（每次 +60）
      tab === 'market' && pageItems !== null && pageItems.length > visN ? jsx('div', { key: 'more', style: { display: 'flex', justifyContent: 'center', margin: '10px 0 2px' }, children:
        jsx('button', { style: BTN_GHOST_STYLE, onClick: visMore, children: T('mk.loadMore', { n: pageItems.length - visN }) })
      }) : null,
      // 0.9.3 #5：空结果升级为居中引导块；有任何激活筛选（搜索词/分类/星标）时提供一键清除
      tab === 'market' && pageItems !== null && pageItems.length === 0 ? (function () {
        var hasFilter = !!(query || activeCat || starMin > 0)
        return jsx('div', { key: 'empty', style: { margin: '18px 0', padding: '32px 16px', textAlign: 'center',
          border: '1px dashed var(--dsw-alias-border-l2)', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-2)' }, children: [
          jsx('p', { key: 't', style: { margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' }, children: T('mk.emptyTitle') }),
          jsx('p', { key: 'd', style: { margin: '0 0 14px', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' }, children: T('mk.emptyDesc') }),
          hasFilter ? jsx('button', { key: 'clr', style: BTN_GHOST_STYLE,
            onClick: function () { setQuery(''); setActiveCat(''); setSubCat(''); setStarMin(0); setViewPage(1); marketViewClear() },
            children: T('mk.clearFilters') }) : null,
        ] })
      })() : null,
      // 经典分页条（0.4.0，0.5.4 双模式）：索引就绪 → 全量索引客户端分页（跨页筛选 + 突破 Search API 1000 条页界）；
      // 未就绪 → 服务端分页。自建源无分页语义不显示。
      tab === 'market' && ghSearch && totalCount !== null && items !== null && filtered !== null ? (function () {
        if (idxReady) {
          return jsx('div', { key: 'pagebar', className: 'dcards-pagebar', children: [
            jsx('button', { key: 'prev', style: BTN_GHOST_STYLE, disabled: effViewPage <= 1,
              onClick: function () { setViewPage(effViewPage - 1) }, children: T('mk.prev') }),
            jsx('span', { key: 'info', children:
              T('mk.pageInfo', { p: effViewPage, total: viewTotalPages, n: filtered.length })
              + (activeCat ? T('mk.pageInfoCat', { cat: catLabel(activeCat) + (activeSub && subsOf(activeCat) ? ' · ' + activeSub : '') }) : '') }),
            jsx('button', { key: 'next', style: BTN_GHOST_STYLE, disabled: effViewPage >= viewTotalPages,
              onClick: function () { setViewPage(effViewPage + 1) }, children: T('mk.next') }),
            jsx('span', { key: 'pslabel', children: T('mk.perPage') }),
            jsx('select', { key: 'psize', value: String(pageSize),
              onChange: function (e) { setPageSize(Number(e.target.value) || 50) },
              children: PAGE_SIZES.map(function (n) {
                return jsx('option', { key: 'ps-' + n, value: String(n), children: T('mk.perPageN', { n: n }) })
              }) }),
          ] })
        }
        var totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
        return jsx('div', { key: 'pagebar', className: 'dcards-pagebar', children: [
          jsx('button', { key: 'prev', style: BTN_GHOST_STYLE, disabled: paging || page <= 1,
            onClick: function () { load(page - 1) }, children: T('mk.prev') }),
          jsx('span', { key: 'info', children:
            T('mk.pageInfo', { p: page, total: totalPages, n: totalCount })
            + ((query || activeCat) && filtered.length !== items.length ? T('mk.pageMatch', { n: filtered.length }) : '') }),
          jsx('button', { key: 'next', style: BTN_GHOST_STYLE, disabled: paging || page >= totalPages,
            onClick: function () { load(page + 1) }, children: T('mk.next') }),
          jsx('span', { key: 'pslabel', children: T('mk.perPage') }),
          jsx('select', { key: 'psize', value: String(pageSize),
            onChange: function (e) { setPageSize(Number(e.target.value) || 50) },
            children: PAGE_SIZES.map(function (n) {
              return jsx('option', { key: 'ps-' + n, value: String(n), children: T('mk.perPageN', { n: n }) })
            }) }),
        ] })
      })() : null,
      // ---- 0.8.0 自定义安装 Tab：spec 输入（npm 包名 / github:owner/repo / 本地 tgz 路径） ----
      tab === 'custom' ? jsx('div', { key: 'custom', style: { marginTop: '4px' }, children: [
        jsx('div', { key: 'row', style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [
          jsx('input', {
            key: 'in', style: { flex: 1, maxWidth: '480px', padding: '4px 10px', height: '26px', boxSizing: 'border-box', // 0.9.28 UI 巡检：定高 26 与搜索框/按钮基准对齐（原 6px padding content-box → 29px）
              border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' },
            placeholder: T('mk.customPh'),
            value: customSpec,
            onChange: function (e) { setCustomSpec(e.target.value) },
            onKeyDown: function (e) { if (e.key === 'Enter' && customSpec.trim()) setConfirmInst(mkCustomConfirm(customSpec.trim())) }, // 0.9.6：busy 时弹窗内变「加入安装队列」
          }),
          jsx('button', { key: 'go', style: BTN_STYLE, disabled: !customSpec.trim(),
            onClick: function () { setConfirmInst(mkCustomConfirm(customSpec.trim())) }, children: T('mk.installDots') }),
        ] }),
        noteUl(T, 'cnote', ['mk.customNote1', 'mk.customNote2', 'mk.customNote3', 'mk.customNote4']),
      ] }) : null,
      // ---- 0.8.0 设置 Tab：目录开关 + 数据源说明（原先挤在市场顶部的三枚开关迁到这里） ----
      tab === 'settings' ? jsx('div', { key: 'settings', style: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }, children: [
        jsx('div', { key: 'toggles', style: { display: 'flex', flexWrap: 'wrap', gap: '8px' }, children: [
          jsx('button', {
            key: 'quality', style: chipStyle(qualityOn), title: T('mk.qualityTip'),
            onClick: function () { setQualityOn(!qualityOn) },
            children: T('mk.quality', { v: qualityOn ? T('mk.on') : T('mk.off') }),
          }),
          jsx('button', {
            key: 'onlyinst', style: chipStyle(onlyInstallable), title: T('mk.onlyInstTip'),
            onClick: function () { setOnlyInstallable(!onlyInstallable) },
            children: T('mk.onlyInst', { v: onlyInstallable ? T('mk.on') : T('mk.off') }),
          }),
          // 1.1.0：npm 渠道开关——source==='npm' 条目不在官方 topic 页，默认隐藏（来源口径收紧）
          jsx('button', {
            key: 'npmchan', style: chipStyle(npmChan), title: T('mk.npmChanTip'),
            onClick: function () { setNpmChan(!npmChan) },
            children: T('mk.npmChan', { v: npmChan ? T('mk.on') : T('mk.off') }),
          }),
          // 1.2.0：引擎兼容开关——dsh.engine 与桌面端运行时不兼容的条目默认隐藏（L2 硬门禁）
          jsx('button', {
            key: 'engineok', style: chipStyle(engineOn), title: T('mk.engineTip'),
            onClick: function () { setEngineOn(!engineOn) },
            children: T('mk.engine', { v: engineOn ? T('mk.on') : T('mk.off') }),
          }),
          // 0.8.1：排序 chip 移回插件市场工具行（设置页只留目录口径开关）
        ] }),
        noteUl(T, 'srcnote', ['mk.srcNote1', 'mk.srcNote2', 'mk.srcNote3', 'mk.srcNote4', 'mk.scopeNote1', 'mk.scopeNote2', 'mk.scopeNote3']),
        jsx('p', { key: 'llm', style: HINT_STYLE, children:
          T('mk.llmLabel') + (llmReady ? T('mk.llmOn', { model: llmCfg.model }) : T('mk.llmOff')) }),
      ] }) : null,
      tab === 'market' ? noteUl(T, 'note', ['mk.note1', 'mk.note2']) : null,
      tab === 'installed' ? noteUl(T, 'note', ['mk.note3', 'mk.note4', 'mk.note5']) : null,
      // ---- 0.8.0 安装确认弹窗（安全提示 + 来源 + CLI 命令 + 直接安装） ----
      confirmInst ? (function () {
        var ci = confirmInst
        var copyCmd = function () {
          var t = ci.cli
          if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t).then(function () { setMessage(T('mk.copied') + t) }, function () { setMessage(T('mk.copyFail')) })
          } else if (typeof document !== 'undefined') {
            // 官方规则豁免（practices.md「勿在组件外写 DOM」）：Clipboard API 不可用时的瞬时兜底，
            // execCommand('copy') 要求元素在文档内；textarea 同帧创建、同帧移除，不产生持久 DOM。
            var ta = document.createElement('textarea')
            ta.value = t; document.body.appendChild(ta); ta.select()
            try { document.execCommand('copy'); setMessage(T('mk.copied') + t) } catch (e) { setMessage(T('mk.copyFail')) }
            document.body.removeChild(ta)
          }
        }
        return jsx('div', { key: 'modal', style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--dsw-alias-bg-mask-1)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children:
          // 0.9.28 E2E 复验：弹层补对话框语义（role/aria-modal/aria-label + 关闭钮 aria-label）——读屏可辨、自动化可寻址
          // 注：宿主 jsx 会改写 aria-labelledby 为生成 id（实测 :rr: 不可解析），故用直给 aria-label
          jsx('div', { role: 'dialog', 'aria-modal': true, 'aria-label': T('mk.modalTitle'), style: { width: '480px', maxWidth: '92vw', maxHeight: '86vh', overflow: 'auto', background: 'var(--dsw-alias-bg-layer-1)', borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,.22)', padding: '18px 20px', position: 'relative' }, children: [
            jsx('div', { key: 'ttl', style: { fontWeight: 700, fontSize: '15px', color: 'var(--dsw-alias-label-primary)' }, children: T('mk.modalTitle') }),
            jsx('button', { key: 'x', onClick: function () { setConfirmInst(null) }, 'aria-label': T('mk.cancelTip'), style: { position: 'absolute', top: '8px', right: '12px', border: 'none', background: 'transparent', fontSize: '15px', cursor: 'pointer', color: 'var(--dsw-alias-label-tertiary)' }, title: T('mk.cancelTip'), children: '✕' }),
            jsx('div', { key: 'warn', style: { marginTop: '12px', background: 'var(--dsw-alias-state-error-secondary)', border: '1px solid var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }, children:
              T('mk.warnBox') }),
            ci.reinstallWarn ? jsx('div', { key: 'rwarn', style: { marginTop: '8px', background: 'var(--dsw-alias-state-warn-tertiary)', border: '1px solid var(--dsw-alias-state-warn-label)', color: 'var(--dsw-alias-state-warn-label)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }, children:
              '⚠️ ' + ci.reinstallWarn }) : null,
            jsx('div', { key: 'rows', style: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }, children: [
              jsx('div', { key: 'r1', style: { display: 'flex', gap: '10px' }, children: [
                jsx('span', { key: 'k', style: { color: 'var(--dsw-alias-label-tertiary)', width: '40px', flexShrink: 0 }, children: T('mk.rowPlugin') }),
                jsx('span', { key: 'v', style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary)', wordBreak: 'break-all' }, children: ci.name }),
              ] }),
              ci.href ? jsx('div', { key: 'r2', style: { display: 'flex', gap: '10px' }, children: [
                jsx('span', { key: 'k', style: { color: 'var(--dsw-alias-label-tertiary)', width: '40px', flexShrink: 0 }, children: T('mk.rowSource') }),
                jsx('a', { key: 'v', href: ci.href, target: '_blank', rel: 'noreferrer', style: { color: 'var(--dsw-alias-brand-primary)', wordBreak: 'break-all' }, children: ci.href.replace(/^https?:\/\//, '') }),
              ] }) : null,
              jsx('div', { key: 'r3', style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [
                jsx('div', { key: 'cmd', style: { background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--dsw-alias-label-primary)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '8px' }, children: [
                  jsx('span', { key: 'c', style: { flex: 1 }, children: ci.cli }),
                  jsx('button', { key: 'cp', onClick: copyCmd, style: BTN_GHOST_STYLE, title: T('mk.copyTip'), children: T('mk.copy') }),
                ] }),
                ci.gitOnly ? jsx('div', { key: 'githint', style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)' }, children:
                  T('mk.gitOnlyHint') }) : null,
              ] }),
            ] }),
            jsx('div', { key: 'acts', style: { marginTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }, children: [
              jsx('button', { key: 'copy', onClick: copyCmd, style: BTN_GHOST_STYLE, children: T('mk.copyCmd') }),
              jsx('button', { key: 'go', style: Object.assign({}, BTN_STYLE, { background: 'var(--dsw-alias-label-primary)', borderColor: 'var(--dsw-alias-label-primary)' }),
                title: busy !== '' ? T('mk.queueAddTip') : T('mk.directInstallTip'),
                onClick: function () {
                  var c = confirmInst; setConfirmInst(null)
                  if (busy !== '') enqueueInstall(c.spec, c.name, c.fbPlan) // 0.9.6：有操作进行中 → 入队串行执行
                  else install(c.spec, c.name, { fbPlan: c.fbPlan })
                }, children: busy !== '' ? T('mk.queueAdd') : T('mk.directInstall') }),
            ] }),
          ] }),
        })
      })() : null,
    ] })
  }
}
