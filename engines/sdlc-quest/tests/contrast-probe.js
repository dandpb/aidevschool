()=>{
 const rgba=s=>(s.match(/[\d.]+/g)||[]).map(Number);
 const lum=a=>a.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
 const scope=[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;
 return [...scope.querySelectorAll('*')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&!e.closest('[aria-hidden="true"],:disabled,canvas,script,style,svg')&&getComputedStyle(e).visibility!=='hidden').map(e=>{
 const c=getComputedStyle(e);let n=e,bg;
 while(n){let a=rgba(getComputedStyle(n).backgroundColor);if(a.length===3||a[3]===1){bg=a;break;}n=n.parentElement;}
 bg=bg||[245,243,236];const f=lum(rgba(c.color)),b=lum(bg),ratio=(Math.max(f,b)+.05)/(Math.min(f,b)+.05),size=parseFloat(c.fontSize),large=size>=24||(size>=18.66&&parseInt(c.fontWeight)>=700);
 return {text:[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').slice(0,75),ratio:Number(ratio.toFixed(2)),min:large?3:4.5,selector:e.id?'#'+e.id:e.tagName+'.'+e.className,size};}).filter(x=>x.ratio<x.min);
}