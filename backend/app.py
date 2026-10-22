"""API privada de musicalidad. Los archivos nunca salen de esta computadora."""
import json, os, re, shutil, subprocess, uuid, wave
from pathlib import Path
from typing import Literal
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator

ROOT = Path(os.environ.get('BACHATA_DATA', Path(__file__).parent / 'data')).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
app = FastAPI(title='Cuadro Bachatero · API local')

class Marker(BaseModel):
    id: str
    time_seconds: float = Field(ge=0, allow_inf_nan=False)
    type: str = 'remate'
    label: str = Field(max_length=200)
    color: str = '#fb7185'
    notes: str = Field(default='', max_length=2000)
    source: Literal['manual', 'suggestion'] = 'manual'

class Extension(BaseModel):
    id: str
    time_seconds: float = Field(ge=0, allow_inf_nan=False)
    length: Literal[4] = 4

class Project(BaseModel):
    project_id: str
    title: str = Field(max_length=250)
    duration_seconds: float = Field(gt=0, le=1800, allow_inf_nan=False)
    estimated_bpm: float = Field(ge=0, le=500, allow_inf_nan=False)
    beat_times_seconds: list[float] = Field(max_length=20000)
    first_count_one_beat_index: int = 0
    offset_ms: float = Field(default=0, ge=-10000, le=10000, allow_inf_nan=False)
    beats_per_bar: Literal[4] = 4
    beats_per_dance_count: Literal[8] = 8
    dance_counts_per_square: int = Field(default=4, ge=1, le=16)
    markers: list[Marker] = Field(default_factory=list, max_length=2000)
    warnings: list[str] = Field(default_factory=list)
    analysis_revision: int = 1
    alignment_confirmed: bool = False
    user_edited: bool = False
    analysis_update_available: bool = False
    extensions: list[Extension] = Field(default_factory=list, max_length=1000)
    @model_validator(mode='after')
    def validate_timing(self):
        b = self.beat_times_seconds
        if any(not np.isfinite(v) or v < 0 or v >= self.duration_seconds for v in b):
            raise ValueError('Pulsos fuera de la duración')
        if any(a >= b for a,b in zip(b,b[1:])):
            raise ValueError('Los pulsos deben estar ordenados, sin duplicados')
        if any(m.time_seconds > self.duration_seconds for m in self.markers):
            raise ValueError('Marca fuera de la canción')
        last_end = -1
        for e in sorted(self.extensions, key=lambda e:e.time_seconds):
            matches = [i for i,t in enumerate(b) if abs(t-e.time_seconds)<.0001]
            if not matches or matches[0] < last_end or matches[0]+4>len(b):
                raise ValueError("Extensión fuera de rejilla o superpuesta")
            last_end = matches[0]+4
        return self

def folder(pid):
    if not re.fullmatch(r'[a-f0-9]{32}', pid):
        raise HTTPException(404, 'Proyecto no encontrado')
    p = ROOT / pid
    if not p.is_dir(): raise HTTPException(404, 'Proyecto no encontrado')
    return p

def save(p, project):
    tmp = p / (uuid.uuid4().hex + '.tmp')
    tmp.write_text(project.model_dump_json(indent=2), encoding='utf-8')
    tmp.replace(p / 'project.json')

def read(pid):
    p = folder(pid) / 'project.json'
    if not p.exists(): raise HTTPException(404, 'Proyecto incompleto')
    return Project.model_validate_json(p.read_text())

def analyze(path, pid, title):
    import librosa
    y, sr = librosa.load(path, sr=22050, mono=True)
    duration = len(y) / sr
    if duration <= .5 or duration > 1800: raise ValueError('Usa audio de 1 segundo a 30 minutos')
    from backend.rhythm import estimate_tempo
    hop = 128
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo = estimate_tempo(onset, sr, hop, duration)
    if tempo:
        _, frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=hop, bpm=tempo, trim=True)
        beats = librosa.frames_to_time(frames, sr=sr, hop_length=hop)
    else:
        beats = np.array([])
    rms = librosa.feature.rms(y=y)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
    active = np.flatnonzero(rms > max(float(np.max(rms)) * .04, .0001))
    start = float(times[active[0]]) if len(active) else duration
    beats = beats[(beats >= start) & (beats < duration)]
    bpm = float(np.asarray(tempo).reshape(-1)[0]) if np.asarray(tempo).size else 0
    warnings = ['Tempo medido en varios tramos; primer 1 no confirmado. Marca el golpe de entrada de los bongós que corresponda al 1.']
    if start > .2: warnings.append(f'Inicio audible estimado: {start:.2f} s; no equivale al tiempo 1.')
    if len(beats) < 8 or np.max(rms) < .001:
        warnings.append('Pocos pulsos o señal débil: utiliza BPM manual o Tap tempo.')
    if len(beats)>2 and np.std(np.diff(beats))/np.mean(np.diff(beats)) > .12:
        warnings.append('Rejilla irregular: revisa y edita los pulsos individualmente.')
    markers=[]
    quiet=rms < max(float(np.max(rms))*.06,.0001)
    for i in range(1,len(quiet)):
        if quiet[i] and not quiet[i-1] and times[i]>start+2 and (not markers or times[i]-markers[-1]['time_seconds']>8):
            markers.append(dict(id=uuid.uuid4().hex,time_seconds=float(times[i]),type='posible cambio',label='Posible reducción de energía',source='suggestion',color='#facc15',notes='Heurística RMS; escucha y confirma. No identifica ausencia instrumental.'))
    return Project(project_id=pid,title=title,duration_seconds=duration,estimated_bpm=bpm,beat_times_seconds=beats.tolist(),warnings=warnings,markers=markers[:60],analysis_revision=2)

@app.get('/api/health')
def health(): return {'ok':True,'ffmpeg':bool(shutil.which('ffmpeg'))}

@app.get('/api/projects')
def projects():
    return [dict(project_id=d['project_id'], title=d['title']) for p in ROOT.glob('*/project.json') if (d:=json.loads(p.read_text()))]

@app.post('/api/analyze')
def upload(file: UploadFile):
    ext=Path(file.filename or '').suffix.lower()
    if ext not in {'.mp3','.wav','.m4a'}: raise HTTPException(415,'Usa MP3, WAV o M4A')
    if not shutil.which('ffmpeg'): raise HTTPException(503,'Falta FFmpeg: sudo apt install ffmpeg / brew install ffmpeg')
    pid=uuid.uuid4().hex; p=ROOT/pid; p.mkdir()
    try:
        size=0
        with (p/('original'+ext)).open('wb') as out:
            while chunk:=file.file.read(1024*1024):
                size+=len(chunk)
                if size>100*1024*1024: raise HTTPException(413,'Máximo 100 MB')
                out.write(chunk)
        result=subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(p/('original'+ext)),'-t','1801','-ac','1','-ar','22050',str(p/'audio.wav')],capture_output=True,timeout=120)
        if result.returncode: raise ValueError('Audio inválido o formato no compatible')
        project=analyze(p/'audio.wav',pid,Path(file.filename).name)
        save(p,project)
        return project
    except Exception as e:
        shutil.rmtree(p,ignore_errors=True)
        if isinstance(e,HTTPException): raise
        raise HTTPException(422,str(e))

@app.post('/api/demo')
def demo():
    pid=uuid.uuid4().hex; p=ROOT/pid; p.mkdir()
    sr=22050; duration=65; y=np.zeros(sr*duration,dtype=np.float32)
    beats=np.arange(1,duration,.5)
    for i,t in enumerate(beats):
        n=int(.05*sr); x=np.arange(n)/sr
        y[int(t*sr):int(t*sr)+n]+=.55*np.sin(2*np.pi*(1000 if i%8==0 else 650)*x)*np.exp(-x*85)
    with wave.open(str(p/'audio.wav'),'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((y*32767).astype('<i2').tobytes())
    project=Project(project_id=pid,title='Demo · 120 BPM · pulsos conocidos',duration_seconds=duration,estimated_bpm=120,beat_times_seconds=beats.tolist(),warnings=['Demo sintética con rejilla exacta; primer 1 en 1.00 s.'],analysis_revision=2,alignment_confirmed=True)
    save(p,project); return project

@app.get('/api/projects/{pid}')
def get(pid:str): return read(pid)
@app.patch('/api/projects/{pid}')
def patch(pid:str, project: Project):
    old=read(pid)
    if project.project_id!=pid or project.duration_seconds!=old.duration_seconds: raise HTTPException(422,'Identidad o duración incorrecta')
    save(folder(pid),project); return project
@app.get('/api/projects/{pid}/audio')
def audio(pid:str): return FileResponse(folder(pid)/'audio.wav',media_type='audio/wav')
@app.get('/api/projects/{pid}/export')
def export(pid:str):
    read(pid)
    return FileResponse(folder(pid)/'project.json',media_type='application/json',filename='cuadro-bachatero.json')

DIST=Path(__file__).parent.parent/'frontend'/'dist'
if DIST.exists(): app.mount('/',StaticFiles(directory=DIST,html=True),name='frontend')
