"use strict";
// Love letter & diary
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const PASSCODE = "0531";
const unlock = $('#lock-screen');
const form = $('#unlock-form');
const password = $('#passcode');
const unlockError = $('#lock-error');
function showPage() {
  unlock.classList.add('dismissed');
  unlock.setAttribute('aria-hidden','true');
  document.body.classList.remove('locked');
  window.dispatchEvent(new Event('xy:unlocked'));
  try { localStorage.setItem('xy-letter-opened','yes'); } catch (e) {}
}
try { if (localStorage.getItem('xy-letter-opened')==='yes') showPage(); } catch(e) {}
form.addEventListener('submit', (e)=>{
  e.preventDefault();
  if (password.value.trim()===PASSCODE) showPage();
  else { unlockError.textContent='不是这一天哦，再想想我们在一起的日期。'; password.select(); }
});
// Time since May 31, 2026 (inclusive calendar days), device-local date.
function updateDayCount() {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  const start = Date.UTC(2026,4,31);
  $('#days-count').textContent = Math.max(0,Math.floor((today-start)/86400000)+1).toLocaleString('zh-CN');
}
updateDayCount();
// Cover (optional photos/cover.jpg)
const cover = $('#cover-image');
cover.addEventListener('load', ()=>$('#cover-frame').classList.add('has-photo'));
cover.addEventListener('error', ()=>{ cover.removeAttribute('src'); });
if (cover.complete && cover.naturalWidth > 0) $('#cover-frame').classList.add('has-photo');
// Photo gallery; image files must be added to the GitHub repository by the site owner.
const items = Array.isArray(window.XY_GALLERY) ? window.XY_GALLERY.filter(p=>p && typeof p.file==='string') : [];
let activeCategory='all', showing=[], selected=-1;
const grid=$('#gallery-grid'), modal=$('#photo-modal'), modalImg=$('#modal-photo'), modalDetails=$('#modal-details');
const gradients=[
  'linear-gradient(145deg,#e8d2cc,#f6ede2)', 'linear-gradient(145deg,#e5e2d5,#f4ebdf)',
  'linear-gradient(145deg,#e4d4db,#f5e5df)', 'linear-gradient(145deg,#ddded1,#eee2d9)'];
const nodes=[];
items.forEach((photo,index)=>{
  const card=document.createElement('article'); card.className='photo-card';card.dataset.category=photo.category;
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','查看照片：'+(photo.title||'回忆'));
  const surface=document.createElement('div');surface.className='photo-surface';surface.style.setProperty('--surface',gradients[index%gradients.length]);
  const image=document.createElement('img');image.loading='eager';image.alt=photo.title||'我们的照片';image.decoding='async';
  const placeholder=document.createElement('div');placeholder.className='photo-placeholder';
  const symbol=document.createElement('span');symbol.className='symbol';symbol.textContent=(photo.category==='heartbeat'?'♡':'✳');
  const small=document.createElement('small');small.textContent='A LITTLE MEMORY';placeholder.append(symbol,small);surface.append(image,placeholder);
  const caption=document.createElement('div');caption.className='photo-caption';
  const title=document.createElement('h3');title.textContent=photo.title||'记得这一天';
  const subtitle=document.createElement('p');subtitle.textContent=(photo.date||'')+(photo.caption?' · '+photo.caption:'');caption.append(title,subtitle);
  button.append(surface,caption);card.append(button);grid.append(card);
  const meta={card,photo,ready:false,button};nodes.push(meta);
  // Use a real image when file exists, otherwise a scrapbook placeholder.
  image.addEventListener('load',()=>{meta.ready=true;card.classList.add('loaded');updateCount();});
  image.addEventListener('error',()=>{meta.ready=false;card.classList.remove('loaded');updateCount();});
  image.src=photo.file;
  if (image.complete && image.naturalWidth>0) {meta.ready=true;card.classList.add('loaded');}
  button.addEventListener('click',()=>{ if(meta.ready) openPhoto(meta); });
});
function visibleNodes(){return nodes.filter(n=> activeCategory==='all'||n.photo.category===activeCategory);}
function updateCount(){
  const filtered=visibleNodes(); const ready=filtered.filter(n=>n.ready).length;
  $('#album-count').textContent=`${ready} 张照片 · ${filtered.length} 个回忆位置`;
}
function filterGallery(category){
  activeCategory=category;
  for (const n of nodes) n.card.classList.toggle('hidden',category!=='all'&&n.photo.category!==category);
  $$('.album-tabs .tab').forEach(b=>{const on=b.dataset.filter===category;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  updateCount();
}
$$('.album-tabs .tab').forEach(b=>b.addEventListener('click',()=>filterGallery(b.dataset.filter)));
updateCount();
function openPhoto(meta){
  showing=visibleNodes().filter(n=>n.ready);
  selected=showing.indexOf(meta);if(selected<0)return;
  renderPhoto(); modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');$('#modal-close').focus();
}
function renderPhoto(){
  if(selected<0||!showing[selected])return;
  const p=showing[selected].photo;
  modalImg.src=p.file;modalImg.alt=p.title||'我们的照片';
  modalDetails.replaceChildren();
  const strong=document.createElement('b');strong.textContent=p.title||'我们的照片';
  const span=document.createElement('span');span.textContent=[p.date,p.caption].filter(Boolean).join(' · ');
  modalDetails.append(strong,span);
}
function advance(delta){if(showing.length){selected=(selected+delta+showing.length)%showing.length;renderPhoto();}}
function closePhoto(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');if(showing[selected])showing[selected].button.focus();}
$('#modal-close').addEventListener('click',closePhoto);
$('#modal-prev').addEventListener('click',()=>advance(-1));
$('#modal-next').addEventListener('click',()=>advance(1));
modal.addEventListener('click',e=>{if(e.target===modal)closePhoto();});
document.addEventListener('keydown',e=>{if(!modal.classList.contains('open'))return;if(e.key==='Escape')closePhoto();if(e.key==='ArrowLeft')advance(-1);if(e.key==='ArrowRight')advance(1);});
let startX=null;
modal.addEventListener('touchstart',e=>{startX=e.touches[0]?.clientX??null;},{passive:true});
modal.addEventListener('touchend',e=>{if(startX==null)return;const delta=(e.changedTouches[0]?.clientX??startX)-startX;if(Math.abs(delta)>48)advance(delta<0?1:-1);startX=null;},{passive:true});
// Diary filters and search
const diaryEntries=$$('.diary-entry');let currentMonth='all';
function filterDiary(){
  const query=$('#diary-search').value.trim().toLocaleLowerCase();let visible=0;
  diaryEntries.forEach(entry=>{const show=(currentMonth==='all'||entry.dataset.month===currentMonth)&&(!query||entry.dataset.text.toLocaleLowerCase().includes(query));entry.classList.toggle('hidden',!show);if(show)visible++;});
  $('#diary-empty').classList.toggle('hidden',visible!==0);
  $('#expand-all').textContent='展开全部';
}
$$('.month-tabs .tab').forEach(b=>b.addEventListener('click',()=>{
  currentMonth=b.dataset.month;
  $$('.month-tabs .tab').forEach(btn=>{let is=btn===b;btn.classList.toggle('active',is);btn.setAttribute('aria-pressed',String(is));});
  filterDiary();
}));
$('#diary-search').addEventListener('input',filterDiary);
$('#expand-all').addEventListener('click',()=>{
  const visible=diaryEntries.filter(e=>!e.classList.contains('hidden'));
  const shouldOpen=visible.some(e=>!e.open);
  visible.forEach(e=>e.open=shouldOpen);
  $('#expand-all').textContent=shouldOpen?'收起全部':'展开全部';
});
// Reveal animation, with fallback when observer unsupported
if ('IntersectionObserver' in window) {
  const observer=new IntersectionObserver((ents,obs)=>{ents.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}});},{threshold:.08});
  $$('.fade-up').forEach(e=>observer.observe(e));
} else $$('.fade-up').forEach(e=>e.classList.add('visible'));
// Cache static site and visited photos for best-effort offline access.
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
