const labels={buy:'買い',sell:'売り',hold:'静観',unavailable:'取得不可'};
const yen=n=>Number.isFinite(n)?n.toLocaleString('ja-JP',{maximumFractionDigits:1}):'—';
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let stocks=[];
function render(){
 const query=document.querySelector('#search').value.trim().toLowerCase(),filter=document.querySelector('#filter').value;
 const visible=stocks.filter(s=>(filter==='all'||s.signal===filter)&&`${s.name} ${s.ticker}`.toLowerCase().includes(query));
 document.querySelector('#count').textContent=`${visible.length} / ${stocks.length} 銘柄`;
 document.querySelector('#empty').hidden=visible.length>0;
 document.querySelector('#stocks').innerHTML=visible.map(s=>`<article class="card"><div class="card-head"><div><div class="ticker">${escapeHtml(s.ticker)}</div><h3>${escapeHtml(s.name)}</h3></div><span class="badge ${escapeHtml(s.signal)}">${labels[s.signal]||'取得不可'}</span></div><div class="price">${yen(s.close)}<small>円</small></div><div class="date">${s.date?escapeHtml(s.date)+' 時点の終値':'今回の価格データを取得できませんでした'}</div><div class="averages"><div>短期 SMA ${s.pfast}日<b>${yen(s.fast)} 円</b></div><div>長期 SMA ${s.pslow}日<b>${yen(s.slow)} 円</b></div></div><details><summary>設定・100株の目安を見る</summary><dl><dt>100株の概算額</dt><dd>${yen(s.close*100)} 円</dd><dt>損切り設定</dt><dd>−${Math.round(s.sl*100)}%</dd><dt>利確設定</dt><dd>+${Math.round(s.tp*100)}%</dd><dt>終値基準の損切り</dt><dd>${yen(s.close*(1-s.sl))} 円</dd><dt>終値基準の利確</dt><dd>${yen(s.close*(1+s.tp))} 円</dd></dl></details><a class="finance-link" href="https://finance.yahoo.co.jp/quote/${encodeURIComponent(s.ticker)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(s.name)}のYahoo!ファイナンスを開く（別タブ）">Yahoo!ファイナンスで見る <span aria-hidden="true">↗</span></a></article>`).join('');
}
async function init(){try{
 const response=await fetch('./data.json',{cache:'no-store'});if(!response.ok)throw new Error('data unavailable');
 const data=await response.json();stocks=data.stocks;
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
document.querySelector('#search').addEventListener('input',render);document.querySelector('#filter').addEventListener('change',render);init();
