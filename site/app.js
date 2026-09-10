const labels={buy:'買い',sell:'売り',hold:'静観',unavailable:'取得不可'};
const yen=n=>Number.isFinite(n)?n.toLocaleString('ja-JP',{maximumFractionDigits:1}):'—';
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let stocks=[],history=[];
let favorites=new Set();
try{const saved=JSON.parse(localStorage.getItem('auto-trade-favorites')||'[]');if(Array.isArray(saved))favorites=new Set(saved.filter(x=>typeof x==='string'));}catch(error){document.querySelector('#favorite-note').textContent='お気に入りの保存を利用できません。このページを開いている間のみ保持します。';}
function historyPanel(s){
 const rows=history.filter(r=>r.ticker===s.ticker).sort((a,b)=>b.date.localeCompare(a.date));
 return `<details class="stock-history"><summary>シグナル履歴（${rows.length}日分）</summary><p class="history-note">実際に取得した判定を最大90取引日分保存。未取得の日は含みません。履歴は当時のSMA設定による判定です。</p>${rows.length?`<div class="history-scroll"><table><caption>直近${rows.length}件の記録</caption><thead><tr><th scope="col">取引日</th><th scope="col">判定</th><th scope="col">終値</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.date)}</td><td><span class="badge ${escapeHtml(r.signal)}">${labels[r.signal]}</span></td><td>${yen(r.close)}円</td></tr>`).join('')}</tbody></table></div>`:'<p class="history-note">まだ記録がありません。次の取得成功後から表示します。</p>'}</details>`;
}
function render(){
 const query=document.querySelector('#search').value.trim().toLowerCase(),filter=document.querySelector('#filter').value;
 const sector=document.querySelector('#sector').value,budget=document.querySelector('#budget').value,onlyFavorites=document.querySelector('#favorites-only').checked;
 const visible=stocks.filter(s=>(filter==='all'||s.signal===filter)&&`${s.name} ${s.ticker}`.toLowerCase().includes(query)&&(sector==='all'||s.sector===sector)&&(budget==='all'||(Number.isFinite(s.close)&&s.close*100<=Number(budget)))&&(!onlyFavorites||favorites.has(s.ticker)));
 document.querySelector('#favorite-count').textContent=stocks.filter(s=>favorites.has(s.ticker)).length;
 document.querySelector('#count').textContent=`${visible.length} / ${stocks.length} 銘柄`;
 document.querySelector('#empty').hidden=visible.length>0;
 document.querySelector('#stocks').innerHTML=visible.map(s=>`<article class="card ${s.signal==='buy'?'signal-buy':s.signal==='sell'?'signal-sell':''}"><div class="card-head"><div><div class="ticker">${escapeHtml(s.ticker)}</div><h3>${escapeHtml(s.name)}</h3></div><span class="badge ${escapeHtml(s.signal)}">${labels[s.signal]||'取得不可'}</span></div><div class="stock-tools"><span>${escapeHtml(s.sector||'その他')}</span><button type="button" class="favorite" data-ticker="${escapeHtml(s.ticker)}" aria-pressed="${favorites.has(s.ticker)}" aria-label="${escapeHtml(s.name)}をお気に入り${favorites.has(s.ticker)?'から解除':'に登録'}">${favorites.has(s.ticker)?'★ 登録済み':'☆ お気に入り'}</button></div><div class="price">${yen(s.close)}<small>円</small></div><div class="date">${s.date?escapeHtml(s.date)+' 時点の終値':'今回の価格データを取得できませんでした'}</div><div class="averages"><div>短期 SMA ${s.pfast}日<b>${yen(s.fast)} 円</b></div><div>長期 SMA ${s.pslow}日<b>${yen(s.slow)} 円</b></div></div><details><summary>設定・100株の目安を見る</summary><p class="setting-note">${escapeHtml(s.setting_note||'既存設定')}</p><dl><dt>100株の概算額</dt><dd>${yen(s.close*100)} 円</dd><dt>損切り設定</dt><dd>−${Math.round(s.sl*100)}%</dd><dt>利確設定</dt><dd>+${Math.round(s.tp*100)}%</dd><dt>終値基準の損切り</dt><dd>${yen(s.close*(1-s.sl))} 円</dd><dt>終値基準の利確</dt><dd>${yen(s.close*(1+s.tp))} 円</dd></dl></details>${historyPanel(s)}<a class="finance-link" href="https://finance.yahoo.co.jp/quote/${encodeURIComponent(s.ticker)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(s.name)}のYahoo!ファイナンスを開く（別タブ）">Yahoo!ファイナンスで見る <span aria-hidden="true">↗</span></a></article>`).join('');
}
async function init(){try{
 const response=await fetch('./'+(document.body?.dataset.source||'data.json'),{cache:'no-store'});if(!response.ok)throw new Error('data unavailable');
 const data=await response.json();stocks=data.stocks;history=Array.isArray(data.history)?data.history:[];
 document.querySelector('#sector').innerHTML='<option value="all">すべての業種</option>'+[...new Set(stocks.map(s=>s.sector||'その他'))].sort().map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
 for(const key of ['buy','sell','hold'])document.getElementById(key).textContent=stocks.filter(s=>s.signal===key).length;
 document.querySelector('#total').textContent=stocks.length;
 document.querySelector('#updated').textContent=`${data.source==='saved_log'?'保存ログから復元':'判定更新'}：${data.source==='saved_log'?data.generated_at:new Date(data.generated_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})+'（日本時間）'}`;
 const old=stocks.filter(s=>s.date && Date.now()-Date.parse(s.date+'T00:00:00+09:00')>4*86400000).length;
 const missing=stocks.filter(s=>s.signal==='unavailable').length;
 if(old||missing||data.source==='saved_log'){
 const notice=document.querySelector('#notice');notice.hidden=false;
 notice.textContent=[data.source==='saved_log'?'保存済みの過去データを表示しています。':'',old?`${old}銘柄の価格データが4日以上前です。`:'',missing?`${missing}銘柄はデータ取得不可です。`:'','各銘柄の日付を確認してください。'].filter(Boolean).join(' ');
 }
 render();
}catch(error){document.querySelector('#updated').textContent='データ読み込み失敗';const notice=document.querySelector('#notice');notice.hidden=false;notice.textContent='データを読み込めませんでした。時間をおいてページを再読み込みしてください。';}}
document.querySelector('#stocks').addEventListener('click',event=>{
 const button=event.target.closest('button.favorite');if(!button)return;
 const ticker=button.dataset.ticker;
 if(favorites.has(ticker))favorites.delete(ticker);else favorites.add(ticker);
 try{localStorage.setItem('auto-trade-favorites',JSON.stringify([...favorites]));}catch(error){document.querySelector('#favorite-note').textContent='保存できませんでした。このページを開いている間のみ保持します。';}
 render();
 const replacement=[...document.querySelectorAll('button.favorite')].find(b=>b.dataset.ticker===ticker);
 if(replacement)replacement.focus();else document.querySelector('#favorites-only').focus();
});
for(const id of ['sector','budget','favorites-only'])document.getElementById(id).addEventListener('change',render);
document.querySelector('#search').addEventListener('input',render);document.querySelector('#filter').addEventListener('change',render);init();
