import {nearestBeat} from './count.ts';
import {validateProject,type Project} from './model.ts';
/** Update untouched preset timing; never silently erase a teacher's calibration. */
export function mergeCatalogProject(saved:Project|undefined,fresh:Project,baseline?:Project):Project{
 if(!saved)return fresh;
 if((saved.analysis_revision??1)>=(fresh.analysis_revision??1))return saved;
 const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 const matchesFresh=saved.first_count_one_beat_index===fresh.first_count_one_beat_index&&saved.offset_ms===fresh.offset_ms&&saved.estimated_bpm===fresh.estimated_bpm&&same(saved.beat_times_seconds,fresh.beat_times_seconds)&&same(saved.extensions,fresh.extensions);
 if(matchesFresh)return {...saved,analysis_revision:fresh.analysis_revision,analysis_update_available:false};
 const timingUnchanged=baseline&&saved.first_count_one_beat_index===baseline.first_count_one_beat_index&&saved.offset_ms===baseline.offset_ms&&saved.estimated_bpm===baseline.estimated_bpm&&JSON.stringify(saved.beat_times_seconds)===JSON.stringify(baseline.beat_times_seconds);
 if(!timingUnchanged)return {...saved,analysis_update_available:true};
 try{return validateProject({...fresh,markers:same(saved.markers,baseline?.markers)?fresh.markers:saved.markers,extensions:same(saved.extensions,baseline?.extensions)?fresh.extensions:saved.extensions.map(e=>({...e,time_seconds:fresh.beat_times_seconds[nearestBeat(fresh.beat_times_seconds,e.time_seconds)]})),user_edited:saved.user_edited});}
 catch{return {...saved,analysis_update_available:true};}
}
