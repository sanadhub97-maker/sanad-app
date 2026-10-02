const designs = [
  {id:'council',name:'القرار',category:'تقرير الإدارة',description:'موجز تنفيذي مقسّم، مؤشرات بخطوط جانبية، وجدول بترقيم مرجعي.',colors:['#173b52','#a17b42','#eaf0f2']},
  {id:'standard',name:'المعيار',category:'مراجعة الامتثال',description:'مصفوفة مراجعة رسمية، أدلة مرجعية، وتقييم بصري لكل بند.',colors:['#275449','#798d71','#eef2e9']},
  {id:'impact',name:'الأثر',category:'ملخص التكاليف',description:'إجمالي مالي واضح، بطاقات محاسبية، وأعمدة أرقام محاذاة بدقة.',colors:['#41324d','#a38169','#f3edf1']},
  {id:'personnel',name:'الملف',category:'ملف الموظف',description:'بطاقة تعريف مستقلة، مجموعات بيانات واضحة، وسجل للوثائق.',colors:['#234e6b','#657c8b','#ebf1f5']},
  {id:'pathway',name:'المسار',category:'متابعة التجديدات',description:'مسار إجراءات مرقّم، بطاقات مسؤوليات، وجدول متابعة بمواعيد واضحة.',colors:['#374248','#b07c43','#f3efe8']},
];
const frame=document.getElementById('document'),paper=document.getElementById('paper'),canvas=document.getElementById('canvas'),print=document.getElementById('print');
let selected=0;
const choices=document.getElementById('choices');
designs.forEach((d,i)=>{const button=document.createElement('button');button.className='choice';button.style.setProperty('--accent',d.colors[0]);button.innerHTML=`<span class="number">0${i+1}</span><span><b>${d.name} · ${d.category}</b><small>${d.description}</small><span class="swatches">${d.colors.map(c=>`<i style="--color:${c}"></i>`).join('')}</span></span>`;button.addEventListener('click',()=>choose(i));choices.append(button)});
function size(){const width=paper.clientWidth;const scale=Math.min(width/794,1.15);frame.style.transform=`scale(${scale})`;paper.style.height=`${1123*scale}px`}
new ResizeObserver(size).observe(canvas);
function choose(i){selected=i;const d=designs[i];document.getElementById('name').textContent=d.name;document.getElementById('category').textContent=d.category;document.getElementById('description').textContent=d.description;document.getElementById('position').textContent=`0${i+1} / 05`;document.getElementById('status').textContent='';[...choices.children].forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));print.disabled=true;print.textContent='تجهيز المعاينة…';frame.src=`${d.id}.html`;history.replaceState(null,'',`?design=${d.id}`)}
frame.addEventListener('load',async()=>{const doc=frame.contentDocument;if(!doc||!doc.URL.endsWith(`${designs[selected].id}.html`))return;await Promise.race([doc.fonts.ready,new Promise(r=>setTimeout(r,5000))]);if(frame.contentDocument!==doc||!doc.URL.endsWith(`${designs[selected].id}.html`))return;size();print.disabled=false;print.textContent='طباعة المعاينة'});
print.addEventListener('click',()=>{try{frame.contentWindow.focus();frame.contentWindow.print()}catch{document.getElementById('status').textContent='تعذر فتح الطباعة. أعد تحميل المعاينة وحاول مجددًا.'}});
choose(Math.max(0,designs.findIndex(d=>d.id===new URLSearchParams(location.search).get('design'))));
