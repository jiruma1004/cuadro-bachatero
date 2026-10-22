import {mergeCatalogProject} from './migration';
import {validateProject,type Project} from './model';
export type Song={project_id:string,title:string,duration_seconds:number,estimated_bpm:number,kind?:string};
const openDB=()=>new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('cuadro-bachatero-v2',1);r.onupgradeneeded=()=>{r.result.createObjectStore('projects',{keyPath:'project_id'});r.result.createObjectStore('audio');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo abrir el almacenamiento del navegador.'));});
async function transaction<T>(name:string,mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(name,mode);const request=action(tx.objectStore(name));let result:T;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(Error('No se pudo guardar. Revisa el espacio disponible.'));};});}
let catalog:Song[]=[];
export async function listSongs():Promise<Song[]>{const r=await fetch('./demos/index.json',{cache:'no-cache'});if(!r.ok)throw Error('No se pudo cargar la biblioteca.');catalog=await r.json();const saved=await transaction<Project[]>('projects','readonly',s=>s.getAll());return [...catalog,...saved.filter(p=>!catalog.some(c=>c.project_id===p.project_id)).map(p=>({...p,kind:'local'}))];}
export async function getFreshProject(id:string):Promise<Project>{const r=await fetch('./demos/'+encodeURIComponent(id)+'.json',{cache:'no-cache'});if(!r.ok)throw Error('Sesión no disponible.');return validateProject(await r.json());}
export async function getProject(id:string):Promise<Project>{
 const saved=await transaction<Project|undefined>('projects','readonly',s=>s.get(id));
 if(!catalog.some(c=>c.project_id===id)){if(!saved)throw Error('Sesión no disponible.');return validateProject(saved);}
 const fresh=await getFreshProject(id);
 if(!saved)return fresh;
 if((saved.analysis_revision??1)>=(fresh.analysis_revision??1))return validateProject(saved);
 const r=await fetch('./demos/legacy-analysis.json',{cache:'no-cache'});const baseline=r.ok?(await r.json())[id]:undefined;
 return mergeCatalogProject(validateProject(saved),fresh,baseline);
}
export async function audioURL(p:Project){if(catalog.some(c=>c.project_id===p.project_id))return './demos/'+p.project_id+(p.project_id==='demo'?'.wav':'.mp3');const blob=await transaction<Blob|undefined>('audio','readonly',s=>s.get(p.project_id));if(!blob)throw Error('Vuelve a cargar el archivo de audio.');return URL.createObjectURL(blob);}
export async function saveProject(p:Project){await transaction('projects','readwrite',s=>s.put(validateProject(p)));}
export async function importAudio(file:File):Promise<Project>{
 if(!/\.(mp3|wav|m4a)$/i.test(file.name)||file.size>100*1024*1024)throw Error('Usa MP3, WAV o M4A de hasta 100 MB.');
 const context=new AudioContext();let buffer:AudioBuffer;
 try{buffer=await context.decodeAudioData(await file.arrayBuffer());}catch{throw Error('El navegador no puede decodificar este audio. Prueba MP3 o WAV.');}finally{await context.close();}
 if(buffer.duration<1||buffer.duration>1800)throw Error('Usa audio de 1 segundo a 30 minutos.');
 // Downsample before sending to worker to bound CPU/memory on phones.
 const rate=11025,len=Math.floor(buffer.duration*rate),samples=new Float32Array(len);
 for(let i=0;i<len;i++){const at=Math.floor(i*buffer.sampleRate/rate);for(let ch=0;ch<buffer.numberOfChannels;ch++)samples[i]+=buffer.getChannelData(ch)[at]/buffer.numberOfChannels;}
 const result=await new Promise<{bpm:number,beats:number[],warnings:string[]}>((resolve,reject)=>{const worker=new Worker(new URL('./analyze.worker.ts',import.meta.url),{type:'module'});const timer=setTimeout(()=>{worker.terminate();reject(Error('El análisis tardó demasiado. Prueba una canción más corta.'));},90000);worker.onmessage=e=>{clearTimeout(timer);worker.terminate();resolve(e.data);};worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('Falló el análisis local.'));};worker.postMessage({samples,sampleRate:rate},[samples.buffer]);});
 const p:Project={project_id:crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,''),duration_seconds:buffer.duration,estimated_bpm:result.bpm,beat_times_seconds:result.beats,first_count_one_beat_index:0,offset_ms:0,beats_per_bar:4,beats_per_dance_count:8,dance_counts_per_square:4,markers:[],extensions:[],warnings:result.warnings};
 await transaction('audio','readwrite',s=>s.put(file,p.project_id));await saveProject(p);return p;
}
export function downloadProject(p:Project){const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cuadro-'+p.project_id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
