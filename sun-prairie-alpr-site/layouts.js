/* Layout switcher: Classic, Dashboard, Front page, Tab bar. Independent and unofficial. */
(function(){
'use strict';
var R=document.documentElement,S=window.SPA||{},mast=document.querySelector('.view[data-view="top"] .mast');
if(!mast)return;
var KEY='spalpr_layout';
function get(){try{return localStorage.getItem(KEY)||'classic'}catch(e){return 'classic'}}
function set(v){try{localStorage.setItem(KEY,v)}catch(e){}}
var HERO='<svg viewBox="0 0 240 110" role="img" aria-label="Illustration: a road, a pole with a camera and a blank plate frame. Not a real camera or plate."><rect width="240" height="110" fill="var(--h1)"/><rect y="78" width="240" height="32" fill="var(--h2)"/><path d="M0 94h240" stroke="var(--h3)" stroke-width="2" stroke-dasharray="14 10"/><rect x="38" y="14" width="5" height="68" fill="var(--h3)"/><rect x="30" y="12" width="26" height="12" rx="3" fill="var(--h4)"/><circle cx="36" cy="18" r="3" fill="var(--h1)"/><path d="M52 24 L130 78 L100 78Z" fill="var(--h4)" opacity=".2"/><rect x="128" y="62" width="62" height="28" rx="8" fill="var(--h3)"/><rect x="140" y="72" width="38" height="12" rx="2" fill="var(--h1)" stroke="var(--h4)"/><circle cx="140" cy="90" r="6" fill="var(--h2)"/><circle cx="180" cy="90" r="6" fill="var(--h2)"/></svg>';
var hero=document.createElement('div');hero.className='lhero';hero.innerHTML=HERO;mast.insertBefore(hero,mast.firstChild);
var lm=document.createElement('div');lm.className='lmast';
var d=new Date();lm.innerHTML='<span>THE PLATE READER REPORT</span><small>'+d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})+' · Independent and unofficial</small>';
mast.insertBefore(lm,mast.firstChild);
var LAY=[['classic','Classic'],['dashboard','Dashboard'],['front','Front page'],['tabbar','Tab bar']];
var ch=document.createElement('div');ch.className='laychoose';ch.setAttribute('role','group');ch.setAttribute('aria-label','Choose a layout');
ch.innerHTML='<span>Layout</span>'+LAY.map(function(l){return'<button type="button" data-l="'+l[0]+'" aria-pressed="false">'+l[1]+'</button>'}).join('');
mast.insertBefore(ch,mast.firstChild);
/* bottom tab bar */
var TB=[['top','Home','⌂'],['tools','Tools','🛠'],['archive','Docs','📄'],['act','Act','✉'],['more','More','⋯']];
var bt=document.createElement('nav');bt.className='btabs';bt.setAttribute('aria-label','Main');
bt.innerHTML=TB.map(function(t){return'<button type="button" data-t="'+t[0]+'"><i aria-hidden="true">'+t[2]+'</i><span>'+t[1]+'</span></button>'}).join('');
document.body.appendChild(bt);
function cur(){var v=document.querySelector('.view:not([hidden])');return v?v.getAttribute('data-view'):'top'}
function mark(){var c=cur();[].forEach.call(bt.querySelectorAll('button'),function(b){b.classList.toggle('on',b.dataset.t===c)})}
bt.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;e.stopPropagation();var t=b.dataset.t;if(t==='more'){var m=document.getElementById('morebtn');if(m)m.click();window.scrollTo({top:0});setTimeout(mark,60);return}location.hash=t;window.scrollTo({top:0});setTimeout(mark,60)});
window.addEventListener('hashchange',function(){setTimeout(mark,60)});
document.addEventListener('click',function(){setTimeout(mark,80)});
function apply(v){if(!LAY.some(function(l){return l[0]===v}))v='classic';R.setAttribute('data-layout',v);set(v);[].forEach.call(ch.querySelectorAll('button'),function(b){b.setAttribute('aria-pressed',b.dataset.l===v)});mark()}
ch.addEventListener('click',function(e){var b=e.target.closest('button[data-l]');if(b)apply(b.dataset.l)});
apply(get());
})();
