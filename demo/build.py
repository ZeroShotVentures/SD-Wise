import subprocess
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe()
segs=[("hook",1,3.6),("meet",1,3.1),("graph",1,3.2),("ask",1.5,8.3),("inbox",1.1,5.4),("learned",1,2.9),("end",1,5.2)]
X=0.3
for n,sp,t in segs:
    subprocess.run([FF,"-y","-loglevel","error","-f","concat","-safe","0","-i",f"segs/{n}.txt",
      "-vf",f"setpts=PTS/{sp},fps=30,scale=1920:1080:flags=lanczos,format=yuv420p","-t",str(t),
      "-c:v","libx264","-crf","16","-preset","slow",f"segs/{n}.mp4"],check=True)
inputs=sum([["-i",f"segs/{n}.mp4"] for n,_,_ in segs],[])
fc=[];prev="[0:v]";acc=segs[0][2]
for i in range(1,len(segs)):
    off=acc-X
    out=f"[v{i}]"
    fc.append(f"{prev}[{i}:v]xfade=transition=fade:duration={X}:offset={off:.3f}{out}")
    prev=out; acc=off+segs[i][2]
fc.append(f"{prev}fade=t=in:st=0:d=0.3,fade=t=out:st={acc-0.4:.3f}:d=0.4[out]")
subprocess.run([FF,"-y","-loglevel","error",*inputs,"-filter_complex",";".join(fc),"-map","[out]",
  "-c:v","libx264","-crf","18","-preset","slow","-pix_fmt","yuv420p","-movflags","+faststart","sd-wise-demo.mp4"],check=True)
print("total",acc)
