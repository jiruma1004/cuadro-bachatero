import {nearestBeat} from './count.ts';
import {validateProject,type Project} from './model.ts';
/** Update untouched preset timing; never silently erase a teacher's calibration. */
export function mergeCatalogProject(saved:Project|undefined,fresh:Project,baseline?:Project):Project{
 if(!saved)return fresh;
 if((saved.analysis_revision??1)>=(fresh.analysis_revision??1))return saved;
 const timingUnchanged=baseline&&saved.first_count_one_beat_index===baseline.first_count_one_beat_index&&saved.offset_ms===baseline.offset_ms&&saved.estimated_bpm===baseline.estimated_bpm&&JSON.stringify(saved.beat_times_seconds)===JSON.stringify(baseline.beat_times_seconds);
 if(!timingUnchanged)return {...saved,analysis_update_available:true};
 try{return validateProject({...fresh,markers:saved.markers,extensions:saved.extensions.map(e=>({...e,time_seconds:fresh.beat_times_seconds[nearestBeat(fresh.beat_times_seconds,e.time_seconds)]})),user_edited:saved.user_edited});}
 catch{return {...saved,analysis_update_available:true};}
}
