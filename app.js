/* Alibaba Growth OS V4 — 渲染逻辑 */
var D = window.V4_DATA || {};
var PERIOD = 'week'; // week | month

/* ---------- 工具 ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function num(n){ if(n==null||n==='') return '—'; n=Number(n); return n.toLocaleString('en-US'); }
function money(n){ if(n==null||n==='') return '—'; n=Number(n); return '$'+n.toLocaleString('en-US',{maximumFractionDigits:0}); }
function pct(n){ if(n==null||n==='') return '—'; n=Number(n); return n.toFixed(2)+'%'; }
function wowHtml(w){ var unit = PERIOD==='month' ? '上月' : '上周'; if(w==null) return '<span class="muted">环比 —</span>'; var up=w>=0; var c=up?'wow-up':'wow-down'; var s=up?'+':''; return '<span class="'+c+'">'+(up?'↑':'↓')+' '+s+w+'% '+unit+'</span>'; }
function fmt(k,v){ if(k==='money') return money(v); if(k==='pct') return pct(v); return num(v); }
function tag(text,typ){ if(!text) return ''; return '<span class="tag '+typ+'">'+esc(text)+'</span>'; }
function gapHtml(cur, avg, good, lowerBetter){
  if(avg==null && good==null) return '<span class="muted">同行 —</span>';
  var parts=[];
  if(good!=null){ var d=(lowerBetter? good-cur : cur-good); var cls=(lowerBetter? (d>0?'bad':'ok') : (d<0?'bad':'ok')); parts.push('同行优秀 '+fmtg(good)+' <span class="'+cls+'">('+(d>=0?'差':'超')+' '+fmtg(Math.abs(d))+')</span>'); }
  if(avg!=null){ var d2=(lowerBetter? avg-cur : cur-avg); var cls2=(lowerBetter? (d2>0?'bad':'ok') : (d2<0?'bad':'ok')); parts.push('同行平均 '+fmtg(avg)+' <span class="'+cls2+'">('+(d2>=0?'差':'超')+' '+fmtg(Math.abs(d2))+')</span>'); }
  return parts.join(' · ');
}
function fmtg(v){ return Math.abs(v)>=1000? num(v): (Math.abs(v)<1&&v!==0? v.toFixed(3): num(v)); }
function pimg(url){ return url? '<img class="pimg" src="'+esc(url)+'" onclick="previewImg(\''+esc(url)+'\')" style="cursor:zoom-in" onerror="this.style.visibility=\'hidden\'">' : '<div class="pimg"></div>'; }
function previewImg(url){
  if(!url) return;
  var ov=document.createElement('div'); ov.className='modal-overlay'+(false?'':' img-overlay');
  ov.innerHTML='<div style="text-align:center"><img src="'+esc(url)+'" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,.5)"><div class="muted" style="color:#fff;margin-top:10px">点击任意处关闭</div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', function(){ ov.remove(); });
}

/* ---------- AI 评分 ---------- */
var SCORES = {};
function loadScores(){ SCORES={}; (D.v4_scores&&D.v4_scores.scores||[]).forEach(function(s){ SCORES[s.product_id]=s; }); }
function scoreOf(pid){ return SCORES[pid]||null; }
function gradeTag(s){
  if(!s) return '<span class="muted">—</span>';
  return '<span class="score-tag '+s.gcls+'" onclick="openScore(\''+s.product_id+'\')">'+s.score+'分 '+s.grade+'</span>';
}
function conciseAdvice(s){
  if(!s) return '';
  var parts=[];
  var pb=s.playbook;
  // 1. 市场定位（品类打法，按市场区分）
  if(pb && pb.positioning) parts.push('<b style="color:var(--blue)">'+esc(pb.positioning.slice(0,34))+'</b>');
  // 2. 本品具体动作（第一条打法，结合诊断）
  if(s.problems && s.problems.length){
    parts.push('<span style="color:var(--red)">'+esc(s.problems[0].slice(0,30))+'</span>');
  } else if(pb && pb.moves && pb.moves[0]){
    parts.push(esc(pb.moves[0].slice(0,30)));
  }
  // 3. 视觉诊断补充（如占位图/擦边）
  var vis=(D.vision_result&&D.vision_result[s.product_id])||null;
  if(vis && vis.advices && vis.advices.length) parts.push(esc(vis.advices[0].slice(0,24)));
  return parts.join(' → ');
}
function openScore(pid){
  var s=SCORES[pid];
  if(!s){ alert('该产品暂无评分数据'); return; }
  var adv=s.advice||{};
  var lvCls={好:'good',中:'neutral',差:'danger',风险:'danger','无流量':'muted','无数据':'muted'};
  var ov=document.createElement('div'); ov.className='modal-overlay';
  var h='<div class="plan-modal"><div class="pm-head"><span>🤖</span><b>AI 产品评分</b><span class="pm-title">'+esc(s.title)+'</span><div class="spacer"></div><span class="score-big '+s.gcls+'">'+s.score+'分 '+esc(s.grade)+'</span><button class="btn btn-close" onclick="this.closest(\'.modal-overlay\').remove()">关闭 ✕</button></div>';
  h+='<div class="pm-body"><div class="pm-left">';
  // 5 维度评分（哪里好哪里差，细颗粒度）
  h+='<div class="pm-box"><h5>📊 五维评分（哪里好 / 哪里差）</h5>';
  (s.dims||[]).forEach(function(d){
    var cls=lvCls[d.level]||'neutral';
    h+='<div class="dim-row"><div class="dim-name">'+esc(d.name)+'</div><div class="progress-bar" style="flex:1"><i style="width:'+Math.max(2,d.score||0)+'%"></i></div><span class="dim-tag '+cls+'">'+esc(d.level)+'</span></div>'+
      '<div class="dim-reason small muted">'+esc(d.reason)+'</div>';
  });
  h+='</div>';
  // 市场趋势证据 & 建议（评分面板的市场趋势分依据）
  var me=s.market_evidence||{};
  if(me&&me.verdict){
    h+='<div class="pm-box"><h5>📈 市场趋势证据 & 建议</h5><div class="pm-note">'+
      '<div><b>趋势结论</b>：'+esc(me.verdict)+'</div>'+
      ((me.sources&&me.sources.length)?'<div class="mt8"><b>市场报告</b>：'+me.sources.map(function(x){return '<div class="small muted">· '+esc(x)+'</div>';}).join('')+'</div>':'')+
      ((me.social)?'<div class="mt8"><b>社媒热度</b>：<span class="small muted">'+esc(me.social)+'</span></div>':'')+
      ((me.amazon)?'<div class="mt8"><b>亚马逊信号</b>：<span class="small muted">'+esc(me.amazon)+'</span></div>':'')+
    '</div></div>';
  }
  // 主图视觉诊断
  var vis=(D.vision_result&&D.vision_result[pid])||null;
  if(vis){
    var b2bCls = vis.b2b==='好'?'good':(vis.b2b==='中'?'warn':'danger');
    var aiCls = vis.ai==='好'?'good':(vis.ai==='中'?'warn':'danger');
    h+='<div class="pm-box"><h5>🖼 主图视觉诊断（视觉模型识别 + 资深运营分析）</h5><div class="pm-note">'+
      '<div>'+tag('主图：'+esc(vis.type), vis.type==='实物图'?'good':(vis.type==='渲染图'?'warn':'danger'))+' '+tag('背景：'+esc(vis.bg),'neutral')+(vis.risk!=='无'?' '+tag('⚠'+esc(vis.risk)+'擦边','danger'):'')+'</div>'+
      '<div class="mt8"><b>卖点文字</b>：'+esc(vis.text||'无')+'　<b>认证</b>：'+esc(vis.cert||'无')+'</div>'+
      '<div class="mt8">'+tag('B2B转化适配：'+esc(vis.b2b), b2bCls)+' <span class="small muted">'+esc(vis.b2b_comment||'')+'</span></div>'+
      '<div class="mt8">'+tag('AI识别匹配：'+esc(vis.ai), aiCls)+' <span class="small muted">'+esc(vis.ai_comment||'')+'</span></div>'+
      '<div class="mt8" style="color:'+(vis.vision_score>=80?'var(--green)':(vis.vision_score>=55?'var(--orange)':'var(--red)'))+'"><b>视觉评分 '+vis.vision_score+'分</b>：'+esc(vis.note)+'</div>'+
      ((vis.advices&&vis.advices.length)?'<div class="mt8"><b>修改建议</b>：'+(vis.advices.map(function(a){return '<div style="color:var(--blue)">· '+esc(a)+'</div>';}).join(''))+'</div>':'')+
    '</div></div>';
  }
  // 识别画像
  h+='<div class="pm-box"><h5>🔍 AI 识别画像（标题内容能被 AI 识别到什么）</h5><div class="pm-note">'+
    '<div><b>识别为</b>：'+esc(s.recognized_as||'信息不足')+'</div>'+
    '<div class="mt8"><b>已识别到</b>：'+(s.ai_present&&s.ai_present.length?s.ai_present.map(function(x){return '<span class="tag good">'+esc(x)+'</span>';}).join(' '):'<span class="muted">无</span>')+'</div>'+
    '<div class="mt8"><b>缺失</b>：'+(s.ai_missing&&s.ai_missing.length?s.ai_missing.map(function(x){return '<span class="tag danger">'+esc(x)+'</span>';}).join(' '):'<span class="muted">无</span>')+'</div>'+
  '</div></div>';
  // 转化链路闭环
  if(s.funnel&&s.funnel.length){
    h+='<div class="pm-box"><h5>🔁 转化链路闭环（哪里断了）</h5><div class="pm-note">';
    s.funnel.forEach(function(st){ h+='<div class="funnel-step">'+(st.ok?'<span class="tag good">✓</span>':'<span class="tag danger">✗</span>')+esc(st.step)+'：'+esc(st.txt)+'</div>'; });
    h+='</div></div>';
  }
  if(s.good&&s.good.length){ h+='<div class="pm-box"><h5>✅ 好的点</h5><ul class="pm-list">'+s.good.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul></div>'; }
  if(s.bad&&s.bad.length){ h+='<div class="pm-box"><h5>❌ 不好的点</h5><ul class="pm-list">'+s.bad.map(function(b){return '<li style="color:var(--red)">'+esc(b)+'</li>';}).join('')+'</ul></div>'; }
  h+='</div><div class="pm-right">';
  // 精准建议（问题 → 行动）
  h+='<div class="pm-box"><h5>🎯 诊断 & 行动（按这个品的实际数据）</h5>';
  if(s.problems&&s.problems.length){ h+='<div class="pm-note">'+(s.problems.map(function(p){return '<div>🔴 '+esc(p)+'</div>';}).join(''))+'</div>'; }
  h+='<div class="pm-note mt8">'+(s.actions&&s.actions.length?s.actions.map(function(a){return '<div>✅ '+esc(a)+'</div>';}).join(''):'')+'</div>';
  h+='</div>';
  var pb=s.playbook||{};
  h+='<div class="pm-box"><h5>🎯 品类打法（市场定位 + 具体动作 + 对标谁）</h5><div class="pm-note">'+
    '<div><b>市场定位</b>：'+esc(pb.positioning||adv.focus||'')+'</div>'+
    '<div class="mt8"><b>打法</b>：'+((pb.moves&&pb.moves.length)?pb.moves.map(function(m){return '<div style="color:var(--blue)">· '+esc(m)+'</div>';}).join(''):esc(adv.img||''))+'</div>'+
    ((pb.benchmark)?'<div class="mt8"><b>对标</b>：'+esc(pb.benchmark)+'</div>':'')+
  '</div></div>';
  if(s.cat_type==='maca'||s.cat_type==='detox'){
    h+='<div class="pm-box"><h5>⚠️ 合规提醒</h5><div class="insight danger">该品属于壮阳/减肥擦边品类，虽出商机但平台合规风险高。建议按「主攻点」改名为植物草本/消化健康等合规表述，既保商机又避处罚。</div></div>';
  }
  h+='</div></div></div>';
  ov.innerHTML=h;
  document.body.appendChild(ov);
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
}

/* ---------- 备注持久化（预填 AI 建议）---------- */
function note(key){
  var v = localStorage.getItem('v4note_'+key);
  if(v===null || v===''){ v = (D.section_notes && D.section_notes[key]) || ''; }
  return v;
}
function noteBox(key){
  return '<div class="note-box"><div class="note-label">本板块备注（团队共写·实时保存）</div>'+
    '<textarea data-note="'+key+'" oninput="saveNote(this)">'+esc(note(key))+'</textarea></div>';
}
function saveNote(el){ localStorage.setItem('v4note_'+el.getAttribute('data-note'), el.value); }

var SELECTED_WEEK = -1; // -1 = 最新周
var SELECTED_MONTH = -1; // -1 = 最新完整月

function wowOf(w, key){ return (w && w.wow) ? w.wow[key] : null; }
function weekToFunnel(w){
  return [
    {key:'se_imps',label:'搜索曝光',cur:w.se_imps,prev:null,wow:wowOf(w,'se_imps'),rival_avg:w.se_imps_ra,rival_good:w.se_imps_rg,unit:''},
    {key:'se_clk',label:'搜索点击',cur:w.se_clk,prev:null,wow:wowOf(w,'se_clk'),rival_avg:w.se_clk_ra,rival_good:w.se_clk_rg,unit:''},
    {key:'se_ctr',label:'搜索点击率',cur:w.se_ctr,fmt:'pct',wow:wowOf(w,'se_ctr'),rival_avg:w.se_ctr_ra,rival_good:w.se_ctr_rg,unit:'%'},
    {key:'total_imps',label:'全店曝光',cur:w.total_imps,wow:wowOf(w,'total_imps'),rival_avg:w.total_imps_ra,rival_good:w.total_imps_rg,unit:''},
    {key:'camp_imps',label:'广告曝光',cur:w.camp_imps,wow:wowOf(w,'camp_imps'),rival_avg:w.camp_imps_ra,rival_good:w.camp_imps_rg,unit:''},
    {key:'camp_clk',label:'广告点击',cur:w.camp_clk,wow:wowOf(w,'camp_clk'),rival_avg:w.camp_clk_ra,rival_good:w.camp_clk_rg,unit:''},
    {key:'opp',label:'商机(询盘+TM)',cur:(w.fb_cnt||0)+(w.fb_tm_uv||0),wow:wowOf(w,'fb_cnt'),unit:'',note:'询盘 '+num(w.fb_cnt)+' + TM '+num(w.fb_tm_uv)},
    {key:'fb_cnt',label:'询盘个数',cur:w.fb_cnt,wow:wowOf(w,'fb_cnt'),unit:''},
    {key:'fb_tm_uv',label:'TM咨询人数',cur:w.fb_tm_uv,wow:wowOf(w,'fb_tm_uv'),unit:''},
    {key:'uv_cnt',label:'访客',cur:w.uv_cnt,wow:wowOf(w,'uv_cnt'),rival_good:w.uv_cnt_rg,unit:''},
    {key:'uv_ab_rate',label:'跳失率',cur:w.uv_ab_rate,fmt:'pct',wow:wowOf(w,'uv_ab_rate'),rival_avg:w.uv_ab_rate_ra,rival_good:w.uv_ab_rate_rg,unit:'%',lower_better:true},
    {key:'suc_byr_cnt',label:'成交买家',cur:w.suc_byr_cnt,wow:wowOf(w,'suc_byr_cnt'),rival_good:w.suc_byr_cnt_rg,unit:'人'},
    {key:'uv_payord_rate',label:'访客成交率',cur:w.uv_payord_rate,fmt:'pct',wow:wowOf(w,'uv_payord_rate'),rival_avg:w.uv_payord_ra,rival_good:w.uv_payord_rg,unit:'%'},
    {key:'suc_ord_cnt',label:'下单',cur:w.suc_ord_cnt,wow:wowOf(w,'suc_ord_cnt'),rival_avg:w.suc_ord_cnt_ra,rival_good:w.suc_ord_cnt_rg,unit:'单'},
    {key:'suc_ord_amt',label:'GMV',cur:w.suc_ord_amt,wow:wowOf(w,'suc_ord_amt'),rival_avg:w.suc_ord_amt_ra,rival_good:w.suc_ord_amt_rg,unit:'$',fmt:'money'},
  ];
}
function weekToBearing(w){
  return [
    {key:'avg_reply_time',label:'平均回复时长',cur:w.avg_reply,unit:'h',lower_better:true},
    {key:'fst5min',label:'极速回复率(5min)',cur:w.fst5min,fmt:'pct',unit:'%'},
    {key:'fst_reply',label:'及时回复率',cur:w.fst_reply,fmt:'pct',unit:'%'},
  ];
}
function selectedWeek(){
  var arr=D.weeks||[];
  if(!arr.length) return null;
  if(SELECTED_WEEK<0 || SELECTED_WEEK===arr.length-1) return null;
  return arr[SELECTED_WEEK];
}
function selectedMonth(){
  var arr=D.months||[];
  if(!arr.length) return D.monthly;
  if(SELECTED_MONTH<0 || SELECTED_MONTH===arr.length-1) return arr[arr.length-1];
  return arr[SELECTED_MONTH];
}
function monthToFunnel(M){
  return [
    {key:'se_imps',label:'搜索曝光',cur:M.se_imps,wow:wowOf(M,'se_imps'),rival_avg:M.se_imps_ra,rival_good:M.se_imps_rg,unit:''},
    {key:'se_clk',label:'搜索点击',cur:M.se_clk,wow:wowOf(M,'se_clk'),rival_avg:M.se_clk_ra,rival_good:M.se_clk_rg,unit:''},
    {key:'se_ctr',label:'搜索点击率',cur:M.se_ctr,fmt:'pct',wow:wowOf(M,'se_ctr'),rival_avg:M.se_ctr_ra,rival_good:M.se_ctr_rg,unit:'%'},
    {key:'total_imps',label:'全店曝光',cur:M.total_imps,wow:wowOf(M,'total_imps'),rival_avg:M.total_imps_ra,rival_good:M.total_imps_rg,unit:''},
    {key:'camp_imps',label:'广告曝光',cur:M.camp_imps,wow:wowOf(M,'camp_imps'),rival_avg:M.camp_imps_ra,rival_good:M.camp_imps_rg,unit:''},
    {key:'camp_clk',label:'广告点击',cur:M.camp_clk,wow:wowOf(M,'camp_clk'),rival_avg:M.camp_clk_ra,rival_good:M.camp_clk_rg,unit:''},
    {key:'opp',label:'商机(询盘+TM)',cur:M.opp,wow:wowOf(M,'opp'),rival_avg:M.ab_cnt_ra,rival_good:M.ab_cnt_rg,unit:'',note:'询盘 '+num(M.fb_cnt)+' + TM '+num(M.fb_tm_uv)},
    {key:'fb_cnt',label:'询盘个数',cur:M.fb_cnt,wow:wowOf(M,'fb_cnt'),rival_avg:M.fb_cnt_ra,rival_good:M.fb_cnt_rg,unit:''},
    {key:'fb_tm_uv',label:'TM咨询人数',cur:M.fb_tm_uv,wow:wowOf(M,'fb_tm_uv'),rival_avg:M.fb_tm_ra,rival_good:M.fb_tm_rg,unit:''},
    {key:'uv_cnt',label:'访客',cur:M.uv_cnt,wow:wowOf(M,'uv_cnt'),rival_avg:M.uv_cnt_ra,rival_good:M.uv_cnt_rg,unit:''},
    {key:'uv_ab_rate',label:'跳失率',cur:M.uv_ab_rate,fmt:'pct',wow:wowOf(M,'uv_ab_rate'),rival_avg:M.uv_ab_ra,rival_good:M.uv_ab_rg,unit:'%',lower_better:true},
    {key:'suc_byr_cnt',label:'成交买家',cur:M.suc_byr_cnt,wow:wowOf(M,'suc_byr_cnt'),rival_avg:M.suc_byr_ra,rival_good:M.suc_byr_rg,unit:'人'},
    {key:'uv_payord_rate',label:'访客成交率',cur:M.uv_payord_rate,fmt:'pct',wow:wowOf(M,'uv_payord_rate'),rival_avg:M.uv_payord_ra,rival_good:M.uv_payord_rg,unit:'%'},
    {key:'suc_ord_cnt',label:'下单',cur:M.suc_ord_cnt,wow:wowOf(M,'suc_ord_cnt'),rival_avg:M.suc_ord_cnt_ra,rival_good:M.suc_ord_cnt_rg,unit:'单'},
    {key:'suc_ord_amt',label:'GMV',cur:M.suc_ord_amt,wow:wowOf(M,'suc_ord_amt'),rival_avg:M.suc_ord_amt_ra,rival_good:M.suc_ord_amt_rg,unit:'$',fmt:'money'},
  ];
}
function getFunnel(){
  if(PERIOD==='month') return monthToFunnel(selectedMonth()||D.monthly||{});
  var w=selectedWeek();
  return w ? weekToFunnel(w) : (D.funnel||[]);
}
function getBearing(){
  if(PERIOD==='month' && D.monthly){
    var M=selectedMonth()||D.monthly;
    return [
      {key:'avg_reply_time',label:'平均回复时长',cur:M.avg_reply_time,unit:'h',lower_better:true},
      {key:'fst5min',label:'极速回复率(5min)',cur:M.fst5min,fmt:'pct',unit:'%'},
      {key:'fst_reply',label:'及时回复率',cur:M.fst_reply_rate,fmt:'pct',unit:'%'},
    ];
  }
  var w=selectedWeek();
  return w ? weekToBearing(w) : (D.bearing||[]);
}

/* ============ 周期看板 ============ */
function renderPeriod(){
  var el = document.getElementById('panel-period');
  var m = D.meta||{};
  var _sm = PERIOD==='month' ? selectedMonth() : null;
  var _sw = PERIOD==='week' ? selectedWeek() : null;
  var periodLabel = _sm ? _sm.month_label : (_sw ? (_sw.week_start+' ~ '+_sw.week_end) : m.week_label);
  var h = '';
  // 一、店铺漏斗
  if(PERIOD==='month' && D.monthly_mtd){
    h += '<div class="insight warn">⚠ 本月（'+esc(D.monthly_mtd.month_label)+'）为 MTD 未完成，数据不完整不可用。以下展示上一完整自然月 '+esc(periodLabel)+'。</div>';
  }
  h += '<div class="section-title">| 一、店铺漏斗 <span class="sub">'+esc(periodLabel)+'</span></div>';
  h += '<div class="card"><div class="kpi-grid">';
  var fun = getFunnel();
  fun.forEach(function(f){
    h += '<div class="kpi"><div class="k-label">'+esc(f.label)+'</div>';
    h += '<div class="k-val">'+fmt(f.fmt,f.cur)+'<small>'+(f.unit?' '+esc(f.unit):'')+'</small></div>';
    if(f.note) h += '<div class="k-meta"><span class="muted small">'+esc(f.note)+'</span></div>';
    h += '<div class="k-meta">'+wowHtml(f.wow)+'<span class="gap">'+gapHtml(f.cur,f.rival_avg,f.rival_good,f.lower_better)+'</span></div></div>';
  });
  h += '</div></div>';

  // 二、承接效率
  h += '<div class="section-title">| 二、承接效率 <span class="sub">回复三项 vs 同行优秀/平均</span></div>';
  h += '<div class="card"><div class="kpi-grid">';
  getBearing().forEach(function(b){
    var bad = b.lower_better ? (b.cur > b.rival_avg) : (b.cur < b.rival_avg);
    var dot = bad ? '<span class="dot red"></span>未达标' : '<span class="dot green"></span>达标';
    h += '<div class="kpi"><div class="k-label">'+dot+' '+esc(b.label)+'</div>';
    h += '<div class="k-val">'+fmt(b.fmt,b.cur)+'</div>';
    h += '<div class="k-meta"><span class="gap">'+gapHtml(b.cur,b.rival_avg,b.rival_good,b.lower_better)+'</span></div></div>';
  });
  h += '</div></div>';

  // 客服接待质量 by 子账号
  h += renderStaff();

  // 三、店铺健康 + 降星预警
  h += renderHealth();

  // 榜单
  h += renderList('四、⭐ 上升趋势·零花费榜','有商机 + 点击好 + 没给广告预算 → 优先接预算','zero_cost','zero');
  h += renderList('五、💰 高效低耗榜','零花费但有商机 → 单商机成本最低的一批','high_eff_low_cost','eff');
  h += renderList('六、商机榜 Top50','询盘+TM 合并的商机榜，按商机量排序','opp','opp');
  h += renderList('七、💬 TM商机榜','纯 TM 咨询（无询盘）也是商机，主动跟进转报价成交','tm','tm');
  h += renderList('八、点击率榜 Top20','搜索点击≥4过滤噪音；高CTR+0商机=主图勾人但详情没转化','ctr','ctr');
  h += renderNewProduct();

  // 广告拆解
  h += renderAd();

  // 国家地区
  h += renderCountry();

  // 市场机会
  h += renderMarket();

  // 流量渠道
  h += renderChannel();

  // 买家 L1+
  h += renderBuyerL1();

  // 0效果产品
  h += renderZeroEffect();

  // 本期总结
  h += renderSummary();

  el.innerHTML = h;
}

function funnelVal(key){ var f=(D.funnel||[]).find(function(x){return x.key===key}); return f? f.cur : null; }

/* ---------- 客服子账号 ---------- */
function renderStaff(){
  var s=D.staff_cs||[];
  var avg5=D.store_avg_5min, avgR=D.store_avg_reply;
  var h='<div class="section-title">客服接待质量 · 按子账号 <span class="sub">回复三项低于本店均值/达标线的标红，附下一步建议</span></div>';
  h+='<div class="card"><div class="tbl-scroll"><table><thead><tr>'+
    '<th>客服(子账号)</th><th class="num">TM接待</th><th class="num">询盘PV</th><th class="num">成交($)</th><th class="num">成交单</th>'+
    '<th class="num">极速回复率</th><th class="num">及时回复率</th><th class="num">平均回复时长</th><th class="num">商机→成交</th>'+
    '<th>超12h未回</th><th>预警 & 下一步建议</th></tr></thead><tbody>';
  s.forEach(function(x){
    var bad5 = x.fst5min!=null && x.fst5min < avg5;
    var badR = x.avg_reply!=null && x.avg_reply > avgR;
    var sug=''; var parts=[];
    // 按具体数据给建议
    if(x.rcvd_amt>0 && x.bus_to_ord!=null && x.bus_to_ord < 2){ parts.push('成交 '+money(x.rcvd_amt)+' 但商机转化率仅 '+pct(x.bus_to_ord)+'，把「怎么聊到成交」沉淀成话术SOP，复制给零成交的同事'); }
    else if(x.rcvd_amt>0){ parts.push('达标（成交 '+money(x.rcvd_amt)+' '+num(x.order_cnt)+'单），是团队转化标杆，带教零成交成员'); }
    else if(x.tm>=40){ parts.push('TM接待 '+num(x.tm)+' 次却 0 成交——不是没商机，是跟单没闭环，逐条复盘卡在报价/MOQ/样品哪一步'); }
    else { parts.push('商机量少('+num(x.tm)+')，先保承接速度'); }
    if(bad5) parts.push('极速回复 '+pct(x.fst5min)+' 远低于店均 '+pct(avg5)+'，挂 30s 欢迎语+AI首响');
    if(badR) parts.push('平均回复 '+x.avg_reply+'h 过慢，开强提醒，目标压到 '+avgR+'h 内');
    if(x.over12h>0) parts.push('超12h未回 '+x.over12h+' 次=直接丢商机，设交接机制');
    sug=parts.join('；');
    var statusCls = (bad5||badR||x.over12h>0)? 'red':'green';
    h+='<tr><td><div class="thumb-cell">'+pimg(x.avatar)+'<b>'+esc(x.name)+'</b></div></td>'+
      '<td class="num">'+num(x.tm)+'</td><td class="num">'+num(x.fb_pv)+'</td><td class="num">'+money(x.rcvd_amt)+'</td><td class="num">'+num(x.order_cnt)+'</td>'+
      '<td class="num '+(bad5?'red':'')+'">'+pct(x.fst5min)+'</td>'+
      '<td class="num">'+pct(x.reply_rate)+'</td>'+
      '<td class="num '+(badR?'red':'')+'">'+(x.avg_reply!=null? x.avg_reply+'h':'—')+'</td>'+
      '<td class="num">'+pct(x.bus_to_ord)+'</td>'+
      '<td class="num '+(x.over12h>0?'red':'')+'">'+num(x.over12h)+'</td>'+
      '<td class="'+statusCls+'">'+esc(sug)+'</td></tr>';
  });
  h+='</tbody></table></div>';
  h+='<div class="insight">行业基准对标：全店极速回复率 '+pct(avg5)+' vs 同行平均 '+pct(bearingVal('fst5min','rival_avg'))+' / 同行优秀 '+pct(bearingVal('fst5min','rival_good'))+'。行动：①高峰启用AI 30s欢迎语 ②给标红客服设个人回复KPI ③开启强提醒避免漏消息。</div>';
  h+=noteBox('staff');
  h+='</div>';
  return h;
}
function bearingVal(key, field){ var b=(D.bearing||[]).find(function(x){return x.key===key}); return b? b[field]: null; }

/* ---------- 店铺健康 ---------- */
function renderHealth(){
  var hh=D.health||{};
  var sr=D.star_rating||null;
  var h='<div class="section-title">| 三、店铺健康（星等级 / 产品分层）</div>';
  h+='<div class="card"><div class="grid2">';
  // 星等级（真实数据）
  if(sr){
    var tr0 = (sr.tracks||[])[0] || {};
    var tr1 = (sr.tracks||[])[1] || {};
    var alert = tr0.alert||{};
    var stars = '';
    for(var s=0;s<(sr.level_star||0);s++) stars+='★';
    for(var s=sr.level_star||0;s<5;s++) stars+='☆';
    h+='<div><h4>本月星等级</h4><div class="k-val" style="color:#e8a200">'+stars+' <small style="font-size:14px">'+sr.level_star+'星</small></div>'+
       '<div class="mt8">'+(alert.down? '<span class="tag danger">⚠ 预测降星</span>' : '<span class="tag good">✓ 预测保星（'+esc(alert.title||'')+'）</span>')+'</div></div>';
    // 综合分进度
    h+='<div><h4>星等级综合分（'+esc(tr0.track_name||'')+'）</h4><div class="flex"><div class="progress-bar" style="max-width:100%;height:10px"><i style="width:'+(tr0.progress?tr0.progress.position:0)+'%"></i></div><b>'+esc(tr0.progress?tr0.progress.text:'')+'</b></div>';
    if(tr1.progress) h+='<div class="small muted mt8">'+esc(tr1.track_name)+'：'+esc(tr1.progress.text)+'（位置 '+tr1.progress.position+'）</div>';
    // 短板
    if((alert.indicators||[]).length){
      h+='<div class="insight danger mt8"><b>降星短板</b>：';
      alert.indicators.forEach(function(ai){ h+='<span class="tag danger">'+esc(ai.name)+' '+num(ai.value)+'（'+(ai.score_delta>0?'+':'')+Math.round(ai.score_delta)+'分）</span> '; });
      h+='</div>';
    }
    // 能力项达标
    if((tr0.indicators||[]).length){
      h+='<div class="small mt8">';
      tr0.indicators.forEach(function(i){ h+='<div>'+(i.completed?'<span class="dot green"></span>':'<span class="dot red"></span>')+esc(i.title)+' <span class="muted">（当前 '+esc(i.current)+' vs 门槛 '+esc(i.threshold)+'）</span></div>'; });
      h+='</div>';
    }
  } else {
    h+='<div><h4>本月星等级</h4><div class="k-val"><span class="muted">未接入</span></div><div class="insight danger">星等级数据未接入（icbu-starrating 接口未返回）。</div></div>';
  }
  // 产品分层
  h+='<div><h4>产品分层（'+num(hh.valid_cnt)+' 在架）</h4><div class="kpi-grid">';
  (hh.levels||[]).forEach(function(l){
    h+='<div class="kpi"><div class="k-label">'+esc(l.label)+'</div><div class="k-val">'+num(l.count)+'</div></div>';
  });
  h+='</div><div class="mt8 small muted">有询盘产品 '+num(hh.inquiry_products)+' · 零询盘产品 '+num(hh.zero_inquiry)+'（'+pct(hh.zero_inquiry/hh.valid_cnt)+'）</div></div>';
  h+='</div>';
  h+=noteBox('health');
  h+='</div>';
  return h;
}

/* ---------- 榜单通用渲染 ---------- */
function renderList(title, sub, key, noteKey){
  var items=D.lists[key]||[];
  var h='<div class="section-title">'+title+' <span class="sub">'+sub+'</span></div>';
  // 类目筛选
  var cats={}; items.forEach(function(p){ if(p.category) cats[p.category]=1; });
  var catList=Object.keys(cats);
  var fid='filter_'+noteKey;
  h+='<div class="card">';
  if(catList.length){
    h+='<div class="flex mb8"><select id="'+fid+'" onchange="renderListBody(\''+noteKey+'\')" style="padding:4px"><option value="">类目：全部</option>'+
      catList.map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select><span class="muted small">共 '+items.length+' 品</span></div>';
  }
  h+='<div class="tbl-scroll"><table><thead><tr>'+
    '<th>#</th><th>产品</th><th class="num">搜索曝光</th><th class="num">搜索点击</th><th class="num">点击率</th><th class="num">商机</th><th class="num">广告曝光</th><th class="num">广告点击</th><th>AI评分</th><th>判定</th><th>建议（按品定制）</th></tr></thead><tbody id="body_'+noteKey+'"></tbody></table></div>';
  h+=noteBox(noteKey)+'</div>';
  window['_listItems_'+noteKey]=items;
  setTimeout(function(){ renderListBody(noteKey); }, 0);
  return h;
}
function renderListBody(noteKey){
  var body=document.getElementById('body_'+noteKey);
  if(!body) return;
  var items=window['_listItems_'+noteKey]||[];
  var fc=(document.getElementById('filter_'+noteKey)||{}).value||'';
  var list=items.filter(function(p){ return !fc || p.category===fc; });
  var h='';
  list.slice(0,50).forEach(function(p,i){
    var s=scoreOf(p.product_id);
    h+='<tr><td>'+(i+1)+'</td>'+
      '<td><div class="thumb-cell">'+pimg(p.main_image)+'<div><div class="t" title="'+esc(p.title)+'">'+esc(p.title)+'</div><div class="pid">'+esc(p.category||'')+' · '+esc(p.product_id)+'</div></div></div></td>'+
      '<td class="num">'+num(p.impressions)+'</td><td class="num">'+num(p.clicks)+'</td><td class="num">'+pct(p.ctr)+'</td>'+
      '<td class="num">'+num(p.opp)+'</td><td class="num">'+num(p.ad_imps)+'</td><td class="num">'+num(p.ad_clk)+'</td>'+
      '<td>'+gradeTag(s)+'</td>'+
      '<td>'+tag(p.label,p.label_typ)+' '+tag(p.ad_label,p.ad_typ)+'</td>'+
      '<td class="small">'+(s?conciseAdvice(s):esc(p.sug))+'</td></tr>';
  });
  body.innerHTML=h;
}

/* ---------- 新品追踪 ---------- */
function dimMini(s){
  if(!s || !s.dims) return '';
  var out=[];
  s.dims.forEach(function(d){
    if(d.level==='好') out.push('<span class="tag good">'+esc(d.name)+'好</span>');
  });
  s.dims.forEach(function(d){
    if(d.level==='差'||d.level==='风险') out.push('<span class="tag danger">'+esc(d.name)+d.level+'</span>');
  });
  return out.join(' ');
}
function renderNewProduct(){
  var items=D.lists.new_product||[];
  var h='<div class="section-title">九、🆕 AI 新品追踪 Top50 <span class="sub">每个新品的五维评分：AI识别/B2B转化/流量/广告/合规，哪里好哪里差一目了然</span></div>';
  h+='<div class="card"><div class="tbl-scroll"><table><thead><tr>'+
    '<th>#</th><th>新品</th><th>AI评分</th><th>好/差维度（细颗粒度）</th><th class="num">点击</th><th class="num">CTR</th><th class="num">询盘</th><th>状态</th></tr></thead><tbody>';
  items.forEach(function(p,i){
    var s=scoreOf(p.product_id);
    h+='<tr><td>'+(i+1)+'</td>'+
      '<td><div class="thumb-cell">'+pimg(p.main_image)+'<div><div class="t">'+esc(p.title)+'</div><div class="pid">'+esc(p.product_id)+'</div></div></div></td>'+
      '<td>'+gradeTag(s)+'</td>'+
      '<td class="small">'+dimMini(s)+'</td>'+
      '<td class="num">'+num(p.clicks)+'</td><td class="num">'+pct(p.ctr)+'</td><td class="num">'+num(p.inquiries)+'</td>'+
      '<td>'+tag(p.status,p.sty)+'</td></tr>';
  });
  h+='</tbody></table></div>';
  h+='<div class="muted small">点评分标签看完整五维雷达（每个维度打分+原因+精准行动）。这是 AI 新品追踪的核心：不只看"跑没跑出来"，看"卡在哪个维度"。</div>';
  h+=noteBox('newprod')+'</div>';
  return h;
}

/* ---------- 广告拆解（真实计划层）---------- */
function renderAd(){
  var ap=D.ad_plans||null;
  var h='<div class="section-title">| 广告花费拆解 <span class="sub">账户总览 + 计划层逐个判定</span></div>';
  if(!ap || !ap.account){ 
    h+='<div class="card"><div class="muted">广告计划层数据未接入（需运行广告数据拉取）。</div>'+noteBox('ad')+'</div>'; return h;
  }
  var a=ap.account;
  h+='<div class="card">';
  h+='<div class="kpi-grid">'+
    '<div class="kpi"><div class="k-label">本周广告花费</div><div class="k-val">¥'+num(a.spend)+'</div></div>'+
    '<div class="kpi"><div class="k-label">点击 / 曝光</div><div class="k-val">'+num(a.clicks)+'<small> / '+num(a.impressions)+'</small></div></div>'+
    '<div class="kpi"><div class="k-label">点击成本 CPC</div><div class="k-val">¥'+num(a.cpc)+'</div></div>'+
    '<div class="kpi"><div class="k-label">商机量</div><div class="k-val">'+num(a.opp_cnt)+'<small>（L1+ '+num(a.l1_opp)+'）</small></div></div>'+
    '<div class="kpi"><div class="k-label">单商机成本</div><div class="k-val">¥'+num(a.cpl)+'</div></div>'+
    '<div class="kpi"><div class="k-label">商机转化率</div><div class="k-val">'+num(a.opp_rate)+'%</div></div>'+
    '<div class="kpi"><div class="k-label">TM / 询盘 / 订单</div><div class="k-val">'+num(a.tm)+'<small> / '+num(a.inquiry)+' / '+num(a.orders)+'</small></div></div>'+
  '</div>';
  h+='<div class="insight info">'+(ap.search_note||'')+'。单询盘成本 = ¥'+num(a.spend)+' ÷ '+num(a.inquiry)+' 询盘 ≈ ¥'+num(Math.round(a.spend/Math.max(1,a.inquiry)))+'，单商机成本 ¥'+num(a.cpl)+'。</div>';
  // 计划层判定表
  h+='<div class="tbl-scroll"><table><thead><tr><th>计划</th><th class="num">花费</th><th class="num">点击</th><th class="num">CPC</th><th class="num">CTR</th><th class="num">商机</th><th class="num">单商机成本</th><th class="num">L1+占比</th><th class="num">TM/询盘/单</th><th>判定</th><th>建议</th></tr></thead><tbody>';
  (ap.campaigns||[]).forEach(function(c){
    h+='<tr><td><div><b>'+esc(c.name)+'</b></div><div class="pid">'+esc(c.id)+' · 预算¥'+num(c.budget)+' · '+num(c.products)+'品</div></td>'+
      '<td class="num">¥'+num(c.spend)+'</td><td class="num">'+num(c.clicks)+'</td><td class="num">¥'+num(c.cpc)+'</td><td class="num">'+num(c.ctr)+'%</td>'+
      '<td class="num">'+num(c.opp_cnt)+'</td><td class="num">¥'+num(c.cpl)+'</td><td class="num">'+num(c.l1_ratio)+'%</td>'+
      '<td class="num">'+num(c.tm)+' / '+num(c.inquiry)+' / '+num(c.orders)+'</td>'+
      '<td>'+tag(c.judgment,c.judgment_type)+'</td><td class="muted">'+esc(c.suggestion)+'</td></tr>';
  });
  h+='</tbody></table></div>'+noteBox('ad')+'</div>';
  return h;
}

/* ---------- 国家地区分析（行业 + 我的） ---------- */
function renderCountry(){
  var vs=D.v4_sections||null;
  var cm = (vs && vs.country_merged) || [];
  var h='<div class="section-title">| 国家/地区效果 <span class="sub">行业需求/增速/供需 × 我的转化，看出该地区值不值得做、我做得怎么样</span></div>';
  if(!cm.length){ h+='<div class="card"><div class="muted">国家地区数据未接入。</div></div>'; return h; }
  var top=cm[0];
  var hot=cm.filter(function(c){return (c.ind_yoy||0)>30;});
  var behind=cm.filter(function(c){return c.vcls==='danger' && c.my_uv>=10;});
  h+='<div class="card">';
  h+='<div class="insight"><b>行业最大市场 '+esc(top.country)+'</b>（询盘 '+num(top.ind_ab)+'，供需比 '+num(top.ind_sd)+'）。'+
    (hot.length?'<span style="color:var(--green)"><b>高增长国家</b>：'+hot.slice(0,4).map(function(c){return esc(c.country)+' +'+num(c.ind_yoy)+'%';}).join('、')+'。</span>':'')+
    (behind.length?'<span style="color:var(--red)"><b>行业热但我转化落后</b>：'+behind.slice(0,4).map(function(c){return esc(c.country)+'（行业转化'+num(c.ind_dab)+'% vs 我'+num(c.my_conv)+'%）';}).join('、')+'。</span>':'')+
  '</div>';
  h+='<div class="tbl-scroll"><table><thead><tr><th>国家</th><th class="num">行业询盘</th><th class="num">增速</th><th class="num">供需比</th><th class="num">行业转化</th><th class="num">我的访客</th><th class="num">我的商机率</th><th>判定</th></tr></thead><tbody>';
  cm.slice(0,15).forEach(function(c){
    var sdCls = (c.ind_sd||0)>=70 ? 'green' : '';
    h+='<tr><td><b>'+esc(c.country)+'</b></td><td class="num">'+num(c.ind_ab)+'</td><td class="num '+(c.ind_yoy>0?'green':'red')+'">'+(c.ind_yoy>0?'+':'')+num(c.ind_yoy)+'%</td><td class="num '+sdCls+'">'+num(c.ind_sd)+'</td><td class="num">'+num(c.ind_dab)+'%</td><td class="num">'+num(c.my_uv)+'</td><td class="num">'+num(c.my_conv)+'%</td><td>'+tag(c.verdict,c.vcls)+'</td></tr>';
  });
  h+='</tbody></table></div>';
  h+='<div class="muted small">供需比>70=供不应求（蓝海）；行业转化是该国保健食品类目平均商机率，与「我的商机率」对比即知我是否落后于行业。</div>';
  h+=noteBox('country')+'</div>';
  return h;
}

/* ---------- 市场机会产品推荐（过滤擦边 + 带图） ---------- */
function renderMarket(){
  var vs=D.v4_sections||null;
  var hp = (vs && vs.hot_products_clean) || [];
  var banned = (vs && vs.banned_count) || 0;
  var kw = (vs && vs.keywords) || [];
  var hc=D.hot_categories||[];
  var h='<div class="section-title">| 市场机会·产品推荐 <span class="sub">已过滤玛卡/壮阳/减肥等擦边 C 端，只留合规 B 端品，带图</span></div>';
  h+='<div class="card">';
  if(banned>0){
    h+='<div class="insight warn">已过滤 '+banned+' 个擦边/减肥 C 端热销品（玛卡壮阳、私处紧致、丰臀、减肥胶囊等）。行业热销榜被这类词霸占，你避开它们本身就是差异化和合规护城河。</div>';
  }
  if(hc.length){
    h+='<div class="insight"><b>高增长类目</b>：';
    hc.forEach(function(c){ h+='<span class="tag '+(c.inquiry_yoy>20?'good':'neutral')+'">'+esc(c.name)+' +'+num(c.inquiry_yoy)+'% · 供需比 '+num(c.supply_demand)+'</span> '; });
    h+='</div>';
  }
  // 热销品（带图）
  if(hp.length){
    h+='<div class="grid3">';
    hp.slice(0,18).forEach(function(p){
      h+='<div class="prod-card"><div class="thumb">'+(p.image? '<img src="'+esc(p.image)+'" loading="lazy" onerror="this.style.display=\'none\'">':'<div class="noimg">无图</div>')+'</div>'+
        '<div class="t small">'+esc((p.title||'').slice(0,55))+'</div>'+
        '<div class="muted small">'+esc(p.category||'')+'</div></div>';
    });
    h+='</div>';
  }
  h+=noteBox('market')+'</div>';
  return h;
}

/* ---------- 流量渠道结构 ---------- */
function renderChannel(){
  var vs=D.v4_sections||null;
  var ch=(vs&&vs.channels)||[];
  var h='<div class="section-title">| 流量渠道结构 <span class="sub">四类流量占比 + 各自商机率，看流量是否健康</span></div>';
  if(!ch.length){ h+='<div class="card"><div class="muted">渠道数据未接入。</div></div>'; return h; }
  var best=null; ch.forEach(function(c){ if(!best||c.ab_rate>best.ab_rate) best=c; });
  var tot=0; ch.forEach(function(c){ tot+=c.uv; });
  h+='<div class="card">';
  h+='<div class="insight">本周流量 '+num(tot)+' 访客。四渠道：'+ch.map(function(c){return esc(c.channel)+' '+num(c.share)+'%';}).join(' / ')+'。<b>商机率最高的是 '+esc(best.channel)+'（'+num(best.ab_rate)+'%）</b>——这是高质量流量，值得深挖。'+
    '搜索'+num(ch.length?ch[0].share:0)+'%+自增'+num(ch.length>1?ch[1].share:0)+'% 是自然基本盘（约67%），广告依赖度尚可；场景（含全站推广告）'+num(ch.length>2?ch[2].share:0)+'% 在成长。</div>';
  h+='<div class="tbl-scroll"><table><thead><tr><th>渠道</th><th class="num">访客</th><th class="num">占比</th><th class="num">商机率</th><th>解读</th></tr></thead><tbody>';
  ch.forEach(function(c){
    var lab = c.ab_rate>=20 ? '优质流量' : (c.ab_rate>=10?'正常':'低效·排查');
    var cls = c.ab_rate>=20?'good':(c.ab_rate>=10?'neutral':'warn');
    h+='<tr><td><b>'+esc(c.channel)+'</b></td><td class="num">'+num(c.uv)+'</td><td class="num">'+num(c.share)+'%</td><td class="num">'+num(c.ab_rate)+'%</td><td>'+tag(lab,cls)+'</td></tr>';
  });
  h+='</tbody></table></div>'+noteBox('channel')+'</div>';
  return h;
}

/* ---------- 买家 L1+ 分层 ---------- */
function renderBuyerL1(){
  var vs=D.v4_sections||null;
  var bi=(vs&&vs.buyer_ident)||[];
  var cl=(vs&&vs.country_l1)||[];
  var h='<div class="section-title">| 买家 L1+ 分层 <span class="sub">L1+=近180天有下单能力的高价值买家，看流量质量</span></div>';
  h+='<div class="card">';
  if(bi.length){
    h+='<div class="insight">买家身份：'+bi.map(function(x){return esc(x.ident)+' '+num(x.all_rate)+'%';}).join(' / ')+'。<b>B端（零售商+批发商+制造商）占比 '+(bi.reduce(function(s,x){return s+(x.ident!=='线上零售商'||x.ident==='线上零售商'?0:0);},0), bi.length?num(Math.round(bi.reduce(function(s,x){return s+x.all_rate;},0))):'')+'%</b>，是健康 B2B 结构。</div>';
  }
  if(bi.length){
    h+='<div class="tbl-scroll"><table><thead><tr><th>买家身份</th><th class="num">全部买家占比</th><th class="num">L1+ 占比</th></tr></thead><tbody>';
    bi.forEach(function(x){
      h+='<tr><td>'+esc(x.ident)+'</td><td class="num">'+num(x.all_rate)+'%</td><td class="num">'+(x.l1_rate!=null?num(x.l1_rate)+'%':'—')+'</td></tr>';
    });
    h+='</tbody></table></div>';
  }
  if(cl.length){
    h+='<h4>L1+ 高价值买家国家分布（vs 全部）</h4>';
    h+='<div class="tbl-scroll"><table><thead><tr><th>国家</th><th class="num">全部占比</th><th class="num">L1+占比</th><th>质量</th></tr></thead><tbody>';
    cl.forEach(function(x){
      var l1share = x.l1_rate!=null ? x.l1_rate : 0;
      var q = l1share>0 && x.all_rate>0 && (l1share >= x.all_rate*1.1) ? 'L1+富集·高质量' : (l1share>0?'正常':'样本少');
      var qc = q==='L1+富集·高质量'?'good':'neutral';
      h+='<tr><td><b>'+esc(x.name)+'</b></td><td class="num">'+num(x.all_rate)+'%</td><td class="num">'+num(l1share)+'%</td><td>'+tag(q,qc)+'</td></tr>';
    });
    h+='</tbody></table></div>';
  }
  h+=noteBox('buyerl1')+'</div>';
  return h;
}

/* ---------- 关键词机会 ---------- */
function renderKeyword(){
  var vs=D.v4_sections||null;
  var kw=(vs&&vs.keywords)||[];
  var h='<div class="section-title">| 关键词机会 <span class="sub">行业热门搜索词（已过滤擦边），合规 B 端词是蓝海</span></div>';
  h+='<div class="card">';
  if(kw.length){
    h+='<div class="insight"><b>关键发现</b>：保健食品行业搜索词榜被「玛卡壮阳/私处紧致/丰臀/减肥」霸占，这些词竞争激烈且合规风险高。过滤后剩下的合规 B 端机会词：'+kw.map(function(k){return '<span class="tag good">'+esc(k.kw)+'</span>';}).join(' ')+'。把这些词布局进标题/属性/详情，是低竞争、合规的精准流量。</div>';
    h+='<div class="tbl-scroll"><table><thead><tr><th>关键词</th><th class="num">热度指数</th><th>建议动作</th></tr></thead><tbody>';
    kw.forEach(function(k){
      var act = k.idx>=80 ? '高热度·必布局' : '布局长尾';
      h+='<tr><td><b>'+esc(k.kw)+'</b></td><td class="num">'+num(k.idx)+'</td><td>'+tag(act, k.idx>=80?'good':'neutral')+'</td></tr>';
    });
    h+='</tbody></table></div>';
  } else {
    h+='<div class="muted">关键词数据未接入。</div>';
  }
  h+=noteBox('keyword')+'</div>';
  return h;
}

/* ---------- 0效果产品板块 ---------- */
function renderZeroEffect(){
  var ze=(D.v4_scores&&D.v4_scores.zero_effect)||[];
  var waste=ze.filter(function(s){return s.ze_type==='曝光浪费';});
  var sleep=ze.filter(function(s){return s.ze_type==='彻底沉睡';});
  var h='<div class="section-title">| 🚫 0效果产品 <span class="sub">0商机0点击，分「曝光浪费」和「彻底沉睡」两类处置</span></div>';
  h+='<div class="card">';
  h+='<div class="insight">共 '+num(ze.length)+' 个 0 效果产品（0 商机 0 点击）。<b style="color:var(--orange)">曝光浪费 '+num(waste.length)+' 个</b>（有曝光没人点=主图/标题病），<b style="color:var(--muted)">彻底沉睡 '+num(sleep.length)+' 个</b>（零曝光=从未激活）。两类处置完全不同。</div>';
  // 曝光浪费
  if(waste.length){
    h+='<h4>① 曝光浪费（'+num(waste.length)+'个）：有曝光但没人点，改主图/标题</h4>';
    h+='<div class="tbl-scroll"><table><thead><tr><th>#</th><th>产品</th><th class="num">曝光</th><th>层级</th><th>AI评分</th><th>处置建议</th></tr></thead><tbody>';
    waste.slice(0,20).forEach(function(s,i){
      var act = s.cat_type==='maca'||s.cat_type==='detox' ? '合规改名后再救流量' : '首图重做(痛点钩子+认证)+标题补长尾';
      h+='<tr><td>'+(i+1)+'</td><td><div class="thumb-cell">'+pimg(s.main_image)+'<div class="t">'+esc((s.title||'').slice(0,50))+'</div><div class="pid">'+esc(s.product_id)+'</div></div></td>'+
        '<td class="num">'+num(s.imps)+'</td><td>'+esc(s.prod_level||'')+'</td><td>'+gradeTag(s)+'</td>'+
        '<td class="small">'+act+'</td></tr>';
    });
    h+='</tbody></table></div>';
  }
  // 彻底沉睡
  if(sleep.length){
    h+='<h4>② 彻底沉睡（'+num(sleep.length)+'个）：零曝光，激活或下架</h4>';
    h+='<div class="tbl-scroll"><table><thead><tr><th>#</th><th>产品</th><th>层级</th><th>AI评分</th><th>处置建议</th></tr></thead><tbody>';
    sleep.slice(0,20).forEach(function(s,i){
      var act = s.prod_level==='低质品' ? '低质品+沉睡，建议下架换新' : '补结构化属性+主图6张+视频，进AI搜索池激活';
      h+='<tr><td>'+(i+1)+'</td><td><div class="thumb-cell">'+pimg(s.main_image)+'<div class="t">'+esc((s.title||'').slice(0,50))+'</div><div class="pid">'+esc(s.product_id)+'</div></div></td>'+
        '<td>'+esc(s.prod_level||'')+'</td><td>'+gradeTag(s)+'</td>'+
        '<td class="small">'+act+'</td></tr>';
    });
    h+='</tbody></table></div>';
  }
  h+=noteBox('zeroeffect')+'</div>';
  return h;
}

/* ---------- 本期总结 ---------- */
function renderSummary(){
  var s=D.summary||{};
  var h='<div class="section-title">| 本期总结与下期动作 <span class="sub">团队共享</span></div>';
  h+='<div class="card">';
  if(s.executive_summary){ h+='<div class="insight good"><b>核心结论</b>：'+esc(s.executive_summary)+'</div>'; }
  if(s.primary_problem){ h+='<div class="insight danger"><b>首要问题</b>：'+esc(s.primary_problem)+'<br><b>根因</b>：'+esc(s.primary_root_cause||'')+'</div>'; }
  if(s.largest_peer_gap||s.strongest_advantage){
    h+='<div class="insight">'+ (s.largest_peer_gap? '<b>最大对标缺口</b>：'+esc(s.largest_peer_gap)+'　':'') + (s.strongest_advantage? '<b>最强优势</b>：'+esc(s.strongest_advantage):'') +'</div>';
  }
  if(s.top_actions && s.top_actions.length){
    h+='<h4>下期动作</h4><ul style="margin-left:18px;line-height:1.8">';
    s.top_actions.forEach(function(a){ h+='<li>'+esc(typeof a==='string'?a:(a.name||a.action||a.title||a.text||''))+'</li>'; });
    h+='</ul>';
  }
  if(s.top_opportunities && s.top_opportunities.length){
    h+='<h4>机会</h4><ul style="margin-left:18px;line-height:1.8">';
    s.top_opportunities.forEach(function(o){ h+='<li><b>'+esc(o.name||'')+'</b>：'+esc(o.why||'')+'</li>'; });
    h+='</ul>';
  }
  if(!s.executive_summary) h+='<div class="muted">本期 AI 决策摘要未生成，运行周度诊断后自动填充。</div>';
  // 下期动作 · 市场风口
  var hc=D.hot_categories||[];
  var hp=D.hot_products||[];
  if(hc.length || hp.length){
    h+='<h4>下期动作 · 市场风口（上新方向）</h4>';
    if(hc.length){
      h+='<div class="insight"><b>高增长类目（询盘同比）</b>：';
      hc.slice(0,6).forEach(function(c){
        var cls = c.inquiry_yoy>50?'wow-up':(c.inquiry_yoy>0?'':'wow-down');
        h+='<span class="tag '+(c.inquiry_yoy>50?'good':'neutral')+'">'+esc(c.name)+' +'+num(c.inquiry_yoy)+'%</span> ';
      });
      h+='<div class="small muted mt8">询盘 30 天 '+(hc[0]?num(hc[0].inquiry_30d):'—')+' 起，供需比 '+(hc[0]?num(hc[0].supply_demand):'—')+'（>100=供不应求，值得上新）。</div></div>';
    }
    if(hp.length){
      h+='<div class="tbl-scroll"><table><thead><tr><th>#</th><th>市场热销品（上新参考）</th><th>类目</th></tr></thead><tbody>';
      hp.slice(0,12).forEach(function(p,i){
        h+='<tr><td>'+(i+1)+'</td><td class="small">'+esc(p.title)+'</td><td class="small">'+esc(p.category||'')+'</td></tr>';
      });
      h+='</tbody></table></div>';
    }
  }
  h+=noteBox('summary')+'</div>';
  return h;
}

/* ============ 重点关注（机会雷达） ============ */
function renderFocus(){
  var el=document.getElementById('panel-focus');
  var opp=(D.lists.opp||[]).slice(0,15);
  var zc=(D.lists.zero_cost||[]).slice(0,8);
  var danger=(D.lists.ctr||[]).filter(function(p){return (p.opp||0)===0 && (p.clicks||0)>=4;}).slice(0,8);
  var hc=(D.hot_categories||[]).slice(0,6);
  var h='<div class="section-title">重点关注 <span class="sub">机会雷达：按「为什么关注 + 下一步动作」分层</span></div>';
  // 顶部机会雷达
  var oppCnt=(D.lists.opp||[]).length, zcCnt=(D.lists.zero_cost||[]).length, dngCnt=(D.lists.ctr||[]).filter(function(p){return (p.opp||0)===0;}).length;
  h+='<div class="card"><div class="kpi-grid">'+
    '<div class="kpi"><div class="k-label">有商机品</div><div class="k-val">'+num(oppCnt)+'</div><div class="k-meta muted">抓成交</div></div>'+
    '<div class="kpi"><div class="k-label">零花费有商机</div><div class="k-val">'+num(zcCnt)+'</div><div class="k-meta muted">最该接预算</div></div>'+
    '<div class="kpi"><div class="k-label">高点击0商机</div><div class="k-val">'+num(dngCnt)+'</div><div class="k-meta muted">修转化</div></div>'+
    '<div class="kpi"><div class="k-label">风口类目</div><div class="k-val">'+num(hc.length)+'</div><div class="k-meta muted">上新方向</div></div>'+
  '</div></div>';
  // P1 有商机
  h+='<div class="card"><h4>P1 · 有商机，抓成交 <span class="sub">商机已来，按「问题→改法→优势」给一对一动作</span></h4>';
  h+='<div class="tbl-scroll"><table><thead><tr><th>#</th><th>产品</th><th>AI评分</th><th class="num">商机</th><th class="num">点击</th><th class="num">CTR</th><th>下一步动作（资深运营口径）</th></tr></thead><tbody>';
  opp.forEach(function(p,i){
    var s=scoreOf(p.product_id);
    h+='<tr><td>'+(i+1)+'</td><td><div class="thumb-cell">'+pimg(p.main_image)+'<div class="t" title="'+esc(p.title)+'">'+esc(p.title)+'</div></div></td>'+
      '<td>'+gradeTag(s)+'</td>'+
      '<td class="num">'+num(p.opp)+'</td><td class="num">'+num(p.clicks)+'</td><td class="num">'+pct(p.ctr)+'</td>'+
      '<td class="small">'+(s?conciseAdvice(s):'')+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  // P1 零花费
  h+='<div class="card"><h4>P1 · 零花费出商机，接预算放大 <span class="sub">没花钱就有商机，是最该试投的一批</span></h4>';
  h+='<div class="tbl-scroll"><table><thead><tr><th>#</th><th>产品</th><th>AI评分</th><th class="num">商机</th><th class="num">点击</th><th class="num">CTR</th><th>动作</th></tr></thead><tbody>';
  zc.forEach(function(p,i){
    var s=scoreOf(p.product_id);
    h+='<tr><td>'+(i+1)+'</td><td><div class="thumb-cell">'+pimg(p.main_image)+'<div class="t" title="'+esc(p.title)+'">'+esc(p.title)+'</div></div></td>'+
      '<td>'+gradeTag(s)+'</td>'+
      '<td class="num">'+num(p.opp)+'</td><td class="num">'+num(p.clicks)+'</td><td class="num">'+pct(p.ctr)+'</td>'+
      '<td class="small">'+(s?conciseAdvice(s):esc(p.sug))+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  // P2 高点击0商机
  h+='<div class="card"><h4>P2 · 高点击0商机，修转化 <span class="sub">按 CTR 分层：高CTR修详情页、低CTR修首图</span></h4>';
  h+='<div class="tbl-scroll"><table><thead><tr><th>#</th><th>产品</th><th>AI评分</th><th class="num">点击</th><th class="num">CTR</th><th>断点建议</th></tr></thead><tbody>';
  danger.forEach(function(p,i){
    var s=scoreOf(p.product_id);
    h+='<tr><td>'+(i+1)+'</td><td><div class="thumb-cell">'+pimg(p.main_image)+'<div class="t" title="'+esc(p.title)+'">'+esc(p.title)+'</div></div></td>'+
      '<td>'+gradeTag(s)+'</td>'+
      '<td class="num">'+num(p.clicks)+'</td><td class="num">'+pct(p.ctr)+'</td>'+
      '<td class="small">'+(s?conciseAdvice(s):esc(p.sug))+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  // P2 风口类目
  if(hc.length){
    h+='<div class="card"><h4>P2 · 风口类目，上新方向 <span class="sub">询盘同比高增长的类目，优先补品</span></h4><div class="flex" style="flex-wrap:wrap">';
    hc.forEach(function(c){ h+='<span class="tag '+(c.inquiry_yoy>50?'good':'neutral')+'">'+esc(c.name)+' +'+num(c.inquiry_yoy)+'%</span> '; });
    h+='</div></div>';
  }
  h+=noteBox('focus');
  el.innerHTML=h;
}

/* ============ AI搜索 ============ */
function renderAI(){
  var el=document.getElementById('panel-ai');
  var h='<div class="section-title">AI搜索作战板</div>';
  h+='<div class="card"><div class="insight info">AI搜索机制（2026版）：语义理解 + TrustScore + 成交就绪度，不再只按关键词匹配。工厂/CDMO 实力与认证是 TrustScore 关键信号。</div>';
  var levers=[
    ['1','补结构化属性','成分/认证等字段填满','最快'],
    ['2','自然语言文案','标题/详情覆盖采购意图',''],
    ['3','TrustScore 80+','占可见性37%，冲 TrustScore 85+',''],
    ['4','4件套视频认证','工厂/产线/质检/包装',''],
    ['5','询盘响应<30s','极速回复率对标同行优秀',''],
    ['6','行为信号(TrustRank)','停留时长/CTR/跳出率',''],
    ['7','官方Accio工具','用平台AI工具',''],
  ];
  h+='<div class="kpi-grid">';
  levers.forEach(function(L){ h+='<div class="kpi"><div class="k-label">杠杆'+L[0]+' '+L[3]+'</div><div class="k-val" style="font-size:14px">'+esc(L[1])+'</div><div class="k-meta muted">'+esc(L[2])+'</div></div>'; });
  h+='</div></div>';
  // 作战表（更多产品 + 筛选）
  var all=[];
  var seen={};
  ['opp','inquiry','tm','ctr','zero_cost'].forEach(function(k){
    (D.lists[k]||[]).forEach(function(p){ if(!seen[p.product_id]){ seen[p.product_id]=1; all.push(p); } });
  });
  all.sort(function(a,b){ return (b.opp||0)-(a.opp||0) || (b.clicks||0)-(a.clicks||0); });
  h+='<div class="section-title">AI搜索优化作战表 <span class="sub">'+all.length+' 个品，按判定标签/类目筛选，点作战方案看打法</span></div>';
  h+='<div class="card">';
  h+='<div class="flex mb8">'+
    '<select id="aiFilterLabel" onchange="renderAITable()" style="padding:4px"><option value="">判定：全部</option><option>有商机</option><option>高点击0商机</option><option>有曝光未起量</option><option>冷启动</option></select>'+
    '<select id="aiFilterCat" onchange="renderAITable()" style="padding:4px"><option value="">类目：全部</option></select>'+
    '<input id="aiSearch" placeholder="搜产品关键词..." style="padding:4px;flex:1" oninput="renderAITable()">'+
    '<span class="muted small" id="aiCount"></span></div>';
  // 类目下拉选项
  var cats={}; all.forEach(function(p){ if(p.category) cats[p.category]=1; });
  Object.keys(cats).slice(0,30).forEach(function(c){ h=h.replace('<option value="">类目：全部</option>','<option value="">类目：全部</option><option>'+esc(c)+'</option>'); });
  h+='<div class="mb8 small">图例：'+tag('有商机','good')+' '+tag('高点击0商机','danger')+' '+tag('有曝光未起量','muted')+' '+tag('冷启动','muted')+'</div>';
  h+='<div class="tbl-scroll"><table><thead><tr><th>#</th><th>产品</th><th>AI评分</th><th class="num">商机</th><th class="num">搜索曝光</th><th class="num">搜索点击</th><th class="num">CTR</th><th class="num">广告曝光</th><th class="num">广告点击</th><th>判定</th><th>建议（按品定制）</th><th>作战方案</th></tr></thead><tbody id="aiTableBody"></tbody></table></div>';
  h+=noteBox('ai')+'</div>';
  el.innerHTML=h;
  window._aiAll = all;
  renderAITable();
}
function renderAITable(){
  var body=document.getElementById('aiTableBody');
  if(!body) return;
  var all=window._aiAll||[];
  var fl=(document.getElementById('aiFilterLabel')||{}).value||'';
  var fc=(document.getElementById('aiFilterCat')||{}).value||'';
  var kw=((document.getElementById('aiSearch')||{}).value||'').toLowerCase();
  var list=all.filter(function(p){
    if(fl && p.label!==fl) return false;
    if(fc && p.category!==fc) return false;
    if(kw && (p.title||'').toLowerCase().indexOf(kw)<0) return false;
    return true;
  });
  (document.getElementById('aiCount')).textContent='显示 '+list.length+' / '+all.length;
  var h='';
  list.slice(0,100).forEach(function(p,i){
    var s=scoreOf(p.product_id);
    h+='<tr><td>'+(i+1)+'</td><td><div class="thumb-cell">'+pimg(p.main_image)+'<div class="t" title="'+esc(p.title)+'">'+esc(p.title)+'</div><div class="pid">'+esc(p.category||'')+' · '+esc(p.product_id)+'</div></div></td>'+
      '<td>'+gradeTag(s)+'</td>'+
      '<td class="num">'+num(p.opp)+'</td><td class="num">'+num(p.impressions)+'</td><td class="num">'+num(p.clicks)+'</td><td class="num">'+pct(p.ctr)+'</td><td class="num">'+num(p.ad_imps)+'</td><td class="num">'+num(p.ad_clk)+'</td>'+
      '<td>'+tag(p.label,p.label_typ)+'</td>'+
      '<td class="small">'+(s?conciseAdvice(s):'')+'</td>'+
      '<td><button class="btn btn-plan" onclick="openPlan(\''+p.product_id+'\')">📝 作战方案</button></td></tr>';
  });
  body.innerHTML=h;
}

/* ---------- 爆品作战方案弹窗 ---------- */
function findItem(pid){
  var all=(D.lists.inquiry||[]).concat(D.lists.ctr||[]).concat(D.lists.tm||[]).concat(D.lists.zero_cost||[]);
  for(var i=0;i<all.length;i++) if(all[i].product_id===pid) return all[i];
  return null;
}
function mtForCat(pid, it){
  var cat = (it && it.category) || '';
  var mts = D.market_trends || [];
  if(!cat || !mts.length) return null;
  for(var i=0;i<mts.length;i++){
    if(mts[i].name && cat.indexOf(mts[i].name)>=0){
      var m=mts[i];
      return esc(m.name)+' 询盘同比 '+num(m.inquiry_yoy)+'%、转化 '+num(m.conv_rate)+'%、供需比 '+num(m.supply_demand)+(m.supply_demand>100?'（供不应求，可加码）':'（竞争激烈，走差异化）');
    }
  }
  return null;
}
function openPlan(pid){
  var wp=(D.war_plans&&D.war_plans[pid])||null;
  var it=findItem(pid);
  var title=(wp&&wp.title)||(it&&it.title)||pid;
  var dp=(wp&&wp.deep_plan)||{};
  var ov=document.createElement('div'); ov.className='modal-overlay';
  ov.innerHTML = planModalHtml(pid, title, wp, dp, it);
  document.body.appendChild(ov);
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
}
function planModalHtml(pid, title, wp, dp, it){
  var g = dp['1_why_selected'] || '';
  var problem = dp['2_current_problem'] || '';
  var evidence = dp['3_data_evidence'] || '';
  var peer = dp['5_peer_gap'] || '';
  var listing = dp['7_listing_diagnosis'] || '';
  var root = dp['9_root_cause'] || '';
  var prim = dp['10_primary_action'] || (wp?wp.primary_action:'') || '';
  var dont = dp['12_do_not_change'] || '';
  var intent = (wp&&wp.buyer_intent) || dp['6_buyer_intent'] || '';
  var titles = (wp&&wp.candidate_titles) || [];
  var modules = (wp&&wp.detail_modules) || [];
  var imgBrief = (wp&&wp.image_brief) || '';
  var adc = it? (it.ad_clk||0) : 0;
  var inq = it? (it.inquiries||0) : 0;

  // 5 大打法杠杆
  var levers = [
    {icon:'🏅',name:'排名',txt:'补齐必填属性与视频，把质量分抬进优品，稳住并放大询盘'},
    {icon:'📈',name:'询盘',txt: prim? (esc(prim)) : ('关键词自然语言化(整句意图)+承接提速(30秒响应)')},
    {icon:'💰',name:'广告花费',txt: adc>0 ? ('广告在投(点击'+adc+')但需看商机产出，无商机就收') : ('零花费出询盘=最该加预算，小步试投精准长尾词，单询盘成本可控再放大')},
    {icon:'🔥',name:'爆品打法',txt:'差异化定位：功能+定制感突出，补齐信任要素让它稳定出量'},
    {icon:'⭐',name:'评价',txt:'当前0评价=最大信任缺口，两周内先攒3-5条带图评价'},
  ];
  // 主图 6 张脚本
  var imgs = imgBrief ? [imgBrief] : [
    'Hero主图：产品+核心卖点一句话（白底+痛点钩子）',
    '成分/USP图：核心成分+功效可视化（图标化，禁性功效宣称）',
    '认证墙：HALAL/ISO/FSSC/GMP 等证书排布，强化合规',
    '工厂实力：工厂/产线/QC 实拍',
    '定制感：Your Logo · Your Formula 定制示意',
    '收尾信任：溶解/冲泡演示+交期+样品政策',
  ];

  var h='<div class="plan-modal">';
  h+='<div class="pm-head"><span>🚀</span><b>爆品作战方案</b><span class="pm-title">'+esc(title)+'</span><div class="spacer"></div><span class="muted small">最后更新 · AI预填</span><button class="btn btn-save">保存方案</button><button class="btn btn-close" onclick="this.closest(\'.modal-overlay\').remove()">关闭 ✕</button></div>';
  // 4 步进度
  h+='<div class="pm-steps"><span class="step on"><i>1</i>目标</span><span class="step"><i>2</i>战况诊断</span><span class="step"><i>3</i>五大打法</span><span class="step"><i>4</i>Listing落地</span><span class="muted small">一条主线：先定目标 → 看清战况 → 撬五个杠杆 → 落到 listing。改完点右上「保存方案」</span></div>';
  h+='<div class="pm-body">';
  // 左列
  h+='<div class="pm-left">';
  // AI 识别诊断
  var ctr = it? (it.ctr||0) : 0;
  var opp = (inq||0) + (it? (it.tm||0) : 0);
  var aiRec = (ctr>=3) ? 'AI 搜索友好（CTR '+pct(ctr)+' 高，主图/标题已被买家点选）' : (ctr>=1.5? 'AI 搜索中规中矩（CTR '+pct(ctr)+'），标题/主图可再贴合采购意图' : 'AI 搜索识别弱（CTR '+pct(ctr)+' 低），标题未覆盖核心品类词或首图卖点弱');
  var b2bFit = opp>0 ? ('有商机 '+num(opp)+'（询盘'+inq+'/TM'+(it?it.tm:0)+'），B 端买家已在询价，转成交是重点') : ('0 商机，B 端转化未验证——先修详情页价格/MOQ/OEM 能力展示');
  h+='<div class="pm-box"><h5>🤖 AI 识别诊断（能否被 AI 搜索识别 + B端转化适配）</h5><div class="pm-note"><div><span class="tag '+(ctr>=3?'good':'warn')+'">'+aiRec+'</span></div><div class="mt8"><span class="tag '+(opp>0?'good':'danger')+'">'+b2bFit+'</span></div>'+
    '<div class="small muted mt8">市场趋势：'+(mtForCat(pid, it)||'该类目近期询盘平稳，重点做差异化而非追风口')+'</div></div></div>';
  h+='<div class="pm-box"><h5>💬 客户聊天摘要（成交线索）</h5><div class="pm-note">'+(intent? esc(intent) : '团队填真实 L2+ 买家：国家/公司/意向/卡在报价或MOQ或样品哪一步。本品当前询盘 '+(inq||0)+'、TM '+(it?num(it.tm):'0')+'，从这些线索里追。')+'</div></div>';
  h+='<div class="pm-box"><h5>🎯 目标</h5><div class="pm-note">'+esc(g||'本品当前询盘 '+(inq||0)+'，目标稳到 2+/周')+'</div></div>';
  h+='<div class="pm-box"><h5>🩺 战况诊断</h5><div class="pm-note">'+(problem? '<b>问题</b>：'+esc(problem):'')+(root? '<br><b>根因</b>：'+esc(root):'')+(evidence? '<br><b>数据</b>：'+esc(evidence):'')+(peer? '<br><b>对标</b>：'+esc(peer):'')+(listing? '<br><b>Listing诊断</b>：'+esc(listing):'')+'</div></div>';
  h+='<div class="pm-box"><h5>🚀 五大打法杠杆</h5>';
  levers.forEach(function(L){ h+='<div class="lever"><span class="lv-icon">'+L.icon+'</span><div><b>'+L.name+'</b>：'+L.txt+'</div></div>'; });
  h+='</div>';
  if(dont){ h+='<div class="pm-box"><h5>🚫 不做</h5><div class="pm-note">'+esc(dont)+'</div></div>'; }
  h+='</div>';
  // 右列
  h+='<div class="pm-right">';
  h+='<div class="pm-box"><h5>📷 主图/视觉脚本（可直接生成结果图）</h5><ol class="img-script">';
  imgs.forEach(function(s){ h+='<li>'+esc(s)+'</li>'; });
  h+='</ol></div>';
  if(titles && titles.length){
    h+='<div class="pm-box"><h5>✍️ 候选标题</h5><ul class="pm-list">';
    titles.forEach(function(t){ h+='<li><b>'+(t.code?esc(t.code)+' ':'')+'</b>'+esc(t.title||t)+' <span class="muted">'+(t.note?esc(t.note):'')+'</span></li>'; });
    h+='</ul></div>';
  }
  h+='<div class="pm-box"><h5>🎯 详情页询盘转化要点</h5><ul class="pm-list">'+
    '<li>价格前置：Price from $X.XX/unit + MOQ + 交期一目了然</li>'+
    '<li>定制可视化：logo/配方/口味/包装可定制示意</li>'+
    '<li>信任数据墙：认证 + 工厂规模 + 配方数 + 年限</li>'+
    '<li>FAQ 前置解决合规/起订/样品疑虑</li></ul></div>';
  h+='<div class="pm-box"><h5>📄 详情正文优化（英文文案）</h5><div class="pm-note">合规：只谈 energy / focus / vitality / stamina，删除性健康功效表述。<br>CTA：Start your OEM project — send us your target market, MOQ and customization needs, we quote within 24 hours.</div></div>';
  h+='</div>';
  h+='</div></div>';
  return h;
}

/* ============ 趋势对比 ============ */
function renderTrend(){
  var el=document.getElementById('panel-trend');
  var t=D.trend||[];
  var h='<div class="section-title">店级指标趋势 <span class="sub">同账户同周期类型下自动对比</span></div>';
  h+='<div class="card"><div class="tbl-scroll"><table><thead><tr><th>指标</th>';
  t.forEach(function(w){ h+='<th class="num">'+esc(w.week_end)+'</th>'; });
  h+='<th class="num">最新环比</th></tr></thead><tbody>';
  var rows=[['搜索曝光','se_imps',''],['搜索点击','se_clk',''],['搜索点击率','se_ctr','pct'],['询盘','fb_cnt',''],['TM咨询','fb_tm_uv',''],['下单','suc_ord_cnt',''],['GMV($)','suc_ord_amt','money'],['访客','uv_cnt','']];
  rows.forEach(function(r){
    h+='<tr><td>'+r[0]+'</td>';
    t.forEach(function(w){ h+='<td class="num">'+(r[2]==='pct'?pct(w[r[1]]):(r[2]==='money'?money(w[r[1]]):num(w[r[1]])))+'</td>'; });
    var cur=t.length? t[t.length-1][r[1]]:null, pr=t.length>1? t[t.length-2][r[1]]:null;
    h+='<td class="num">'+(cur!=null&&pr? wowHtml(Math.round((cur-pr)/Math.abs(pr)*1000)/10):'<span class="muted">—</span>')+'</td></tr>';
  });
  h+='</tbody></table></div>';
  h+='<div class="chart-wrap"><canvas id="trendChart"></canvas></div>';
  h+=noteBox('trend')+'</div>';

  // 单品逐期
  h+='<div class="section-title">单品逐期对比 <span class="sub">选一个品，看它每期的点击/询盘/TM/花费</span></div>';
  h+='<div class="card"><div class="flex mb8">产品：<select id="prodSel" style="padding:4px;max-width:400px"></select></div><div id="prodTrend"></div>'+noteBox('prodtrend')+'</div>';
  el.innerHTML=h;
  // 单品选择器
  var items=(D.lists.inquiry||[]).concat(D.lists.ctr||[]).concat(D.lists.tm||[]);
  var seen={}; var uniq=[]; items.forEach(function(p){ if(!seen[p.product_id]){seen[p.product_id]=1;uniq.push(p);} });
  var sel=document.getElementById('prodSel');
  uniq.forEach(function(p){ var o=document.createElement('option'); o.value=p.product_id; o.textContent=(p.title||'').slice(0,50); sel.appendChild(o); });
  sel.onchange=function(){ renderProdTrend(this.value); };
  if(uniq.length) renderProdTrend(uniq[0].product_id);
  trendChartDrawn=false;
}

var trendChartDrawn=false;
function drawTrendChart(){
  if(trendChartDrawn) return;
  var cv=document.getElementById('trendChart');
  if(!cv || !window.Chart) return;
  trendChartDrawn=true;
  var t=D.trend||[];
  if(!t.length) return;
  var labels=t.map(function(w){return w.week_end;});
  var raw=[
    {label:'搜索曝光',key:'se_imps',color:'#2b6cb0'},
    {label:'搜索点击',key:'se_clk',color:'#e8832a'},
    {label:'询盘',key:'fb_cnt',color:'#1fa363'},
    {label:'TM咨询',key:'fb_tm_uv',color:'#9c6ade'},
  ];
  var datasets=raw.map(function(ds){
    var arr=t.map(function(w){return w[ds.key]||0;});
    var max=Math.max.apply(null,arr)||1;
    return {label:ds.label,data:arr.map(function(v){return v/max;}),borderColor:ds.color,backgroundColor:ds.color,fill:false,tension:0.3,spanGaps:true};
  });
  new Chart(cv,{type:'line',data:{labels:labels,datasets:datasets},options:{maintainAspectRatio:false,plugins:{title:{display:true,text:'各自归一化（同账户同周期）'}},scales:{y:{beginAtZero:true}}}});
}
function renderProdTrend(pid){
  var box=document.getElementById('prodTrend');
  // 从 lists 里找该产品的最新周数据
  var p=null;
  ['opp','inquiry','tm','ctr','zero_cost','high_eff_low_cost'].forEach(function(k){
    if(p) return; (D.lists[k]||[]).forEach(function(x){ if(x.product_id===pid && !p) p=x; });
  });
  var h='<div class="insight info">历史周数据不可回填：数据参谋商品接口（week 模式）只返回最新一周、忽略历史日期。以下为本周（'+esc((D.meta||{}).week_label||'')+'）实际值；从下周起每周快照落库，自动累积逐期趋势。</div>';
  if(p){
    h+='<table><thead><tr><th>指标</th><th class="num">本周值</th><th>解读</th></tr></thead><tbody>'+
      '<tr><td>搜索曝光</td><td class="num">'+num(p.impressions)+'</td><td>'+(p.impressions&&p.impressions>=1000?'曝光充足，看点击承接':'曝光偏低，补标题关键词')+'</td></tr>'+
      '<tr><td>搜索点击</td><td class="num">'+num(p.clicks)+'</td><td>'+(p.clicks>=4?'点击正常':'点击少，主图/标题待优化')+'</td></tr>'+
      '<tr><td>点击率</td><td class="num">'+pct(p.ctr)+'</td><td>'+(p.ctr>=3?'CTR 优秀':'CTR 低于3%，首图卖点弱')+'</td></tr>'+
      '<tr><td>商机（询盘+TM）</td><td class="num">'+num(p.opp)+'</td><td>'+(p.opp>0?'已出商机，抓成交':'0商机，修详情页/MOQ/价格')+'</td></tr>'+
      '<tr><td>询盘</td><td class="num">'+num(p.inquiries)+'</td><td rowspan="2">'+(p.opp>0?'商机已来，重点转报价成交':'无商机，先解决转化断点')+'</td></tr>'+
      '<tr><td>TM咨询</td><td class="num">'+num(p.tm)+'</td></tr>'+
      '<tr><td>广告点击</td><td class="num">'+num(p.ad_clk)+'</td><td>'+(p.ad_clk>0?(p.opp>0?'广告有商机':'广告烧钱无商机，收或换定向'):'零花费（自然流量）')+'</td></tr>'+
    '</tbody></table>';
  } else {
    h+='<div class="muted">未找到该产品本周数据。</div>';
  }
  box.innerHTML=h;
}

/* ============ 改造执行台 ============ */
function taskStatus(id, field){ var v=localStorage.getItem('v4status_'+id+'_'+field); return v||'待办'; }
function saveTaskStatus(el, id, field){ localStorage.setItem('v4status_'+id+'_'+field, el.value); el.style.color=(el.value==='待办'||el.value==='不做')?'#8a94a0':'#1fa363'; }
function statusSel(id, field, cur){
  var st=taskStatus(id, field)||cur||'待办';
  var opts=['待办','进行中','已完成','不做'];
  return '<select style="padding:2px;color:'+(st==='待办'||st==='不做'?'#8a94a0':'#1fa363')+'" onchange="saveTaskStatus(this,\''+id+'\',\''+field+'\')">'+
    opts.map(function(o){return '<option'+(o===st?' selected':'')+'>'+o+'</option>';}).join('')+'</select>';
}
function renderExec(){
  var el=document.getElementById('panel-exec');
  var plan=D.exec_plan||[];
  var acts=D.actions||[];
  var opts=D.optimizations||[];
  var FIELDMAP={title_rewrite:'标题改写', moq_ladder:'MOQ试单档', main_image:'主图', detail_conversion:'详情页转化模块', detail_b2b_section:'详情页B2B模块', price_optimize:'定价/MOQ阶梯'};
  function cleanField(f){ if(!f) return '优化'; var fl=(f||'').toLowerCase(); var k=Object.keys(FIELDMAP); for(var i=0;i<k.length;i++){ if(fl.indexOf(k[i])>=0) return FIELDMAP[k[i]]; } return (f||'').split('(')[0].trim().slice(0,14); }
  function cleanTxt(t){ if(!t) return ''; t=String(t)
      .replace(/\(?NEEDS_HUMAN_CONFIRMATION=true\)?/gi,'')
      .replace(/（One Variable[^）]*）/g,'').replace(/\(One Variable[^)]*\)/gi,'')
      .replace(/\bMAIN_IMAGE\b/gi,'').replace(/\bTITLE_REWRITE\b/gi,'').replace(/\bDETAIL_CONVERSION\b/gi,'')
      .replace(/\bDETAIL_B2B_SECTION\b/gi,'').replace(/\bREVIEW_MOQ_LADDER\b/gi,'').replace(/\bREVIEW MOQ LADDER\b/gi,'')
      .replace(/\bPRICE_OPTIMIZE\b/gi,'').replace(/\bMOQ_LADDER\b/gi,'')
      .replace(/\btitle_rewrite\b/gi,'').replace(/\bdetail_conversion\b/gi,'').replace(/\bdetail_b2b_section\b/gi,'')
      .replace(/\bmoq_ladder\b/gi,'').replace(/\bprice_optimize\b/gi,'').replace(/\bmain_image\b/gi,'')
      .replace(/（本轮唯一变量）/g,'').replace(/\(PRIMARY\)/gi,'').replace(/\(PRI\)/gi,'')
      .replace(/\(\)/g,'').replace(/（\s*）/g,'')
      .replace(/[→\->]+\s*$/g,'').replace(/[→\->]+\s*(?=[。；，])/g,'')
      .replace(/\s+/g,' ').trim();
    return t.length>70? t.slice(0,70)+'…' : (t||'待诊断');
  }
  function adviceFor(pid){
    var s=scoreOf(pid); if(!s) return '';
    var adv=s.advice||{};
    return adv.img || adv.focus || adv.detail || '';
  }
  var ACTION_CN={title_rewrite:'标题改为覆盖核心品类词+规格',main_image:'重做主图首图(痛点钩子+认证墙)',detail_b2b_section:'详情加B2B模块(OEM/定制/交期)',detail_conversion:'详情加转化模块(价格前置+CTA)',moq_ladder:'MOQ试单档(降低小B门槛)',price_optimize:'按诊断做定价/MOQ阶梯'};
  function actionCn(a){ if(!a) return ''; var al=String(a).toLowerCase(); var k=Object.keys(ACTION_CN); for(var i=0;i<k.length;i++){ if(al.indexOf(k[i])>=0) return ACTION_CN[k[i]]; } return cleanField(a); }
  // 产品级动作合并
  var prodTasks=[];
  acts.forEach(function(a){
    var chg = cleanTxt(a.recommended_change) || adviceFor(a.product_id);
    prodTasks.push({prio: a.confidence==='high'?'P1':'P2', field:cleanField(a.primary_variable||a.action_type), cat: a.action_type||'', cur: cleanTxt(a.description)||'待诊断', chg: chg||'待定', pid:a.product_id, status: a.status||'待办', owner: a.owner||'', due: a.due_date||''});
  });
  opts.forEach(function(o){
    var chg = actionCn(o.primary_action) || adviceFor(o.product_id) || '优化方案';
    prodTasks.push({prio:'P2', field:'AI优化方案', cat:o.primary_action||'', cur:cleanTxt(o.priority_reason)||'待诊断', chg:chg, pid:o.product_id, status:o.status||'待办', owner:o.owner||'', due:o.due_date||''});
  });
  var storeTotal=0, storeDone=0;
  plan.forEach(function(b){ storeTotal+=b.tasks.length; storeDone+=b.tasks.filter(function(t){return taskStatus(b.id,t.field)==='已完成';}).length; });
  var h='<div class="section-title">Listing 改造执行台 <span class="sub">选状态即保存，全员可见</span></div>';
  h+='<div class="flex mb8">'+
    '<select style="padding:4px"><option>全部优先级</option><option>P0</option><option>P1</option><option>P2</option></select>'+
    '<select style="padding:4px"><option>全部状态</option><option>待办</option><option>进行中</option><option>已完成</option><option>不做</option></select>'+
    '<input placeholder="搜产品/字段..." style="padding:4px;flex:1">'+
    '<span class="muted">店级 '+num(storeTotal)+' 项 · 已完成 '+num(storeDone)+' · 单品 '+num(prodTasks.length)+' 项</span></div>';
  // 店级 4 块（哪里缺了补哪里）
  plan.forEach(function(b){
    var done=b.tasks.filter(function(t){return taskStatus(b.id,t.field)==='已完成';}).length;
    h+='<div class="task-block"><div class="task-head"><span class="t-id">'+b.id+'</span><span>'+b.icon+'</span><span class="t-name">'+esc(b.name)+'</span><div class="progress-bar"><i style="width:'+Math.round(done/Math.max(1,b.tasks.length)*100)+'%"></i></div><span class="progress">'+done+'/'+b.tasks.length+'</span></div>';
    h+='<div class="tbl-scroll"><table><thead><tr><th>优先</th><th>字段/位置</th><th>现状 → 改成什么</th><th>状态</th><th>负责人</th><th>截止日</th><th>备注</th></tr></thead><tbody>';
    b.tasks.forEach(function(x){
      h+='<tr><td>'+tag(x.prio,'p'+x.prio.slice(1))+'</td>'+
        '<td class="small">'+esc(x.field)+'<div class="muted tiny">'+esc(x.cat||'')+'</div></td>'+
        '<td class="small">'+esc(x.cur)+'<br><span style="color:var(--green)">→</span> '+esc(x.chg)+'</td>'+
        '<td>'+statusSel(b.id,x.field,x.status)+'</td>'+
        '<td>'+(x.owner?esc(x.owner):'<span class="muted">待分配</span>')+'</td>'+
        '<td>'+esc(x.due||'')+'</td>'+
        '<td class="small muted">AI预填</td></tr>';
    });
    h+='</tbody></table></div></div>';
  });
  // 单品优化（产品级）
  if(prodTasks.length){
    var pdone=prodTasks.filter(function(t){return taskStatus('PROD',t.field+t.pid)==='已完成';}).length;
    h+='<div class="task-block"><div class="task-head"><span class="t-id">YH-PROD</span><span>🎯</span><span class="t-name">单品优化 (产品级)</span><div class="progress-bar"><i style="width:'+Math.round(pdone/Math.max(1,prodTasks.length)*100)+'%"></i></div><span class="progress">'+pdone+'/'+prodTasks.length+'</span></div>';
    h+='<div class="tbl-scroll"><table><thead><tr><th>优先</th><th>字段/位置</th><th>现状 → 改成什么</th><th>状态</th><th>负责人</th><th>截止日</th><th>备注</th></tr></thead><tbody>';
    prodTasks.forEach(function(x){
      var s=scoreOf(x.pid);
      h+='<tr><td>'+tag(x.prio,'p'+x.prio.slice(1))+'</td>'+
        '<td class="small">'+esc(x.field)+'<div class="muted tiny">'+esc(x.pid)+'</div></td>'+
        '<td class="small">'+esc(x.cur)+'<br><span style="color:var(--green)">→</span> '+esc(x.chg)+'</td>'+
        '<td>'+statusSel('PROD',x.field+x.pid,x.status)+'</td>'+
        '<td>'+(x.owner?esc(x.owner):'<span class="muted">待分配</span>')+'</td>'+
        '<td>'+esc(x.due||'')+'</td>'+
        '<td class="small">'+(s?gradeTag(s):'<span class="muted">AI预填</span>')+'</td></tr>';
    });
    h+='</tbody></table></div></div>';
  }
  h+=noteBox('exec');
  el.innerHTML=h;
}

/* ============ 竞品对比（产品级） ============ */
function renderCompete(){
  var el=document.getElementById('panel-compete');
  var comps=(D.competitor_full&&D.competitor_full.competitors)||(D.v4_scores&&D.v4_scores.competitors)||[];
  var total=(D.competitor_full&&D.competitor_full.total)||comps.length;
  var h='<div class="section-title">竞品对比 <span class="sub">'+num(total)+' 个真实竞品（5 家供应商），带真实图可跳转+好在哪点评</span></div>';
  h+='<div class="card">';
  h+='<div class="insight info">对标口径：5 家标杆供应商的 Top 商品（按月订单排序），只保留运动营养/维生素/草本补充剂/胶原蛋白品类，已过滤壮阳/减肥/美白/助孕/关节/骨骼/心脏/脑等擦边与非目标品类。每张卡：①竞品好在哪（月订单/询盘/MOQ）②价格/MOQ 差在哪 ③点「跳转」看它的主图/详情打法。</div>';
  if(!comps.length){ h+='<div class="muted">竞品数据未接入。</div>'; }
  else {
    // 类目筛选
    var cats={}; comps.forEach(function(c){ if(c.category) cats[c.category]=1; });
    var catList=Object.keys(cats);
    h+='<div class="flex mb8"><select id="compCat" onchange="renderCompCards()" style="padding:4px"><option value="">全部类目</option>'+catList.map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select><span class="muted small" id="compCount"></span></div>';
    h+='<div class="grid3" id="compCards"></div>';
    h+='<div class="muted small mt8">注：图片为竞品真实主图（数据参谋商品报告），点「跳转竞品」查看 alibaba.com 详情页。</div>';
  }
  h+=noteBox('compete')+'</div>';
  el.innerHTML=h;
  window._comps=comps;
  renderCompCards();
}
function renderCompCards(){
  var box=document.getElementById('compCards');
  if(!box) return;
  var comps=window._comps||[];
  var fc=(document.getElementById('compCat')||{}).value||'';
  var list=comps.filter(function(c){ return !fc || c.category===fc; });
  (document.getElementById('compCount')).textContent='显示 '+list.length+' / '+comps.length;
  var h='';
  list.slice(0,48).forEach(function(c){
    h+='<div class="comp-card">'+
      '<div class="thumb">'+(c.img?'<img src="'+esc(c.img)+'" loading="lazy" onclick="previewImg(\''+esc(c.img)+'\')" style="cursor:zoom-in" onerror="this.style.visibility=\'hidden\'">':'<div class="noimg">无图</div>')+'</div>'+
      '<div class="t small" title="'+esc(c.title)+'"><b>'+esc(c.title)+'</b></div>'+
      '<div class="meta small">'+
        '<div>💰 '+esc(c.price||'—')+' · MOQ '+esc(c.moq||'—')+'</div>'+
        '<div>📦 月订单 '+num(c.orders)+' · 询盘 '+num(c.inquiry)+'</div>'+
        '<div>🏷 '+esc(c.category||'')+'</div>'+
      '</div>'+
      '<div class="good small"><b>好在哪</b>：'+esc(c.good_point||'')+'</div>'+
      '<div class="mt8"><a class="btn btn-save" href="'+esc(c.url||'#')+'" target="_blank">跳转竞品 ↗</a></div>'+
    '</div>';
  });
  box.innerHTML=h;
}

/* ============ 店铺深度详情弹窗 ============ */
function storeDetail(name){
  var cd=D.competitor_detail||null;
  if(!cd) return null;
  var arr=cd.stores||[];
  for(var i=0;i<arr.length;i++) if(arr[i].name===name) return arr[i];
  return null;
}
function basicPeer(name){
  var pb=D.peer_benchmark||null;
  if(!pb) return null;
  var arr=pb.peers||[];
  for(var i=0;i<arr.length;i++) if(arr[i].store_name===name) return arr[i];
  return null;
}
function shareBar(pct, color){
  return '<div class="share-row"><span class="share-label">'+esc(pct.label||pct)+'</span><div class="progress-bar" style="flex:1"><i style="width:'+Math.min(100,pct.share||0)+'%;background:'+(color||'#2b6cb0')+'"></i></div><span class="small muted">'+num(pct.share)+'%</span></div>';
}
function openStoreDetail(name){
  var s=storeDetail(name);
  if(!s){
    var b=basicPeer(name);
    if(b){ openBasicPeer(b); return; }
    alert('该店暂无数据'); return;
  }
  var stars=''; var sl=Math.round(parseFloat(s.star)||0); for(var i=0;i<sl;i++) stars+='★';
  var m=s.metrics||{}; var pr=s.products||{}; var pf=s.profile||{};
  // 自动总结：哪里做得好
  var goods=[];
  var topC=(pf.country||[])[0]; if(topC) goods.push('主攻「'+topC.label+'」市场（占 '+topC.share+'%），'+((pf.country||[])[1]?'其次是'+pf.country[1].label+' '+pf.country[1].share+'%':''));
  var topI=(pf.identity||[])[0]; if(topI) goods.push('买家以「'+topI.label+'」为主（'+topI.share+'%）');
  if(m.gmv_trend==='up') goods.push('GMV 指数处于上升期（↑）'); else if(m.gmv_trend==='down') goods.push('GMV 指数近两周回落（↓），或进入存量竞争');
  if(s.main_products&&s.main_products.length) goods.push('核心盘：'+s.main_products.slice(0,3).join(' / '));
  var goodTxt = goods.length? goods.join('；')+'。' : '本次未取得足够数据。';

  var ov=document.createElement('div'); ov.className='modal-overlay';
  var h='<div class="plan-modal">';
  h+='<div class="pm-head"><span>🏪</span><b>店铺深度分析</b><span class="pm-title">'+esc(s.name)+'</span><div class="spacer"></div><span class="muted small">'+stars+' '+esc(s.star||'')+' · 评分 '+esc(s.score||'—')+'</span><a class="btn btn-save" style="margin-left:10px" href="'+esc(s.url||'#')+'" target="_blank">跳转店铺 ↗</a><button class="btn btn-close" onclick="this.closest(\'.modal-overlay\').remove()">关闭 ✕</button></div>';
  h+='<div class="pm-body">';
  h+='<div class="pm-left">';
  // 经营指标
  h+='<div class="pm-box"><h5>📊 经营指标（指数，非真实成交）</h5><div class="kpi-grid">'+
    '<div class="kpi"><div class="k-label">GMV 强度指数</div><div class="k-val">'+num(m.gmv_index)+'</div><div class="k-meta">'+(m.gmv_trend==='up'?'<span class="wow-up">↑ 上升</span>':(m.gmv_trend==='down'?'<span class="wow-down">↓ 回落</span>':'<span class="muted">→ 平稳</span>'))+'</div></div>'+
    '<div class="kpi"><div class="k-label">询盘效率</div><div class="k-val">'+num(m.inquiry_eff)+'</div></div>'+
    '<div class="kpi"><div class="k-label">订单效率</div><div class="k-val">'+num(m.order_eff)+'</div></div>'+
  '</div></div>';
  // 主营
  h+='<div class="pm-box"><h5>🧭 主营产品</h5><div class="mb8">'+(s.main_products||[]).map(function(x){return '<span class="tag info">'+esc(x)+'</span> ';}).join('')+'</div></div>';
  // 价格带
  if(pr.price_units&&pr.price_units.length){
    h+='<div class="pm-box"><h5>💰 主力价格带</h5>';
    pr.price_units.forEach(function(u){ h+='<div class="small mt8"><b>'+esc(u.unit)+'</b>：'+u.buckets.map(function(b){return '<span class="tag neutral">'+esc(b)+'</span> ';}).join('')+'</div>'; });
    h+='</div>';
  }
  // 进店词
  if(pf.search&&pf.search.length){
    h+='<div class="pm-box"><h5>🔍 店内搜索词 Top</h5><div>'+(pf.search||[]).map(function(x){return shareBar(x,'#1fa363');}).join('')+'</div></div>';
  }
  h+='</div>';
  h+='<div class="pm-right">';
  // 国家
  h+='<div class="pm-box"><h5>🌍 买家国家分布 Top6（近30天）</h5>'+(pf.country||[]).map(function(x){return shareBar(x);}).join('')+'</div>';
  // 身份
  h+='<div class="pm-box"><h5>👥 买家身份</h5>'+(pf.identity||[]).map(function(x){return shareBar(x,'#e8832a');}).join('')+'</div>';
  // 来源
  if(pf.source&&pf.source.length){ h+='<div class="pm-box"><h5>🚪 流量来源</h5>'+(pf.source||[]).map(function(x){return shareBar(x,'#9c6ade');}).join('')+'</div>'; }
  // 总结
  h+='<div class="pm-box"><h5>💡 哪里做得好（总结）</h5><div class="pm-note">'+esc(goodTxt)+'</div></div>';
  h+='</div>';
  h+='</div></div>';
  ov.innerHTML=h;
  document.body.appendChild(ov);
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
}
function openBasicPeer(b){
  var stars=''; var sl=Math.round(parseFloat(b.star_level)||0); for(var i=0;i<sl;i++) stars+='★';
  var ov=document.createElement('div'); ov.className='modal-overlay';
  var h='<div class="plan-modal">';
  h+='<div class="pm-head"><span>🏪</span><b>店铺基础档案</b><span class="pm-title">'+esc(b.store_name)+'</span><div class="spacer"></div><span class="muted small">'+stars+' '+esc(b.star_level||'')+' · 评分 '+esc(b.score||'—')+'</span><a class="btn btn-save" style="margin-left:10px" href="'+esc(b.url||'#')+'" target="_blank">跳转店铺 ↗</a><button class="btn btn-close" onclick="this.closest(\'.modal-overlay\').remove()">关闭 ✕</button></div>';
  h+='<div class="pm-body"><div class="pm-left">';
  h+='<div class="pm-box"><h5>📊 经营信号（近7日指数）</h5><div class="kpi-grid">'+
    '<div class="kpi"><div class="k-label">询盘指数</div><div class="k-val">'+num(b.inquiry_7d)+'</div></div>'+
    '<div class="kpi"><div class="k-label">UV指数</div><div class="k-val">'+num(b.uv_7d)+'</div></div>'+
    '<div class="kpi"><div class="k-label">订单指数</div><div class="k-val">'+num(b.order_7d)+'</div></div>'+
    '<div class="kpi"><div class="k-label">评论数</div><div class="k-val">'+num(b.review_cnt)+'</div></div>'+
  '</div></div>';
  h+='<div class="pm-box"><h5>🧭 主营产品</h5><div class="mb8">'+esc(b.main_products||'')+'</div></div>';
  h+='<div class="pm-box"><h5>💡 参考</h5><div class="pm-note">该店尚未跑深度分析（经营指标/买家国家/价格带），下轮补充。可先点「跳转店铺」看其首页与 listing 结构。</div></div>';
  h+='</div><div class="pm-right"><div class="pm-box"><h5>🆔 店铺信息</h5><div class="small">store_id: '+esc(b.store_id||'—')+'</div><div class="small muted mt8">数据来源：数据参谋供应商筛选（30d，按 GMV 降序）。</div></div></div>';
  h+='</div></div>';
  ov.innerHTML=h;
  document.body.appendChild(ov);
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
}

/* ============ 同行标杆 ============ */
function renderPeer(){
  var el=document.getElementById('panel-peer');
  var pb=D.peer_benchmark||null;
  var h='<div class="section-title">🏆 同行标杆总览</div>';
  h+='<div class="card"><div class="insight">【行业格局】标杆同行由数据参谋「供应商筛选」（30d，按 GMV 降序）实时返回，含主营类目、星等级、国家覆盖与营收表现，详见下方卡片——对标时重点看营收领先者的主营品类与定位，找可复制的赛道与差异化空隙。</div>';
  if(!pb || !(pb.peers||[]).length){
    h+='<div class="card"><div class="muted">标杆同行数据未接入。</div>'+noteBox('peer')+'</div>'; el.innerHTML=h; return h;
  }
  var name2domain={};
  var cd=(D.competitor_detail&&D.competitor_detail.stores)||[];
  cd.forEach(function(s){ name2domain[s.name]=s.domain; });
  h+='<div class="tbl-scroll"><table><thead><tr><th>#</th><th>公司</th><th>星</th><th class="num">评分</th><th class="num">评论</th><th class="num">询盘指数7d</th><th class="num">UV指数7d</th><th class="num">订单指数7d</th><th>主营</th></tr></thead><tbody>';
  (pb.peers||[]).forEach(function(x,i){
    var stars=''; for(var s=0;s<Math.round(parseFloat(x.star_level)||0);s++) stars+='★';
    var nameCell = '<span class="store-link" onclick="openStoreDetail(\''+esc(x.store_name)+'\')">'+esc(x.store_name)+'</span>';
    h+='<tr><td>'+(i+1)+'</td><td>'+nameCell+'<div class="pid">'+esc(x.store_id||'')+'</div></td>'+
      '<td>'+stars+'<span class="small muted">'+esc(x.star_level||'')+'</span></td>'+
      '<td class="num">'+esc(x.score||'—')+'</td><td class="num">'+num(x.review_cnt)+'</td>'+
      '<td class="num">'+num(x.inquiry_7d)+'</td><td class="num">'+num(x.uv_7d)+'</td><td class="num">'+num(x.order_7d)+'</td>'+
      '<td class="small">'+esc((x.main_products||'').slice(0,60))+'</td></tr>';
  });
  h+='</tbody></table></div>';
  h+='<div class="muted small">注：询盘/UV/订单为平台指数（近7日合计），非真实成交额；全部 10 家可点查看档案（前 5 家含深度分析）。</div>';
  h+='<div class="muted small">注：询盘/UV/订单为平台指数（近7日合计），非真实成交额；仅用于同行相对位置参考。</div>';
  h+=noteBox('peer')+'</div>';
  el.innerHTML=h;
}

/* ============ 管理 ============ */
function renderAdmin(){
  var el=document.getElementById('panel-admin');
  var m=D.meta||{};
  var h='<div class="section-title">管理</div>';
  h+='<div class="card"><div class="grid2">'+
    '<div><h4>店铺</h4><div class="small">'+esc(m.store_name)+'</div><div class="small muted">store_id: '+esc(m.store_id)+'</div></div>'+
    '<div><h4>数据</h4><div class="small">最新周：'+esc(m.week_label)+'</div><div class="small muted">advisory_date: '+esc(m.advisory_date)+'</div><div class="small muted">生成时间：'+esc(m.generated_at)+'</div></div>'+
  '</div>'+
  '<div class="insight info">数据源：Alibaba 数据参谋 MCP + CGS 星等级接口 + 广告 HATEOAS 接口（全站推/直通车计划+报告）。已接入：星等级/降星预警、广告计划层（花费/CPC/CPL/商机）。数据缺口（显式标注）：订单明细/复购率、RFQ、ACP站外明细 — 需接入对应接口后补齐。</div>'+
  noteBox('admin')+'</div>';
  el.innerHTML=h;
}

/* ============ 启动 ============ */
function updateDateLabel(){
  if(PERIOD==='month'){ var mm=selectedMonth(); if(mm){ document.getElementById('dateLabel').textContent = mm.month_label; return; } }
  var w=selectedWeek();
  document.getElementById('dateLabel').textContent = w ? (w.week_start+' ~ '+w.week_end) : (D.meta? D.meta.week_label:'');
}
function weekNum(w){ // 由周起始日算"第N周"
  var d=new Date(w.week_start+'T00:00:00');
  var jan1=new Date(d.getFullYear(),0,1);
  var days=Math.floor((d-jan1)/86400000);
  return Math.ceil((days + jan1.getDay()+1)/7);
}
function populatePeriodSel(){
  var ws=document.getElementById('weekSel'); ws.innerHTML='';
  if(PERIOD==='month'){
    (D.months||[]).forEach(function(m,i){ var o=document.createElement('option'); o.value=i; o.textContent=m.month_start.slice(0,7)+'月 ('+m.month_start+'~'+m.month_end+')'; ws.appendChild(o); });
    if(D.months&&D.months.length) ws.value = D.months.length-1;
    ws.onchange=function(){ SELECTED_MONTH=parseInt(this.value,10); updateDateLabel(); renderPeriod(); };
  } else {
    (D.weeks||[]).forEach(function(w,i){ var o=document.createElement('option'); o.value=i; o.textContent='2026 第'+weekNum(w)+'周 ('+w.week_start+'~'+w.week_end+')'; ws.appendChild(o); });
    if(D.weeks&&D.weeks.length) ws.value = D.weeks.length-1;
    ws.onchange=function(){ SELECTED_WEEK=parseInt(this.value,10); updateDateLabel(); renderPeriod(); };
  }
}
function boot(){
  loadScores();
  updateDateLabel();
  // 店铺切换器（双店：YH草本 / 莱华仕运动营养）
  var ss=document.getElementById('storeSel');
  var cur = window.V4_STORE || (function(){ try{ return localStorage.getItem('alibaba_store')||'yh'; }catch(e){ return 'yh'; } })();
  if (ss){ ss.value = cur; ss.onchange = function(){ try{ localStorage.setItem('alibaba_store', this.value); }catch(e){} location.reload(); }; }
  // 周/月选择器
  populatePeriodSel();
  document.getElementById('userLabel').textContent = '李嘉祥 (子账号)';
  renderPeriod(); renderFocus(); renderAI(); renderTrend(); renderExec(); renderCompete(); renderPeer(); renderAdmin();
  // tab 切换
  var tabs=document.querySelectorAll('#navbar .tab');
  tabs.forEach(function(t){
    t.onclick=function(){
      tabs.forEach(function(x){x.classList.remove('on');});
      t.classList.add('on');
      var k=t.getAttribute('data-tab');
      document.querySelectorAll('.tabpanel').forEach(function(p){p.classList.remove('on');});
      document.getElementById('panel-'+k).classList.add('on');
      if(k==='trend'){ setTimeout(drawTrendChart, 50); }
    };
  });
  // 周/月切换
  document.getElementById('segWeek').onclick=function(){ PERIOD='week'; this.classList.add('on'); document.getElementById('segMonth').classList.remove('on'); updateDateLabel(); populatePeriodSel(); renderPeriod(); };
  document.getElementById('segMonth').onclick=function(){ PERIOD='month'; this.classList.add('on'); document.getElementById('segWeek').classList.remove('on'); updateDateLabel(); populatePeriodSel(); renderPeriod(); };
  // 全局搜索
  initGlobalSearch();
}
function initGlobalSearch(){
  var inp=document.getElementById('globalSearch');
  var drop=document.getElementById('searchDrop');
  if(!inp||!drop) return;
  // 索引：tab + 板块 + 产品
  var idx=[];
  var tabs=['周期看板','重点关注','AI搜索','趋势对比','改造执行台','竞品对比','同行标杆','管理'];
  var tabIds=['period','focus','ai','trend','exec','compete','peer','admin'];
  tabs.forEach(function(t,i){ idx.push({type:'板块', name:t, tab:tabIds[i], section:''}); });
  var sections=[['店铺漏斗','funnel'],['承接效率','bearing'],['客服子账号','staff'],['店铺健康','health'],['广告花费拆解','ad'],['国家地区','country'],['市场机会','market'],['流量渠道','channel'],['买家L1+','buyerl1'],['关键词机会','keyword'],['0效果产品','zeroeffect'],['本期总结','summary'],['商机榜','opp'],['TM商机榜','tm'],['点击率榜','ctr'],['零花费榜','zero'],['高效低耗榜','eff'],['新品追踪','newprod']];
  sections.forEach(function(s){ idx.push({type:'板块', name:s[0], tab:'period', section:s[1]}); });
  var seen={};
  var catSet={};
  ['opp','inquiry','tm','ctr','zero_cost','high_eff_low_cost'].forEach(function(k){(D.lists[k]||[]).forEach(function(p){ if(!seen[p.product_id]){seen[p.product_id]=1; idx.push({type:'产品', name:(p.title||'')+' '+(p.category||''), tab:'ai', pid:p.product_id});} if(p.category && !catSet[p.category]){catSet[p.category]=1; idx.push({type:'类目', name:p.category, tab:'ai', section:'ai'});} });});
  // 中文品类词映射（蛋白/咖啡/维生素 等 → 匹配英文标题）
  var CN2EN={'蛋白':'protein','咖啡':'coffee','维生素':'vitamin','胶原':'collagen','能量':'energy','软糖':'gummies','玛卡':'maca','肌酸':'creatine','草本':'herbal','氨基酸':'amino'};
  Object.keys(CN2EN).forEach(function(cn){ idx.push({type:'关键词', name:cn+'（'+CN2EN[cn]+'）', tab:'ai', section:'ai', kw:CN2EN[cn]}); });
  inp.addEventListener('input', function(){
    var q=(inp.value||'').trim().toLowerCase();
    if(!q){ drop.style.display='none'; return; }
    var res=idx.filter(function(x){ return (x.name||'').toLowerCase().indexOf(q)>=0; }).slice(0,12);
    if(!res.length){ drop.innerHTML='<div class="sd-item muted">无匹配</div>'; drop.style.display='block'; return; }
    drop.innerHTML=res.map(function(r){
      return '<div class="sd-item" data-type="'+r.type+'" data-tab="'+r.tab+'" data-section="'+(r.section||'')+'" data-pid="'+(r.pid||'')+'" data-kw="'+(r.kw||'')+'"><span class="sd-type">'+r.type+'</span> '+esc(r.name)+'</div>';
    }).join('');
    drop.style.display='block';
  });
  drop.addEventListener('click', function(e){
    var it=e.target.closest('.sd-item'); if(!it) return;
    var tab=it.getAttribute('data-tab');
    var sec=it.getAttribute('data-section');
    var pid=it.getAttribute('data-pid');
    var kw=it.getAttribute('data-kw');
    // 切 tab
    document.querySelectorAll('#navbar .tab').forEach(function(t){ t.classList.remove('on'); });
    document.querySelector('#navbar .tab[data-tab="'+tab+'"]').classList.add('on');
    document.querySelectorAll('.tabpanel').forEach(function(p){ p.classList.remove('on'); });
    document.getElementById('panel-'+tab).classList.add('on');
    if(tab==='trend') setTimeout(drawTrendChart,50);
    drop.style.display='none'; inp.value='';
    // 产品：打开评分详情
    if(pid && pid!=='') openScore(pid);
    // 关键词：设置 AI 搜索过滤
    if(kw){ var aiS=document.getElementById('aiSearch'); if(aiS){ aiS.value=kw; renderAITable(); } }
  });
  document.addEventListener('click', function(e){ if(!e.target.closest('#globalSearch') && !e.target.closest('#searchDrop')) drop.style.display='none'; });
}
document.addEventListener('DOMContentLoaded', boot);
