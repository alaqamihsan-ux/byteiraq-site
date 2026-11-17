/* بايت للطاقة الشمسية — إعدادات نسخة الحاسبة (تشتغل فقط داخل البرنامج المنصّب) */
(function(){
  const B=window.byteDesktop;if(!B)return;
  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dt=t=>t?new Date(t).toLocaleString('en-GB'):'—';
  let INFO=null;
  const origSettings=V.settings;
  V.settings=()=>origSettings()+`<div id="dsk" style="margin-top:16px;display:flex;flex-direction:column;gap:16px"><div class="panel"><div class="empty">جاري تحميل إعدادات البرنامج...</div></div></div>`;
  const origRender=window.render;
  window.render=function(){origRender.apply(this,arguments);if(view==='settings')fill();};

  function panel(title,body){return `<div class="panel"><h2>${title}</h2>${body}</div>`}
  async function fill(){
    const box=document.getElementById('dsk');if(!box)return;
    INFO=await B.info();const L=INFO.license,i=INFO;
    const licTxt=L.status==='active'?`<span class="pill ok">مفعّل</span> ${h(L.typeName||'')} · ${L.lifetime?'مدى الحياة':'ينتهي '+new Date(L.expiry).toISOString().slice(0,10)+' (باقي '+L.daysLeft+' يوم)'}`:L.status==='trial'?`<span class="pill warn">نسخة تجريبية</span> باقي ${L.daysLeft} يوم`:`<span class="pill bad">غير مفعّل</span>`;
    const lan=i.lan.length?i.lan.map(a=>`<b dir="ltr" class="num">http://${a}:${i.port}</b>`).join(' · '):'لا توجد شبكة';
    box.innerHTML=
    panel('ترخيص البرنامج',`<div style="line-height:2">${licTxt}<br>رمز الجهاز: <b dir="ltr" class="num" style="letter-spacing:1px">${h(L.dev)}</b> <button class="btn sm" onclick="navigator.clipboard.writeText('${h(L.dev)}');toast('تم النسخ')">نسخ</button></div>
      <div class="row" style="margin-top:8px"><input id="dk_key" dir="ltr" style="flex:1;min-width:240px;font-family:Consolas,monospace" placeholder="سيريال جديد (للتجديد أو التفعيل)"><button class="btn pri" onclick="dskAct()">تفعيل</button></div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:6px">للتفعيل أو التجديد: واتساب <span dir="ltr">+964 786 749 2096</span> — بايت للحلول البرمجية</div>`)+
    panel('التشغيل والشبكة (سيرفر وكلاينتات)',`
      <div class="row" style="gap:18px;margin-bottom:12px">${[['standalone','جهاز واحد'],['server','سيرفر (الجهاز الرئيسي)'],['client','كلاينت (يتصل بالسيرفر)']].map(([k,t])=>`<label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="radio" name="dk_mode" value="${k}" ${i.mode===k?'checked':''} style="width:auto" onchange="dskModeUI()"> ${t}</label>`).join('')}</div>
      <div id="dk_srv" class="form"><label class="f">منفذ السيرفر (Port)<input id="dk_port" inputmode="numeric" value="${i.port}"></label><label class="f">رمز الانضمام (اختياري)<input id="dk_join" value="${h(i.joinCode)}" placeholder="بدون رمز"></label>
        <div style="grid-column:1/-1;font-size:13px;line-height:1.9">عنوان السيرفر للأجهزة الثانية والموبايلات (نفس الشبكة): ${lan}${i.joinCode?' · رمز الانضمام مطلوب':''}</div></div>
      <div id="dk_cli" class="form"><label class="f">عنوان جهاز السيرفر (IP)<input id="dk_host" dir="ltr" value="${h(i.server.host)}" placeholder="192.168.1.10"></label><label class="f">المنفذ<input id="dk_sport" inputmode="numeric" value="${i.server.port}"></label><label class="f">رمز الانضمام<input id="dk_sjoin" value="${h(i.server.joinCode)}"></label>
        <div class="row" style="grid-column:1/-1"><button class="btn" onclick="dskFind()">بحث تلقائي عن السيرفر</button><button class="btn" onclick="dskTest()">اختبار الاتصال</button><span id="dk_cmsg" style="font-size:13px;color:var(--muted)"></span></div></div>
      <div class="row" style="margin-top:12px"><button class="btn pri" onclick="dskSaveMode()">حفظ وإعادة تشغيل البرنامج</button><span style="font-size:12.5px;color:var(--muted)">الوضع الحالي: <b>${{standalone:'جهاز واحد',server:'سيرفر',client:'كلاينت'}[i.mode]}</b></span></div>
      ${i.mode==='server'?`<h3 style="margin:16px 0 8px;font-size:15px">الأجهزة المتصلة</h3><div id="dk_clients" class="tw"></div>`:''}
      <div style="font-size:12.5px;color:var(--muted);margin-top:10px;line-height:1.8">• السيرفر: الجهاز الرئيسي اللي تنحفظ عليه البيانات، لازم يكون شغال حتى تشتغل باقي الأجهزة.<br>• الكلاينت: يشتغل على بيانات السيرفر مباشرة. كل حاسبة تحتاج سيريال خاص بيها.<br>• الموبايل: افتح عنوان السيرفر بمتصفح الموبايل (نفس شبكة الواي فاي).</div>`)+
    panel('النسخ الاحتياطي التلقائي (كل ساعة)',`
      <div style="line-height:2;font-size:14px">${i.mode==='client'?'هذا الجهاز كلاينت: النسخ الاحتياطي ينعمل تلقائياً على جهاز السيرفر.':`المجلد: <b dir="ltr" class="num" style="font-size:12.5px">${h(i.backupDir)}</b><br>آخر نسخة: <b>${dt(i.lastBackup)}</b> · يحتفظ بآخر 72 ساعة + نسخة لكل يوم لمدة 90 يوم`}</div>
      ${i.mode==='client'?'':`<div class="row" style="margin-top:8px"><button class="btn pri" onclick="dskBackup()">نسخة احتياطية الآن</button><button class="btn" onclick="byteDesktop.openPath(${h(JSON.stringify(i.backupDir))})">فتح المجلد</button><button class="btn" onclick="dskDir('backup')">تغيير المجلد (مثلاً فلاش)</button></div><div id="dk_blist" style="margin-top:10px"></div>`}`)+
    panel('تحديث البرنامج',`
      <div style="line-height:2">الإصدار الحالي: <b class="num">${h(i.version)}</b>${i.version!==i.exeVersion?` <span style="color:var(--muted);font-size:12.5px">(النسخة المنصّبة ${h(i.exeVersion)})</span>`:''}</div>
      <label style="display:flex;gap:8px;align-items:center;cursor:pointer;margin:6px 0"><input type="checkbox" ${i.autoUpdate?'checked':''} style="width:auto" onchange="byteDesktop.setAutoUpdate(this.checked)"> فحص التحديثات تلقائياً عند تشغيل البرنامج</label>
      <div class="row"><button class="btn pri" onclick="dskUpdCheck()">فحص التحديثات عبر الإنترنت</button><button class="btn" onclick="dskUpdFile()">تحديث يدوي من ملف (.bsu)</button>${i.version!==i.exeVersion?`<button class="btn" onclick="confirmBox('الرجوع للإصدار المنصّب ${h(i.exeVersion)}؟',()=>byteDesktop.updUndo())">إلغاء آخر تحديث</button>`:''}</div>
      <div id="dk_upd" style="margin-top:8px;font-size:13.5px"></div>`)+
    panel('مجلد الوصولات الورقية',`<div style="font-size:13.5px;line-height:2">${i.mode==='client'?'الوصولات تنحفظ على جهاز السيرفر.':`<b dir="ltr" class="num" style="font-size:12.5px">${h(i.docsDir)}</b>`}</div>${i.mode==='client'?'':`<div class="row"><button class="btn" onclick="byteDesktop.openDocs('')">فتح المجلد</button><button class="btn" onclick="dskDir('docs')">تغيير المجلد</button></div>`}`)+
    panel('حجم الشاشة',`<div class="row">${[.8,.9,1,1.1,1.25].map(z=>`<button class="btn ${Math.abs(i.zoom-z)<.01?'pri':''}" onclick="byteDesktop.zoom(${z}).then(()=>render())">${Math.round(z*100)}%</button>`).join('')}<span style="font-size:12.5px;color:var(--muted)">أو Ctrl و + / −</span></div>`);
    dskModeUI();if(window.settingsTabs)settingsTabs();
    if(i.mode==='server')dskClients();
    if(i.mode!=='client')dskBList();
  }
  window.dskModeUI=()=>{const m=(document.querySelector('input[name=dk_mode]:checked')||{}).value;const s=document.getElementById('dk_srv'),c=document.getElementById('dk_cli');if(s)s.style.display=m==='server'?'':'none';if(c)c.style.display=m==='client'?'':'none'};
  window.dskAct=async()=>{const r=await B.activate(document.getElementById('dk_key').value);toast(r.ok?'تم التفعيل ✓':r.msg);if(r.ok)setTimeout(()=>render(),800)};
  window.dskSaveMode=()=>{
    const m=(document.querySelector('input[name=dk_mode]:checked')||{}).value;if(!m)return;
    const o={mode:m,port:+document.getElementById('dk_port').value||8788,joinCode:document.getElementById('dk_join').value.trim(),server:{host:document.getElementById('dk_host').value.trim(),port:+document.getElementById('dk_sport').value||8788,joinCode:document.getElementById('dk_sjoin').value.trim()}};
    if(m==='client'&&!o.server.host){toast('اكتب عنوان جهاز السيرفر أو اضغط بحث تلقائي');return}
    if(m==='server'&&INFO.mode==='standalone'){try{o.seed=localStorage.getItem(KEY)}catch(e){}}
    confirmBox(m==='client'?'راح يشتغل هذا الجهاز على بيانات السيرفر. البيانات المحلية الحالية تبقى محفوظة بهذا الجهاز ولا تنحذف. متابعة؟':m==='server'?'راح يصير هذا الجهاز سيرفر وبياناته الحالية تنتقل للسيرفر. متابعة؟':'الرجوع لوضع جهاز واحد؟',()=>{toast('جاري إعادة التشغيل...');B.setMode(o)});
  };
  window.dskFind=async()=>{const m=document.getElementById('dk_cmsg');m.textContent='جاري البحث...';const l=await B.discover();if(!l.length){m.textContent='ما لكيت سيرفر بالشبكة. اكتب عنوان IP يدوياً.';return}document.getElementById('dk_host').value=l[0].host;document.getElementById('dk_sport').value=l[0].port;m.textContent=`لكيت: ${l[0].name} (${l[0].host})${l[0].needJoin?' — يحتاج رمز انضمام':''}`};
  window.dskTest=async()=>{const m=document.getElementById('dk_cmsg');m.textContent='جاري الاختبار...';const r=await B.testConn({host:document.getElementById('dk_host').value.trim(),port:+document.getElementById('dk_sport').value||8788,joinCode:document.getElementById('dk_sjoin').value.trim()});m.textContent=r.ok?(r.needJoin?'السيرفر يشتغل لكن رمز الانضمام غلط':`الاتصال ناجح ✓ (${r.name})`):'تعذر الاتصال: '+(r.msg||'')};
  async function dskClients(){const el=document.getElementById('dk_clients');if(!el)return;const l=await B.clients();
    el.innerHTML=l.length?`<table class="t"><thead><tr><th>الجهاز</th><th>IP</th><th>الحالة</th><th>آخر ظهور</th><th></th></tr></thead><tbody>${l.map(c=>`<tr><td>${h(c.name)}${c.app?'':' <span class="pill" style="background:var(--surface2);color:var(--muted)">متصفح</span>'}</td><td class="num">${h(c.ip)}</td><td>${c.blocked?'<span class="pill bad">محظور</span>':c.online?'<span class="pill ok">متصل</span>':'<span class="pill warn">غير متصل</span>'}</td><td class="num">${dt(c.last)}</td><td><div class="row" style="flex-wrap:nowrap"><button class="btn sm" onclick="byteDesktop.clientBlock(${h(JSON.stringify(c.id))},${!c.blocked}).then(()=>render())">${c.blocked?'إلغاء الحظر':'حظر'}</button><button class="btn sm danger" onclick="byteDesktop.clientDel(${h(JSON.stringify(c.id))}).then(()=>render())">حذف</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="empty">ما اتصل أي جهاز بعد.</div>'}
  async function dskBList(){const el=document.getElementById('dk_blist');if(!el)return;const l=await B.backupList();
    el.innerHTML=l.length?`<details><summary style="cursor:pointer;color:var(--muted);font-size:13px">آخر النسخ (${l.length})</summary><div class="tw" style="margin-top:8px;max-height:260px;overflow:auto"><table class="t"><tbody>${l.map(b=>`<tr><td class="num" style="font-size:12.5px">${h(b.name)}</td><td class="num" style="font-size:12px">${Math.round(b.size/1024)} KB</td><td><button class="btn sm" onclick="dskRestore(${h(JSON.stringify(b.name))})">استرجاع</button></td></tr>`).join('')}</tbody></table></div></details>`:''}
  window.dskBackup=async()=>{const r=await B.backupNow();toast(r.ok?'تم حفظ النسخة الاحتياطية':r.msg);render()};
  window.dskDir=async k=>{const d=await B.chooseDir(k);if(d){toast('تم تغيير المجلد');render()}};
  window.dskRestore=async n=>{const s=await B.backupRead(n);let d;try{d=JSON.parse(s);if(!d.items||!d.invoices)throw 0}catch(e){toast('ملف النسخة غير صالح');return}
    confirmBox(`استبدال البيانات الحالية بالنسخة ${h(n)}؟ (البيانات الحالية تنحفظ نسخة قبل الاسترجاع)`,async()=>{await B.backupNow();db=d;migrate();migrateItems();save();render();toast('تم الاسترجاع')})};
  window.dskUpdCheck=async()=>{const el=document.getElementById('dk_upd');el.textContent='جاري الفحص...';const r=await B.updCheck();
    if(!r.ok){el.textContent=r.msg;return}
    if(!r.available){el.innerHTML=`<span class="pill ok">البرنامج محدّث</span> آخر إصدار ${h(r.latest)}`;return}
    if(r.needsExe){el.innerHTML=`يوجد إصدار ${h(r.latest)} يحتاج تنصيب جديد. ${r.exeUrl?`<a href="#" onclick="window.open(${h(JSON.stringify(r.exeUrl))});return false">تحميل</a>`:''}`;return}
    el.innerHTML=`<b>يتوفر إصدار جديد ${h(r.latest)}</b>${r.notes?`<div style="color:var(--muted);white-space:pre-line">${h(r.notes)}</div>`:''}<button class="btn pri" style="margin-top:6px" onclick="dskUpdNow()">تحميل وتثبيت التحديث</button>`};
  window.dskUpdNow=async()=>{const el=document.getElementById('dk_upd');if(el)el.textContent='جاري تحميل التحديث...';await B.backupNow();const r=await B.updOnline();if(el)el.textContent=r.ok?`تم التحديث للإصدار ${r.version} — جاري إعادة التشغيل...`:r.msg;else toast(r.ok?'تم التحديث':r.msg)};
  window.dskUpdFile=async()=>{await B.backupNow();const r=await B.updFile();const el=document.getElementById('dk_upd');if(el)el.textContent=r.ok?`تم التحديث للإصدار ${r.version} — جاري إعادة التشغيل...`:r.msg};

  // إشعارات
  function bar(html,color){let b=document.getElementById('dskBar');if(!b){b=document.createElement('div');b.id='dskBar';b.style.cssText='position:fixed;bottom:16px;left:16px;z-index:60;max-width:420px;border-radius:12px;padding:12px 14px;color:#fff;box-shadow:0 8px 30px #0005;font-size:14px;line-height:1.7';document.body.appendChild(b)}b.style.background=color||'#2f6bff';b.innerHTML=html+' <a href="#" onclick="this.parentNode.remove();return false" style="color:#fff;margin-right:8px">✕</a>'}
  B.on('upd:available',c=>bar(`يتوفر تحديث جديد للبرنامج (${h(c.latest)}). <a href="#" style="color:#fff;font-weight:700" onclick="go('settings');setTimeout(()=>dskUpdCheck(),300);return false">عرض</a>`));
  B.on('lic:warn',s=>bar(`اشتراك البرنامج ينتهي بعد ${s.daysLeft} يوم. تواصل مع بايت للتجديد.`,'#f08a24'));
  B.info().then(i=>{const f=document.querySelector('.side-foot');if(!f)return;const L=i.license;
    if(L.status==='trial')f.innerHTML=`<span style="color:#ffb35c">نسخة تجريبية — باقي ${L.daysLeft} يوم</span><br><a href="#" style="color:#9fd" onclick="go('settings');return false">تفعيل البرنامج</a>`;
    else if(i.mode==='server')f.innerHTML='هذا الجهاز سيرفر الشبكة.<br>نسخ احتياطي تلقائي كل ساعة.';
    else if(i.mode==='standalone')f.innerHTML='البيانات محفوظة على هذا الجهاز.<br>نسخ احتياطي تلقائي كل ساعة.';
    if(view==='settings')fill()});
})();
