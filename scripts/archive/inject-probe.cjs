// 临时探针注入器：向已安装副本 lib/client.js 注入 describe 镜像调试探针（用后即删）
const fs = require('fs')
const target = 'D:/ruan/dsh-home-npm/profiles/web/node_modules/dsh-plugin-cards/lib/client.js'
let s = fs.readFileSync(target, 'utf8')
// 移除旧探针（若有）
s = s.replace(/;\n  setTimeout\(function \(\) \{\n    try \{\n      var desc = ctx\.configForms[\s\S]*?\n  \}, 100\);/, '')
s = s.replace(/; \(window\.__cardsSnap = window\.__cardsSnap \|\| \[\]\)\.push[\s\S]*?\)\)\);?/, '')
const probe = `
  setTimeout(function () {
    try {
      var desc = ctx.configForms.describe();
      var snapD = desc.getSnapshot();
      var view = snapD && snapD.view;
      window.__cardsSnap = {
        hasView: !!view,
        writable: view ? view.writable : null,
        nsList: view ? view.namespaces.map(function (n) { return { ns: n.ns, rev: n.revision, keys: n.value && typeof n.value === 'object' ? Object.keys(n.value) : String(typeof n.value) } }) : null,
        ourNs: view ? (view.namespaces.filter(function (n) { return /cards/.test(n.ns) }).map(function (n) { return { ns: n.ns, value: n.value } })) : null,
        formStatus: form.getSnapshot().status,
        formWritable: form.getSnapshot().writable
      };
    } catch (e) { window.__cardsSnap = { err: String(e) } }
  }, 100);`
const anchor = 'var ghSearch = isGithubSearchApi(resolveCatalogApi(catalogUrl))'
if (!s.includes(anchor)) { console.log('锚点未找到'); process.exit(1) }
s = s.replace(anchor, anchor + probe)
fs.writeFileSync(target, s)
const head = fs.readFileSync(target)[0]
console.log('新探针已注入, BOM:', head === 0xEF ? '有' : '无')
