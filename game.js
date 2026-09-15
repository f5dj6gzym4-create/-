const TYPES = 6;
const state = { level: 1, max: +localStorage.getItem('link-match-max') || 1, board: [], selected: null, busy: false, moves: 0, collected: 0, target: 0, goalType: 0, sound: true };
const $ = id => document.getElementById(id);
const boardEl = $('board');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const levelConfig = n => ({ target: Math.min(18 + Math.floor(n * 1.15), 58), moves: Math.max(19, 29 - Math.floor(n / 6)), type: (n - 1) % TYPES });
const specials = {6:'你点亮了第一束信号光！收下这枚「好运星」，接下来消除会更闪亮。',18:'城市的灯火为你连成一线。网络满格，快乐也满格！',36:'哇，惊喜红包雨！这份小幸运，送给耐心的你。',66:'66 关全部通关！你把每一份美好都连结在了一起。'};

function rand(){ return Math.floor(Math.random()*TYPES); }
function node(i){ return state.board[i]; }
function makeBoard(){
  state.board = Array.from({length:64},()=>({type:rand(),special:false}));
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    let i=r*8+c; while(matchAt(i).length) state.board[i].type=rand();
  }
}
function matchAt(i){
  const t=node(i)?.type; if(t===undefined)return[]; const r=Math.floor(i/8),c=i%8; let a=[i],x=c-1; while(x>=0&&node(r*8+x).type===t)a.push(r*8+x--);x=c+1;while(x<8&&node(r*8+x).type===t)a.push(r*8+x++);let b=[i];x=r-1;while(x>=0&&node(x*8+c).type===t)b.push(x--*8+c);x=r+1;while(x<8&&node(x*8+c).type===t)b.push(x++*8+c);return [...(a.length>=3?a:[]),...(b.length>=3?b:[])];
}
function findMatches(){ const found=new Set(), fours=[]; for(let i=0;i<64;i++){let m=matchAt(i);if(m.length){m.forEach(x=>found.add(x));if(m.length>=4)fours.push(i)}} return {found,fours}; }
function validSwap(a,b){return Math.abs(Math.floor(a/8)-Math.floor(b/8))+Math.abs(a%8-b%8)===1}
function render(){
  boardEl.innerHTML=''; state.board.forEach((g,i)=>{const b=document.createElement('button');b.className='tile';b.dataset.i=i;b.setAttribute('aria-label','信号糖果');b.innerHTML=`<i class="gem g${g.type}${g.special?' special':''}"></i>`;if(state.selected===i)b.classList.add('selected');b.onclick=()=>pick(i);boardEl.append(b)});
  $('moves').textContent=state.moves;$('goalNow').textContent=state.collected;$('goalNeed').textContent=state.target;$('levelNo').textContent=String(state.level).padStart(2,'0');$('levelText').textContent=state.level;$('goalToken').className='target-token g'+state.goalType;$('progressFill').style.width=Math.min(100,state.collected/state.target*100)+'%';
}
async function pick(i){
  if(state.busy)return;
  if(state.selected===null){state.selected=i;render();return}
  let a=state.selected; state.selected=null;
  if(a===i){render();return} if(!validSwap(a,i)){state.selected=i;render();return}
  state.busy=true; [state.board[a],state.board[i]]=[state.board[i],state.board[a]];render();await sleep(120);
  if(!findMatches().found.size){[state.board[a],state.board[i]]=[state.board[i],state.board[a]];render();toast('这里还连不上，换个方向试试');state.busy=false;return}
  state.moves--; await resolve(); state.busy=false;
  if(state.collected>=state.target) win(); else if(state.moves<=0) lose();
}
async function resolve(){
  let chain=0; while(true){const {found,fours}=findMatches();if(!found.size)break;chain++;const hit=[...found];
    hit.forEach(i=>{const el=boardEl.querySelector(`[data-i="${i}"]`);if(el)el.classList.add('pop')});await sleep(220);
    const born=fours.find(i=>found.has(i)); let expanded=new Set(hit);
    hit.filter(i=>state.board[i].special).forEach(i=>{let r=Math.floor(i/8),c=i%8;for(let x=0;x<8;x++){expanded.add(r*8+x);expanded.add(x*8+c)}});
    expanded.forEach(i=>{if(state.board[i].type===state.goalType)state.collected++});
    expanded.forEach(i=>state.board[i]=null);
    for(let c=0;c<8;c++){let keep=[];for(let r=7;r>=0;r--){let g=state.board[r*8+c];if(g)keep.push(g)}for(let r=7,k=0;r>=0;r--,k++)state.board[r*8+c]=keep[k]||{type:rand(),special:false}}
    if(born!==undefined){let dest=born;state.board[dest].special=true;toast('连结增强器已生成：消除它可清除十字信号！')}
    render(); if(chain>1)toast(`连结 × ${chain}，太漂亮了！`); await sleep(200);
  }
}
function start(n){state.level=n;const c=levelConfig(n);state.moves=c.moves;state.target=c.target;state.collected=0;state.goalType=c.type;state.selected=null;makeBoard();$('mapScreen').classList.add('hidden');$('gameScreen').classList.remove('hidden');render();}
function win(){state.max=Math.max(state.max,Math.min(66,state.level+1));localStorage.setItem('link-match-max',state.max);const surprise=specials[state.level];showModal(surprise?'惊喜已抵达！':'通关成功！',surprise||`第 ${state.level} 关完成。每一步连结，都让快乐更靠近。`,state.level===66?'再次体验':'下一关',()=>state.level===66?start(1):start(state.level+1));}
function lose(){showModal('再试一次',`还差 ${state.target-state.collected} 个信号糖果。别急，你已经很接近了！`,'重新挑战',()=>start(state.level));}
function showModal(title,text,primary,fn){$('modalTitle').textContent=title;$('modalText').textContent=text;$('modalPrimary').textContent=primary;$('modalKicker').textContent=title.includes('惊喜')?'联通小惊喜':'连结时刻';$('modal').classList.remove('hidden');$('modalPrimary').onclick=()=>{$('modal').classList.add('hidden');fn()};$('modalSecondary').onclick=()=>{$('modal').classList.add('hidden');showMap()};}
function showMap(){state.selected=null;$('gameScreen').classList.add('hidden');$('mapScreen').classList.remove('hidden');drawMap();}
function drawMap(){const map=$('levelMap');map.innerHTML='';for(let n=1;n<=66;n++){const b=document.createElement('button');b.className='level-node '+(n<state.max?'done':n===state.max?'current':'locked')+(specials[n]?' special':'');b.style.top=(16+(n-1)*78)+'px';b.textContent=n<state.max?'✓':n;b.disabled=n>state.max;b.onclick=()=>start(n);map.append(b)}map.style.transform=`translateY(-${Math.max(0,(state.max-7)*78)}px)`;}
function toast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),1900)}
$('continueBtn').onclick=()=>start(state.max);$('homeBtn').onclick=showMap;$('hintBtn').onclick=()=>{if(state.busy)return;for(let i=0;i<64;i++)for(let j=i+1;j<64;j++)if(validSwap(i,j)){[state.board[i],state.board[j]]=[state.board[j],state.board[i]];let ok=findMatches().found.size;[state.board[i],state.board[j]]=[state.board[j],state.board[i]];if(ok){boardEl.querySelector(`[data-i="${i}"]`).classList.add('hint');boardEl.querySelector(`[data-i="${j}"]`).classList.add('hint');toast('试试这两个信号糖果');return}}};$('soundBtn').onclick=()=>{state.sound=!state.sound;$('soundBtn').textContent=state.sound?'♪':'×';toast(state.sound?'音效已开启':'音效已关闭')};drawMap();
