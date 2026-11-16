/* ===== 首页 / 知识图谱 / 章节练习 ===== */
(function(){
'use strict';
const A = window.__app;
const {BANK, INDEX, TYPE_NAME, $, $$, escapeHtml, impTag, impClass, ICONS, logo, showPage, LS} = A;

/* ---------- 首页 ---------- */
function renderHome(){
  const kp = BANK.meta.totalKnowledge, q = BANK.meta.totalQuestions, ch = INDEX.chapters.length;
  const home = $('#page-home');
  home.innerHTML = `
    <div class="hero">
      <div class="deco"></div>
      <h1>国际金融（初级）题库</h1>
      <p>基于中国建设银行《国际金融专业技术职务等级考试（初级复习资料）》编制，覆盖全部章节知识点，每题附解析与原文出处。</p>
      <div class="stats">
        <div class="stat"><b>${ch}</b><span>章节</span></div>
        <div class="stat"><b>${kp}</b><span>知识点</span></div>
        <div class="stat"><b>${q}</b><span>试题</span></div>
        <div class="stat"><b>4</b><span>题型</span></div>
      </div>
    </div>

    <div class="sec-title">核心功能</div>
    <div class="grid cols2">
      <button class="card" data-go="graph"><div class="ic blue">${ICONS.graph}</div><h3>知识图谱</h3><p>按章节梳理全部知识点，重点·常考内容醒目标注，支持关键词检索。</p><div class="meta">${kp} 个知识点 →</div></button>
      <button class="card" data-go="chapters"><div class="ic gray">${ICONS.home}</div><h3>章节练习</h3><p>按章节练习，边学边练，题目与知识点一一对应。</p><div class="meta">${ch} 个章节 →</div></button>
    </div>

    <div class="sec-title">按题型练习</div>
    <div class="grid cols4">
      ${['single','multiple','judge','blank'].map((t,i)=>{
        const c = ['blue','red','amber','green'][i];
        return `<button class="card" data-type="${t}"><div class="ic ${c}">${ICONS[t]}</div><h3>${TYPE_NAME[t]}</h3><p>共 ${INDEX.byType[t].length} 题</p><div class="meta">开始练习 →</div></button>`;
      }).join('')}
    </div>

    <div class="sec-title">练习模式</div>
    <div class="grid cols2">
      <button class="card" data-go="exam-setup"><div class="ic green">${ICONS.exam}</div><h3>模拟考试</h3><p>自由选择题型与题量、是否显示解析，随机抽题，交卷后自动评分。</p><div class="meta">进入考场 →</div></button>
      <button class="card" data-go="seq"><div class="ic blue">${ICONS.seq}</div><h3>顺序练习</h3><p>从第一题依次练到最后一题，答完即看解析，退出自动保存进度。</p><div class="meta" id="seq-home-meta">继续练习 →</div></button>
    </div>

    <div class="sec-title">设置</div>
    <div class="card" style="padding:6px 18px">
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)">
        <div class="ic gray" style="margin:0">${ICONS.info}</div>
        <div style="flex:1"><h3 style="font-size:15px;margin:0 0 3px">答题音效</h3><p>答对/答错提示音（已内嵌）</p></div>
        <button class="switch ${LS.get('sound',true)?'on':''}" id="sound-toggle" aria-label="切换音效"><i></i></button>
      </div>
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)">
        <div class="ic blue" style="margin:0">${ICONS.judge}</div>
        <div style="flex:1"><h3 style="font-size:15px;margin:0 0 3px">语音播报</h3><p>朗读"回答正确/错误"等（已内嵌）</p></div>
        <button class="switch ${LS.get('voice',true)?'on':''}" id="voice-toggle" aria-label="切换语音"><i></i></button>
      </div>
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0">
        <div class="ic green" style="margin:0">${ICONS.seq}</div>
        <div style="flex:1"><h3 style="font-size:15px;margin:0 0 3px">背景音乐</h3><p>轻柔循环背景音（已内嵌）</p></div>
        <button class="switch ${LS.get('bgm',false)?'on':''}" id="bgm-toggle" aria-label="切换背景音"><i></i></button>
      </div>
    </div>
  `;
  $$('[data-go]',home).forEach(b=>b.onclick=()=>{
    const g=b.dataset.go;
    if(g==='graph') renderGraph();
    else if(g==='chapters') renderChapters();
    else if(g==='exam-setup'){ if(window.__renderExamSetup) window.__renderExamSetup(); }
    else if(g==='seq'){ A.__startSequence(); return; }
    showPage(g);
  });
  $$('[data-type]',home).forEach(b=>b.onclick=()=>{ openTypeQuestions(b.dataset.type); });
  $('#sound-toggle').onclick=(e)=>{ const v=!LS.get('sound',true); LS.set('sound',v); e.currentTarget.classList.toggle('on',v); if(v) A.beep('ok'); };
  $('#voice-toggle').onclick=(e)=>{ const v=!LS.get('voice',true); LS.set('voice',v); e.currentTarget.classList.toggle('on',v); if(v) A.speak('ok'); };
  $('#bgm-toggle').onclick=(e)=>{ const v=!LS.get('bgm',false); e.currentTarget.classList.toggle('on',v); A.toggleBgm(v); };
  const sp = LS.get('seqProgress',null);
  const m = $('#seq-home-meta');
  if(m && sp && sp.idx>0) m.textContent = `继续第 ${sp.idx+1} 题 →`;
}

/* ---------- 知识图谱 ---------- */
let graphFilter = 'all', graphSearch='';
function renderGraph(){
  const page=$('#page-graph');
  page.innerHTML = `
    <button class="back" id="g-back">${ICONS.back} 返回首页</button>
    <h2 style="margin:0 0 6px;font-size:20px">知识图谱</h2>
    <p style="margin:0 0 16px;color:var(--muted);font-size:13px">全部知识点按章节梳理，重点·常考内容已标记，可展开章节查看。</p>
    <div class="legend">
      <span>标记说明：</span>
      <span><span class="tag core">重点·常考</span> 核心高频</span>
      <span><span class="tag imp">重要</span> 需掌握</span>
      <span><span class="tag norm">了解</span> 一般了解</span>
    </div>
    <div class="searchbar">${ICONS.search}<input id="g-search" placeholder="搜索知识点名称、内容或出处…" value="${escapeHtml(graphSearch)}"></div>
    <div class="chips" id="g-filter">
      ${[['all','全部章节'],['core','仅重点·常考'],['imp','仅重要'],['part0','对公业务'],['part1','个人外汇业务']].map(([v,l])=>`<button class="chip ${graphFilter===v?'on':''}" data-f="${v}">${l}</button>`).join('')}
    </div>
    <div id="g-list"></div>
  `;
  $('#g-back').onclick=()=>showPage('home');
  $('#g-search').oninput=(e)=>{ graphSearch=e.target.value.trim(); drawGraphList(); };
  $$('#g-filter .chip').forEach(c=>c.onclick=()=>{ graphFilter=c.dataset.f; $$('#g-filter .chip').forEach(x=>x.classList.remove('on')); c.classList.add('on'); drawGraphList(); });
  drawGraphList();
}
function drawGraphList(){
  const box=$('#g-list'); if(!box) return;
  const kw = graphSearch.toLowerCase();
  let html='', shown=0;
  INDEX.parts.forEach((part,pi)=>{
    if(graphFilter==='part0'&&pi!==0) return;
    if(graphFilter==='part1'&&pi!==1) return;
    const chaptersHtml = part.chapters.map(ch=>{
      const sectionsHtml = ch.sections.map(sec=>{
        const kps = (sec.knowledge||[]).filter(k=>{
          if(graphFilter==='core') return k.importance==='core';
          if(graphFilter==='imp') return impClass(k.importance)==='imp';
          return true;
        }).filter(k=>{
          if(!kw) return true;
          return (k.title+' '+k.content+' '+(k.source||'')).toLowerCase().includes(kw);
        });
        if(!kps.length) return '';
        shown+=kps.length;
        return `<div class="sec-row" style="display:block">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="dot"></span><span class="sn" style="font-weight:600">${escapeHtml(sec.name)}</span><span class="badge norm">${kps.length} 条</span></div>
          ${kps.map(k=>`<div class="kp"><div class="kp-h"><span class="kp-t">${escapeHtml(k.title)}</span>${impTag(k.importance)}</div><div class="kp-c">${escapeHtml(k.content)}</div><div class="kp-s">${ICONS.src} ${escapeHtml(k.source||'')}</div></div>`).join('')}
        </div>`;
      }).join('');
      if(!sectionsHtml) return '';
      return `<div class="chapter open"><div class="chapter-hd" data-toggle><span class="idx">${(ch._globalIndex+1)}</span><span class="nm">${escapeHtml(ch.name)}</span><span class="cnt">${ch.sections.length} 节</span><span class="arrow">${ICONS.arrow}</span></div><div class="chapter-bd">${sectionsHtml}</div></div>`;
    }).join('');
    if(!chaptersHtml) return '';
    html += `<div class="sec-title" style="margin-top:18px">${escapeHtml(part.name)}</div>${chaptersHtml}`;
  });
  box.innerHTML = shown ? html : `<div class="empty">${ICONS.search}<p>未找到匹配的知识点，试试其他关键词或筛选条件。</p></div>`;
  $$('[data-toggle]',box).forEach(h=>h.onclick=()=>h.parentElement.classList.toggle('open'));
}

/* ---------- 章节练习（列表） ---------- */
function renderChapters(){
  const page=$('#page-chapters');
  page.innerHTML = `
    <button class="back" id="c-back">${ICONS.back} 返回首页</button>
    <h2 style="margin:0 0 6px;font-size:20px">章节练习</h2>
    <p style="margin:0 0 18px;color:var(--muted);font-size:13px">选择章节进入，可练习该章节下的全部题目。</p>
    ${INDEX.parts.map((part,pi)=>`
      <div class="sec-title">${escapeHtml(part.name)}</div>
      ${part.chapters.map(ch=>{
        const qs=INDEX.byChapter[ch.id]||[];
        const kp=ch.sections.reduce((s,x)=>s+(x.knowledge||[]).length,0);
        return `<div class="chapter"><div class="chapter-hd" data-ch="${ch.id}">
          <span class="idx">${ch._globalIndex+1}</span>
          <span class="nm">${escapeHtml(ch.name)}</span>
          <span class="cnt">${qs.length} 题 · ${kp} 知识点</span>
          <span class="arrow">${ICONS.arrow}</span>
        </div></div>`;
      }).join('')}
    `).join('')}
  `;
  $('#c-back').onclick=()=>showPage('home');
  $$('[data-ch]',page).forEach(h=>h.onclick=()=>{
    const id=h.dataset.ch;
    const qs=INDEX.byChapter[id]||[];
    const ch=INDEX.chapters.find(x=>x.ch.id===id);
    A.__startQuiz(qs, ch.ch.name, '章节练习', ()=>showPage('chapters'));
  });
}

/* ---------- 按题型练习（全部该类题目） ---------- */
function openTypeQuestions(type){
  A.__startQuiz(INDEX.byType[type].slice(), TYPE_NAME[type]+'练习', '题型练习', ()=>showPage('home'));
}

window.__app2 = {renderHome, renderGraph, drawGraphList, renderChapters, openTypeQuestions};
})();
