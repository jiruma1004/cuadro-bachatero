import type {Extension} from './count';
export type Marker={id:string,time_seconds:number,type:string,label:string,color:string,notes:string,source:'manual'|'suggestion'};
export type Project={project_id:string,title:string,duration_seconds:number,estimated_bpm:number,beat_times_seconds:number[],first_count_one_beat_index:number,offset_ms:number,dance_counts_per_square:number,beats_per_bar:4,beats_per_dance_count:8,markers:Marker[],warnings:string[],extensions:Extension[],audio_url?:string,analysis_revision?:number,alignment_confirmed?:boolean,analysis_update_available?:boolean,user_edited?:boolean};
export function validateProject(value:unknown):Project{
 const p=value as Project;
 if(!p||typeof p.title!=='string'||!Number.isFinite(p.duration_seconds)||p.duration_seconds<=0||p.duration_seconds>1800||!Number.isFinite(p.estimated_bpm)||p.estimated_bpm<0||p.estimated_bpm>500||!Number.isInteger(p.first_count_one_beat_index)||!Number.isFinite(p.offset_ms)||Math.abs(p.offset_ms)>10000||!Number.isInteger(p.dance_counts_per_square)||p.dance_counts_per_square<1||p.dance_counts_per_square>16)throw Error('Sesión inválida.');
 if(!Array.isArray(p.beat_times_seconds)||p.beat_times_seconds.length>20000||p.beat_times_seconds.some((v,i,b)=>!Number.isFinite(v)||v<0||v>=p.duration_seconds||(i>0&&v<=b[i-1])))throw Error('Rejilla inválida.');
 if(!Array.isArray(p.markers)||p.markers.some(m=>!Number.isFinite(m.time_seconds)||m.time_seconds<0||m.time_seconds>p.duration_seconds||typeof m.label!=='string'||!['manual','suggestion'].includes(m.source)))throw Error('Marcas inválidas.');
 p.extensions??=[];
 if(!Array.isArray(p.extensions)||p.extensions.length>1000)throw Error('Extensiones inválidas.');
 let lastEnd=-1;
 for(const e of [...p.extensions].sort((a,b)=>a.time_seconds-b.time_seconds)){
  const i=p.beat_times_seconds.findIndex(t=>Math.abs(t-e.time_seconds)<.0001);
  if(e.length!==4||typeof e.id!=='string'||i<0||i+4>p.beat_times_seconds.length||i<lastEnd)throw Error('Cada extensión debe cubrir 4 pulsos existentes sin superponerse.');
  lastEnd=i+4;
 }
 return p;
}
