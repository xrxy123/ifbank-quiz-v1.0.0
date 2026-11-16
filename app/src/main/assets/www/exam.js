/* ===== 模拟考试设置 + 程序初始化 ===== */
(function(){
'use strict';
const A = window.__app;
const {INDEX, TYPE_NAME, $, $$, ICONS, showPage, LS, beep, speak, startBgm} = A;

let cfg = null;

function renderExamSetup(){
  // 读取上次配置或初始化
  cfg = LS.get('examCfg', null) || {single:20, multiple:10, judge:10, blank:5, showExplain:false};
  // 钳制到题库容量
  const cap = {single:INDEX.byType.single.length, multiple:INDEX.byType.multiple.length, judge:INDEX.byType.judge.length, blank:INDEX.byType.blank.length};
  ['single','multiple','judge','blank'].forEach(t=>{ cfg[t]=Math.max(0, Math.min(cfg[t], cap[t])); });

  const page=$('#page-exam-setup');
  page.innerHTML=`
    <button class="back" id="es-back">${ICONS.back} 返回首页</button>
    <h2 style="margin:0 0 6px;font-size:20px">模拟考试</h2>
    <p style="margin:0 0 18px;color:var(--muted);font-size:13px">自由设置各题型题量与解析显示方式，题目将从题库中随机抽取。</p>
    <div class="tipbar">${ICONS.info}<span>考试交卷后统一评分；是否显示解析由下方开关决定，考试过程中也可以选择考完再查看解析。</span></div>
    <div class="setup-card">
      ${['single','multiple','judge','blank'].map((t,i)=>`
        <div class="setup-row">
          <div class="lb"><h4>${TYPE_NAME[t]}</h4><p>题库共 ${cap[t]} 题</p></div>
          <div class="stepper">
            <button data-dec="${t}">−</button>
            <span class="val" id="val-${t}">${cfg[t]}</span>
            <button data-inc="${t}">＋</button>
          </div>
        </div>`).join('')}
      <div class="setup-row">
        <div class="lb"><h4>答题后立即显示解析</h4><p>关闭则交卷后统一查看</p></div>
        <button class="switch ${cfg.showExplain?'on':''}" id="es-switch"><i></i></button>
      </div>
    </div>
    <div class="summary-box">本次考试共 <b id="es-total">0</b> 题（随机抽取）　·　总分 100 分　·　建议完成后查看解析巩固</div>
    <div class="btn-row">
      <button class="btn lg primary" id="es-start">${ICONS.exam} 开始考试</button>
      <button class="btn lg" id="es-reset">恢复默认</button>
    </div>
  `;
  $('#es-back').onclick=()=>showPage('home');
  function updTotal(){ $('#es-total').textContent = cfg.single+cfg.multiple+cfg.judge+cfg.blank; }
  updTotal();
  $$('[data-inc]',page).forEach(b=>b.onclick=()=>{ const t=b.dataset.inc; if(cfg[t]<cap[t]){cfg[t]++; $('#val-'+t).textContent=cfg[t]; updTotal(); beep('tap');} });
  $$('[data-dec]',page).forEach(b=>b.onclick=()=>{ const t=b.dataset.dec; if(cfg[t]>0){cfg[t]--; $('#val-'+t).textContent=cfg[t]; updTotal();} });
  $('#es-switch').onclick=(e)=>{ cfg.showExplain=!cfg.showExplain; e.currentTarget.classList.toggle('on',cfg.showExplain); };
  $('#es-reset').onclick=()=>{ cfg={single:20,multiple:10,judge:10,blank:5,showExplain:false}; LS.del('examCfg'); renderExamSetup(); };
  $('#es-start').onclick=()=>{
    const total=cfg.single+cfg.multiple+cfg.judge+cfg.blank;
    if(total===0){ alert('请至少选择一道题'); return; }
    LS.set('examCfg',cfg);
    const queue=[];
    ['single','multiple','judge','blank'].forEach(t=>{
      const pool=A.shuffle(INDEX.byType[t]);
      queue.push(...pool.slice(0,cfg[t]));
    });
    const finalQueue=A.shuffle(queue);
    beep('tap'); speak('exam_start');
    A.__startQuiz(finalQueue,'模拟考试','模拟考试',{
      showExplain:cfg.showExplain, instant:cfg.showExplain,
      onExit:()=>showPage('home')
    });
  };
}

/* ---------- 初始化 ---------- */
// 暴露给 app2 的首页入口调用
window.__renderExamSetup = renderExamSetup;

function boot(){
  renderExamSetup();
  if(window.__app2 && window.__app2.renderHome) window.__app2.renderHome();
  showPage('home');
  startBgm();
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', boot, {once:true});
} else {
  boot();
}

window.__exam = {renderExamSetup};
})();
