(function(){
'use strict';

/* ---------- 상수 ---------- */
var PRICE = 1000;
var VERSION = '0.1';
var MAX_MEDIA = 10;
var MAX_VIDEO_SEC = 61;
var MAX_VIDEO_BYTES = 250 * 1024 * 1024;
var NOSHOW_LIMIT = 3;
var BANNED = ['주류','담배·전자담배','의약품·건강기능식품','콘택트렌즈·도수 안경','의료기기','마약류','반려동물(무료분양 포함)','조리·개봉한 식품','화장품 샘플','해외 직구로 산 물건','종량제 봉투','위조품·가품','성인용품','무기·위험물','계정·개인정보'];
var RULES = [
  '위치를 확인한 가까운 동네 이웃과 거래해요.',
  '공개된 장소에서, 밝을 때 만나요. 역 출구나 주민센터·편의점 앞이 좋아요.',
  '물건을 직접 보고 그 자리에서 천 원을 건네요. 미리 돈을 보내지 마세요.',
  '전화번호·메신저 아이디·계좌를 먼저 묻거나 앱 밖으로 가자는 사람은 조심하세요.',
  '약속을 안 지키면 매너온도가 내려가고, '+NOSHOW_LIMIT+'번이면 일주일 동안 원해요를 누를 수 없어요.',
  '택배가 필요하면 택배비는 착불로 받는 사람이 내요. 물건값 천 원은 물건을 받고 나서 보내요.'
];
var GOOD_TAGS = ['시간 약속을 잘 지켜요','친절해요','설명과 물건 상태가 같아요','답장이 빨라요'];
var BAD_TAGS = ['약속 시간에 늦었어요','설명과 물건이 달라요','불친절해요','연락이 잘 안 돼요'];
/* 연락처·계좌·외부 메신저: 전화번호, 하이픈 없는 계좌, 은행 계좌 형식, 메신저·송금 표현 (날짜·텔레비전·토스터·페이지는 안 걸리게) */
var RISK = /(01[016789][\s.\-]?\d{3,4}[\s.\-]?\d{4})|(^|\D)\d{10,14}(?!\d)|(^|\D)\d{2,6}-\d{2,6}-\d{3,8}(?!\d)|(카톡|카카오톡|카카오\s?(페이|아이디|id)|오픈\s?(톡|채팅)|텔레그램|텔레\s?(아이디|id)|telegram|kakao|wechat|위챗|라인\s?(아이디|id)|line\s?id|인스타\s?(아이디|id|디엠|dm)|디엠|\bdm\b|계좌|입금|송금|이체|토스\s?(로|으로|페이|아이디|id)|페이\s?(로|으로)|@[a-z0-9_.]{3,})/i;
function risky(s){ return RISK.test(String(s).replace(/(?:19|20)\d{2}-(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\d|3[01])(?!\d)/g, ' ')); }

/* ---------- 작은 도구 ---------- */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function won(n){ return Number(n).toLocaleString('ko-KR') + '원'; }
function ago(ts){
  var s = Math.max(0, (Date.now() - ts) / 1000);
  if(s < 60) return '방금 전';
  if(s < 3600) return Math.floor(s / 60) + '분 전';
  if(s < 86400) return Math.floor(s / 3600) + '시간 전';
  if(s < 86400 * 7) return Math.floor(s / 86400) + '일 전';
  var d = new Date(ts); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
}
function clock(ts){ var d = new Date(ts), h = d.getHours(), m = d.getMinutes(); return (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m; }
function initial(n){ return esc(String(n || '?').trim().charAt(0) || '?'); }
function tempColor(t){ return t >= 40 ? 'var(--temp-hot)' : (t >= 37 ? 'var(--temp-warm)' : 'var(--temp-cold)'); }
function clampTemp(t){ return Math.round(Math.max(0, Math.min(99, t)) * 10) / 10; }
function svgURI(s){ return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); }

var ICON = {
  home:'<path d="M3.5 10.6L12 3.8l8.5 6.8V19a1.6 1.6 0 0 1-1.6 1.6H15v-6.2H9v6.2H5.1A1.6 1.6 0 0 1 3.5 19z"/>',
  homeF:'<path class="f" d="M12 3.2l9 7.2V19.2c0 1.2-1 2.1-2.1 2.1h-4.6v-6.6H9.7v6.6H5.1c-1.2 0-2.1-1-2.1-2.1v-8.8z"/>',
  play:'<rect x="3" y="3" width="18" height="18" rx="5.5"/><path d="M10 8.6v6.8l5.6-3.4z"/>',
  playF:'<path class="f" d="M8.5 2.6h7A5.9 5.9 0 0 1 21.4 8.5v7a5.9 5.9 0 0 1-5.9 5.9h-7a5.9 5.9 0 0 1-5.9-5.9v-7A5.9 5.9 0 0 1 8.5 2.6zm1.4 5.4v8l6.4-4z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  user:'<circle cx="12" cy="8.2" r="4"/><path d="M4.2 20.4c1.4-3.7 4.3-5.4 7.8-5.4s6.4 1.7 7.8 5.4"/>',
  userF:'<path class="f" d="M12 3.6a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2zM3.4 20.2C4.9 16.2 8.1 14.3 12 14.3s7.1 1.9 8.6 5.9c.2.6-.2 1.2-.9 1.2H4.3c-.6 0-1.1-.6-.9-1.2z"/>',
  heart:'<path d="M12 20.3s-8.3-4.9-8.3-11A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.3 2.7c0 6.1-8.3 11-8.3 11z"/>',
  heartF:'<path class="f" d="M12 20.9c-.2 0-.4-.1-.5-.2C11.1 20.5 2.8 15.5 2.8 9.3a5.4 5.4 0 0 1 9.2-3.8 5.4 5.4 0 0 1 9.2 3.8c0 6.2-8.3 11.2-8.7 11.4-.1.1-.3.2-.5.2z"/>',
  chat:'<path d="M20.6 11.6a8.2 8.2 0 0 1-12 7.3L3.6 20.3l1.5-4.6a8.2 8.2 0 1 1 15.5-4.1z"/>',
  send:'<path d="M21 3L10.3 13.7M21 3l-6.5 18-4.2-7.3L3 9.5z"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  more:'<circle cx="5.5" cy="12" r="1.3" class="f"/><circle cx="12" cy="12" r="1.3" class="f"/><circle cx="18.5" cy="12" r="1.3" class="f"/>',
  camera:'<path d="M4 8h3.2l1.6-2.6h6.4L16.8 8H20a1 1 0 0 1 1 1v9.6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.6" r="3.6"/>',
  video:'<rect x="2.8" y="6" width="13" height="12" rx="2.6"/><path d="M15.8 10.2l5.4-3v9.6l-5.4-3"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="1.8"/><path d="M3.6 17l5-4.6 4 3.6 2.6-2.2 5.2 4.6"/>',
  check:'<path d="M5 12.5l4.6 4.6L19.5 7"/>',
  shield:'<path d="M12 3l7.5 3v5.6c0 4.6-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.3-7.5-9.9V6z"/><path d="M8.8 12.2l2.3 2.3 4.3-4.6"/>',
  pin:'<path d="M12 21s-6.6-6-6.6-11.2a6.6 6.6 0 0 1 13.2 0C18.6 15 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
  truck:'<path d="M2.8 6.5h11v9.8h-11zM13.8 10h4.3l3 3.3v3H13.8"/><circle cx="7" cy="17.6" r="1.8"/><circle cx="17.4" cy="17.6" r="1.8"/>',
  hand:'<path d="M7 12.5V6.8a1.5 1.5 0 0 1 3 0v4.7M10 11V5.3a1.5 1.5 0 0 1 3 0V11M13 11.2V6.6a1.5 1.5 0 0 1 3 0V13M16 9.6a1.5 1.5 0 0 1 3 0v4.6a6.8 6.8 0 0 1-6.8 6.8h-1A6.2 6.2 0 0 1 6 18.6l-2.3-3.7a1.5 1.5 0 0 1 2.5-1.6L7 14.6"/>',
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.3 10.5V7.8a3.7 3.7 0 0 1 7.4 0v2.7"/>',
  grid:'<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17"/>',
  done:'<circle cx="12" cy="12" r="8.8"/><path d="M8.2 12.3l2.6 2.6 5-5.3"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  trash:'<path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 13h9l1-13"/>',
  soundOff:'<path d="M4 9.5h3.5L12 5.6v12.8l-4.5-3.9H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  soundOn:'<path d="M4 9.5h3.5L12 5.6v12.8l-4.5-3.9H4z"/><path d="M15.5 9a4.3 4.3 0 0 1 0 6M18.2 6.6a7.8 7.8 0 0 1 0 10.8"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.4"/><path d="M3.5 9.6h17M8 3v4M16 3v4"/>',
  info:'<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.5M12 7.8v.01"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M3 3l18 18M10.6 5.6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.9M6.6 6.7C3.9 8.5 2.5 12 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.4-1.1"/>',
  edit:'<path d="M4 20h4.5L19.3 9.2a2.1 2.1 0 0 0 0-3l-1.5-1.5a2.1 2.1 0 0 0-3 0L4 15.5z"/><path d="M13.5 6.5l4 4"/>',
  location:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/><circle cx="12" cy="12" r="7"/>'
};
function ic(n, cls){
  var p = ICON[n] || '';
  var fill = /^<path class="f"/.test(p);
  return '<svg class="ic' + (fill ? ' f' : '') + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
}

/* ---------- 저장: 이 휴대폰의 IndexedDB (글·대화는 kv, 사진·영상은 media) ---------- */
var DBP = null;
function db(){
  if(DBP) return DBP;
  DBP = new Promise(function(res){
    try{
      var r = indexedDB.open('cheonshop', 1);
      r.onupgradeneeded = function(){ var d = r.result; if(!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if(!d.objectStoreNames.contains('media')) d.createObjectStore('media'); };
      r.onsuccess = function(){ res(r.result); };
      r.onerror = function(){ res(null); };
    }catch(e){ res(null); }
  });
  return DBP;
}
function idbGet(store, key){
  return db().then(function(d){
    if(!d) return null;
    return new Promise(function(res){ try{ var q = d.transaction(store).objectStore(store).get(key); q.onsuccess = function(){ res(q.result == null ? null : q.result); }; q.onerror = function(){ res(null); }; }catch(e){ res(null); } });
  });
}
function idbPut(store, key, val){
  return db().then(function(d){
    if(!d) return false;
    return new Promise(function(res){ try{ var t = d.transaction(store, 'readwrite'); t.objectStore(store).put(val, key); t.oncomplete = function(){ res(true); }; t.onerror = t.onabort = function(){ res(false); }; }catch(e){ res(false); } });
  });
}
function idbDel(store, key){
  return db().then(function(d){
    if(!d) return;
    return new Promise(function(res){ try{ var t = d.transaction(store, 'readwrite'); t.objectStore(store).delete(key); t.oncomplete = t.onerror = t.onabort = function(){ res(); }; }catch(e){ res(); } });
  });
}
function idbClear(){
  return db().then(function(d){
    if(!d) return;
    return new Promise(function(res){ try{ var t = d.transaction(['kv','media'], 'readwrite'); t.objectStore('kv').clear(); t.objectStore('media').clear(); t.oncomplete = t.onerror = t.onabort = function(){ res(); }; }catch(e){ res(); } });
  });
}

/* ---------- 상태 ---------- */
function freshState(){
  return {v:1, me:{nick:'', town:'', verified:false, verifiedTown:'', verifiedAt:0, lat:null, lng:null, temp:36.5, avatar:null, noShows:0, blockedUntil:0},
    posts:[], chats:[], flags:{onboarded:false, safetyAgreed:false, samples:true, seeded:false}};
}
var ST = freshState();
var UI = {draft:null, gtab:'sell', filter:'all', muted:true, onb:0, sheetData:{}, riskArmed:null, locating:false, chatDraft:{}, afterPop:null, sbDark:null, upOpen:false};
/* 데이터가 바뀔 때마다 올라가는 번호. 아래에 깔린 화면이 다시 드러날 때 이 번호로 낡았는지 본다 */
var REV = 0;
var saveTimer = null;
function save(){
  REV++;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){
    idbPut('kv', 'state', JSON.stringify(ST)).then(function(ok){
      if(!ok){ try{ localStorage.setItem('cheonshop.state', JSON.stringify(ST)); }catch(e){ toast('저장 공간이 부족해요. 영상이나 사진을 줄여 주세요.'); } }
    });
  }, 250);
}
/* 위치 확인 배지는 확인할 때 적었던 동네와 지금 동네가 같을 때만 */
function townOK(){ return !!(ST.me.verified && ST.me.town && ST.me.verifiedTown === ST.me.town); }
function postById(id){ for(var i = 0; i < ST.posts.length; i++){ if(ST.posts[i].id === id) return ST.posts[i]; } return null; }
function chatById(id){ for(var i = 0; i < ST.chats.length; i++){ if(ST.chats[i].id === id) return ST.chats[i]; } return null; }
function chatForPost(pid){ for(var i = 0; i < ST.chats.length; i++){ if(ST.chats[i].postId === pid) return ST.chats[i]; } return null; }
function liveChats(){ return ST.chats.filter(function(c){ return !c.left; }); }
function visiblePosts(){
  return ST.posts.filter(function(p){
    if(p.hidden || p.status === 'done') return false;
    if(p.sample && !ST.flags.samples) return false;
    if(UI.filter === 'ship' && !p.ship) return false;
    if(UI.filter === 'new' && p.cond !== 'new') return false;
    if(UI.filter === 'used' && p.cond !== 'used') return false;
    return true;
  }).sort(function(a, b){ return b.at - a.at; });
}
function seedSamples(){
  if(ST.flags.seeded || !window.CHEON_SAMPLES) return;
  var now = Date.now(), town = ST.me.town || '우리 동네';
  window.CHEON_SAMPLES.forEach(function(x){
    ST.posts.push({id:'s-' + x.key, mine:false, sample:true, seller:{nick:x.seller.nick, temp:x.seller.temp, town:town, verified:true},
      title:x.title, desc:x.desc, cond:x.cond, ship:x.ship, place:x.place, media:[{kind:'svg', svg:x.svg, bg:x.bg}],
      likes:x.likes, liked:false, wants:x.wants, wanted:false, status:'selling', at:now - x.ago});
  });
  ST.flags.seeded = true;
}

/* ---------- 사진·영상 주소 (필요할 때 IndexedDB에서 꺼낸다) ---------- */
var URLS = {}, LOADING = {};
function mediaURL(id){
  if(!id) return '';
  if(URLS[id]) return URLS[id];
  if(!LOADING[id]){
    LOADING[id] = true;
    idbGet('media', id).then(function(b){
      if(!b) return;
      URLS[id] = URL.createObjectURL(b);
      Array.prototype.forEach.call(document.querySelectorAll('[data-mid="' + id + '"]'), function(el){ el.src = URLS[id]; if(el.tagName === 'VIDEO') syncVideo(el); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-poster="' + id + '"]'), function(el){ el.poster = URLS[id]; });
    });
  }
  return '';
}
function srcAttr(id){ var u = mediaURL(id); return u ? ' src="' + u + '"' : ''; }
function mediaHTML(m, mode){
  if(!m) return '<div class="ill"></div>';
  if(m.kind === 'svg') return '<div class="ill" style="--bg-ill:' + esc(m.bg || '#F1EEE8') + '"><img src="' + svgURI(m.svg) + '" alt="" draggable="false"></div>';
  if(m.kind === 'image') return '<img class="ph" data-mid="' + esc(m.id) + '"' + srcAttr(m.id) + ' alt="" draggable="false">';
  if(m.kind === 'video'){
    if(mode === 'thumb') return m.poster ? '<img class="ph" data-mid="' + esc(m.poster) + '"' + srcAttr(m.poster) + ' alt="" draggable="false">' : '<div class="ill" style="--bg-ill:#222"></div>';
    var pu = m.poster ? mediaURL(m.poster) : '';
    return '<video data-mid="' + esc(m.id) + '"' + srcAttr(m.id) + (m.poster ? ' data-poster="' + esc(m.poster) + '"' + (pu ? ' poster="' + pu + '"' : '') : '') + (UI.muted ? ' muted' : '') + ' loop playsinline preload="metadata"></video>';
  }
  return '<div class="ill"></div>';
}

/* ---------- 영상 자동 재생: 화면에 60% 이상 보이고 맨 위 화면일 때만 ---------- */
var IO = ('IntersectionObserver' in window) ? new IntersectionObserver(function(es){
  es.forEach(function(e){ e.target._vis = e.intersectionRatio >= 0.6; syncVideo(e.target); });
}, {threshold:[0, 0.6, 1]}) : null;
function topLayer(){ var o = document.querySelectorAll('#overs > .layer'); return o.length ? o[o.length - 1] : document.getElementById('tab-' + NAV.tab); }
function syncVideo(v){
  var layer = v.closest('.layer');
  var active = layer && !layer.hidden && layer === topLayer() && !NAV.sheet && !document.hidden && ST.flags.onboarded;
  v.muted = UI.muted;
  if(v._vis && active && v.src){ var p = v.play(); if(p && p.catch) p.catch(function(){}); }
  else if(!v.paused) v.pause();
}
function watchVideos(root){ if(!IO) return; Array.prototype.forEach.call(root.querySelectorAll('video'), function(v){ IO.observe(v); }); }
function syncAllVideos(){ Array.prototype.forEach.call(document.querySelectorAll('video'), syncVideo); }
document.addEventListener('visibilitychange', syncAllVideos);

/* ---------- 화면 이동: 안드로이드 뒤로 가기와 맞추려고 history를 쓴다 ---------- */
var NAV = {tab:'home', stack:[], sheet:null};
function navTo(next, replace){
  NAV = clone(next);
  try{ if(replace) history.replaceState(clone(NAV), ''); else history.pushState(clone(NAV), ''); }catch(e){}
  apply();
}
/* 지워지거나 숨긴 물건, 나간 채팅은 뒤로 가기로 다시 나오지 않게 뺀다 */
function sanitizeNav(){
  var before = JSON.stringify(NAV);
  NAV.stack = NAV.stack.filter(function(v){
    if(v.v === 'item'){ var p = postById(v.id); return !!(p && !p.hidden); }
    if(v.v === 'chat'){ var c = chatById(v.id); return !!(c && !c.left); }
    return true;
  });
  if(NAV.sheet && NAV.sheet.id){
    var k = NAV.sheet.k;
    if((k === 'postMenu' || k === 'report' || k === 'safety') && !postById(NAV.sheet.id)) NAV.sheet = null;
    else if((k === 'appt' || k === 'review' || k === 'noShow' || k === 'chatMenu') && !chatById(NAV.sheet.id)) NAV.sheet = null;
  }
  return JSON.stringify(NAV) !== before;
}
window.addEventListener('popstate', function(e){
  var ap = UI.afterPop; UI.afterPop = null;
  if(ap){
    /* popTo: 바뀐 첫 화면까지 돌아간 뒤 나머지 기록을 새로 쌓는다 */
    var s = {tab:ap.t.tab, stack:ap.t.stack.slice(0, ap.i), sheet:null};
    try{
      history.replaceState(clone(s), '');
      for(var j = ap.i; j < ap.t.stack.length; j++){ s.stack.push(ap.t.stack[j]); history.pushState(clone(s), ''); }
    }catch(x){}
    NAV = clone(s);
    apply();
    if(ap.fn) ap.fn();
    return;
  }
  NAV = e.state && e.state.stack ? clone(e.state) : {tab:'home', stack:[], sheet:null};
  if(sanitizeNav()){ try{ history.replaceState(clone(NAV), ''); }catch(x){} }
  apply();
});
function push(view){ var n = clone(NAV); n.stack.push(view); n.sheet = null; navTo(n); }
function back(){ history.back(); }
/* 목표 상태로 돌아간다. 같은 앞부분은 두고, 달라진 기록은 history.go로 걷어낸 뒤 다시 쌓는다 */
function popTo(target, fn){
  var i = 0;
  while(i < target.stack.length && i < NAV.stack.length && keyOf(target.stack[i]) === keyOf(NAV.stack[i])) i++;
  var k = (NAV.sheet ? 1 : 0) + (NAV.stack.length - i);
  if(k <= 0){ navTo({tab:target.tab, stack:target.stack, sheet:null}, true); if(fn) fn(); return; }
  UI.afterPop = {t:clone(target), i:i, fn:fn || null};
  history.go(-k);
}
/* 이미 열려 있는 화면이면 새로 쌓지 않고 그 화면까지 돌아간다 */
function openView(view){
  var key = keyOf(view);
  for(var i = 0; i < NAV.stack.length; i++){
    if(keyOf(NAV.stack[i]) === key){
      var k = (NAV.sheet ? 1 : 0) + (NAV.stack.length - 1 - i);
      if(k > 0) history.go(-k);
      return;
    }
  }
  if(NAV.sheet) sheetThen(view); else push(view);
}
function setTab(t){
  if(NAV.tab === t && !NAV.stack.length && !NAV.sheet){ var l = document.getElementById('tab-' + t); if(l) l.scrollTo({top:0, behavior:'smooth'}); return; }
  navTo({tab:t, stack:[], sheet:null}, true);
}
function openSheet(s){ var n = clone(NAV); n.sheet = s; navTo(n, !!NAV.sheet); }
function closeSheet(){ if(NAV.sheet) history.back(); }
/* 시트에서 바로 다른 화면으로 넘어갈 때: 시트 기록을 새 화면으로 바꾼다 */
function sheetThen(view){ var n = clone(NAV); n.sheet = null; if(view) n.stack.push(view); navTo(n, true); }

/* ---------- 안드로이드: 뒤로 가기 버튼, 상태 표시줄 색 ---------- */
var CAP = window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins : null;
function nativeCall(plugin, method, opts){
  try{ var f = CAP && CAP[plugin] && CAP[plugin][method]; if(!f) return; var r = f(opts || {}); if(r && r.catch) r.catch(function(){}); }catch(e){}
}
function onBackButton(){
  if(!ST.flags.onboarded){
    if(UI.onb > 0){ syncOnbInputs(); UI.onb = 0; renderOnboard(); } else nativeCall('App', 'minimizeApp');
    return;
  }
  if(UI.afterPop) return;
  if(NAV.sheet){ closeSheet(); return; }
  if(NAV.stack.length){ back(); return; }
  if(NAV.tab !== 'home'){ setTab('home'); return; }
  nativeCall('App', 'minimizeApp');
}
if(CAP && CAP.App && CAP.App.addListener){ try{ CAP.App.addListener('backButton', onBackButton); }catch(e){} }
/* 쇼츠 탭은 검은 화면이라 상태 표시줄 아이콘을 흰색으로 */
function syncSystemBars(){
  if(!CAP || !CAP.SystemBars) return;
  var dark = !!(ST.flags.onboarded && NAV.tab === 'shorts' && !NAV.stack.length);
  if(dark === UI.sbDark) return;
  UI.sbDark = dark;
  nativeCall('SystemBars', 'setStyle', {style:dark ? 'DARK' : 'DEFAULT'});
}

var DIRTY = {home:true, shorts:true, me:true};
function dirtyTabs(){ DIRTY.home = DIRTY.shorts = DIRTY.me = true; }
function apply(){
  var app = document.getElementById('app');
  if(!ST.flags.onboarded){ renderOnboard(); return; }
  if(!document.getElementById('tab-home')) buildShell();
  ['home','shorts','me'].forEach(function(t){
    var l = document.getElementById('tab-' + t);
    var show = NAV.tab === t;
    if(show && DIRTY[t]){ var st = l.scrollTop; renderTab(t); DIRTY[t] = false; l.scrollTop = st; }
    l.hidden = !show;
  });
  renderTabbar();
  reconcileOverlays();
  renderSheet();
  syncAllVideos();
  syncSystemBars();
  var upOpen = NAV.stack.some(function(v){ return v.v === 'upload'; });
  if(UI.draft && upOpen !== UI.upOpen){ UI.upOpen = upOpen; persistDraft(); }
  app.setAttribute('data-ready', '1');
}
function buildShell(){
  document.getElementById('app').innerHTML = '<main class="layer tab-layer" id="tab-home"></main><main class="layer tab-layer" id="tab-shorts"></main><main class="layer tab-layer" id="tab-me"></main><nav class="tabbar" id="tabbar" aria-label="메뉴"></nav><div id="overs"></div><div id="sheet"></div>';
}
function renderTabbar(){
  var tb = document.getElementById('tabbar');
  var dark = NAV.tab === 'shorts';
  tb.className = 'tabbar' + (dark ? ' dark' : '');
  tb.hidden = NAV.stack.length > 0;
  var T = [['home','home','홈'],['shorts','play','쇼츠'],['add','plus','올리기'],['me','user','나']];
  tb.innerHTML = T.map(function(x){
    if(x[0] === 'add') return '<button data-act="upload" aria-label="물건 올리기"><span class="add-ic">' + ic('plus') + '</span></button>';
    var on = NAV.tab === x[0];
    return '<button data-act="tab" data-tab="' + x[0] + '" aria-label="' + x[2] + '"' + (on ? ' aria-current="page"' : '') + '>' + ic(on ? x[1] + 'F' : x[1]) + '</button>';
  }).join('');
}
function keyOf(v){ return v.v + ':' + (v.id || ''); }
function reconcileOverlays(){
  var host = document.getElementById('overs');
  var els = Array.prototype.slice.call(host.children);
  var i = 0;
  for(; i < NAV.stack.length && i < els.length; i++){ if(els[i].getAttribute('data-key') !== keyOf(NAV.stack[i])) break; }
  for(var j = els.length - 1; j >= i; j--){ els[j].remove(); }
  /* 위 화면을 걷어내 다시 드러난 화면이 그사이 바뀐 데이터를 보여 주게 한다 */
  if(i > 0 && i === NAV.stack.length){ var top = host.lastElementChild; if(top && top._rev !== REV) rerenderLayer(top, NAV.stack[i - 1]); }
  for(; i < NAV.stack.length; i++){
    var el = document.createElement('section');
    el.className = 'layer over in';
    el.setAttribute('data-key', keyOf(NAV.stack[i]));
    host.appendChild(el);
    renderOverlay(el, NAV.stack[i]);
  }
}
function rerenderLayer(el, v){
  var st = scroller(el).scrollTop;
  renderOverlay(el, v);
  if(v.v !== 'chat') scroller(el).scrollTop = st;
}
function refreshTop(){
  var host = document.getElementById('overs');
  var el = host && host.lastElementChild;
  if(el && NAV.stack.length) rerenderLayer(el, NAV.stack[NAV.stack.length - 1]);
}
function refreshAll(){
  dirtyTabs();
  var t = document.getElementById('tab-' + NAV.tab);
  if(t){ var st = t.scrollTop; renderTab(NAV.tab); DIRTY[NAV.tab] = false; t.scrollTop = st; }
  var host = document.getElementById('overs');
  Array.prototype.forEach.call(host ? host.children : [], function(el, i){ if(NAV.stack[i]) rerenderLayer(el, NAV.stack[i]); });
  syncAllVideos();
}
var toastTimer;
function toast(m){
  var t = document.getElementById('toast'); if(!t) return;
  t.innerHTML = '<div class="toast" role="status">' + esc(m) + '</div>';
  clearTimeout(toastTimer); toastTimer = setTimeout(function(){ t.innerHTML = ''; }, 2800);
}

/* ---------- 탭 화면 ---------- */
function renderTab(t){
  var l = document.getElementById('tab-' + t);
  if(t === 'home') l.innerHTML = homeHTML();
  if(t === 'shorts') l.innerHTML = shortsHTML();
  if(t === 'me') l.innerHTML = meHTML();
  watchVideos(l);
}
function unreadCount(){ return liveChats().reduce(function(s, c){ return s + (c.unread || 0); }, 0); }
function countsText(p){ return '찜 ' + p.likes + ' · 원해요 ' + p.wants + '명'; }
function homeHTML(){
  var posts = visiblePosts(), me = ST.me;
  var F = [['all','전체'],['new','새것'],['used','중고'],['ship','택배 가능']];
  var h = '<header class="bar"><div class="wm grow">천샵<small>1,000</small></div>'
    + '<button class="ib" data-act="gtabLiked" aria-label="찜한 물건">' + ic('heart') + '</button>'
    + '<button class="ib" data-act="chats" aria-label="채팅">' + ic('send') + (unreadCount() ? '<span class="dot"></span>' : '') + '</button></header>'
    + '<div class="town">' + ic('pin', 'xs') + '<button data-act="editProfile"><b>' + esc(me.town || '우리 동네') + '</b></button>'
    + (townOK() ? '<span class="verified">' + ic('check', 'xs') + '위치 확인</span>' : '<button data-act="verify" class="muted">' + (UI.locating ? '확인 중…' : '위치 확인하기') + '</button>')
    + '<span class="grow"></span><span>모든 물건 ' + won(PRICE) + '</span></div>'
    + '<div class="chips" role="group" aria-label="보기">' + F.map(function(f){ return '<button class="chip" data-act="filter" data-f="' + f[0] + '" aria-pressed="' + (UI.filter === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>';
  if(!posts.length){
    return h + '<div class="empty">' + ic('image') + '<b>아직 올라온 물건이 없어요</b><p>안 쓰는 물건을 사진이나 쇼츠로 찍어 천 원에 올려 보세요.</p><button class="btn" data-act="upload">' + ic('plus', 'sm') + '물건 올리기</button></div>';
  }
  return h + '<div class="feed">' + posts.map(postHTML).join('') + '</div><p class="end">동네 물건을 모두 봤어요</p>';
}
function sellerName(p){ return p.mine ? (ST.me.nick || '나') : p.seller.nick; }
function sellerAv(p){
  if(p.mine && ST.me.avatar){ return '<span class="av"><img data-mid="' + esc(ST.me.avatar) + '"' + srcAttr(ST.me.avatar) + ' alt=""></span>'; }
  return '<span class="av">' + initial(sellerName(p)) + '</span>';
}
function sellerTemp(p){ return p.mine ? ST.me.temp : p.seller.temp; }
function postHTML(p){
  var n = p.media.length, isVideo = p.media[0] && p.media[0].kind === 'video';
  var slides = p.media.map(function(m){ return '<div class="slide" data-act="openItem" data-id="' + esc(p.id) + '">' + mediaHTML(m, 'feed') + '</div>'; }).join('');
  return '<article class="post" id="post-' + esc(p.id) + '">'
    + '<header class="post-h">' + sellerAv(p) + '<div class="who grow"><b>' + esc(sellerName(p)) + (p.sample ? ' <span class="muted" style="font-weight:500">· 예시</span>' : '') + '</b><small>' + esc((p.mine ? ST.me.town : p.seller.town) || '') + ' · ' + ago(p.at) + '</small></div>'
    + '<button class="ib" data-act="postMenu" data-id="' + esc(p.id) + '" aria-label="더 보기">' + ic('more') + '</button></header>'
    + '<div class="media"><div class="track" data-pager="' + esc(p.id) + '">' + slides + '</div>'
    + '<span class="tag tl">' + (p.cond === 'new' ? '새것' : '중고') + '</span>'
    + (n > 1 ? '<span class="pager" data-pager-label="' + esc(p.id) + '">1/' + n + '</span>' : (isVideo ? '<span class="vbadge">' + ic('video', 'sm') + '</span>' : ''))
    + (p.ship ? '<span class="tag bl">' + ic('truck', 'xs') + ' 택배 가능</span>' : '')
    + (isVideo ? '<button class="mute" data-act="mute" aria-label="' + (UI.muted ? '소리 켜기' : '소리 끄기') + '">' + ic(UI.muted ? 'soundOff' : 'soundOn') + '</button>' : '')
    + (p.status === 'reserved' ? '<div class="status-veil">예약중</div>' : '')
    + '</div>'
    + '<div class="acts"><button class="ib' + (p.liked ? ' liked' : '') + '" data-act="like" data-id="' + esc(p.id) + '" aria-pressed="' + !!p.liked + '" aria-label="찜">' + ic(p.liked ? 'heartF' : 'heart') + '</button>'
    + '<button class="ib" data-act="ask" data-id="' + esc(p.id) + '" aria-label="판매자에게 묻기">' + ic('chat') + '</button>'
    + (p.mine ? '<span class="want done">내 물건</span>' : '<button class="want' + (p.wanted ? ' done' : '') + '" data-act="want" data-id="' + esc(p.id) + '">' + (p.wanted ? '원해요 보냄' : '원해요 <small>' + won(PRICE) + '</small>') + '</button>') + '</div>'
    + '<p class="counts" data-counts="' + esc(p.id) + '">' + countsText(p) + '</p>'
    + '<p class="cap" data-act="openItem" data-id="' + esc(p.id) + '"><span class="t">' + esc(p.title) + '</span>' + (p.desc ? ' <span class="d">' + esc(p.desc.length > 46 ? p.desc.slice(0, 46) + '…' : p.desc) + '</span>' + (p.desc.length > 46 ? ' <span class="more">더 보기</span>' : '') : '') + '</p>'
    + '<p class="meta">' + (p.place ? esc(p.place) + '에서 만나요' : '만나서 거래') + (p.ship ? ' · 택배는 택배비 별도' : '') + '</p>'
    + '</article>';
}
function shortsHTML(){
  var posts = visiblePosts().slice().sort(function(a, b){
    var av = a.media.some(function(m){ return m.kind === 'video'; }) ? 1 : 0, bv = b.media.some(function(m){ return m.kind === 'video'; }) ? 1 : 0;
    return (bv - av) || (b.at - a.at);
  });
  if(!posts.length) return '<div class="empty" style="color:#bbb">' + ic('play') + '<b style="color:#fff">아직 쇼츠가 없어요</b><p>짧은 영상으로 물건을 보여 주면 더 빨리 가져가요.</p><button class="btn" style="background:#fff;color:#000" data-act="upload">' + ic('video', 'sm') + '쇼츠 올리기</button></div>';
  return posts.map(function(p){
    var m = p.media.filter(function(x){ return x.kind === 'video'; })[0] || p.media[0];
    var t = sellerTemp(p);
    return '<section class="short"><div class="slide" data-act="openItem" data-id="' + esc(p.id) + '">' + mediaHTML(m, 'short') + '</div>'
      + (m.kind === 'video' ? '<div class="short-top"><button class="ib" data-act="mute" aria-label="' + (UI.muted ? '소리 켜기' : '소리 끄기') + '">' + ic(UI.muted ? 'soundOff' : 'soundOn') + '</button></div>' : '')
      + '<div class="short-info"><div class="post-h" style="height:auto;padding:0;gap:8px">' + sellerAv(p) + '<div class="who"><b>' + esc(sellerName(p)) + (p.sample ? ' · 예시' : '') + '</b><small>' + esc((p.mine ? ST.me.town : p.seller.town) || '') + ' · 매너 ' + t.toFixed(1) + '°</small></div></div>'
      + '<p class="s-title">' + esc(p.title) + '</p>' + (p.desc ? '<p class="s-desc">' + esc(p.desc) + '</p>' : '')
      + '<div class="s-tags"><span class="price">' + won(PRICE) + '</span><span>' + (p.cond === 'new' ? '새것' : '중고') + '</span><span>' + (p.ship ? '만나서 · 택배 가능' : '만나서') + '</span>' + (p.status === 'reserved' ? '<span>예약중</span>' : '') + '</div></div>'
      + '<div class="rail"><button class="' + (p.liked ? 'liked' : '') + '" data-act="like" data-id="' + esc(p.id) + '" aria-pressed="' + !!p.liked + '">' + ic(p.liked ? 'heartF' : 'heart') + '<span class="n">' + p.likes + '</span></button>'
      + '<button data-act="ask" data-id="' + esc(p.id) + '">' + ic('chat') + '<span>문의</span></button>'
      + (p.mine ? '' : '<button data-act="want" data-id="' + esc(p.id) + '"><span class="want-r">' + ic(p.wanted ? 'check' : 'hand') + '</span><span>' + (p.wanted ? '보냄' : '원해요') + '</span></button>') + '</div></section>';
  }).join('');
}
function myPosts(kind){
  if(kind === 'liked') return ST.posts.filter(function(p){ return p.liked && !p.hidden; });
  if(kind === 'done'){
    var mine = ST.posts.filter(function(p){ return p.mine && p.status === 'done'; });
    var bought = ST.chats.filter(function(c){ return c.done; }).map(function(c){ return postById(c.postId); }).filter(Boolean);
    return mine.concat(bought.filter(function(p){ return mine.indexOf(p) < 0; }));
  }
  return ST.posts.filter(function(p){ return p.mine && p.status !== 'done'; });
}
function meHTML(){
  var me = ST.me;
  var sold = ST.posts.filter(function(p){ return p.mine; }).length;
  var done = myPosts('done').length;
  var reviews = ST.chats.filter(function(c){ return c.reviewed; }).length;
  var G = [['sell','grid','판매중'],['done','done','거래완료'],['liked','heart','찜']];
  var list = myPosts(UI.gtab);
  var empty = {sell:'올린 물건이 없어요. 아래 + 로 첫 물건을 올려 보세요.', done:'끝난 거래가 여기에 모여요.', liked:'마음에 드는 물건에 ♡를 누르면 여기에 모여요.'}[UI.gtab];
  return '<header class="bar"><h1 class="grow" style="padding-left:8px">' + esc(me.nick || '나') + '</h1><button class="ib" data-act="settings" aria-label="설정">' + ic('gear') + '</button></header>'
    + '<section class="prof"><button class="av lg" data-act="editProfile" aria-label="프로필 사진 바꾸기">' + (me.avatar ? '<img data-mid="' + esc(me.avatar) + '"' + srcAttr(me.avatar) + ' alt="">' : initial(me.nick)) + '</button>'
    + '<div class="stats"><span><b>' + sold + '</b>올린 물건</span><span><b>' + done + '</b>거래완료</span><span><b>' + reviews + '</b>보낸 후기</span></div></section>'
    + '<div class="bio"><b>' + esc(me.nick || '이름 없음') + '</b><span class="line">' + ic('pin', 'xs') + esc(me.town || '동네를 정해 주세요') + (townOK() ? ' <span class="verified">' + ic('check', 'xs') + '위치 확인</span>' : '') + '</span>'
    + '<span class="temp-line">매너온도 <b class="temp" style="color:' + tempColor(me.temp) + '">' + me.temp.toFixed(1) + '°C</b><span class="tempbar"><i style="width:' + Math.min(100, me.temp) + '%;background:' + tempColor(me.temp) + '"></i></span></span></div>'
    + '<div class="prof-btns"><button class="btn ghost" data-act="editProfile">프로필 편집</button><button class="btn ghost" data-act="' + (townOK() ? 'rules' : 'verify') + '">' + (townOK() ? '안전 거래 수칙' : (UI.locating ? '확인 중…' : '위치 확인')) + '</button></div>'
    + '<div class="gtabs" role="tablist">' + G.map(function(g){ return '<button role="tab" data-act="gtab" data-g="' + g[0] + '" aria-selected="' + (UI.gtab === g[0]) + '" aria-label="' + g[2] + '">' + ic(g[1]) + '</button>'; }).join('') + '</div>'
    + (list.length ? '<div class="grid">' + list.map(function(p){
        var m = p.media[0], vid = m && m.kind === 'video';
        return '<button class="cell" data-act="openItem" data-id="' + esc(p.id) + '" aria-label="' + esc(p.title) + '">' + mediaHTML(m, 'thumb') + (vid ? '<span class="vbadge">' + ic('video') + '</span>' : '') + (p.status === 'reserved' ? '<span class="status-veil">예약중</span>' : (p.status === 'done' ? '<span class="status-veil">거래완료</span>' : '')) + '</button>';
      }).join('') + '</div>' : '<div class="empty" style="padding:48px 32px">' + ic(UI.gtab === 'liked' ? 'heart' : (UI.gtab === 'done' ? 'done' : 'grid')) + '<p>' + empty + '</p></div>');
}

/* ---------- 겹쳐 뜨는 화면: 물건, 올리기, 채팅 ---------- */
/* 겹쳐 뜨는 화면은 [스크롤 영역 + 아래 고정 막대]로 나눈다. 고정 막대가 위 화면을 뚫고 나오지 않게 하려고 */
function scroller(el){ return (el && el.firstElementChild && el.firstElementChild.classList.contains('scroller')) ? el.firstElementChild : el; }
function renderOverlay(el, v){
  var html = '';
  if(v.v === 'item') html = itemHTML(postById(v.id));
  else if(v.v === 'upload') html = uploadHTML();
  else if(v.v === 'chats') html = chatsHTML();
  else if(v.v === 'chat') html = chatHTML(chatById(v.id));
  el.innerHTML = '<div class="scroller">' + html + '</div>';
  var bb = el.querySelector('.scroller .buybar'); if(bb) el.appendChild(bb);
  watchVideos(el);
  if(v.v === 'chat'){
    var c = chatById(v.id);
    if(c && c.unread){ c.unread = 0; save(); DIRTY.home = true; }
    var ta = el.querySelector('textarea.msg');
    if(ta && UI.chatDraft[v.id]){ ta.value = UI.chatDraft[v.id]; fitTextarea(ta); }
    setTimeout(function(){ var sc = scroller(el); sc.scrollTop = sc.scrollHeight; }, 0);
  }
  el._rev = REV;
}
function layerOf(v){ return document.querySelector('#overs > [data-key="' + keyOf(v) + '"]'); }
function itemHTML(p){
  if(!p) return '<header class="bar">' + backBtn() + '</header><div class="empty"><b>지워진 물건이에요</b></div>';
  var n = p.media.length, t = sellerTemp(p), mine = p.mine;
  var slides = p.media.map(function(m){ return '<div class="slide">' + mediaHTML(m, 'detail') + '</div>'; }).join('');
  var hasVideo = p.media.some(function(m){ return m.kind === 'video'; });
  var verified = mine ? townOK() : p.seller.verified;
  var h = '<header class="bar">' + backBtn() + '<span class="ttl"></span><button class="ib" data-act="postMenu" data-id="' + esc(p.id) + '" aria-label="더 보기">' + ic('more') + '</button></header>'
    + '<div class="media"><div class="track" data-pager="i-' + esc(p.id) + '">' + slides + '</div>'
    + (n > 1 ? '<span class="pager" data-pager-label="i-' + esc(p.id) + '">1/' + n + '</span>' : '')
    + (hasVideo ? '<button class="mute" data-act="mute" aria-label="' + (UI.muted ? '소리 켜기' : '소리 끄기') + '">' + ic(UI.muted ? 'soundOff' : 'soundOn') + '</button>' : '')
    + (p.sample ? '<span class="tag tl">예시</span>' : '') + (p.status !== 'selling' ? '<div class="status-veil">' + (p.status === 'reserved' ? '예약중' : '거래완료') + '</div>' : '') + '</div>'
    + '<div class="seller">' + (mine && ST.me.avatar ? '<span class="av md"><img data-mid="' + esc(ST.me.avatar) + '"' + srcAttr(ST.me.avatar) + ' alt=""></span>' : '<span class="av md">' + initial(sellerName(p)) + '</span>')
    + '<div class="who"><b>' + esc(sellerName(p)) + (p.sample ? ' · 예시' : '') + '</b><small>' + esc((mine ? ST.me.town : p.seller.town) || '') + (verified ? ' · 위치 확인' : '') + '</small></div>'
    + '<div class="tempbox"><span class="temp" style="color:' + tempColor(t) + '">' + t.toFixed(1) + '°C</span><span class="tempbar"><i style="width:' + Math.min(100, t) + '%;background:' + tempColor(t) + '"></i></span><small>매너온도</small></div></div>'
    + '<div class="item-body"><h2 class="i-title">' + esc(p.title) + '</h2>'
    + '<p class="i-meta">' + (p.cond === 'new' ? '새것' : '중고') + ' · ' + ago(p.at) + ' · <span data-counts="' + esc(p.id) + '">' + countsText(p) + '</span></p>'
    + (p.desc ? '<p class="i-desc">' + esc(p.desc) + '</p>' : '')
    + '<div class="rows"><div class="r">' + ic('lock', 'sm') + '<span class="k">가격</span><b>' + won(PRICE) + '</b><span class="muted">· 천샵은 모든 물건이 천 원</span></div>'
    + '<div class="r">' + ic('hand', 'sm') + '<span class="k">거래</span><span>만나서' + (p.ship ? ' · 택배 가능 <span class="muted">(택배비 착불)</span>' : '') + '</span></div>'
    + (p.place ? '<div class="r">' + ic('pin', 'sm') + '<span class="k">만날 곳</span><span>' + esc(p.place) + '</span></div>' : '') + '</div>'
    + '<div class="safe">' + ic('shield', 'sm') + '<p>공개된 장소에서 밝을 때 만나고, 물건을 보고 그 자리에서 천 원을 건네요. 미리 돈을 보내지 마세요. <button data-act="rules">안전 거래 수칙</button></p></div></div>';
  if(mine){
    h += '<div class="buybar"><button class="btn line grow" data-act="setStatus" data-id="' + esc(p.id) + '" data-s="' + (p.status === 'reserved' ? 'selling' : 'reserved') + '"' + (p.status === 'done' ? ' disabled' : '') + '>' + (p.status === 'reserved' ? '예약 풀기' : '예약 걸기') + '</button><button class="btn grow" data-act="setStatus" data-id="' + esc(p.id) + '" data-s="done"' + (p.status === 'done' ? ' disabled' : '') + '>' + (p.status === 'done' ? '거래를 마쳤어요' : '거래 완료') + '</button></div>';
  } else {
    h += '<div class="buybar"><button class="ib' + (p.liked ? ' liked' : '') + '" data-act="like" data-id="' + esc(p.id) + '" aria-pressed="' + !!p.liked + '" aria-label="찜">' + ic(p.liked ? 'heartF' : 'heart') + '</button><span class="sep"></span>'
      + '<div class="price grow"><b>' + won(PRICE) + '</b><small>고정가 · 흥정 없음</small></div>'
      + (p.status === 'done' ? '<button class="btn" disabled>거래완료</button>' : '<button class="btn" data-act="want" data-id="' + esc(p.id) + '">' + (p.wanted ? '채팅 보기' : '원해요') + '</button>') + '</div>';
  }
  return h;
}
function backBtn(){ return '<button class="ib" data-act="back" aria-label="뒤로">' + ic('back') + '</button>'; }
function draftReady(d){ return !!(d && d.media.length && d.title.trim() && d.agree && !d.busy); }
function uploadHTML(){
  var d = UI.draft || (UI.draft = newDraft());
  var off = draftReady(d) ? '' : ' aria-disabled="true"';
  return '<header class="bar line"><button class="ib" data-act="back" aria-label="닫기">' + ic('close') + '</button><span class="ttl">천 원에 올리기</span><button class="txt-btn" data-act="publish"' + off + '>올리기</button></header><div class="up">'
    + '<div class="up-media">' + uploadMediaHTML(d) + '</div>'
    + '<div class="form" style="margin-top:12px">'
    + '<div class="fld"><label for="d-title">제목</label><input type="text" id="d-title" maxlength="40" data-bind="title" value="' + esc(d.title) + '" placeholder="예: 유리컵 4개 세트" autocomplete="off"></div>'
    + '<div class="fld"><label for="d-desc">설명 <span class="muted" style="font-weight:500">(선택)</span></label><textarea id="d-desc" maxlength="500" data-bind="desc" placeholder="상태, 사용 기간, 하자를 적어 주세요">' + esc(d.desc) + '</textarea></div>'
    + '<div class="fld"><span class="lb">상태</span><div class="seg" role="group"><button data-act="draftCond" data-v="new" aria-pressed="' + (d.cond === 'new') + '">새것</button><button data-act="draftCond" data-v="used" aria-pressed="' + (d.cond === 'used') + '">중고</button></div></div>'
    + '<div class="fld"><div class="sw-row"><div class="grow"><b>택배도 가능해요</b><small>만나서 거래가 기본이에요. 택배비는 착불로 받는 사람이 내요.</small></div><button class="sw" role="switch" data-act="draftShip" aria-checked="' + !!d.ship + '" aria-label="택배 가능"></button></div></div>'
    + '<div class="fld"><label for="d-place">만날 곳 <span class="muted" style="font-weight:500">(선택)</span></label><input type="text" id="d-place" maxlength="40" data-bind="place" value="' + esc(d.place) + '" placeholder="예: 역삼역 3번 출구, 주민센터 앞" autocomplete="off"></div>'
    + '<div class="fld"><span class="lb">가격</span><div class="fixed-price"><b>' + won(PRICE) + '</b><span class="lock">' + ic('lock', 'xs') + '고정</span></div><span class="muted" style="font-size:12.5px">천샵은 새것이든 중고든 모든 물건이 천 원이에요. 흥정 없이 바로 거래해요.</span></div>'
    + '<div class="fld"><button class="check" role="checkbox" data-act="draftAgree" aria-checked="' + !!d.agree + '"><span class="box">' + ic('check') + '</span><span>판매 금지 품목이 아니에요</span></button><button class="lnk-btn" data-act="banned">금지 품목 보기</button></div>'
    + '</div><div style="padding:8px 16px 24px"><button class="btn wide" data-act="publish"' + off + '>천 원에 올리기</button></div></div>';
}
/* 사진·영상 부분만 따로 그린다. 제목을 쓰는 중에 영상이 다 불러와져도 키보드가 내려가지 않게 */
function uploadMediaHTML(d){
  var addBtns = '<label class="pick-btn">' + ic('image', 'sm') + '앨범<input type="file" accept="image/*,video/*" multiple data-file="media"></label>'
    + '<label class="pick-btn">' + ic('camera', 'sm') + '사진 찍기<input type="file" accept="image/*" capture="environment" data-file="media"></label>'
    + '<label class="pick-btn">' + ic('video', 'sm') + '쇼츠 찍기<input type="file" accept="video/*" capture="environment" data-file="media"></label>';
  if(!d.media.length){
    return '<div class="hero-pick">' + ic('image') + '<div><b>사진이나 쇼츠를 올려 주세요</b><p>첫 장이 대표 사진이 돼요. 영상은 1분까지예요.</p></div>' + (d.busy ? '<p class="loading">불러오는 중…</p>' : '<div class="pick-row">' + addBtns + '</div>') + '</div>';
  }
  return '<div class="picker">' + d.media.map(function(m, i){
      return '<div class="pk">' + (m.kind === 'video' ? (m.posterUrl ? '<img src="' + m.posterUrl + '" alt="">' : '<video src="' + m.url + '" muted playsinline preload="metadata"></video>') : '<img src="' + m.url + '" alt="">')
        + (d.busy ? '' : '<button class="x" data-act="dropMedia" data-i="' + i + '" aria-label="빼기">' + ic('close') + '</button>') + (i === 0 ? '<span class="first">대표</span>' : '') + (m.kind === 'video' ? '<span class="dur">' + Math.round(m.dur || 0) + '초</span>' : '') + '</div>';
    }).join('') + (d.media.length < MAX_MEDIA && !d.busy ? '<label class="add">' + ic('plus') + '추가<input type="file" accept="image/*,video/*" multiple data-file="media"></label>' : '') + '</div>'
    + (d.busy ? '<p class="note">불러오는 중…</p>' : '<p class="note">' + d.media.length + '/' + MAX_MEDIA + ' · 첫 장이 대표 사진이 돼요</p>');
}
function uploadLayer(){ return layerOf({v:'upload'}); }
function renderUploadMedia(){
  var l = uploadLayer(), d = UI.draft; if(!l || !d) return;
  var box = l.querySelector('.up-media'); if(box) box.innerHTML = uploadMediaHTML(d);
  syncPublishButtons();
}
function syncPublishButtons(){
  var ok = draftReady(UI.draft);
  Array.prototype.forEach.call(document.querySelectorAll('[data-act="publish"]'), function(b){ if(ok) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true'); });
}
function chatsHTML(){
  var list = liveChats().sort(function(a, b){ return b.at - a.at; });
  var h = '<header class="bar line">' + backBtn() + '<span class="ttl">채팅</span><span style="width:44px"></span></header>';
  if(!list.length) return h + '<div class="empty">' + ic('chat') + '<b>아직 대화가 없어요</b><p>마음에 드는 물건에서 원해요를 누르면 여기서 판매자와 이야기해요.</p></div>';
  return h + '<div>' + list.map(function(c){
    var p = postById(c.postId), last = c.msgs.filter(function(m){ return m.from !== 'sys'; }).slice(-1)[0];
    var lastText = last ? (last.card ? cardTitle(last.card) : last.text) : '';
    return '<button class="chat-li" data-act="openChat" data-id="' + esc(c.id) + '"><span class="thumb">' + (p ? mediaHTML(p.media[0], 'thumb') : '') + '</span><span class="grow"><b>' + esc(c.with.nick) + ' · ' + esc(c.title) + '</b><small>' + esc(lastText) + '</small></span><span class="t">' + ago(c.at) + '</span>' + (c.unread ? '<span class="unread"></span>' : '') + '</button>';
  }).join('') + '</div>';
}
function cardTitle(k){ return k.type === 'appt' ? '약속: ' + k.day + ' ' + k.time + ' · ' + k.place : (k.type === 'ship' ? '택배로 받기 요청' : '알림'); }
function hasAppt(c){ return !!(c && c.msgs.some(function(m){ return m.card && m.card.type === 'appt'; })); }
function msgsHTML(c){
  var h = '<p class="sys">시제품이라 대화는 이 휴대폰에만 저장되고 상대에게 전달되지 않아요.</p>';
  c.msgs.forEach(function(m){
    if(m.from === 'sys') h += '<p class="sys">' + esc(m.text) + '</p>';
    else if(m.card){
      var k = m.card;
      if(k.type === 'appt') h += '<div class="card-msg"><b>' + ic('calendar', 'sm') + '약속을 잡았어요</b><span>' + esc(k.day + ' ' + k.time) + '</span><span>' + esc(k.place) + '</span>' + (k.late ? '<span style="color:var(--warn)">늦은 시간이에요. 가능하면 밝을 때 만나요.</span>' : '') + '</div>';
      else if(k.type === 'ship') h += '<div class="card-msg"><b>' + ic('truck', 'sm') + '택배로 받고 싶어요</b><span>택배비는 착불로, 받는 사람이 내요.</span><span>물건값 ' + won(PRICE) + '은 물건을 받은 뒤에 보내요. 주소는 정식 앱에서 안전하게 주고받아요.</span></div>';
    }
    else h += '<div class="bub ' + (m.from === 'me' ? 'me' : 'them') + '">' + esc(m.text) + '</div>';
  });
  var last = c.msgs[c.msgs.length - 1];
  if(last && last.from === 'me') h += '<span class="when">' + clock(last.at) + '</span>';
  return h;
}
var RISK_WARN = '연락처·계좌·외부 메신저 이야기가 있어요. 앱 밖 거래와 선입금은 사기에 자주 쓰여요. 그래도 보내려면 한 번 더 누르세요.';
function chatHTML(c){
  if(!c) return '<header class="bar">' + backBtn() + '</header><div class="empty"><b>없는 대화예요</b></div>';
  var p = postById(c.postId);
  var status = p ? p.status : 'done';
  var h = '<div class="chat"><header class="bar line">' + backBtn() + '<div class="who grow"><b>' + esc(c.with.nick) + '</b><small>매너온도 ' + c.with.temp.toFixed(1) + '°C</small></div><button class="ib" data-act="chatMenu" data-id="' + esc(c.id) + '" aria-label="더 보기">' + ic('more') + '</button></header>'
    + '<button class="chat-item" data-act="openItem" data-id="' + esc(c.postId) + '" style="width:100%;text-align:left"><span class="thumb">' + (p ? mediaHTML(p.media[0], 'thumb') : '') + '</span><span class="grow" style="min-width:0"><b>' + esc(c.title) + '</b><small>' + won(PRICE) + '</small></span><span class="pill' + (c.done ? ' ok' : '') + '">' + (c.done ? '거래완료' : (status === 'reserved' ? '예약중' : '판매중')) + '</span></button>';
  if(!c.warnClosed) h += '<div class="warnbox">' + ic('shield', 'sm') + '<span>앱 밖으로 연락처를 옮기자거나 돈을 먼저 보내 달라는 말은 사기일 수 있어요. 공개된 장소에서 밝을 때 만나요.</span><button data-act="closeWarn" data-id="' + esc(c.id) + '" aria-label="닫기">' + ic('close', 'sm') + '</button></div>';
  h += '<div class="msgs">' + msgsHTML(c) + '</div><div class="composer">';
  if(!c.done){
    h += '<div class="quick">'
      + '<button class="strong" data-act="appt" data-id="' + esc(c.id) + '">약속 잡기</button>'
      + (p && p.ship ? '<button data-act="shipReq" data-id="' + esc(c.id) + '">택배로 받기</button>' : '')
      + '<button data-act="doneDeal" data-id="' + esc(c.id) + '">거래 완료</button>'
      + ['오늘 저녁 가능해요?','어디서 만날까요?','아직 있나요?'].map(function(q){ return '<button class="say" data-act="quick" data-id="' + esc(c.id) + '" data-v="' + esc(q) + '">' + esc(q) + '</button>'; }).join('')
      + '</div>';
  }
  if(UI.riskArmed && UI.riskArmed.cid === c.id) h += '<p class="inline-warn">' + RISK_WARN + '</p>';
  h += '<div class="composer-row"><textarea class="msg" data-id="' + esc(c.id) + '" rows="1" placeholder="' + (c.done ? '끝난 거래예요' : '메시지 보내기') + '" aria-label="메시지"' + (c.done ? ' disabled' : '') + '></textarea><button class="send" data-act="sendMsg" data-id="' + esc(c.id) + '"' + (c.done ? ' disabled' : '') + '>보내기</button></div></div></div>';
  return h;
}
/* 메시지 목록만 다시 그린다. 쓰던 글과 키보드는 그대로 둔다 */
function refreshMsgs(cid){
  var l = layerOf({v:'chat', id:cid}), c = chatById(cid); if(!l || !c) return;
  var box = l.querySelector('.msgs'); if(!box) return;
  box.innerHTML = msgsHTML(c);
  l._rev = REV;
  var sc = scroller(l); sc.scrollTop = sc.scrollHeight;
}
function fitTextarea(ta){ ta.style.height = '44px'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; }

/* ---------- 아래에서 올라오는 시트 ---------- */
function renderSheet(){
  var host = document.getElementById('sheet'); if(!host) return;
  var s = NAV.sheet;
  if(!s){ host.innerHTML = ''; return; }
  var body = sheetBody(s);
  host.innerHTML = '<div class="scrim" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + body + '</div>';
}
function sheetBody(s){
  var p, c, sd = UI.sheetData;
  switch(s.k){
    case 'rules': return '<h2>안전 거래 수칙</h2><p class="lead">처음 거래하기 전에 꼭 읽어 주세요.</p><ol class="rules">' + RULES.map(function(r, i){ return '<li><span class="n">' + (i + 1) + '</span><span>' + esc(r) + '</span></li>'; }).join('') + '</ol><div class="pad"><button class="btn wide" data-act="closeSheet">알겠어요</button></div>';
    case 'banned': return '<h2>판매 금지 품목</h2><p class="lead">아래 물건은 천샵에 올릴 수 없어요. 법으로 개인 간 판매가 막혀 있거나, 안전 때문에 천샵에서 받지 않는 물건이에요.</p><div class="banned">' + BANNED.map(function(b){ return '<span>' + esc(b) + '</span>'; }).join('') + '</div><div class="pad"><button class="btn wide" data-act="closeSheet">확인</button></div>';
    case 'safety': return '<h2>처음 거래 전에 꼭 확인해요</h2><ol class="rules">' + RULES.slice(1).map(function(r, i){ return '<li><span class="n">' + (i + 1) + '</span><span>' + esc(r) + '</span></li>'; }).join('') + '</ol><div class="pad"><button class="btn wide" data-act="agreeSafety">확인했어요</button></div>';
    case 'postMenu':
      p = postById(s.id); if(!p) return '';
      if(p.mine) return '<div class="menu">' + (p.status === 'done' ? '' : '<button data-act="setStatus" data-id="' + esc(p.id) + '" data-s="' + (p.status === 'reserved' ? 'selling' : 'reserved') + '">' + ic('calendar') + (p.status === 'reserved' ? '예약 풀기' : '예약 걸기') + '</button>') + (p.status === 'done' ? '' : '<button data-act="setStatus" data-id="' + esc(p.id) + '" data-s="done">' + ic('done') + '거래 완료로 바꾸기</button>') + '<button class="danger" data-act="delPost" data-id="' + esc(p.id) + '">' + ic('trash') + (UI.confirm === 'del' + p.id ? '한 번 더 누르면 지워요' : '삭제') + '</button></div>';
      return '<div class="menu"><button data-act="report" data-id="' + esc(p.id) + '">' + ic('flag') + '신고하기</button><button data-act="hidePost" data-id="' + esc(p.id) + '">' + ic('eyeOff') + '이 글 숨기기</button><button data-act="rules">' + ic('shield') + '안전 거래 수칙</button></div>';
    case 'report':
      return '<h2>무엇이 문제인가요?</h2><div class="menu">' + ['판매 금지 품목이에요','사기 같아요','천 원이 아닌 돈을 요구해요','부적절한 사진이나 글이에요','전문 판매업자 같아요'].map(function(r){ return '<button data-act="reportSend" data-id="' + esc(s.id) + '" data-v="' + esc(r) + '">' + esc(r) + '</button>'; }).join('') + '</div>';
    case 'appt':
      c = chatById(s.id); p = c && postById(c.postId);
      var pick = apptPick(sd), place = sd.place != null ? sd.place : (p && p.place) || '';
      var late = parseInt(pick.time, 10) >= 21;
      return '<h2>약속 잡기</h2><div class="pad"><span class="lb" style="font-size:13px;font-weight:700">날짜</span><div class="opt-row">' + ['오늘','내일','모레'].map(function(x){ return '<button data-act="sd" data-k="day" data-v="' + x + '" aria-pressed="' + (pick.day === x) + '"' + (x === '오늘' && !pick.todayOK ? ' disabled' : '') + '>' + x + '</button>'; }).join('') + '</div>'
        + '<span class="lb" style="font-size:13px;font-weight:700">시간</span><div class="opt-row">' + pick.avail.map(function(x){ return '<button data-act="sd" data-k="time" data-v="' + x + '" aria-pressed="' + (pick.time === x) + '">' + x + '</button>'; }).join('') + '</div>'
        + (late ? '<p style="font-size:13px;color:var(--warn)">늦은 시간이에요. 가능하면 밝을 때 만나요.</p>' : '')
        + '<label for="appt-place" style="font-size:13px;font-weight:700">장소</label><input class="field" id="appt-place" data-sd="place" maxlength="40" value="' + esc(place) + '" placeholder="예: 역삼역 3번 출구, 주민센터 앞" autocomplete="off">'
        + '<button class="btn wide" data-act="apptSave" data-id="' + esc(s.id) + '">약속 보내기</button></div>';
    case 'review':
      c = chatById(s.id); if(!c) return '';
      var mood = sd.mood || '', tags = sd.tags || [];
      var pool = mood === 'bad' ? BAD_TAGS : GOOD_TAGS;
      return '<h2>' + esc(c.with.nick) + '님과 거래는 어땠어요?</h2><p class="lead">후기는 상대의 매너온도에 반영돼요.</p><div class="pad"><div class="big-choice"><button data-act="sd" data-k="mood" data-v="good" aria-pressed="' + (mood === 'good') + '"><span class="em">😊</span>좋았어요</button><button data-act="sd" data-k="mood" data-v="bad" aria-pressed="' + (mood === 'bad') + '"><span class="em">😕</span>별로였어요</button></div>'
        + (mood ? '<div class="opt-row">' + pool.map(function(t){ return '<button data-act="sdTag" data-v="' + esc(t) + '" aria-pressed="' + (tags.indexOf(t) >= 0) + '">' + esc(t) + '</button>'; }).join('') + '</div>' : '')
        + '<button class="btn wide" data-act="reviewSave" data-id="' + esc(s.id) + '"' + (mood ? '' : ' disabled') + '>후기 보내고 거래 마치기</button></div>';
    case 'noShow':
      c = chatById(s.id); if(!c) return '';
      return '<h2>상대가 약속 장소에 안 나왔나요?</h2><p class="lead">한 거래에 한 번만 신고할 수 있어요. 신고하면 상대의 매너온도가 내려가고, 같은 사람이 ' + NOSHOW_LIMIT + '번 신고되면 일주일 동안 원해요를 누를 수 없어요.</p><div class="pad"><button class="btn wide" data-act="noShowSave" data-id="' + esc(s.id) + '">안 나왔다고 신고하기</button><button class="btn wide ghost" data-act="closeSheet">취소</button></div>';
    case 'chatMenu':
      c = chatById(s.id);
      return '<div class="menu">' + (c && !c.done && hasAppt(c) && !c.noShowAt ? '<button data-act="noShow" data-id="' + esc(s.id) + '">' + ic('calendar') + '약속 장소에 안 나왔어요</button>' : '') + '<button data-act="report" data-id="' + esc((c || {}).postId || '') + '">' + ic('flag') + '신고하기</button><button data-act="rules">' + ic('shield') + '안전 거래 수칙</button><button class="danger" data-act="leaveChat" data-id="' + esc(s.id) + '">' + ic('trash') + (UI.confirm === 'leave' + s.id ? '한 번 더 누르면 나가요' : '채팅방 나가기') + '</button></div>';
    case 'settings':
      return '<div class="menu"><button data-act="editProfile">' + ic('edit') + '프로필 편집</button><button data-act="verify">' + ic('location') + (townOK() ? '위치 다시 확인하기' : '위치 확인하기') + '</button><button data-act="rules">' + ic('shield') + '안전 거래 수칙</button><button data-act="banned">' + ic('info') + '판매 금지 품목</button><button data-act="toggleSamples">' + ic(ST.flags.samples ? 'eyeOff' : 'eye') + (ST.flags.samples ? '예시 물건 숨기기' : '예시 물건 보기') + '</button><button class="danger" data-act="resetAll">' + ic('trash') + (UI.confirm === 'reset' ? '한 번 더 누르면 모두 지워요' : '모든 기록 지우기') + '</button></div><p class="lead" style="padding-top:8px">천샵 ' + VERSION + ' 시제품 · 글·사진·대화는 이 휴대폰에만 저장돼요.</p>';
    case 'profile':
      var nick = sd.nick != null ? sd.nick : ST.me.nick, town = sd.town != null ? sd.town : ST.me.town;
      return '<h2>프로필 편집</h2><div class="pad"><div style="display:flex;align-items:center;gap:14px"><span class="av lg">' + (ST.me.avatar ? '<img data-mid="' + esc(ST.me.avatar) + '"' + srcAttr(ST.me.avatar) + ' alt="">' : initial(nick)) + '</span><label class="pick-btn">' + ic('image', 'sm') + '사진 바꾸기<input type="file" accept="image/*" data-file="avatar"></label></div>'
        + '<label for="pf-nick" style="font-size:13px;font-weight:700">닉네임</label><input class="field" id="pf-nick" data-sd="nick" maxlength="12" value="' + esc(nick) + '" autocomplete="off">'
        + '<label for="pf-town" style="font-size:13px;font-weight:700">우리 동네</label><input class="field" id="pf-town" data-sd="town" maxlength="20" value="' + esc(town) + '" placeholder="예: 역삼동" autocomplete="off">'
        + '<button class="btn wide" data-act="profileSave">저장</button></div>';
  }
  return '';
}

/* ---------- 처음 시작 ---------- */
function renderOnboard(){
  var app = document.getElementById('app');
  if(UI.onb === 0){
    app.innerHTML = '<main class="layer"><div class="onb"><div class="mid"><div class="wm">천샵<small>1,000</small></div><h1>뭐든<br>천 원.</h1><p class="sub">새것이든 중고든 모든 물건이 1,000원이에요. 사진이나 쇼츠로 올리고, 동네 이웃과 주고받아요.</p>'
      + '<ul><li>' + ic('lock') + '가격 고민도, 흥정도 없어요</li><li>' + ic('hand') + '만나서 거래, 필요하면 택배(택배비 별도)</li><li>' + ic('shield') + '위치 확인과 매너온도로 더 안전하게</li></ul></div>'
      + '<button class="btn wide" data-act="onbNext">시작하기</button></div></main>';
  } else {
    var d = UI.onbData || (UI.onbData = {nick:'', town:''});
    app.innerHTML = '<main class="layer"><div class="onb"><div class="mid"><h1 style="font-size:28px">이웃에게 보일<br>이름과 동네를 알려 주세요</h1><div class="form-col">'
      + '<label for="ob-nick">닉네임</label><input class="field" id="ob-nick" maxlength="12" data-ob="nick" value="' + esc(d.nick) + '" placeholder="예: 하늘이네" autocomplete="off">'
      + '<label for="ob-town">우리 동네</label><input class="field" id="ob-town" maxlength="20" data-ob="town" value="' + esc(d.town) + '" placeholder="예: 역삼동" autocomplete="off">'
      + '<button class="btn wide line" data-act="verify">' + ic('location', 'sm') + (ST.me.verified && ST.me.verifiedTown && ST.me.verifiedTown === String(d.town || '').trim() ? '위치 확인 완료' : (UI.locating ? '위치 확인 중…' : 'GPS로 위치 확인 (선택)')) + '</button>'
      + '<p class="muted" style="font-size:12.5px">위치는 동네 확인에만 쓰고, 대략적인 값만 이 휴대폰에 저장해요.</p></div></div>'
      + '<button class="btn wide" data-act="onbDone">천샵 시작하기</button></div></main>';
  }
}

/* ---------- 올리기 ---------- */
function newDraft(){ return {media:[], title:'', desc:'', cond:'used', ship:false, place:'', agree:false, busy:false}; }
function shrinkImage(file, max){
  return new Promise(function(res, rej){
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function(){
      var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function(b){ if(b) res(b); else rej(new Error('encode')); }, 'image/jpeg', 0.86);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('decode')); };
    img.src = url;
  });
}
function videoInfo(file){
  return new Promise(function(res){
    var v = document.createElement('video'), url = URL.createObjectURL(file), done = false;
    function fin(r){ if(done) return; done = true; r.url = url; res(r); }
    v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
    v.onloadedmetadata = function(){ var d = v.duration; try{ v.currentTime = Math.min(0.5, (isFinite(d) && d > 0 ? d : 1) / 3); }catch(e){ fin({dur:d}); } };
    v.onseeked = function(){
      try{
        var k = Math.min(1, 1080 / Math.max(v.videoWidth || 1, v.videoHeight || 1));
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.round((v.videoWidth || 1) * k)); c.height = Math.max(1, Math.round((v.videoHeight || 1) * k));
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        c.toBlob(function(b){ fin({dur:v.duration, poster:b}); }, 'image/jpeg', 0.82);
      }catch(e){ fin({dur:v.duration}); }
    };
    v.onerror = function(){ fin({error:true}); };
    setTimeout(function(){ fin({dur:v.duration || 0}); }, 8000);
  });
}
/* 고른 사진·영상은 바로 IndexedDB에 넣는다. 카메라를 여는 사이 안드로이드가 앱을 꺼도 쓰던 글이 남게 */
function stashMedia(m){
  m.id = 'm' + uid();
  var jobs = [idbPut('media', m.id, m.blob)];
  if(m.posterBlob){ m.posterId = 'm' + uid(); jobs.push(idbPut('media', m.posterId, m.posterBlob)); }
  m.saved = Promise.all(jobs).then(function(rs){ return rs.every(Boolean); });
}
function addFiles(files){
  var d = UI.draft || (UI.draft = newDraft());
  if(d.busy){ toast('불러오는 중이에요. 잠시만 기다려 주세요.'); return; }
  var room = MAX_MEDIA - d.media.length;
  if(room <= 0){ toast('사진·영상은 ' + MAX_MEDIA + '개까지 올릴 수 있어요.'); return; }
  var list = files.slice(0, room);
  if(files.length > room) toast('사진·영상은 ' + MAX_MEDIA + '개까지예요. 나머지는 뺐어요.');
  d.busy = true; renderUploadMedia();
  var seq = Promise.resolve();
  list.forEach(function(f){
    seq = seq.then(function(){
      if(d.media.length >= MAX_MEDIA) return;
      if(/^video\//.test(f.type)){
        if(f.size > MAX_VIDEO_BYTES){ toast('영상 용량이 너무 커요(' + Math.round(MAX_VIDEO_BYTES / 1048576) + 'MB까지). 카메라 화질을 FHD로 낮추거나 더 짧게 찍어 주세요.'); return; }
        return videoInfo(f).then(function(info){
          if(info.error){ toast('이 영상은 열 수 없어요. 다른 영상을 골라 주세요.'); URL.revokeObjectURL(info.url); return; }
          if(info.dur && info.dur > MAX_VIDEO_SEC){ toast('영상은 1분까지만 올릴 수 있어요.'); URL.revokeObjectURL(info.url); return; }
          var m = {kind:'video', blob:f, url:info.url, dur:info.dur || 0, posterBlob:info.poster || null, posterUrl:info.poster ? URL.createObjectURL(info.poster) : ''};
          stashMedia(m); d.media.push(m);
        });
      }
      if(/^image\//.test(f.type) || !f.type){
        return shrinkImage(f, 1440).then(function(b){ var m = {kind:'image', blob:b, url:URL.createObjectURL(b)}; stashMedia(m); d.media.push(m); }, function(){ toast('이 사진은 열 수 없어요.'); });
      }
      toast('사진이나 영상만 올릴 수 있어요.');
    });
  });
  seq.then(function(){ d.busy = false; if(UI.draft === d){ renderUploadMedia(); persistDraft(); } });
}
function dropDraftMedia(m, keepBlobs){
  if(m.url) URL.revokeObjectURL(m.url); if(m.posterUrl) URL.revokeObjectURL(m.posterUrl);
  if(!keepBlobs){ if(m.id) idbDel('media', m.id); if(m.posterId) idbDel('media', m.posterId); }
}
var draftTimer = null;
function persistDraft(){
  clearTimeout(draftTimer);
  draftTimer = setTimeout(function(){
    var d = UI.draft;
    if(!d || (!d.media.length && !d.title.trim() && !d.desc.trim() && !d.place.trim())){ idbDel('kv', 'draft'); return; }
    idbPut('kv', 'draft', JSON.stringify({title:d.title, desc:d.desc, place:d.place, cond:d.cond, ship:d.ship, agree:d.agree,
      open:NAV.stack.some(function(v){ return v.v === 'upload'; }),
      media:d.media.map(function(m){ return {kind:m.kind, id:m.id, posterId:m.posterId || null, dur:m.dur || 0}; })}));
  }, 300);
}
function restoreDraft(){
  return idbGet('kv', 'draft').then(function(raw){
    var x = null; try{ x = raw ? JSON.parse(raw) : null; }catch(e){ x = null; }
    if(!x) return null;
    var d = newDraft();
    ['title','desc','place'].forEach(function(k){ d[k] = String(x[k] || ''); });
    d.cond = x.cond === 'new' ? 'new' : 'used'; d.ship = !!x.ship; d.agree = !!x.agree;
    return Promise.all((x.media || []).map(function(it){
      return Promise.all([idbGet('media', it.id), it.posterId ? idbGet('media', it.posterId) : null]).then(function(bs){
        if(!bs[0]) return null;
        return {kind:it.kind === 'video' ? 'video' : 'image', id:it.id, posterId:bs[1] ? it.posterId : null, dur:it.dur || 0, url:URL.createObjectURL(bs[0]), posterUrl:bs[1] ? URL.createObjectURL(bs[1]) : '', saved:Promise.resolve(true)};
      });
    })).then(function(ms){ d.media = ms.filter(Boolean).slice(0, MAX_MEDIA); UI.draft = d; return x.open ? d : null; });
  });
}
function publish(){
  var d = UI.draft; if(!d) return;
  if(d.busy){ toast('사진·영상을 불러오는 중이에요. 잠시만 기다려 주세요.'); return; }
  var l = uploadLayer();
  if(!d.media.length){ toast('사진이나 쇼츠를 한 개 이상 올려 주세요.'); var m0 = l && l.querySelector('.up-media'); if(m0) m0.scrollIntoView({block:'center', behavior:'smooth'}); return; }
  if(!d.title.trim()){ toast('제목을 적어 주세요.'); var t = l && l.querySelector('#d-title'); if(t) t.focus(); return; }
  if(!d.agree){ toast('판매 금지 품목이 아닌지 확인해 주세요.'); var a = l && l.querySelector('[data-act="draftAgree"]'); if(a) a.scrollIntoView({block:'center', behavior:'smooth'}); return; }
  d.busy = true; renderUploadMedia();
  Promise.all(d.media.map(function(m){ return m.saved || Promise.resolve(false); })).then(function(rs){
    if(rs.some(function(x){ return !x; })){ d.busy = false; renderUploadMedia(); toast('저장 공간이 부족해 올리지 못했어요. 영상을 빼거나 줄여 주세요.'); return; }
    var media = d.media.map(function(m){
      var item = {kind:m.kind, id:m.id};
      URLS[m.id] = m.url;
      if(m.kind === 'video'){ item.dur = Math.round(m.dur || 0); if(m.posterId){ item.poster = m.posterId; URLS[m.posterId] = m.posterUrl; } }
      return item;
    });
    ST.posts.push({id:'p' + uid(), mine:true, sample:false, seller:{nick:ST.me.nick, temp:ST.me.temp, town:ST.me.town, verified:townOK()},
      title:d.title.trim(), desc:d.desc.trim(), cond:d.cond, ship:!!d.ship, place:d.place.trim(), media:media,
      likes:0, liked:false, wants:0, wanted:false, status:'selling', at:Date.now()});
    UI.draft = null; UI.filter = 'all'; clearTimeout(draftTimer); idbDel('kv', 'draft');
    save(); dirtyTabs();
    popTo({tab:'home', stack:[], sheet:null}, function(){
      var h = document.getElementById('tab-home'); if(h) h.scrollTop = 0;
      toast('천 원에 올렸어요.');
    });
  });
}

/* ---------- 원해요·채팅 ---------- */
function chatMsg(from, text){ return {id:uid(), from:from, text:text, at:Date.now()}; }
function ensureChat(p){
  var c = chatForPost(p.id);
  if(c) return c;
  c = {id:'c' + uid(), postId:p.id, title:p.title, with:{nick:p.seller.nick, temp:p.seller.temp}, msgs:[chatMsg('sys', p.seller.nick + '님과 대화를 시작했어요. 물건값은 ' + won(PRICE) + ' 고정이에요.')], at:Date.now(), unread:0, done:false, reviewed:false, warnClosed:false};
  ST.chats.push(c);
  return c;
}
function want(id, askOnly){
  var p = postById(id); if(!p) return;
  if(p.mine){ toast('내가 올린 물건이에요.'); return; }
  if(p.status === 'done'){ toast('이미 거래가 끝난 물건이에요.'); return; }
  if(ST.me.blockedUntil > Date.now()){ var b = new Date(ST.me.blockedUntil); toast('약속을 ' + NOSHOW_LIMIT + '번 지키지 않아 ' + (b.getMonth() + 1) + '월 ' + b.getDate() + '일까지 원해요를 누를 수 없어요.'); return; }
  if(!ST.flags.safetyAgreed){ openSheet({k:'safety', id:id, ask:!!askOnly}); return; }
  var c = ensureChat(p);
  if(c.left){ c.left = false; }
  if(!askOnly && !p.wanted){ p.wanted = true; p.wants++; c.msgs.push(chatMsg('me', '원해요! 언제 받을 수 있을까요?')); c.at = Date.now(); }
  save(); dirtyTabs();
  var t = document.getElementById('tab-' + NAV.tab); if(t){ var st = t.scrollTop; renderTab(NAV.tab); DIRTY[NAV.tab] = false; t.scrollTop = st; }
  openView({v:'chat', id:c.id});
}
function showRiskWarn(layer){
  if(!layer || layer.querySelector('.inline-warn')) return;
  var row = layer.querySelector('.composer-row'); if(!row) return;
  var w = document.createElement('p'); w.className = 'inline-warn'; w.textContent = RISK_WARN;
  row.parentNode.insertBefore(w, row);
}
function hideRiskWarn(layer){ var w = layer && layer.querySelector('.inline-warn'); if(w) w.remove(); }
/* text를 주면(빠른 답장) 그 글을 보내고, 없으면 입력창의 글을 보낸다 */
function sendMsg(cid, given){
  var c = chatById(cid); if(!c || c.done) return;
  var layer = layerOf({v:'chat', id:cid}); if(!layer) return;
  var ta = layer.querySelector('textarea.msg');
  var typed = given == null;
  var text = String(typed ? (ta ? ta.value : '') : given).trim();
  if(!text) return;
  var armed = UI.riskArmed && UI.riskArmed.cid === cid && UI.riskArmed.text === text;
  if(risky(text) && !armed){ UI.riskArmed = {cid:cid, text:text}; showRiskWarn(layer); return; }
  if(UI.riskArmed && UI.riskArmed.cid === cid){ UI.riskArmed = null; hideRiskWarn(layer); }
  c.msgs.push(chatMsg('me', text)); c.at = Date.now();
  if(typed && ta){ ta.value = ''; ta.style.height = ''; delete UI.chatDraft[cid]; }
  save(); DIRTY.home = true;
  refreshMsgs(cid);
}
function adjustSellerTemp(nick, delta){
  ST.posts.forEach(function(p){ if(!p.mine && p.seller.nick === nick) p.seller.temp = clampTemp(p.seller.temp + delta); });
  ST.chats.forEach(function(c){ if(c.with.nick === nick) c.with.temp = clampTemp(c.with.temp + delta); });
}
/* 약속 시간: 오늘은 지금보다 뒤 시간만, 오늘 남은 시간이 없으면 내일부터 */
var APPT_SLOTS = ['12:00','15:00','18:00','19:00','20:00','21:00'];
function apptPick(sd){
  var h = new Date().getHours();
  var todayOK = APPT_SLOTS.filter(function(x){ return parseInt(x, 10) > h; });
  var day = sd.day || (todayOK.length ? '오늘' : '내일');
  if(day === '오늘' && !todayOK.length) day = '내일';
  var avail = day === '오늘' ? todayOK : APPT_SLOTS;
  var time = (sd.time && avail.indexOf(sd.time) >= 0) ? sd.time : avail[0];
  return {day:day, time:time, avail:avail, todayOK:todayOK.length > 0};
}
function dayLabel(word){
  var off = ['오늘','내일','모레'].indexOf(word); if(off < 0) off = 0;
  var d = new Date(); d.setDate(d.getDate() + off);
  return (d.getMonth() + 1) + '월 ' + d.getDate() + '일(' + '일월화수목금토'.charAt(d.getDay()) + ')';
}

/* ---------- 위치 확인 ---------- */
/* 시제품은 동네 경계 자료가 없어 위치만 받아 둔다. 적어 둔 동네와 맞는지는 정식 앱에서 확인한다 */
function verifyTown(){
  if(!ST.flags.onboarded) syncOnbInputs();
  var town = String(ST.flags.onboarded ? ST.me.town : ((UI.onbData || {}).town || '')).trim();
  if(!town){ toast('먼저 우리 동네를 적어 주세요.'); var f = document.getElementById('ob-town'); if(f) f.focus(); return; }
  if(!navigator.geolocation){ toast('이 기기에서는 위치를 확인할 수 없어요.'); return; }
  if(UI.locating) return;
  UI.locating = true; rerenderAfterLocate();
  navigator.geolocation.getCurrentPosition(function(pos){
    UI.locating = false;
    ST.me.verified = true; ST.me.verifiedTown = town; ST.me.verifiedAt = Date.now();
    ST.me.lat = Math.round(pos.coords.latitude * 100) / 100; ST.me.lng = Math.round(pos.coords.longitude * 100) / 100;
    ST.posts.forEach(function(p){ if(p.mine) p.seller.verified = ST.me.town === town; });
    save(); rerenderAfterLocate();
    toast('위치를 확인했어요. 시제품이라 동네 이름과 맞는지는 아직 확인하지 않아요.');
  }, function(err){
    UI.locating = false;
    rerenderAfterLocate();
    toast(err && err.code === 1 ? '위치 권한이 꺼져 있어요. 휴대폰 설정 > 애플리케이션 > 천샵 > 권한에서 위치를 허용해 주세요.' : '위치를 찾지 못했어요. 휴대폰의 위치(GPS)가 켜져 있는지 확인하고 다시 해 주세요.');
  }, {enableHighAccuracy:false, timeout:15000, maximumAge:600000});
}
function rerenderAfterLocate(){
  if(!ST.flags.onboarded){ syncOnbInputs(); renderOnboard(); return; }
  if(NAV.sheet && NAV.sheet.k === 'settings') closeSheet();
  refreshAll();
}
function syncOnbInputs(){ var d = UI.onbData; if(!d) return; var a = document.getElementById('ob-nick'), b = document.getElementById('ob-town'); if(a) d.nick = a.value; if(b) d.town = b.value; }

/* ---------- 버튼 동작 ---------- */
function postViewless(id){ return function(v){ return !(v.v === 'item' && v.id === id); }; }
var A = {
  tab:function(el){ setTab(el.getAttribute('data-tab')); },
  back:function(){ back(); },
  upload:function(){ if(!UI.draft) UI.draft = newDraft(); openView({v:'upload'}); },
  chats:function(){ openView({v:'chats'}); },
  openChat:function(el){ openView({v:'chat', id:el.getAttribute('data-id')}); },
  openItem:function(el){ openView({v:'item', id:el.getAttribute('data-id')}); },
  filter:function(el){ UI.filter = el.getAttribute('data-f'); DIRTY.shorts = true; renderTab('home'); },
  gtab:function(el){ UI.gtab = el.getAttribute('data-g'); renderTab('me'); },
  gtabLiked:function(){ UI.gtab = 'liked'; DIRTY.me = true; setTab('me'); },
  /* 찜은 그 자리에서 바꾼다. 화면을 다시 그리면 재생 중인 영상이 처음부터 다시 나온다 */
  like:function(el){
    var id = el.getAttribute('data-id'), p = postById(id); if(!p) return;
    p.liked = !p.liked; p.likes = Math.max(0, p.likes + (p.liked ? 1 : -1));
    save();
    Array.prototype.forEach.call(document.querySelectorAll('[data-act="like"][data-id="' + id + '"]'), function(b){
      b.classList.toggle('liked', p.liked); b.setAttribute('aria-pressed', String(p.liked));
      var svg = b.querySelector('svg'); if(svg) svg.outerHTML = ic(p.liked ? 'heartF' : 'heart');
      var n = b.querySelector('.n'); if(n) n.textContent = p.likes;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-counts="' + id + '"]'), function(x){ x.textContent = countsText(p); });
    DIRTY.me = true;
  },
  ask:function(el){ var id = el.getAttribute('data-id'), p = postById(id); if(p && p.mine){ openView({v:'item', id:id}); return; } want(id, true); },
  want:function(el){
    var id = el.getAttribute('data-id'), p = postById(id);
    if(p && p.wanted){ var c = chatForPost(id); if(c && !c.left){ openView({v:'chat', id:c.id}); return; } }
    want(id, false);
  },
  mute:function(){ UI.muted = !UI.muted; Array.prototype.forEach.call(document.querySelectorAll('video'), function(v){ v.muted = UI.muted; }); Array.prototype.forEach.call(document.querySelectorAll('[data-act="mute"]'), function(b){ b.innerHTML = ic(UI.muted ? 'soundOff' : 'soundOn'); b.setAttribute('aria-label', UI.muted ? '소리 켜기' : '소리 끄기'); }); },
  postMenu:function(el){ UI.confirm = null; openSheet({k:'postMenu', id:el.getAttribute('data-id')}); },
  chatMenu:function(el){ UI.confirm = null; openSheet({k:'chatMenu', id:el.getAttribute('data-id')}); },
  rules:function(){ openSheet({k:'rules'}); },
  banned:function(){ openSheet({k:'banned'}); },
  settings:function(){ UI.confirm = null; openSheet({k:'settings'}); },
  editProfile:function(){ UI.sheetData = {}; openSheet({k:'profile'}); },
  closeSheet:function(){ closeSheet(); },
  verify:function(){ verifyTown(); },
  agreeSafety:function(){
    var s = NAV.sheet || {};
    ST.flags.safetyAgreed = true; save();
    if(s.id){ want(s.id, s.ask); } else closeSheet();
  },
  setStatus:function(el){
    var p = postById(el.getAttribute('data-id')); if(!p || !p.mine) return;
    p.status = el.getAttribute('data-s');
    save(); if(NAV.sheet) closeSheet();
    refreshAll(); toast(p.status === 'done' ? '거래 완료로 바꿨어요.' : (p.status === 'reserved' ? '예약을 걸었어요.' : '예약을 풀었어요. 다시 판매중이에요.'));
  },
  delPost:function(el){
    var id = el.getAttribute('data-id');
    if(UI.confirm !== 'del' + id){ UI.confirm = 'del' + id; renderSheet(); return; }
    var p = postById(id); if(!p) return;
    p.media.forEach(function(m){ if(m.id){ idbDel('media', m.id); if(URLS[m.id]){ URL.revokeObjectURL(URLS[m.id]); delete URLS[m.id]; } } if(m.poster) idbDel('media', m.poster); });
    ST.posts = ST.posts.filter(function(x){ return x !== p; });
    UI.confirm = null; save(); dirtyTabs();
    var n = clone(NAV); n.sheet = null; n.stack = n.stack.filter(postViewless(id));
    popTo(n, function(){ refreshAll(); toast('물건을 지웠어요.'); });
  },
  hidePost:function(el){
    var p = postById(el.getAttribute('data-id')); if(!p) return;
    p.hidden = true; save(); dirtyTabs();
    var n = clone(NAV); n.sheet = null; n.stack = n.stack.filter(postViewless(p.id));
    popTo(n, function(){ refreshAll(); toast('이 글을 숨겼어요.'); });
  },
  report:function(el){ var id = el.getAttribute('data-id'); if(!postById(id)){ toast('지워진 물건이에요.'); return; } openSheet({k:'report', id:id}); },
  reportSend:function(el){
    var p = postById(el.getAttribute('data-id'));
    if(p){ p.reported = el.getAttribute('data-v'); p.hidden = true; save(); dirtyTabs(); }
    var n = clone(NAV); n.sheet = null; if(p) n.stack = n.stack.filter(postViewless(p.id));
    popTo(n, function(){ refreshAll(); toast('신고했어요. 정식 앱에서는 운영팀이 확인해요.'); });
  },
  toggleSamples:function(){ ST.flags.samples = !ST.flags.samples; save(); dirtyTabs(); closeSheet(); toast(ST.flags.samples ? '예시 물건을 다시 보여 줘요.' : '예시 물건을 숨겼어요.'); },
  resetAll:function(){
    if(UI.confirm !== 'reset'){ UI.confirm = 'reset'; renderSheet(); return; }
    idbClear().then(function(){ try{ localStorage.removeItem('cheonshop.state'); }catch(e){} location.replace(location.pathname); });
  },
  profileSave:function(){
    var sd = UI.sheetData, nick = String(sd.nick != null ? sd.nick : ST.me.nick).trim(), town = String(sd.town != null ? sd.town : ST.me.town).trim();
    if(!nick){ toast('닉네임을 적어 주세요.'); return; }
    if(!town){ toast('우리 동네를 적어 주세요.'); return; }
    var lost = townOK() && town !== ST.me.verifiedTown;
    ST.me.nick = nick; ST.me.town = town;
    ST.posts.forEach(function(p){ if(p.mine){ p.seller.nick = nick; p.seller.town = town; p.seller.verified = townOK(); } });
    save(); closeSheet(); refreshAll();
    if(lost) toast('동네가 바뀌어서 위치를 다시 확인해야 해요.');
  },
  dropMedia:function(el){
    var d = UI.draft; if(!d || d.busy) return;
    var m = d.media.splice(+el.getAttribute('data-i'), 1)[0]; if(m) dropDraftMedia(m);
    renderUploadMedia(); persistDraft();
  },
  draftCond:function(el){
    UI.draft.cond = el.getAttribute('data-v');
    Array.prototype.forEach.call(el.parentNode.children, function(b){ b.setAttribute('aria-pressed', String(b === el)); });
    persistDraft();
  },
  draftShip:function(el){ UI.draft.ship = !UI.draft.ship; el.setAttribute('aria-checked', String(UI.draft.ship)); persistDraft(); },
  draftAgree:function(el){ UI.draft.agree = !UI.draft.agree; el.setAttribute('aria-checked', String(UI.draft.agree)); syncPublishButtons(); persistDraft(); },
  publish:function(){ publish(); },
  quick:function(el){ sendMsg(el.getAttribute('data-id'), el.getAttribute('data-v')); },
  sendMsg:function(el){ sendMsg(el.getAttribute('data-id')); },
  closeWarn:function(el){ var c = chatById(el.getAttribute('data-id')); if(c){ c.warnClosed = true; save(); } var w = el.closest('.warnbox'); if(w) w.remove(); },
  appt:function(el){ UI.sheetData = {}; openSheet({k:'appt', id:el.getAttribute('data-id')}); },
  sd:function(el){ UI.sheetData[el.getAttribute('data-k')] = el.getAttribute('data-v'); if(el.getAttribute('data-k') === 'mood') UI.sheetData.tags = []; renderSheet(); },
  sdTag:function(el){ var t = el.getAttribute('data-v'), a = UI.sheetData.tags || (UI.sheetData.tags = []), i = a.indexOf(t); if(i >= 0) a.splice(i, 1); else a.push(t); renderSheet(); },
  apptSave:function(el){
    var c = chatById(el.getAttribute('data-id')); if(!c) return;
    var p = postById(c.postId), sd = UI.sheetData;
    var place = String(sd.place != null ? sd.place : (p && p.place) || '').trim();
    if(!place){ toast('만날 장소를 적어 주세요.'); var f = document.getElementById('appt-place'); if(f) f.focus(); return; }
    if(risky(place)){ toast('장소에는 연락처나 계좌를 적지 말아 주세요.'); return; }
    var pick = apptPick(sd);
    c.msgs.push({id:uid(), from:'me', card:{type:'appt', day:dayLabel(pick.day), time:pick.time, place:place, late:parseInt(pick.time, 10) >= 21}, at:Date.now()});
    c.at = Date.now(); save(); refreshMsgs(c.id); closeSheet();
  },
  shipReq:function(el){ var c = chatById(el.getAttribute('data-id')); if(!c) return; c.msgs.push({id:uid(), from:'me', card:{type:'ship'}, at:Date.now()}); c.at = Date.now(); save(); refreshMsgs(c.id); },
  doneDeal:function(el){ UI.sheetData = {}; openSheet({k:'review', id:el.getAttribute('data-id')}); },
  reviewSave:function(el){
    var c = chatById(el.getAttribute('data-id')); if(!c) return;
    var sd = UI.sheetData; if(!sd.mood) return;
    var n = (sd.tags || []).length;
    adjustSellerTemp(c.with.nick, (sd.mood === 'good' ? 1 : -1) * (0.1 + 0.1 * n));
    c.done = true; c.reviewed = true;
    var p = postById(c.postId); if(p && !p.mine) p.status = 'done';
    c.msgs.push(chatMsg('sys', '거래를 마쳤어요. ' + (sd.mood === 'good' ? '좋았어요' : '별로였어요') + ' 후기를 보냈어요.'));
    c.at = Date.now(); save(); closeSheet(); refreshAll(); toast('후기를 보냈어요.');
  },
  noShow:function(el){ openSheet({k:'noShow', id:el.getAttribute('data-id')}); },
  noShowSave:function(el){
    var c = chatById(el.getAttribute('data-id')); if(!c) return;
    if(!hasAppt(c)){ toast('약속을 잡은 뒤에 신고할 수 있어요.'); closeSheet(); return; }
    if(c.noShowAt){ toast('이미 신고했어요.'); closeSheet(); return; }
    c.noShowAt = Date.now();
    adjustSellerTemp(c.with.nick, -0.5);
    c.msgs.push(chatMsg('sys', '상대가 약속 장소에 나오지 않았다고 신고했어요. 상대의 매너온도가 내려가요.'));
    c.at = Date.now(); save(); closeSheet(); refreshAll();
  },
  leaveChat:function(el){
    var id = el.getAttribute('data-id');
    if(UI.confirm !== 'leave' + id){ UI.confirm = 'leave' + id; renderSheet(); return; }
    var c = chatById(id);
    /* 끝난 거래는 거래완료·후기 기록이 남도록 목록에서만 뺀다 */
    if(c && c.done){ c.left = true; c.unread = 0; }
    else ST.chats = ST.chats.filter(function(x){ return x.id !== id; });
    delete UI.chatDraft[id];
    UI.confirm = null; save(); dirtyTabs();
    var n = clone(NAV); n.sheet = null; n.stack = n.stack.filter(function(v){ return !(v.v === 'chat' && v.id === id); });
    popTo(n, function(){ refreshAll(); toast('채팅방에서 나왔어요.'); });
  },
  onbNext:function(){ UI.onb = 1; renderOnboard(); var x = document.getElementById('ob-nick'); if(x) x.focus(); },
  onbDone:function(){
    syncOnbInputs();
    var d = UI.onbData || {}, nick = String(d.nick || '').trim(), town = String(d.town || '').trim();
    if(!nick){ toast('닉네임을 적어 주세요.'); var a = document.getElementById('ob-nick'); if(a) a.focus(); return; }
    if(!town){ toast('우리 동네를 적어 주세요.'); var b = document.getElementById('ob-town'); if(b) b.focus(); return; }
    ST.me.nick = nick; ST.me.town = town; ST.flags.onboarded = true;
    seedSamples(); save(); dirtyTabs();
    NAV = {tab:'home', stack:[], sheet:null};
    try{ history.replaceState(clone(NAV), ''); }catch(e){}
    document.getElementById('app').innerHTML = '';
    apply();
    if(townOK()) toast('위치를 확인한 ' + town + ' 이웃으로 시작해요.');
  }
};

document.addEventListener('click', function(e){
  var el = e.target.closest('[data-act]'); if(!el) return;
  var f = A[el.getAttribute('data-act')]; if(!f) return;
  if(el.tagName === 'LABEL') return;
  e.preventDefault(); f(el, e);
});
/* 보내기·빠른 답장을 눌러도 입력창이 포커스를 잃지 않게 (키보드가 내려가지 않게) */
function keepFocus(e){ if(e.target.closest && e.target.closest('.send, .quick .say')) e.preventDefault(); }
document.addEventListener('pointerdown', keepFocus);
document.addEventListener('mousedown', keepFocus);
document.addEventListener('input', function(e){
  var el = e.target;
  if(el.hasAttribute('data-bind') && UI.draft){
    UI.draft[el.getAttribute('data-bind')] = el.value;
    syncPublishButtons(); persistDraft();
  }
  if(el.hasAttribute('data-sd')) UI.sheetData[el.getAttribute('data-sd')] = el.value;
  if(el.hasAttribute('data-ob')){ (UI.onbData || (UI.onbData = {}))[el.getAttribute('data-ob')] = el.value; }
  if(el.matches && el.matches('textarea.msg')){
    var cid = el.getAttribute('data-id');
    fitTextarea(el);
    UI.chatDraft[cid] = el.value;
    if(UI.riskArmed && UI.riskArmed.cid === cid && UI.riskArmed.text !== el.value.trim()){ UI.riskArmed = null; hideRiskWarn(el.closest('.layer')); }
  }
});
document.addEventListener('change', function(e){
  var el = e.target;
  if(!el.hasAttribute('data-file')) return;
  var files = Array.prototype.slice.call(el.files || []);
  var kind = el.getAttribute('data-file');
  el.value = '';
  if(!files.length) return;
  if(kind === 'media') addFiles(files);
  if(kind === 'avatar'){
    shrinkImage(files[0], 400).then(function(b){
      var id = 'm' + uid();
      return idbPut('media', id, b).then(function(ok){
        if(!ok){ toast('사진을 저장하지 못했어요.'); return; }
        if(ST.me.avatar) idbDel('media', ST.me.avatar);
        URLS[id] = URL.createObjectURL(b); ST.me.avatar = id; save(); renderSheet(); refreshAll();
      });
    }, function(){ toast('이 사진은 열 수 없어요.'); });
  }
});
document.addEventListener('keydown', function(e){
  if(e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && e.target.matches && e.target.matches('textarea.msg')){
    e.preventDefault(); sendMsg(e.target.getAttribute('data-id'));
  }
});
/* 사진 넘김 표시(1/3) */
document.addEventListener('scroll', function(e){
  var t = e.target;
  if(!t || !t.getAttribute || !t.hasAttribute('data-pager')) return;
  var k = Math.round(t.scrollLeft / Math.max(1, t.clientWidth)) + 1, n = t.children.length;
  var lab = document.querySelector('[data-pager-label="' + t.getAttribute('data-pager') + '"]');
  if(lab) lab.textContent = k + '/' + n;
}, true);

/* ---------- 시작 ---------- */
function boot(){
  idbGet('kv', 'state').then(function(raw){
    var s = null;
    try{ s = raw ? JSON.parse(raw) : null; }catch(e){ s = null; }
    if(!s){ try{ var ls = localStorage.getItem('cheonshop.state'); s = ls ? JSON.parse(ls) : null; }catch(e){ s = null; } }
    if(s && s.v === 1){
      var f = freshState();
      ST = {v:1, me:Object.assign(f.me, s.me || {}), posts:Array.isArray(s.posts) ? s.posts : [], chats:Array.isArray(s.chats) ? s.chats : [], flags:Object.assign(f.flags, s.flags || {})};
      /* 0.1.3 이전 기록: 위치 확인 때의 동네를 몰라서 지금 동네로 본다 */
      if(ST.me.verified && !ST.me.verifiedTown) ST.me.verifiedTown = ST.me.town;
    }
    return ST.flags.onboarded ? restoreDraft() : null;
  }).then(function(openDraft){
    NAV = {tab:'home', stack:[], sheet:null};
    try{ history.replaceState(clone(NAV), ''); }catch(e){}
    if(openDraft){
      /* 사진을 찍는 사이 앱이 꺼졌다면 쓰던 화면으로 돌아간다 */
      NAV = {tab:'home', stack:[{v:'upload'}], sheet:null};
      try{ history.pushState(clone(NAV), ''); }catch(e){}
      UI.upOpen = true;
    }
    apply();
    if(openDraft) toast('쓰던 글을 이어서 쓸 수 있어요.');
  });
}
boot();
})();
