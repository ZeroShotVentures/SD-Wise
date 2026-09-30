import numpy as np, wave
SR=48000; D=34.5; N=int(SR*D)
L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(3)
BPM=120; B=60/BPM
def add(sig,t,pan=0.0,g=1.0):
    i=int(t*SR); j=min(N,i+len(sig))
    if i>=N or j<=i: return
    s=sig[:j-i]*g
    L[i:j]+=s*np.sqrt((1-pan)/2); R[i:j]+=s*np.sqrt((1+pan)/2)
def env(n,a,d,s=0.0,rl=None):
    t=np.arange(n)/SR; e=np.where(t<a,t/max(a,1e-4),s+(1-s)*np.exp(-(t-a)/d)); return e
def lp(x,fc):
    # one-pole lowpass, fc may be array
    fc=np.broadcast_to(fc,x.shape); a=np.exp(-2*np.pi*fc/SR); y=np.zeros_like(x); p=0.0
    for i in range(len(x)): p=(1-a[i])*x[i]+a[i]*p; y[i]=p
    return y
def hp(x,fc): return x-lp(x,fc)
def mtof(m): return 440*2**((m-69)/12)
def saw(f,n,det=0.0):
    t=np.arange(n)/SR; out=0
    for d in (-det,0,det): out=out+2*((t*f*(1+d))%1)-1
    return out/3
def kick(g=1):
    n=int(.45*SR); t=np.arange(n)/SR; f=45+110*np.exp(-t*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-t*7)*g + 0.3*np.exp(-t*300)*rng.standard_normal(n)*g*0.3
def clap():
    n=int(.3*SR); x=rng.standard_normal(n); e=np.zeros(n)
    for k in (0,.01,.02): i=int(k*SR); e[i:]+=np.exp(-np.arange(n-i)/SR*40)
    return hp(lp(x*e,5000),900)*.5
def hat(open_=False):
    n=int((.25 if open_ else .06)*SR); x=rng.standard_normal(n)
    return hp(x,7000)*np.exp(-np.arange(n)/SR*(12 if open_ else 70))*.25
def pluck(m,dur=.35,g=.18):
    n=int(dur*SR); x=saw(mtof(m),n,.004); fc=600+5000*np.exp(-np.arange(n)/SR*14)
    return lp(x,fc)*env(n,.002,.12)*g
def whoosh(t0,dur=.7,g=.35,up=True):
    n=int(dur*SR); x=rng.standard_normal(n); k=np.linspace(0,1,n)
    fc=(300+7000*k**2) if up else (7300-7000*k)
    e=np.sin(np.pi*k)**2 if True else 1
    add(lp(hp(x,200),fc)*e*g, t0-dur*0.6, pan=-.4); add(lp(hp(x[::-1],200),fc)*e*g*.8, t0-dur*0.6, pan=.4)
def impact(t0,g=.9):
    n=int(2.5*SR); tt=np.arange(n)/SR; f=38+60*np.exp(-tt*8)
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*2.2)
    nz=lp(rng.standard_normal(n),2500)*np.exp(-tt*4)*.35
    add((s+nz)*g,t0)
def riser(t0,t1,g=.3):
    n=int((t1-t0)*SR); k=np.linspace(0,1,n); x=rng.standard_normal(n)
    add(lp(hp(x,400),400+9000*k**3)*k**2*g,t0,-.2); add(lp(hp(x[::-1],400),400+9000*k**3)*k**2*g,t0,.2)
    tt=np.arange(n)/SR; f=mtof(45)*2**(k*2); add(np.sin(2*np.pi*np.cumsum(f)/SR)*k**2*g*.5,t0)

# chords: Am F C G (minor, uplifting) roots midi
CH=[(57,[57,60,64,69]),(53,[53,57,60,65]),(48,[48,55,60,64]),(55,[55,59,62,67])]
bar=4*B
def chord_at(t): return CH[int(t//bar)%4]

# --- pads throughout (softer in intro)
for bi in range(int(D//bar)+1):
    t0=bi*bar; root,notes=CH[bi%4]; n=int(bar*SR*1.15)
    pad=sum(saw(mtof(m),n,.006) for m in notes)/4
    pad=lp(pad,1400)*env(n,.6,3.0,.6)
    g=.10 if t0<5.5 else (.16 if t0<27.4 else .2)
    if t0>=31: g=.2
    add(pad,t0,-.3,g); add(pad,t0+.012,.3,g)

# --- intro 0-4.4: pulsing arp with opening filter, ticking
for i in range(int(4.4/(B/4))):
    t=i*B/4; root,notes=chord_at(t); m=notes[i%4]+12
    add(pluck(m,.25,.10+.10*t/4.4),t,((i%2)*2-1)*.5)
    if i%2==1: add(hat(),t,.3,.6)
for i in range(8): add(kick(.45),i*B)
riser(2.6,4.5,.35)
# --- logo sting
impact(4.5,1.0)
for m,dl in zip([69,76,81,84],[0,.06,.12,.18]):
    n=int(2.2*SR); tt=np.arange(n)/SR
    bell=(np.sin(2*np.pi*mtof(m)*tt)+.4*np.sin(2*np.pi*mtof(m)*2.01*tt))*np.exp(-tt*2.2)*.09
    add(bell,4.55+dl,(dl-.09)*5)
whoosh(5.65,.6,.4)
# --- main groove 5.6 - 27.4
start=5.5; end=27.4
t=start
beat=0
while t<end:
    add(kick(.95),t)
    if beat%2==1: add(clap(),t,0,.9)
    add(hat(),t+B/2,.35,.9)
    if beat%4==3: add(hat(True),t+B/2,-.3,.5)
    root,notes=chord_at(t)
    # bass: offbeat 8ths
    for k in (B/2,):
        n=int(B/2*SR*.9); bs=lp(saw(mtof(root-12),n,.002),500)*env(n,.005,.18,.3)*.35
        add(bs,t+k)
    # arp 16ths
    for s in range(4):
        m=notes[(beat*4+s)%4]+ (24 if s==3 else 12)
        add(pluck(m,.22,.07),t+s*B/4,((s%2)*2-1)*.6)
    t+=B; beat+=1
for tc in (10.6,15.4,20.4,24.7): whoosh(tc,.7,.35)
# --- build 27.4 - 29.8
riser(27.3,29.8,.45)
k=0; t=27.4
while t<29.7:
    step=B/2 if t<28.4 else (B/4 if t<29.2 else B/8)
    n=int(.12*SR); sn=hp(lp(rng.standard_normal(n),6000),300)*np.exp(-np.arange(n)/SR*25)*(.12+.2*(t-27.4)/2.4)
    add(sn,t,0); t+=step
impact(29.8,1.1); whoosh(29.8,.5,.3)
# --- final chord
n=int(4.8*SR)
for m in [57,64,69,72,76]:
    add(lp(saw(mtof(m),n,.007),2200)*env(n,.02,2.5,0)*.07,29.8,((m%5)-2)*.2)
    tt=np.arange(n)/SR; add(np.sin(2*np.pi*mtof(m+12)*tt)*np.exp(-tt*1.3)*.05,29.8)
for i in range(8):
    m=[69,72,76,81][i%4]+12; add(pluck(m,.5,.06*(1-i/8)),30.4+i*B/2,((i%2)*2-1)*.6)

# --- simple stereo reverb (comb + allpass)
def reverb(x,delays,fb=.78):
    y=np.zeros_like(x)
    for d in delays:
        di=int(d*SR); b=np.zeros_like(x); 
        for s in range(di,len(x),di): pass
        # vectorized comb via loop over blocks
        buf=x.copy()
        for rep in range(1,12):
            sh=di*rep
            if sh>=len(x): break
            y[sh:]+=x[:-sh]*(fb**rep)
    return y/len(delays)
wetL=reverb(L,[.0297,.0371,.0411,.0437]*1,)
wetR=reverb(R,[.0311,.0357,.0423,.0451])
wetL=lp(wetL,4000); wetR=lp(wetR,4000)
L2=L+.35*wetL; R2=R+.35*wetR
# fades
fade=np.ones(N); fo=int(1.2*SR); fade[-fo:]=np.linspace(1,0,fo)**2
fi=int(.05*SR); fade[:fi]=np.linspace(0,1,fi)
L2*=fade; R2*=fade
# soft clip + normalize
m=max(np.abs(L2).max(),np.abs(R2).max()); L2/=m; R2/=m
L2=np.tanh(L2*1.6)/np.tanh(1.6); R2=np.tanh(R2*1.6)/np.tanh(1.6)
L2*=.89; R2*=.89
st=np.stack([L2,R2],1); pcm=(st*32767).astype(np.int16)
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
print('ok')
