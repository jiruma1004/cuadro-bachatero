// Browser-side heuristic. No network, no claim of musical phrase recognition.
export function analyzeSamples(samples:Float32Array,sampleRate:number){
 const hop=Math.round(sampleRate/100),frames=Math.floor(samples.length/hop);
 const env=new Float32Array(frames);let prior=0,max=0;
 for(let i=0;i<frames;i++){let sum=0;for(let j=0;j<hop;j++){const v=samples[i*hop+j];sum+=v*v;}const rms=Math.sqrt(sum/hop);env[i]=Math.max(0,rms-prior);prior=rms*.6+prior*.4;max=Math.max(max,env[i]);}
 let bestLag=50,best=-1;
 for(let lag=30;lag<=85;lag++){let value=0;for(let i=lag;i<frames;i++)value+=env[i]*env[i-lag];if(value>best){best=value;bestLag=lag;}}
 const bpm=60*sampleRate/(hop*bestLag);let phase=0,score=-1;
 for(let p=0;p<bestLag;p++){let v=0;for(let i=p;i<frames;i+=bestLag)v+=env[i];if(v>score){score=v;phase=p;}}
 let first=0;while(first<frames&&env[first]<max*.08)first++;
 const beats=[];
 if(max>.0001&&first<frames)for(let i=phase;i<frames;i+=bestLag){if(i<first-2)continue;let peak=i;for(let j=Math.max(first,i-6);j<Math.min(frames,i+7);j++)if(env[j]>env[peak])peak=j;if(env[peak]<max*.03)continue;const t=peak*hop/sampleRate;if(!beats.length||t>beats.at(-1)!+.15){beats.push(t);i=peak;}}
 return {bpm:beats.length?bpm:0,beats,warnings:[beats.length?'Estimación del navegador: verifica BPM y primer 1. Las extensiones se marcan manualmente.':'No hay pulsos fiables. Usa BPM manual o Tap tempo.']};
};
