// ---------- helpers ----------
const $=id=>document.getElementById(id);
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const P=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3);
const e5=x=>1-Math.pow(1-x,5);
const ex=x=>x>=1?1:1-Math.pow(2,-10*x);
const ei=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const eback=x=>{const c=1.70158,c3=c+1;return 1+c3*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const lerp=(a,b,k)=>a+(b-a)*k;
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};

// logo svg (recreated from the SD Wise logo), mode 'dark' = white wordmark
function logoSVG(mode, id){
  const txt = mode==='dark' ? '#ffffff' : '#596273';
  const gray = mode==='dark' ? '#9aa2bb' : '#7d86a0';
  return `<svg id="${id}" viewBox="0 0 2000 690" width="100%" height="100%" style="overflow:visible">
    <polygon class="b1" points="0,348 86,348 119,537 34,537" fill="${gray}"/>
    <polygon class="b2" points="193,192 286,192 229,690 137,690" fill="#e0003a"/>
    <polygon class="b3" points="407,0 502,0 383,537 291,537" fill="#f5ab00"/>
    <g class="wm"><text x="492" y="537" font-family="Open Sans" font-weight="500" font-size="498" fill="${txt}" textLength="1508" lengthAdjust="spacing">sd wise</text></g>
  </svg>`;
}
function markSVG(w,gray='#9aa2bb'){
  return `<svg viewBox="0 0 502 690" width="${w}" style="overflow:visible"><polygon points="0,348 86,348 119,537 34,537" fill="${gray}"/><polygon points="193,192 286,192 229,690 137,690" fill="#e0003a"/><polygon points="407,0 502,0 383,537 291,537" fill="#f5ab00"/></svg>`;
}

// enter/exit for a block of text lines
function lines(el,t,tin,tout,{stagger=.08,dy=60,blur=16,dur=.7}={}){
  const ls=el.querySelectorAll('.ln');
  (ls.length?ls:[el]).forEach((l,i)=>{
    const a=e5(P(t,tin+i*stagger,tin+i*stagger+dur));
    const b=tout==null?0:ei(P(t,tout+i*stagger*.5,tout+i*stagger*.5+.45));
    l.style.opacity=a*(1-b);
    l.style.transform=`translateY(${(1-a)*dy - b*40}px)`;
    l.style.filter=`blur(${(1-a)*blur + b*14}px)`;
    if(!ls.length) l.style.display='';
    else l.style.display='block';
  });
}
function fadeEl(el,t,tin,tout,{dx=0,dy=40,s=1,blur=12,dur=.8,e=e5}={}){
  const a=e(P(t,tin,tin+dur));
  const b=tout==null?0:ei(P(t,tout,tout+.45));
  el.style.opacity=a*(1-b);
  el.style.transform=`translate(${(1-a)*dx}px,${(1-a)*dy - b*30}px) scale(${lerp(s,1,a)*(1-b*.04)})`;
  el.style.filter=`blur(${Math.max(0,(1-a)*blur+b*12)}px)`;
}

