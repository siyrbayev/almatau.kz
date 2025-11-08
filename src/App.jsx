import React, { useEffect, useMemo, useState, useCallback } from "react";

// ========================= UTILS: minimal styles =========================
function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById("wipon-inline-styles")) return;
    const css = `
:root{--bg:#fafafa;--fg:#111;--muted:#6b7280;--border:#e5e7eb;--shadow:0 1px 2px rgba(0,0,0,.06);--primary:#111;--disabled:#cbd5e1}
html,body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif}
.container{margin:0 auto;padding:10px}
// max-width:1160px;
.tabs{display:flex;gap:8px;margin-bottom:16px}
.btn{padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:#fff;cursor:pointer}
.btn.primary{background:var(--primary);color:#fff;border-color:var(--primary)}
.btn.ghost{background:#fff}
.btn:disabled{opacity:.5;cursor:not-allowed}
.grid-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{background:#fff;border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);padding:16px}
.card .title{font-size:28px;font-weight:700}
.badge{font-size:12px;color:var(--muted)}
.child-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.child-btn{display:flex;flex-direction:column;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;padding:10px;background:#fff;cursor:pointer;text-align:center}
.child-btn:hover{box-shadow:0 2px 8px rgba(0,0,0,.08)}
.child-btn.disabled{opacity:.5;cursor:not-allowed}
.child-icon{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;border:1px solid var(--border);margin:0 auto}
.panel{background:#fff;border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);padding:16px}
.products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.product{border:1px solid var(--border);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:8px;background:#fff}
.product .img{height:150px;border:1px dashed var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--muted)}
.product .title{font-size:14px;line-height:1.25;min-height:38px}
.help{color:var(--muted);font-size:14px}
.input,.select{padding:8px 12px;border:1px solid var(--border);border-radius:10px}
.toolbar{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
@media (max-width: 530px){.toolbar{grid-template-columns:repeat(2,1fr)}}
@media (max-width: 380px){.toolbar{grid-template-columns:repeat(1,1fr)}}
.breadcrumbs{display:flex;gap:8px;align-items:center;margin-bottom:12px;font-size:14px}
.bc{color:#2563eb;cursor:pointer}
.bc.sep{color:var(--muted);cursor:default}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s infinite;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s infinite;
}

.skeleton-line.sm { width: 50%; }
.skeleton-line.md { width: 70%; }
.skeleton-line.lg { width: 90%; }

.sk { position:relative; overflow:hidden; background:#eee; border-radius:14px; }
.sk::after { content:""; position:absolute; inset:0; transform:translateX(-100%); 
  background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.6), rgba(255,255,255,0)); 
  animation:sk-shimmer 1.1s infinite; }
@keyframes sk-shimmer { to { transform:translateX(100%); } }
.sk-bar { height:20px; border-radius:10px; background:#eee; }
.sk-tile { width:100%; aspect-ratio:7/6; border-radius:14px; background:#eee; }
.sk-caption { height:12px; width:70%; margin:8px auto 0; border-radius:6px; background:#eee; }
`;

const s = document.createElement("style");
s.id = "wipon-inline-styles";
s.textContent = css;
document.head.appendChild(s);
}, []);
}

// ========================= CONFIG (no secrets) =========================
const PROXY_BASE = "/api"; // было "/api"
const proxify = (path) => path; // БЕЗ /proxy и без join — теперь прямые ручки

const ONLY_POSITIVE_BALANCE = true;
const DEFAULT_STOCK_ID = 83673;
const MAX_CHILD_BATCH = 12; // how many subcats to aggregate when opening a parent

// helpers
async function fetchJson(url){const r = await fetch(url,{headers:{Accept:"application/json"}}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json();}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
const fmtMoney=(v)=> v==null?"—": new Intl.NumberFormat('ru-RU').format(Number(v))+" ₸";
const totalBalance=(it)=> Array.isArray(it.stocks)? it.stocks.reduce((s,x)=>s+num(x.balance),0): (it.balance ?? it.quantity ?? "—");

// ========================= ROUTER (hash-based) =========================
function useHashRouter(){
  const parse = useCallback(()=>{
    const h = (location.hash||'').replace(/^#/,'');
    if (h.startsWith('products/')) { const id = Number(h.split('/')[1]||''); return {page:'products', params:{id}}; }
    if (h === 'search') return {page:'search'};
    if (h === 'debug') return {page:'debug'};
    return {page:'categories'};
  },[]);
  const [route,setRoute]=useState(parse());
  useEffect(()=>{const onHash=()=>setRoute(parse()); window.addEventListener('hashchange',onHash); return ()=>window.removeEventListener('hashchange',onHash);},[parse]);
  const go=(page, params)=>{ if(page==='products') location.hash=`#products/${params.id}`; else if(page==='search') location.hash='#search'; else if(page==='debug') location.hash='#debug'; else location.hash='#'; };
  return {route, go};
}

// ========================= DATA: categories tree =========================
function useCategories(){
  const [categories,setCategories]=useState([]);
  const [err,setErr]=useState(null);
  const [loading,setLoading]=useState(true);
  
  useEffect(()=>{(async()=>{
    try{
      const qs=new URLSearchParams(); qs.set('all','1');

      if (DEFAULT_STOCK_ID!=null) qs.set('stock_id',String(DEFAULT_STOCK_ID));
      
      // const data=await fetchJson(proxify(`/v1/employee/auto/item-category?${qs.toString()}`));
      const data = await fetchJson(`/api/categories?all=1&stock_id=${DEFAULT_STOCK_ID}`);

      console.log('Categories data:', data);

      const list =
      Array.isArray(data?.data?.data) ? data.data.data :
      Array.isArray(data?.data)      ? data.data      :
      Array.isArray(data)            ? data           : [];

      console.log("✅ Ответ от API:", data);

      setCategories(list);

      console.log("📦 Загружено категорий:", list.length, list.slice(0, 5));

    } catch(e) { 
      setErr(String(e?.message||e));
    } finally { 
      setLoading(false);
    }
  })();},[]);

  const tree = useMemo(()=>{
    const roots=[]; 
    const children=new Map(); 
    const byId=new Map();

    // 1) безопасный обход массива категорий
    for (const c of (categories || [])) {
      byId.set(c.id, c);

      if (c.parent_id == null) {
        roots.push(c);
      } else {
        // 2) явные скобки, чтобы push точно был внутри ветки
        if (!children.has(c.parent_id)) {
          children.set(c.parent_id, []);
        }
        children.get(c.parent_id).push(c);
      }
    }

    const sort=(a)=>a.slice().sort((x,y)=> (x.position??0)-(y.position??0) || String(x.title).localeCompare(String(y.title)));

    for(const [k,v] of children.entries()) children.set(k,sort(v));

    console.log("🌳 ROOTS:", roots.length, "CHILDREN:", children.size);
    return {roots:sort(roots), children, byId};
  },[categories]);

  return {...tree, err, loading};
}

const pickBestThumb = (thumbs = []) => {
  if (!Array.isArray(thumbs) || thumbs.length === 0) return null;
  // сначала пробуем 1080x1080 (у них обычно type:3)
  const t1080 = thumbs.find(t => (t.type === 3) || (t.width === 1080 && t.height === 1080));
  if (t1080) return t1080.file;
  // иначе берём самый широкий
  const sorted = [...thumbs].sort((a,b) => (b.width||0) - (a.width||0));
  return sorted[0]?.file ?? null;
};

const getCategoryImageUrl = (ch) => {
  if (!ch) return null;
  const arr = Array.isArray(ch.images) ? ch.images : [];
  const first = arr[0];
  const fromThumbs = first?.thumbnails ? pickBestThumb(first.thumbnails) : null;
  return fromThumbs || first?.file || ch?.image || null;
};

const makeTileStyle = (url) => ({
  width: '100%',
  aspectRatio: '7 / 6',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  ...(url ? { backgroundImage: `url("${url}")` } : { background: '#f3f4f6' }) // серый фон, если картинки нет
});

// ========================= PAGES =========================
function CategoriesPage({ go }){

  const {roots, children, byId, err, loading} = useCategories();
  
  return (
    <div className="container" style={{margin: '0px -12px', backgroundColor: 'white'}}>
      <h1 className="text-15xl font-bold mb-10" >Категории товаров</h1>
      {err && <div className="help">{err}</div>}

      {loading && !err && (
        <>
          <CategorySkeletonSection tiles={6} />
        </>
      )}
      {!loading && (
      <div>
        {loading && <div>Загрузка категорий...</div>}
        {!loading && !roots.length && <div>Нет категорий (roots пустой)</div>}
        {roots.map((parent)=>{
          const childs = children.get(parent.id)||[];
          const canOpenParent = num(parent.items_count) > 0 || childs.some(c=>num(c.items_count)>0);
          return (
            // Это есть в верстке
            <div key={parent.id} style={{ marginTop: '1%' }}>
              {/* Плитки подкатегорий (как в макете) */}
              {childs.length>0 && (
                <div key={parent.id}  className="card" style={{ borderColor: 'transparent', boxShadow: 'none', marginBottom: '24px' }}>
                  <div className="title" style={{ marginBottom: '24px', color: '#4f4f4f'}} title={parent.title}>{parent.title}</div>
                  <div className="child-grid" style={{ margin: '-12px' }}>
                    {childs.map(ch => {
                      const disabled = !(num(ch.items_count) > 0);
                      const imgUrl = getCategoryImageUrl(ch);
                      const btnStyle = makeTileStyle(imgUrl);

                      return (
                        <div key={ch.id} style={{ width: '100%', height: '100%' }}>
                          <button
                            type="button"
                            className={`child-btn ${disabled ? 'disabled' : ''}`}
                            disabled={disabled}
                            title={disabled ? 'Нет товаров' : ch.title}
                            style={btnStyle}
                            onClick={() => !disabled && go('products', { id: ch.id })}
                          >
                            {!imgUrl && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '6px 10px',
                                  background: '#fff',
                                  borderRadius: 8,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                  fontSize: 12,
                                  color: '#6b7280'
                                }}
                              >
                                Нет изображения
                              </span>
                            )}
                          </button>

                          <div
                            style={{
                              color: '#4f4f4f',
                              fontSize: 'clamp(12px, 1.2vw, 18px)',
                              lineHeight: 1.2,
                              margin: '8px 0 16px 0',
                              textAlign: 'left',
                              fontWeight: 400,
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              wordBreak: 'break-word',
                              hyphens: 'auto',
                              
                            }}
                            title={ch?.title}
                          >
                            {ch?.title ?? '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* {childs.length===0 && <div className="help">Подкатегорий нет</div>} */}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

const CategorySkeletonSection = ({ tiles = 8 }) => (
  <div style={{ marginTop: '1%' }}>
    <div className="card" style={{ borderColor: 'transparent', boxShadow: 'none', marginBottom: 24 }}>
      <div className="title" style={{ marginBottom: 24 }}>
        <div className="sk sk-bar" style={{ width: '30%' }} />
      </div>
      <div className="child-grid" style={{ margin: '-12px' }}>
        {Array.from({ length: tiles }).map((_, i) => (
          <div key={`sk-tile-${i}`} style={{ width: '100%', height: '100%', padding: 12 }}>
            <div className="sk sk-tile" />
            <div className="sk sk-caption" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

function ProductsPage({ go, categoryId }) {
  const { children, byId } = useCategories();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const cat = byId.get(categoryId);
  const title = cat?.title || `Категория #${categoryId}`;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // если это родитель — собираем с детей, иначе — из самой категории
      const childs = children.get(categoryId) || [];
      const ids =
        childs.length > 0
          ? childs.filter((c) => num(c.items_count) > 0).map((c) => c.id)
          : [categoryId];

      if (ids.length === 0) {
        setItems([]);
        setHasNext(false);
        return;
      }

      const fetchOne = async (cid) => {
        // const qs = new URLSearchParams();
        // qs.set("item_category_id", String(cid));
        // if (ONLY_POSITIVE_BALANCE) qs.set("positive_balance", "1");
        // if (DEFAULT_STOCK_ID != null) qs.set("stock_id", String(DEFAULT_STOCK_ID));
        // qs.set("per_page", String(perPage));
        // qs.set("page", String(page));
        // const data = await fetchJson(proxify(`/v2/employee/auto/item?${qs.toString()}`));
        const qs = new URLSearchParams();
        qs.set("item_category_id", String(cid));
        if (ONLY_POSITIVE_BALANCE) qs.set("positive_balance","true");
        if (DEFAULT_STOCK_ID != null) qs.set("stock_id", String(DEFAULT_STOCK_ID));
        qs.set("per_page", String(perPage));
        qs.set("page", String(page));
        const data = await fetchJson(`/api/items?${qs.toString()}`);
        const arr = Array.isArray(data.data) ? data.data : data?.data ? [data.data] : [];
        return arr;
      };

      const batches = await Promise.all(ids.slice(0, MAX_CHILD_BATCH).map(fetchOne));
      const merged = ([]).concat(...batches);
      setItems(merged);

      // эвристика: если вернулось не меньше perPage — считаем, что есть следующая страница
      setHasNext(merged.length >= perPage);
    } catch (e) {
      setErr(String(e?.message || e));
      setItems([]);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [categoryId, children, page, perPage]); // ← ВАЖНО: page и perPage в зависимостях

  useEffect(() => {
    load();
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [load]);

  return (
    <div className="container">
      <div className="breadcrumbs">
        <span className="bc" onClick={() => go("categories")}>Категории</span>
        <span className="bc sep">/</span>
        <span>{title}</span>
      </div>

      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      {err && <div className="help">{err}</div>}
      {loading && <div className="help">Загрузка…</div>}
      {!loading && items.length === 0 && <div className="help">В этой категории нет товаров.</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <span className="help">Показать на странице:</span>
        <select
          className="select"
          value={perPage}
          onChange={(e) => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            setLoading(true);     // мгновенно показать лоадер
            setPage(1);           // на смене perPage — на первую страницу
            setPerPage(n);
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      {loading ? (
          <div className="products-grid">
            {Array.from({ length: perPage }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-thumb" />
                <div className="skeleton-line lg" />
                <div className="skeleton-line md" />
                <div className="skeleton-line sm" />
              </div>
            ))}
          </div>
        ) : (
              <div className="products-grid">
                {items.map(it => (
                  <div key={it.id} className="product">
                    <div
                      className="img"
                      style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  borderRadius: "12px",
                  background: "#f3f4f6",
                }}
              >
                {it.image ? (
                  <img
                    src={it.image}
                    alt={it.title || "Товар"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    🛒
                  </div>
                )}
              </div>
              <div className="title" title={it.title || it.name}>{it.title || it.name || `#${it.id}`}</div>
              <div className="badge">Штрихкод: {it.barcode ?? it.barcode}</div>
              <div className="badge">Цена: {fmtMoney(it.selling_price ?? it.price)}</div>
              <div className="badge">Остаток: {totalBalance(it)} {it.unit_name}</div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <div className="help">Стр. {page}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              disabled={page <= 1 || loading}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setLoading(true);                  // мгновенно показываем лоадер
                setPage((p) => Math.max(1, p - 1));
              }}
            >
              ← Назад
            </button>
            <button
              className="btn"
              disabled={!hasNext || loading}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setLoading(true);                  // мгновенно показываем лоадер
                setPage((p) => p + 1);
              }}
            >
              Вперёд →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchPage(){
  const [title,setTitle]=useState("");
  const [barcode,setBarcode]=useState("");
  const [vendor_code,setVendorCode]=useState("");
  const [items,setItems]=useState([]);
  const [page,setPage]=useState(1);
  const [perPage,setPerPage]=useState(20);
  const [hasNext,setHasNext]=useState(false);
  const [loading,setLoading]=useState(false);
  const [initiated,setInitiated]=useState(false);
  const [err,setErr]=useState(null);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const run = async (reset=false)=>{
    setLoading(true);
    setErr(null);
    try{
      // const qs=new URLSearchParams();
      // if(title.trim()) qs.set('title',title.trim());
      // if(barcode.trim()) qs.set('barcode',barcode.trim());
      // if(vendor_code.trim()) qs.set('vendor_code',vendor_code.trim());
      // if(DEFAULT_STOCK_ID!=null) qs.set('stock_id',String(DEFAULT_STOCK_ID));
      // if(ONLY_POSITIVE_BALANCE) qs.set('positive_balance','1');
      // qs.set('page',String(reset?1:page));
      // qs.set('per_page',String(perPage));
      // const data=await fetchJson(proxify(`/v2/employee/auto/item?${qs.toString()}`));
      const qs = new URLSearchParams();
      if (title.trim()) qs.set('title', title.trim());
      if (barcode.trim()) qs.set('barcode', barcode.trim());
      if (vendor_code.trim()) qs.set('vendor_code', vendor_code.trim());
      if (DEFAULT_STOCK_ID!=null) qs.set('stock_id', String(DEFAULT_STOCK_ID));
      if (ONLY_POSITIVE_BALANCE) qs.set('positive_balance','true');
      qs.set('page', String(reset?1:page));
      qs.set('per_page', String(perPage));
      const data = await fetchJson(`/api/items?${qs.toString()}`);

      const arr=Array.isArray(data.data)?data.data:(data?.data?[data.data]:[]);
      setItems(arr);
      setHasNext(arr.length>=perPage);
      if(reset) setPage(1);
    }catch(e){
      setErr(String(e?.message||e));
      setItems([]);
      setHasNext(false);
    }finally{
      setLoading(false);
    }
  };

  // paginate load
  useEffect(()=>{ if(initiated) run(false);},[page,perPage]);

  // Enter global trigger
  useEffect(()=>{
    const handle = (e)=>{
      if(e.key === 'Enter'){
        e.preventDefault();
        scrollTop();
        setInitiated(true);
        run(true);
      }
    };
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener('keydown', handle);
    return ()=> window.removeEventListener('keydown', handle);
  },[title,barcode,vendor_code,run]);

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-4">Поиск товаров</h1>

      <div style={{marginBottom:12, display:'flex', gap:8, justifyContent: 'space-between'}}>
        <input className="input"
          placeholder="Название"
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
          style={{width:'80%', height: '40px'}}
        />
        <button className="btn primary"
          onClick={()=>{
            scrollTop();
            setInitiated(true);
            run(true);
          }}
          style={{ height: '56px', width: '15%' }}
        >Найти</button>
      </div>

      <div className="toolbar">
        <input className="input"
          placeholder="Штрихкод"
          value={barcode}
          onChange={(e)=>setBarcode(e.target.value)}
        />
        <input className="input"
          placeholder="Артикул"
          value={vendor_code}
          onChange={(e)=>setVendorCode(e.target.value)}
        />

        <select className="select" value={perPage}
          onChange={(e)=>{
            const n=Number(e.target.value);
            setInitiated(true);
            setPage(1);
            setPerPage(n);
          }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>

        <button className="btn"
          onClick={()=>{
            setTitle('');
            setBarcode('');
            setVendorCode('');
            setItems([]);
            setInitiated(false);
            setPage(1);
          }}>Сброс</button>
      </div>

      {err && <div className="help">{err}</div>}

      {loading && (
        <div className="products-grid">
          {Array.from({length:perPage}).map((_,i)=>(
            <div key={i} className="skeleton-card">
              <div className="skeleton-thumb"/>
              <div className="skeleton-line lg"/>
              <div className="skeleton-line md"/>
              <div className="skeleton-line sm"/>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length===0 && initiated && (
        <div className="help">Ничего не найдено</div>
      )}

      {!loading && items.length>0 && (
        <div className="products-grid">
          {items.map(it=> (
            <div key={it.id} className="product">
              <div className="img"
                style={{aspectRatio:'1/1',borderRadius:'12px',overflow:'hidden',background:'#f3f4f6'}}>
                {it.image ?
                  <img src={it.image} style={{width:'100%',height:'100%',objectFit:'cover'}}/> :
                  '🛒'
                }
              </div>
              <div className="title">{it.title||it.name}</div>
              <div className="badge">Штрихкод: {it.barcode}</div>
              <div className="badge">Цена: {fmtMoney(it.selling_price ?? it.price)}</div>
              <div className="badge">Остаток: {totalBalance(it)} {it.unit_name}</div>
            </div>
          ))}
        </div>
      )}

      {items.length>0 && (
        <div style={{display:'flex',justifyContent:'space-between',marginTop:12}}>
          <div className="help">Стр. {page}</div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn"
              disabled={page<=1 || loading}
              onClick={()=>{
                scrollTop();
                setLoading(true);
                setPage(p=>Math.max(1,p-1));
              }}
            >← Назад</button>

            <button className="btn"
              disabled={!hasNext || loading}
              onClick={()=>{
                scrollTop();
                setLoading(true);
                setPage(p=>p+1);
              }}
            >Вперёд →</button>
          </div>
        </div>
      )}

    </div>
  );
}

function DebugPage(){
  const run = useCallback(async () => {
  try {
    const q1 = new URLSearchParams();
    q1.set('all','1');
    if (DEFAULT_STOCK_ID != null) q1.set('stock_id', String(DEFAULT_STOCK_ID));
    setCatRaw(await fetchJson(`/api/categories?${q1.toString()}`));
  } catch (e) {
    setCatRaw({ error: String(e?.message || e) });
  }

  try {
    const q2 = new URLSearchParams();
    if (DEFAULT_STOCK_ID != null) q2.set('stock_id', String(DEFAULT_STOCK_ID));
    q2.set('per_page','1');
    setItemsRaw(await fetchJson(`/api/items?${q2.toString()}`));
  } catch (e) {
    setItemsRaw({ error: String(e?.message || e) });
  }
}, []);

}

// ========================= APP =========================
export default function App(){
  useInjectStyles();
  const {route, go} = useHashRouter();

  return (
    <div className="min-h-screen">
      <div className="container">
        {/* top nav (no tab for products to keep it a dedicated page) */}
        <div className="tabs">
          <button className={`btn ${route.page==='categories'?'primary':''}`} onClick={()=>go('categories')}>Категории</button>
          <button className={`btn ${route.page==='search'?'primary':''}`} onClick={()=>go('search')}>Поиск</button>
          <button className={`btn ${route.page==='debug'?'primary':''}`} onClick={()=>go('debug')}>Debug</button>
        </div>

        {route.page==='categories' && <CategoriesPage go={go} />}
        {route.page==='search' && <SearchPage />}
        {route.page==='debug' && <DebugPage />}
        {route.page==='products' && <ProductsPage go={go} categoryId={route.params.id} />}
      </div>
    </div>
  );
}