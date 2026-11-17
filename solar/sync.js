/* بايت للطاقة الشمسية — مزامنة السيرفر والكلاينت (فرق التغييرات ودمجها) */
(function(root){
  const INC=new Set(['qty','done']);
  const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const idArr=a=>Array.isArray(a)&&a.every(x=>isObj(x)&&x.id!=null);
  const same=(a,b)=>a===b||JSON.stringify(a)===JSON.stringify(b);
  function diff(base,cur,path,ops){
    path=path||[];ops=ops||[];
    if(same(base,cur))return ops;
    if(isObj(base)&&isObj(cur)){
      for(const k of Object.keys(base))if(!(k in cur))ops.push({p:[...path,k],o:'del'});
      for(const k of Object.keys(cur)){if(!(k in base))ops.push({p:[...path,k],o:'set',v:cur[k]});else diff(base[k],cur[k],[...path,k],ops)}
      return ops;
    }
    if(Array.isArray(base)&&Array.isArray(cur)&&idArr(base)&&idArr(cur)&&(base.length||cur.length)){
      const bm=new Map(base.map(x=>[x.id,x])),cm=new Map(cur.map(x=>[x.id,x]));
      for(const id of bm.keys())if(!cm.has(id))ops.push({p:[...path,{id}],o:'del'});
      for(const x of cur){if(!bm.has(x.id))ops.push({p:[...path,{id:x.id}],o:'add',v:x});else diff(bm.get(x.id),x,[...path,{id:x.id}],ops)}
      return ops;
    }
    if(typeof base==='number'&&typeof cur==='number'&&INC.has(path[path.length-1])){ops.push({p:path,o:'inc',v:cur-base});return ops}
    ops.push({p:path,o:'set',v:cur});return ops;
  }
  function step(node,seg){if(node==null)return undefined;if(isObj(seg))return Array.isArray(node)?node.find(x=>x&&x.id===seg.id):undefined;return node[seg]}
  function apply(db,ops){
    for(const op of ops){
      const p=op.p;if(!p||!p.length)continue;
      let parent=db;for(let i=0;i<p.length-1;i++){parent=step(parent,p[i]);if(parent==null)break}
      if(parent==null||typeof parent!=='object')continue;
      const last=p[p.length-1];
      if(isObj(last)){
        if(!Array.isArray(parent))continue;
        const i=parent.findIndex(x=>x&&x.id===last.id);
        if(op.o==='del'){if(i>=0)parent.splice(i,1)}
        else if(op.o==='add'||op.o==='set'){if(i>=0)parent[i]=op.v;else parent.push(op.v)}
        continue;
      }
      if(op.o==='del'){delete parent[last]}
      else if(op.o==='inc'){parent[last]=(typeof parent[last]==='number'?parent[last]:0)+op.v}
      else parent[last]=op.v;
    }
    fixNumbers(db);return db;
  }
  // منع تكرار أرقام الوصولات إذا حفظ جهازين بنفس اللحظة
  function fixNumbers(db){
    if(!db||!Array.isArray(db.invoices))return;
    const seen=new Set();let max=0;db.invoices.forEach(i=>{if(+i.no>max)max=+i.no});
    db.invoices.forEach(i=>{if(seen.has(i.no)){i.no=++max}seen.add(i.no)});
    if(!(db.nextNo>max))db.nextNo=max+1;
    if(Array.isArray(db.quotes)){const s2=new Set();let m2=0;db.quotes.forEach(q=>{if(+q.no>m2)m2=+q.no});db.quotes.forEach(q=>{if(q.no!=null&&s2.has(q.no))q.no=++m2;s2.add(q.no)});if(m2&&!(db.nextQuote>m2))db.nextQuote=m2+1}
  }
  const api={diff,apply,fixNumbers};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BSYNC=api;
})(this);
