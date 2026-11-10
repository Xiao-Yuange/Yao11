"use strict";
/* Birthday surprise (local 11/11) and background music. */
(()=>{
  const $=(s)=>document.querySelector(s);
  const overlay=$('#birthday-overlay');
  const ribbon=$('#birthday-ribbon');
  const preview=new URLSearchParams(location.search).get('preview')==='birthday';
  const isBirthday=()=>{
    const now=new Date();
    return preview||(now.getMonth()===10&&now.getDate()===11);
  };
  let birthdayActive=false;
  let birthdayWished=false;
  let lastTriggerYear='';
  const reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const confetti=$('#birthday-confetti');
  function burstConfetti(){
    if(reducedMotion)return;
    confetti.replaceChildren();
    const colors=['#d79fbe','#e9b49d','#d6c38c','#a6bcb0','#fff1e3','#c67692'];
    for(let i=0;i<40;i++){
      const bit=document.createElement('span');
      bit.style.setProperty('--confetti-color',colors[i%colors.length]);
      bit.style.setProperty('--confetti-left',`${(i*37.29)%100}%`);
      bit.style.setProperty('--confetti-time',`${3+(i%7)*.35}s`);
      bit.style.setProperty('--confetti-delay',`${(i%8)*.08}s`);
      bit.style.setProperty('--confetti-drift',`${-100+(i*53%205)}px`);
      bit.style.setProperty('--confetti-turn',`${180+i*37}deg`);
      confetti.append(bit);
    }
  }
  let previousFocus=null;
  function openBirthday(){
    if(!birthdayActive||!$('#lock-screen').classList.contains('dismissed'))return;
    previousFocus=document.activeElement;
    overlay.hidden=false;
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('birthday-modal-open');
    $('#birthday-close').focus();
    burstConfetti();
  }
  function closeBirthday(){
    overlay.hidden=true;
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('birthday-modal-open');
    confetti.replaceChildren();
    if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
  }
  function showBirthdayIfUnlocked(){
    const key=preview?'xy-birthday-preview-session':`xy-birthday-seen-${new Date().getFullYear()}`;
    if(!birthdayActive||!$('#lock-screen').classList.contains('dismissed'))return;
    let seen=false;
    try{seen=sessionStorage.getItem(key)==='yes'}catch(e){}
    if(!seen){
      // Do not accidentally hide the one-time surprise when tab storage is unavailable.
      try{sessionStorage.setItem(key,'yes')}catch(e){}
      openBirthday();
    }
  }
  function checkBirthday(){
    const nowOn=isBirthday();
    const changed=nowOn!==birthdayActive;
    birthdayActive=nowOn;
    document.body.classList.toggle('is-birthday',nowOn);
    ribbon.hidden=!nowOn;
    if(!nowOn&&!overlay.hidden)closeBirthday();
    if(changed&&nowOn)showBirthdayIfUnlocked();
    if(changed){buildSongs(true);}
  }
  $('#birthday-reopen').addEventListener('click',openBirthday);
  $('#birthday-close').addEventListener('click',closeBirthday);
  $('#birthday-continue').addEventListener('click',closeBirthday);
  overlay.addEventListener('click',(event)=>{if(event.target===overlay)closeBirthday();});
  document.addEventListener('keydown',(event)=>{
    if(event.key==='Escape'&&!overlay.hidden)closeBirthday();
  });
  $('#birthday-blow').addEventListener('click',()=>{
    if(birthdayWished)return;
    birthdayWished=true;
    $('#cake-illustration').classList.add('blown');
    $('#birthday-wish-result').textContent='许的愿望，会一点一点变成真的。';
    $('#birthday-blow').disabled=true;
    $('#birthday-blow').textContent='愿望已经收好啦 ♡';
    burstConfetti();
  });
  $('#birthday-read').addEventListener('click',()=>{
    const target=$('#birthday-letter');
    target.hidden=!target.hidden;
    $('#birthday-read').setAttribute('aria-expanded',String(!target.hidden));
    $('#birthday-read').textContent=target.hidden?'拆开我写给你的生日信 ↗':'把生日信轻轻合起来 ↑';
    if(!target.hidden)target.scrollIntoView({block:'nearest',behavior:reducedMotion?'auto':'smooth'});
  });
  window.addEventListener('xy:unlocked',()=>{showBirthdayIfUnlocked();});

  // Music: track list can be edited in music-data.js.
  const audio=$('#music-audio');
  const panel=$('#music-panel');
  const toggle=$('#music-toggle');
  const play=$('#music-play');
  const trackList=$('#music-tracks');
  const status=$('#music-status');
  const progress=$('#music-progress');
  let songs=[];let trackIndex=0;let hasSelected=false;
  let initial=Array.isArray(window.XY_SONGS)?window.XY_SONGS:[];
  let rememberedTrack='';let rememberedVolume=55;
  try{
    rememberedTrack=localStorage.getItem('xy-selected-song')||'';
    rememberedVolume=Number(localStorage.getItem('xy-music-volume')||55);
  }catch(e){}
  if(!Number.isFinite(rememberedVolume))rememberedVolume=55;
  rememberedVolume=Math.max(0,Math.min(100,rememberedVolume));
  audio.volume=rememberedVolume/100;
  $('#music-volume').value=String(rememberedVolume);
  const timeLabel=(secs)=>Number.isFinite(secs)?`${Math.floor(secs/60)}:${String(Math.floor(secs%60)).padStart(2,'0')}`:'0:00';
  const findSong=(file)=>songs.findIndex(s=>s.file===file);
  function updatePlaybackButton(){
    const active=!audio.paused&&!audio.ended;
    play.textContent=active?'Ⅱ':'▶';
    play.setAttribute('aria-label',active?'暂停音乐':'播放音乐');
    $('#music-vinyl').classList.toggle('playing',active);
  }
  function renderSongs(){
    trackList.replaceChildren();
    songs.forEach((song,i)=>{
      const btn=document.createElement('button');
      btn.type='button';btn.className='music-track'+(i===trackIndex?' active':'');
      btn.setAttribute('aria-label','选择歌曲：'+song.title);
      const number=document.createElement('span');number.className='music-track-number';number.textContent=String(i+1).padStart(2,'0');
      const copy=document.createElement('span');copy.className='music-track-copy';
      const name=document.createElement('strong');name.textContent=song.title;
      const note=document.createElement('small');note.textContent=song.note||'XTC × XY';
      copy.append(name,note);btn.append(number,copy);trackList.append(btn);
      btn.addEventListener('click',()=>{selectSong(i);startAudio();});
    });
    play.disabled=songs.length===0;
    $('#music-prev').disabled=songs.length===0;
    $('#music-next').disabled=songs.length===0;
  }
  function selectSong(index,shouldRemember=true){
    if(!songs.length)return;
    trackIndex=(index+songs.length)%songs.length;
    const song=songs[trackIndex];
    audio.pause();
    audio.src=song.file;
    audio.load();
    hasSelected=true;
    $('#music-name').textContent=song.title;
    $('#music-note').textContent=song.note||'XTC × XY';
    $('#music-time').textContent='0:00';
    $('#music-duration').textContent='0:00';
    progress.value='0';
    status.textContent='已选择「'+song.title+'」，点播放就能听见。';
    updatePlaybackButton();
    if(shouldRemember){
      try{localStorage.setItem('xy-selected-song',song.file)}catch(e){}
    }
    renderSongs();
  }
  function buildSongs(preserve){
    const existing=preserve&&songs[trackIndex]&&songs[trackIndex].file;
    songs=initial.filter(song=>song&&typeof song.file==='string'&&(!song.birthdayOnly||birthdayActive));
    const desired=existing||rememberedTrack;
    const idx=findSong(desired);
    const wasPlaying=preserve&&!audio.paused;
    selectSong(idx>=0?idx:0,false);
    if(wasPlaying)startAudio();
  }
  async function startAudio(){
    if(!songs.length){status.textContent='歌单还没有音乐，先在 music-data.js 添加歌曲。';return;}
    if(!hasSelected)selectSong(trackIndex);
    try{
      await audio.play();
      status.textContent='正在播放 · '+songs[trackIndex].title;
    }catch(e){
      status.textContent='播放失败：请检查歌曲文件是否已上传到 music/，并点击播放重试。';
    }
    updatePlaybackButton();
  }
  $('#music-toggle').addEventListener('click',()=>{
    panel.hidden=!panel.hidden;
    toggle.setAttribute('aria-expanded',String(!panel.hidden));
    toggle.setAttribute('aria-label',panel.hidden?'打开音乐播放器':'收起音乐播放器');
    if(!panel.hidden)$('#music-close').focus();
  });
  $('#music-close').addEventListener('click',()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();});
  play.addEventListener('click',()=>audio.paused?startAudio():audio.pause());
  $('#music-prev').addEventListener('click',()=>{selectSong(trackIndex-1);startAudio();});
  $('#music-next').addEventListener('click',()=>{selectSong(trackIndex+1);startAudio();});
  $('#music-volume').addEventListener('input',(e)=>{
    const v=Number(e.target.value);audio.volume=v/100;
    try{localStorage.setItem('xy-music-volume',String(v))}catch(e){}
  });
  progress.addEventListener('input',()=>{
    if(Number.isFinite(audio.duration)&&audio.duration>0){
      audio.currentTime=Number(progress.value)/100*audio.duration;
    }
  });
  audio.addEventListener('timeupdate',()=>{
    $('#music-time').textContent=timeLabel(audio.currentTime);
    if(Number.isFinite(audio.duration)&&audio.duration>0)progress.value=String(audio.currentTime/audio.duration*100);
  });
  audio.addEventListener('loadedmetadata',()=>{$('#music-duration').textContent=timeLabel(audio.duration);});
  audio.addEventListener('play',updatePlaybackButton);
  audio.addEventListener('pause',updatePlaybackButton);
  audio.addEventListener('ended',()=>{selectSong(trackIndex+1);startAudio();});
  audio.addEventListener('error',()=>{status.textContent='这首歌的文件没找到或格式不支持，请核对 '+(songs[trackIndex]?.file||'音频路径');updatePlaybackButton();});
  buildSongs(false);
  checkBirthday();
  // For already-unlocked returning visitors, show only after the page initializes.
  showBirthdayIfUnlocked();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkBirthday();});
  window.addEventListener('focus',checkBirthday);
  window.setInterval(checkBirthday,60*1000);
})();
