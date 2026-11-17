const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='pathology-progress-v1';
let chapters=[], all=[], state={mode:'home',selected:[],filter:'all',random:false,index:0,exam:null,error:'',reviewedId:null,currentQuestionId:null};
let records=read();
function read(){try{let d=JSON.parse(localStorage.getItem(KEY));if(d&&d.version===1)return {...d,favorites:d.favorites||{},wrongCounts:d.wrongCounts||Object.fromEntries(Object.entries(d.practice||{}).filter(([,v])=>!v.correct).map(([id])=>[id,1])),studyHistory:d.studyHistory||Object.keys(d.study||{}).sort((a,b)=>d.study[a]-d.study[b]),practiceHistory:d.practiceHistory||Object.keys(d.practice||{}).sort((a,b)=>d.practice[a].time-d.practice[b].time)}}catch{}return {version:1,study:{},practice:{},examDone:{},exams:[],favorites:{},wrongCounts:{},studyHistory:[],practiceHistory:[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(records))}
function chapterList(){return [{id:'0',name:'收藏题目',questions:all.filter(q=>records.favorites[q.id])},...chapters]}
function inScope(q){return state.selected.includes(q.chapterId)||(state.selected.includes('0')&&!!records.favorites[q.id])}
function qs(){return all.filter(inScope).filter(q=>state.filter==='all'||(state.filter==='wrong'?!!records.practice[q.id]&&!records.practice[q.id].correct:(state.mode==='study'?!!records.study[q.id]:!!records.practice[q.id])===(state.filter==='done')))}
function pool(){let a=qs();if(state.filter==='wrong')return [...a].sort((x,y)=>(records.wrongCounts[y.id]||0)-(records.wrongCounts[x.id]||0)||x.number-y.number||Number(x.chapterId)-Number(y.chapterId));return state.random?[...a].sort((x,y)=>hash(x.id)-hash(y.id)):a}
function hash(s){let h=0;for(let c of s)h=(h*31+c.charCodeAt(0))|0;return (h^state.seed)>>>0}
function progress(c,mode){let n=c.questions.length,d=c.questions.filter(q=>mode==='study'?records.study[q.id]:mode==='practice'?records.practice[q.id]:records.examDone[q.id]).length;return [d,n]}
function header(){return `<header class="top"><div class="brand"><b>✚</b> 病理学刷题</div><button onclick="goHome()">首页</button></header>`}
function frame(inner){$('#app').innerHTML=`<div class="shell">${header()}${inner}<footer class="footer">13 章 · ${all.length} 道中文选择题 · 学习记录仅保存在当前浏览器</footer></div>`}
function cards(mode){return `<div class="cards">${chapterList().map(c=>{let [d,n]=progress(c,mode);return `<button class="card" onclick="enter('${mode}','${c.id}')"><div class="number">CHAPTER ${String(c.id).padStart(2,'0')}</div><h3>${esc(c.name)}</h3><div class="stats"><span>${n} 题</span><span>${d} / ${n} ${mode==='study'?'已看':mode==='practice'?'已做':'已考'}</span></div><div class="bar"><i style="width:${n?d/n*100:0}%"></i></div></button>`}).join('')}</div>`}
function home(){frame(`<section class="hero"><div class="eyebrow">PATHOLOGY QUESTION BANK</div><h1>让每一道题，都有迹可循。</h1><p>选择章节，按自己的节奏学习、练习或模拟考试。无需登录，进度自动留在你的浏览器中。</p></section><div class="modes"><button class="mode" onclick="choose('study')"><div class="icon">📖</div><h3>学习模式 →</h3><p>打开即看答案，记录已看题目</p></button><button class="mode" onclick="choose('practice')"><div class="icon">✎</div><h3>刷题模式 →</h3><p>即时判题，按顺序或随机练习</p></button><button class="mode" onclick="choose('exam')"><div class="icon">▦</div><h3>组卷模式 →</h3><p>自主选章组卷，交卷后统一查看结果</p></button></div><div class="sectionhead"><h2>全部章节</h2><span class="sub">共 ${all.length} 道可答题目</span></div>${cards('study')}<div class="sectionhead"><h2>本地记录</h2></div><div class="toolbar"><button class="ghost" onclick="exportData()">导出备份</button><button class="ghost" onclick="$('#importFile').click()">导入备份</button><input hidden id="importFile" type="file" accept="application/json" onchange="importData(this)"></div>`)}
function choose(mode){state={...state,mode,selected:[],filter:'all',random:false,index:0,error:'',exam:null,reviewedId:null,seed:Math.random()*2**30|0};render()}
function enter(mode,id){choose(mode);state.selected=[id];render()}
function goHome(){state.mode='home';render()}
function toggleChapter(id){state.selected=state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id];state.index=0;state.reviewedId=null;render()}
function selectAll(){state.selected=chapters.map(c=>c.id);state.index=0;state.reviewedId=null;render()}
function startSelected(){if(!state.selected.length)return;state.filter='all';state.index=0;state.reviewedId=null;render()}
function filter(f){state.filter=f;state.index=0;state.reviewedId=null;render()}
function toggleRandom(){state.random=!state.random;state.seed=Math.random()*2**30|0;state.index=0;state.reviewedId=null;render()}
function previousCompleted(){
  const current=state.reviewedId||state.currentQuestionId;
  const completed=q=>state.mode==='study'?!!records.study[q.id]:!!records.practice[q.id];
  if(state.random){
    const history=state.mode==='study'?records.studyHistory:records.practiceHistory;
    const position=history.lastIndexOf(current);
    const prior=history.slice(0,position<0?history.length:position).reverse();
    return prior.map(id=>all.find(q=>q.id===id)).find(q=>q&&inScope(q)&&completed(q))||null;
  }
  const scoped=all.filter(inScope),position=scoped.findIndex(q=>q.id===current);
  for(let i=position-1;i>=0;i--)if(completed(scoped[i]))return scoped[i];
  return null;
}
function canGoPrev(){return state.filter==='undone'?!!previousCompleted():state.index>0}
function move(n){
  if(n<0&&state.filter==='undone'){
    const previous=previousCompleted();
    if(!previous)return;
    state.filter='done';state.reviewedId=null;
    state.index=pool().findIndex(q=>q.id===previous.id);
    render();return;
  }
  const a=pool();
  if(state.reviewedId){
    if(n<0&&state.index===0)return;
    state.reviewedId=null;
    state.index=Math.max(0,Math.min(a.length-1,state.index+(n<0?-1:0)));
  }else{
    const current=a.findIndex(q=>q.id===state.currentQuestionId);
    state.index=Math.max(0,Math.min(a.length-1,(current<0?state.index:current)+n));
  }
  render();
}
function jump(n){state.reviewedId=null;state.index=Number(n);render()}
function toggleFavorite(id){if(records.favorites[id])delete records.favorites[id];else records.favorites[id]=Date.now();save();render()}
function resetChapter(id){
  const chapter=chapters.find(c=>c.id===id);
  if(!chapter||!confirm(`重新刷“${chapter.name}”？该章本轮已做记录和当前错题会清空，累计做错次数会保留。`))return;
  for(const q of chapter.questions)delete records.practice[q.id];
  records.practiceHistory=records.practiceHistory.filter(qid=>!qid.startsWith(id+'-'));
  state.filter='all';state.index=0;state.reviewedId=null;
  save();render();
}
function sidebar(){return `<aside class="panel side"><h3>选择章节</h3>${chapterList().map(c=>`<div class="chapterline"><label class="chaptercheck"><input type="checkbox" ${state.selected.includes(c.id)?'checked':''} onchange="toggleChapter('${c.id}')">${c.id==='0'?'★ 第 0 章 · ':''}${esc(c.name)}${c.id==='0'?`（${c.questions.length}）`:''}</label>${state.mode==='practice'&&c.id!=='0'?`<button class="reset" onclick="resetChapter('${c.id}')" title="清空本章本轮刷题记录">重新刷</button>`:''}</div>`).join('')}<button class="ghost" style="margin-top:16px;width:100%" onclick="selectAll()">选择全部原章节</button>${state.mode!=='exam'?`<button class="primary" style="margin-top:10px;width:100%" onclick="startSelected()" ${state.selected.length?'':'disabled'}>${state.mode==='study'?'开始学习':'开始刷题'}</button>`:''}</aside>`}
function qview(q,mode,selectedAnswer){let answer=q.answer, reveal=mode==='study'||mode==='practice'&&!!selectedAnswer, favoriteOnly=state.selected.length===1&&state.selected[0]==='0';return `<div class="qmeta"><span>${favoriteOnly?'第 0 章 · 收藏题目':`${esc(q.chapterName)} · 原题 ${q.number}`}</span><span>${state.index+1} / ${mode==='exam'?state.exam.questions.length:pool().length+(state.reviewedId?1:0)}</span></div><div class="bookmarkbar">${mode==='study'?`<span class="wrongcount">做错 ${records.wrongCounts[q.id]||0} 次</span>`:''}<button class="bookmark ${records.favorites[q.id]?'saved':''}" onclick="toggleFavorite('${q.id}')" aria-label="${records.favorites[q.id]?'取消收藏':'收藏题目'}">${records.favorites[q.id]?'★ 已收藏':'☆ 收藏题目'}</button></div><h2 class="stem">${esc(q.stem)}</h2><div class="options">${Object.entries(q.options).map(([k,v])=>`<button class="option ${reveal&&answer===k?'correct':''} ${reveal&&selectedAnswer===k&&k!==answer?'wrong':''} ${mode==='exam'&&selectedAnswer===k?'selected':''}" ${mode==='study'||mode==='practice'&&selectedAnswer?'disabled':''} onclick="answerQuestion('${k}')"><b>${k}</b><span>${esc(v)}</span></button>`).join('')}</div>${reveal?`<div class="answer ${selectedAnswer&&selectedAnswer!==answer?'bad':''}">${mode==='study'?'正确答案':selectedAnswer===answer?'回答正确，答案':'回答错误，正确答案'}：${answer}</div>`:''}`}
function studyPractice(){
  const title=state.mode==='study'?'学习模式':'刷题模式';
  const a=pool();
  let q=state.reviewedId?all.find(x=>x.id===state.reviewedId):a[Math.min(state.index,a.length-1)];
  state.currentQuestionId=q?.id||null;
  if(q&&state.mode==='study'){
    let changed=false;
    if(!records.study[q.id]){records.study[q.id]=Date.now();if(state.filter==='undone')state.reviewedId=q.id;changed=true}
    if(records.studyHistory.at(-1)!==q.id){records.studyHistory.push(q.id);changed=true}
    if(changed)save();
  }
  const scoped=all.filter(inScope), selectedCount=scoped.length;
  const done=scoped.filter(x=>state.mode==='study'?records.study[x.id]:records.practice[x.id]).length;
  const correct=scoped.filter(x=>records.practice[x.id]?.correct).length;
  const wrong=scoped.filter(x=>records.practice[x.id]&&!records.practice[x.id].correct).length;
  const heading=state.selected.length===1?chapterList().find(c=>c.id===state.selected[0])?.name:`已选 ${state.selected.length} 章`;
  const favoriteOnly=state.selected.length===1&&state.selected[0]==='0';
  const jumpOptions=(state.reviewedId?'<option selected>当前题（已完成）</option>':'')+a.map((x,i)=>`<option value="${i}" ${!state.reviewedId&&i===state.index?'selected':''}>${i+1} · ${favoriteOnly?'收藏题目':esc(x.chapterName)} #${favoriteOnly?i+1:x.number}</option>`).join('');
  frame(`<div class="sectionhead"><div><div class="eyebrow">${title}</div><h2>${state.selected.length?esc(heading):'请选择章节'}</h2></div><div class="toolbar"><button class="ghost" onclick="choose('${state.mode}')">重新选章</button></div></div><div class="layout">${sidebar()}<main><div class="summary"><div class="metric"><strong>${selectedCount}</strong><span>总题数</span></div><div class="metric"><strong>${done}</strong><span>${state.mode==='study'?'已看':'已做'}</span></div><div class="metric"><strong>${selectedCount-done}</strong><span>${state.mode==='study'?'未看':'未做'}</span></div><div class="metric"><strong>${state.mode==='study'?(selectedCount?Math.round(done/selectedCount*100):0):(done?Math.round(correct/done*100):0)}%</strong><span>${state.mode==='study'?'学习进度':'正确率'}</span></div></div><div class="toolbar"><button class="${state.filter==='all'?'active':'ghost'}" onclick="filter('all')">全部</button><button class="${state.filter==='done'?'active':'ghost'}" onclick="filter('done')">${state.mode==='study'?'已看':'已做'}</button><button class="${state.filter==='undone'?'active':'ghost'}" onclick="filter('undone')">${state.mode==='study'?'未看':'未做'}</button>${state.mode==='study'?`<button class="${state.filter==='wrong'?'active':'ghost'}" onclick="filter('wrong')">错题（${wrong}）</button>`:''}${state.mode==='practice'?`<button class="ghost" onclick="toggleRandom()">${state.random?'随机顺序':'原题顺序'} · 切换</button>`:''}</div><div style="height:16px"></div>${q?`<article class="question">${qview(q,state.mode,records.practice[q.id]?.answer)}<div class="nav"><button class="ghost" onclick="move(-1)" ${canGoPrev()?'':'disabled'}>← 上一题</button><select aria-label="跳转题目" onchange="jump(this.value)">${jumpOptions}</select><button class="primary" onclick="move(1)" ${(state.reviewedId?a.length===0:state.index>=a.length-1)?'disabled':''}>下一题 →</button></div></article>`:`<div class="panel">${state.selected.length?'当前筛选下没有题目。':'选择左侧章节后开始。'}</div>`}</main></div>`);
}
function answerQuestion(k){if(state.mode==='practice'){let q=state.reviewedId?all.find(x=>x.id===state.reviewedId):pool()[state.index];if(!q||records.practice[q.id])return;records.practice[q.id]={answer:k,correct:k===q.answer,time:Date.now()};if(k!==q.answer)records.wrongCounts[q.id]=(records.wrongCounts[q.id]||0)+1;records.practiceHistory.push(q.id);if(state.filter==='undone')state.reviewedId=q.id;save();render()}else if(state.mode==='exam'&&state.exam&&!state.exam.submitted){let q=state.exam.questions[state.index];state.exam.answers[q.id]=k;render()}}
function examSetup(){let scoped=all.filter(inScope),n=scoped.length,unseen=scoped.filter(q=>!records.examDone[q.id]).length;frame(`<div class="sectionhead"><div><div class="eyebrow">EXAM MODE</div><h2>创建模拟试卷</h2><div class="sub">选择范围与题量，交卷后统一查看答案</div></div></div><div class="layout">${sidebar()}<main class="panel form"><div class="summary"><div class="metric"><strong>${n}</strong><span>所选章节题量</span></div><div class="metric"><strong>${unseen}</strong><span>组卷未做题量</span></div></div><label for="count">本次题目数量</label><input id="count" type="number" min="1" max="${n}" value="${Math.min(30,n||30)}"><label for="scope">抽题范围</label><select id="scope"><option value="unseen">仅抽组卷模式未做题目</option><option value="all">从所选章节全部题目中抽取</option></select>${state.error?`<div class="notice">${esc(state.error)}</div>`:''}<div style="margin-top:25px"><button class="primary" onclick="startExam()">开始考试</button></div><p class="sub">学习和刷题记录不会影响这里的未做题目池。</p></main></div>`)}
function startExam(){let count=Number($('#count').value),scope=$('#scope').value,p=all.filter(q=>inScope(q)&&(scope==='all'||!records.examDone[q.id]));if(!state.selected.length||!Number.isInteger(count)||count<1||count>p.length){state.error=`可用题目 ${p.length} 道。请选章并将题量设置为 1–${p.length}。`;render();$('#count').value=String(count);$('#scope').value=scope;return}for(let i=p.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]]}state.exam={questions:p.slice(0,count),answers:{},submitted:false,start:Date.now(),favoriteOnly:state.selected.length===1&&state.selected[0]==='0'};state.index=0;state.error='';render()}
function exam(){let e=state.exam,q=e.questions[state.index],done=e.questions.filter(x=>e.answers[x.id]).length;frame(`<div class="sectionhead"><div><div class="eyebrow">模拟考试</div><h2>${e.submitted?'考试结果':'正在答题'}</h2></div><button class="ghost" onclick="goHome()">返回首页</button></div>${e.submitted?results():`<div class="summary"><div class="metric"><strong>${done} / ${e.questions.length}</strong><span>已答题目</span></div><div class="metric"><strong>${Math.round(done/e.questions.length*100)}%</strong><span>答题进度</span></div></div><div class="bar"><i style="width:${done/e.questions.length*100}%"></i></div><div style="height:18px"></div><article class="question">${qview(q,'exam',e.answers[q.id])}<div class="nav"><button class="ghost" onclick="examMove(-1)" ${state.index===0?'disabled':''}>← 上一题</button><button class="primary" onclick="examMove(1)" ${state.index===e.questions.length-1?'disabled':''}>下一题 →</button></div></article><div class="examgrid">${e.questions.map((x,i)=>`<button class="${e.answers[x.id]?'done':''} ${i===state.index?'now':''}" onclick="examJump(${i})">${i+1}</button>`).join('')}</div><div style="margin-top:22px;text-align:right"><button class="primary" onclick="submitExam()">交卷并查看成绩</button></div>`}`)}
function examMove(n){state.index=Math.max(0,Math.min(state.exam.questions.length-1,state.index+n));render()}
function examJump(i){state.index=i;render()}
function submitExam(){let e=state.exam;if(!e||e.submitted)return;let unanswered=e.questions.filter(q=>!e.answers[q.id]).length;if(unanswered&&!confirm(`还有 ${unanswered} 道题未作答。确定交卷吗？`))return;e.submitted=true;e.end=Date.now();for(let q of e.questions)if(e.answers[q.id])records.examDone[q.id]=e.end;records.exams.unshift({time:e.end,ids:e.questions.map(q=>q.id),answers:{...e.answers}});save();render()}
function results(){let e=state.exam,answered=e.questions.filter(q=>e.answers[q.id]),right=answered.filter(q=>e.answers[q.id]===q.answer).length;return `<div class="summary"><div class="metric"><strong>${right}</strong><span>正确题数</span></div><div class="metric"><strong>${e.questions.length-right}</strong><span>错误或未答</span></div><div class="metric"><strong>${e.questions.length?Math.round(right/e.questions.length*100):0}%</strong><span>正确率</span></div><div class="metric"><strong>${e.questions.length}</strong><span>试卷题数</span></div></div><div class="panel"><h3>逐题回顾</h3>${e.questions.map((q,i)=>`<details class="resultrow"><summary>第 ${i+1} 题${e.favoriteOnly?'':` · ${esc(q.chapterName)} #${q.number}`} <span style="color:${e.answers[q.id]===q.answer?'#168453':'#c2443d'}">${e.answers[q.id]===q.answer?'正确':e.answers[q.id]?'错误':'未答'}</span></summary><div class="bookmarkbar"><button class="bookmark ${records.favorites[q.id]?'saved':''}" onclick="toggleFavorite('${q.id}')">${records.favorites[q.id]?'★ 已收藏':'☆ 收藏题目'}</button></div><p class="stem" style="font-size:16px">${esc(q.stem)}</p>${Object.entries(q.options).map(([k,v])=>`<p style="white-space:pre-line;color:${k===q.answer?'#168453':k===e.answers[q.id]?'#c2443d':'inherit'}">${k}. ${esc(v)}</p>`).join('')}<b>你的答案：${esc(e.answers[q.id]||'未答')}　正确答案：${q.answer}</b></details>`).join('')}</div><div style="margin-top:20px"><button class="primary" onclick="choose('exam')">再组一卷</button></div>`}
function exportData(){let b=new Blob([JSON.stringify(records,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='病理学刷题记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function importData(el){let f=el.files[0];if(!f)return;try{let d=JSON.parse(await f.text());if(d.version!==1||!d.study||!d.practice||!d.examDone||!Array.isArray(d.exams))throw Error('格式不正确');if(!confirm('导入将覆盖当前浏览器的学习记录，确定继续吗？'))return;records={...d,favorites:d.favorites||{},wrongCounts:d.wrongCounts||Object.fromEntries(Object.entries(d.practice).filter(([,v])=>!v.correct).map(([id])=>[id,1])),studyHistory:d.studyHistory||Object.keys(d.study).sort((a,b)=>d.study[a]-d.study[b]),practiceHistory:d.practiceHistory||Object.keys(d.practice).sort((a,b)=>d.practice[a].time-d.practice[b].time)};save();render()}catch(e){alert('导入失败：'+e.message)}}
function render(){if(state.mode==='home')home();else if(state.mode==='exam')state.exam?exam():examSetup();else studyPractice()}
fetch('questions.json?v=4').then(r=>r.json()).then(data=>{chapters=data;all=data.flatMap(c=>c.questions.map(q=>({...q,chapterId:c.id,chapterName:c.name})));let changed=false;for(const q of all){const done=records.practice[q.id];if(done&&done.correct!==(done.answer===q.answer)){done.correct=done.answer===q.answer;changed=true}}if(changed)save();render()}).catch(()=>{$('#app').textContent='题库加载失败，请刷新页面重试。'});
Object.assign(window,{goHome,choose,enter,toggleChapter,selectAll,startSelected,filter,toggleRandom,move,jump,toggleFavorite,answerQuestion,startExam,examMove,examJump,submitExam,exportData,importData});
document.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;
  const step=event.key==='ArrowRight'?1:-1;
  if((state.mode==='study'||state.mode==='practice')&&state.selected.length&&(pool().length||state.reviewedId)){event.preventDefault();move(step)}
  else if(state.mode==='exam'&&state.exam&&!state.exam.submitted){event.preventDefault();examMove(step)}
});



