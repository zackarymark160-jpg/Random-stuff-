/* Site-wide reading, accessibility and navigation tools. Runs after the router. Settings stay in this browser only. */
(function(){
'use strict';
var S=window.SPA||{},esc=S.esc||function(s){return s},store=S.store;
var R=document.documentElement,$=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var cfg=store.get('cfg',{fs:1,ls:0,theme:'auto',dys:0,big:0,calm:0,focus:0,alt:0,cb:0});
function apply(){
  R.style.setProperty('--fsx',cfg.fs);R.style.setProperty('--lsx',cfg.ls);
  if(cfg.theme==='auto')R.removeAttribute('data-theme');else R.setAttribute('data-theme',cfg.theme);
  R.toggleAttribute('data-dys',!!cfg.dys);R.toggleAttribute('data-big',!!cfg.big);R.toggleAttribute('data-nomotion',!!cfg.calm);R.toggleAttribute('data-focus',!!cfg.focus);R.toggleAttribute('data-cb',!!cfg.cb);
  $$('.altshow').forEach(function(x){x.remove()});
  if(cfg.alt)$$('.view img[alt]').forEach(function(i){if(!i.alt)return;var s=document.createElement('span');s.className='altshow';s.textContent='Image description: '+i.alt;i.insertAdjacentElement('afterend',s)});
  store.set('cfg',cfg)}
apply();
/* hide the older footer controls (replaced by Reading tools) */
['#dtheme','#dfs'].forEach(function(s){var b=$(s);if(b)b.hidden=true});
/* ---------- Reading tools panel ---------- */
var btn=document.createElement('button');btn.type='button';btn.id='rtbtn';btn.className='rtbtn';btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Reading tools');btn.innerHTML='<span aria-hidden="true">Aa</span><b class="rtlbl" aria-hidden="true"> Reading tools</b>';document.body.appendChild(btn);
var pan=document.createElement('div');pan.id='rtpan';pan.className='rtpan';pan.setAttribute('role','dialog');pan.setAttribute('aria-label','Reading tools');pan.hidden=true;
pan.innerHTML='<div class="rth"><b>Reading tools</b><button type="button" class="x" id="rtx" aria-label="Close">×</button></div>'+
'<label>Text size <output id="o1"></output><input type="range" id="fs" min="0.85" max="1.6" step="0.05"></label>'+
'<label>Line spacing <output id="o2"></output><input type="range" id="ls" min="0" max="0.6" step="0.05"></label>'+
'<fieldset><legend>Theme</legend><div class="seg" id="th"><button type="button" data-t="auto">Auto</button><button type="button" data-t="light">Light</button><button type="button" data-t="dark">Dark</button><button type="button" data-t="sepia">Sepia</button></div></fieldset>'+
'<div class="tg"><label class="sw"><input type="checkbox" id="dys"> Dyslexia-friendly spacing</label><label class="sw"><input type="checkbox" id="big"> Large tap targets</label><label class="sw"><input type="checkbox" id="calm"> Reduce motion</label><label class="sw"><input type="checkbox" id="foc"> Focus mode (hide extras)</label><label class="sw"><input type="checkbox" id="cb"> Color-blind safe colors</label><label class="sw"><input type="checkbox" id="alt"> Show image descriptions</label><label class="sw"><input type="checkbox" id="cap"> Captions on videos (if available)</label></div>'+
'<div class="row"><button type="button" class="btn ghost" id="rst">Reset</button><button type="button" class="btn ghost" id="clr">Clear my saved data</button></div>'+
'<div class="row"><button type="button" class="btn ghost" id="off">Save for offline reading</button></div><p class="sub" id="offs" role="status"></p>'+
'<p class="sub">Settings are saved only in this browser. <button type="button" class="lnk" id="kbh">Keyboard shortcuts</button></p>';
document.body.appendChild(pan);
function sync(){$('#fs').value=cfg.fs;$('#o1').textContent=Math.round(cfg.fs*100)+'%';$('#ls').value=cfg.ls;$('#o2').textContent=cfg.ls?'+'+Math.round(cfg.ls*100)+'%':'normal';$$('#th button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.t===cfg.theme)});$('#dys').checked=!!cfg.dys;$('#big').checked=!!cfg.big;$('#calm').checked=!!cfg.calm;$('#foc').checked=!!cfg.focus;$('#cb').checked=!!cfg.cb;$('#alt').checked=!!cfg.alt;$('#cap').checked=!!cfg.cap}
function openP(o){pan.hidden=!o;btn.setAttribute('aria-expanded',o);if(o){sync();$('#fs').focus()}else btn.focus()}
btn.onclick=function(){openP(pan.hidden)};$('#rtx').onclick=function(){openP(false)};
pan.addEventListener('keydown',function(e){if(e.key==='Escape')openP(false)});
$('#fs').oninput=function(){cfg.fs=+this.value;apply();sync()};$('#ls').oninput=function(){cfg.ls=+this.value;apply();sync()};
$$('#th button').forEach(function(b){b.onclick=function(){cfg.theme=b.dataset.t;apply();sync()}});
[['dys','dys'],['big','big'],['calm','calm'],['foc','focus'],['cb','cb'],['alt','alt']].forEach(function(p){$('#'+p[0]).onchange=function(){cfg[p[1]]=this.checked?1:0;apply()}});
function caps(){$$('video').forEach(function(v){for(var i=0;i<v.textTracks.length;i++)v.textTracks[i].mode=cfg.cap?'showing':'hidden'})}
$('#cap').onchange=function(){cfg.cap=this.checked?1:0;apply();caps();var n=$$('video track').length;$('#offs').textContent=n?'Captions on.':'No videos on this site have caption files yet, so there is nothing to show. The text of each page is the transcript.'};
$('#rst').onclick=function(){cfg={fs:1,ls:0,theme:'auto',dys:0,big:0,calm:0,focus:0,alt:0,cb:0};apply();sync()};
$('#clr').onclick=function(){if(!this.dataset.sure){this.dataset.sure=1;this.textContent='Tap again to clear everything saved here';return}try{Object.keys(localStorage).filter(function(k){return k.indexOf('spalpr')===0}).forEach(function(k){localStorage.removeItem(k)})}catch(e){}location.reload()};
$('#off').onclick=function(){var s=$('#offs');if(!window.caches){s.textContent='This browser cannot save for offline use.';return}s.textContent='Saving…';var L=['./','index.html','features.css','features-views.js','features.js','search-index.json','changelog.json','site-facts.json','data/emails.json','data/tracker.json','data/f18.json','data/sections.json','data/answers.json','advocacy-summary.pdf','advocacy-overview.pdf','press-kit.pdf'];caches.open('spalpr-offline').then(function(c){return Promise.all(L.map(function(u){return c.add(u).then(function(){return 1},function(){return 0})}))}).then(function(r){var n=r.reduce(function(a,b){return a+b},0);s.textContent='Saved '+n+' of '+L.length+' files. The long archive PDF is saved after you open it once online.'})};
$('#kbh').onclick=function(){openP(false);help()};
/* ---------- Page bar: breadcrumbs, reading time, summary, tools ---------- */
var NAMES={top:'Home',updates:'Updates',news:'News',act:'Take action',learn:'Learn',next:'What happens next',easy:'Easy-read',report:'Report',compare:'Compare',cams:'Cameras',faq:'FAQ',quiz:'Quiz',archive:'Archive',sources:'Sources',contacts:'Contacts',tools:'Tools',teach:'Teach',data:'Data',trust:'Trust',join:'Join',search:'Search',es:'Español',play:'Practice & play',hub:'Trackers & numbers',emails:'Email cards',speak:'Speak up',method:'Methods & trust',kits:'Kits & printables',slides:'Slides',res:'Resources',socials:'Socials'};
(S.NAVEXTRA||[]).forEach(function(n){NAMES[n[0]]=n[1]});
var bar=document.createElement('div');bar.className='pagebar';bar.id='pagebar';bar.hidden=true;var wrap=$('.wrap');wrap.insertBefore(bar,wrap.firstChild);
var cur=null;
function curView(){return $('.view:not([hidden])')}
function words(v){return(v.textContent||'').trim().split(/\s+/).length}
function summ(v){var p=$('.lede,.lede2,.lead',v)||$('p',v);var t=p?p.textContent.trim():'';var m=t.match(/^(.{40,230}?[.!?])(\s|$)/);return m?m[1]:t.slice(0,220)}
var NEXT={updates:['news','hub'],news:['faq','learn'],act:['speak','contacts'],learn:['quiz','play'],next:['hub','speak'],easy:['learn','faq'],report:['hub','archive'],compare:['learn','hub'],cams:['hub','faq'],faq:['hub','speak'],quiz:['play','teach'],archive:['emails','hub'],sources:['method','archive'],contacts:['speak','act'],tools:['speak','kits'],teach:['kits','play'],data:['hub','method'],trust:['method','hub'],join:['speak','contacts'],search:['archive','faq'],play:['hub','speak'],hub:['emails','speak'],emails:['archive','hub'],speak:['hub','contacts'],method:['hub','kits'],kits:['speak','teach'],es:['easy','faq']};
function readNext(v,id){if($('.nextread',v)||!NEXT[id])return;var d=document.createElement('nav');d.className='nextread';d.setAttribute('aria-label','What to read next');d.innerHTML='<b>What to read next</b> '+NEXT[id].map(function(n){return'<a href="#'+n+'" data-go="'+n+'" class="btn ghost">'+esc(NAMES[n]||n)+'</a>'}).join(' ');v.appendChild(d)}
function anchors(v){if(v.dataset.anch)return;v.dataset.anch=1;$$('h2,h3',v).forEach(function(h,i){if($('.hanc',h)||h.closest('.panel')||h.closest('.vhead'))return;if(!h.id)h.id=v.dataset.view+'-s'+i;var b=document.createElement('button');b.type='button';b.className='hanc';b.setAttribute('aria-label','Copy link to this section');b.textContent='#';b.onclick=function(){var u=location.origin+location.pathname+'#'+h.id;try{navigator.clipboard.writeText(u);b.textContent='✓';setTimeout(function(){b.textContent='#'},1200)}catch(e){}};h.appendChild(b)})}
var VOC=[['ALPR','Automated license plate reader: a camera system that reads plates.'],['retention','How long stored data is kept before it is deleted.'],['hot list','A list of plates police are asked to watch for.'],['MOU','Memorandum of understanding: a written agreement.'],['287(g)','A federal program letting some local agencies work with immigration enforcement.'],['audit log','A record of who searched the data, when and why.'],['non-binding','Not a final contract or offer.'],['NCIC','The national crime database officers check.']];
function vocab(v,id){if(v.dataset.voc||['archive','play','hub','emails','speak','method','kits','search','top'].indexOf(id)>-1)return;v.dataset.voc=1;var seen={};var w=document.createTreeWalker(v,NodeFilter.SHOW_TEXT,{acceptNode:function(n){var p=n.parentNode;if(!p||p.closest('a,button,h1,h2,h3,h4,abbr,summary,script,style,textarea,pre,.vhead,#pagebar,.nextread,td,th'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT}}),n,list=[];while(n=w.nextNode())list.push(n);
 list.forEach(function(n){VOC.forEach(function(t){if(seen[t[0]])return;var i=n.nodeValue.indexOf(t[0]);if(i<0||(/\w/.test(n.nodeValue[i-1]||'')))return;if(t[0]==='retention'&&n.nodeValue.slice(i,i+9)!=='retention')return;seen[t[0]]=1;var r=document.createRange();r.setStart(n,i);r.setEnd(n,i+t[0].length);var a=document.createElement('abbr');a.className='vocab';a.tabIndex=0;a.setAttribute('data-def',t[1]);a.title=t[1];try{r.surroundContents(a);n=a.nextSibling||n}catch(e){}})})}
function marks(v,id){$$('mark.hl',v).forEach(function(m){m.replaceWith(document.createTextNode(m.textContent))});var H=store.get('hl',{})[id]||[];H.forEach(function(t){var w=document.createTreeWalker(v,NodeFilter.SHOW_TEXT),n;while(n=w.nextNode()){if(n.parentNode.closest('#pagebar,mark,textarea,button'))continue;var i=n.nodeValue.indexOf(t);if(i>-1){var r=document.createRange();r.setStart(n,i);r.setEnd(n,i+t.length);var m=document.createElement('mark');m.className='hl';try{r.surroundContents(m)}catch(e){}break}}})}
function pageBar(){var v=curView();if(!v)return;var id=v.dataset.view;cur=id;
  if(id==='top'){bar.hidden=true;return}
  var fav=store.get('fav',[]),rd=store.get('read',{});var min=Math.max(1,Math.round(words(v)/220));var ni=store.get('notes',{})[id]||'';
  bar.hidden=false;
  bar.innerHTML='<nav class="crumbs" aria-label="Breadcrumb"><a href="#top" data-go="top">Home</a> <span aria-hidden="true">›</span> <span aria-current="page">'+esc(NAMES[id]||id)+'</span></nav>'+
  '<div class="pbrow"><span class="rt">About '+min+' min read</span>'+
  '<button type="button" data-a="fav" aria-pressed="'+(fav.indexOf(id)>-1)+'">'+(fav.indexOf(id)>-1?'★ Saved':'☆ Save')+'</button>'+
  '<button type="button" data-a="read" aria-pressed="'+!!rd[id]+'">'+(rd[id]?'✓ Read':'Mark read')+'</button>'+
  '<button type="button" data-a="aloud">Read aloud</button>'+
  '<button type="button" data-a="share">Link &amp; QR</button>'+
  '<button type="button" data-a="notes">Notes'+(ni?' •':'')+'</button>'+
  '<button type="button" data-a="print">Print</button>'+
  '<a href="#easy" data-go="easy" class="pbl">Easy-read</a> <a href="#es" data-go="es" class="pbl" lang="es">Español</a></div>'+
  ($('.vhead',v)?'':'<p class="psum"><b>In short:</b> '+esc(summ(v))+'</p>')+'<div id="pbx"></div>';
  readNext(v,id);anchors(v);vocab(v,id);marks(v,id);
  if(id==='learn')learnPath(v)}
function learnPath(v){if($('.lpath',v))return;var rd=store.get('read',{}),steps=[['learn','Learn'],['easy','Easy-read'],['quiz','Quiz'],['play','Practice'],['speak','Speak up']];var d=document.createElement('div');d.className='lpath';d.innerHTML='<b>Your path</b> '+steps.map(function(s){return'<a href="#'+s[0]+'" data-go="'+s[0]+'"'+(rd[s[0]]?' class="done"':'')+'>'+(rd[s[0]]?'✓ ':'')+s[1]+'</a>'}).join(' → ')+'<span class="sub"> (tap "Mark read" on a page to check it off)</span>';v.insertBefore(d,v.firstChild)}
var utter=null;function stopSay(){try{speechSynthesis.cancel()}catch(e){}$$('.speaking').forEach(function(x){x.classList.remove('speaking')});utter=null}
function say(){var v=curView();if(!window.speechSynthesis){$('#pbx').innerHTML='<p class="sub">This browser has no read-aloud voice.</p>';return}if(utter){stopSay();return}var ps=$$('h2,h3,p,li',v).filter(function(e){return e.offsetParent&&!e.closest('#pagebar,.nextread,nav,button')&&e.textContent.trim().length>20}).slice(0,120),i=0;utter=1;function nx(){if(!utter||i>=ps.length){stopSay();return}var e=ps[i++];$$('.speaking').forEach(function(x){x.classList.remove('speaking')});e.classList.add('speaking');e.scrollIntoView({block:'center',behavior:cfg.calm?'auto':'smooth'});var u=new SpeechSynthesisUtterance(e.textContent.replace(/#$/,''));u.rate=1;u.onend=nx;u.onerror=stopSay;speechSynthesis.speak(u)}nx()}
function notes(id){var N=store.get('notes',{});$('#pbx').innerHTML='<div class="card"><label>My notes for this page (saved only in this browser)<textarea rows="4" id="nt">'+esc(N[id]||'')+'</textarea></label><div class="row"><button class="btn ghost" type="button" id="nd">Download notes</button><button class="btn ghost" type="button" id="nc">Clear highlights on this page</button></div></div>';$('#nt').oninput=function(){var n=store.get('notes',{});n[id]=this.value;store.set('notes',n)};$('#nd').onclick=function(){S.dl('notes-'+id+'.txt',($('#nt').value||'')+'\n\nHighlights:\n'+(store.get('hl',{})[id]||[]).join('\n'))};$('#nc').onclick=function(){var h=store.get('hl',{});delete h[id];store.set('hl',h);marks(curView(),id)}}
function share(id){var u=location.origin+location.pathname+'#'+id;$('#pbx').innerHTML='<div class="card sharebox"><img src="qr/'+(NAMES[id]&&$('qr')?'':'')+id+'.svg" alt="QR code linking to this page" width="140" height="140" onerror="this.replaceWith(document.createTextNode(\'(QR code not available for this page)\'))"><div><p class="sub">Link to this page</p><input readonly value="'+esc(u)+'" aria-label="Page link" onclick="this.select()"><button class="btn ghost" type="button" id="cl">Copy link</button></div></div>';$('#cl').onclick=function(){try{navigator.clipboard.writeText(u);this.textContent='Copied'}catch(e){$('.sharebox input').select()}}}
bar.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b)return;var a=b.dataset.a,id=cur;
  if(a==='fav'){var f=store.get('fav',[]),i=f.indexOf(id);if(i>-1)f.splice(i,1);else f.push(id);store.set('fav',f);pageBar()}
  else if(a==='read'){var r=store.get('read',{});r[id]=!r[id];store.set('read',r);pageBar()}
  else if(a==='aloud')say();else if(a==='print')window.print();else if(a==='notes')notes(id);else if(a==='share')share(id)});
/* highlighter */
var hb=document.createElement('button');hb.type='button';hb.className='hlbtn';hb.textContent='Highlight';hb.hidden=true;document.body.appendChild(hb);var selText='';
document.addEventListener('selectionchange',function(){var s=getSelection();if(!s||s.isCollapsed||!s.rangeCount){hb.hidden=true;return}var t=s.toString().trim();var v=curView();if(t.length<4||t.length>200||!v||!v.contains(s.anchorNode)||s.anchorNode.parentNode.closest('#pagebar,textarea,input')){hb.hidden=true;return}selText=t;var r=s.getRangeAt(0).getBoundingClientRect();hb.style.top=(window.scrollY+r.top-38)+'px';hb.style.left=Math.max(8,Math.min(window.scrollX+r.left,document.documentElement.clientWidth-100))+'px';hb.hidden=false});
hb.onmousedown=function(e){e.preventDefault()};hb.onclick=function(){var H=store.get('hl',{});(H[cur]=H[cur]||[]).push(selText);store.set('hl',H);hb.hidden=true;getSelection().removeAllRanges();marks(curView(),cur)};
/* ---------- progress bar, back to top ---------- */
var pr=document.createElement('div');pr.className='progress';pr.setAttribute('aria-hidden','true');pr.innerHTML='<i></i>';document.body.appendChild(pr);
var tp=document.createElement('button');tp.type='button';tp.className='totop';tp.setAttribute('aria-label','Back to top');tp.textContent='↑';tp.hidden=true;document.body.appendChild(tp);tp.onclick=function(){window.scrollTo({top:0,behavior:cfg.calm?'auto':'smooth'})};
var tick=0;window.addEventListener('scroll',function(){if(tick)return;tick=requestAnimationFrame(function(){tick=0;var h=document.documentElement,m=h.scrollHeight-h.clientHeight;pr.firstChild.style.width=(m>0?h.scrollTop/m*100:0)+'%';tp.hidden=h.scrollTop<700})},{passive:true});
/* ---------- home: single main button, daily fact, changes since last visit ---------- */
function home(){var top=$('.view[data-view="top"]'),c=$('.ctas',top);if(!c||$('.startbtn',top))return;
  var par=c.parentNode,sb=document.createElement('button');sb.type='button';sb.className='btn primary startbtn';sb.textContent='Start here: find the right page for you';sb.onclick=wizard;par.insertBefore(sb,c);
  var d=document.createElement('details');d.className='morectas';d.innerHTML='<summary>More ways in</summary>';par.insertBefore(d,c);d.appendChild(c);
  var day=Math.floor(Date.now()/864e5),f=(S.FACTS||[])[day%(S.FACTS||[1]).length];if(f){var df=document.createElement('p');df.className='dailyfact';df.innerHTML='<b>Fact of the day</b> '+esc(f);par.insertBefore(df,sb)}
  var lv=store.get('lastview');if(lv&&NAMES[lv]&&lv!=='top'){var rb=document.createElement('p');rb.className='dailyfact';rb.innerHTML='Pick up where you left off: <a href="#'+lv+'" data-go="'+lv+'">'+esc(NAMES[lv])+'</a>';par.insertBefore(rb,sb)}
  var last=store.get('lastvisit');fetch('changelog.json').then(function(r){return r.json()}).then(function(c2){var n=c2.changes.filter(function(x){var d=new Date(String(x.date).replace(/\./g,'').replace(/(\w+) (\d+), (\d+)/,'$1 $2 $3'));return last&&d.getTime()>last}).length;if(n){var p=document.createElement('p');p.className='dailyfact';p.innerHTML='<b>'+n+' change'+(n>1?'s':'')+' since your last visit.</b> <a href="#hub" data-go="hub">See what changed</a>';par.insertBefore(p,sb)}store.set('lastvisit',Date.now())}).catch(function(){store.set('lastvisit',Date.now())})}
/* ---------- start-here wizard ---------- */
var dlg=document.createElement('div');dlg.className='wiz';dlg.hidden=true;dlg.setAttribute('role','dialog');dlg.setAttribute('aria-modal','true');dlg.setAttribute('aria-label','Start here');document.body.appendChild(dlg);
var WZ=[['I am new to this','I want the basics in plain words.',['easy','faq','learn']],['I am a student or teacher','I want something I can use in class.',['teach','play','quiz']],['I want to take part','I want to ask questions or speak up.',['speak','hub','act']],['I am a reporter or researcher','I want sources and documents.',['sources','hub','archive']],['I want to read the numbers','Costs, dates, promises.',['hub','compare','emails']]];
function wizard(){dlg.hidden=false;dlg.innerHTML='<div class="wbox"><h2>Who are you?</h2><p class="sub">Pick one. You can change your mind.</p>'+WZ.map(function(w,i){return'<button type="button" class="opt" data-i="'+i+'"><b>'+esc(w[0])+'</b><span>'+esc(w[1])+'</span></button>'}).join('')+'<button type="button" class="btn ghost" id="wc">Close</button></div>';$('#wc',dlg).onclick=function(){dlg.hidden=true};$$('.opt',dlg).forEach(function(b){b.onclick=function(){var w=WZ[+b.dataset.i];$('.wbox',dlg).innerHTML='<h2>'+esc(w[0])+'</h2><p class="sub">Try these, in this order:</p>'+w[2].map(function(n,i){return'<a class="btn '+(i?'ghost':'primary')+'" href="#'+n+'" data-go="'+n+'">'+(i+1)+'. '+esc(NAMES[n]||n)+'</a>'}).join(' ')+'<p><button type="button" class="btn ghost" id="wc2">Close</button></p>';$('#wc2',dlg).onclick=function(){dlg.hidden=true};$$('a',dlg).forEach(function(a){a.addEventListener('click',function(){dlg.hidden=true})})}});$('.opt',dlg).focus()}
dlg.addEventListener('keydown',function(e){if(e.key==='Escape')dlg.hidden=true});
/* ---------- keyboard shortcuts ---------- */
function help(){dlg.hidden=false;dlg.innerHTML='<div class="wbox"><h2>Keyboard shortcuts</h2><table class="kbt"><tr><td><kbd>g</kbd> then <kbd>h</kbd></td><td>Home</td></tr><tr><td><kbd>g</kbd> then <kbd>l</kbd></td><td>Learn</td></tr><tr><td><kbd>g</kbd> then <kbd>t</kbd></td><td>Trackers</td></tr><tr><td><kbd>g</kbd> then <kbd>s</kbd></td><td>Speak up</td></tr><tr><td><kbd>/</kbd></td><td>Search</td></tr><tr><td><kbd>r</kbd></td><td>Read this page aloud (press again to stop)</td></tr><tr><td><kbd>f</kbd></td><td>Focus mode on or off</td></tr><tr><td><kbd>?</kbd></td><td>This help</td></tr><tr><td><kbd>Esc</kbd></td><td>Close panels</td></tr></table><button type="button" class="btn ghost" id="wc3">Close</button></div>';$('#wc3',dlg).onclick=function(){dlg.hidden=true};$('#wc3',dlg).focus()}
var gk=0;document.addEventListener('keydown',function(e){if(e.ctrlKey||e.metaKey||e.altKey)return;var t=e.target;if(t.matches&&t.matches('input,textarea,select,[contenteditable]'))return;var k=e.key;
  if(gk&&Date.now()-gk<1200){var m={h:'top',l:'learn',t:'hub',s:'speak',a:'act',p:'play'}[k];gk=0;if(m){e.preventDefault();var b=document.createElement('a');b.dataset.go=m;b.href='#'+m;document.body.appendChild(b);b.click();b.remove()}return}
  if(k==='g'){gk=Date.now();return}if(k==='/'){e.preventDefault();location.hash='search';setTimeout(function(){var i=$('.view:not([hidden]) input[type=search],.view:not([hidden]) input[type=text]');if(i)i.focus()},120)}
  else if(k==='?'){help()}else if(k==='r'){if(cur&&cur!=='top')say()}else if(k==='f'){cfg.focus=cfg.focus?0:1;apply()}else if(k==='Escape'){stopSay();dlg.hidden=true;openP(false)}});
/* ---------- footer sitemap ---------- */
function sitemap(){var f=$('footer.fine');if(!f||$('.sitemap',f))return;var groups={};$$('.morepanel .mg').forEach(function(g){var h=$('h3',g);groups[h?h.textContent:'More']=$$('[data-go]',g).map(function(b){return[b.dataset.go,b.textContent.trim()]})});var d=document.createElement('details');d.className='sitemap';d.innerHTML='<summary>Site map</summary>'+Object.keys(groups).map(function(g){return'<div><b>'+esc(g)+'</b>'+groups[g].map(function(l){return'<a href="#'+l[0]+'" data-go="'+l[0]+'">'+esc(l[1])+'</a>'}).join('')+'</div>'}).join('');f.insertBefore(d,f.firstChild)}
/* ---------- recent & favorites list in the More panel ---------- */
function mine(){var mp=$('.morepanel');if(!mp)return;var old=$('.mg.mine',mp);if(old)old.remove();var fav=store.get('fav',[]),rec=store.get('recent',[]);if(!fav.length&&!rec.length)return;var g=document.createElement('div');g.className='mg mine';g.innerHTML=(fav.length?'<h3>Saved pages</h3>'+fav.map(function(i){return'<button type="button" data-go="'+i+'">'+esc(NAMES[i]||i)+'</button>'}).join(''):'')+(rec.length?'<h3>Recently viewed</h3>'+rec.slice(0,5).map(function(i){return'<button type="button" data-go="'+i+'">'+esc(NAMES[i]||i)+'</button>'}).join(''):'');mp.insertBefore(g,mp.firstChild)}
/* ---------- on every view change ---------- */
function onView(){var v=curView();if(!v)return;var id=v.dataset.view;stopSay();
  if(id!==cur||!bar.innerHTML){pageBar()}else pageBar();
  var rc=store.get('recent',[]).filter(function(x){return x!==id});if(id!=='top')rc.unshift(id);store.set('recent',rc.slice(0,8));store.set('lastview',id);mine();
  var ti=$('.tabin');if(ti)store.set('tabscroll',ti.scrollLeft)}
var mo=new MutationObserver(function(ms){if(ms.some(function(m){return m.target.classList&&m.target.classList.contains('view')}))onView()});
$$('.view').forEach(function(v){mo.observe(v,{attributes:true,attributeFilter:['hidden']})});
home();sitemap();mine();onView();
var ti=$('.tabin');if(ti){var sl=store.get('tabscroll',0);if(sl)ti.scrollLeft=sl}
if(cfg.cap)caps();
})();

/* a11y: let keyboard users scroll wide tables */
(function(){function t(){document.querySelectorAll('.tbl').forEach(function(d){if(d.scrollWidth>d.clientWidth+1){if(!d.hasAttribute('tabindex')){d.tabIndex=0;d.setAttribute('role','region');var c=d.querySelector('caption,th');d.setAttribute('aria-label',c?'Table: '+c.textContent.trim().slice(0,60):'Table')}}})}
if(document.readyState!=='loading')t();else document.addEventListener('DOMContentLoaded',t);window.addEventListener('hashchange',function(){setTimeout(t,150)});window.addEventListener('resize',t)})();
