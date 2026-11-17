/* بايت للطاقة الشمسية — الوضع السحابي (Supabase)
   البيانات = نسخة كاملة + سجل تغييرات مرتب. كل جهاز يرسل تغييراته (ops) ويستلم تغييرات غيره.
   يشتغل على الحاسبة (بعد التفعيل من الإعدادات) وعلى الموبايل من موقع بايت. */
(function(){
  const URL_=window.__BSC_URL||'https://bffwdgkzeqzemkpnzrti.supabase.co';
  const KEY_='sb_publishable_ZVpke7RnxEItfek57rI6LA_4pn-rjeL';
  const WS_=URL_.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(KEY_)+'&vsn=1.0.0';
  const SELLER_WA='+964 786 749 2096';
  const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
  const J=s=>{try{return JSON.parse(s)}catch(e){return null}};
  const clone=o=>JSON.parse(JSON.stringify(o));
  const rid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isWeb=/(^|\.)github\.io$/i.test(location.hostname)||/[?&]cloud=1/.test(location.search);
  const isDesk=()=>!!window.byteDesktop;
  let dev=LS.get('bsc_dev');if(!dev){dev=rid();LS.set('bsc_dev',dev)}

  /* ---------- الحالة ---------- */
  const S={auth:null,uid:'',email:'',shop:null,confirmed:null,cRev:0,snapRev:0,pending:[],acked:[],inflight:false,online:true,expired:false,ws:null,wsOk:false,pullBusy:false,pullAgain:false,started:false};

  /* ---------- تسجيل الدخول (Supabase Auth) ---------- */
  function saveAuth(a){S.auth=a;if(a){S.uid=a.user&&a.user.id||S.uid;S.email=a.user&&a.user.email||S.email;LS.set('bsc_auth',JSON.stringify(a))}else LS.del('bsc_auth')}
  function loadAuth(){const a=J(LS.get('bsc_auth'));if(a&&a.refresh_token&&a.user){S.auth=a;S.uid=a.user.id;S.email=a.user.email||''}return S.auth}
  async function authReq(path,body){
    const r=await fetch(URL_+'/auth/v1/'+path,{method:'POST',headers:{apikey:KEY_,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.msg||j.error_description||j.message||j.error||('HTTP '+r.status)),{code:j.error_code||j.code||r.status});
    if(j.access_token){j.expires_at=j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600)}return j;
  }
  let refreshing=null;
  async function refresh(){
    if(refreshing)return refreshing;
    refreshing=(async()=>{try{const j=await authReq('token?grant_type=refresh_token',{refresh_token:S.auth.refresh_token});saveAuth(j);wsToken();return true}
      catch(e){if(e.code===400||e.code===401||/refresh/i.test(e.message)){saveAuth(null);showLogin('انتهت الجلسة، سجّل دخول مرة ثانية.');}throw e}finally{refreshing=null}})();
    return refreshing;
  }
  async function token(){if(!S.auth)throw new Error('no auth');if(S.auth.expires_at-60<Date.now()/1000)await refresh();return S.auth.access_token}
  async function api(path,o){
    o=o||{};for(let t=0;t<2;t++){
      const r=await fetch(URL_+path,{method:o.method||'GET',cache:'no-store',headers:Object.assign({apikey:KEY_,Authorization:'Bearer '+await token()},o.body!==undefined&&!(o.body instanceof Blob)?{'Content-Type':'application/json'}:{},o.headers||{}),body:o.body===undefined?undefined:(o.body instanceof Blob?o.body:JSON.stringify(o.body))});
      if(r.status===401&&t===0){await refresh();continue}
      if(o.raw)return r;
      const txt=await r.text();const j=txt?J(txt):null;
      if(!r.ok)throw Object.assign(new Error((j&&(j.message||j.msg||j.error))||('HTTP '+r.status)),{status:r.status,body:j});
      return j;
    }
  }

  /* ---------- التخزين المحلي (للعمل بدون إنترنت) ---------- */
  const cacheKey=()=>'bsc:'+S.uid;
  let cacheT=null;
  function saveCache(){clearTimeout(cacheT);cacheT=setTimeout(()=>{try{idbPut(cacheKey(),{confirmed:S.confirmed,cRev:S.cRev,snapRev:S.snapRev,shop:S.shop&&{name:S.shop.name,expires_at:S.shop.expires_at}})}catch(e){}},1500)}
  function savePend(){LS.set('bsc_pend:'+S.uid,JSON.stringify({pending:S.pending,acked:S.acked}))}
  function loadPend(){const p=J(LS.get('bsc_pend:'+S.uid))||{};S.pending=Array.isArray(p.pending)?p.pending:[];S.acked=Array.isArray(p.acked)?p.acked:[]}

  /* ---------- بناء البيانات المحلية = المؤكد + التغييرات اللي بعدها ما تأكدت ---------- */
  function rebuild(){
    const d=clone(S.confirmed||{});
    for(const a of S.acked)if(a.rev>S.cRev)BSYNC.apply(d,a.ops);
    for(const p of S.pending)BSYNC.apply(d,p.ops);
    db=d;try{migrate()}catch(e){}try{migrateItems()}catch(e){}
    SBASE=clone(db);if(typeof CUR!=='undefined'&&CUR)CUR=activeUsers().find(u=>u.id===CUR.id)||null;
    deskCopy();
  }
  function deskCopy(){if(isDesk())LS.set(typeof KEY!=='undefined'?KEY:'hisabat_db_v1',JSON.stringify(db))}

  /* ---------- الحفظ: فرق التغييرات → طابور → السيرفر ---------- */
  function save(){
    if(!SBASE)return;const ops=BSYNC.diff(SBASE,db);if(!ops.length)return;
    SBASE=clone(db);S.pending.push({id:rid(),ops});savePend();deskCopy();pump();
  }
  let pumpT=null;
  async function pump(){
    if(S.inflight||!S.pending.length||!S.auth||!S.shop)return;S.inflight=true;const p=S.pending[0];
    try{
      const r=await api('/rest/v1/shop_ops?select=rev',{method:'POST',headers:{Prefer:'return=representation'},body:{shop_id:S.uid,ops:p.ops,client:dev+':'+p.id}});
      const rev=r&&r[0]&&r[0].rev;S.pending.shift();S.acked.push({id:p.id,ops:p.ops,rev:rev||Infinity});savePend();setOnline(true);setExpired(false);
      S.inflight=false;if(S.pending.length)return pump();pull();
    }catch(e){
      S.inflight=false;
      if(e.status===401||e.status===403||/row-level security|policy/i.test(e.message)){setExpired(true);clearTimeout(pumpT);pumpT=setTimeout(()=>{refreshShop().then(pump)},60000);return}
      if(e.status>=400&&e.status<500&&e.status!==408&&e.status!==429){console.warn('cloud push rejected',e);S.pending.shift();savePend();rebuild();safeRender();return pump()}
      setOnline(false);clearTimeout(pumpT);pumpT=setTimeout(pump,4000);
    }
  }

  /* ---------- الاستلام: تغييرات بعد آخر رقم ---------- */
  async function pull(){
    if(!S.auth||!S.shop)return;if(S.pullBusy){S.pullAgain=true;return}S.pullBusy=true;
    try{
      let foreign=false,got=0;
      for(let guard=0;guard<50;guard++){
        const rows=await api(`/rest/v1/shop_ops?select=rev,ops,client&shop_id=eq.${S.uid}&rev=gt.${S.cRev}&order=rev.asc&limit=300`);
        if(!rows.length)break;
        if(rows[0].rev!==S.cRev+1){await loadSnapshot();foreign=true;continue} // تغييرات قديمة انمسحت → ناخذ النسخة الكاملة
        for(const r of rows){BSYNC.apply(S.confirmed,r.ops);S.cRev=r.rev;if(!S.acked.some(a=>dev+':'+a.id===r.client))foreign=true}
        got+=rows.length;if(rows.length<300)break;
      }
      const before=S.acked.length;S.acked=S.acked.filter(a=>a.rev>S.cRev);if(S.acked.length!==before)savePend();
      setOnline(true);
      if(got||foreign){saveCache();if(foreign){rebuild();safeRender()}}
      maybeSnapshot();
    }catch(e){if(e.status!==401)setOnline(false)}
    finally{S.pullBusy=false;if(S.pullAgain){S.pullAgain=false;pull()}}
  }
  async function loadSnapshot(){
    const r=await api(`/rest/v1/shops?select=id,name,snap,snap_rev,rev,expires_at&id=eq.${S.uid}`);const s=r&&r[0];if(!s)throw new Error('no shop');
    S.shop={name:s.name,expires_at:s.expires_at};S.confirmed=s.snap||{};S.cRev=s.snap_rev||0;S.snapRev=s.snap_rev||0;setExpired(new Date(s.expires_at)<new Date());
  }
  async function refreshShop(){try{const r=await api(`/rest/v1/shops?select=name,expires_at,snap_rev,rev&id=eq.${S.uid}`);if(r&&r[0]){S.shop={name:r[0].name,expires_at:r[0].expires_at};S.snapRev=Math.max(S.snapRev,r[0].snap_rev||0);setExpired(new Date(r[0].expires_at)<new Date());saveCache()}}catch(e){}}
  let snapBusy=false;
  async function maybeSnapshot(){
    if(snapBusy||S.pending.length||S.cRev-S.snapRev<150)return;snapBusy=true;
    try{const ok=await api('/rest/v1/rpc/save_snapshot',{method:'POST',body:{p_rev:S.cRev,p_data:S.confirmed}});if(ok)S.snapRev=S.cRev;else refreshShop()}catch(e){}finally{snapBusy=false}
  }

  /* ---------- التحديث المباشر (Realtime websocket) + فحص دوري احتياطي ---------- */
  let wsRef=1,wsHb=null,wsRetry=null,pullT=null;
  const schedPull=ms=>{clearTimeout(pullT);pullT=setTimeout(pull,ms||250)};
  function wsSend(o){try{if(S.ws&&S.ws.readyState===1)S.ws.send(JSON.stringify(o))}catch(e){}}
  function wsToken(){if(S.wsOk&&S.auth)wsSend({topic:'realtime:bs-'+S.uid,event:'access_token',payload:{access_token:S.auth.access_token},ref:String(wsRef++)})}
  function wsConnect(){
    if(!S.auth||typeof WebSocket==='undefined')return;try{if(S.ws)S.ws.close()}catch(e){}
    const ws=new WebSocket(WS_);S.ws=ws;S.wsOk=false;
    ws.onopen=async()=>{let t='';try{t=await token()}catch(e){}
      wsSend({topic:'realtime:bs-'+S.uid,event:'phx_join',ref:String(wsRef++),join_ref:'1',payload:{config:{broadcast:{self:false},presence:{key:''},postgres_changes:[{event:'INSERT',schema:'public',table:'shop_ops',filter:'shop_id=eq.'+S.uid}]},access_token:t}});
      clearInterval(wsHb);wsHb=setInterval(()=>wsSend({topic:'phoenix',event:'heartbeat',payload:{},ref:String(wsRef++)}),25000)};
    ws.onmessage=e=>{const m=J(e.data);if(!m)return;
      if(m.event==='phx_reply'&&m.payload&&m.payload.status==='ok'&&m.topic!=='phoenix')S.wsOk=true;
      if(m.event==='postgres_changes'||m.event==='INSERT')schedPull(150);
      if(m.event==='system'&&m.payload&&m.payload.status==='ok')S.wsOk=true;};
    ws.onclose=()=>{S.wsOk=false;clearInterval(wsHb);clearTimeout(wsRetry);wsRetry=setTimeout(wsConnect,6000)};
    ws.onerror=()=>{};
  }
  let tick=0;setInterval(()=>{if(!S.started||document.visibilityState==='hidden')return;tick++;if(!S.wsOk||tick%4===0)pull();if(S.pending.length&&!S.inflight)pump()},15000);
  document.addEventListener('visibilitychange',()=>{if(S.started&&document.visibilityState==='visible'){pull();pump()}});
  addEventListener('online',()=>{if(S.started){pump();pull()}});

  /* ---------- أشرطة الحالة ---------- */
  function bar(id,css,txt){let b=document.getElementById(id);if(!b){b=document.createElement('div');b.id=id;document.body.appendChild(b)}b.style.cssText='display:none;position:fixed;left:0;right:0;z-index:99;color:#fff;text-align:center;padding:6px 10px;font-size:14px;'+css;b.innerHTML=txt;return b}
  function setOnline(v){if(S.online===v)return;S.online=v;const b=bar('cloudNet','top:0;background:#b42318','انقطع الإنترنت — التغييرات محفوظة على هذا الجهاز وراح تنرسل أول ما يرجع الاتصال');b.style.display=v?'none':'block'}
  function setExpired(v){S.expired=v;const b=bar('cloudExp','bottom:0;background:#9a3412',`انتهى اشتراك الحساب السحابي — البيانات للعرض فقط ولا تنحفظ التغييرات الجديدة. للتجديد واتساب <b dir="ltr">${SELLER_WA}</b>`);b.style.display=v?'block':'none'}

  /* ---------- شاشة تسجيل دخول الحساب السحابي ---------- */
  let loginResolve=null,loginP=null;
  function showLogin(msg,mode){
    let o=document.getElementById('cloudLogin');if(o)o.remove();
    o=document.createElement('div');o.id='cloudLogin';
    o.style.cssText='position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;background:radial-gradient(circle at 70% 20%,#262a6e,#0b0c1e 70%);font-family:inherit';
    const create=mode==='create';
    o.innerHTML=`<div style="background:#fff;color:#1a1d3a;border-radius:18px;padding:26px 22px;width:min(420px,100%);box-shadow:0 20px 60px rgba(0,0,0,.35)" dir="rtl">
      <div style="text-align:center;margin-bottom:14px"><div style="font-size:34px">☁️</div><h2 style="margin:6px 0 4px;font-size:20px">بايت للطاقة الشمسية</h2><div style="font-size:13px;color:#667">${create?'إنشاء حساب سحابي جديد للمحل':'تسجيل دخول الحساب السحابي للمحل'}</div></div>
      ${create?`<label style="display:block;font-size:13px;margin-bottom:10px">اسم المحل<input id="cl_name" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:11px;border:1px solid #d5d7e6;border-radius:10px;font-size:15px" value="${h((typeof db!=='undefined'&&db&&db.settings&&db.settings.shop)||'')}"></label>`:''}
      <label style="display:block;font-size:13px;margin-bottom:10px">البريد الإلكتروني<input id="cl_email" type="email" dir="ltr" autocomplete="username" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:11px;border:1px solid #d5d7e6;border-radius:10px;font-size:15px" value="${h(S.email||LS.get('bsc_last')||'')}"></label>
      <label style="display:block;font-size:13px;margin-bottom:12px">كلمة السر<input id="cl_pass" type="password" dir="ltr" autocomplete="${create?'new-password':'current-password'}" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:11px;border:1px solid #d5d7e6;border-radius:10px;font-size:15px" onkeydown="if(event.key==='Enter')BCLOUD._go('${create?'create':'login'}')"></label>
      <div id="cl_msg" style="font-size:13px;min-height:18px;color:#b42318;margin-bottom:8px;line-height:1.7">${h(msg||'')}</div>
      <button id="cl_btn" onclick="BCLOUD._go('${create?'create':'login'}')" style="width:100%;padding:12px;border:0;border-radius:10px;background:#1d2160;color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit">${create?'إنشاء الحساب':'دخول'}</button>
      <div style="text-align:center;margin-top:12px;font-size:13px"><a href="#" onclick="BCLOUD._login('','${create?'login':'create'}');return false" style="color:#1d2160">${create?'عندي حساب — تسجيل دخول':'محل جديد؟ إنشاء حساب سحابي'}</a></div>
      ${isDesk()?`<div style="text-align:center;margin-top:10px;font-size:12.5px"><a href="#" onclick="BCLOUD.disable();return false" style="color:#667">رجوع لوضع هذا الجهاز فقط (بدون سحابة)</a></div>`:''}
      ${create&&isDesk()?`<div style="font-size:12px;color:#667;margin-top:10px;line-height:1.7">راح تنرفع بيانات هذا البرنامج الحالية (المواد والفواتير والزبائن...) للحساب الجديد.</div>`:''}
      ${!create&&isDesk()?`<div style="font-size:12px;color:#667;margin-top:10px;line-height:1.7">إذا الحساب بيه بيانات، تحل محل بيانات هذا الجهاز (تنحفظ نسخة من بيانات الجهاز قبلها).</div>`:''}
      <div style="font-size:11.5px;color:#99a;text-align:center;margin-top:14px">جميع الحقوق محفوظة لدى بايت — تصميم المهندس احسان العكام</div></div>`;
    document.body.appendChild(o);setTimeout(()=>{const f=document.getElementById(create?'cl_name':'cl_email');if(f&&!f.value)f.focus();else{const p=document.getElementById('cl_pass');if(p)p.focus()}},50);
    if(!loginP)loginP=new Promise(r=>{loginResolve=r});return loginP;
  }
  const ERR={invalid_credentials:'البريد أو كلمة السر غلط',user_already_exists:'هذا البريد مسجّل مسبقاً — سجّل دخول',weak_password:'كلمة السر ضعيفة (6 أحرف على الأقل)',email_address_invalid:'البريد غير صحيح',over_email_send_rate_limit:'محاولات كثيرة، انتظر شوية',validation_failed:'تأكد من البريد وكلمة السر'};
  async function go(kind){
    const m=document.getElementById('cl_msg'),b=document.getElementById('cl_btn');const email=(document.getElementById('cl_email').value||'').trim().toLowerCase(),pass=document.getElementById('cl_pass').value||'';
    if(!/^\S+@\S+\.\S+$/.test(email)){m.textContent='اكتب البريد الإلكتروني';return}if(pass.length<6){m.textContent='كلمة السر 6 أحرف على الأقل';return}
    const name=kind==='create'?(document.getElementById('cl_name').value||'').trim():'';if(kind==='create'&&!name){m.textContent='اكتب اسم المحل';return}
    b.disabled=true;b.style.opacity=.6;m.style.color='#1d2160';m.textContent='جاري الاتصال...';
    try{
      let j;if(kind==='create'){j=await authReq('signup',{email,password:pass,data:{shop:name}});if(!j.access_token){if(j.user||j.id)throw new Error('الحساب انعمل بس يحتاج تأكيد البريد — راجع صاحب البرنامج');}}
      else j=await authReq('token?grant_type=password',{email,password:pass});
      saveAuth(j);LS.set('bsc_last',email);
      const o=document.getElementById('cloudLogin');if(o)o.remove();
      const r=loginResolve;loginResolve=null;loginP=null;if(r)r({kind,name});else location.reload();
    }catch(e){m.style.color='#b42318';m.textContent=ERR[e.code]||(/fetch|network/i.test(e.message)?'تعذر الاتصال بالإنترنت':e.message);b.disabled=false;b.style.opacity=1}
  }

  /* ---------- التشغيل ---------- */
  function emptyDb(){const d={settings:defaultSettings(),items:[],customers:[],invoices:[],stockIns:[],nextNo:15754,numFix:1,quotes:[],nextQuote:1,sample:false};return d}
  function localDb(){try{const s=LS.get(typeof KEY!=='undefined'?KEY:'hisabat_db_v1');return s?JSON.parse(s):null}catch(e){return null}}
  async function boot(){
    document.body.classList.add('cloud-mode');
    let intent=null;
    if(!loadAuth())intent=await showLogin('',LS.get('bsc_wantCreate')==='1'?'create':'login');
    LS.del('bsc_wantCreate');
    loadPend();
    // بيانات من الكاش (يشتغل حتى بدون إنترنت)
    let c=null;try{c=await idbGet(cacheKey())}catch(e){}
    if(c&&c.confirmed){S.confirmed=c.confirmed;S.cRev=c.cRev||0;S.snapRev=c.snapRev||0;S.shop=c.shop||{name:'',expires_at:''};}
    if(!S.confirmed){
      // أول مرة على هذا الجهاز: نجيب المحل من السحابة أو ننشئه
      for(;;){
        try{
          const r=await api(`/rest/v1/shops?select=id&id=eq.${S.uid}`);
          if(!r.length){
            const local=isDesk()?localDb():null;
            const data=local&&!local.sample?local:emptyDb();
            const nm=(intent&&intent.name)||(data.settings&&data.settings.shop)||'';
            if(intent&&intent.name&&data.settings&&data!==local)data.settings.shop=intent.name;
            await api('/rest/v1/rpc/create_shop',{method:'POST',body:{p_name:nm,p_data:data}});
          }else if(isDesk()){const local=localDb();if(local&&!local.sample)LS.set('hisabat_db_v1_before_cloud',JSON.stringify(local))}
          await loadSnapshot();break;
        }catch(e){
          if(!S.auth){intent=await showLogin('');continue}
          await new Promise(r=>{const o=document.createElement('div');o.id='cloudWait';o.style.cssText='position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:#0b0c1e;color:#fff;font-size:16px;text-align:center;padding:20px;line-height:2';o.innerHTML=`تعذر الاتصال بالسحابة (${h(e.message)})<br><button style="margin-top:10px;padding:10px 22px;border-radius:10px;border:0;font-size:15px;cursor:pointer" onclick="this.parentNode.remove()">إعادة المحاولة</button>${isDesk()?'<br><a href="#" style="color:#aab;font-size:13px" onclick="BCLOUD.disable();return false">رجوع لوضع هذا الجهاز فقط</a>':''}`;document.body.appendChild(o);const iv=setInterval(()=>{if(!document.getElementById('cloudWait')){clearInterval(iv);r()}},300)});
        }
      }
      saveCache();
    }
    rebuild();S.started=true;
    REMOTE=false;
    const f=document.querySelector('.side-foot');if(f)f.innerHTML='☁️ متصل بالحساب السحابي.<br>البيانات مشتركة بين الحاسبة والموبايل.';
    setExpired(S.shop&&S.shop.expires_at&&new Date(S.shop.expires_at)<new Date());
    setTimeout(()=>{pump();pull();refreshShop();wsConnect()},50);
  }

  /* ---------- الوصولات الورقية على السحابة ---------- */
  const urlCache={};
  const docs={
    async save(sup,name,dataURL){
      const m=String(dataURL).match(/^data:([^;]+);base64,(.+)$/);if(!m)throw new Error('data');
      const bin=atob(m[2]),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
      const ext=(String(name).match(/\.(\w{2,5})$/)||[,m[1].split('/')[1]||'bin'])[1].toLowerCase();
      const p=`${S.uid}/${rid()}.${ext}`;
      await api('/storage/v1/object/docs/'+p,{method:'POST',body:new Blob([u8],{type:m[1]}),headers:{'Content-Type':m[1],'x-upsert':'false'}});
      return 'cld:'+p;
    },
    async url(ref){
      if(urlCache[ref])return urlCache[ref];
      const r=await api('/storage/v1/object/authenticated/docs/'+ref.slice(4),{raw:true});if(!r.ok)return '';
      const b=await r.blob();return urlCache[ref]=URL.createObjectURL(b);
    },
    async del(ref){try{await api('/storage/v1/object/docs/'+ref.slice(4),{method:'DELETE'})}catch(e){}}
  };

  /* ---------- لوحة الإعدادات ---------- */
  function panel(){
    if(!S.started)return `<div class="panel"><h2>الحساب السحابي (الموبايل والإنترنت)</h2>
      <p style="line-height:1.9;margin:0 0 10px">شغّل البرنامج من الموبايل ومن أي مكان عبر الإنترنت. البيانات تنحفظ على السحابة وتتحدث مباشرة بين الحاسبة والموبايلات.</p>
      ${REMOTE?'<div style="color:var(--warn)">هذا الجهاز متصل بسيرفر الشبكة المحلية. فعّل السحابة من جهاز السيرفر أو من وضع «جهاز واحد».</div>':isDesk()?`<div class="row"><button class="btn pri" onclick="BCLOUD.enable(true)">إنشاء حساب سحابي ورفع بياناتي</button><button class="btn" onclick="BCLOUD.enable(false)">عندي حساب — تسجيل دخول</button></div>`:''}
      <div style="font-size:12.5px;color:var(--muted);margin-top:10px;line-height:1.8">• رابط الموبايل: <b dir="ltr">alaqamihsan-ux.github.io/byteprog/solar</b><br>• يحتاج إنترنت حتى تنرسل التغييرات، وإذا انقطع يبقى يشتغل ويرسلها بعدين.</div></div>`;
    const exp=S.shop&&S.shop.expires_at?new Date(S.shop.expires_at):null,left=exp?Math.ceil((exp-new Date())/864e5):null;
    return `<div class="panel"><h2>الحساب السحابي (الموبايل والإنترنت)</h2>
      <div style="line-height:2.1">الحالة: ${S.online?'<span class="pill ok">متصل</span>':'<span class="pill bad">بدون إنترنت</span>'} ${S.pending.length?`<span class="pill warn">${S.pending.length} تغيير بانتظار الإرسال</span>`:''}<br>
      الحساب: <b dir="ltr">${h(S.email)}</b>${S.shop&&S.shop.name?` · المحل: <b>${h(S.shop.name)}</b>`:''}<br>
      الاشتراك السحابي: ${exp?(left>0?`<span class="pill ${left<=7?'warn':'ok'}">فعّال</span> لغاية <span class="num">${exp.toISOString().slice(0,10)}</span> (باقي ${left} يوم)`:'<span class="pill bad">منتهي</span>'):'—'}<br>
      رابط الموبايل: <b dir="ltr" class="num">https://alaqamihsan-ux.github.io/byteprog/solar</b> <button class="btn sm" onclick="navigator.clipboard.writeText('https://alaqamihsan-ux.github.io/byteprog/solar');toast('تم النسخ')">نسخ</button></div>
      <div style="font-size:12.5px;color:var(--muted);margin:6px 0 10px;line-height:1.8">• بالموبايل: افتح الرابط وسجّل دخول بنفس البريد وكلمة السر، وبعدها بالمستخدم (مدير/بائع). تكدر تضيفه للشاشة الرئيسية من قائمة المتصفح.<br>• للتجديد: واتساب <span dir="ltr">${SELLER_WA}</span></div>
      <div class="row"><button class="btn" onclick="BCLOUD.syncNow()">مزامنة الآن</button><button class="btn" onclick="BCLOUD.logout()">تسجيل خروج من هذا الجهاز</button>${isDesk()?'<button class="btn danger" onclick="BCLOUD.disable()">إيقاف السحابة على هذا الجهاز</button>':''}</div></div>`;
  }
  function hookSettings(){
    if(typeof V==='undefined'||!V.settings||V.settings.__cloud)return;
    const o=V.settings;V.settings=function(){return o.apply(this,arguments)+`<div style="margin-top:16px">${panel()}</div>`};V.settings.__cloud=true;
    if(typeof STABS!=='undefined'&&!STABS.some(t=>t[0]==='cloud'))STABS.splice(STABS.findIndex(t=>t[0]==='network')+1,0,['cloud','السحابة','☁️',['الحساب السحابي']]);
  }
  addEventListener('DOMContentLoaded',hookSettings);

  window.BCLOUD={
    wanted(){return isWeb||LS.get('bsc_on')==='1'},
    get on(){return S.started},
    boot,save,docs,pull,
    _go:go,_login:(m,mode)=>showLogin(m,mode),
    enable(create){LS.set('bsc_on','1');if(create)LS.set('bsc_wantCreate','1');location.reload()},
    disable(){confirmBox?confirmBox('إيقاف الوضع السحابي على هذا الجهاز؟ البرنامج يرجع يشتغل على بيانات هذا الجهاز (آخر نسخة منها محفوظة). الحساب السحابي يبقى مثل ما هو.',()=>{LS.del('bsc_on');location.reload()}):(LS.del('bsc_on'),location.reload())},
    logout(){const go_=()=>{saveAuth(null);LS.del('bsc_pend:'+S.uid);try{sessionStorage.removeItem('byte-user')}catch(e){}if(isDesk())LS.del('bsc_on');location.reload()};
      if(S.pending.length)confirmBox(`بعد ${S.pending.length} تغيير ما انرسل للسحابة. إذا طلعت هسه راح تضيع. متأكد؟`,go_);else confirmBox('تسجيل خروج من الحساب السحابي على هذا الجهاز؟',go_)},
    syncNow(){pump();pull();refreshShop().then(()=>{toast('تمت المزامنة');render()})},
    _state:S
  };
})();
