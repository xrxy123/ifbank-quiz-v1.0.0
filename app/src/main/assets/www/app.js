/* ===== 国际金融题库 · 核心逻辑 ===== */
(function(){
'use strict';

const BANK = window.BANK_DATA;
const TYPE_NAME = {single:'单选题', multiple:'多选题', judge:'判断题', blank:'填空题'};
const IMP_NAME = {core:'重点·常考', imp:'重要', normal:'了解'};

/* ---------- 数据索引 ---------- */
const INDEX = { parts: BANK.parts, chapters: [], allQuestions: [], byChapter: {}, byType: {} };
['single','multiple','judge','blank'].forEach(t=>INDEX.byType[t]=[]);
BANK.parts.forEach((part,pi)=>{
  part.chapters.forEach((ch,ci)=>{
    ch._pid = pi; ch._ci = ci;
    ch._globalIndex = INDEX.chapters.length;
    INDEX.chapters.push({part, ch});
    const key = ch.id;
    INDEX.byChapter[key] = [];
    ch.sections.forEach(sec=>{
      (sec.questions||[]).forEach((q,qi)=>{
        const item = Object.assign({}, q, {
          _qid: key+'_'+sec.id+'_'+qi,
          _chapterId: ch.id, _chapterName: ch.name, _partName: part.name,
          _sectionName: sec.name, _globalIndex: INDEX.allQuestions.length
        });
        INDEX.allQuestions.push(item);
        INDEX.byChapter[key].push(item);
        INDEX.byType[q.type] && INDEX.byType[q.type].push(item);
      });
    });
  });
});

/* ---------- 本地存储 ---------- */
const LS = {
  get(k,def){ try{ const v=localStorage.getItem('jf_'+k); return v?JSON.parse(v):def; }catch(e){ return def; } },
  set(k,v){ try{ localStorage.setItem('jf_'+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem('jf_'+k); }catch(e){} }
};

/* ---------- 工具 ---------- */
const $ = (s,el)=> (el||document).querySelector(s);
const $$ = (s,el)=> Array.from((el||document).querySelectorAll(s));
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function impTag(imp){ const c = imp==='core'?'core':imp==='imp'||imp==='important'?'imp':'norm'; return `<span class="tag ${c}">${IMP_NAME[c==='imp'?'imp':c]||IMP_NAME[c]||'了解'}</span>`; }
function impClass(imp){ return imp==='core'?'core':(imp==='important'||imp==='imp')?'imp':'norm'; }

/* ---------- 图标 ---------- */
const ICONS = {
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  graph:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M6.8 7.6 10.5 16M17.2 7.6 13.5 16M7.2 6h9.6"/></svg>',
  single:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4L16 9.5"/></svg>',
  multi:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
  judge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>',
  blank:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h4l2-5 3 10 2-5h5"/></svg>',
  exam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 13 2 2 4-4"/></svg>',
  seq:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m15 18-6-6 6-6"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m9 18 6-6-6-6"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  src:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M4 6h16M4 12h16M4 18h12"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m5 12 4 4L19 6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 4v7h-7"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
};
function logo(){ return '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>'; }

/* ---------- 页面路由 ---------- */
function showPage(id){
  $$('.page').forEach(p=>p.classList.remove('active'));
  const el = document.getElementById('page-'+id);
  if(el) el.classList.add('active');
  window.scrollTo(0,0);
}

/* ---------- 音频系统（内嵌音频优先 + WebAudio 兜底） ---------- */
let audioCtx=null;
const AUDIO_BASE = 'audio/';
const SFX_FILE = {ok:'sfx_correct.wav', bad:'sfx_wrong.wav', tap:'sfx_click.wav', finish:'sfx_finish.wav'};
const VOICE_FILE = {ok:'voice_correct.mp3', bad:'voice_wrong.mp3', exam_start:'voice_exam_start.mp3',
  exam_end:'voice_exam_end.mp3', finish:'voice_finish.mp3', next:'voice_next.mp3'};
const _audioCache = {};
function _playFile(name, vol){
  try{
    let a = _audioCache[name];
    if(!a){ a = new Audio(AUDIO_BASE+name); a.preload='auto'; _audioCache[name]=a; }
    a.pause(); a.currentTime=0; a.volume = (vol==null?1:vol);
    const p=a.play(); if(p&&p.catch) p.catch(()=>{});
    return a;
  }catch(e){ return null; }
}
function beepFallback(type){
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const notes = type==='ok' ? [660,880] : type==='bad' ? [300,220] : [520];
    notes.forEach((f,i)=>{
      const o=audioCtx.createOscillator(), g=audioCtx.createGain();
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0.0001, t+i*0.09);
      g.gain.exponentialRampToValueAtTime(0.13, t+i*0.09+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t+i*0.09+0.16);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t+i*0.09); o.stop(t+i*0.09+0.18);
    });
  }catch(e){}
}
function beep(type){
  if(LS.get('sound',true)===false) return;
  const f = SFX_FILE[type];
  if(f && _playFile(f, 0.9)) return;
  beepFallback(type);
}
// 语音播报（受 voice 开关控制）
function speak(key){
  if(LS.get('voice',true)===false) return;
  const f = VOICE_FILE[key];
  if(f) _playFile(f, 1.0);
}
// 背景音控制
let bgmAudio=null;
function startBgm(){
  if(LS.get('bgm',false)===false) return;
  try{
    if(!bgmAudio){ bgmAudio=new Audio(AUDIO_BASE+'bgm.wav'); bgmAudio.loop=true; bgmAudio.volume=0.28; }
    const p=bgmAudio.play(); if(p&&p.catch) p.catch(()=>{});
  }catch(e){}
}
function stopBgm(){ if(bgmAudio){ try{bgmAudio.pause();}catch(e){} } }
function toggleBgm(on){
  LS.set('bgm', on);
  if(on) startBgm(); else stopBgm();
}

window.__app = {BANK, INDEX, TYPE_NAME, IMP_NAME, $, $$, escapeHtml, shuffle, impTag, impClass, ICONS, logo, showPage, beep, speak, startBgm, stopBgm, toggleBgm, LS};

/* 后续模块在 app2.js 中继续 */
})();
