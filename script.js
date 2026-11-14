const burger=document.getElementById('burger'),menu=document.getElementById('menu');
if(burger){burger.addEventListener('click',()=>{const o=menu.classList.toggle('open');burger.setAttribute('aria-expanded',o)})}
const track=document.getElementById('track');
if(track){const step=()=>track.querySelector('.prog').offsetWidth+22;
document.getElementById('next').onclick=()=>track.scrollBy({left:-step(),behavior:'smooth'});
document.getElementById('prev').onclick=()=>track.scrollBy({left:step(),behavior:'smooth'});}
const copyBtn=document.getElementById('copy');
if(copyBtn){copyBtn.addEventListener('click',()=>{
  const done=()=>{copyBtn.textContent='تم النسخ';setTimeout(()=>copyBtn.textContent='نسخ الرقم',1800)};
  const sel=()=>{const r=document.createRange();r.selectNodeContents(document.getElementById('phone'));const s=getSelection();s.removeAllRanges();s.addRange(r);copyBtn.textContent='حدد الرقم وانسخه'};
  try{navigator.clipboard.writeText('07867492096').then(done,sel)}catch(e){sel()}
});}
const f=document.getElementById('qform');
if(f){const p=new URLSearchParams(location.search).get('p');if(p){const o=[...qprog.options].find(x=>x.text===p);if(o)qprog.value=o.text}
f.addEventListener('submit',e=>{e.preventDefault();
  const msg=`مرحباً بايت، أنا ${qname.value}. أطلب عرض سعر لبرنامج: ${qprog.value}. ${qmsg.value}`;
  window.open('https://wa.me/9647867492096?text='+encodeURIComponent(msg),'_blank');
});}
