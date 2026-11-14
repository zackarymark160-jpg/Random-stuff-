/* Sun Prairie ALPR v3 helpers. Independent, unofficial. Loaded after features-views.js, before the router. */
(function(){
'use strict';
var S=window.SPA; if(!S||!S.mkView) return;
var esc=S.esc,store=S.store,dl=S.dl;
var IND='Independent and unofficial. Not affiliated with the City of Sun Prairie or the Sun Prairie Police Department.';
var V3={esc:esc,IND:IND,store:store,nav:[]};
window.V3=V3;
function q(h,s){return h.querySelector(s)}
function qa(h,s){return [].slice.call(h.querySelectorAll(s))}
V3.q=q;V3.qa=qa;
V3.copy=function(btn,fn){
  btn.onclick=function(){
    var t=fn(),o=btn.getAttribute('data-l')||btn.textContent;btn.setAttribute('data-l',o);
    function ok(){btn.textContent='Copied';setTimeout(function(){btn.textContent=o},1400)}
    function fb(){var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok()}catch(e){btn.textContent='Select the text and copy it'}document.body.removeChild(ta)}
    try{navigator.clipboard.writeText(t).then(ok,fb)}catch(e){fb()}
  };
};
V3.tbl=function(head,rows){return '<div class="tw"><table><thead><tr>'+head.map(function(x){return'<th scope="col">'+esc(x)+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return'<tr>'+r.map(function(c){return'<td>'+c+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>'};
/* generic text builder: fields [id,label,kind,placeholder,options] */
V3.builder=function(o){
  var f=o.fields;
  var html=(o.sub?'<p class="sub">'+o.sub+'</p>':'')+'<div class="grid2">'+f.map(function(x){
    var id='b_'+x[0],k=x[2]||'text',ph=esc(x[3]||'');
    if(k==='area')return'<label class="full">'+esc(x[1])+'<textarea id="'+id+'" rows="3" placeholder="'+ph+'"></textarea></label>';
    if(k==='select')return'<label>'+esc(x[1])+'<select id="'+id+'">'+x[4].map(function(v){return'<option>'+esc(v)+'</option>'}).join('')+'</select></label>';
    return'<label>'+esc(x[1])+'<input id="'+id+'" placeholder="'+ph+'"></label>'}).join('')+'</div><pre class="out" id="bo" aria-live="polite"></pre><button class="btn ghost" id="bc" type="button">Copy</button> <button class="btn ghost" id="bd" type="button">Download .txt</button>'+(o.after||'');
  return {html:html,init:function(h){
    function vals(){var v={};f.forEach(function(x){var e=q(h,'#b_'+x[0]);v[x[0]]=(e.value||'').trim()});return v}
    function t(){return o.make(vals())}
    function u(){q(h,'#bo').textContent=t()}
    qa(h,'input,textarea,select').forEach(function(i){i.oninput=u;i.onchange=u});
    u();V3.copy(q(h,'#bc'),t);q(h,'#bd').onclick=function(){dl(o.file||'sp-alpr-draft.txt',t())};
    if(o.init)o.init(h,vals,u)}};
};
/* local checklist */
V3.check=function(key,intro,items){
  return {html:(intro?'<p class="sub">'+intro+'</p>':'')+'<div class="meter" aria-hidden="true"><span id="cm"></span></div><p class="sub" id="cp" role="status"></p><div id="cl"></div><button class="btn ghost" id="cr" type="button">Start over</button> <button class="btn ghost" id="cc" type="button">Copy as text</button>',init:function(h){
    var st=store.get('chk_'+key,{});
    function draw(){q(h,'#cl').innerHTML=items.map(function(t,i){return'<label class="cb"><input type="checkbox" data-i="'+i+'"'+(st[i]?' checked':'')+'> '+t+'</label>'}).join('');qa(h,'[data-i]').forEach(function(c){c.onchange=function(){st[c.dataset.i]=c.checked?1:0;store.set('chk_'+key,st);prog()}});prog()}
    function prog(){var n=items.filter(function(_,i){return st[i]}).length;q(h,'#cp').textContent=n+' of '+items.length+' done. Saved only in this browser.';q(h,'#cm').style.width=(100*n/items.length)+'%'}
    q(h,'#cr').onclick=function(){st={};store.set('chk_'+key,st);draw()};
    V3.copy(q(h,'#cc'),function(){return items.map(function(t,i){return(st[i]?'[x] ':'[ ] ')+t.replace(/<[^>]+>/g,'')}).join('\n')});
    draw()}};
};
/* list of cards with copy: items [title,text] */
V3.cards=function(intro,items){
  return {html:(intro?'<p class="sub">'+intro+'</p>':'')+items.map(function(x,i){return'<div class="ecard"><b>'+esc(x[0])+'</b><p>'+esc(x[1]).replace(/\n/g,'<br>')+'</p><button class="btn ghost" data-c="'+i+'" type="button">Copy</button></div>'}).join(''),init:function(h){qa(h,'[data-c]').forEach(function(b){V3.copy(b,function(){return items[+b.dataset.c][1]})})}};
};
/* views with panels */
V3.view=function(id,title,lede,list,group,def){
  var v=S.mkView(id,title,lede,'',group||'Workshop');
  S.panels(v,list,def||list[0][0]);
  V3.nav.push([id,title,group||'Workshop']);
  return v;
};
V3.mountNav=function(){
  var mp=document.querySelector('.morepanel'); if(!mp||!V3.nav.length) return;
  var by={};V3.nav.forEach(function(n){(by[n[2]]=by[n[2]]||[]).push(n)});
  Object.keys(by).forEach(function(k){var g=document.createElement('div');g.className='mg';g.innerHTML='<h3>'+esc(k)+'</h3>'+by[k].map(function(n){return'<button type="button" role="tab" data-go="'+n[0]+'" data-tab="'+n[0]+'">'+esc(n[1])+'</button>'}).join('');mp.appendChild(g)});
};
V3.load=S.load;
})();
