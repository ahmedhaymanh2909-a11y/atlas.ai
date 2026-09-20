(function(){
  try{
    var raw=localStorage.getItem('atlas_theme');
    var t=raw?JSON.parse(raw):null;
    if(!t||!t.mode){t={mode:'system',accent:'#8ab4ff',bold_font:false};localStorage.setItem('atlas_theme',JSON.stringify(t));}
    function contrast(hex){hex=(hex||'#8ab4ff').replace('#','');var r=parseInt(hex.slice(0,2),16)||138,g=parseInt(hex.slice(2,4),16)||180,b=parseInt(hex.slice(4,6),16)||255;return (r*299+g*587+b*114)/1000>160?'#050505':'#ffffff'}
    function apply(t){var b=document.body;if(!b)return; b.classList.remove('theme-white','theme-custom','theme-system','theme-system-light','theme-system-dark'); if(t.mode==='white')b.classList.add('theme-white'); else if(t.mode==='custom')b.classList.add('theme-custom'); else if(t.mode==='system'){b.classList.add('theme-system'); b.classList.add(window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches?'theme-system-light':'theme-system-dark');} b.classList.toggle('font-bold',!!t.bold_font); document.documentElement.style.setProperty('--accent',t.accent||'#8ab4ff');document.documentElement.style.setProperty('--accentText',contrast(t.accent));document.documentElement.style.setProperty('--custom-accent',t.accent||'#8ab4ff');document.documentElement.style.setProperty('--system-accent',t.accent||'#8ab4ff');}
    apply(t);
    fetch('/api/settings',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(d){if(d&&d.theme){var x={mode:d.theme.mode||'system',accent:d.theme.accent||'#8ab4ff',bold_font:!!d.theme.bold_font};localStorage.setItem('atlas_theme',JSON.stringify(x));apply(x);}}).catch(function(){});
    window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(){try{var x=JSON.parse(localStorage.getItem('atlas_theme')||'{}');if(x.mode==='system')apply(x);}catch(e){}});
  }catch(e){}
})();


(()=>{
const $=id=>document.getElementById(id);
const chat=$('chat'),welcome=$('welcome'),composer=$('composer'),textBox=$('textBox'),sendBtn=$('sendBtn'),modeMenu=$('modeMenu'),closeModeBtn=$('closeModeBtn'),modeLabel=$('modeLabel'),modeNote=$('modeNote'),mediaPanel=$('mediaPanel'),referenceStrip=$('referenceStrip'),callBtn=$('callBtn'),sidebar=$('sidebar'),sidebarOverlay=$('sidebarOverlay'),sideToggle=$('sideToggle'); const statusEl=document.getElementById('composerStatus'); const status={_text:'',set textContent(v){this._text=String(v||'');if(statusEl)statusEl.textContent=this._text;},get textContent(){return this._text;}}; const editingBanner={classList:{add(){},remove(){}}}; const editingLabel={textContent:''};

let currentUser='',currentRole='',currentChatId=null,currentChatTitle='New chat',chatListData=[],signupMode=false,editingIndex=null;const welcomePrompts=["Just say Atlas and I am all ears...","Need help imagine something? Create Videos up to 15 seconds, and images up to 4K, just Imagine and I am all ears...","People say life is harsh, that's why I'm here...","Atlas is always seeking for help...","If you are ready, I am ready too!!","Just imagine and say Atlas...","Ready for a new day with a cup of coffee...","Ready to build something new?","If you are just here to ask, well I'm fine..","I'm ready to build, but are you ready to imagine?","If you will talk I will listen...","Any conversation starts with a Hello for the day!!","You will imagine untill I will create...","Have an idea let's share it together!!","A new chat, a new idea, let's make it happen...","Tell me what you are thinking and we'll build from there...","Your next great idea can start right here..."];function randomWelcome(){const e=document.getElementById('welcomePrompt');if(e)e.textContent=welcomePrompts[Math.floor(Math.random()*welcomePrompts.length)]}
let history=[];let generationBusy=false;let currentJobId=null;let selectedImages=[],imageReferenceImages=[],videoReferenceImages=[],selectedFiles=[],selectedVideos=[],selectedAudios=[],currentController=null,mediaMode=null;
const OPENROUTER_MODEL_CAPABILITIES={
  'google/gemma-4-26b-a4b-it:free':{image:true,video:true,file:true},
  'inclusionai/ling-3.0-flash-vl:free':{image:true,video:false,file:true},
  'minimax/minimax-m3:free':{image:true,video:false,file:true}
};
const ATLAS_MODEL_CAPABILITIES={
  'agnes-3.0-flash':{image:true,video:false,audio:false,file:true},
  'agnes-2.0-flash':{image:true,video:false,audio:false,file:true},
  'agnes-2.5-flash':{image:true,video:false,audio:false,file:true}
};
const NVIDIA_MODEL_CAPABILITIES={
  'meta/muse-glimmer-30b':{image:true,video:false,audio:false,file:false},
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning':{image:true,video:true,audio:true,file:true},
  'meta/llama-3.2-11b-vision-instruct':{image:true,video:false,audio:false,file:false}
};
const MODEL_CAPABILITY_LABELS={
  'google/gemma-4-26b-a4b-it:free':['Text','Vision','Video','Files','Reasoning','Tools'],
  'meta/muse-glimmer-30b':['Text','Vision','Files','Reasoning','Tools'],
  'agnes-3.0-flash':['Text','Vision','Files','Tools'],
  'inclusionai/ling-3.0-flash-vl:free':['Text','Vision','Files','Reasoning','Tools'],
  'minimax/minimax-m3:free':['Text','Image view','Coding','Atlas','Files'],
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning':['Text','Vision','Video','Audio','Reasoning','Files'],
  'meta/llama-3.2-11b-vision-instruct':['Text','Vision']
};
const TTS_MODEL_INFO={
  'fish-audio/s2.1-pro-free:free':{label:'S2.1 Pro Free',desc:'Free • multilingual • expressive speech'},
  'deepgram/flux-tts:free':{label:'Flux TTS',desc:'Free • English • 36 voices'}
};
function modelSupportText(id){const caps=OPENROUTER_MODEL_CAPABILITIES[id]||ATLAS_MODEL_CAPABILITIES[id]||NVIDIA_MODEL_CAPABILITIES[id];const labels=MODEL_CAPABILITY_LABELS[id]||[];const capWords=[];if(caps?.image)capWords.push('Image');if(caps?.video)capWords.push('Video');if(caps?.audio)capWords.push('Audio');if(caps?.file)capWords.push('Files');return [...labels,...capWords].filter((v,i,a)=>a.indexOf(v)===i).join(' • ')||'Text';}
function isOpenRouterSelected(){return !!OPENROUTER_MODEL_CAPABILITIES[String(activeModels?.text||'')]}
function isNvidiaVisionSelected(){return !!NVIDIA_MODEL_CAPABILITIES[String(activeModels?.text||'')]}
function isAtlasTextModelSelected(){return /^agnes-(3\.0|2\.0|2\.5)-flash$/i.test(String(activeModels?.text||''))}
function currentOpenRouterCapabilities(){return OPENROUTER_MODEL_CAPABILITIES[String(activeModels?.text||'')]||ATLAS_MODEL_CAPABILITIES[String(activeModels?.text||'')]||NVIDIA_MODEL_CAPABILITIES[String(activeModels?.text||'')]||null}
function syncProviderMenu(){
  const caps=currentOpenRouterCapabilities();const inGeneration=!!mediaMode,inVideo=mediaMode==='video';const imageAvailable=inGeneration?true:!!caps?.image;const videoAvailable=inGeneration?true:!!caps?.video;const audioAvailable=!!caps?.audio;const fileAvailable=!!caps?.file;
  const imageEl=$('menuUploadBtn'),cameraEl=$('menuCameraBtn'),fileEl=$('menuFileBtn');
  if(imageEl){imageEl.hidden=mediaMode==='audio'||!imageAvailable;const maxImages=inGeneration?1:2;imageEl.disabled=selectedImages.length>=maxImages||selectedVideos.length>0||selectedAudios.length>0;imageEl.title=inVideo?'Add one animation image':mediaMode==='image'?'Add image to edit':inGeneration?'Add one image':'Upload image'}
  if(cameraEl){cameraEl.hidden=mediaMode==='audio'||!imageAvailable;const maxImages=inGeneration?1:2;cameraEl.disabled=selectedImages.length>=maxImages||selectedVideos.length>0||selectedAudios.length>0;cameraEl.title=mediaMode==='video'?'Capture one animation image':mediaMode==='image'?'Capture image to edit':'Take photo'}
  if(fileEl){fileEl.hidden=inGeneration||mediaMode==='audio'||!fileAvailable;fileEl.disabled=selectedFiles.length>=2||selectedVideos.length>0||selectedAudios.length>0;fileEl.title=selectedFiles.length>=2?'Maximum 2 files':'Attach files'}
  renderRefs();
}
let imageQuality=1,imageRatio='1:1',videoRatio='16:9',videoDuration=5,videoQuality='720P',videoFrames=151,videoFps=30, imageEnhanceEnabled=false, videoEnhanceEnabled=true, videoEnhanceBusy=false;let deepSearchMode=false,thinkMode=false;let pendingGeneratedImage=null;let activeJobIds=new Set(),jobPollers=new Map(),jobUi=new Map(),jobPollInFlight=new Set(),jobCompleted=new Set();let speechRecognition=null,speechFinal=''; let developerUsers=[]; let usageWindow='hour';const draft={quality:1,imageRatio:'1:1',videoDuration:5,videoRatio:'16:9',videoFrames:151,videoFps:30};
const VIDEO_FRAMES_MIN=9,VIDEO_FRAMES_MAX=441,VIDEO_FPS_MIN=1,VIDEO_FPS_MAX=60,VIDEO_DEFAULT_FPS=30;
const VIDEO_NORMAL_USER_FPS={1:30,2:30,3:30,4:30,5:30,6:30,7:30,8:30,9:30,10:30,11:30,12:30,13:30,14:30,15:29};
const VIDEO_NORMAL_USER_FRAMES={1:33,2:57,3:89,4:121,5:153,6:185,7:209,8:241,9:273,10:305,11:337,12:361,13:393,14:417,15:441};let activeModels={text:'agnes-3.0-flash',image:'agnes-image-2.1-flash',video:'agnes-video-v2.0'};let generationDefaults={image_steps:100,video_steps:100};let imageSteps=100,videoSteps=100;let videoStepsSlider=null;
const makeMessageId=()=> 'm_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
let audioDuration=30,audioSteps=120,audioInstrumental=false,audioThinking=true,audioQualityLabel='Medium';
function metaObject(m){return parseMeta(m?.meta||'')}
function sanitizeFrontendText(value){let s=String(value??'');const repl=[[/\bPixazo\b/gi,'Atlas'],[/\bAgnes\b/gi,'Atlas'],[/\bIsness\b/gi,'Atlas'],[/\bNVIDIA\b/gi,'Alpha Technologies'],[/\bOpenRouter\b/gi,'Alpha Technologies'],[/\bOpenAI\b/gi,'Alpha Technologies'],[/\bAnthropic\b/gi,'Alpha Technologies'],[/\bGoogle\b/gi,'Alpha Technologies'],[/\bGemini\b/gi,'Atlas'],[/\bMuse Glimmer\b/gi,'Atlas Text'],[/\bWhisper\b/gi,'Atlas Audio']];for(const [re,to] of repl)s=s.replace(re,to);return s}
function cleanGenerationText(value,fallback='Generating…'){const s=sanitizeFrontendText(value).replace(/\b\d+\s*steps?\b/gi,'').trim();return s||fallback}
function isGenerationEntry(m){const k=metaObject(m).kind;return k==='image'||k==='video'||k==='audio'||k==='chat_generation'}
function makeMeta(meta){return typeof meta==='string'?parseMeta(meta):({...meta})}
function newMessage(role,content,meta={}){const obj={id:makeMessageId(),created_at:Date.now()/1000,role,content,meta:JSON.stringify({...meta,created_at:Date.now()/1000})};return obj}

function setAuthMode(signup){signupMode=signup;document.getElementById('authTitle').textContent=signup?'Create your account':'Welcome back';document.getElementById('authSubtitle').textContent=signup?'Choose a unique username and a password with at least four characters.':'Sign in to keep your chats, images, and videos saved.';document.getElementById('authHint').textContent=signup?'Username must be unique. New passwords must be at least four characters.':'Enter your existing password to log in.';document.getElementById('authSubmit').textContent=signup?'Create account':'Log in';document.getElementById('authSwitch').textContent=signup?'Already have an account? Log in':'Create a new account';document.getElementById('authError').textContent='';const p=document.getElementById('authPass');p.type='password';document.getElementById('togglePassword').textContent='Show'}
let firstProfilePending=false;
let alarmList=[],alarmEditorState=null,alarmWakeRecognition=null,alarmSpeechActive=false,alarmPollTimer=null,alarmGeoLocation=null,alarmTeams=[];
const ALARM_WEEKDAYS=[["Sun","0"],["Mon","1"],["Tue","2"],["Wed","3"],["Thu","4"],["Fri","5"],["Sat","6"]];
const ALARM_LEAGUES=["Premier League","La Liga","Champions League","NBA","NFL","NHL","MLB"];
const alarmToggles={time:true,weather:false,match:false};
async function authSubmit(){const err=document.getElementById('authError'),btn=document.getElementById('authSubmit');const username=document.getElementById('authUser').value.trim(),password=document.getElementById('authPass').value;if(!username||!password){err.textContent='Username and password are required.';return}if(signupMode&&password.length<4){err.textContent='New account passwords must be at least four characters.';return}btn.disabled=true;const old=btn.textContent;btn.textContent=signupMode?'Creating…':'Signing in…';try{const r=await fetch('/api/auth/'+(signupMode?'signup':'login'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({username,password,remember:!!document.getElementById('rememberMe')?.checked})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Authentication failed.');currentUser=d.username;currentRole=d.role||'';firstProfilePending=!!d.new_user||!!d.profile_required;sessionStorage.setItem('atlasUnlocked','1');await enterApp(d.username,d.role||'',true)}catch(e){err.textContent=e.message||'Could not sign in.'}finally{btn.disabled=false;btn.textContent=old}}
function showFirstProfileModal(){const modal=$('firstProfileModal');if(!modal)return;modal.classList.add('show');modal.setAttribute('aria-hidden','false');$('firstProfileName').focus()}
function hideFirstProfileModal(){const modal=$('firstProfileModal');if(!modal)return;modal.classList.remove('show');modal.setAttribute('aria-hidden','true')}
async function saveFirstProfile(){const name=$('firstProfileName').value.trim(),nickname=$('firstProfileNickname').value.trim(),age=$('firstProfileAge').value.trim();if(!name||!nickname||!age){$('firstProfileError').textContent='Please enter your name, nickname, and age.';return}if(!/^\d{1,3}$/.test(age)){ $('firstProfileError').textContent='Please enter a valid age.';return }const r=await fetch('/api/settings/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{name,nickname,age}})});const d=await r.json().catch(()=>({}));if(!r.ok){$('firstProfileError').textContent=d.error||'Could not save your profile.';return}settingsData=d.settings||settingsData;hideFirstProfileModal();firstProfilePending=false;renderMemory(settingsData.memory||[]);status.textContent='Profile saved.';setTimeout(()=>{if(status.textContent==='Profile saved.')status.textContent=''},1200)}
async function enterApp(username,role='',alreadyUnlocked=false){currentUser=username;currentRole=role||'';document.getElementById('authScreen').style.display='none';document.getElementById('mainApp').style.display='flex';document.getElementById('currentUser').textContent='@'+username+(currentRole==='developer'?' · developer':'');document.getElementById('developerBadge').style.display=currentRole==='developer'?'block':'none';document.querySelectorAll('.developer-only').forEach(el=>{el.hidden=currentRole!=='developer'});document.getElementById('studioSidebarBtn')?.setAttribute('aria-hidden',currentRole!=='developer');document.getElementById('toolsSidebarBtn')?.setAttribute('aria-hidden',currentRole!=='developer');randomWelcome();await loadSettings();firstProfilePending=!!firstProfilePending||!!settingsData?.profile_required;await loadChatList();if(chatListData.length)await openChat(chatListData[0].id);else await newChat();await refreshBackgroundJobs();startAlarmPolling();if(firstProfilePending)showFirstProfileModal()}
function setSidebar(open){if(!sidebar)return;sidebar.classList.toggle('open',!!open);sidebarOverlay.classList.toggle('show',!!open)}
async function loadChatList(){
  const r=await fetch('/api/chats');if(r.status===401){location.reload();return}
  const d=await r.json();chatListData=(d.chats||[]).filter(c=>c.has_messages!==false && Number(c.message_count||0)>0);const el=document.getElementById('chatList');el.innerHTML='';
  chatListData.forEach(c=>{
    const b=document.createElement('div');b.className='chat-item'+(c.id===currentChatId?' active':'');
    const main=document.createElement('div');main.className='chat-item-main';
    const title=document.createElement('div');title.className='chat-item-title';title.textContent=c.title||'New chat';
    const actions=document.createElement('div');actions.className='chat-item-actions';
    const edit=document.createElement('button');edit.type='button';edit.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2 2 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>';edit.title='Rename chat';edit.onclick=e=>{e.stopPropagation();renameChat(c.id,c.title||'New chat');b.classList.remove('long-press-actions')};
    const del=document.createElement('button');del.type='button';del.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/><path d="M10 11v5M14 11v5"/></svg>';del.title='Delete chat';del.onclick=e=>{e.stopPropagation();deleteChat(c.id)};
    actions.append(edit,del);main.append(title,actions);
    const sub=document.createElement('div');sub.className='chat-item-sub';sub.textContent=new Date(c.updated_at*1000).toLocaleString();b.append(main,sub);
    let holdTimer=null,longPressed=false;const clearHold=()=>{if(holdTimer){clearTimeout(holdTimer);holdTimer=null}};
    b.addEventListener('pointerdown',e=>{if(e.button!=null&&e.button!==0)return;longPressed=false;clearHold();holdTimer=setTimeout(()=>{longPressed=true;b.classList.add('long-press-actions');navigator.vibrate?.(20);},520)});
    b.addEventListener('pointerup',clearHold);b.addEventListener('pointercancel',clearHold);b.addEventListener('pointerleave',clearHold);
    b.addEventListener('contextmenu',e=>{e.preventDefault();longPressed=true;b.classList.add('long-press-actions')});
    b.onclick=()=>{if(longPressed){longPressed=false;return}setSidebar(false);openChat(c.id)};el.appendChild(b);
  });
}
async function renameChat(id,oldTitle){const next=window.prompt('Rename chat',oldTitle||'New chat');if(next===null)return;const title=next.trim().split(/\s+/).slice(0,3).join(' ').slice(0,80).trim();if(!title)return;const r=await fetch('/api/chats/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title})});if(r.ok){if(id===currentChatId)currentChatTitle=title;await loadChatList()}}
async function deleteChat(id){if(!window.confirm('Delete this chat?'))return;const r=await fetch('/api/chats/'+encodeURIComponent(id),{method:'DELETE'});if(!r.ok){status.textContent='Could not delete chat.';return}if(id===currentChatId){currentChatId=null;history=[];await newChat()}else await loadChatList()}
async function newChat(){currentChatId=null;currentChatTitle='New chat';history=[];editingIndex=null;chat.innerHTML='';welcome.style.display='grid';chat.appendChild(welcome);randomWelcome();clearEditing();setSidebar(false);renderHistory(false);await loadChatList()}
async function ensureCurrentChat(){
  if(currentChatId)return true;
  const r=await fetch('/api/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'New chat'})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.chat){status.textContent=d.error||'Could not create chat.';return false}
  currentChatId=d.chat.id;currentChatTitle=d.chat.title||'New chat';
  return true;
}
function parseMeta(meta){if(meta&&typeof meta==='object')return meta;try{return meta?JSON.parse(meta):{}}catch{return{}}}
function addChatGeneration(kind,jobId,label,index=-1){
  showChat();
  const row=document.createElement('div');row.className='message-row ai generation-inline';
  const card=document.createElement('div');card.className='chat-generation-card '+(kind==='chat'?'thinking-only':'');card.dataset.jobId=jobId;card.dataset.kind=kind;
  const head=document.createElement('div');head.className='chat-generation-head';
  const title=document.createElement('span');title.className='chat-generation-title';title.textContent=kind==='chat'?(label||'Thinking…'):(label||'Generating…');
  const pct=document.createElement('span');pct.className='chat-generation-pct';pct.textContent=kind==='chat'?'':'0%';
  const meta=document.createElement('div');meta.className='chat-generation-meta';meta.textContent=kind==='chat'?'':'Starting…';
  const line=document.createElement('div');line.className='chat-generation-line';const fill=document.createElement('div');fill.className='chat-generation-fill';line.appendChild(fill);if(kind!=='chat'){const notice=document.createElement('span');notice.className='chat-generation-progress-text';notice.textContent='Do not leave the application until the generation is over.';line.appendChild(notice);}
  head.append(title,pct);card.append(head,meta,line);row.appendChild(card);insertHistoryRow(row,index);
  jobUi.set(jobId,{row,card,fill,pct,meta,title,kind});return{row,card,fill,pct,meta,title};
}
function updateChatGeneration(jobId,message,pct,status='running',kind='generation'){
  const ui=jobUi.get(jobId);if(!ui)return;
  const state=String(status||'').toLowerCase();
  if(state==='queued'){
    ui.title.textContent='Queued…';
    ui.meta.textContent=cleanGenerationText(message,'Waiting for generation capacity…');
    ui.fill.classList.add('indeterminate');ui.fill.style.width='38%';ui.pct.textContent='';
    return;
  }
  if(state==='running'){
    ui.title.textContent=kind==='image'?'Generating image…':kind==='video'?'Generating video…':'Generating…';
    ui.meta.textContent=cleanGenerationText(message,'Generating…');
  }else if(message)ui.meta.textContent=cleanGenerationText(message);
  if(ui.kind==='chat')return;
  if(pct==null || Number(pct)<=0){
    if(!(Number(ui.progressValue)||0)){ui.fill.classList.add('indeterminate');ui.pct.textContent='';ui.fill.style.width='38%'}
  }else{
    const p=Math.max(0,Math.min(100,Number(pct)||0));
    ui.progressValue=Math.max(Number(ui.progressValue)||0,p);
    const shown=ui.progressValue;ui.fill.classList.remove('indeterminate');ui.fill.style.width=shown+'%';ui.pct.textContent=shown+'%';
  }
}
function finishChatGeneration(jobId,success=true){
  const ui=jobUi.get(jobId);if(!ui)return;
  ui.fill?.classList.remove('indeterminate');if(ui.fill)ui.fill.style.width=success?'100%':'0%';if(ui.pct)ui.pct.textContent=success?'100%':'';
  if(ui.meta)ui.meta.textContent=success?'Ready':'Generation failed';ui.card?.setAttribute('data-finished','1');
  if(ui.row?.isConnected)ui.row.remove();jobUi.delete(jobId);
}
function addResumeJob(job){if(!job||!job.job_id)return;activeJobIds.add(job.job_id)}
function removeResumeJob(jobId){stopThinkingTicker(jobId);activeJobIds.delete(jobId);const t=jobPollers.get(jobId);if(t)clearTimeout(t);jobPollers.delete(jobId);const ui=jobUi.get(jobId);if(ui?.row?.isConnected)ui.row.remove();jobUi.delete(jobId)}
function renderHistory(preserveScroll=true){
  const previousScrollTop=chat.scrollTop;
  chat.innerHTML='';
  // Keep persisted async-generation entries anchored after their user prompt.
  const orderedHistory=[...history].sort((a,b)=>{
    const am=metaObject(a),bm=metaObject(b);
    const ak=String(am.kind||''),bk=String(bm.kind||'');
    const ag=/^(image|video|audio|chat_generation|chat)$/.test(ak)&&a.role==='assistant';
    const bg=/^(image|video|audio|chat_generation|chat)$/.test(bk)&&b.role==='assistant';
    const at=Number(am.created_at||a.created_at||0),bt=Number(bm.created_at||b.created_at||0);
    if(Math.abs(at-bt)>.002)return at-bt;
    if(ag!==bg)return ag?1:-1;
    return 0;
  });
  if(!history.length){welcome.style.display='grid';chat.appendChild(welcome);randomWelcome();requestAnimationFrame(()=>{chat.scrollTop=0});return}
  orderedHistory.forEach((m,i)=>{
    const meta=metaObject(m);
    if(m.role==='user') addUser(messageText(m.content),m.meta||'',attachmentsFromMeta(m.meta),i);
    else if(meta.kind==='image' || meta.kind==='video' || meta.kind==='audio'){
      if(meta.status==='completed' && (meta.url || Array.isArray(meta.urls))){
        if(meta.kind==='image') addImage(meta.url,meta.prompt||'',meta.mode,meta.size,i);
        else if(meta.kind==='video') addVideo(meta.url,{mode:meta.mode||'saved',seconds:meta.seconds||'',frames:meta.frames||'',fps:meta.fps||'',width:meta.width||'',height:meta.height||''},i);
        else addAudio(meta,i);
      }else if(meta.status==='failed'){addError('Atlas error: '+String(meta.error||'Generation failed.'));
      }else if(meta.status==='cancelled'){addStoppedSavedMessage(meta, i);
      }else{
        const label=meta.kind==='image'?'Creating image…':meta.kind==='video'?'Creating video…':'Creating audio…';
        const pending=addChatGeneration(meta.kind,meta.job_id||('saved_'+i),label,i);
        if(meta.job_id){jobUi.get(meta.job_id)?.row && addResumeJob({job_id:meta.job_id,status:'running',kind:meta.kind,progress:meta.progress||0,created_at:meta.created_at||0});}
      }
    }else if(meta.kind==='chat_generation' && meta.status==='failed'){
      addSavedAi('Atlas error: '+String(meta.error||'Generation failed.'),i);
    }else if(meta.kind==='chat_generation' && meta.status==='cancelled'){
      addStoppedSavedMessage(meta, i);
    }else if(meta.kind==='chat_generation' && meta.status!=='completed'){
      const pending=addChatGeneration('chat',meta.job_id||('saved_'+i),'Thinking…',i);
      const partial=messageText(m.content)||meta.stream_text||'';
      if(partial) pending.title.textContent=partial;
    }else if(meta.kind==='chat' && meta.status==='cancelled'){
      addStoppedSavedMessage({...meta,text:messageText(m.content)||meta.text||meta.stream_text||''},i);
    }else{
      addSavedAi(messageText(m.content),i,meta.think_mode?String(meta.reasoning_summary||''):'' );
    }
  });
  requestAnimationFrame(()=>{chat.scrollTop=previousScrollTop});
}
function attachmentsFromMeta(meta){const m=parseMeta(meta);return Array.isArray(m.attachments)?m.attachments:[]}
async function openChat(id){
  const r=await fetch('/api/chats/'+encodeURIComponent(id));if(!r.ok)return;
  const d=await r.json();currentChatId=id;currentChatTitle=d.chat.title;
  const rawHistory=(d.chat.messages||[]).map(m=>{
    const meta=parseMeta(m.meta||'');let content=m.content;
    if(m.role==='user'&&Array.isArray(meta.attachments)&&meta.attachments.length){
      const text=messageText(m.content)||m.display||'';
      content=[{type:'text',text:text||'Please look at the attached image or file and tell me what you see.'}];
      for(const a of meta.attachments){
        const kind=String(a.kind||a.type||'').toLowerCase();
        const mime=String(a.mime||'').toLowerCase();
        const url=String(a.url||a.data||'');
        if(kind==='image'||mime.startsWith('image/')){
          content.push({type:'image_url',image_url:{url}});
        }else if(kind==='video'||mime.startsWith('video/')){content.push({type:'video_url',video_url:{url}});
        }else if(kind==='audio'||mime.startsWith('audio/')){content.push({type:'audio_url',audio_url:{url}});
        }else if(kind==='file'||kind==='document'||mime==='application/pdf'||mime.startsWith('text/')||mime.includes('word')||mime.includes('sheet')||mime.includes('presentation')){
          if(a.extracted_text)content.push({type:'text',text:'[Attached file: '+String(a.name||'attachment')+'\n'+String(a.extracted_text).slice(0,120000)});
          else content.push({type:'text',text:'[Attached file: '+String(a.name||'attachment')+'\nNo local text extraction is available for this file type.]'});
        }else if(a.extracted_text){
          content.push({type:'text',text:'[Attached file: '+String(a.name||'attachment')+'\n'+String(a.extracted_text).slice(0,120000)});
        }
      }
    }
    return {id:m.id||makeMessageId(),created_at:Number(meta.created_at||m.created_at||0),role:m.role,content,meta:m.meta||''};
  });
  rawHistory.sort((a,b)=>{const ad=Number(a.created_at)||0,bd=Number(b.created_at)||0;if(ad!==bd)return ad-bd;return (a.role==='user'?0:1)-(b.role==='user'?0:1)});
  history=[];for(const m of rawHistory){
    const prev=history[history.length-1];
    if(prev&&prev.role==='assistant'&&m.role==='assistant'&&messageText(prev.content)===messageText(m.content)&&!isGenerationEntry(m))continue;
    history.push(m);
  }
  // Compatibility: migrate older chats that stored generated media separately.
  const media=Array.isArray(d.chat.media)?d.chat.media:[];
  const unmatchedUsers={image:new Set(),video:new Set(),audio:new Set()};
  history.forEach((m,i)=>{if(m.role==='user'){const k=metaObject(m).kind;if(k==='image'||k==='video'||k==='audio')unmatchedUsers[k].add(i)}});
  for(const item of media){
    const url=String(item?.url||'');if(!url)continue;
    if(history.some(m=>metaObject(m).url===url))continue;
    const kind=item.type==='video'?'video':(item.type==='audio'?'audio':'image');
    let target=-1;
    if(item.prompt)target=[...unmatchedUsers[kind]].find(i=>messageText(history[i].content).trim()===String(item.prompt).trim());
    if(target===undefined||target===null)target=-1;
    if(target<0)target=[...unmatchedUsers[kind]][0]??-1;
    const userTime=target>=0?(Number(history[target].created_at)||Date.now()/1000):0;
    const createdAt=target>=0?userTime+0.0001:(Number(item.created_at||0)||Date.now()/1000);
    const entry={id:'legacy_'+String(item.id||makeMessageId()),created_at:createdAt,role:'assistant',content:'',meta:JSON.stringify({kind,status:'completed',url,prompt:item.prompt||'',seconds:item.seconds||0,created_at:createdAt})};
    if(target>=0){history.splice(target+1,0,entry);unmatchedUsers[kind].delete(target)}
    else history.push(entry);
  }
  history.forEach((m,i)=>{if(!m.created_at){const meta=metaObject(m);m.created_at=Number(meta.created_at||0)||Date.now()/1000}});
  editingIndex=null;clearEditing();renderHistory();await loadChatList();
}
async function saveCurrentChat(){
  if(!currentChatId)return;
  history.forEach(m=>{m.id=m.id||makeMessageId();const meta=metaObject(m);if(!meta.created_at)meta.created_at=Number(m.created_at)||Date.now()/1000;m.created_at=Number(meta.created_at);m.meta=JSON.stringify(meta)});
  const r=await fetch('/api/chats/'+encodeURIComponent(currentChatId),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:currentChatTitle,messages:history.map(m=>({id:m.id,role:m.role,content:messageText(m.content),display:messageText(m.content),meta:m.meta}))})});
  const d=await r.json().catch(()=>({}));
  if(r.ok&&d.chat){currentChatTitle=d.chat.title||currentChatTitle;}
  loadChatList();
}
function messageText(content){if(typeof content==='string')return content;if(Array.isArray(content)){const x=content.find(i=>i&&i.type==='text');return x&&x.text||''}return''}
function clearEditing(){editingIndex=null;editingBanner.classList.remove('show');}
function restoreEdit(index){const entry=history[index];if(!entry)return;editingIndex=index;const meta=parseMeta(entry.meta);textBox.value=messageText(entry.content);const rawImageAttachments=(meta.attachments||[]).filter(a=>{const k=String(a.kind||a.type||'image').toLowerCase();return k==='image'||k==='image-to-video'||k==='video-reference'||k==='reference'});const imageAttachments=rawImageAttachments.map(a=>({...a,data:a.url||a.data,name:a.name||'image',width:a.width||0,height:a.height||0}));selectedImages=meta.kind==='video'?imageAttachments.filter(a=>String(a.kind||'').toLowerCase()==='image-to-video').slice(0,1):imageAttachments.slice(0,1);imageReferenceImages=meta.kind==='video'?[]:imageAttachments.filter(a=>String(a.kind||'').toLowerCase()==='video-reference').slice(0,5);videoReferenceImages=meta.kind==='video'?imageAttachments.filter(a=>String(a.kind||'').toLowerCase()==='video-reference').slice(0,5):[];if(meta.kind==='video'&&!selectedImages.length){selectedImages=imageAttachments.filter(a=>String(a.kind||'').toLowerCase()!=='video-reference').slice(0,1)}if(meta.kind==='image'){imageQuality=Number(meta.quality||1);imageRatio=meta.ratio||'1:1';refreshRatioChoices();setMode('image')}else if(meta.kind==='video'){videoFps=Number(meta.fps||VIDEO_DEFAULT_FPS);videoDuration=Number(meta.seconds||meta.videoDuration||5);videoFrames=Number(meta.frames||framesForDuration(videoDuration));videoQuality=meta.quality||'720P';videoRatio=meta.ratio||'16:9';updateVideoModelControls();syncVideoSliders();refreshRatioChoices();setMode('video')}else if(meta.kind==='audio'){textBox.value=meta.prompt||messageText(entry.content)||'';if($('audioLyricsBox'))$('audioLyricsBox').value=meta.lyrics||'';audioDuration=Math.max(10,Math.min(600,Number(meta.duration||30)));audioSteps=Number(meta.infer_steps||120);audioThinking=meta.thinking!==false;audioInstrumental=!!meta.instrumental;audioQualityLabel={40:'Ultra low',80:'Low',120:'Medium',160:'High',200:'Ultra'}[audioSteps]||'Medium';setMode('audio');syncAudioChoices()}else{mediaMode=null;composer.classList.remove('media-mode');if(selectedImages.length)composer.classList.add('attachment-mode');updatePlaceholder();renderRefs();updateSummary()}renderRefs();resize();editingLabel.textContent=meta.kind==='image'?'Editing image request':meta.kind==='video'?'Editing video request':meta.kind==='audio'?'Editing audio request':'Editing message';editingBanner.classList.add('show');showChat()}
function copyMessageText(text,button){copyText(text).then(ok=>{button.classList.remove('copy-success','copy-fail');void button.offsetWidth;button.classList.add(ok?'copy-success':'copy-fail');setTimeout(()=>button.classList.remove('copy-success','copy-fail'),900)})}
function makeCopyButton(text,label='Copy',ready=true){const b=document.createElement('button');b.type='button';b.className='copy-head-btn';b.innerHTML=iconSvg('copy');b.disabled=!ready;b.setAttribute('aria-disabled',String(!ready));b.title=ready?'Copy':'Copy becomes available when Atlas finishes writing';b.setAttribute('aria-label','Copy');b.onclick=()=>{if(!b.disabled)copyMessageText(String(text||''),b)};return b}
function stripArtifactEnvelope(text){
  let raw=String(text||'').replace(/\r\n?/g,'\n').trim();if(!raw)return '';
  raw=raw.replace(/^(?:sure|of course|absolutely|here(?:\'s| is)|certainly)[,:.!-]?\s*(?:the\s+)?(?:story|answer|draft|text|email|message|caption|script|letter|post|bio|essay)?\s*:?[ \t]*\n{1,2}/i,'');
  raw=raw.replace(/\n{2,}(?:if you (?:need|want|would like)|let me know|i can (?:also|help|write)|hope this helps|tell me if you(?:\'d| would) like)[\s\S]*$/i,'');
  return raw.trim();
}
function copyableMessageText(text){const raw=String(text||'');const m=raw.match(/\[\[COPY_BUTTON\]\]([\s\S]*?)(?:\[\[\/COPY_BUTTON\]\]|$)/i);return stripArtifactEnvelope(m?String(m[1]||''):raw)}
function renderCopyAware(text,container,ready=true){
  const raw=String(text||'');container.innerHTML='';
  const openRe=/\[\[COPY_BUTTON\]\]/i, closeRe=/\[\[\/COPY_BUTTON\]\]/i;const open=openRe.exec(raw);
  if(!open){container.innerHTML=markdown(raw);bindCodeCopy(container);return}
  const before=raw.slice(0,open.index).trim();if(before){const div=document.createElement('div');div.innerHTML=markdown(before);container.appendChild(div)}
  const rest=raw.slice(open.index+open[0].length);const close=closeRe.exec(rest);const payload=copyableMessageText(close?rest.slice(0,close.index):rest);
  const card=document.createElement('div');card.className='copy-request-card';if(!ready||!close)card.classList.add('copy-writing');
  const head=document.createElement('div');head.className='copy-request-head';const label=document.createElement('span');label.className='writing-label';label.textContent=close&&ready?'Writing':'Writing…';head.append(label,makeCopyButton(payload,'Copy',!!ready&&!!close));
  const body=document.createElement('div');body.className='copy-request-text';body.textContent=payload;card.append(head,body);container.appendChild(card);
  if(close){const after=rest.slice(close.index+close[0].length).trim();if(after){const div=document.createElement('div');div.innerHTML=markdown(after);container.appendChild(div)}}bindCodeCopy(container);
}
function shouldShowCopyButton(owner,index,text){const raw=String(text||'').trim();if(!raw)return false;if(/\[\[COPY_BUTTON\]\]/i.test(raw)||/```/.test(raw))return true;if(looksLikeReadyToUseWriting(raw,index))return true;if(owner==='user'){const meta=parseMeta(history[index]?.meta||'');if(meta.kind==='image'||meta.kind==='video')return true}return false}
function renderMessageActions(actions,owner,index,text){const row=document.createElement('div');row.className='message-actions';const copy=document.createElement('button');copy.type='button';copy.className='media-action message-action icon-action';copy.innerHTML=iconSvg('copy');copy.title='Copy message';copy.setAttribute('aria-label','Copy message');copy.onclick=()=>copyMessageText(copyableMessageText(text),copy);row.appendChild(copy);return row}
async function resolveImageData(value){if(!value)return'';if(value.startsWith('data:'))return value;if(value.startsWith('/media/')){const r=await fetch(value);const blob=await r.blob();return await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(blob)})}return value}
let userWantsFollow=true;
function showChat(){if(welcome)welcome.style.display='none'}
function isChatNearBottom(){return chat.scrollHeight-chat.scrollTop-chat.clientHeight<120}
chat.addEventListener('scroll',()=>{userWantsFollow=isChatNearBottom()},{passive:true});
function scroll(force=false){if(force){chat.scrollTop=chat.scrollHeight;return}}
function keepChatViewport(){return chat.scrollTop}
function closeMenus(){modeMenu.classList.remove('show');composer.classList.remove('plus-open')}
async function handleModeClose(){const preserve=textBox.value;clearEditing();closeMode(true);textBox.value=preserve;resize()}
function applyResearchGlow(){deepSearchMode=false;composer.classList.toggle('research-think',!!thinkMode);composer.classList.remove('research-deep','research-both');}
function toggleResearchMode(){deepSearchMode=false;thinkMode=false;applyResearchGlow();closeMenus()}
function setMode(mode){closeMenus();deepSearchMode=false;thinkMode=false;applyResearchGlow();mediaMode=mode;composer.classList.add('media-mode');composer.classList.toggle('audio-mode',mode==='audio');composer.classList.remove('attachment-mode');selectedImages=[];selectedFiles=[];selectedVideos=[];selectedAudios=[];imageReferenceImages=[];videoReferenceImages=[];modeLabel.textContent=mode==='image'?'Image':mode==='video'?'Video':'Audio';modeNote.textContent=mode==='image'?'Image generation and editing':mode==='video'?'Video generation':'Atlas 1.0 • Text to Song';$('audioPanelSection')?.classList.toggle('show',mode==='audio');$('imageModelSection')?.classList.toggle('hidden',mode!=='image');$('imageStepsSection').classList.toggle('hidden',mode!=='image'||currentRole!=='developer');$('qualitySection').classList.toggle('hidden',mode!=='image');$('imageRatioSection').classList.toggle('hidden',mode!=='image');$('imageReferenceSection')?.classList.toggle('hidden',mode!=='image');$('audioPanelSection')?.style.setProperty('display',mode==='audio'?'grid':'none');$('videoDurationSection').classList.toggle('hidden',mode!=='video'||currentRole==='developer');$('videoModelSection').classList.toggle('hidden',mode!=='video');$('videoFrameSection').classList.toggle('hidden',mode!=='video'||currentRole!=='developer');$('videoFpsSection').classList.toggle('hidden',mode!=='video'||currentRole!=='developer');$('videoStepsSection').classList.toggle('hidden',mode!=='video'||currentRole!=='developer');$('videoQualitySection').classList.toggle('hidden',mode!=='video');$('videoRatioSection').classList.toggle('hidden',mode!=='video');if(mode==='audio'){syncAudioChoices();try{document.activeElement?.blur?.()}catch{}}if(mode==='video')updateVideoModelControls();syncProviderMenu();updatePlaceholder();renderRefs();updateSummary();resize()}
function closeMode(preserveText=false){mediaMode=null;composer.classList.remove('media-mode','audio-mode','attachment-mode');mediaPanel.classList.remove('collapsed');$('audioPanelSection')?.style.setProperty('display','none');const c=$('collapseModeBtn');if(c)c.textContent='⌄';closeMenus();textBox.placeholder='Describe...';if(!preserveText)textBox.value='';selectedImages=[];imageReferenceImages=[];videoReferenceImages=[];selectedFiles=[];selectedVideos=[];selectedAudios=[];renderRefs();resize();updateSummary();syncProviderMenu()}
function closeGenerationSettings(){const savedText=textBox.value;mediaMode=null;composer.classList.remove('media-mode','audio-mode','attachment-mode');mediaPanel.classList.remove('collapsed');$('audioPanelSection')?.style.setProperty('display','none');const c=$('collapseModeBtn');if(c)c.textContent='⌄';closeMenus();textBox.placeholder='Describe...';textBox.value=savedText;renderRefs();resize();updateSummary();syncProviderMenu()}
function toggleCreationMenu(e){e?.stopPropagation();const opening=!modeMenu.classList.contains('show');modeMenu.classList.toggle('show',opening);composer.classList.toggle('plus-open',opening);if(mediaMode)mediaPanel.classList.toggle('collapsed',opening)} topNewChatBtn.onclick=()=>newChat(); plusBtn.onclick=toggleCreationMenu; closeModeBtn.onclick=e=>{e?.preventDefault();e?.stopPropagation();handleModeClose()}; ['touchstart','touchmove','touchend','pointerdown','pointermove','pointerup'].forEach(ev=>mediaPanel.addEventListener(ev,e=>e.stopPropagation(),{passive:true})); document.addEventListener('click',e=>{if(!composer.contains(e.target)&&e.target!==topNewChatBtn){closeMenus();if(mediaMode)mediaPanel.classList.remove('collapsed')}if(sidebar.classList.contains('open')&&!sidebar.contains(e.target)&&e.target!==sideToggle)setSidebar(false)});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenus();setSidebar(false);closeStudio()}});sideToggle.onclick=e=>{e.stopPropagation();setSidebar(!sidebar.classList.contains('open'))};sidebarOverlay.onclick=()=>setSidebar(false);
let touchStartX=0,touchStartY=0,touchCurrentX=0,touchTracking=false;document.addEventListener('touchstart',e=>{const t=e.touches[0];if(!t)return;touchStartX=t.clientX;touchStartY=t.clientY;touchCurrentX=t.clientX;touchTracking=true},{passive:true});document.addEventListener('touchmove',e=>{if(!touchTracking)return;const t=e.touches[0];if(!t)return;touchCurrentX=t.clientX;const dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.15){if(!sidebar.classList.contains('open')&&dx>12){sidebar.style.transition='none';sidebar.style.transform=`translateX(${Math.min(0,-300+dx)}px)`}else if(sidebar.classList.contains('open')&&dx<0){sidebar.style.transition='none';sidebar.style.transform=`translateX(${Math.max(-300,dx)}px)`}}},{passive:true});document.addEventListener('touchend',e=>{if(!touchTracking)return;touchTracking=false;const t=e.changedTouches[0],dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;sidebar.style.transition='';sidebar.style.transform='';if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.2)return;if(sidebar.classList.contains('open')){if(dx<0)setSidebar(false)}else if(dx>60){setSidebar(true)}},{passive:true});
$('imageReferenceBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(mediaMode!=='image')return;closeMenus();$('imageReferenceInput')?.click()});
$('imageReferenceInput')?.addEventListener('change',e=>{const input=e.target;addImageReferenceFiles(input?.files||[]);if(input)input.value=''}) ;
$('menuUploadBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(mediaMode==='audio'){status.textContent='Image uploads are disabled during audio generation.';return}if(mediaMode&&selectedImages.length>=1){status.textContent='Only 1 image is available during generation.';return}closeMenus();openImagePicker($('uploadInput'))});
$('menuCameraBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(mediaMode==='audio'){status.textContent='Camera uploads are disabled during audio generation.';return}if(mediaMode&&selectedImages.length>=1){status.textContent='Only 1 image is available during generation.';return}closeMenus();openImagePicker($('cameraInput'))});
$('menuFileBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(mediaMode){status.textContent='File attachments are disabled during generation.';return}closeMenus();openDirectFilePicker()});
$('uploadInput')?.addEventListener('change',e=>{const input=e.target;addFiles(input?.files||[]);if(input)input.value=''});
$('cameraInput')?.addEventListener('change',e=>{const input=e.target;addFiles(input?.files||[]);if(input)input.value=''});
$('fileInput')?.addEventListener('change',e=>{const input=e.target;addFiles(input?.files||[]);if(input)input.value=''});
$('createImageBtn').onclick=e=>{e.preventDefault();e.stopPropagation();setMode('image')};$('createVideoBtn').onclick=e=>{e.preventDefault();e.stopPropagation();setMode('video')};$('createAudioBtn').onclick=e=>{e.preventDefault();e.stopPropagation();setMode('audio');};$('imageEnhanceBtn')?.addEventListener('click',()=>toggleEnhance('image'));$('videoEnhanceBtn')?.addEventListener('click',()=>toggleEnhance('video'));syncEnhanceSwitch('image',imageEnhanceEnabled);syncEnhanceSwitch('video',videoEnhanceEnabled,true);const collapseModeBtn=$('collapseModeBtn');collapseModeBtn.onclick=e=>{e.stopPropagation();mediaPanel.classList.toggle('collapsed');collapseModeBtn.textContent=mediaPanel.classList.contains('collapsed')?'⌃':'⌄';collapseModeBtn.setAttribute('aria-label',mediaPanel.classList.contains('collapsed')?'Expand settings':'Collapse settings')};document.getElementById('togglePassword')?.addEventListener('click',()=>{const p=document.getElementById('authPass');const b=document.getElementById('togglePassword');if(!p||!b)return;const show=p.type==='password';p.type=show?'text':'password';b.textContent=show?'Hide':'Show';b.setAttribute('aria-label',show?'Hide password':'Show password')});
function buildChoices(container,values,getLabel,onSelect,activeValue){
  container.innerHTML='';
  values.forEach(v=>{
    const b=document.createElement('button');
    b.type='button';b.className='option-button'+(String(v)===String(activeValue)?' active':'');
    b.textContent=getLabel(v);
    b.setAttribute('aria-pressed',String(String(v)===String(activeValue)));
    b.onclick=()=>{
      container.querySelectorAll('.option-button').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});
      b.classList.add('active');b.setAttribute('aria-pressed','true');onSelect(v);updateSummary();
    };
    container.appendChild(b);
  });
}
function ratioLabel(v){return v==='original'?'Original':v}
function refreshRatioChoices(){
  const imageRatios=['1:1','3:4','4:3','16:9','9:16','2:3','3:2','21:9'];
  const videoRatios=['1:1','4:3','3:4','16:9','9:16'];
  if(selectedImages[0]?.width&&selectedImages[0]?.height){imageRatios.push('original');videoRatios.push('original')}
  buildChoices($('imageRatioChoices'),imageRatios,ratioLabel,v=>{imageRatio=v},imageRatio);
  buildChoices($('videoRatioChoices'),videoRatios,ratioLabel,v=>{videoRatio=v},videoRatio);
}
buildChoices($('qualityChoices'),[1,2,3,4],v=>v+'K',v=>{imageQuality=v},imageQuality);
function updateImageModelControls(){buildChoices($('imageModelChoices'),['atlas-image-1.0-pro','agnes-image-2.1-flash','agnes-image-2.5-flash'],v=>v==='agnes-image-2.1-flash'?'Atlas 2.0':v==='agnes-image-2.5-flash'?'Atlas 2.5 Flash':'Atlas 1.0 Pro',v=>{activeModels.image=v;updateSummary();syncProviderMenu()},activeModels.image)}
updateImageModelControls();
refreshRatioChoices();
const vf=$('videoFramesSlider'),vp=$('videoFpsSlider'),is=$('imageStepsSlider');
function updateVideoModelControls(){
  const dev=currentRole==='developer';
  const model=activeModels?.video||'agnes-video-v2.0';
  const is25=model==='agnes-video-2.5-flash';
  $('videoDurationSection')?.classList.toggle('hidden',dev||mediaMode!=='video');
  $('imageEnhanceSection')?.classList.toggle('hidden',mediaMode!=='image');
  $('videoEnhanceSection')?.classList.toggle('hidden',mediaMode!=='video');
  $('videoModelSection')?.classList.toggle('hidden',mediaMode!=='video');
  $('videoFrameSection')?.classList.toggle('hidden',!dev||mediaMode!=='video'||is25);
  $('videoFpsSection')?.classList.toggle('hidden',!dev||mediaMode!=='video'||is25);
  $('videoStepsSection')?.classList.toggle('hidden',!dev||mediaMode!=='video'||is25);
  const durations=is25?[4,5,6,7,8,9,10,11,12]:[5,6,7,8,9,10,11,12,13,14,15];
  const durationNote=$('videoDurationNote');if(durationNote)durationNote.textContent=is25?'Atlas 2.5 Pro • 4–12 seconds':'Atlas 2.0 • 5–15 seconds';
  const qualityNote=document.querySelector('#videoQualitySection .subtle');if(qualityNote)qualityNote.textContent=is25?'Atlas 2.5 Pro: 720P.':'Supported Atlas Video V2.0 tiers: 480P, 720P and 1080P.';
  if(!durations.includes(Number(videoDuration)))videoDuration=durations[0];
  if(!dev)buildChoices($('videoDurationChoices'),durations,v=>v+' seconds',v=>{videoDuration=Number(v);videoFps=30;videoFrames=VIDEO_NORMAL_USER_FRAMES[Number(v)]||framesForDuration(videoDuration,videoFps);videoSteps=100;syncVideoSliders()},videoDuration);
  else if($('videoDurationChoices'))$('videoDurationChoices').innerHTML='';
  buildChoices($('videoModelChoices'),['agnes-video-v2.0','agnes-video-2.5-flash'],v=>v==='agnes-video-v2.0'?'Atlas 2.0':'Atlas 2.5 Pro',v=>{activeModels.video=v;if(v==='agnes-video-2.5-flash'){videoQuality='720P';videoSteps=100;videoFps=30;videoDuration=5;videoFrames=VIDEO_NORMAL_USER_FRAMES[5]||153;}else{videoQuality='480P';videoSteps=100;videoFps=30;videoDuration=5;videoFrames=VIDEO_NORMAL_USER_FRAMES[5]||153;}updateVideoModelControls()},activeModels.video);
  const qualityOptions=is25?['720P']:['480P','720P','1080P'];
  if(!qualityOptions.includes(videoQuality))videoQuality=qualityOptions[qualityOptions.length-1];
  buildChoices($('videoQualityChoices'),qualityOptions,v=>v,v=>{videoQuality=v},videoQuality);
  const vbtn=$('videoEnhanceBtn');
  if(vbtn){vbtn.style.display='flex';vbtn.classList.remove('forced');vbtn.disabled=false;const copy=vbtn.querySelector('.enhance-switch-copy');if(copy)copy.style.display=is25?'grid':'none';const sub=$('videoEnhanceSubtext');if(sub)sub.textContent=is25?'Enhance before video generation':'';syncEnhanceSwitch('video',videoEnhanceEnabled,false);vbtn.title=is25?'Toggle prompt enhancement':'Prompt enhancement'}
  refreshRatioChoices();
  updateSummary();
}

function framesForDuration(seconds,fps=VIDEO_DEFAULT_FPS){
  const target=Math.max(1,Math.round(Number(seconds)*Number(fps||VIDEO_DEFAULT_FPS)))+1;
  const lower=Math.floor((target-1)/8)*8+1;const upper=lower+8;
  const candidates=[lower,upper].filter(f=>f>=VIDEO_FRAMES_MIN&&f<=VIDEO_FRAMES_MAX);
  return candidates.reduce((best,f)=>Math.abs(f-target)<Math.abs(best-target)?f:best,candidates[0]||VIDEO_FRAMES_MIN);
}
function syncVideoSliders(){
  if(!vf||!vp)return;
  const dev=currentRole==='developer';
  const providerManaged=activeModels.video==='agnes-video-2.5-flash';
  const stepsSection=$('videoStepsSection');if(stepsSection)stepsSection.classList.toggle('hidden',!dev||providerManaged);
  if(dev){
    videoFrames=Math.max(VIDEO_FRAMES_MIN,Math.min(VIDEO_FRAMES_MAX,Number(vf.value)||videoFrames));
    videoFps=Math.max(VIDEO_FPS_MIN,Math.min(VIDEO_FPS_MAX,Number(vp.value)||videoFps));
    vf.value=String(videoFrames);vp.value=String(videoFps);
    $('videoFramesValue').textContent=videoFrames+' frames';$('videoFpsValue').textContent=videoFps+' FPS';
  }else{
    videoFps=VIDEO_NORMAL_USER_FPS[Number(videoDuration)]||VIDEO_DEFAULT_FPS;videoFrames=VIDEO_NORMAL_USER_FRAMES[Number(videoDuration)]||framesForDuration(videoDuration,videoFps);vf.value=String(videoFrames);vp.value=String(videoFps);
    $('videoFramesValue').textContent=videoFrames+' frames';$('videoFpsValue').textContent=videoFps+' FPS (fixed)';
  }
  updateSummary()
}

updateVideoModelControls();syncVideoSliders();
function syncImageSteps(){if(!is)return;imageSteps=Math.max(2,Math.min(100,Number(is.value)||imageSteps));is.value=String(imageSteps);$('imageStepsValue').textContent=imageSteps+' steps';updateSummary()}
if(is)is.oninput=syncImageSteps;
if(vf)vf.oninput=syncVideoSliders;if(vp)vp.oninput=syncVideoSliders;
function formatAudioDuration(seconds){
  const total=Math.max(10,Math.min(600,Math.round(Number(seconds)||10)));
  if(total<60)return total+'s';
  const m=Math.floor(total/60),s=total%60;
  return m+':'+String(s).padStart(2,'0');
}
function buildAudioChoices(){
  const slider=$('audioDurationSlider'),value=$('audioDurationValue'),quality=$('audioQualityChoices');
  if(slider){slider.value=String(Math.max(10,Math.min(600,Math.round(Number(audioDuration)||30))));if(value)value.textContent=formatAudioDuration(slider.value);slider.oninput=()=>{audioDuration=Math.max(10,Math.min(600,Number(slider.value)||30));if(value)value.textContent=formatAudioDuration(audioDuration);updateSummary()};}
  if(quality){quality.innerHTML='';const items=[['Ultra low',40],['Low',80],['Medium',120],['High',160],['Ultra',200]];items.forEach(([label,steps])=>{const b=document.createElement('button');b.type='button';b.className='audio-quality-button'+(Number(audioSteps)===steps?' active':'');b.textContent=label;b.setAttribute('aria-pressed',String(Number(audioSteps)===steps));b.onclick=()=>{audioSteps=steps;audioQualityLabel=label;quality.querySelectorAll('button').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});b.classList.add('active');b.setAttribute('aria-pressed','true');updateSummary()};quality.appendChild(b)});}
  const pb=$('audioPlanningBtn');if(pb){pb.classList.toggle('active',audioThinking);pb.setAttribute('aria-pressed',String(audioThinking));}
  const ib=$('audioInstrumentalBtn');if(ib){ib.classList.toggle('active',audioInstrumental);ib.setAttribute('aria-pressed',String(audioInstrumental));}
}
function syncAudioChoices(){buildAudioChoices()}
$('audioPlanningBtn')?.addEventListener('click',()=>{const lyrics=String($('audioLyricsBox')?.value||'').trim();if(!audioThinking&&lyrics){showTopError('Cannot enable Planning pass while there is text inside the lyrics box. Clear the lyrics first.',3200);return;}audioThinking=!audioThinking;const b=$('audioPlanningBtn');b.classList.toggle('active',audioThinking);b.setAttribute('aria-pressed',String(audioThinking));if(audioThinking&&$('audioLyricsBox'))$('audioLyricsBox').value='';updateSummary()});
$('audioInstrumentalBtn')?.addEventListener('click',()=>{audioInstrumental=!audioInstrumental;const b=$('audioInstrumentalBtn');b.classList.toggle('active',audioInstrumental);b.setAttribute('aria-pressed',String(audioInstrumental));updateSummary()});

function fileToDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function blobToDataURL(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=rej;r.readAsDataURL(blob)})}
function fileTypeLabel(mime,name){const m=String(mime||'').toLowerCase();const n=String(name||'');if(m.startsWith('image/'))return m.split('/')[1].toUpperCase();if(m.startsWith('video/'))return 'VIDEO';if(m.startsWith('audio/'))return 'AUDIO';const ext=n.includes('.')?n.split('.').pop().toUpperCase():'';return ext||'FILE'}
function fileTypeIcon(mime,name){const m=String(mime||'').toLowerCase();const n=String(name||'').toLowerCase();if(m.includes('pdf')||n.endsWith('.pdf'))return 'PDF';if(m.includes('word')||/\.(doc|docx)$/.test(n))return 'DOC';if(m.includes('sheet')||m.includes('excel')||/\.(xls|xlsx|csv)$/.test(n))return 'XLS';if(m.includes('presentation')||/\.(ppt|pptx)$/.test(n))return 'PPT';if(m.startsWith('image/'))return 'IMG';if(m.startsWith('video/'))return 'VID';if(m.startsWith('audio/'))return 'AUD';return 'FILE'}
async function persistAttachments(items){
  const list=Array.isArray(items)?items.slice(0,5):[];
  if(!list.length)return [];
  if(!currentChatId)throw new Error('Open a chat before uploading images.');
  const payload={images:await Promise.all(list.map(async it=>({data:String(it?.data||it?.url||''),name:String(it?.name||'image'),width:Number(it?.width||0),height:Number(it?.height||0)})))};
  const r=await fetch('/api/chats/'+encodeURIComponent(currentChatId)+'/attachments',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Could not save image attachments.');
  return Array.isArray(d.attachments)?d.attachments:[];
}
function localAutomationTimezone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return'UTC'}}
function renderRefs(){
  const strip=$('referenceStrip');
  if(!strip)return;
  strip.innerHTML='';
  const addChip=(item,index,collection,label)=>{
    const d=document.createElement('div');d.className='ref-chip';
    const img=document.createElement('img');img.src=String(item?.data||item?.url||'');img.alt=String(item?.name||label||'Image reference');
    img.loading='lazy';img.onclick=()=>openMediaViewer(img.src,'image');d.appendChild(img);
    const b=document.createElement('button');b.type='button';b.textContent='×';b.title='Remove '+label;b.setAttribute('aria-label','Remove '+label);b.onclick=e=>{e.stopPropagation();collection.splice(index,1);renderRefs();updateSummary();resize()};d.appendChild(b);strip.appendChild(d);
  };
  selectedImages.slice(0,2).forEach((it,i)=>addChip(it,i,selectedImages,'image'));
  imageReferenceImages.slice(0,5).forEach((it,i)=>addChip(it,i,imageReferenceImages,'reference'));videoReferenceImages.slice(0,5).forEach((it,i)=>addChip(it,i,videoReferenceImages,'reference'));
  const addFileChip=(item,index,collection,label)=>{
    const d=document.createElement('div');d.className='ref-chip ref-file-chip';
    const name=document.createElement('span');name.className='ref-file-name';name.textContent=String(item?.name||label||'attachment');name.title=String(item?.name||label||'attachment');
    d.appendChild(name);
    const expand=document.createElement('button');expand.type='button';expand.className='ref-file-expand';expand.innerHTML=iconSvg('expand');expand.title='Expand '+label;expand.setAttribute('aria-label','Expand '+label);
    expand.onclick=e=>{e.stopPropagation();const kind=String(item?.kind||item?.type||'file').toLowerCase();if(kind==='video')openMediaViewer(item?.url||item?.data||'', 'video');else if(kind==='audio')openMediaViewer(item?.url||item?.data||'', 'audio');else openFileViewer(item)};
    d.appendChild(expand);
    const remove=document.createElement('button');remove.type='button';remove.className='ref-file-remove';remove.textContent='×';remove.title='Remove '+label;remove.setAttribute('aria-label','Remove '+label);
    remove.onclick=e=>{e.stopPropagation();collection.splice(index,1);renderRefs();updateSummary();resize()};d.appendChild(remove);
    strip.appendChild(d);
  };
  selectedFiles.slice(0,3).forEach((it,i)=>addFileChip(it,i,selectedFiles,'file'));
  selectedVideos.slice(0,1).forEach((it,i)=>addFileChip(it,i,selectedVideos,'video'));
  selectedAudios.slice(0,1).forEach((it,i)=>addFileChip(it,i,selectedAudios,'audio'));
  const count=$('imageReferenceCount');if(count)count.textContent=Math.min(imageReferenceImages.length,5)+'/5';
  const imageRefStatus=$('imageReferenceStatus');if(imageRefStatus)imageRefStatus.textContent=imageReferenceImages.length?'Reference images ready • '+imageReferenceImages.length+'/5':'Add reference images only with this button.';
  const videoRefCount=$('videoReferenceCount');if(videoRefCount)videoRefCount.textContent=Math.min(videoReferenceImages.length,5)+'/5';
  const videoRefStatus=$('videoReferenceStatus');if(videoRefStatus)videoRefStatus.textContent=videoReferenceImages.length?'Atlas 2.5 Pro reference images ready • '+videoReferenceImages.length+'/5':'These are visual references, not image-to-video input.';
  const has=selectedImages.length||imageReferenceImages.length||videoReferenceImages.length||selectedFiles.length||selectedVideos.length||selectedAudios.length;
  strip.style.display=has?'flex':'none';
}
function getImageDimensions(data){return new Promise(res=>{const img=new Image();img.onload=()=>res({width:img.naturalWidth,height:img.naturalHeight});img.onerror=()=>res({width:0,height:0});img.src=data})}
async function addVideoReferenceFiles(files){
  const list=Array.from(files||[]).filter(Boolean);if(!list.length)return;
  try{
    const images=list.filter(f=>String(f.type||'').startsWith('image/'));
    if(images.length!==list.length)throw new Error('Video references must be images.');
    if(videoReferenceImages.length+images.length>5)throw new Error('Reference images support up to 5 images.');
    for(const f of images){const data=await fileToDataURL(f);const dims=await getImageDimensions(data);if(!dims.width||!dims.height)throw new Error('One of the reference images could not be read.');videoReferenceImages.push({data,name:f.name||'reference',file:f,width:dims.width,height:dims.height});}
    renderRefs();updateSummary();resize();
  }catch(e){status.textContent=e.message||'Could not add reference images.';setTimeout(()=>{if(status.textContent===e.message)status.textContent=''},2200)}
}
async function addFiles(files){
  const list=Array.from(files||[]).filter(Boolean);if(!list.length)return;
  try{
    const images=list.filter(f=>String(f.type||'').startsWith('image/'));
    const videos=list.filter(f=>String(f.type||'').startsWith('video/'));
    const audios=list.filter(f=>String(f.type||'').startsWith('audio/'));
    const others=list.filter(f=>!String(f.type||'').startsWith('image/')&&!String(f.type||'').startsWith('video/')&&!String(f.type||'').startsWith('audio/'));
    const kinds=[images.length?'image':null,videos.length?'video':null,audios.length?'audio':null,others.length?'file':null].filter(Boolean);
    if(kinds.length!==1)throw new Error('Choose only one attachment type per message.');
    const kind=kinds[0];
    if(kind==='image'){
      if(mediaMode==='audio')throw new Error('Image uploads are disabled during audio generation.');
      const maxImages=mediaMode?1:2;
      if(selectedImages.length+images.length>maxImages)throw new Error(maxImages===1?'Only 1 image is available during generation.':'Normal chat supports up to 2 images.');
      if(selectedVideos.length||selectedAudios.length)throw new Error('Images cannot be combined with video or audio attachments.');
      for(const f of images){const data=await fileToDataURL(f);const dims=await getImageDimensions(data);if(!dims.width||!dims.height)throw new Error('One of the selected images could not be read.');selectedImages.push({data,name:f.name||'image',file:f,width:dims.width,height:dims.height});}
      if(mediaMode==='image'){imageRatio='original';draft.imageRatio='original';}
      if(mediaMode==='video'){videoRatio='16:9';draft.videoRatio='16:9';}
      refreshRatioChoices()
    }
    else if(kind==='video'){if(videos.length!==1||selectedImages.length||selectedFiles.length||selectedAudios.length||selectedVideos.length)throw new Error('Only one video may be attached, with no other attachments.');const f=videos[0];if(f.size>25*1024*1024)throw new Error('Video uploads must be 25 MB or smaller.');const saved=await uploadChatMedia(f);selectedVideos=[{kind:'video',url:saved.url,name:saved.name,mime:saved.mime,id:saved.id||''}]}
    else if(kind==='audio'){if(audios.length!==1||selectedImages.length||selectedFiles.length||selectedVideos.length||selectedAudios.length)throw new Error('Only one audio file may be attached, with no other attachments.');const f=audios[0];if(f.size>25*1024*1024)throw new Error('Audio uploads must be 25 MB or smaller.');const saved=await uploadChatMedia(f);selectedAudios=[{kind:'audio',url:saved.url,name:saved.name,mime:saved.mime,id:saved.id||''}]}
    else{
      if(mediaMode==='audio')throw new Error('File attachments are disabled during audio generation.');
      if(mediaMode)throw new Error('File attachments are disabled during image or video generation.');
      if(selectedFiles.length+others.length>2)throw new Error('Normal chat supports up to 2 files.');
      if(selectedVideos.length||selectedAudios.length)throw new Error('Files cannot be combined with video or audio attachments.');
      for(const f of others)selectedFiles.push({...await uploadChatMedia(f),kind:'file'});
    }
    if(kind!=='video'&&kind!=='audio'&&mediaMode==null)composer.classList.add('attachment-mode');
    renderRefs();updateSummary();syncProviderMenu();status.textContent=list.length===1?'Attachment added.':list.length+' attachments added.';setTimeout(()=>status.textContent='',1600);
  }catch(e){showTopError('Upload error: '+(e.message||'Could not load attachment.'),3000);}
}

function openImagePicker(input){closeMenus();if(input)input.value='';setTimeout(()=>input?.click(),0)}
function addImageReferenceFiles(files){
  const list=Array.from(files||[]).filter(Boolean);
  if(!list.length)return;
  (async()=>{
    try{
      const images=list.filter(f=>String(f.type||'').startsWith('image/'));
      if(images.length!==list.length)throw new Error('Reference uploads must be images.');
      if(imageReferenceImages.length+images.length>5)throw new Error('You can add up to 5 reference images.');
      for(const f of images){
        const data=await fileToDataURL(f);
        const dims=await getImageDimensions(data);
        if(!dims.width||!dims.height)throw new Error('One of the reference images could not be read.');
        imageReferenceImages.push({data,name:f.name||'reference image',file:f,width:dims.width,height:dims.height});
      }
      renderRefs();updateSummary();resize();
      status.textContent=images.length===1?'Reference image added.':images.length+' reference images added.';
      setTimeout(()=>{if(status.textContent.includes('reference image'))status.textContent=''},1600);
    }catch(e){addError('Reference upload error: '+(e.message||'Could not load reference image.'));}
  })();
}
async function openDirectFilePicker(){closeMenus();try{if(window.showOpenFilePicker){const handles=await window.showOpenFilePicker({multiple:true,excludeAcceptAllOption:false});await addFiles(await Promise.all(handles.map(h=>h.getFile())));return}}catch(e){if(e?.name==='AbortError')return}openImagePicker($('fileInput'))}
async function uploadChatMedia(file){if(!(await ensureCurrentChat()))throw new Error('Could not start a new chat.');const data=await fileToDataURL(file);const r=await fetch('/api/chats/'+encodeURIComponent(currentChatId)+'/file-attachment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,name:file.name||'attachment'})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Could not save attachment.');return {url:d.url,name:d.name||file.name||'attachment',mime:d.mime||file.type||'application/octet-stream',id:d.id||'',extracted_text:String(d.extracted_text||'')};}
function updatePlaceholder(){if(!mediaMode){textBox.placeholder='Describe...';return}if(mediaMode==='image'){textBox.placeholder=selectedImages.length?'Describe how to edit this image…':'Just Imagine…';return}if(mediaMode==='audio'){textBox.placeholder='Describe...';return}textBox.placeholder=selectedImages.length?'Describe how the image should move…':'Just Imagine…'}
function updateSummary(){const el=$('mediaSummary');if(!mediaMode){el.textContent=(selectedImages.length||selectedFiles.length)?'Attachments ready • images and videos can be opened by Atlas • files are indexed for Atlas':'';return}if(mediaMode==='image'){const totalImageRefs=selectedImages.length+imageReferenceImages.length;el.innerHTML='<b>'+modelLabel(activeModels.image)+'</b> • '+imageQuality+'K • '+(imageRatio==='original'?'Current image':imageRatio)+(totalImageRefs?' • '+totalImageRefs+' reference'+(totalImageRefs===1?'':'s'):' • text-to-image')+(currentRole==='developer'?' • '+imageSteps+' steps':'');return}if(mediaMode==='audio'){el.innerHTML='<b>Atlas 1.0</b> • '+formatAudioDuration(audioDuration)+' • '+audioQualityLabel+' • '+(audioThinking?'Planning pass':'Direct pass')+(audioInstrumental?' • Instrumental':'');return}const vm=activeModels?.video||'agnes-video-v2.0';const label=vm==='agnes-video-2.5-flash'?'Atlas 2.5 Pro':'Atlas 2.0';el.innerHTML='<b>'+label+'</b> • '+(currentRole==='developer'&&vm!=='agnes-video-2.5-flash'?(videoFrames+' frames • '+videoFps+' FPS • '+videoSteps+' steps'):((videoDuration||5)+'s'))+' • '+videoQuality+' • '+videoRatio+(selectedImages.length?' • image-to-video':' • text-to-video')}
function resize(){textBox.style.height='auto';const cs=getComputedStyle(textBox);const lineHeight=parseFloat(cs.lineHeight)||22;const maxH=lineHeight*10+20;const needsScroll=textBox.scrollHeight>maxH+1;textBox.style.height=Math.min(textBox.scrollHeight,maxH)+'px';textBox.classList.toggle('line-limited',needsScroll)}textBox.oninput=resize;
textBox.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&window.matchMedia('(min-width:768px)').matches){e.preventDefault();sendMessage()}});textBox.onkeydown=null;textBox.addEventListener('wheel',e=>{if(!textBox.classList.contains('line-limited'))return;const atTop=textBox.scrollTop<=0,atBottom=textBox.scrollTop+textBox.clientHeight>=textBox.scrollHeight-1;if((e.deltaY<0&&atTop)||(e.deltaY>0&&atBottom))return;e.stopPropagation()},{passive:true});
function busy(on){generationBusy=!!on;sendBtn.classList.toggle('stop',!!on);sendBtn.textContent=on?'■':'➤';sendBtn.style.visibility='visible';sendBtn.style.opacity='1';sendBtn.disabled=false;sendBtn.setAttribute('aria-label',on?'Stop':'Send');sendBtn.title=on?'Stop generation':'Send'}
async function cancelCurrentJob(){
  const jobId=currentJobId;
  if(jobId){
    try{
      const r=await fetch('/api/jobs/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_id:jobId})});
      const d=await r.json().catch(()=>({}));
      const partial=String(d.stream_text||history.find(x=>String(metaObject(x).job_id||'')===String(jobId))?.content||'');
      showStoppedForJob(jobId,partial);
    }catch{
      const idx=findHistoryByJob(jobId);if(idx>=0){const m=history[idx],meta=metaObject(m);meta.status='cancelled';meta.stream_text=String(m.content||meta.stream_text||'');m.meta=JSON.stringify(meta);showStoppedForJob(jobId,String(meta.stream_text||''));}
    }
  }
  try{currentController?.abort()}catch{}
  activeJobIds.clear();jobPollers.forEach(t=>clearTimeout(t));jobPollers.clear();currentJobId=null;generationBusy=false;busy(false);status.textContent='';
}
sendBtn.onclick=()=>{if(generationBusy){cancelCurrentJob();return}sendMessage()};
function showProgress(label='Generating…',pct=null){let el=document.getElementById('globalProgress');if(!el){el=document.createElement('div');el.id='globalProgress';el.className='progress';el.innerHTML='<div class="progress-top"><span class="progress-label"></span><span class="progress-percent"></span></div><div class="progress-line"><div class="progress-fill"></div></div>';document.querySelector('.composer-wrap')?.insertBefore(el,document.querySelector('.composer'));}el.classList.add('show');el.querySelector('.progress-label').textContent=label;const fill=el.querySelector('.progress-fill'),percent=el.querySelector('.progress-percent');if(pct==null){el.classList.add('indeterminate');percent.textContent='';fill.style.width='38%'}else{el.classList.remove('indeterminate');const p=Math.max(0,Math.min(100,Number(pct)||0));fill.style.width=p+'%';percent.textContent=p+'%'}}
function hideProgress(){const el=document.getElementById('globalProgress');if(el)el.classList.remove('show','indeterminate')}
function updateUserMessageScroll(el){if(!el)return;const over=el.scrollHeight>el.clientHeight+1;el.classList.toggle('has-overflow',over);if(!over){el.classList.remove('can-scroll-top','can-scroll-bottom');return}el.classList.toggle('can-scroll-top',el.scrollTop>1);el.classList.toggle('can-scroll-bottom',el.scrollTop+el.clientHeight<el.scrollHeight-1)}
function addUser(text,meta='',images=[],index=-1){showChat();const row=document.createElement('div');row.className='message-row user';const wrap=document.createElement('div');wrap.className='bubble user';const mm=parseMeta(meta);const attachments=Array.isArray(mm.attachments)?mm.attachments:[];if(mm.kind==='image'||mm.kind==='video'){const m=document.createElement('div');m.textContent=mm.kind==='image'?'IMAGE GENERATION':'VIDEO GENERATION';m.style.cssText='font-size:10px;opacity:.65;margin-bottom:7px';wrap.appendChild(m)}if(attachments.length){const strip=document.createElement('div');strip.className='reference-strip user-attachment-strip';attachments.forEach(it=>{const kind=String(it.kind||it.type||'image').toLowerCase();const d=document.createElement('div');d.className='ref-chip user-ref-chip';if(kind==='image'){const img=document.createElement('img');img.src=it.url||it.data||'';img.alt=it.name||'Attached image';img.onclick=()=>openMediaViewer(img.src,'image');d.append(img)}else if(kind==='video'){d.className+=' upload-media-card';const expand=document.createElement('button');expand.type='button';expand.className='upload-card-expand';expand.innerHTML=iconSvg('expand');expand.onclick=()=>openMediaViewer(it.url,'video');const v=document.createElement('video');v.src=it.url;v.controls=true;v.muted=true;v.playsInline=true;v.preload='metadata';const lab=document.createElement('div');lab.className='upload-card-label';lab.textContent=String(it.name||'Video');d.append(v,expand,lab)}else if(kind==='audio'){d.className+=' upload-media-card';const inner=document.createElement('div');inner.className='upload-audio-inner';const icon=document.createElement('div');icon.className='upload-audio-icon';icon.textContent='♫';const audio=document.createElement('audio');audio.src=it.url;audio.preload='metadata';audio.style.display='none';const toggle=document.createElement('button');toggle.type='button';toggle.className='upload-audio-toggle';toggle.textContent='▶';toggle.onclick=e=>{e.stopPropagation();if(audio.paused){audio.play().catch(()=>{});toggle.textContent='❚❚'}else{audio.pause();toggle.textContent='▶'}};audio.onended=()=>toggle.textContent='▶';inner.append(icon,toggle);const expand=document.createElement('button');expand.type='button';expand.className='upload-card-expand';expand.innerHTML=iconSvg('expand');expand.onclick=()=>openMediaViewer(it.url,'audio');const lab=document.createElement('div');lab.className='upload-card-label';lab.textContent=String(it.name||'Audio');d.append(inner,audio,expand,lab)}else if(kind==='file'){d.classList.add('ref-file','composer-file-card');const expand=document.createElement('button');expand.type='button';expand.className='file-card-expand';expand.innerHTML=iconSvg('expand');expand.setAttribute('aria-label','Expand file');expand.title='Expand file';expand.onclick=()=>openFileViewer(it);const icon=document.createElement('div');icon.className='file-card-icon';icon.textContent=fileTypeIcon(it.mime,it.name);const type=document.createElement('div');type.className='file-type-label';type.textContent=fileTypeLabel(it.mime,it.name);const viewport=document.createElement('div');viewport.className='file-name-viewport';const track=document.createElement('div');track.className='file-name-track';track.textContent=String(it.name||'File');viewport.appendChild(track);d.append(expand,icon,type,viewport);requestAnimationFrame(()=>{const overflow=Math.max(0,track.scrollWidth-viewport.clientWidth);if(overflow>2){track.style.setProperty('--file-shift',overflow+'px');track.classList.add('marquee')}})}strip.appendChild(d)});wrap.appendChild(strip)}if(images.length&&!attachments.length){const strip=document.createElement('div');strip.className='reference-strip user-attachment-strip';images.forEach(it=>{const d=document.createElement('div');d.className='ref-chip user-ref-chip';const img=document.createElement('img');img.src=it.data||it.url||it;img.alt='Attached image';img.onclick=()=>openMediaViewer(img.src,'image');d.append(img);strip.appendChild(d)});wrap.appendChild(strip)}if(text){const t=document.createElement('div');t.className='user-message-scroll';t.textContent=text;wrap.appendChild(t);requestAnimationFrame(()=>{updateUserMessageScroll(t);if(t.scrollHeight>t.clientHeight+1)t.addEventListener('scroll',()=>updateUserMessageScroll(t),{passive:true})})}if(index>=0)wrap.appendChild(renderMessageActions(wrap,'user',index,text));row.appendChild(wrap);chat.appendChild(row)}

function insertHistoryRow(row,index){if(index==null||Number(index)<0){chat.appendChild(row);return row}const rows=[...chat.querySelectorAll('.message-row')],before=rows[Number(index)];if(before)chat.insertBefore(row,before);else chat.appendChild(row);return row}
function addAi(index){showChat();const row=document.createElement('div');row.className='message-row ai';const b=document.createElement('div');b.className='bubble ai';const th=document.createElement('div');th.className='thinking';th.innerHTML='<span></span><span></span><span></span>';b.appendChild(th);row.appendChild(b);chat.appendChild(row);return{row,b,th}}
function applyMessageDirection(el,text){const t=String(text||'');const ar=(t.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g)||[]).length;const letters=(t.match(/[A-Za-z\u0600-\u06FF]/g)||[]).length;const rtl=ar>6&&ar/Math.max(letters,1)>.22;el.dir=rtl?'rtl':'ltr';el.style.textAlign=rtl?'right':'left';return rtl}
function looksLikeReadyToUseWriting(text,index){
  const raw=String(text||'').trim();if(!raw||/```/.test(raw))return false;
  const prev=history[Math.max(0,(Number(index)||0)-1)];const req=messageText(prev?.content).toLowerCase();if(!req)return false;
  if(!/(write|rewrite|rephrase|draft|compose|caption|email|message|letter|post|bio|script|statement|announcement|invitation|thank|apolog|congrat|proposal|resume|cover letter|story|essay)/i.test(req))return false;
  return raw.split(/\s+/).filter(Boolean).length>=8;
}
function addSourceLinks(container,sources){const list=Array.isArray(sources)?sources:[];const valid=list.filter(x=>x&&/^https?:\/\//i.test(String(x.url||''))).slice(0,8);if(!valid.length)return;const wrap=document.createElement('div');wrap.className='chat-source-list';const head=document.createElement('div');head.className='chat-source-head';head.textContent='Sources';wrap.appendChild(head);valid.forEach((src,i)=>{const a=document.createElement('a');a.className='chat-source-link';a.href=String(src.url);a.target='_blank';a.rel='noopener noreferrer';a.textContent=String(src.title||src.url||('Source '+(i+1))).slice(0,120);wrap.appendChild(a)});container.appendChild(wrap)}
function addSavedAi(text,index,reasoningSummary='',metaObj=null){showChat();const row=document.createElement('div');row.className='message-row ai';const b=document.createElement('div');b.className='bubble ai';b.dataset.rawText=text;applyMessageDirection(b,text);if(reasoningSummary){const rs=document.createElement('div');rs.className='chat-reasoning-summary';rs.textContent=String(reasoningSummary);b.appendChild(rs)}const display=String(text||'');const explicit=/\[\[COPY_BUTTON\]\]/i.test(display);const artifact=copyableMessageText(display);const effective=explicit?display:display;const answerWrap=document.createElement('div');renderCopyAware(effective,answerWrap);b.appendChild(answerWrap);if(metaObj?.sources)addSourceLinks(b,metaObj.sources);b.appendChild(renderMessageActions(b,'assistant',index,display));row.appendChild(b);insertHistoryRow(row,index)}
async function copyText(text){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true}}catch{}try{const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';ta.style.pointerEvents='none';document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);const ok=document.execCommand('copy');ta.remove();return ok}catch{return false}}
let ttsVoice="flux-alexis-en",ttsEmotion="";
const TTS_DEFAULT_VOICE="flux-alexis-en";
const TTS_MAX_CHARS=5000;
const TTS_EMOTIONS=["happy","sad","angry","excited","calm","nervous","confident","surprised","satisfied","delighted","scared","worried","friendly","empathetic","enthusiastic","mysterious","whispering","shouting","serious","playful","sarcastic"];
function createAudioCard(url,name,metaText=""){
  const card=document.createElement('div');card.className='tts-audio-card';
  const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=url;
  const meta=document.createElement('div');meta.className='tts-audio-meta';meta.textContent=metaText||'Atlas Audio • MP3';
  const actions=document.createElement('div');actions.className='tts-audio-actions';
  const download=document.createElement('a');download.className='media-action';download.href=url;download.download=name||'atlas-speech.mp3';download.textContent='Download audio';
  actions.appendChild(download);card.append(audio,meta,actions);return card;
}
function ttsCleanText(text){
  let raw=copyableMessageText(String(text||''));
  raw=raw.replace(/```[\s\S]*?```/g,' ')
         .replace(/`[^`]*`/g,' ')
         .replace(/<pre[\s\S]*?<\/pre>/gi,' ')
         .replace(/<code[\s\S]*?<\/code>/gi,' ')
         .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
         .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
         .replace(/https?:\/\/\S+/gi,' ');
  raw=raw.replace(/^\s{0,3}(#{1,6})\s+/gm,' ')
         .replace(/^\s{0,3}[-*+]\s+/gm,' ')
         .replace(/^\s{0,3}\d+\.\s+/gm,' ');
  try{raw=raw.replace(/[^\p{L}\p{M}\p{N}\s]+/gu,' ')}
  catch{raw=raw.replace(/[^A-Za-z0-9\u0600-\u06FF\s]+/g,' ')}
  return raw.replace(/\s+/g,' ').trim();
}
let activeSpeechSession=null;
let speechAudioContext=null;
function getSpeechAudioContext(){
  if(!speechAudioContext){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(Ctx) speechAudioContext=new Ctx();
  }
  return speechAudioContext;
}
function splitTtsText(text,maxLen){
  const clean=String(text||'').trim();if(clean.length<=maxLen)return clean?[clean]:[];
  const words=clean.split(/\s+/);const chunks=[];let current='';
  for(const word of words){
    const candidate=current?current+' '+word:word;
    if(candidate.length<=maxLen){current=candidate;continue}
    if(current)chunks.push(current);
    if(word.length<=maxLen)current=word;
    else{
      for(let i=0;i<word.length;i+=maxLen)chunks.push(word.slice(i,i+maxLen));
      current='';
    }
  }
  if(current)chunks.push(current);
  return chunks;
}
function stopSpeechSession(){
  if(!activeSpeechSession)return;
  const s=activeSpeechSession;s.cancelled=true;
  try{s.controller?.abort()}catch{}
  try{s.source?.stop?.()}catch{}
  s.audio?.pause();s.audio?.remove();
  s.parts=[];
  if(s.button?.isConnected){
    s.button.textContent='Speak';s.button.disabled=false;s.button.title='Speak';
    s.button.onclick=()=>speakAssistantText(s.text,s.button)
  }
  activeSpeechSession=null;
}
async function fetchTtsPassage(text,signal){
  const payload={text,voice:ttsVoice||TTS_DEFAULT_VOICE,emotion:'',model:ttsModel,chat_id:''};
  let r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal});
  let d=await r.json().catch(()=>({}));
  if(!r.ok&&/[^\x00-\x7F]/.test(text)&&ttsModel==='deepgram/flux-tts:free'){
    r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,model:'fish-audio/s2.1-pro-free:free',voice:''}),signal});
    d=await r.json().catch(()=>({}));
  }
  if(!r.ok)throw new Error(d.error||'TTS generation failed.');
  if(!d.url)throw new Error('TTS generation returned no audio.');
  return d;
}
async function playTtsUrl(s,url){
  if(s.cancelled)throw new DOMException('Aborted','AbortError');
  const ctx=getSpeechAudioContext();
  if(ctx){
    try{
      await ctx.resume();
      const resp=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:s.controller.signal});
      if(!resp.ok)throw new Error('Audio download failed.');
      const buffer=await ctx.decodeAudioData(await resp.arrayBuffer());
      await new Promise((resolve,reject)=>{
        if(s.cancelled){reject(new DOMException('Aborted','AbortError'));return}
        const source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);s.source=source;
        source.onended=()=>{s.source=null;resolve()};
        try{source.start(0)}catch(err){s.source=null;reject(err)}
      });
      return;
    }catch(err){
      if(err?.name==='AbortError'||s.cancelled)throw err;
    }
  }
  const audio=new Audio();audio.preload='auto';audio.playsInline=true;audio.setAttribute('playsinline','1');audio.src=url;s.audio=audio;
  await new Promise((resolve,reject)=>{
    const cleanup=()=>{audio.onended=null;audio.onerror=null};
    const ok=()=>{cleanup();resolve()};const bad=()=>{cleanup();reject(new Error('Audio playback failed.'))};
    audio.onended=ok;audio.onerror=bad;
    audio.play().catch(bad);
  });
  if(s.audio===audio)s.audio=null;
}
async function speakAssistantText(text,button){
  const clean=ttsCleanText(text);
  if(!clean)return;
  if(activeSpeechSession)stopSpeechSession();
  const parts=splitTtsText(clean,TTS_MAX_CHARS);
  if(!parts.length)return;
  const ctx=getSpeechAudioContext();
  if(ctx){try{ctx.resume()}catch{}}
  const s={text:String(text||''),button,audio:null,source:null,cancelled:false,controller:new AbortController(),parts};
  activeSpeechSession=s;
  button.textContent='Stop';button.disabled=false;button.title='Stop speaking';
  try{
    for(const part of parts){
      if(s.cancelled)throw new DOMException('Aborted','AbortError');
      const d=await fetchTtsPassage(part,s.controller.signal);
      await playTtsUrl(s,d.url);
    }
  }catch(e){
    if(!s.cancelled&&e.name!=='AbortError'){
      button.textContent='Speak';button.title='Speak';button.disabled=false;
      status.textContent='Could not play speech.';
      setTimeout(()=>{if(status.textContent==='Could not play speech.')status.textContent=''},1800);
    }
  }finally{
    if(activeSpeechSession===s){
      activeSpeechSession=null;button.textContent='Speak';button.disabled=false;button.title='Speak';
      button.onclick=()=>speakAssistantText(s.text,button);
    }
  }
}

let ttsVoices=[];let ttsVoiceFilter='all';let ttsVoiceSearch='';let ttsModel='deepgram/flux-tts:free';
function speakerMatches(v){const q=ttsVoiceSearch.trim().toLowerCase();if(q){const hay=[v.name,v.id,v.gender,v.age,v.description,...(v.tags||[])].join(' ').toLowerCase();if(!hay.includes(q))return false}if(ttsVoiceFilter==='all')return true;const h=[v.gender,v.age,...(v.tags||[])].join(' ').toLowerCase();return h.includes(ttsVoiceFilter)}
function renderTtsFilters(){const box=$('ttsSpeakerFilters');if(!box)return;const filters=[['all','All'],['female','Women'],['male','Men'],['old','Old'],['teen','Teen'],['mature','Mature'],['young','Young']];box.innerHTML='';filters.forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.className='tts-filter'+(id===ttsVoiceFilter?' active':'');b.textContent=label;b.onclick=()=>{ttsVoiceFilter=id;renderTtsFilters();renderTtsVoices(ttsVoices)};box.appendChild(b)})}
function renderTtsVoices(voices){ttsVoices=Array.isArray(voices)?voices:[];const box=$('ttsVoiceList');if(!box)return;box.innerHTML='';const visible=ttsVoices.filter(speakerMatches);if(!visible.length){box.innerHTML='<div class="tts-history-empty">No voices match this filter.</div>';return}visible.forEach(v=>{const b=document.createElement('button');b.type='button';b.className='tts-speaker-card'+(String(v.id||'')===ttsVoice?' active':'');b.innerHTML='<b>'+esc(v.name||'Atlas Audio voice')+'</b><small>'+esc([v.gender||'Voice',v.age||'',v.description||''].filter(Boolean).join(' • '))+'</small>';b.onclick=()=>{ttsVoice=String(v.id||'');renderTtsVoices(ttsVoices);updateDeveloperVoiceTester?.()};box.appendChild(b)})}
let ttsHistoryItems=[];let ttsHistoryNewestFirst=true;function renderTtsHistory(){const box=$('ttsHistoryList');if(!box)return;const items=[...ttsHistoryItems].sort((a,b)=>(Number(b.created_at||0)-Number(a.created_at||0))*(ttsHistoryNewestFirst?1:-1));box.innerHTML='';if(!items.length){box.innerHTML='<div class="tts-history-empty">No audio created yet.</div>';return}items.forEach(item=>{const row=document.createElement('div');row.className='tts-history-item horizontal';const main=document.createElement('div');main.className='tts-history-main';const text=document.createElement('div');text.className='tts-history-text';text.textContent=String(item.text||'Untitled speech');const dt=item.created_at?new Date(Number(item.created_at)*1000).toLocaleString():'';const meta=document.createElement('div');meta.className='tts-history-meta';meta.textContent=[item.voice||'Voice',item.emotion||'',dt].filter(Boolean).join(' • ');main.append(text,meta);const actions=document.createElement('div');actions.className='tts-history-actions';const play=document.createElement('button');play.type='button';play.textContent='Play';play.onclick=()=>{const a=new Audio(item.url);a.play().catch(()=>{})};actions.append(play);row.append(main,actions);box.appendChild(row)})}
async function loadTtsHistory(){try{const r=await fetch('/api/tts/history',{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Could not load TTS history.');ttsHistoryItems=Array.isArray(d.history)?d.history:[];renderTtsHistory()}catch{ttsHistoryItems=[];renderTtsHistory()}}
function renderTtsEmotions(){const box=$('ttsEmotionList');if(!box)return;box.innerHTML='';TTS_EMOTIONS.forEach(em=>{const b=document.createElement('button');b.type='button';b.className='tts-emotion'+(em===ttsEmotion?' active':'');b.textContent=em;b.onclick=()=>{ttsEmotion=ttsEmotion===em?'':em;renderTtsEmotions()};box.appendChild(b)})}
function renderTtsModelChoices(){const boxes=[$('ttsStudioModelChoices'),$('ttsModelDeveloperChoices')].filter(Boolean);boxes.forEach(box=>{box.innerHTML='';Object.entries(TTS_MODEL_INFO).forEach(([id,info])=>{const b=document.createElement('button');b.type='button';b.className=(box.id==='ttsStudioModelChoices'?'tts-model-choice':'tts-model-developer-choice')+(id===ttsModel?' active':'');b.innerHTML='<span>'+esc(info.label)+'</span><small>'+esc(info.desc)+'</small>'+(box.id==='ttsModelDeveloperChoices'?'<span class="model-check">'+(id===ttsModel?'✓':'')+'</span>':'');b.onclick=()=>selectTtsModel(id);box.appendChild(b)})});const info=$('ttsStudioModelInfo');if(info){const x=TTS_MODEL_INFO[ttsModel];info.textContent=x?x.desc:''}}
async function selectTtsModel(model){if(!TTS_MODEL_INFO[model])return;const previous=ttsModel;ttsModel=model;if(currentRole==='developer'){const r=await fetch('/api/settings/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tts_model:model})});const d=await r.json().catch(()=>({}));if(!r.ok){ttsModel=previous;renderTtsModelChoices();$('ttsDevStatus').textContent=d.error||'Could not save TTS model.';return}settingsData=d.settings||settingsData}renderTtsModelChoices();await loadTtsConfig(false)}
async function loadTtsConfig(resetHistory=true){if(resetHistory)loadTtsHistory();try{const r=await fetch('/api/tts/config?model='+encodeURIComponent(ttsModel));const d=await r.json();if(r.ok){ttsModel=d.model||ttsModel;ttsVoice=d.default_voice||TTS_DEFAULT_VOICE;renderTtsModelChoices();renderTtsFilters();renderTtsVoices(d.voices||[]);renderTtsEmotions();$('ttsStudioText').maxLength=Number(d.max_chars||TTS_MAX_CHARS);$('ttsStudioCounter').textContent=`0 / ${Number(d.max_chars||TTS_MAX_CHARS)}`}}catch{renderTtsModelChoices();renderTtsFilters();renderTtsVoices([{id:TTS_DEFAULT_VOICE,name:'Default voice',gender:'Voice',age:'',description:'Use the selected TTS model default voice'}]);renderTtsEmotions()}}
async function generateStudioTts(){const box=$('ttsStudioText'),btn=$('ttsGenerateBtn'),text=String(box.value||''),statusEl=$('ttsStudioStatus');if(!text.trim()){statusEl.textContent='Enter some text first.';return}if(text.length>TTS_MAX_CHARS){statusEl.textContent=`Maximum ${TTS_MAX_CHARS} characters.`;return}btn.disabled=true;statusEl.textContent='Generating real speech…';$('ttsStudioResult').classList.remove('show');try{const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice:ttsVoice,emotion:ttsEmotion,model:ttsModel,chat_id:currentChatId})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'TTS generation failed.');$('ttsStudioAudio').src=d.url;$('ttsStudioResult').classList.add('show');statusEl.textContent=`Ready • ${d.characters} characters`;await loadTtsHistory()}catch(e){statusEl.textContent=e.message||'TTS generation failed.'}finally{btn.disabled=false}}
function setStudioPanel(kind){const a=$('studioAutomationPanel'),t=$('studioTtsPanel'),ab=$('studioAutomationBar'),tb=$('studioTtsBar'),body=document.querySelector('.studio-body');const isT=kind==='tts';a.classList.toggle('show',!isT);t.classList.toggle('show',isT);ab.classList.toggle('active',!isT);tb.classList.toggle('active',isT);body?.classList.toggle('tts-mobile-mode',isT);if(!isT){$('ttsVoiceBox')?.classList.remove('expanded');if($('ttsVoiceToggle'))$('ttsVoiceToggle').textContent='Expand';}if(isT){renderTtsModelChoices();loadTtsConfig()}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function iconSvg(name){
  const common='viewBox="0 0 24 24" aria-hidden="true"';
  const paths={
    download:`<svg ${common}><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>`,
    expand:`<svg ${common}><path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/></svg>`,copy:`<svg ${common}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>`,
    run:`<svg ${common}><path d="m9 6 9 6-9 6Z"/></svg>`,
    mic:`<svg ${common}><path d="M12 3a3.5 3.5 0 0 0-3.5 3.5v5a3.5 3.5 0 0 0 7 0v-5A3.5 3.5 0 0 0 12 3Z"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7"/></svg>`
  };return paths[name]||'';
}
function detectCodeLanguage(raw, index){
  const first=String(raw||'').split('\n')[0].trim();
  if(/^(html?|xhtml)$/i.test(first)) return 'html';
  if(/^(js|javascript)$/i.test(first)) return 'javascript';
  if(/^(ts|typescript)$/i.test(first)) return 'typescript';
  if(/^(css)$/i.test(first)) return 'css';
  if(/^(py|python)$/i.test(first)) return 'python';
  if(/^(json)$/i.test(first)) return 'json';
  if(/^(bash|sh|shell)$/i.test(first)) return 'bash';
  if(/<(?:!doctype|html|body|head|div|style|script)\b/i.test(raw)||/<style\b/i.test(raw)) return 'html';
  if(/\b(?:const|let|var|function|=>)\b/.test(raw)) return 'javascript';
  if(/^\s*[{[]/.test(raw)&&/[}\]]\s*$/.test(raw)) return 'json';
  return '';
}
function codeFilename(language){return language==='html'?'index.html':language==='css'?'style.css':language==='javascript'?'script.js':language==='typescript'?'script.ts':language==='python'?'script.py':language==='json'?'data.json':language==='bash'?'script.sh':'code.txt'}
let activeCodeViewer=null;
function openCodeViewer(code,language,title='Code'){
  activeCodeViewer={code:String(code||''),language:language||'',title};
  $('codeViewerTitle').textContent=title;
  $('codeViewerCode').textContent=activeCodeViewer.code;
  $('codeViewerLayer').classList.add('show');$('codeViewerLayer').setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeCodeViewer(){activeCodeViewer=null;$('codeViewerLayer').classList.remove('show');$('codeViewerLayer').setAttribute('aria-hidden','true');if(!$('htmlPreviewLayer').classList.contains('show'))document.body.style.overflow=''}
function runHtmlPreview(code){
  $('htmlPreviewFrame').srcdoc=String(code||'');$('htmlPreviewLayer').classList.add('show');$('htmlPreviewLayer').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
}
function closeHtmlPreview(){const f=$('htmlPreviewFrame');f.srcdoc='';$('htmlPreviewLayer').classList.remove('show');$('htmlPreviewLayer').setAttribute('aria-hidden','true');if(!$('codeViewerLayer').classList.contains('show'))document.body.style.overflow=''}
function encodeCodeData(value){try{return btoa(unescape(encodeURIComponent(String(value??''))))}catch{return btoa(String(value??''))}}
function decodeCodeData(value){try{return decodeURIComponent(escape(atob(String(value||''))))}catch{try{return atob(String(value||''))}catch{return ''}}}
function makeCodeCard(code,language,large,index){
  const card=document.createElement('div');card.className='code-card'+(large?'':' code-short');
  const toolbar=document.createElement('div');toolbar.className='code-toolbar';
  const label=document.createElement('span');label.className='code-language';label.textContent=language||'code';toolbar.appendChild(label);
  const encoded=encodeCodeData(code);
  const copy=document.createElement('button');copy.className='code-tool';copy.type='button';copy.innerHTML=iconSvg('copy');copy.title='Copy';copy.dataset.codeAction='copy';copy.dataset.code=encoded;toolbar.appendChild(copy);
  const download=document.createElement('button');download.className='code-tool';download.type='button';download.innerHTML=iconSvg('download');download.title='Download';download.dataset.codeAction='download';download.dataset.code=encoded;download.dataset.filename=codeFilename(language);toolbar.appendChild(download);
  const expand=document.createElement('button');expand.className='code-tool';expand.type='button';expand.innerHTML=iconSvg('expand');expand.title='Expand';expand.dataset.codeAction='expand';expand.dataset.code=encoded;expand.dataset.language=language||'';expand.dataset.filename=codeFilename(language);toolbar.appendChild(expand);
  if(language==='html'){const run=document.createElement('button');run.className='code-tool';run.type='button';run.innerHTML=iconSvg('run');run.title='Run';run.dataset.codeAction='run';run.dataset.code=encoded;run.dataset.language='html';toolbar.appendChild(run)}
  const pre=document.createElement('pre');pre.className='code-block';const c=document.createElement('code');c.textContent=code;pre.appendChild(c);card.append(toolbar,pre);return card;
}

async function downloadText(text,name){const blob=new Blob([String(text??'')],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)}
function markdown(s){const raw=String(s??'').replace(/\r\n?/g,'\n'),parts=raw.split(/```/);let out='';function inline(t){return esc(t).replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^\n]+?)\*\*/g,'<strong>$1</strong>').replace(/__([^\n]+?)__/g,'<strong>$1</strong>').replace(/~~([^\n]+?)~~/g,'<del>$1</del>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>').replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g,'$1<em>$2</em>').replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g,'$1<em>$2</em>')}for(let i=0;i<parts.length;i++){if(i%2){const lines=parts[i].split('\n');let lang=String(lines[0]||'').trim();if(/^[a-z0-9_+-]{1,20}$/i.test(lang))lines.shift();else lang=detectCodeLanguage(parts[i],i);out+=makeCodeCard(lines.join('\n'),lang,lines.length>5,i).outerHTML;continue}const lines=parts[i].split('\n');let para=[],list=[],listType='';const fp=()=>{if(para.length){out+='<p>'+para.map(inline).join('<br>')+'</p>';para=[]}},fl=()=>{if(list.length){out+='<'+listType+'>'+list.map(x=>'<li>'+inline(x)+'</li>').join('')+'</'+listType+'>';list=[];listType=''}};for(let j=0;j<lines.length;j++){const line=lines[j],t=line.trim();if(!t){fp();fl();continue}const mh=t.match(/^(#{1,6})\s+(.+)$/);if(mh){fp();fl();const n=mh[1].length;out+='<h'+n+'>'+inline(mh[2])+'</h'+n+'>';continue}const bq=t.match(/^>\s?(.*)$/);if(bq){fp();fl();out+='<blockquote>'+inline(bq[1])+'</blockquote>';continue}const ul=t.match(/^[-*+]\s+(.*)$/);if(ul){fp();if(listType&&listType!=='ul')fl();listType='ul';list.push(ul[1]);continue}const ol=t.match(/^\d+\.\s+(.*)$/);if(ol){fp();if(listType&&listType!=='ol')fl();listType='ol';list.push(ol[1]);continue}if(t.includes('|')&&j+1<lines.length&&/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(lines[j+1].trim())){fp();fl();const row=x=>x.replace(/^\|/,'').replace(/\|$/,'').split('|').map(v=>v.trim());const heads=row(t);j++;const aligns=row(lines[j]);const rows=[];while(j+1<lines.length&&lines[j+1].trim().includes('|')){j++;rows.push(row(lines[j]))}out+='<div class="table-wrap"><table><thead><tr>'+heads.map((c,k)=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+heads.map((_,k)=>'<td>'+inline(r[k]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';continue}if(/^([-*_])(?:\s*\1){2,}$/.test(t)){fp();fl();out+='<hr>';continue}para.push(line)}fp();fl()}return '<div class="md">'+out+'</div>'}

function bindCodeCopy(root){
  root.querySelectorAll('.code-copy-inline').forEach(btn=>{if(btn.dataset.bound)return;btn.dataset.bound='1';btn.onclick=()=>{const code=decodeURIComponent(btn.dataset.copyCode||'');copyText(code).then(ok=>{const old=btn.textContent;btn.textContent=ok?'Copied':'Failed';setTimeout(()=>{if(btn.isConnected)btn.textContent=old},1100)})}});
  root.querySelectorAll('.code-tool[data-code-action]').forEach(btn=>{
    if(btn.dataset.bound)return;btn.dataset.bound='1';
    btn.addEventListener('click',async()=>{
      const code=decodeCodeData(btn.dataset.code||''),action=btn.dataset.codeAction;
      if(action==='copy'){const ok=await copyText(code);const old=btn.innerHTML;btn.innerHTML=ok?'✓':iconSvg('copy');setTimeout(()=>{if(btn.isConnected)btn.innerHTML=old},1000)}
      else if(action==='download'){downloadText(code,btn.dataset.filename||'code.txt')}
      else if(action==='expand'){openCodeViewer(code,btn.dataset.language||'',btn.dataset.filename||'code.txt')}
      else if(action==='run'){runHtmlPreview(code)}
    });
  });
}


let atlasTopErrorTimer=null;
function showTopError(message,duration=3000){const el=$('atlasTopError');if(!el)return;clearTimeout(atlasTopErrorTimer);el.textContent=String(message||'Something went wrong.');el.classList.add('show');atlasTopErrorTimer=setTimeout(()=>{el.classList.remove('show')},Math.max(1000,Number(duration)||3000))}

function addError(msg,index=-1){const raw=String(msg||'Generation failed.');const text=/\bsteps?\b/i.test(raw)?'Steps is error':(/connection reset|remote end closed|connection aborted|timed out|temporary failure/i.test(raw)?'Video generation network error. Please try again.':raw);const row=document.createElement('div');row.className='message-row ai';const b=document.createElement('div');b.className='bubble ai error';applyMessageDirection(b,text);b.textContent=text;row.appendChild(b);insertHistoryRow(row,index)}
function stoppedNoticeNode(){const n=document.createElement('div');n.className='generation-stopped-note';n.textContent='Generation stopped.';return n}
function addStoppedSavedMessage(meta,index=-1){
  const row=document.createElement('div');row.className='message-row ai';
  const wrap=document.createElement('div');wrap.className='bubble ai';
  const partial=String(meta?.stream_text||meta?.text||'').trim();
  if(partial){applyMessageDirection(wrap,partial);renderCopyAware(partial,wrap,false)}
  wrap.appendChild(stoppedNoticeNode());row.appendChild(wrap);insertHistoryRow(row,index)
}
function ensureViewerLayers(){if($('mediaViewerLayer'))return;const layer=document.createElement('div');layer.id='mediaViewerLayer';layer.className='viewer-layer';layer.innerHTML='<button id="mediaViewerClose" class="viewer-close" type="button" aria-label="Back">← Back</button><div class="viewer-content" id="mediaViewerContent"></div>';document.body.appendChild(layer);$('mediaViewerClose').onclick=closeMediaViewer;layer.onclick=e=>{if(e.target===layer)closeMediaViewer()}}
function openMediaViewer(url,type='image'){ensureViewerLayers();const layer=$('mediaViewerLayer');layer.classList.remove('file-mode');const close=$('mediaViewerClose');if(close){close.textContent='×';close.setAttribute('aria-label','Close');close.title='Close'}const c=$('mediaViewerContent');c.innerHTML='';if(type==='image'){const img=document.createElement('img');img.src=url;img.alt='Image';c.appendChild(img)}else if(type==='video'){const v=document.createElement('video');v.src=url;v.controls=true;v.autoplay=true;v.playsInline=true;v.preload='metadata';v.className='viewer-video';v.onerror=()=>{c.innerHTML='<div class="file-viewer-title">Video unavailable</div>'};c.appendChild(v);v.play().catch(()=>{})}else if(type==='audio'){const a=document.createElement('audio');a.src=url;a.controls=true;a.autoplay=true;a.preload='metadata';a.className='viewer-audio';c.appendChild(a);a.play().catch(()=>{})}$('mediaViewerLayer').classList.add('show');document.body.style.overflow='hidden'}function closeMediaViewer(){$('mediaViewerLayer')?.classList.remove('show');$('mediaViewerLayer')?.classList.remove('file-mode');if(!$('codeViewerLayer').classList.contains('show')&&!$('htmlPreviewLayer').classList.contains('show'))document.body.style.overflow=''}function openFileViewer(file){ensureViewerLayers();const layer=$('mediaViewerLayer');layer.classList.add('file-mode');const close=$('mediaViewerClose');if(close){close.textContent='← Back';close.setAttribute('aria-label','Back');close.title='Back'}const c=$('mediaViewerContent');c.innerHTML='';const shell=document.createElement('div');shell.className='file-viewer-shell';const head=document.createElement('div');head.className='file-viewer-head';const title=document.createElement('b');title.textContent=String(file?.name||'Attached file');head.appendChild(title);const pre=document.createElement('pre');pre.className='file-viewer-pre';pre.textContent=String(file?.extracted_text||'')||'This file was saved and sent to the AI. A local text preview is not available for this file type.';shell.append(head,pre);c.appendChild(shell);layer.classList.add('show');document.body.style.overflow='hidden'}
function addImage(url,prompt,mode,size,index=-1){
  showChat(); pendingGeneratedImage={url,prompt:prompt||''};
  const row=document.createElement('div');row.className='message-row ai';
  const card=document.createElement('div');card.className='media-card';
  const img=document.createElement('img');img.src=url;img.alt=prompt||'Generated image';img.loading='lazy';img.addEventListener('click',()=>openMediaViewer(url,'image'));
  img.onerror=()=>{if(row.isConnected)row.remove();};
  const bar=document.createElement('div');bar.className='media-toolbar';
  const dl=document.createElement('button');dl.className='media-action';dl.type='button';dl.textContent='Download';dl.onclick=()=>downloadUrl(url,'atlas-image.png');bar.appendChild(dl);
  const spacer=document.createElement('div');spacer.className='media-spacer';bar.appendChild(spacer);
  card.append(img,bar);
  const metaEl=document.createElement('div');metaEl.className='video-meta';metaEl.textContent=(mode==='img2img'?'Edited':'Generated')+' • '+(size||'')+' • Saved in Atlas';card.appendChild(metaEl);
  row.appendChild(card);chat.appendChild(row);
}
function addVideoPending(settings){
  showChat();
  const row=document.createElement('div');row.className='message-row ai generation-inline';
  const card=document.createElement('div');card.className='chat-generation-card';
  const head=document.createElement('div');head.className='chat-generation-head';
  const title=document.createElement('span');title.className='chat-generation-title';title.textContent='Creating video…';
  const pct=document.createElement('span');pct.className='chat-generation-pct';pct.textContent='0%';
  const sub=document.createElement('div');sub.className='chat-generation-meta';sub.textContent=String(settings.frames)+' frames @ '+String(settings.fps)+' FPS • '+Number(settings.seconds||0).toFixed(2)+'s';
  const line=document.createElement('div');line.className='chat-generation-line';const fill=document.createElement('div');fill.className='chat-generation-fill';line.appendChild(fill);
  head.append(title,pct);card.append(head,sub,line);row.appendChild(card);chat.appendChild(row);
  return {row,card,fill,pct,sub,title};
}

function audioIcon(path){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+path+'</svg>'}
function addAudio(meta,index=-1){
  const urls=(Array.isArray(meta?.urls)&&meta.urls.length?meta.urls:[meta?.url]).filter(Boolean);
  if(!urls.length)return;
  const url=urls[0];
  const row=document.createElement('div');row.className='message-row ai';
  const card=document.createElement('div');card.className='audio-card';
  const bubble=document.createElement('div');bubble.className='audio-bubble';
  const play=document.createElement('button');play.type='button';play.className='audio-play';play.setAttribute('aria-label','Play audio');play.innerHTML=audioIcon('<path d="M8 5.5v13l10-6.5z"/>');
  const main=document.createElement('div');main.className='audio-bubble-main';
  const title=document.createElement('div');title.className='audio-bubble-title';title.textContent='Atlas 1.0';
  const sub=document.createElement('div');sub.className='audio-bubble-sub';sub.textContent=formatAudioDuration(Number(meta.seconds||0)||0)+' • Atlas 1.0'+(meta.instrumental?' • Instrumental':'')+(meta.thinking?' • Planning pass':'');
  const progress=document.createElement('div');progress.className='audio-progress';const fill=document.createElement('div');fill.className='audio-progress-fill';progress.appendChild(fill);
  const times=document.createElement('div');times.className='audio-time';const cur=document.createElement('span');cur.textContent='0:00';const dur=document.createElement('span');dur.textContent=fmtAudioTime(meta.seconds);times.append(cur,dur);
  const audio=document.createElement('audio');audio.className='audio-native';audio.preload='metadata';audio.src=url;
  main.append(title,sub,progress,times);
  const download=document.createElement('button');download.type='button';download.className='audio-download';download.title='Download';download.setAttribute('aria-label','Download audio');download.innerHTML=audioIcon('<path d="M12 4v10M8 10l4 4 4-4M5 19h14"/>');download.onclick=()=>downloadUrl(url,'atlas-track.wav');
  bubble.append(play,main,download);card.append(bubble,audio); 
  const metaEl=document.createElement('div');metaEl.className='audio-card-meta';metaEl.textContent=[meta.infer_steps&&meta.infer_steps+' steps',meta.bpm&&meta.bpm!=='auto'&&'BPM '+meta.bpm,meta.key&&meta.key!=='auto'&&meta.key,meta.time_signature&&meta.time_signature!=='auto'&&meta.time_signature].filter(Boolean).join(' • ');if(metaEl.textContent)card.append(metaEl);
  function setPlayIcon(playing){play.innerHTML=playing?'<span class="audio-pause-glyph">||</span>':audioIcon('<path d="M8 5.5v13l10-6.5z"/>');play.setAttribute('aria-label',playing?'Pause audio':'Play audio');play.title=playing?'Pause audio':'Play audio'}
  play.onclick=()=>{if(audio.paused){audio.play().catch(()=>{});}else audio.pause()};
  audio.addEventListener('play',()=>setPlayIcon(true));audio.addEventListener('pause',()=>setPlayIcon(false));audio.addEventListener('ended',()=>{setPlayIcon(false);fill.style.width='0%';cur.textContent='0:00'});
  audio.addEventListener('loadedmetadata',()=>{dur.textContent=fmtAudioTime(audio.duration);});
  audio.addEventListener('timeupdate',()=>{const pct=audio.duration?Math.min(100,(audio.currentTime/audio.duration)*100):0;fill.style.width=pct+'%';cur.textContent=fmtAudioTime(audio.currentTime)});
  progress.onclick=e=>{if(!audio.duration)return;const r=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,(e.clientX-r.left)/Math.max(1,r.width)*audio.duration))};
  row.appendChild(card);insertHistoryRow(row,index);
}
function fmtAudioTime(value){const n=Math.max(0,Math.round(Number(value)||0));const m=Math.floor(n/60),sec=n%60;return m+':'+String(sec).padStart(2,'0')}

function addVideo(url,meta,index=-1){
  const row=document.createElement('div');row.className='message-row ai';
  const card=document.createElement('div');card.className='media-card';
  const video=document.createElement('video');video.src=url;video.controls=true;video.playsInline=true;video.preload='auto';video.muted=false;video.defaultMuted=false;video.removeAttribute('muted');video.setAttribute('playsinline','1');video.setAttribute('controlsList','nodownload');video.addEventListener('click',()=>video.paused?video.play().catch(()=>{}):video.pause());video.addEventListener('loadedmetadata',()=>{if(video.videoWidth&&video.videoHeight)video.style.aspectRatio=video.videoWidth+' / '+video.videoHeight});
  video.onerror=()=>{const fallback=document.createElement('div');fallback.className='video-generating';fallback.innerHTML='<div class="video-title">Video unavailable</div><div class="video-sub">Atlas could not load the saved video file. The Download button is still available.</div>';video.replaceWith(fallback)};
  const bar=document.createElement('div');bar.className='media-toolbar';
  const dl=document.createElement('button');dl.className='media-action';dl.type='button';dl.textContent='Download';dl.onclick=()=>downloadUrl(url,'atlas-video.mp4');bar.appendChild(dl);
  const spacer=document.createElement('div');spacer.className='media-spacer';bar.appendChild(spacer);
  const fs=document.createElement('button');fs.className='media-action';fs.type='button';fs.textContent='Fullscreen';fs.onclick=async()=>{try{if(video.requestFullscreen)await video.requestFullscreen();else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen()}catch{}};bar.appendChild(fs);
  const info=document.createElement('div');info.className='video-meta';info.textContent=(meta.mode==='img2video'?'Image to video':'Text to video')+' • '+(meta.frames||'')+' frames @ '+(meta.fps||'')+' FPS • '+(meta.width||'')+'×'+(meta.height||'')+' • Saved in Atlas';card.append(video,bar,info);
  row.appendChild(card);chat.appendChild(row);
}
async function downloadUrl(url,name){
  try{
    const fetchUrl=new URL(String(url||''),window.location.href).toString();
    const r=await fetch(fetchUrl,{credentials:'same-origin',cache:'no-store'});
    if(!r.ok)throw new Error('Download failed');
    const blob=await r.blob();
    const objectUrl=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=objectUrl;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),2000);
  }catch(e){status.textContent='Download failed. Please try again.';setTimeout(()=>{if(status.textContent==='Download failed. Please try again.')status.textContent=''},1800);}
}
function imagePayload(){const src=selectedImages[0]||imageReferenceImages[0]||{};return{quality:imageQuality,ratio:imageRatio,model:activeModels.image,steps:currentRole==='developer'?100:100,source_width:src.width||0,source_height:src.height||0}}
function findHistoryByJob(jobId){return history.findIndex(m=>String(metaObject(m).job_id||'')===String(jobId||''))}
function setGenerationEntry(jobId,result){
  const idx=findHistoryByJob(jobId);if(idx<0)return -1;
  const m=history[idx],meta=metaObject(m);const kind=result?.kind||meta.kind;const cancelled=String(result?.status||meta.status||'').toLowerCase()==='cancelled';
  if(kind==='chat'){
    m.role='assistant';m.content=cancelled?String(result?.text??result?.stream_text??meta.stream_text??''):String(result?.text||'');
    Object.assign(meta,{kind:'chat',status:cancelled?'cancelled':'completed',stream_text:cancelled?String(result?.stream_text??meta.stream_text??''):''});
  }else{
    m.role='assistant';m.content='';Object.assign(meta,result||{},{kind,status:cancelled?'cancelled':'completed',stream_text:cancelled?String(result?.stream_text||meta.stream_text||''):''});
    const prev=history.slice(0,idx).reverse().find(x=>x?.role==='user');const prevCreated=Number(parseMeta(prev?.meta).created_at||prev?.created_at||0);const generatedCreated=Number(meta.created_at||0);meta.created_at=Math.max(generatedCreated,prevCreated+0.001)
  }
  m.meta=JSON.stringify(meta);m.created_at=Number(meta.created_at||m.created_at||0);return idx;
}
function animateLastStreamWord(bubble){if(!bubble)return;const walker=document.createTreeWalker(bubble,NodeFilter.SHOW_TEXT);let last=null;while(walker.nextNode()){if(walker.currentNode.nodeValue?.trim())last=walker.currentNode}if(!last)return;const text=last.nodeValue||'';const m=text.match(/(\S+)(\s*)$/);if(!m)return;const frag=document.createDocumentFragment();const before=text.slice(0,m.index);if(before)frag.append(document.createTextNode(before));const span=document.createElement('span');span.className='stream-word-flash';span.textContent=m[1];frag.append(span);if(m[2])frag.append(document.createTextNode(m[2]));last.parentNode.replaceChild(frag,last)}
function updateChatStream(jobId,text){
  stopThinkingTicker(jobId);
  const idx=findHistoryByJob(jobId),ui=jobUi.get(jobId);if(idx<0)return;
  const target=String(text||'');const meta=metaObject(history[idx]);meta.stream_text=target;history[idx].meta=JSON.stringify(meta);
  if(ui?.kind==='chat'){
    let bubble=ui.bubble;
    if(!bubble){ui.card.style.display='none';bubble=document.createElement('div');bubble.className='bubble ai streaming-chat';ui.bubble=bubble;ui.streamRendered='';ui.streamTarget='';ui.streamTimer=null;ui.row.appendChild(bubble)}
    ui.streamTarget=target;
    if(!ui.streamTimer){
      const tick=()=>{const current=String(ui.streamRendered||'');const goal=String(ui.streamTarget||'');if(current.length<goal.length){const remainder=goal.slice(current.length);const wordMatch=remainder.match(/^\S+\s*/);const step=Math.max(1,Math.min(remainder.length,wordMatch?wordMatch[0].length:6));ui.streamRendered=goal.slice(0,current.length+step);renderStreamingBubble(ui,ui.streamRendered);ui.streamTimer=requestAnimationFrame(tick)}else{ui.streamTimer=null;if(goal!==current)tick()}};ui.streamTimer=requestAnimationFrame(tick);
    }
  }
}
function showStoppedForJob(jobId,partial=''){
  const ui=jobUi.get(jobId);const idx=findHistoryByJob(jobId);if(idx<0)return;
  const m=history[idx],meta=metaObject(m);const text=String(partial||meta.stream_text||m.content||'');meta.status='cancelled';meta.stream_text=text;meta.stopped_by_user=true;m.meta=JSON.stringify(meta);m.role='assistant';
  if(meta.kind==='chat_generation' || meta.kind==='chat'){
    if(ui?.kind==='chat'){
      if(text && ui.streamTarget!==text){ui.streamTarget=text;renderStreamingBubble(ui,text);ui.streamRendered=text;if(ui.streamTimer){cancelAnimationFrame(ui.streamTimer);ui.streamTimer=null}}
      if(!ui.bubble){ui.card.style.display='none';ui.bubble=document.createElement('div');ui.bubble.className='bubble ai';ui.row.appendChild(ui.bubble);if(text){applyMessageDirection(ui.bubble,text);renderCopyAware(text,ui.bubble,false)}}
      ui.bubble.classList.remove('streaming-chat');
      if(!ui.bubble.querySelector('.generation-stopped-note'))ui.bubble.appendChild(stoppedNoticeNode());
      stopThinkingTicker(jobId);
    }
    m.content=text;
  }else if(ui?.row?.isConnected){
    stopThinkingTicker(jobId);ui.card?.remove();ui.row.appendChild(stoppedNoticeNode());
  }
  saveCurrentChat();
}

function updateChatReasoning(jobId,summary){const ui=jobUi.get(jobId);if(!ui||ui.kind!=='chat')return;let el=ui.reasoning;if(!el){el=document.createElement('div');el.className='chat-reasoning-summary';ui.reasoning=el}el.textContent=String(summary||'');if(ui.bubble?.isConnected)ui.row.insertBefore(el,ui.bubble);else ui.row.appendChild(el)}
function renderStreamingBubble(ui,value){const bubble=ui?.bubble;if(!bubble)return;applyMessageDirection(bubble,value);renderCopyAware(value,bubble,false);bubble.querySelectorAll('.ai-actions').forEach(x=>x.remove());animateLastStreamWord(bubble);bindCodeCopy(bubble);if(activeCodeViewer){const blocks=bubble.querySelectorAll('.code-card');const last=blocks[blocks.length-1];if(last){const code=last.querySelector('code')?.textContent||'';activeCodeViewer.code=code;$('codeViewerCode').textContent=code}}}
function updateChatThinkingStatus(jobId,label){const ui=jobUi.get(jobId);if(!ui||ui.kind!=='chat')return;ui.title.textContent=String(label||'Thinking…');ui.title.classList.toggle('reading-card',String(label||'').toLowerCase().includes('memory')||String(label||'').toLowerCase().includes('previous chats'));}
async function applyAssistantControl(control){
  const c=(control&&typeof control==='object')?control:{};
  try{
    if(c.action==='username_changed'&&c.username){
      currentUser=String(c.username);
      const el=$('currentUser');if(el)el.textContent='@'+currentUser+(currentRole==='developer'?' · developer':'');
      await loadChatList();
    }
    if(['settings_changed','username_changed','password_changed'].includes(c.action)) await loadSettings();
    if(['user_deleted','user_password_reset'].includes(c.action)&&currentRole==='developer') await loadDeveloperOverview();
  }catch(err){console.warn('Control UI refresh failed',err)}
}

async function pollJob(jobId,foreground=false){sessionStorage.setItem('atlas_active_job_id',jobId);
  if(!jobId||jobCompleted.has(jobId)||jobPollInFlight.has(jobId))return null;
  jobPollInFlight.add(jobId);
  try{
    const r=await fetch('/api/jobs/status?job_id='+encodeURIComponent(jobId),{cache:'no-store'});const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Job status failed.');
    if(d.status==='completed'){sessionStorage.removeItem('atlas_active_job_id');
      jobCompleted.add(jobId);const result=d.result||{};if(currentJobId===jobId)busy(false);
      if(result.control)await applyAssistantControl(result.control);
      if(result.control?.action==='developer_read') {
        // Privileged reads are already completed server-side; never send them back through the model.
      }
      if(String(result.chat_id||'')===String(currentChatId||'')){if(setGenerationEntry(jobId,result)<0&&result.kind)history.push(newMessage('assistant',result.kind==='chat'?String(result.text||''):'',{...result,status:'completed',job_id:jobId}));renderHistory();await saveCurrentChat();await loadChatList()}
      finishChatGeneration(jobId,true);removeResumeJob(jobId);
      try{await fetch('/api/jobs/ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_id:jobId})})}catch{}
      return d
    }
    if(d.status==='cancelled'){sessionStorage.removeItem('atlas_active_job_id');
      if(currentJobId===jobId)busy(false);
      const idx=findHistoryByJob(jobId);
      if(idx>=0){
        const m=history[idx],meta=metaObject(m);meta.status='cancelled';meta.stream_text=String(d.stream_text||meta.stream_text||'');m.meta=JSON.stringify(meta);
        if(meta.kind==='chat_generation' || meta.kind==='chat')m.content=String(d.stream_text||m.content||'');
        await saveCurrentChat();
      }
      showStoppedForJob(jobId,String(d.stream_text||''));
      activeJobIds.delete(jobId);const pendingTimer=jobPollers.get(jobId);if(pendingTimer)clearTimeout(pendingTimer);jobPollers.delete(jobId);stopThinkingTicker(jobId);jobCompleted.add(jobId);if(foreground)status.textContent='';
      try{await fetch('/api/jobs/ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_id:jobId})})}catch{}
      return d
    }
    if(d.status==='failed'){sessionStorage.removeItem('atlas_active_job_id');
      if(currentJobId===jobId)busy(false);const idx=findHistoryByJob(jobId);if(idx>=0){const m=history[idx],meta=metaObject(m);m.role='assistant';m.content='';Object.assign(meta,{status:'failed',error:String(d.error||'Generation failed.'),kind:meta.kind||d.kind||'chat_generation',job_id:jobId});m.meta=JSON.stringify(meta);renderHistory();await saveCurrentChat()}
      finishChatGeneration(jobId,false);removeResumeJob(jobId);jobCompleted.add(jobId);if(foreground)status.textContent='Generation failed.';
      try{await fetch('/api/jobs/ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_id:jobId})})}catch{}return d
    }
    if(d.kind==='chat'){
      if(d.status==='queued'){stopThinkingTicker(jobId);updateChatThinkingStatus(jobId,d.message||'Queued…');}
      else if(d.stream_text){ updateChatStream(jobId,d.stream_text); }
      if(d.reasoning_summary)updateChatReasoning(jobId,d.reasoning_summary);
      if(!d.stream_text){
        const msg=String(d.message||'Thinking…'); const ui=jobUi.get(jobId);
        if(ui?.kind==='chat' && /Searching|Reading result|Search results received|I could not read the search results|checking the sources/i.test(msg)){
          ui.title.textContent='Searching…'; ui.title.classList.add('reading-card'); ui.meta.textContent=msg;
        } else updateChatThinkingStatus(jobId,msg);
      }
    } else if(foreground)updateChatGeneration(jobId,d.message||'Generating…',d.progress==null?null:d.progress,d.status,d.kind);
    addResumeJob(d);
    jobPollers.set(jobId,setTimeout(()=>pollJob(jobId,foreground),foreground?(d.kind==='chat'?90:300):1400));return d
  }catch(e){if(foreground&&e.name!=='AbortError')status.textContent='Reconnecting…';jobPollers.set(jobId,setTimeout(()=>pollJob(jobId,foreground),800));return {status:'retrying',kind:'video',job_id:jobId}}
  finally{jobPollInFlight.delete(jobId)}
}
async function refreshBackgroundJobs(){try{const r=await fetch('/api/jobs');if(!r.ok)return;const d=await r.json();(d.jobs||[]).filter(j=>j.status==='queued'||j.status==='running').forEach(j=>{addResumeJob(j);if(!jobPollInFlight.has(j.job_id))pollJob(j.job_id,false)})}catch{}}

function getVideoDimensions(){const ratio=videoRatio;let rw,rh;if(ratio==='original'&&selectedImages[0]?.width){rw=selectedImages[0].width;rh=selectedImages[0].height}else{[rw,rh]=String(ratio).split(':').map(Number)}const maxEdge=1152,unit=maxEdge/Math.max(rw||1,rh||1);return{width:Math.max(16,Math.round((rw||1)*unit/16)*16),height:Math.max(16,Math.round((rh||1)*unit/16)*16)}}

function syncEnhanceSwitch(kind,enabled,forced=false){
  const k=String(kind||'').toLowerCase();const btn=$(k==='image'?'imageEnhanceBtn':'videoEnhanceBtn');if(!btn)return;
  const on=!!enabled;btn.classList.toggle('on',on);btn.setAttribute('aria-checked',String(on));const state=btn.querySelector('.enhance-switch-state');if(state)state.textContent=on?'On':'Off';
  if(forced){btn.classList.add('forced');btn.title='Atlas 2.5 Flash enhancement is recommended for this video model.';}else btn.title=on?'Enhancement enabled':'Enhancement disabled';
}
async function toggleEnhance(kind){
  const k=String(kind||'').toLowerCase();
  if(k==='video' && String(activeModels?.video||'')==='agnes-video-2.5-flash'){}
  if(k==='image'){imageEnhanceEnabled=!imageEnhanceEnabled;syncEnhanceSwitch('image',imageEnhanceEnabled);return}
  videoEnhanceEnabled=!videoEnhanceEnabled;syncEnhanceSwitch('video',videoEnhanceEnabled);
}
async function enhancePromptWithAtlas(kind,source){
  const k=String(kind||'').toLowerCase();const prompt=String(source||'').trim();
  if(!prompt)throw new Error(k==='video'?'Describe the video you want.':'Describe the image you want.');
  const referenceCount=k==='video'?selectedImages.length:0;
  const r=await fetch('/api/prompt/enhance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,kind:k,seconds:k==='video'?(Number(videoDuration)||5):undefined,ratio:k==='video'?videoRatio:imageRatio,quality:k==='video'?videoQuality:imageQuality,reference_count:referenceCount})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Could not enhance prompt with Atlas 2.5 Flash.');return String(d.prompt||prompt).trim();
}
async function enhanceCurrentPrompt(kind){
  const k=String(kind||'').toLowerCase();if(!['image','video'].includes(k))return;
  const source=String(textBox.value||'').trim();if(!source){status.textContent='Write a prompt first.';textBox.focus();return}
  const btn=$(k==='image'?'imageEnhanceBtn':'videoEnhanceBtn');if(btn){btn.disabled=true;const state=btn.querySelector('.enhance-switch-state');if(state)state.textContent='…'}
  try{const enhanced=await enhancePromptWithAtlas(k,source);textBox.value=enhanced;resize();status.textContent='Prompt enhanced by Atlas 2.5 Flash.';setTimeout(()=>{if(status.textContent==='Prompt enhanced by Atlas 2.5 Flash.')status.textContent=''},1800)}catch(e){status.textContent=e.message||'Prompt enhancement failed.';setTimeout(()=>{if(status.textContent===e.message)status.textContent=''},2400)}
  finally{if(btn){btn.disabled=false;syncEnhanceSwitch(k,k==='image'?imageEnhanceEnabled:videoEnhanceEnabled,false)}}
}

async function generateImage(text){
  if(!(await ensureCurrentChat()))throw new Error('Could not start a new chat.');
  let finalText=String(text||'').trim();
  if(imageEnhanceEnabled){status.textContent='Enhancing image prompt with Atlas 2.5 Flash…';finalText=await enhancePromptWithAtlas('image',finalText)}
  const refs=[...selectedImages.slice(0,4),...imageReferenceImages.slice(0,5)];
  try{
    const savedRefs=refs.length?await persistAttachments(refs):[];if(currentController?.signal.aborted)throw new DOMException('Aborted','AbortError');
  const createdAt=Date.now()/1000;const userEntry=newMessage('user',finalText,{kind:'image',quality:imageQuality,ratio:imageRatio,attachments:savedRefs,created_at:createdAt});history.push(userEntry);addUser(finalText,userEntry.meta,refs,history.length-1);await saveCurrentChat();textBox.value='';resize();
  const clientGenerationId='client_image_'+Date.now();
  const pending=addChatGeneration('image',clientGenerationId,'Generating image…');
  currentJobId=clientGenerationId;pending.card.dataset.jobId=clientGenerationId;
  jobUi.set(clientGenerationId,{row:pending.row,card:pending.card,fill:pending.fill,pct:pending.pct,meta:pending.meta,title:pending.title,kind:'image'});
  history.push({id:'g_'+clientGenerationId,created_at:createdAt+0.001,role:'assistant',content:'',meta:JSON.stringify({kind:'image',status:'pending',job_id:clientGenerationId,created_at:createdAt+0.001,quality:imageQuality,ratio:imageRatio,attachments:savedRefs})});
  await saveCurrentChat();
  const dataRefs=[];for(const a of refs){dataRefs.push(await resolveImageData(a.data||a.url||''))}
  const r=await fetch('/api/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:finalText,images:dataRefs,chat_id:currentChatId,...imagePayload(),created_at:createdAt,role:currentRole}),signal:currentController.signal});
  const data=await r.json().catch(()=>({}));if(!r.ok||!data.job_id)throw new Error(data.error||'Atlas did not return an image job.');
  if(data.message){pending.title.textContent=String(data.message);pending.meta.textContent=String(data.message)}
  // Convert the immediate client placeholder into the stable server job id.
  const previousClientJobId=pending.card.dataset.jobId;const ui=jobUi.get(previousClientJobId);if(ui)jobUi.delete(previousClientJobId);
  pending.card.dataset.jobId=data.job_id;currentJobId=data.job_id;jobUi.set(data.job_id,{row:pending.row,card:pending.card,fill:pending.fill,pct:pending.pct,meta:pending.meta,title:pending.title,kind:'image'});
  const imageGenerationIndex=history.findIndex(m=>String(metaObject(m).job_id||'')===String(previousClientJobId));
  if(imageGenerationIndex>=0){const gm=history[imageGenerationIndex],gmeta=metaObject(gm);gmeta.job_id=data.job_id;gmeta.status='pending';gm.meta=JSON.stringify(gmeta);}
  addResumeJob(data);await saveCurrentChat();
  let result;while(true){result=await pollJob(data.job_id,true);if(!result||['completed','cancelled','failed'].includes(result.status))break;if(currentController?.signal.aborted)throw new DOMException('Aborted','AbortError')}
  if(result?.status==='failed')throw new Error(result.error||'Image generation failed.');if(result?.status==='cancelled')return;selectedImages=[];imageReferenceImages=[];renderRefs();
  }catch(e){const ui=[...jobUi.values()].find(x=>x.card?.dataset?.jobId&&x.kind==='image');if(ui?.row?.isConnected)ui.row.remove();throw e}
}

async function generateVideo(text){
  if(!(await ensureCurrentChat()))throw new Error('Could not start a new chat.');
  if(currentController?.signal.aborted)throw new DOMException('Aborted','AbortError');
  const dev=currentRole==='developer';
  const is25=String(activeModels?.video||'agnes-video-v2.0')==='agnes-video-2.5-flash';
  if(selectedImages.length>1)throw new Error('Video generation accepts at most one image from +.');
  const sourcePrompt=String(text||'').trim();if(!sourcePrompt)throw new Error('Video prompt cannot be empty.');
  const shouldEnhance=!!videoEnhanceEnabled;
  const createdAt=Date.now()/1000;
  if(dev){videoFrames=Math.max(VIDEO_FRAMES_MIN,Math.min(VIDEO_FRAMES_MAX,Number(videoFrames)||121));videoFps=Math.max(VIDEO_FPS_MIN,Math.min(VIDEO_FPS_MAX,Number(videoFps)||VIDEO_DEFAULT_FPS));videoSteps=Math.max(2,Math.min(100,Number(videoSteps)||Number(generationDefaults.video_steps)||40))}
  else if(is25){const chosen=Number(videoDuration)||5;if(chosen<4||chosen>12)throw new Error('Atlas 2.5 Pro supports 4–12 seconds.');videoFps=30;videoFrames=VIDEO_NORMAL_USER_FRAMES[chosen]||framesForDuration(chosen,videoFps);videoSteps=100}
  else{const chosen=Number(videoDuration)||5;if(!VIDEO_NORMAL_USER_FPS[chosen])throw new Error('Atlas 2.0 supports 5 to 15 seconds.');videoFps=VIDEO_NORMAL_USER_FPS[chosen];videoFrames=VIDEO_NORMAL_USER_FRAMES[chosen]||framesForDuration(chosen,videoFps);videoSteps=100}
  const seconds=is25?(Number(videoDuration)||5):(videoFrames-1)/videoFps;
  let pending=null;
  try{
    const savedSourceRefs=selectedImages.length?await persistAttachments(selectedImages):[];
    const savedVideoRefs=videoReferenceImages.length?await persistAttachments(videoReferenceImages):[];
    const attachments=[...savedSourceRefs,...savedVideoRefs];
    const userMeta={kind:'video',model:activeModels?.video,enhanced:shouldEnhance,frames:videoFrames,fps:videoFps,seconds,videoDuration:Number(videoDuration)||5,quality:videoQuality,ratio:videoRatio,attachments:[...savedSourceRefs.map(x=>({...x,kind:'image-to-video'})),...savedVideoRefs.map(x=>({...x,kind:'video-reference'}))],created_at:createdAt};
    const userEntry=newMessage('user',sourcePrompt,userMeta);history.push(userEntry);addUser(sourcePrompt,JSON.stringify(userMeta),[...selectedImages.slice().map(x=>({...x,attachment_kind:'image-to-video'})),...videoReferenceImages.slice().map(x=>({...x,attachment_kind:'video-reference'}))],history.length-1);await saveCurrentChat();textBox.value='';resize();
    const clientGenerationId='client_video_'+Date.now();
    pending=addVideoPending({frames:videoFrames,fps:videoFps,seconds,width:null,height:null});
    pending.card.dataset.jobId=clientGenerationId;currentJobId=clientGenerationId;
    jobUi.set(clientGenerationId,{row:pending.row,card:pending.card,fill:pending.fill,pct:pending.pct,meta:pending.sub,title:pending.title,kind:'video'});
    history.push({id:'g_'+clientGenerationId,created_at:createdAt+0.001,role:'assistant',content:'',meta:JSON.stringify({kind:'video',status:'pending',job_id:clientGenerationId,created_at:createdAt+0.001,model:activeModels.video,enhanced:shouldEnhance,frames:videoFrames,fps:videoFps,seconds,quality:videoQuality,ratio:videoRatio,attachments})});
    await saveCurrentChat();
    pending.title.textContent=shouldEnhance?'Enhancing prompt…':'Generating video…';pending.pct.textContent='1%';pending.fill.style.width='1%';pending.sub.textContent=shouldEnhance?'Enhancing prompt…':'Starting video generation…';
    let finalPrompt=sourcePrompt;
    if(shouldEnhance){videoEnhanceBusy=true;try{finalPrompt=await enhancePromptWithAtlas('video',sourcePrompt)}finally{videoEnhanceBusy=false}if(pending?.title?.isConnected){pending.title.textContent='Generating video…';pending.sub.textContent='Enhanced prompt ready. Generating…'}}
    const sourceImage=savedSourceRefs[0]?.url||'';const referenceUrls=savedVideoRefs.map(x=>x.url).filter(Boolean);
    const imageData=selectedImages[0]?.data?await resolveImageData(selectedImages[0].data):'';
    const body={prompt:finalPrompt,prompt_enhanced:shouldEnhance,model:activeModels.video||'agnes-video-v2.0',frames:videoFrames,fps:videoFps,seconds:dev?undefined:videoDuration,quality:videoQuality,ratio:videoRatio,steps:videoSteps,source_width:selectedImages[0]?.width||0,source_height:selectedImages[0]?.height||0,chat_id:currentChatId,created_at:createdAt,role:currentRole,public_scheme:window.location.protocol==='https:'?'https':'http',public_host:window.location.host,image_refs:referenceUrls};
    if(is25){if(sourceImage)body.image=sourceImage}else if(imageData)body.image=imageData;
    const r=await fetch('/api/video',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:currentController.signal});
    const data=await r.json().catch(()=>({}));if(!r.ok||!data.job_id)throw new Error(data.error||'Atlas did not return a video job.');
    if(data.message){pending.title.textContent=String(data.message);pending.sub.textContent=String(data.message)}
    const previousClientJobId=pending.card.dataset.jobId;const ui=jobUi.get(previousClientJobId);if(ui)jobUi.delete(previousClientJobId);
    pending.card.dataset.jobId=data.job_id;currentJobId=data.job_id;jobUi.set(data.job_id,{row:pending.row,card:pending.card,fill:pending.fill,pct:pending.pct,meta:pending.sub,title:pending.title,kind:'video'});
    const videoGenerationIndex=history.findIndex(m=>String(metaObject(m).job_id||'')===String(previousClientJobId));
    if(videoGenerationIndex>=0){const gm=history[videoGenerationIndex],gmeta=metaObject(gm);gmeta.job_id=data.job_id;gmeta.status='pending';gmeta.steps=videoSteps;gm.meta=JSON.stringify(gmeta);}
    addResumeJob(data);await saveCurrentChat();let result;while(true){result=await pollJob(data.job_id,true);if(!result)continue;if(['completed','cancelled','failed'].includes(result.status))break;if(currentController?.signal.aborted)throw new DOMException('Aborted','AbortError')}
    if(result?.status==='failed')throw new Error(result.error||'Video generation failed.');if(result?.status==='cancelled')return;selectedImages=[];videoReferenceImages=[];renderRefs();status.textContent='';
  }catch(e){if(pending?.row?.isConnected)pending.row.remove();throw e}
}

async function generateAudio(){
  if(!(await ensureCurrentChat()))throw new Error('Could not start a new chat.');
  if(currentController?.signal.aborted)throw new DOMException('Aborted','AbortError');
  const sourcePrompt=String(textBox.value||'').trim();
  let lyrics=String($('audioLyricsBox')?.value||'').trim();
  const duration=Math.max(10,Math.min(600,Math.round(Number(audioDuration)||30)));
  if(!sourcePrompt){status.textContent='Describe the track you want.';return}
  const createdAt=Date.now()/1000;
  if(editingIndex!==null){history=history.slice(0,editingIndex);editingIndex=null;clearEditing();renderHistory()}

  // Put the user's exact prompt into the chat immediately. Planning happens after this.
  const userMeta={kind:'audio',prompt:sourcePrompt,lyrics,duration,infer_steps:Math.max(1,Math.min(200,Number(audioSteps)||120)),instrumental:audioInstrumental,thinking:audioThinking,created_at:createdAt};
  history.push(newMessage('user',sourcePrompt,userMeta));
  addUser(sourcePrompt,JSON.stringify(userMeta),[],history.length-1);
  await saveCurrentChat();
  textBox.value='';resize();

  const clientGenerationId='client_audio_'+Date.now();
  const planningMode=audioThinking&&!audioInstrumental&&!lyrics;
  const pending=addChatGeneration('audio',clientGenerationId,planningMode?'Enhancing…':'Creating audio…');
  pending.meta.textContent=planningMode?'Enhancing audio prompt…':formatAudioDuration(duration)+(audioThinking?' • Planning pass':' • Direct pass');
  pending.fill.classList.toggle('indeterminate',planningMode);
  pending.fill.style.width=planningMode?'38%':'0%';pending.pct.textContent='';
  currentJobId=clientGenerationId;pending.card.dataset.jobId=clientGenerationId;
  jobUi.set(clientGenerationId,{row:pending.row,card:pending.card,fill:pending.fill,pct:pending.pct,meta:pending.meta,title:pending.title,kind:'audio',progressValue:0});
  history.push({id:'g_'+clientGenerationId,created_at:createdAt+0.001,role:'assistant',content:'',meta:JSON.stringify({kind:'audio',status:'pending',job_id:clientGenerationId,created_at:createdAt+0.001})});
  await saveCurrentChat();

  let finalPrompt=sourcePrompt;
  try{
    if(planningMode){
      pending.title.textContent='Enhancing…';
      pending.meta.textContent='Enhancing audio prompt…';
      pending.fill.classList.add('indeterminate');pending.fill.style.width='38%';pending.pct.textContent='';
      const planningPrompt=`Enhance this audio-generation request for Atlas. The final audio must be exactly ${formatAudioDuration(duration)} long. Write polished lyrics for the track that fit the requested duration. Return an improved music-generation prompt and lyrics. Do not mention any platform, provider, API, or model name. User request: ${sourcePrompt}`;
      const r=await fetch('/api/audio/planning-pass',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:planningPrompt,duration,track_duration:duration,instruction:`Enhance the user's request for an Atlas audio track exactly ${formatAudioDuration(duration)} long. Write suitable lyrics unless the request clearly calls for instrumental audio. Return an improved prompt and lyrics. Do not mention provider names.`}),signal:currentController?.signal});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Audio planning pass failed.');
      finalPrompt=String(d.prompt||sourcePrompt).trim();lyrics=String(d.lyrics||'').trim();
      if($('audioLyricsBox'))$('audioLyricsBox').value=lyrics;
      pending.title.textContent='Generating audio…';pending.meta.textContent=formatAudioDuration(duration)+' • Planning pass';pending.fill.classList.remove('indeterminate');pending.fill.style.width='0%';
      // Keep the original user message visible; save the enhanced prompt only as metadata.
      const idx=history.findIndex(m=>String(metaObject(m).job_id||'')===String(clientGenerationId));
      const userIdx=[...history.keys()].reverse().find(i=>history[i]?.role==='user'&&metaObject(history[i]).kind==='audio');
      if(userIdx>=0){const um=metaObject(history[userIdx]);um.enhanced_prompt=finalPrompt;um.lyrics=lyrics;history[userIdx].meta=JSON.stringify(um)}
      await saveCurrentChat();
    }

    const body={prompt:finalPrompt,lyrics,duration,infer_steps:Math.max(1,Math.min(200,Number(audioSteps)||120)),instrumental:audioInstrumental,thinking:audioThinking,batch_size:1,chat_id:currentChatId,created_at:createdAt};
    const r=await fetch('/api/audio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:currentController?.signal});
    const d=await r.json().catch(()=>({}));if(!r.ok||!d.job_id)throw new Error(d.error||'Atlas did not return an audio job.');
    if(d.message){pending.title.textContent=cleanGenerationText(d.status==='running'?'Generating audio…':d.message,'Generating audio…');pending.meta.textContent=cleanGenerationText(d.message,'Generating audio…')}
    const previousClientJobId=pending.card.dataset.jobId;jobUi.delete(previousClientJobId);
    const pendingIndex=history.findIndex(m=>String(metaObject(m).job_id||'')===String(previousClientJobId));
    if(pendingIndex>=0){const m=history[pendingIndex],meta=metaObject(m);meta.job_id=d.job_id;meta.status='pending';m.meta=JSON.stringify(meta)}
    currentJobId=d.job_id;pending.card.dataset.jobId=d.job_id;jobUi.set(d.job_id,{row:pending.row,card:pending.card,fill:pending.fill,pct:pending.pct,meta:pending.meta,title:pending.title,kind:'audio',progressValue:0});addResumeJob(d);await saveCurrentChat();
    let result;while(true){result=await pollJob(d.job_id,true);if(result&&['completed','cancelled','failed'].includes(result.status))break;await new Promise(res=>setTimeout(res,120))}
    if(result?.status==='failed')throw new Error(result.error||'Audio generation failed.');if(result?.status==='cancelled')return;
  }catch(e){
    const failedIndex=[...history.keys()].reverse().find(i=>{const m=history[i],meta=metaObject(m);return meta.kind==='audio'&&meta.status==='pending'});
    if(failedIndex>=0){const m=history[failedIndex],meta=metaObject(m);meta.status='failed';meta.error=String(e.message||e);m.meta=JSON.stringify(meta);await saveCurrentChat();}
    throw e;
  }finally{if(currentJobId&&jobCompleted.has(currentJobId)){}else if(pending.row?.isConnected)pending.row.remove();if(currentJobId&&!jobCompleted.has(currentJobId))jobUi.delete(currentJobId||'')}
}

async function openStudio(){if(currentRole!=='developer')return;closeMenus();$('studioLayer').classList.add('show');$('studioLayer').setAttribute('aria-hidden','false');setStudioPanel('automation');await loadAutomationTasks()}
function closeStudio(){closeAutomationModal();$('studioLayer').classList.remove('show');$('studioLayer').setAttribute('aria-hidden','true')}

async function downscaleDataUrl(data,maxEdge=1280,quality=.78){let src=String(data||'');try{if(src.startsWith('/media/')){const r=await fetch(src,{credentials:'same-origin',cache:'force-cache'});if(r.ok){const blob=await r.blob();src=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result||''));fr.onerror=()=>res(String(data||''));fr.readAsDataURL(blob)})}}}catch{}if(!src.startsWith('data:image/'))return src;return await new Promise(resolve=>{const img=new Image();img.onload=()=>{const w=img.naturalWidth,h=img.naturalHeight,scale=Math.min(1,maxEdge/Math.max(w,h));if(!w||!h||scale>=.999){resolve(src);return}const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',quality))};img.onerror=()=>resolve(src);img.src=src})}
async function prepareMessagesForModel(source){
  const out=[];const users=source.map((m,i)=>m?.role==='user'?i:-1).filter(i=>i>=0);const attachmentUsers=new Set(users.slice(-2));
  for(let i=0;i<source.length;i++){const m=source[i];if(isGenerationEntry(m))continue;const clone={role:m.role};const content=Array.isArray(m.content)?m.content:[{type:'text',text:String(m.content??'')}];const parts=[];
    for(const p of content){if(!p||typeof p!=='object')continue;const typ=String(p.type||'').toLowerCase();
      if(!attachmentUsers.has(i)&&['image_url','video_url','audio_url','input_audio','file'].includes(typ))continue;
      if(!attachmentUsers.has(i)&&typ==='text'){const cleaned=String(p.text||'').replace(/\n?\[Attached file:[\s\S]*?(?=\n\[Attached file:|$)/ig,'').trim();if(cleaned)parts.push({type:'text',text:cleaned});continue}
      if(typ==='image_url')parts.push({...p,image_url:{...(p.image_url||{}),url:await downscaleDataUrl(p.image_url?.url||'')}});else parts.push(p);
    }
    if(!parts.length)continue;clone.content=(Array.isArray(m.content)||parts.length>1)?parts:(parts[0]?.text||'');out.push(clone);
  }
  return out;
}
function startThinkingTicker(jobId,imageMode){stopThinkingTicker(jobId);const phrases=imageMode?['Inspecting image pixels…','Reading the image…','Examining visual details…','Checking shapes and colors…','Understanding the image…','Looking for important details…','Studying the composition…','Interpreting what I see…']:['Thinking…','Reading your message…','Working it out…','Connecting the details…','Checking the context…','Writing a clear answer…','Putting it together…','Almost there…'];let i=0;updateChatThinkingStatus(jobId,phrases[0]);const timer=setInterval(()=>{i=(i+1)%phrases.length;updateChatThinkingStatus(jobId,phrases[i])},5000);const ui=jobUi.get(jobId);if(ui)ui.thinkingTimer=timer}
function stopThinkingTicker(jobId){const ui=jobUi.get(jobId);if(ui?.thinkingTimer){clearInterval(ui.thinkingTimer);ui.thinkingTimer=null}}

async function requestAssistant(options={}){
  const ownsController=!currentController;busy(true);if(ownsController)currentController=new AbortController();
  const optimisticId='client_chat_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  let optimisticUi=null;
  try{
    optimisticUi=addChatGeneration('chat',optimisticId,'Thinking…',-1);
    startThinkingTicker(optimisticId,false);
    const normalized=await prepareMessagesForModel(history);
    const createdAt=Date.now()/1000;const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:normalized,chat_id:currentChatId,created_at:createdAt,deep_search:!!options.deep_search,think_mode:!!options.think_mode}),signal:currentController.signal});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Chat request failed.');
    if(data.job_id){
      currentJobId=data.job_id;
      if(optimisticUi){const timer=optimisticUi.thinkingTimer;stopThinkingTicker(optimisticId);optimisticUi.row.dataset.jobId=data.job_id;optimisticUi.card.dataset.jobId=data.job_id;jobUi.delete(optimisticId);jobUi.set(data.job_id,{...optimisticUi,kind:'chat',thinkingTimer:timer});startThinkingTicker(data.job_id,false)}
      updateChatGeneration(data.job_id,/search/i.test(String(data.message||''))?'Searching…':(data.status==='queued'?(data.message||'Queued…'):'Thinking…'),0,data.status||'running','chat');if(!!(options.think_mode)){updateChatReasoning(data.job_id,'Thinking harder — checking assumptions and looking for better answers.')}history.push({id:'g_'+data.job_id,created_at:createdAt+0.001,role:'assistant',content:'',meta:JSON.stringify({kind:'chat_generation',status:'pending',job_id:data.job_id,created_at:createdAt+0.001})});addResumeJob(data);await saveCurrentChat();
      let result;while(true){result=await pollJob(data.job_id,true);if(!result||['completed','cancelled','failed'].includes(result.status))break;if(currentController?.signal.aborted)throw new DOMException('Aborted','AbortError')}
      if(result?.status==='failed')throw new Error(result.error||'Chat generation failed.');if(result?.status==='cancelled')return;
    }else if(data.text){
      if(data.command&&data.action?.type==='theme'){
        const th=data.action.theme||{};
        settingsData=settingsData||{};settingsData.theme={...(settingsData.theme||{}),...th};
        applyTheme(th.mode||settingsData.theme.mode||'black',th.accent||settingsData.theme.accent||'#007aff',!!(th.bold_font??settingsData.theme.bold_font));
        localStorage.setItem('atlas_theme',JSON.stringify({mode:settingsData.theme.mode,accent:settingsData.theme.accent,bold_font:!!settingsData.theme.bold_font}));
      }
      if(data.command&&data.action?.type==='username'){
        currentUser=String(data.action.username||currentUser);
        const userEl=$('currentUser'); if(userEl)userEl.textContent='@'+currentUser+(currentRole==='developer'?' · developer':'');
        await loadChatList();
      }
      history.push(newMessage('assistant',data.text,{kind:'chat',status:'completed',command:!!data.command}));
      renderHistory();await saveCurrentChat();await maybeUpdateChatTitle();
    }
  }catch(e){if(optimisticUi && jobUi.has(optimisticId)){stopThinkingTicker(optimisticId);optimisticUi.row?.remove?.();jobUi.delete(optimisticId)}if(e.name!=='AbortError')addError(String(e.message||'Chat generation failed.'));else if(e.name==='AbortError'){}}
  finally{if(ownsController){currentController=null;currentJobId=null;busy(false)}}
}

function maybeRouteInlineGeneration(text){return null;}
/* legacy inline-generation detector intentionally disabled; creation requires explicit Image/Video mode.
  if(mediaMode||selectedImages.length)return null;
  const intent=detectInlineGeneration(text);
  if(!intent)return null;
  if(intent.kind==='video'){videoDuration=VIDEO_NORMAL_USER_FPS[Number(intent.duration)]?Number(intent.duration):5;if(intent.ratio)videoRatio=intent.ratio;videoFps=VIDEO_NORMAL_USER_FPS[Number(videoDuration)]||VIDEO_DEFAULT_FPS;videoFrames=VIDEO_NORMAL_USER_FRAMES[Number(videoDuration)]||framesForDuration(videoDuration,videoFps);syncVideoSliders();setMode('video');}
  else{if(intent.ratio)imageRatio=intent.ratio;refreshRatioChoices();setMode('image');}
  return intent;
}
*/
let chatTitleInFlight=false;
async function maybeUpdateChatTitle(){
  if(!currentChatId)return;
  if(currentChatTitle && currentChatTitle!=='New chat')return;
  const firstUser=history.find(m=>m?.role==='user');
  const raw=messageText(firstUser?.content||'').trim();
  if(!raw)return;
  const title=raw.replace(/\s+/g,' ').split(' ').slice(0,3).join(' ').slice(0,80).trim();
  if(!title)return;
  currentChatTitle=title;
  try{await fetch('/api/chats/'+encodeURIComponent(currentChatId),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:currentChatTitle})});await loadChatList()}catch{}
}

async function sendMessage(){if(generationBusy)return;const text=textBox.value;const generationKind=mediaMode;busy(true);currentController=new AbortController();try{
  if(mediaMode==='audio'){closeGenerationSettings();await generateAudio();return}
  if(mediaMode==='image'){if(!text.trim()){status.textContent=selectedImages.length?'Describe the edit you want.':'Describe the image you want.';return}if(editingIndex!==null){history=history.slice(0,editingIndex);editingIndex=null;clearEditing();renderHistory()}closeGenerationSettings();await generateImage(text.trim());await maybeUpdateChatTitle();return}
  if(mediaMode==='video'){if(!text.trim()){status.textContent=selectedImages.length?'Describe how the image should move.':'Describe the video you want.';return}if(editingIndex!==null){history=history.slice(0,editingIndex);editingIndex=null;clearEditing();renderHistory()}closeGenerationSettings();await generateVideo(text.trim());await maybeUpdateChatTitle();return}
  if(!text.trim()&&!selectedImages.length&&!selectedFiles.length&&!selectedVideos.length&&!selectedAudios.length)return;
  if(!(await ensureCurrentChat()))return;
  const sentThink=!!thinkMode,sentDeep=!!deepSearchMode;
  const needsMultimodal=selectedImages.length||selectedVideos.length||selectedAudios.length;
  if((needsMultimodal||selectedFiles.length) && !isNvidiaVisionSelected()&&!isOpenRouterSelected()&&!isAtlasTextModelSelected()){
    addError('Image attachments require a vision-enabled chat model.');
    return;
  }
  const attachedImages=selectedImages.slice();
  if(editingIndex!==null){history=history.slice(0,editingIndex);editingIndex=null;clearEditing();renderHistory()}
  let savedAttachments=[];
  if(attachedImages.length){try{savedAttachments=await persistAttachments(attachedImages)}catch(e){addError('Upload error: '+e.message);return}}
  const content=[];const userText=text.trim()||'Please look at the attached media and tell me what you see.';content.push({type:'text',text:userText});
  for(let ai=0;ai<attachedImages.length;ai++){const it=attachedImages[ai];const saved=savedAttachments[ai];content.push({type:'image_url',image_url:{url:((isOpenRouterSelected()||isNvidiaVisionSelected())?(saved?.url||it.url||it.data):(await resolveImageData(it.data||it.url||'')))}})}
  for(const f of selectedFiles){if(f.extracted_text)content.push({type:'text',text:'[Attached file: '+String(f.name||'attachment')+'\n'+String(f.extracted_text).slice(0,120000)});else content.push({type:'text',text:'[Attached file: '+String(f.name||'attachment')+'\nNo local text extraction is available for this file type.]'})}
  for(const v of selectedVideos)content.push({type:'video_url',video_url:{url:v.url}});
  for(const a of selectedAudios)content.push({type:'audio_url',audio_url:{url:a.url}});
  const messageAttachments=[...savedAttachments.map(a=>({...a,kind:'image'})),...selectedFiles.map(f=>({...f,kind:'file'})),...selectedVideos.map(v=>({...v,kind:'video'})),...selectedAudios.map(a=>({...a,kind:'audio'}))];
  const meta={kind:'chat',attachments:messageAttachments,provider:isNvidiaVisionSelected()?'nvidia':(isOpenRouterSelected()?'openrouter':'atlas'),file_attachments:selectedFiles.slice(),deep_search:sentDeep,think_mode:sentThink};
  const userEntry=newMessage('user',content,meta);history.push(userEntry);addUser(text.trim(),userEntry.meta,attachedImages,history.length-1);textBox.value='';selectedImages=[];selectedFiles=[];selectedVideos=[];selectedAudios=[];pendingGeneratedImage=null;deepSearchMode=false;thinkMode=false;applyResearchGlow();closeMode();resize();await saveCurrentChat();
  if(currentController?.signal.aborted)throw new DOMException('Aborted','AbortError');
  await requestAssistant({think_mode:sentThink,deep_search:sentDeep});await maybeUpdateChatTitle();
}catch(e){if(e.name!=='AbortError')addError((generationKind==='image'?'Image':generationKind==='video'?'Video':generationKind==='audio'?'Audio':'Chat')+' error: '+e.message);else if(e.name==='AbortError'){}}finally{currentController=null;currentJobId=null;busy(false)}}
let sttRecorder=null,sttStream=null,sttChunks=[];
async function fallbackNvidiaServerSpeech(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Speech recognition is not supported by this browser.');
  sttStream=await navigator.mediaDevices.getUserMedia({audio:true});sttChunks=[];const preferred=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg','audio/wav'];const mime=preferred.find(x=>window.MediaRecorder.isTypeSupported?.(x))||'';
  sttRecorder=new MediaRecorder(sttStream,mime?{mimeType:mime}:undefined);sttRecorder.ondataavailable=e=>{if(e.data?.size)sttChunks.push(e.data)};sttRecorder.onstart=()=>{callBtn.classList.add('recording');status.textContent='Listening… Speak naturally in your language.'};
  sttRecorder.onstop=async()=>{const rec=sttRecorder;sttRecorder=null;sttStream?.getTracks().forEach(t=>t.stop());sttStream=null;callBtn.classList.remove('recording');try{const blob=new Blob(sttChunks,{type:rec?.mimeType||'audio/webm'});const audio=await blobToDataURL(blob);status.textContent='Transcribing audio…';const r=await fetch('/api/stt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio,language:'auto'})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Speech transcription failed.');const spoken=String(d.text||'').trim();if(spoken){const existing=textBox.value.trim();textBox.value=existing?(existing+' '+spoken):spoken;resize()}status.textContent=''}catch(e){status.textContent=e.message||'Speech transcription failed.';setTimeout(()=>status.textContent='',2500)}};
  sttRecorder.onerror=()=>{try{sttRecorder.stop()}catch{}};sttRecorder.start(250);
}
let browserSpeechRecognition=null;
let browserSpeechPrefix="";
let browserSpeechFinal="";
let browserSpeechInterim="";
function stopBrowserSpeech(){try{browserSpeechRecognition?.stop()}catch{}}
function startBrowserSpeech(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition)return false;
  browserSpeechPrefix=String(textBox.value||'').trim();browserSpeechFinal="";browserSpeechInterim="";
  browserSpeechRecognition=new Recognition();
  browserSpeechRecognition.continuous=true;browserSpeechRecognition.interimResults=true;browserSpeechRecognition.lang=navigator.language||'en-US';
  browserSpeechRecognition.onstart=()=>{callBtn.classList.add('recording');status.textContent='Listening… Speak naturally.'};
  browserSpeechRecognition.onresult=(e)=>{
    let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const transcript=String(e.results[i]?.[0]?.transcript||'');
      if(e.results[i].isFinal)browserSpeechFinal+=(browserSpeechFinal?' ':'')+transcript.trim();
      else interim+=transcript;
    }
    browserSpeechInterim=interim.trim();
    textBox.value=[browserSpeechPrefix,browserSpeechFinal,browserSpeechInterim].filter(Boolean).join(' ');
    resize();
  };
  browserSpeechRecognition.onerror=(e)=>{
    if(e?.error==='not-allowed'||e?.error==='service-not-allowed')status.textContent='Microphone permission was denied.';
    else if(e?.error==='no-speech')status.textContent='No speech detected.';
    else status.textContent='Speech recognition error. Try again.';
  };
  browserSpeechRecognition.onend=()=>{
    browserSpeechRecognition=null;browserSpeechInterim="";callBtn.classList.remove('recording');
    textBox.value=[browserSpeechPrefix,browserSpeechFinal].filter(Boolean).join(' ');resize();
    setTimeout(()=>{if(status.textContent.includes('Speech recognition')||status.textContent==='No speech detected.'||status.textContent==='Microphone permission was denied.')status.textContent=''},2200);
  };
  try{browserSpeechRecognition.start();return true}catch{browserSpeechRecognition=null;return false}
}
callBtn.onclick=async()=>{
  if(browserSpeechRecognition){stopBrowserSpeech();return}
  if(sttRecorder){try{sttRecorder.stop()}catch{};return}
  if(startBrowserSpeech())return;
  try{await fallbackNvidiaServerSpeech()}
  catch(e){
    sttRecorder=null;sttStream?.getTracks().forEach(t=>t.stop());sttStream=null;callBtn.classList.remove('recording');
    status.textContent=e.message||'Could not start microphone.';
  }
};

// ---------- Automation ----------
const AUTO_WEEKDAYS=[["Sun","0"],["Mon","1"],["Tue","2"],["Wed","3"],["Thu","4"],["Fri","5"],["Sat","6"]];
let automationEditingId=null,automationDestination='save',automationSteps=[];
let automationTasks=[],automationDays=[];
function formatAutomationTime(v){const raw=String(v||'09:00');const [hh,mm]=raw.split(':').map(Number);const d=new Date();d.setHours(Number.isFinite(hh)?hh:9,Number.isFinite(mm)?mm:0,0,0);return d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
function showAutomationNotice(message){const value=String(message||'');const statusEl=$('status');if(statusEl)statusEl.textContent=value;clearTimeout(window._automationNoticeTimer);window._automationNoticeTimer=setTimeout(()=>{const el=$('status');if(el&&el.textContent===value)el.textContent=''},1800);}
async function loadAutomationTasks(){try{const r=await fetch('/api/automation',{cache:'no-store',credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Could not load automation tasks.');automationTasks=Array.isArray(d.tasks)?d.tasks:[];renderAutomationTasks();return automationTasks}catch(e){showAutomationNotice(e.message||'Could not load automation tasks.');automationTasks=[];renderAutomationTasks();return []}}
function renderAutomationDays(){const box=$('automationCustomDays');if(!box)return;const chosen=automationDays||[];box.innerHTML=AUTO_WEEKDAYS.map(([label,val])=>`<button type="button" class="automation-day ${chosen.includes(val)?'active':''}" data-auto-day="${val}">${label}</button>`).join('');box.querySelectorAll('[data-auto-day]').forEach(b=>b.onclick=()=>{const v=b.dataset.autoDay;automationDays=chosen.includes(v)?chosen.filter(x=>x!==v):[...chosen,v];renderAutomationDays()})}
function normalizeAutomationStep(s,i){const kind=['text','image','video'].includes(s?.kind)?s.kind:'image';return{id:s?.id||('step_'+(i+1)+'_'+Math.random().toString(16).slice(2,7)),kind,prompt:String(s?.prompt||''),enhance:!!s?.enhance,enhanced:!!s?.enhanced,model:String(s?.model||settingsData?.active_models?.text||settingsData?.models?.text||'minimax/minimax-m3:free'),image:{quality:Number(s?.image?.quality||1),ratio:s?.image?.ratio||'1:1',source_image:String(s?.image?.source_image||'')},video:{duration:Number(s?.video?.duration||5),quality:s?.video?.quality||'720P',ratio:s?.video?.ratio||'16:9',source_image:String(s?.video?.source_image||'')}}}
function addAutomationStep(kind,index=null){const step=normalizeAutomationStep({kind,prompt:''},automationSteps.length);if(index==null||index>=automationSteps.length)automationSteps.push(step);else automationSteps.splice(index,0,step);renderAutomationWorkflow();setTimeout(()=>{const ta=document.querySelector('.workflow-step[data-step-id="'+step.id+'"] textarea');ta?.focus()},30)}
function removeAutomationStep(id){if(automationSteps.length<=1){showAutomationNotice('Keep at least one workflow step.');return}automationSteps=automationSteps.filter(s=>s.id!==id);renderAutomationWorkflow()}
function toggleAutomationEnhance(id){return enhanceAutomationStep(id)}
async function enhanceAutomationStep(id){const s=automationSteps.find(x=>x.id===id);if(!s||!s.prompt.trim())return;const btn=document.querySelector('.workflow-step[data-step-id="'+id+'"] .workflow-enhance');if(btn){btn.disabled=true;btn.textContent='Enhancing…'}try{const r=await fetch('/api/automation/enhance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:s.prompt,kind:s.kind})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Could not enhance prompt.');s.prompt=d.prompt||s.prompt;s.enhance=false;s.enhanced=true;renderAutomationWorkflow();workflowFocusStep(id)}catch(e){showAutomationNotice(e.message||'Enhancement failed.')}finally{if(btn)btn.disabled=false}}
function setWorkflowStepPrompt(id,value){const s=automationSteps.find(x=>x.id===id);if(s){s.prompt=value;s.enhanced=false}}
function setAutomationStepSetting(id,key,value){const s=automationSteps.find(x=>x.id===id);if(!s)return;if(s.kind==='image')s.image[key]=value;else if(s.kind==='video')s.video[key]=value}
function workflowFocusStep(id){document.querySelectorAll('.workflow-step').forEach(x=>x.classList.toggle('focused',x.dataset.stepId===id));document.getElementById('automationModal')?.classList.add('automation-focus-mode');}
function workflowExitFocus(){document.getElementById('automationModal')?.classList.remove('automation-focus-mode');document.querySelectorAll('.workflow-step').forEach(x=>{x.classList.remove('focused');x.querySelector('.workflow-settings')?.setAttribute('hidden','');const b=x.querySelector('[data-open-step]');const s=automationSteps.find(y=>y.id===x.dataset.stepId);if(b&&s)b.textContent='Open '+(s.kind==='text'?'model':s.kind+' settings')})}
function workflowReadFile(id,file){if(!file)return;const reader=new FileReader();reader.onload=()=>{const s=automationSteps.find(x=>x.id===id);if(!s)return;if(s.kind==='image')s.image.source_image=String(reader.result||'');if(s.kind==='video')s.video.source_image=String(reader.result||'');renderAutomationWorkflow()};reader.readAsDataURL(file)}
function workflowStepSettingsHtml(s){
  if(s.kind==='text'){
    const modelOptions=settingsData?.model_options?.text||['minimax/minimax-m3:free'];
    const opts=(modelOptions||[]).map(m=>'<option value="'+esc(m)+'" '+(m===s.model?'selected':'')+'>'+esc(m)+'</option>').join('');
    return '<label><span>Text model</span><select class="workflow-model" data-step-model>'+opts+'</select></label>';
  }
  if(s.kind==='image'){
    return '<div class="automation-settings-grid"><div class="automation-setting-group"><span class="automation-label">Quality</span><div class="automation-segment">'+[1,2,3,4].map(v=>'<button type="button" class="auto-wf-image-quality '+(Number(s.image.quality)===v?'active':'')+'" data-v="'+v+'">'+v+'K</button>').join('')+'</div></div><div class="automation-setting-group"><span class="automation-label">Ratio</span><div class="automation-segment">'+['1:1','3:4','4:3','16:9','9:16','2:3','3:2','21:9'].map(v=>'<button type="button" class="auto-wf-image-ratio '+(s.image.ratio===v?'active':'')+'" data-v="'+v+'">'+v+'</button>').join('')+'</div></div></div><div class="workflow-source-row"><label class="workflow-upload-btn">Upload reference<input type="file" accept="image/*" data-workflow-file></label><span class="workflow-source-note">'+(s.image.source_image?'Reference image attached.':'Optional image reference.')+'</span></div>';
  }
  return '<div class="automation-settings-grid"><div class="automation-setting-group"><span class="automation-label">Length</span><div class="automation-segment">'+[5,10,15].map(v=>'<button type="button" class="auto-wf-video-duration '+(Number(s.video.duration)===v?'active':'')+'" data-v="'+v+'">'+v+'s</button>').join('')+'</div></div><div class="automation-setting-group"><span class="automation-label">Quality</span><div class="automation-segment">'+['480P','720P','1080P'].map(v=>'<button type="button" class="auto-wf-video-quality '+(s.video.quality===v?'active':'')+'" data-v="'+v+'">'+v+'</button>').join('')+'</div></div><div class="automation-setting-group" style="grid-column:1/-1"><span class="automation-label">Ratio</span><div class="automation-segment">'+['1:1','4:3','3:4','16:9','9:16'].map(v=>'<button type="button" class="auto-wf-video-ratio '+(s.video.ratio===v?'active':'')+'" data-v="'+v+'">'+v+'</button>').join('')+'</div></div></div><div class="workflow-source-row"><label class="workflow-upload-btn">Upload image to animate<input type="file" accept="image/*" data-workflow-file></label><span class="workflow-source-note">'+(s.video.source_image?'Image attached.':'If the previous step creates an image, Atlas will animate it automatically.')+'</span></div>';
}
function renderAutomationWorkflow(){
 const box=$('automationWorkflow');if(!box)return;
 box.innerHTML=automationSteps.map((s,i)=>'<div class="workflow-step" data-step-id="'+esc(s.id)+'"><div class="workflow-step-head"><span class="workflow-step-index">'+(i+1)+'</span><span class="workflow-step-type">'+(s.kind==='text'?'Text':s.kind==='image'?'Image':'Video')+'</span><button type="button" class="workflow-step-remove" data-remove-step>×</button></div><textarea class="settings-textarea glass-input" maxlength="4000" placeholder="'+(s.kind==='text'?'Write the text prompt…':s.kind==='image'?'Describe the image…':'Describe the video…')+'">'+esc(s.prompt)+'</textarea><div class="workflow-step-tools"><button type="button" class="workflow-enhance '+(s.enhanced?'active':'')+'" data-toggle-enhance>'+(s.enhanced?'✓ Enhanced':'✨ Enhance')+'</button><button type="button" class="glass-btn workflow-open-settings" data-open-step>Open '+(s.kind==='text'?'model':s.kind+' settings')+'</button></div><div class="workflow-settings" hidden>'+workflowStepSettingsHtml(s)+'</div></div>').join('');
 box.querySelectorAll('.workflow-step').forEach(el=>{const id=el.dataset.stepId,s=automationSteps.find(x=>x.id===id);const ta=el.querySelector('textarea');ta?.addEventListener('input',e=>setWorkflowStepPrompt(id,e.target.value));el.querySelector('[data-remove-step]')?.addEventListener('click',()=>removeAutomationStep(id));el.querySelector('[data-toggle-enhance]')?.addEventListener('click',()=>toggleAutomationEnhance(id));el.querySelector('.workflow-open-settings')?.addEventListener('click',()=>{if(document.getElementById('automationModal')?.classList.contains('automation-focus-mode')&&el.classList.contains('focused')){workflowExitFocus();return}workflowFocusStep(id);el.querySelector('.workflow-settings').hidden=false;el.querySelector('[data-open-step]').textContent='× Exit settings'});el.querySelector('.workflow-settings')?.addEventListener('click',e=>{const b=e.target;if(!(b instanceof HTMLElement))return;if(b.dataset.v){if(b.classList.contains('auto-wf-image-quality'))setAutomationStepSetting(id,'quality',Number(b.dataset.v));if(b.classList.contains('auto-wf-image-ratio'))setAutomationStepSetting(id,'ratio',b.dataset.v);if(b.classList.contains('auto-wf-video-duration'))setAutomationStepSetting(id,'duration',Number(b.dataset.v));if(b.classList.contains('auto-wf-video-quality'))setAutomationStepSetting(id,'quality',b.dataset.v);if(b.classList.contains('auto-wf-video-ratio'))setAutomationStepSetting(id,'ratio',b.dataset.v);renderAutomationWorkflow();workflowFocusStep(id);const re=document.querySelector('.workflow-step[data-step-id="'+id+'"] .workflow-settings');if(re)re.hidden=false}});el.querySelector('[data-step-model]')?.addEventListener('change',e=>{s.model=e.target.value});el.querySelector('[data-workflow-file]')?.addEventListener('change',e=>workflowReadFile(id,e.target.files?.[0]));});
 document.querySelectorAll('[data-add-step]').forEach(b=>{b.onclick=()=>addAutomationStep(b.dataset.addStep||'text')});
}
function automationTimePreview(){
 const timeEl=$('automationTime'),preview=$('automationTimePreview');
 if(!timeEl||!preview)return;
 const raw=String(timeEl.value||'09:00');
 const parts=raw.split(':').map(Number);
 const h=Number.isFinite(parts[0])?Math.max(0,Math.min(23,parts[0])):9;
 const m=Number.isFinite(parts[1])?Math.max(0,Math.min(59,parts[1])):0;
 const d=new Date();d.setHours(h,m,0,0);
 preview.textContent=d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
}

function setAutomationDestination(dest){automationDestination=dest;document.querySelectorAll('[data-auto-dest]').forEach(b=>b.classList.toggle('active',b.dataset.autoDest===dest))}
function openAutomationModal(task=null){
 automationEditingId=task?.id||null;$('automationDialogTitle').textContent=task?'Edit task':'Create task';$('automationName').value=task?.name||'';
 automationDestination=task?.destination||'save';
 automationSteps=(task?.steps?.length?task.steps:(task? [{kind:task.kind||'image',prompt:task.prompt||'',enhance:!!task.enhance,image:task.image,video:task.video}]:[{kind:'image',prompt:'',enhance:false,image:{quality:1,ratio:'1:1'},video:{duration:5,quality:'720P',ratio:'16:9'}}])).map(normalizeAutomationStep);
 $('automationTime').value=task?.time||'09:00';$('automationRepeat').value=task?.repeat||'once';$('automationOnceDate').value=task?.date||new Date().toISOString().slice(0,10);
 automationDays=task?.days||[];setAutomationDestination(automationDestination);renderAutomationWorkflow();renderAutomationDays();updateAutomationScheduleUi();automationTimePreview();$('automationModal').classList.add('show');$('automationModal').setAttribute('aria-hidden','false')
}
function closeAutomationModal(){workflowExitFocus();$('automationModal')?.classList.remove('show');$('automationModal')?.setAttribute('aria-hidden','true');automationEditingId=null}
function updateAutomationScheduleUi(){const repeat=$('automationRepeat').value;const days=$('automationCustomDays');const dateWrap=$('automationOnceDateWrap');if(days)days.classList.toggle('show',repeat==='custom');if(dateWrap)dateWrap.style.display=repeat==='once'?'grid':'none';if(repeat==='custom'&&!automationDays.length)automationDays=[String(new Date().getDay())];renderAutomationDays()}
async function saveAutomationTask(){
 const btn=$('automationSaveBtn'),name=$('automationName').value.trim(),time=$('automationTime').value;
 if(!name){alert('Task name is required.');return}
 if(!automationSteps.length||automationSteps.some(s=>!String(s.prompt||'').trim())){alert('Every workflow step needs a prompt.');return}
 const repeat=$('automationRepeat').value;if(repeat==='custom'&&!automationDays.length){alert('Choose at least one day.');return}if(repeat==='once'&&!$('automationOnceDate').value){alert('Choose a date.');return}
 if(automationDestination==='notice'){try{await requestAutomationNotifications()}catch{}}
 const task={id:automationEditingId,name,steps:automationSteps.map(s=>JSON.parse(JSON.stringify(s))),kind:automationSteps[0].kind,prompt:automationSteps[0].prompt,enhance:!!automationSteps[0].enhance,destination:automationDestination,time,repeat,date:$('automationOnceDate').value,days:automationDays,timezone:localAutomationTimezone(),image:{...(automationSteps[0].image||{})},video:{...(automationSteps[0].video||{})}};
 const method=automationEditingId?'PUT':'POST',url=automationEditingId?'/api/automation/'+encodeURIComponent(automationEditingId):'/api/automation';
 if(btn){btn.disabled=true;btn.textContent=automationEditingId?'Updating…':'Saving…'}
 try{const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(task),credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Could not save automation.');await loadAutomationTasks();closeAutomationModal();showAutomationNotice(name+(automationEditingId?' updated.':' saved.'))}
 catch(e){showAutomationNotice(e.message||'Could not connect to the Atlas server.');alert(e.message||'Could not connect to the Atlas server.')}
 finally{if(btn){btn.disabled=false;btn.textContent='Save task'}}
}
function renderAutomationTasks(){
 const box=$('automationTasks'),empty=$('automationEmpty');if(!box)return;box.innerHTML='';empty.style.display=automationTasks.length?'none':'grid';
 automationTasks.forEach(task=>{const card=document.createElement('div');card.className='automation-task';card.dataset.id=task.id;const repeatLabel=task.repeat==='everyday'?'Every day':task.repeat==='custom'?'Custom days':'Once';const steps=task.steps?.length?task.steps:[{kind:task.kind||'image'}];const flowLabel=steps.map(s=>s.kind==='text'?'Text':s.kind==='image'?'Image':'Video').join(' → ');const first=steps[0];let setting=first.kind==='video'?(first.video?.duration+'s • '+first.video?.quality+' • '+first.video?.ratio):first.kind==='image'?(first.image?.quality+'K • '+first.image?.ratio):'Text model';card.innerHTML='<div class="automation-task-main"><div class="automation-task-title">'+esc(task.name)+'</div><div class="automation-task-prompt">'+esc(first.prompt||task.prompt||'')+'</div><div class="automation-task-meta"><span class="automation-chip">'+flowLabel+'</span><span class="automation-chip">'+formatAutomationTime(task.time)+'</span><span class="automation-chip">'+repeatLabel+'</span><span class="automation-chip">'+setting+'</span></div></div><div class="automation-task-side"><span class="automation-task-dot"></span><span class="automation-task-status">'+(task.last_status||'Scheduled')+'</span></div><div class="automation-task-menu"><button type="button" data-task-edit="1">Edit</button><button type="button" data-task-delete="1">Delete</button></div>';const openMenu=()=>card.classList.toggle('show-menu');let timer=null;card.addEventListener('contextmenu',e=>{e.preventDefault();openMenu()});card.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;clearTimeout(timer);timer=setTimeout(openMenu,650)});['pointerup','pointercancel','pointerleave'].forEach(ev=>card.addEventListener(ev,()=>clearTimeout(timer)));card.querySelector('[data-task-edit]').onclick=e=>{e.stopPropagation();openAutomationModal(task)};card.querySelector('[data-task-delete]').onclick=async e=>{e.stopPropagation();if(!confirm('Delete '+task.name+'?'))return;const r=await fetch('/api/automation/'+encodeURIComponent(task.id),{method:'DELETE'});if(r.ok)loadAutomationTasks()};box.appendChild(card)})
}
function requestAutomationNotifications(){return (!('Notification'in window)||Notification.permission==='granted')?Promise.resolve():Notification.requestPermission().catch(()=>{})}

// ---------- Tools / Alarm ----------
function localAlarmTimezone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return'UTC'}}
function alarmFormatTime(v){const [h,m]=String(v||'07:00').split(':').map(Number);const d=new Date();d.setHours(Number.isFinite(h)?h:7,Number.isFinite(m)?m:0,0,0);return d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}
function alarmToggle(name){alarmToggles[name]=!alarmToggles[name];document.querySelectorAll('[data-alarm-toggle]').forEach(b=>b.classList.toggle('active',!!alarmToggles[b.dataset.alarmToggle]));updateAlarmConditionalFields()}
function renderAlarmDays(){const box=$('alarmCustomDays');if(!box)return;const chosen=alarmEditorState?.days||[];box.innerHTML=ALARM_WEEKDAYS.map(([label,val])=>`<button type="button" class="alarm-day ${chosen.includes(val)?'active':''}" data-alarm-day="${val}">${label}</button>`).join('');box.querySelectorAll('[data-alarm-day]').forEach(b=>b.onclick=()=>{const v=b.dataset.alarmDay;const arr=alarmEditorState?.days||[];alarmEditorState.days=arr.includes(v)?arr.filter(x=>x!==v):[...arr,v];renderAlarmDays()})}
function updateAlarmConditionalFields(){const repeat=$('alarmRepeat')?.value||'everyday';if($('alarmOnceDateWrap'))$('alarmOnceDateWrap').style.display=repeat==='once'?'grid':'none';if($('alarmCustomDays'))$('alarmCustomDays').style.display=repeat==='custom'?'flex':'none';if(repeat==='custom'&&alarmEditorState&&!alarmEditorState.days.length)alarmEditorState.days=[String(new Date().getDay())];renderAlarmDays();if($('alarmLocationWrap'))$('alarmLocationWrap').style.display=alarmToggles.weather?'grid':'none';if($('alarmMatchWrap'))$('alarmMatchWrap').style.display=alarmToggles.match?'grid':'none'}
function openTools(){if(currentRole!=='developer')return;closeMenus();$('toolsLayer').classList.add('show');$('toolsLayer').setAttribute('aria-hidden','false');loadAlarms()}
function closeTools(){closeAlarmEditor();stopAlarmRing();$('toolsLayer').classList.remove('show');$('toolsLayer').setAttribute('aria-hidden','true')}
function alarmPhraseList(value){const raw=Array.isArray(value)?value:String(value||'').split(/[,;\n]+/);const out=[];const seen=new Set();for(const x of raw){const p=String(x||'').replace(/\s+/g,' ').trim();if(p&&!seen.has(p.toLowerCase())){seen.add(p.toLowerCase());out.push(p)}}return out.slice(0,20)}
function renderAlarmTeams(){const box=$('alarmTeamChips');if(!box)return;box.innerHTML=alarmTeams.map((t,i)=>'<span class="alarm-team-chip">'+esc(t)+'<button type="button" class="alarm-chip-x" data-team-index="'+i+'">×</button></span>').join('');box.querySelectorAll('[data-team-index]').forEach(b=>b.onclick=()=>{alarmTeams.splice(Number(b.dataset.teamIndex),1);renderAlarmTeams()})}
function addAlarmTeam(){const input=$('alarmTeam'),name=input.value.trim();if(!name)return;if(!alarmTeams.some(x=>x.toLowerCase()===name.toLowerCase()))alarmTeams.push(name);input.value='';renderAlarmTeams();searchAlarmTeams('')}
function resetAlarmEditor(task=null){
 alarmEditorState={id:task?.id||'',days:[...(task?.days||[])],location:task?.location||{}};
 alarmTeams=Array.isArray(task?.teams)&&task.teams.length?task.teams.slice(0,20):alarmPhraseList(task?.team||'');
 alarmToggles.time=task?task.include_time!==false:true;alarmToggles.weather=!!task?.include_weather;alarmToggles.match=!!task?.include_next_match;
 document.querySelectorAll('[data-alarm-toggle]').forEach(b=>b.classList.toggle('active',!!alarmToggles[b.dataset.alarmToggle]));
 $('alarmEditingId').value=task?.id||'';$('alarmName').value=task?.name||'';$('alarmTime').value=task?.time||'07:00';$('alarmRepeat').value=task?.repeat||'everyday';$('alarmOnceDate').value=task?.date||new Date().toISOString().slice(0,10);$('alarmLocationName').value=task?.location?.name||task?.location_name||'';$('alarmLeague').value=ALARM_LEAGUES.includes(task?.league)?task.league:'Premier League';$('alarmTeam').value='';$('alarmWakePhrase').value=(Array.isArray(task?.wake_phrases)?task.wake_phrases:alarmPhraseList(task?.wake_phrase)).join(', ');$('alarmEditorStatus').textContent='';renderAlarmTeams();renderAlarmDays();updateAlarmConditionalFields()
}
function openAlarmEditor(task=null){resetAlarmEditor(task);$('alarmEditor').classList.add('show');$('alarmSaveBtn').textContent=task?'Update alarm':'Save alarm';$('alarmName').focus()}
function closeAlarmEditor(){alarmEditorState=null;$('alarmEditor')?.classList.remove('show')}
async function useDeviceAlarmLocation(){if(!navigator.geolocation){$('alarmEditorStatus').textContent='Device location is not available in this browser.';return}$('alarmEditorStatus').textContent='Getting device location…';navigator.geolocation.getCurrentPosition(pos=>{alarmEditorState.location={latitude:pos.coords.latitude,longitude:pos.coords.longitude,name:'Device location'};$('alarmLocationName').value='Device location';$('alarmEditorStatus').textContent='Device location selected.'},err=>{$('alarmEditorStatus').textContent=err.code===1?'Location permission was denied.':'Could not read device location.'},{enableHighAccuracy:false,timeout:10000,maximumAge:300000})}
async function searchAlarmTeams(queryOverride){const league=$('alarmLeague').value,q=(queryOverride!==undefined?queryOverride:$('alarmTeam').value).trim();if(!league)return;try{const r=await fetch('/api/tools/teams?league='+encodeURIComponent(league)+'&q='+encodeURIComponent(q));const d=await r.json().catch(()=>({}));const dl=$('alarmTeamList');dl.innerHTML=(d.teams||[]).map(t=>`<option value="${esc(t.name)}">${esc(t.short_name||'')}</option>`).join('')}catch{}}
async function saveAlarm(){
 const name=$('alarmName').value.trim()||'Atlas Alarm',time=$('alarmTime').value||'07:00',repeat=$('alarmRepeat').value,date=$('alarmOnceDate').value,statusEl=$('alarmEditorStatus'),btn=$('alarmSaveBtn');
 if(!alarmToggles.time&&!alarmToggles.weather&&!alarmToggles.match){statusEl.textContent='Choose at least one briefing item.';return}
 if(repeat==='once'&&!date){statusEl.textContent='Choose a date for a one-time alarm.';return}if(repeat==='custom'&&!alarmEditorState.days.length){statusEl.textContent='Choose at least one day.';return}
 if(alarmToggles.weather&&!alarmEditorState.location?.latitude&&!$('alarmLocationName').value.trim()){statusEl.textContent='Enter a weather location or use device location.';return}
 if(alarmToggles.match&&!alarmTeams.length){statusEl.textContent='Add at least one team for Next match.';return}
 const wake_phrases=alarmPhraseList($('alarmWakePhrase').value);statusEl.textContent='Saving alarm…';if(btn)btn.disabled=true;
 const body={name,time,repeat,date,days:alarmEditorState.days,timezone:localAlarmTimezone(),location_name:$('alarmLocationName').value.trim(),location:alarmEditorState.location||{},include_time:alarmToggles.time,include_weather:alarmToggles.weather,include_next_match:alarmToggles.match,league:$('alarmLeague').value,teams:alarmTeams.slice(),team:alarmTeams.join(', '),wake_phrases,wake_phrase:wake_phrases[0]||'I am awake'};
 const id=alarmEditorState.id;
 try{const r=await fetch(id?('/api/tools/alarms/'+encodeURIComponent(id)):'/api/tools/alarms',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Could not save alarm.');closeAlarmEditor();await loadAlarms();showAutomationNotice(name+(id?' updated.':' saved.'))}catch(e){statusEl.textContent=e.message||'Could not connect to the Atlas server.'}finally{if(btn)btn.disabled=false}
}
async function loadAlarms(){try{const r=await fetch('/api/tools/alarms',{cache:'no-store'});if(!r.ok)return;const d=await r.json();alarmList=d.alarms||[];renderAlarms();for(const a of alarmList){const stamp=Number(a.last_fired_at||0),key='atlas_alarm_seen_'+a.id,seen=Number(localStorage.getItem(key)||0);if(stamp>seen&&a.last_briefing){localStorage.setItem(key,String(stamp));triggerAlarmRing(a)}}}catch{}}
function renderAlarms(){const list=$('alarmList'),empty=$('alarmEmpty');if(!list)return;list.innerHTML='';empty.style.display=alarmList.length?'none':'grid';alarmList.forEach(a=>{const repeat=a.repeat==='everyday'?'Every day':a.repeat==='custom'?'Custom days':'Once';const bits=[];if(a.include_time)bits.push('time');if(a.include_weather)bits.push('weather');if(a.include_next_match)bits.push('next match');const teams=(a.teams?.length?a.teams:alarmPhraseList(a.team||''));if(teams.length)bits.push(teams.join(', '));const card=document.createElement('div');card.className='alarm-card';const paused=!a.enabled;card.innerHTML=`<div class="alarm-card-main"><div class="alarm-card-head"><div class="alarm-card-time">${esc(alarmFormatTime(a.time))}</div><div><div class="alarm-card-name">${esc(a.name||'Atlas Alarm')}</div><div class="alarm-card-meta">${esc(repeat)} • ${esc(bits.join(' • ')||'No briefing items')} • ${paused?'Paused':'Enabled'}</div></div></div><div class="alarm-card-meta">${a.last_status==='fired'?'Last fired: '+new Date(Number(a.last_fired_at||0)*1000).toLocaleString():a.next_run?'Next: '+new Date(Number(a.next_run)*1000).toLocaleString():''}</div><div class="alarm-card-actions"><button type="button" class="alarm-mini" data-alarm-edit="1">Edit</button><button type="button" class="alarm-mini" data-alarm-toggle-enable="1">${paused?'Enable':'Pause'}</button><button type="button" class="alarm-mini danger" data-alarm-delete="1">Delete</button></div></div>`;card.querySelector('[data-alarm-edit]').onclick=()=>openAlarmEditor(a);card.querySelector('[data-alarm-toggle-enable]').onclick=()=>toggleAlarm(a);card.querySelector('[data-alarm-delete]').onclick=()=>deleteAlarm(a);list.appendChild(card)})}
async function toggleAlarm(a){const r=await fetch('/api/tools/alarms/'+encodeURIComponent(a.id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!a.enabled})});if(r.ok)await loadAlarms()}
async function deleteAlarm(a){if(!confirm('Delete '+(a.name||'this alarm')+'?'))return;const r=await fetch('/api/tools/alarms/'+encodeURIComponent(a.id),{method:'DELETE'});if(r.ok)await loadAlarms()}
function normalizeWakePhrase(t){return String(t||'').toLowerCase().replace(/[^a-z0-9\s']/g,' ').replace(/\s+/g,' ').trim()}
function stopAlarmRing(){alarmSpeechActive=false;try{window.speechSynthesis?.cancel()}catch{};try{alarmWakeRecognition?.stop()}catch{}alarmWakeRecognition=null;$('alarmRingLayer')?.classList.remove('show');$('alarmRingLayer')?.setAttribute('aria-hidden','true')}
function startAlarmWakeListener(wakePhrase){const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition)return false;try{alarmWakeRecognition?.stop()}catch{}alarmWakeRecognition=new Recognition();alarmWakeRecognition.continuous=true;alarmWakeRecognition.interimResults=true;alarmWakeRecognition.lang='en-US';const targets=alarmPhraseList(wakePhrase).map(normalizeWakePhrase).filter(Boolean);alarmWakeRecognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const heard=normalizeWakePhrase(e.results[i]?.[0]?.transcript||'');if(!heard)continue;if(targets.some(t=>heard.includes(t)||t.split(' ').every(w=>heard.includes(w)))){stopAlarmRing();return}}};alarmWakeRecognition.onerror=()=>{};alarmWakeRecognition.onend=()=>{if(alarmSpeechActive){try{alarmWakeRecognition.start()}catch{}}};try{alarmWakeRecognition.start();return true}catch{return false}}
function speakAlarmEnglish(text){try{const u=new SpeechSynthesisUtterance(String(text||''));u.lang='en-US';const voices=window.speechSynthesis?.getVoices?.()||[];const hints=['female','woman','girl','samantha','victoria','karen','moira','zira','jenny','aria','ava','emma','allison','susan','helena','kate','siri'];const english=voices.filter(x=>/^en(-|_)/i.test(String(x.lang||'')));const v=english.find(x=>hints.some(h=>((x.name||'')+' '+(x.voiceURI||'')).toLowerCase().includes(h)))||english.find(x=>/google.*(female|uk|us)/i.test(x.name||''))||english[0];if(v)u.voice=v;u.rate=.92;u.pitch=1.08;u.onend=()=>{if(alarmSpeechActive)setTimeout(()=>{if(alarmSpeechActive)try{window.speechSynthesis.speak(u)}catch{}},6500)};window.speechSynthesis.cancel();window.speechSynthesis.speak(u)}catch{}}
function triggerAlarmRing(alarm){if(!alarm||!alarm.last_briefing)return;stopAlarmRing();$('alarmRingTitle').textContent=alarm.name||'Atlas Alarm';$('alarmRingTime').textContent=new Date(Number(alarm.last_fired_at||Date.now()/1000)*1000).toLocaleString('ar-EG');$('alarmRingBrief').textContent=alarm.last_briefing;$('alarmRingLayer').classList.add('show');$('alarmRingLayer').setAttribute('aria-hidden','false');if(document.hidden&&'Notification'in window&&Notification.permission==='granted'){try{new Notification('Atlas Alarm',{body:alarm.last_briefing.slice(0,180)})}catch{}}alarmSpeechActive=true;setTimeout(()=>{if(!alarmSpeechActive)return;startAlarmWakeListener((alarm.wake_phrases&&alarm.wake_phrases.length)?alarm.wake_phrases:alarm.wake_phrase)},50)}
function startAlarmPolling(){clearInterval(alarmPollTimer);alarmPollTimer=setInterval(()=>{if(currentUser)loadAlarms()},2000);loadAlarms()}

// ---------- Settings, memory and developer panel ----------
let settingsData=null, selectedDeveloperUser='';
const ACCENT_COLORS=[['Black','#111111'],['White','#f5f5f5'],['Red','#ff3b30'],['Orange','#ff9500'],['Yellow','#ffcc00'],['Green','#34c759'],['Mint','#00c7be'],['Cyan','#32ade6'],['Blue','#007aff'],['Indigo','#5856d6'],['Purple','#af52de'],['Pink','#ff2d55'],['Coral','#ff6b6b'],['Teal','#0a7f7f'],['Slate','#64748b']];
function contrastText(hex){const n=parseInt((hex||'#007aff').replace('#',''),16),r=n>>16,g=(n>>8)&255,b=n&255;return (0.299*r+0.587*g+0.114*b)>160?'#050505':'#ffffff'}
function renderColorChoices(selected){const box=$('colorChoices');if(!box)return;box.innerHTML=ACCENT_COLORS.map(([name,hex])=>`<button type="button" class="color-swatch ${hex.toLowerCase()===(selected||'').toLowerCase()?'active':''}" title="${name}" aria-label="${name}" style="background:${hex}" data-color="${hex}"></button>`).join('');box.querySelectorAll('[data-color]').forEach(b=>b.onclick=async()=>{const mode=settingsData?.theme?.mode||document.querySelector('.theme-mode.active')?.dataset.theme||'black';applyTheme(mode,b.dataset.color,!!settingsData?.theme?.bold_font);await saveThemeOnly()})}
function applyTheme(theme,accent,bold){const safe=accent||settingsData?.theme?.accent||'#007aff';const boldOn=typeof bold==='boolean'?bold:!!settingsData?.theme?.bold_font;document.body.classList.remove('theme-white','theme-custom','theme-system','theme-system-light','theme-system-dark');if(theme==='white')document.body.classList.add('theme-white');else if(theme==='system'){document.body.classList.add('theme-system');document.body.classList.add(window.matchMedia?.('(prefers-color-scheme: light)').matches?'theme-system-light':'theme-system-dark')}else if(theme==='custom')document.body.classList.add('theme-custom');document.body.classList.toggle('font-bold',boldOn);document.documentElement.style.setProperty('--accent',safe);document.documentElement.style.setProperty('--accentText',contrastText(safe));document.documentElement.style.setProperty('--custom-accent',safe);document.documentElement.style.setProperty('--system-accent',safe);document.querySelectorAll('.theme-mode').forEach(b=>b.classList.toggle('active',b.dataset.theme===theme));const bs=$('boldFontSwitch');if(bs)bs.checked=boldOn;if(settingsData){settingsData.theme=settingsData.theme||{};settingsData.theme.mode=theme;settingsData.theme.accent=safe;settingsData.theme.bold_font=boldOn}renderColorChoices(safe)}
async function saveThemeOnly(){const mode=document.querySelector('.theme-mode.active')?.dataset.theme||settingsData?.theme?.mode||'black';const accent=document.documentElement.style.getPropertyValue('--accent').trim()||settingsData?.theme?.accent||'#007aff';const bold=!!$('boldFontSwitch')?.checked;const r=await fetch('/api/settings/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({theme:{mode,accent,bold_font:bold}})});if(r.ok){const d=await r.json();settingsData=d.settings||settingsData;const savedTheme={mode,accent,bold_font:bold};localStorage.setItem('atlas_theme',JSON.stringify(savedTheme));applyTheme(mode,accent,bold)}else{throw new Error('Could not save theme settings.')}}

function openLayer(id){$(id).classList.add('show')}function closeLayer(id){$(id).classList.remove('show')}
async function loadSettings(){const r=await fetch('/api/settings');if(!r.ok)return;settingsData=await r.json();activeModels={...(settingsData.active_models||activeModels),text:'agnes-3.0-flash'};const vnp=$('videoNegativePrompt');if(vnp)vnp.value=String(settingsData.video_negative_prompt||'');const inp=$('imageNegativePrompt');if(inp)inp.value=String(settingsData.image_negative_prompt||'');syncProviderMenu();generationDefaults=settingsData.generation_defaults||generationDefaults;imageSteps=100;videoSteps=100;if(is){is.value=String(imageSteps);$('imageStepsValue').textContent=imageSteps+' steps'}videoSteps=100;if(videoStepsSlider){videoStepsSlider.value='100';$('videoStepsValue').textContent='100 steps'}updateVideoModelControls();const modelTab=$('modelsTab');if(modelTab)modelTab.hidden=currentRole!=='developer';const modelPage=document.querySelector('.settings-page[data-page="models"]');if(modelPage)modelPage.hidden=currentRole!=='developer';const p=settingsData.profile||{},t=settingsData.theme||{};t.bold_font=!!t.bold_font;settingsData.theme=t;$('boldFontSwitch').checked=!!t.bold_font;$('profileName').value=p.name||'';$('profileNickname').value=p.nickname||'';$('profileAge').value=p.age||'';applyTheme(t.mode||'system',t.accent||'#8ab4ff',!!t.bold_font);localStorage.setItem('atlas_theme',JSON.stringify({mode:t.mode||'system',accent:t.accent||'#8ab4ff',bold_font:!!t.bold_font}));renderMemory(settingsData.memory||[]);renderPersonality(p.personality||'Friendly');renderModelSettings();if(currentRole==='developer')await loadDeveloperOverview()}
function renderPersonality(active){const box=$('personalityChoices');box.innerHTML='';['Professional','Friendly','Friendly + Humor','Concise','Detailed','Creative','Patient','Motivational','Straightforward'].forEach(v=>{const b=document.createElement('button');b.className='pill-btn'+(v===active?' active':'');b.type='button';b.textContent=v;b.onclick=()=>{box.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active')};box.appendChild(b)})}
function currentPersonality(){return $('personalityChoices').querySelector('.active')?.textContent||'Friendly'}
function renderMemory(items){const box=$('memoryList');box.innerHTML='';items.forEach((m,i)=>{const row=document.createElement('div');row.className='memory-item';const sp=document.createElement('span');sp.textContent=m;const x=document.createElement('button');x.className='pill-btn';x.textContent='×';x.onclick=async()=>{const r=await fetch('/api/memory/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index:i})});const d=await r.json();if(r.ok)renderMemory(d.memory||[])};row.append(sp,x);box.append(row)})}
async function saveProfile(){const mode=document.querySelector('.theme-mode.active')?.dataset.theme||settingsData?.theme?.mode||'black';const accent=settingsData?.theme?.accent||document.documentElement.style.getPropertyValue('--accent').trim()||'#007aff';const r=await fetch('/api/settings/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{name:$('profileName').value.trim(),nickname:$('profileNickname').value.trim(),age:$('profileAge').value.trim(),personality:currentPersonality()},theme:{mode,accent,bold_font:!!$('boldFontSwitch')?.checked}})});if(r.ok){settingsData=await r.json().then(x=>x.settings);applyTheme(mode,accent,!!$('boldFontSwitch')?.checked);status.textContent='Saved.';setTimeout(()=>status.textContent='',1200)}}
async function addMemory(){const v=$('memoryInput').value.trim();if(!v)return;const r=await fetch('/api/memory/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memory:v})});const d=await r.json();if(r.ok){$('memoryInput').value='';renderMemory(d.memory||[])}else{alert(d.error||'Could not save memory.')}}
async function clearAllMemory(){if(!confirm('Remove every saved memory for this account? This cannot be undone.'))return;const r=await fetch('/api/memory/clear',{method:'POST'});const d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||'Could not remove memory.');return}renderMemory(d.memory||[]);status.textContent='All memory removed.';setTimeout(()=>{if(status.textContent==='All memory removed.')status.textContent=''},1500)}
async function deleteAllChats(){if(!confirm('Remove ALL chats, generated/uploaded media, jobs, and related saved chat/media data from the server? This cannot be undone.'))return;const r=await fetch('/api/chats/delete-all',{method:'POST'});const d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||'Could not remove chats.');return}history=[];currentChatId=null;currentChatTitle='New chat';await newChat();closeLayer('settingsLayer');renderHistory();status.textContent='All chats removed.';setTimeout(()=>{if(status.textContent==='All chats removed.')status.textContent=''},1500)}
async function saveVideoNegativePrompt(){
  if(currentRole!=='developer')return;
  const video=String($('videoNegativePrompt')?.value||'').trim();
  const image=String($('imageNegativePrompt')?.value||'').trim();
  const r=await fetch('/api/settings/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({negative_prompts:{video,image}})});
  const d=await r.json().catch(()=>({}));
  const out=$('videoNegativePromptStatus');
  if(!r.ok){if(out)out.textContent=d.error||'Could not save.';return}
  settingsData=d.settings||settingsData;
  if(out)out.textContent='Saved.';
  setTimeout(()=>{if(out&&out.textContent==='Saved.')out.textContent=''},1400);
}

function modelLabel(id){const labels={"google/gemma-4-26b-a4b-it:free":"Alpha Technologies • Text Vision","agnes-3.0-flash":"Atlas 3.0 Flash","meta/muse-glimmer-30b":"Alpha Technologies • Text Vision","agnes-2.0-flash":"Atlas Text","agnes-2.5-flash":"Atlas 2.5 Pro","agnes-image-2.1-flash":"Atlas 2.0","agnes-image-2.5-flash":"Atlas 2.5 Flash","atlas-image-1.0-pro":"Atlas 1.0 Pro","agnes-video-v2.0":"Atlas 2.0","agnes-video-2.5-flash":"Atlas 2.5 Pro","inclusionai/ling-3.0-flash-vl:free":"Alpha Technologies • Vision","minimax/minimax-m3:free":"Alpha Technologies • Text Model","meta/llama-3.2-11b-vision-instruct":"Atlas 1.0 • Vision"};return labels[id]||'Atlas • Model'}

async function selectModel(kind,model){
  if(currentRole!=="developer")return;
  if(kind==='text') model='agnes-3.0-flash';
  const next={...activeModels,[kind]:model};
  const r=await fetch('/api/settings/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({models:next})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){alert(d.error||'Could not save model.');return}
  settingsData=d.settings||settingsData;activeModels=settingsData.models||next;
  const caps=currentOpenRouterCapabilities()||{};if(!caps.image)selectedImages=[];if(!caps.file)selectedFiles=[];if(!caps.video)selectedVideos=[];if(!caps.audio)selectedAudios=[];syncProviderMenu();
  syncProviderMenu();renderModelSettings();updateSummary();renderRefs();
}
function renderModelGroup(id,options,selected){const box=$(id);if(!box)return;box.innerHTML='';if(id==='textModelOptions')selected='agnes-3.0-flash';(options||[]).forEach(model=>{const b=document.createElement('button');b.type='button';b.className='model-option'+(model===selected?' selected':'');const info=document.createElement('span');info.innerHTML='<b>'+esc(modelLabel(model))+'</b>'+(MODEL_CAPABILITY_LABELS[model]?'<small class="model-capability-line">'+esc(modelSupportText(model))+'</small>':'');const check=document.createElement('span');check.className='model-check';check.textContent=model===selected?'✓':'';b.append(info,check);b.onclick=()=>selectModel((id==='textModelOptions'?'text':id==='imageModelOptions'?'image':'video'),model);box.appendChild(b)})}
let ttsDevVoices=[];async function testNvidiaMuseConnection(){
  if(currentRole!=="developer")return;
  const box=document.getElementById('nvidiaConnectionStatus');
  if(box)box.textContent='Checking Atlas text connection…';
  try{
    const r=await fetch('/api/nvidia/check',{cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(box)box.textContent=d.connected?'Atlas text connection is ready.':(d.error||'Atlas text connection failed.');
  }catch(e){if(box)box.textContent=e.message||'Atlas text connection failed.';}
}
async function loadDeveloperTtsVoices(){if(currentRole!=="developer")return;try{const r=await fetch('/api/tts/config');const d=await r.json();if(!r.ok)return;ttsDevVoices=Array.isArray(d.voices)?d.voices:[];ttsModel=d.model||ttsModel;ttsVoice=d.default_voice||ttsVoice||TTS_DEFAULT_VOICE;renderTtsModelChoices();renderDeveloperTtsVoices()}catch{}}
async function setDeveloperDefaultVoice(voice){const r=await fetch('/api/settings/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tts_default_voice:String(voice||'')})});const d=await r.json().catch(()=>({}));if(!r.ok){$('ttsDevStatus').textContent=d.error||'Could not save default voice.';return}ttsVoice=String(voice||'');if(settingsData)settingsData.tts={...(settingsData.tts||{}),default_voice:ttsVoice};renderDeveloperTtsVoices();$('ttsDevStatus').textContent=ttsVoice?'Default voice saved. Chat Speak will use '+(ttsDevVoices.find(v=>String(v.id||'')===ttsVoice)?.name||'the selected voice')+'.':'Default voice cleared.';setTimeout(()=>{if($('ttsDevStatus'))$('ttsDevStatus').textContent=''},1600)}
function renderDeveloperTtsVoices(){const box=$('ttsDevVoiceList');if(!box)return;box.innerHTML='';if(!ttsDevVoices.length){box.innerHTML='<div class="subtle">No voices were returned.</div>';return}ttsDevVoices.forEach(v=>{const row=document.createElement('div');row.className='tts-dev-row';const info=document.createElement('div');info.innerHTML='<b>'+esc(v.name||'Fish Audio voice')+'</b><div class="subtle">'+esc([v.gender||'Voice',v.age||'',v.id||''].filter(Boolean).join(' • '))+'</div>';const actions=document.createElement('div');actions.className='tts-dev-actions';const def=document.createElement('button');def.type='button';def.textContent=String(v.id||'')===ttsVoice?'Default':'Use';def.classList.toggle('active',String(v.id||'')===ttsVoice);def.onclick=()=>setDeveloperDefaultVoice(v.id||'');const test=document.createElement('button');test.type='button';test.textContent='▶ Test';test.onclick=async()=>{const status=$('ttsDevStatus');status.textContent='Generating sample…';try{const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Hello. This is a voice test for Atlas.',voice:v.id||'',emotion:'',model:ttsModel,chat_id:''})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Voice test failed.');new Audio(d.url).play().catch(()=>{});status.textContent='Playing '+(v.name||'voice')+'…'}catch(e){status.textContent=e.message||'Voice test failed.'}};actions.append(def,test);row.append(info,actions);box.appendChild(row)})}
function updateDeveloperVoiceTester(){if(currentRole==='developer'&&document.querySelector('.settings-page[data-page="models"]')?.classList.contains('active'))loadDeveloperTtsVoices()}
function renderModelSettings(){if(currentRole!=='developer'){const p=document.querySelector('.settings-page[data-page="models"]');if(p)p.hidden=true;return}const opts=settingsData?.model_options||{};const selected=settingsData?.active_models||settingsData?.models||{};renderModelGroup('textModelOptions',opts.text||[],selected.text);renderModelGroup('imageModelOptions',opts.image||[],selected.image);renderModelGroup('videoModelOptions',opts.video||[],selected.video);ttsModel=(settingsData?.tts?.model||ttsModel);renderTtsModelChoices();const defs=settingsData?.generation_defaults||generationDefaults;const ni=$('normalImageSteps'),nv=$('normalVideoSteps');if(ni)ni.value=defs.image_steps||30;if(nv)nv.value=defs.video_steps||40}
async function saveGenerationDefaults(){if(currentRole!=='developer')return;const image=Number($('normalImageSteps').value),video=Number($('normalVideoSteps').value);if(!Number.isInteger(image)||image<2||image>100||!Number.isInteger(video)||video<2||video>100){$('generationDefaultsStatus').textContent='Steps is error';return}const r=await fetch('/api/settings/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({generation_defaults:{image_steps:image,video_steps:video}})});const d=await r.json().catch(()=>({}));if(!r.ok){$('generationDefaultsStatus').textContent=d.error||'Could not save defaults.';return}settingsData=d.settings||settingsData;generationDefaults=settingsData.generation_defaults||{image_steps:image,video_steps:video};$('generationDefaultsStatus').textContent='Saved.';setTimeout(()=>{if($('generationDefaultsStatus').textContent==='Saved.')$('generationDefaultsStatus').textContent=''},1200)}
async function loadDeveloperOverview(){const r=await fetch('/api/developer/overview');if(!r.ok)return;const d=await r.json();developerUsers=d.users||[];$('devUserCount').textContent=d.count||0;$('devOnlineCount').textContent=d.online||0;$('systemPromptBox').value=d.system_prompt||'';const rows=$('devUserTable');rows.innerHTML='';developerUsers.forEach(u=>{const row=document.createElement('div');row.className='user-row';row.innerHTML='<div><b>'+esc(u.name||u.nickname||u.username)+'</b><div class="subtle">@'+esc(u.username)+'</div></div><div class="subtle">'+esc(u.role||'user')+'</div><div class="subtle">'+((d.online_users||[]).includes(u.username)?'● online':'offline')+'</div>';row.onclick=()=>selectDeveloperUser(u.username);rows.append(row)});const totals=developerUsers.reduce((a,u)=>{a.i+=(u.images_created||0);a.v+=(u.videos_created||0);return a},{i:0,v:0});$('devImageCount').textContent=totals.i;$('devVideoCount').textContent=totals.v;renderGenerationUsers();await loadDeveloperUsage(usageWindow)}
async function selectDeveloperUser(username){selectedDeveloperUser=username;$('selectedDeveloperUser').textContent='@'+username;const r=await fetch('/api/developer/user/'+encodeURIComponent(username));if(!r.ok)return;const d=await r.json();$('developerModeSwitch').checked=!!d.developer_mode;const box=$('devUserDetail');box.innerHTML='<div class="dev-stats"><div class="stat-card"><b>'+d.images_created+'</b><small>Images created</small></div><div class="stat-card"><b>'+d.videos_created+'</b><small>Videos created</small></div><div class="stat-card"><b>'+Number(d.tokens_used||0).toLocaleString()+'</b><small>Tokens used</small></div><div class="stat-card"><b>'+formatBytes(d.storage_size)+'</b><small>Total stored data</small></div><div class="stat-card"><b>'+new Date(d.created_at*1000).toLocaleDateString()+'</b><small>Created</small></div></div><div class="danger-panel" style="margin-top:10px"><div class="settings-label">Account security</div><div class="subtle">Passwords are never displayed. Use the secure reset control below to set a new password.</div></div>'}
function formatBytes(n){n=Number(n)||0;if(!n)return'0 B';const u=['B','KB','MB','GB'];const i=Math.min(u.length-1,Math.floor(Math.log(n)/Math.log(1024)));return(n/Math.pow(1024,i)).toFixed(i?1:0)+' '+u[i]}
async function loadDeveloperUsage(windowName='hour'){usageWindow=windowName;const r=await fetch('/api/developer/usage?window='+encodeURIComponent(windowName));if(!r.ok)return;const d=await r.json();const vals=d.summary||{};$('usageStats').innerHTML='<div class="stat-card"><b>'+Number(vals.images||0).toLocaleString()+'</b><small>Images</small></div><div class="stat-card"><b>'+Number(vals.videos||0).toLocaleString()+'</b><small>Videos</small></div><div class="stat-card"><b>'+Number(vals.tokens||0).toLocaleString()+'</b><small>Tokens</small></div><div class="stat-card"><b>'+Number(vals.video_seconds||0).toLocaleString()+'s</b><small>Video seconds</small></div>';drawUsageChart(d.labels||[],d.series||{})}
function renderGenerationUsers(){const q=($('generationSearch')?.value||'').trim().toLowerCase();const box=$('generationStats');if(!box)return;const filtered=developerUsers.filter(u=>(u.username+' '+(u.name||'')+' '+(u.nickname||'')).toLowerCase().includes(q));box.innerHTML=filtered.map(u=>'<div class="generation-user-row"><div><b>'+esc(u.name||u.nickname||u.username)+'</b><div class="subtle">@'+esc(u.username)+'</div></div><div class="metric">image['+Number(u.images_created||0).toLocaleString()+']</div><div class="metric">video['+Number(u.videos_created||0).toLocaleString()+']</div><div class="metric">tokens['+Number(u.tokens_used||0).toLocaleString()+']</div></div>').join('')||'<div class="subtle">No users found.</div>'}
function drawUsageChart(labels,series){const canvas=$('usageChart');if(!canvas)return;const dpr=Math.min(window.devicePixelRatio||1,2),cssW=Math.max(320,canvas.parentElement?.clientWidth||canvas.clientWidth||600)-20,cssH=260;canvas.width=Math.floor(cssW*dpr);canvas.height=Math.floor(cssH*dpr);canvas.style.width='100%';canvas.style.height=cssH+'px';const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);const pad={l:34,r:12,t:14,b:28},cw=cssW-pad.l-pad.r,ch=cssH-pad.t-pad.b;const sets=[{key:'images',color:'#ff9500',name:'Images'},{key:'videos',color:'#32ade6',name:'Videos'},{key:'tokens',color:'#af52de',name:'Tokens'}];const all=[];sets.forEach(s=>(series[s.key]||[]).forEach(v=>all.push(Number(v)||0)));const max=Math.max(1,...all);ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1;for(let i=0;i<=4;i++){const y=pad.t+ch*(1-i/4);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(cssW-pad.r,y);ctx.stroke()}sets.forEach(s=>{const vals=(series[s.key]||[]).map(v=>Number(v)||0);if(!vals.length)return;ctx.strokeStyle=s.color;ctx.lineWidth=2.5;ctx.beginPath();vals.forEach((v,i)=>{const x=pad.l+(vals.length===1?cw/2:cw*i/(vals.length-1));const y=pad.t+ch*(1-v/max);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke()});ctx.fillStyle='rgba(255,255,255,.45)';ctx.font='10px system-ui';(labels||[]).forEach((v,i)=>{if(i===0||i===labels.length-1||labels.length<8){const x=pad.l+(labels.length===1?cw/2:cw*i/(labels.length-1));ctx.fillText(String(v),Math.max(0,x-12),cssH-8)}})}
async function savePrompt(){const r=await fetch('/api/developer/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:$('systemPromptBox').value})});const d=await r.json();$('promptSaveStatus').textContent=r.ok?'Saved to atlas_system_prompt.py':(d.error||'Save failed');setTimeout(()=>$('promptSaveStatus').textContent='',2500)}
async function toggleDeveloperMode(){if(!selectedDeveloperUser)return;const r=await fetch('/api/developer/user/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:selectedDeveloperUser,developer_mode:$('developerModeSwitch').checked})});const d=await r.json();if(!r.ok){status.textContent=d.error||'Could not update developer mode';return}await loadDeveloperOverview();await selectDeveloperUser(selectedDeveloperUser)}
async function resetSelectedPassword(){if(!selectedDeveloperUser)return;const p=window.prompt('New account password (4+ characters):');if(!p||p.length<4)return;const r=await fetch('/api/developer/user/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:selectedDeveloperUser,reset_password:true,new_password:p})});const d=await r.json();status.textContent=r.ok?'Account password reset.':(d.error||'Reset failed.')}
async function deleteSelectedUser(){if(!selectedDeveloperUser||!confirm('Delete @'+selectedDeveloperUser+' and all of this user\'s chats/media?'))return;const r=await fetch('/api/developer/user/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:selectedDeveloperUser})});const d=await r.json();if(!r.ok){status.textContent=d.error||'Delete failed';return}selectedDeveloperUser='';$('selectedDeveloperUser').textContent='None';$('devUserDetail').innerHTML='';await loadDeveloperOverview()}
async function signOutSelectedUser(){if(!selectedDeveloperUser)return;const r=await fetch('/api/developer/user/signout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:selectedDeveloperUser})});const d=await r.json();status.textContent=r.ok?'User sessions signed out.':(d.error||'Sign out failed.');await loadDeveloperOverview()}
async function loadSecurity(){const r=await fetch('/api/security');if(!r.ok)return;const d=await r.json();$('securityUsername').textContent='@'+(d.username||currentUser);$('securityPasswordView').value=d.password_mask||'••••••••';const remain=Number(d.username_change_seconds_remaining||0);if(remain>0){const days=Math.ceil(remain/86400);$('usernameSecurityHint').textContent='Username change available in '+days+' day'+(days===1?'':'s')+'.';$('changeUsernameBtn').disabled=true;$('changeUsernameBtn').title='Available after 15 days.'}else{$('usernameSecurityHint').textContent='You can change your username now. You will also need your current password.';$('changeUsernameBtn').disabled=false;$('changeUsernameBtn').title=''}$('passwordSecurityHint').textContent='Password is never displayed. Use Change password to replace it.'}
async function changeUsername(){const next=window.prompt('Enter your new username (3–32 characters):');if(next===null)return;const username=next.trim();if(!username)return;const currentPassword=window.prompt('For security, enter your current account password:');if(currentPassword===null)return;if(!currentPassword)return;const r=await fetch('/api/security/username',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,current_password:currentPassword})});const d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||'Could not change username.');return}currentUser=d.username;document.getElementById('currentUser').textContent='@'+currentUser+(currentRole==='developer'?' · developer':'');await loadChatList();await loadSecurity();status.textContent='Username changed.';setTimeout(()=>status.textContent='',1500)}
async function changePassword(){const current=window.prompt('Enter your current password:');if(current===null)return;const next=window.prompt('Enter your new password (4+ characters):');if(next===null)return;if(next.length<4){alert('New password must be at least 4 characters.');return}const r=await fetch('/api/security/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current_password:current,new_password:next})});const d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||'Could not change password.');return}await loadSecurity();status.textContent='Password changed.';setTimeout(()=>status.textContent='',1500)}
function wireBars(){document.querySelectorAll('#advancedPage .dev-bar').forEach((bar,idx)=>{if(!bar.dataset.bar)bar.dataset.bar='bar-'+idx;const b=bar.querySelector(':scope>button');if(!b)return;b.onclick=()=>{const was=bar.classList.contains('open');document.querySelectorAll('#advancedPage .dev-bar').forEach(x=>x.classList.remove('open'));if(!was){bar.classList.add('open');localStorage.setItem('atlas_last_dev_bar',bar.dataset.bar)}else{localStorage.removeItem('atlas_last_dev_bar')}}})}
function selectSettingsTab(tab){if(tab==='models'&&currentRole!=='developer')tab='theme';if(tab==='advanced'&&currentRole!=='developer')tab='theme';localStorage.setItem('atlas_last_settings_tab',tab);document.querySelectorAll('.settings-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.settings-page').forEach(p=>{const active=p.dataset.page===tab;p.classList.toggle('active',active);if(p.id==='advancedPage')p.hidden=!(currentRole==='developer'&&tab==='advanced')});const advanced=tab==='advanced'&&currentRole==='developer';document.querySelectorAll('#advancedPage .dev-bar').forEach(b=>b.classList.remove('open'));if(tab==='security')loadSecurity();if(tab==='models'&&currentRole==='developer'){renderModelSettings();loadDeveloperTtsVoices();}if(advanced){loadDeveloperOverview();loadDeveloperUsage(usageWindow);wireBars();const lastBar=localStorage.getItem('atlas_last_dev_bar');if(lastBar){const b=document.querySelector('#advancedPage .dev-bar[data-bar="'+lastBar+'"]');if(b)b.classList.add('open')}}}
async function openSettings(){openLayer('settingsLayer');await loadSettings();const adv=currentRole==='developer';const modelTab=$('modelsTab');if(modelTab)modelTab.hidden=!adv;const tab=$('advancedTab');tab.hidden=!adv;const page=$('advancedPage');page.hidden=true;const lastTab=localStorage.getItem('atlas_last_settings_tab')||'theme';selectSettingsTab(lastTab)}
(function setupChatMemoryCollapse(){const app=$('mainApp'),wrap=$('chatMemoryBarWrap'),bar=$('chatMemoryBar'),btn=$('chatMemoryToggle');if(!app||!wrap||!bar||!btn)return;const key='atlas_chat_memory_collapsed';const apply=collapsed=>{const on=!!collapsed;app.classList.toggle('chat-memory-collapsed',on);wrap.classList.toggle('collapsed',on);btn.classList.toggle('collapsed',on);btn.setAttribute('aria-expanded',String(!on));btn.setAttribute('aria-label',on?'Expand chat memory bar':'Collapse chat memory bar');btn.title=on?'Expand chat memory bar':'Collapse chat memory bar'};apply(localStorage.getItem(key)==='1');btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const next=!wrap.classList.contains('collapsed');localStorage.setItem(key,next?'1':'0');apply(next)});})();
$('toolsClose').onclick=closeTools;$('toolsSidebarBtn').onclick=openTools;$('toolsAlarmBar').onclick=()=>{$('toolsAlarmBar').classList.add('active');$('toolsAlarmPanel').classList.add('show')};$('alarmCreateBtn').onclick=()=>openAlarmEditor();$('alarmTeamAdd').onclick=addAlarmTeam;$('alarmCancelBtn').onclick=closeAlarmEditor;$('alarmSaveBtn').onclick=saveAlarm;$('alarmStopBtn').onclick=stopAlarmRing;$('alarmUseLocation').onclick=useDeviceAlarmLocation;document.querySelectorAll('[data-alarm-toggle]').forEach(b=>b.onclick=()=>alarmToggle(b.dataset.alarmToggle));$('alarmRepeat').onchange=updateAlarmConditionalFields;$('alarmLeague').onchange=()=>{ $('alarmTeamList').innerHTML=''; searchAlarmTeams() };$('alarmTeam').oninput=()=>{clearTimeout(window._alarmTeamTimer);window._alarmTeamTimer=setTimeout(()=>searchAlarmTeams(),250)};$('alarmTeam').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addAlarmTeam()}};$('alarmRingLayer').addEventListener('click',e=>{if(e.target===$('alarmRingLayer'))stopAlarmRing()});$('codeViewerClose').onclick=closeCodeViewer;$('codeViewerLayer').addEventListener('click',e=>{if(e.target===$('codeViewerLayer'))closeCodeViewer()});$('codeViewerDownload').onclick=()=>activeCodeViewer&&downloadText(activeCodeViewer.code,codeFilename(activeCodeViewer.language));$('htmlPreviewClose').onclick=closeHtmlPreview;$('htmlPreviewLayer').addEventListener('click',e=>{if(e.target===$('htmlPreviewLayer'))closeHtmlPreview()});$('htmlPreviewDownload').onclick=()=>{const code=$('htmlPreviewFrame').srcdoc||'';downloadText(code,'index.html')};$('studioClose').onclick=closeStudio;$('studioSidebarBtn').onclick=()=>openStudio();$('studioAutomationBar').onclick=()=>setStudioPanel('automation');$('studioTtsBar').onclick=()=>setStudioPanel('tts');$('ttsHistorySort').onclick=()=>{ttsHistoryNewestFirst=!ttsHistoryNewestFirst;$('ttsHistorySort').textContent=ttsHistoryNewestFirst?'New → Old':'Old → New';renderTtsHistory()};$('ttsGenerateBtn').onclick=generateStudioTts;$('ttsSpeakerSearch').oninput=e=>{ttsVoiceSearch=e.target.value;renderTtsVoices(ttsVoices)};$('ttsStudioText').addEventListener('input',()=>{const n=$('ttsStudioText').value.length;$('ttsStudioCounter').textContent=`${n} / ${TTS_MAX_CHARS}`});$('automationCreateBtn').onclick=()=>openAutomationModal();$('automationEmptyCreate').onclick=()=>openAutomationModal();$('automationSaveBtn').onclick=saveAutomationTask;document.querySelectorAll('[data-auto-dest]').forEach(b=>b.onclick=()=>setAutomationDestination(b.dataset.autoDest||'save'));$('automationRepeat').onchange=updateAutomationScheduleUi;$('automationTime').oninput=automationTimePreview;$('automationOnceDate').onchange=automationTimePreview;$('automationModalClose').onclick=closeAutomationModal;$('automationCancelBtn').onclick=closeAutomationModal;$('automationModal').addEventListener('click',e=>{if(e.target?.dataset?.closeAutomation)closeAutomationModal()});$('settingsSidebarBtn').onclick=()=>openSettings();document.querySelectorAll('.usage-window-btn').forEach(b=>b.onclick=async()=>{document.querySelectorAll('.usage-window-btn').forEach(x=>x.classList.toggle('active',x===b));await loadDeveloperUsage(b.dataset.window)});$('generationSearch')?.addEventListener('input',renderGenerationUsers);let usageResizeTimer=null;window.addEventListener('resize',()=>{clearTimeout(usageResizeTimer);usageResizeTimer=setTimeout(()=>loadDeveloperUsage(usageWindow),220)});$('boldFontSwitch').onchange=async()=>{applyTheme(settingsData?.theme?.mode||'black',settingsData?.theme?.accent||'#007aff',$('boldFontSwitch').checked);await saveThemeOnly()};$('pageReload').onclick=()=>location.reload();$('settingsClose').onclick=()=>closeLayer('settingsLayer');$('settingsLayer').addEventListener('click',e=>{if(e.target===$('settingsLayer'))closeLayer('settingsLayer')});document.querySelectorAll('.settings-tab').forEach(b=>b.onclick=()=>selectSettingsTab(b.dataset.tab));document.querySelectorAll('.theme-mode').forEach(b=>b.onclick=async()=>{const accent=settingsData?.theme?.accent||'#007aff';applyTheme(b.dataset.theme,accent);await saveThemeOnly()});window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(settingsData?.theme?.mode==='system')applyTheme('system',settingsData?.theme?.accent||'#007aff',!!settingsData?.theme?.bold_font)});async function deleteOwnAccount(){if(currentRole==='developer'){alert('The developer account cannot be deleted from this panel.');return}if(!confirm('Delete your Atlas account and ALL chats, media, jobs, memory, and stored files? This cannot be undone.'))return;const password=prompt('Enter your current account password to confirm:');if(password===null||!password)return;const r=await fetch('/api/auth/delete-account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||'Could not delete account.');return}location.reload()}
renderTtsModelChoices();$('ttsDevToggle').onclick=()=>{const box=$('ttsDevVoiceBox'),btn=$('ttsDevToggle');const open=box.classList.toggle('open');btn.textContent=open?'Collapse':'Expand';if(open)loadDeveloperTtsVoices()};$('saveProfile').onclick=saveProfile;$('deleteAccountBtn').onclick=deleteOwnAccount;$('deleteAllChatsBtn').onclick=deleteAllChats;$('memoryAddBtn').onclick=addMemory;$('clearMemoryBtn').onclick=clearAllMemory;$('changeUsernameBtn').onclick=changeUsername;$('changePasswordBtn').onclick=changePassword;$('saveSystemPrompt').onclick=savePrompt;$('saveVideoNegativePrompt').onclick=saveVideoNegativePrompt;$('saveGenerationDefaults').onclick=saveGenerationDefaults;$('developerModeSwitch').onchange=toggleDeveloperMode;$('resetSelectedPassword').onclick=resetSelectedPassword;$('deleteSelectedUser').onclick=deleteSelectedUser;$('signOutSelected').onclick=signOutSelectedUser;


$('firstProfileSave').onclick=saveFirstProfile;
document.getElementById('authSubmit')?.addEventListener('click',authSubmit);document.getElementById('authUser')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();authSubmit()}});document.getElementById('authPass')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();authSubmit()}});document.getElementById('authSwitch')?.addEventListener('click',()=>setAuthMode(!signupMode));document.getElementById('logoutBtn')?.addEventListener('click',async()=>{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});location.reload()});document.getElementById('cancelEdit')?.addEventListener('click',()=>handleModeClose());document.addEventListener('visibilitychange',async()=>{if(document.hidden&&currentUser){const id=currentJobId||sessionStorage.getItem('atlas_active_job_id');if(id){try{await fetch('/api/jobs/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_id:id}),keepalive:true})}catch{}sessionStorage.removeItem('atlas_active_job_id')}}else if(!document.hidden&&currentUser){await refreshBackgroundJobs();if(currentChatId)await openChat(currentChatId)}});window.addEventListener('pagehide',()=>{const id=currentJobId||sessionStorage.getItem('atlas_active_job_id');if(id&&currentUser){try{fetch('/api/jobs/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_id:id}),keepalive:true})}catch{}}});window.addEventListener('pageshow',async()=>{if(currentUser){await refreshBackgroundJobs();if(currentChatId)await openChat(currentChatId)}});setAuthMode(false);fetch('/api/auth/me').then(r=>r.ok?r.json():Promise.reject()).then(async d=>{currentUser=d.username;currentRole=d.role;sessionStorage.setItem('atlasUnlocked','1');await enterApp(d.username,d.role,true)}).catch(()=>{});resize();updateSummary();
})();

(function(){
  const modal=$('audioDurationModal'),minInput=$('audioMinutesInput'),secInput=$('audioSecondsInput'),valueBtn=$('audioDurationValue'),slider=$('audioDurationSlider');
  if(!modal||!minInput||!secInput||!valueBtn||!slider)return;
  const open=()=>{
    const total=Math.max(0,Math.round(Number(audioDuration)||30));
    minInput.value=String(Math.floor(total/60));secInput.value=String(total%60);
    modal.classList.add('show');modal.setAttribute('aria-hidden','false');
  };
  const close=()=>{modal.classList.remove('show');modal.setAttribute('aria-hidden','true')};
  valueBtn.addEventListener('click',open);
  $('audioDurationCancel')?.addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  const applyDuration=()=>{
    const m=Math.max(0,Math.min(10,parseInt(minInput.value||'0',10)||0));
    const sec=Math.max(0,Math.min(59,parseInt(secInput.value||'0',10)||0));
    let total=m*60+sec;if(total<10)total=10;
    audioDuration=total;slider.value=String(total);valueBtn.textContent=formatAudioDuration(total);updateSummary();close();
  };
  $('audioDurationSet')?.addEventListener('click',applyDuration);
  [minInput,secInput].forEach(input=>input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyDuration()}}));
  const oldOpen=open;
  // Keep the existing slider; the exact-time editor simply gives keyboard input as an additional option.
})();
