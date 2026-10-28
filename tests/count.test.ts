import {test} from 'node:test';
import assert from 'node:assert/strict';
import {beatAt,count,position,regular} from '../frontend/src/count.ts';
test('32 posiciones inequívocas y recorrido horario',()=>{assert.equal(new Set(Array.from({length:32},(_,i)=>position(i).join(','))).size,32);assert.deepEqual(position(0),[1,0]);assert.deepEqual(position(8),[9,1]);assert.deepEqual(position(16),[8,9]);assert.deepEqual(position(24),[0,8]);assert.equal(count(32).step,0);assert.equal(count(31).number,8);assert.equal(count(32).lap,2);});
test('pausa y saltos se calculan desde la posición del audio',()=>{const b=[1,1.5,2,2.5];assert.equal(beatAt(b,.9),-1);assert.equal(beatAt(b,1),0);assert.equal(beatAt(b,2.1),2);assert.equal(beatAt(b,2.1),2);assert.equal(beatAt(b,1.2),0);assert.equal(beatAt(b,1.2,.3),-1);assert.equal(beatAt([],3),-1);});
test('fase, compás y bloques configurables',()=>{assert.equal(count(4,4).number,1);assert.equal(count(3,4).number,8);assert.equal(count(4).barBeat,1);assert.equal(count(4).bar,2);assert.equal(count(24,0,3).lap,2);assert.equal(count(24,0,3).group,1);});
test('rejilla manual anclada al cursor',()=>{const b=regular(120,1.25,4);assert.ok(b.includes(1.25));assert.equal(b[1]-b[0],.5);assert.ok(b.every(x=>x>=0&&x<4));});
import {musicalCount} from '../frontend/src/count.ts';
const beats=Array.from({length:128},(_,i)=>1+i*.5);
test('extensión tras el último ocho: 32 + 4, sin alterar lo anterior',()=>{const ext=[{id:'x',time_seconds:17,length:4 as const}];assert.equal(musicalCount(beats,31,0,4,ext).number,8);for(let i=32;i<36;i++)assert.equal(musicalCount(beats,i,0,4,ext).extension,i-31);const after=musicalCount(beats,36,0,4,ext);assert.equal(after.number,1);assert.equal(after.group,1);assert.equal(after.lap,2);assert.equal(after.step,0);assert.equal(after.extension,0);});
test('extensión tras el segundo ocho continúa al tercer grupo',()=>{const ext=[{id:'x',time_seconds:9,length:4 as const}];assert.equal(musicalCount(beats,15,0,4,ext).group,2);assert.equal(musicalCount(beats,16,0,4,ext).extension,1);const after=musicalCount(beats,20,0,4,ext);assert.equal(after.group,3);assert.equal(after.number,1);assert.equal(after.step,16);});
test('múltiples extensiones, fase, saltos y eliminación',()=>{const ext=[{id:'a',time_seconds:9,length:4 as const},{id:'b',time_seconds:19,length:4 as const}];assert.equal(musicalCount(beats,40,0,4,ext).lap,2);assert.equal(musicalCount(beats,40,0,4,ext).number,1);assert.equal(musicalCount(beats,5,0,4,ext).number,6);assert.equal(musicalCount(beats,40,0,4,[]).number,1);assert.equal(musicalCount(beats,40,4,4,ext).number,1);});
import {analyzeSamples} from '../frontend/src/analyze.ts';
import {validateProject} from '../frontend/src/model.ts';
test('análisis navegador usa el reloj exacto y no excede la duración',()=>{const sr=11025,duration=65,samples=new Float32Array(sr*duration);for(let t=1;t<duration;t+=.5){for(let j=0;j<200;j++)samples[Math.round(t*sr)+j]=.5*Math.sin(j)*Math.exp(-j/70);}const result=analyzeSamples(samples,sr);assert.ok(result.beats.length>100);assert.ok(Math.abs(result.bpm-120)<2);assert.ok(result.beats.every((t,i,b)=>t>=0&&t<duration&&(!i||t>b[i-1])));assert.ok(Math.abs(result.beats.at(-1)!-64.5)<.15);});
test('importación JSON rechaza extensiones superpuestas',()=>{const p={title:'Prueba',duration_seconds:65,estimated_bpm:120,first_count_one_beat_index:0,offset_ms:0,dance_counts_per_square:4,beat_times_seconds:beats,markers:[],extensions:[{id:'a',time_seconds:17,length:4},{id:'b',time_seconds:17.5,length:4}]};assert.throws(()=>validateProject(p),/superponerse/);});
import {alignmentAt} from '../frontend/src/count.ts';
import {mergeCatalogProject} from '../frontend/src/migration.ts';
import type {Project} from '../frontend/src/model.ts';
test('marcar el bongó alinea tiempo y fase, no solo el número',()=>{const a=alignmentAt(beats,5.13);assert.equal(a.first_count_one_beat_index,8);assert.ok(Math.abs(a.offset_ms-130)<1e-8);assert.equal(beatAt(beats,5.13,a.offset_ms/1000),8);assert.equal(musicalCount(beats,8,a.first_count_one_beat_index).number,1);assert.ok(musicalCount(beats,7,a.first_count_one_beat_index).logicalIndex<a.first_count_one_beat_index);});
test('alineación rechaza un golpe dentro de una extensión',()=>{assert.throws(()=>alignmentAt(beats,17.2,0,4,[{id:'x',time_seconds:17,length:4}]),/extensión/);});
const baseline={project_id:'demo',title:'Demo',duration_seconds:65,estimated_bpm:123,beat_times_seconds:beats,first_count_one_beat_index:0,offset_ms:0,dance_counts_per_square:4,beats_per_bar:4,beats_per_dance_count:8,markers:[],warnings:[],extensions:[]} as Project;
test('análisis actualizado reemplaza caché sin calibrar y conserva marcas',()=>{const fresh={...baseline,analysis_revision:2,estimated_bpm:124};const saved={...baseline,markers:[{id:'m',time_seconds:10,type:'remate',label:'Mi marca',color:'#fff',notes:'',source:'manual' as const}]};const p=mergeCatalogProject(saved,fresh,baseline);assert.equal(p.estimated_bpm,124);assert.equal(p.markers[0].label,'Mi marca');});
test('nueva publicación no borra el 1 ajustado por el profesor',()=>{const p=mergeCatalogProject({...baseline,first_count_one_beat_index:8},{...baseline,analysis_revision:2,estimated_bpm:124},baseline);assert.equal(p.first_count_one_beat_index,8);assert.equal(p.analysis_update_available,true);});

test('cuarto vertical pasa directamente a 1 para cualquier fase y punto de inserción',()=>{
 for(let phase=0;phase<8;phase++)for(let start=16;start<40;start++){
  const ext=[{id:'x',time_seconds:beats[start],length:4 as const}];
  assert.equal(musicalCount(beats,start-1,phase,4,ext).number,musicalCount(beats,start-1,phase).number);
  for(let n=0;n<4;n++)assert.equal(musicalCount(beats,start+n,phase,4,ext).extension,n+1);
  assert.equal(musicalCount(beats,start+4,phase,4,ext).number,1);
  assert.equal(musicalCount(beats,start+5,phase,4,ext).number,2);
 }
});
test('marcar un nuevo 1 después de una extensión conserva el anclaje explícito',()=>{
 const ext=[{id:'x',time_seconds:beats[17],length:4 as const}];
 const a=alignmentAt(beats,beats[30],0,4,ext);
 assert.equal(musicalCount(beats,30,a.first_count_one_beat_index,4,ext).number,1);
});
import {readFileSync} from 'node:fs';
const presetsPath=new URL('../frontend/public/demos/',import.meta.url);
const readPreset=(name:string)=>JSON.parse(readFileSync(new URL(name,presetsPath),'utf8'));
test('los cuatro ajustes publicados son válidos y migran desde la revisión 2',()=>{
 const previous=readPreset('analysis-revision-2.json');
 for(const id of ['100-x-hora','propuesta-indecente','su-veneno','bachata']){
  const fresh=validateProject(readPreset(id+'.json'));
  assert.equal(fresh.analysis_revision,id==='100-x-hora'?4:3);
  const migrated=mergeCatalogProject(previous[id],fresh,previous[id]);
  assert.deepEqual(migrated.beat_times_seconds,fresh.beat_times_seconds);
  assert.deepEqual(migrated.extensions,fresh.extensions);
  assert.equal(migrated.offset_ms,fresh.offset_ms);
  assert.equal(migrated.first_count_one_beat_index,fresh.first_count_one_beat_index);
 }
});
test('exportación ya calibrada adopta la revisión nueva sin pedir otro ajuste',()=>{
 const fresh=validateProject(readPreset('100-x-hora.json'));
 const saved={...fresh,analysis_revision:2,user_edited:true};
 const result=mergeCatalogProject(saved,fresh,readPreset('analysis-revision-2.json')['100-x-hora']);
 assert.equal(result.analysis_revision,fresh.analysis_revision);
 assert.equal(result.analysis_update_available,false);
 assert.deepEqual(result.extensions,saved.extensions);
});

test('100 x Hora migra del ajuste anterior al JSON nuevo con su extensión',()=>{
 const fresh=validateProject(readPreset('100-x-hora.json'));
 const previous=readPreset('analysis-revision-3.json')['100-x-hora'];
 const result=mergeCatalogProject(previous,fresh,previous);
 assert.equal(result.analysis_revision,4);
 assert.equal(result.first_count_one_beat_index,50);
 assert.equal(result.offset_ms,-318.28328894491517);
 assert.deepEqual(result.extensions,fresh.extensions);
 assert.equal(result.extensions[0].time_seconds,39.9019533260118);
});
test('paquemeperdones corrige a 132 conservando el instante exacto del primer paso',()=>{
 const id='8a288286-d0b7-4df4-9ace-acbb9f8a5ba2';
 const old=readPreset('legacy-analysis.json')[id];
 const fresh=validateProject(readPreset(id+'.json'));
 const start=(p:Project)=>p.beat_times_seconds[p.first_count_one_beat_index]+p.offset_ms/1000;
 assert.equal(start(fresh),start(old));
 assert.equal(fresh.estimated_bpm,132);
 for(let i=1;i<fresh.beat_times_seconds.length;i++)assert.ok(Math.abs(fresh.beat_times_seconds[i]-fresh.beat_times_seconds[i-1]-60/132)<1e-10);
 const migrated=mergeCatalogProject(old,fresh,old);
 assert.equal(migrated.estimated_bpm,132);
 assert.equal(start(migrated),start(old));
 assert.equal(migrated.markers[0].source,'suggestion');
 assert.equal(migrated.extensions.length,0);
});
