/* ===== 答题引擎：四种题型渲染 / 判分 / 解析 ===== */
(function(){
'use strict';
const A = window.__app;
const {INDEX, TYPE_NAME, $, $$, escapeHtml, impTag, ICONS, showPage, beep, speak} = A;

let state = null; // {queue, idx, answers, mode, title, showExplain, onExit, judged, finished}

function startQuiz(queue, title, mode, opts){
  opts = opts || {};
  state = {
    queue: queue, idx:0, answers:{}, mode:mode, title:title,
    showExplain: opts.showExplain!==false, // 答后是否显示解析
    instant: opts.instant!==false,          // 答后立即显示解析
    onExit: opts.onExit || (()=>showPage('home')),
    judged:{}, finished:false, examSubmitted:false
  };
  if(opts.restore && opts.restore.answers){ state.answers=opts.restore.answers; state.idx=opts.restore.idx||0; state.judged=opts.restore.judged||{}; }
  renderQuizShell();
  renderQuestion();
  showPage('quiz');
}

function renderQuizShell(){
  const page=$('#page-quiz');
  page.innerHTML = `
    <button class="back" id="q-back">${ICONS.back} <span id="q-back-label">退出练习</span></button>
    <div class="quiz-head">
      <div class="num" id="q-mode"></div>
      <div class="prog"><i id="q-prog"></i></div>
      <div class="num" id="q-count"></div>
    </div>
    <div id="q-body"></div>
    <div class="qfoot">
      <button class="btn sm" id="q-sheet-btn">${ICONS.chart} 答题卡</button>
      <div class="spacer"></div>
      <button class="btn" id="q-prev">上一题</button>
      <button class="btn primary" id="q-next">下一题</button>
    </div>
    <div id="q-sheet-wrap" style="display:none"></div>
  `;
  $('#q-back-label').textContent = state.mode==='模拟考试'?'退出考场':'退出练习';
  $('#q-mode').textContent = state.title;
  $('#q-back').onclick = ()=>{
    if(state.mode==='模拟考试'){
      if(confirm('退出将清空本次考试作答，确定退出吗？')){ state.onExit(); }
    } else { state.onExit(); }
  };
  $('#q-prev').onclick=()=>{ if(state.idx>0){state.idx--; renderQuestion();} };
  $('#q-next').onclick=()=>{
    if(state.idx < state.queue.length-1){ state.idx++; renderQuestion(); }
    else { if(state.mode==='模拟考试'){ submitExam(); } else { finishPractice(); } }
  };
  $('#q-sheet-btn').onclick=()=>{
    const w=$('#q-sheet-wrap'); w.style.display = w.style.display==='none'?'block':'none';
  };
}

function currentQ(){ return state.queue[state.idx]; }

function renderQuestion(){
  const q = currentQ(); if(!q) return;
  $('#q-count').textContent = `${state.idx+1} / ${state.queue.length}`;
  $('#q-prog').style.width = ((state.idx+1)/state.queue.length*100)+'%';
  $('#q-prev').disabled = state.idx===0;
  $('#q-next').textContent = state.idx===state.queue.length-1 ? (state.mode==='模拟考试'?'交卷':'完成') : '下一题';
  const body=$('#q-body');
  const judged = state.judged[q._qid];
  const ans = state.answers[q._qid];

  let optsHtml='';
  if(q.type==='single'||q.type==='multiple'){
    optsHtml = `<div class="opts">${(q.options||[]).map((o,i)=>{
      const letter=String.fromCharCode(65+i);
      let cls='opt';
      if(judged){
        const isCorrect = isCorrectOption(q, letter);
        const chosen = isChosen(ans, letter);
        if(isCorrect) cls+=' right';
        else if(chosen) cls+=' wrong';
        cls+=' disabled';
      } else if(isChosen(ans,letter)) cls+=' sel';
      return `<div class="${cls}" data-opt="${letter}"><span class="k">${letter}</span><span>${escapeHtml(String(o).replace(/^[A-Z]\.\s*/,''))}</span></div>`;
    }).join('')}</div>`;
  } else if(q.type==='judge'){
    optsHtml = `<div class="opts">${['正确','错误'].map((o,i)=>{
      const letter = o; let cls='opt';
      if(judged){ if(q.answer===o) cls+=' right'; else if(ans===o) cls+=' wrong'; cls+=' disabled'; }
      else if(ans===o) cls+=' sel';
      return `<div class="${cls}" data-opt="${o}"><span class="k">${i===0?'✓':'✕'}</span><span>${o}</span></div>`;
    }).join('')}</div>`;
  } else if(q.type==='blank'){
    const answers = Array.isArray(q.answer)?q.answer:[q.answer];
    optsHtml = answers.map((_,i)=>{
      const val = (ans&&ans[i])||'';
      let style='';
      if(judged){ style = isBlankCorrect(q,i,val)?'border-color:var(--ok);background:var(--ok-soft)':'border-color:var(--bad);background:var(--bad-soft)'; }
      return `<div class="blank-line"><label>第 ${i+1} 空</label><input class="blank-input" data-blank="${i}" style="${style}" value="${escapeHtml(val)}" ${judged?'readonly':''} placeholder="填写原文答案"></div>`;
    }).join('') + (judged?`<div style="font-size:12.5px;color:var(--muted);margin-top:4px">参考答案：${answers.map(a=>`<b style="color:var(--brand)">${escapeHtml(a)}</b>`).join('、')}</div>`:'');
  }

  body.innerHTML = `
    <div class="qcard">
      <div class="qmeta"><span class="qtype">${TYPE_NAME[q.type]}</span>${impTag(q.importance)}<span style="font-size:12px;color:var(--muted)">${escapeHtml(q._chapterName)}</span></div>
      <div class="qstem">${escapeHtml(q.stem)}</div>
      ${optsHtml}
      <div id="q-explain"></div>
      ${!judged && (q.type==='single'||q.type==='multiple'||q.type==='judge') ? `<div style="margin-top:16px"><button class="btn primary sm" id="q-submit-ans">确认作答</button></div>`:''}
      ${!judged && q.type==='blank' ? `<div style="margin-top:16px"><button class="btn primary sm" id="q-submit-ans">确认作答</button></div>`:''}
    </div>
  `;

  if(q.type==='single'||q.type==='multiple'||q.type==='judge'){
    $$('#q-body .opt',body).forEach(el=>el.onclick=()=>{
      if(state.judged[q._qid]) return;
      const v=el.dataset.opt;
      if(q.type==='multiple'){
        let arr = Array.isArray(state.answers[q._qid])?state.answers[q._qid].slice():[];
        if(arr.includes(v)) arr=arr.filter(x=>x!==v); else arr.push(v);
        state.answers[q._qid]=arr.sort();
      } else {
        state.answers[q._qid]=v;
      }
      renderQuestion();
    });
  } else if(q.type==='blank'){
    $$('#q-body .blank-input',body).forEach(el=>el.onclick=e=>e.stopPropagation());
  }
  const sub=$('#q-submit-ans',body);
  if(sub) sub.onclick=()=>submitAnswer();
  if(judged && state.showExplain) renderExplain();
  renderSheet();
}

function isChosen(ans, letter){
  if(Array.isArray(ans)) return ans.includes(letter);
  return ans===letter;
}
function isCorrectOption(q, letter){
  const a=q.answer;
  if(Array.isArray(a)) return a.includes(letter);
  return a===letter;
}
function isBlankCorrect(q, i, val){
  const a=Array.isArray(q.answer)?q.answer:[q.answer];
  return norm(String(val||''))===norm(String(a[i]||''));
}
function norm(s){ return s.trim().replace(/[\s，,。.]/g,'').toLowerCase(); }

function judgeAnswer(q){
  if(q.type==='blank'){
    const ans=state.answers[q._qid]||[];
    const correct=(Array.isArray(q.answer)?q.answer:[q.answer]).every((a,i)=>norm(String(ans[i]||''))===norm(String(a)));
    return correct;
  }
  const ans=state.answers[q._qid];
  const a=q.answer;
  if(Array.isArray(a)){
    const u=Array.isArray(ans)?ans:[];
    return a.length===u.length && a.every(x=>u.includes(x));
  }
  return ans===a;
}

function submitAnswer(){
  const q=currentQ();
  if(q.type==='blank'){
    const inputs=$$('#q-body .blank-input');
    state.answers[q._qid]=inputs.map(i=>i.value);
    if(inputs.every(i=>!i.value.trim())){ alert('请先填写答案'); return; }
  } else if(!state.answers[q._qid] || (Array.isArray(state.answers[q._qid])&&!state.answers[q._qid].length)){
    alert('请先作答'); return;
  }
  const ok=judgeAnswer(q);
  state.judged[q._qid]=ok;
  beep(ok?'ok':'bad');
  speak(ok?'ok':'bad');
  saveSeqProgress();
  renderQuestion();
}

function answerText(q){
  const a=q.answer;
  if(q.type==='blank') return (Array.isArray(a)?a:[a]).join('、');
  if(q.type==='judge') return a;
  return Array.isArray(a)?a.join(''):a;
}
function renderExplain(){
  const q=currentQ(), ok=state.judged[q._qid];
  const box=$('#q-explain');
  box.innerHTML = `
    <div class="explain">
      <div class="verdict ${ok?'ok':'bad'}">${ok?ICONS.check:ICONS.x} ${ok?'回答正确':'回答错误'}</div>
      <div class="ans-line">正确答案：<b>${escapeHtml(answerText(q))}</b></div>
      <div class="an-body">${escapeHtml(q.analysis||'暂无解析')}</div>
      <div class="src">${ICONS.src} <span><b>出处：</b>${escapeHtml(q.source||'')}</span></div>
    </div>`;
}

function renderSheet(){
  const wrap=$('#q-sheet-wrap'); if(!wrap) return;
  wrap.innerHTML = `<div class="sec-title">答题卡</div><div class="sheet">${state.queue.map((q,i)=>{
    let cls='n';
    if(state.judged[q._qid]!==undefined) cls+=' done';
    if(i===state.idx) cls+=' cur';
    return `<div class="${cls}" data-jump="${i}">${i+1}</div>`;
  }).join('')}</div>`;
  $$('[data-jump]',wrap).forEach(el=>el.onclick=()=>{ state.idx=+el.dataset.jump; renderQuestion(); window.scrollTo(0,0); });
}

function saveSeqProgress(){
  if(state.mode==='顺序练习'){
    A.LS.set('seqProgress',{idx:state.idx, answers:state.answers, judged:state.judged, total:state.queue.length});
  }
}

function finishPractice(){
  const done=Object.keys(state.judged).length;
  const correct=Object.values(state.judged).filter(Boolean).length;
  beep('finish'); speak('finish');
  A.LS.del('seqProgress');
  const body=$('#q-body');
  body.innerHTML=`<div class="qcard" style="text-align:center;padding:40px 24px">
    <div style="width:64px;height:64px;border-radius:50%;background:var(--ok-soft);color:var(--ok);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">${ICONS.check}</div>
    <h2 style="margin:0 0 8px">练习完成</h2>
    <p style="color:var(--muted);margin:0 0 20px">本次共作答 ${done} 题，答对 <b style="color:var(--ok)">${correct}</b> 题，正确率 ${done?Math.round(correct/done*100):0}%。</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn" id="fp-back">返回</button>
      <button class="btn primary" id="fp-retry">${ICONS.refresh} 重新练习</button>
    </div>
  </div>`;
  $('#fp-back').onclick=()=>state.onExit();
  $('#fp-retry').onclick=()=>startQuiz(state.queue, state.title, state.mode, {onExit:state.onExit, showExplain:state.showExplain});
}

function submitExam(){
  if(state.examSubmitted) return;
  const answered=Object.keys(state.answers).length;
  if(answered < state.queue.length && !confirm(`还有 ${state.queue.length-answered} 题未作答，确定交卷吗？`)) return;
  state.examSubmitted=true;
  // 未作答的判为错误
  state.queue.forEach(q=>{ if(state.judged[q._qid]===undefined){ state.judged[q._qid]=false; } });
  const correct=Object.values(state.judged).filter(Boolean).length;
  const total=state.queue.length;
  const score=total?Math.round(correct/total*100):0;
  beep('finish'); speak('exam_end');
  const byType={};
  ['single','multiple','judge','blank'].forEach(t=>{
    const qs=state.queue.filter(q=>q.type===t);
    const c=qs.filter(q=>state.judged[q._qid]).length;
    byType[t]={total:qs.length,correct:c};
  });
  const body=$('#q-body');
  const R=150, r=62, cx=75, cy=75, circ=2*Math.PI*r;
  const off = circ*(1-score/100);
  const color = score>=80?'var(--ok)':score>=60?'var(--imp)':'var(--bad)';
  body.innerHTML=`<div class="qcard" style="padding:32px 24px">
    <h2 style="margin:0 0 4px;text-align:center">考试结束</h2>
    <p style="text-align:center;color:var(--muted);margin:0 0 10px">${escapeHtml(state.title)}</p>
    <div class="score-ring"><svg width="150" height="150"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line)" stroke-width="12"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"/></svg><div class="txt"><b style="color:${color}">${score}</b><span>得分</span></div></div>
    <div class="result-stats">
      <div class="rs"><b>${total}</b><span>总题数</span></div>
      <div class="rs"><b style="color:var(--ok)">${correct}</b><span>答对</span></div>
      <div class="rs"><b style="color:var(--bad)">${total-correct}</b><span>答错/未答</span></div>
      <div class="rs"><b>${answered}</b><span>已作答</span></div>
    </div>
    <div class="sec-title">各题型正确率</div>
    <div class="grid cols4">${['single','multiple','judge','blank'].map(t=>`<div class="rs" style="background:var(--brand-soft)"><b style="font-size:16px;color:var(--brand-d)">${byType[t].correct}/${byType[t].total}</b><span>${TYPE_NAME[t]}</span></div>`).join('')}</div>
    <div class="btn-row" style="justify-content:center;margin-top:24px">
      <button class="btn" id="ex-back">返回首页</button>
      <button class="btn primary" id="ex-review">${ICONS.chart} 查看解析</button>
    </div>
  </div>`;
  $('#ex-back').onclick=()=>state.onExit();
  $('#ex-review').onclick=()=>{
    state.showExplain=true; state.idx=0; state.examSubmitted=false;
    renderQuizShell(); renderQuestion(); showPage('quiz');
  };
  $('#q-next').textContent='交卷';
}

/* ---------- 顺序练习 ---------- */
function startSequence(){
  const all = INDEX.allQuestions.slice();
  const saved = A.LS.get('seqProgress',null);
  const opts = {onExit:()=>showPage('home'), showExplain:true, instant:true};
  if(saved && saved.total===all.length && saved.idx<all.length){
    opts.restore=saved;
    startQuiz(all,'顺序练习','顺序练习',opts);
  } else {
    A.LS.del('seqProgress');
    startQuiz(all,'顺序练习','顺序练习',opts);
  }
}

A.__startQuiz = startQuiz;
A.__startSequence = startSequence;
A.__submitExamBody = null;
})();
