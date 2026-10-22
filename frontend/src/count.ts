export function beatAt(beats:number[],time:number,offset=0){let lo=0,hi=beats.length;while(lo<hi){const mid=(lo+hi)>>>1;if(beats[mid]+offset<=time)lo=mid+1;else hi=mid;}return lo-1;}
export function count(index:number,phase=0,groups=4){const i=index-phase,mod=(x:number,n:number)=>(x%n+n)%n;return {number:mod(i,8)+1,group:Math.floor(mod(i,8*groups)/8)+1,side:Math.floor(mod(i,32)/8),lap:Math.floor(i/(8*groups))+1,barBeat:mod(i,4)+1,bar:Math.floor(mod(i,8*groups)/4)+1,step:mod(i,32),next:8-mod(i,8)};}
export function position(step:number){const side=Math.floor(step/8),n=step%8;return side===0?[n+1,0]:side===1?[9,n+1]:side===2?[8-n,9]:[0,8-n];}
export function regular(bpm:number,anchor:number,duration:number){const dt=60/bpm;const first=anchor-Math.floor(anchor/dt)*dt;return Array.from({length:Math.ceil((duration-first)/dt)},(_,i)=>first+i*dt).filter(t=>t>=0&&t<duration);}
export type Extension={id:string,time_seconds:number,length:4};
export function musicalCount(beats:number[],index:number,phase=0,groups=4,extensions:Extension[]=[]){
 const starts=extensions.map(e=>({e,start:beatAt(beats,e.time_seconds+.000001)})).filter(x=>x.start>=0).sort((a,b)=>a.start-b.start);
 let consumed=0,correction=0;
 for(const {e,start} of starts){
  if(index<start)break;
  // An extension closes the interrupted eight; its next pulse always starts at 1.
  // Extensions before the chosen first 1 must not shift that explicit anchor.
  if(start-consumed>=phase){const relative=start-consumed+correction-phase;correction+=((8-relative%8)%8);}
  if(index<start+e.length)return {...count(start-consumed+correction,phase,groups),extension:index-start+1,extensionId:e.id,logicalIndex:start-consumed,physicalIndex:index};
  consumed+=e.length;
 }
 return {...count(index-consumed+correction,phase,groups),extension:0,extensionId:'',logicalIndex:index-consumed,physicalIndex:index};
}
export function nearestBeat(beats:number[],time:number){const i=beatAt(beats,time);if(i<0)return 0;if(i+1<beats.length&&time-beats[i]>beats[i+1]-time)return i+1;return i;}
/** Align both beat timing and dance phase to the audible instant chosen by the teacher. */
export function alignmentAt(beats:number[],time:number,offsetMs=0,groups=4,extensions:Extension[]=[]){
 if(!beats.length||!Number.isFinite(time)||time<0)throw Error('No hay una rejilla válida para alinear.');
 const index=nearestBeat(beats,time-offsetMs/1000);
 const state=musicalCount(beats,index,0,groups,extensions);
 if(state.extension)throw Error('Elige el primer golpe fuera de la extensión.');
 const offset=(time-beats[index])*1000;
 if(Math.abs(offset)>10000)throw Error('Elige un instante próximo a un pulso de la canción.');
 return {first_count_one_beat_index:state.logicalIndex,offset_ms:offset};
}
