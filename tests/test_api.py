import os, sys, tempfile
from pathlib import Path
os.environ['BACHATA_DATA']=tempfile.mkdtemp(prefix='bachata-test-')
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.app import app, Project, analyze, ROOT
from fastapi.testclient import TestClient
client=TestClient(app)

def test_demo_save_export_and_restore():
    r=client.post('/api/demo'); assert r.status_code==200
    p=r.json(); assert p['beat_times_seconds'][0]==1
    assert p['beat_times_seconds'][1]-p['beat_times_seconds'][0]==.5
    p['first_count_one_beat_index']=4
    p['markers']=[dict(id='test',label='Remate',time_seconds=16,source='manual')]
    pid=p['project_id']
    assert client.patch('/api/projects/'+pid,json=p).status_code==200
    assert client.get('/api/projects/'+pid).json()['first_count_one_beat_index']==4
    assert client.get('/api/projects/'+pid+'/export').json()['markers'][0]['label']=='Remate'
    assert client.get('/api/projects/'+pid+'/audio').status_code==200
    p['beat_times_seconds']=[2,1]
    assert client.patch('/api/projects/'+pid,json=p).status_code==422

def test_invalid_upload_and_paths():
    assert client.post('/api/analyze',files={'file':('evil.txt',b'abc')}).status_code==415
    assert client.post('/api/analyze',files={'file':('broken.mp3',b'abc')}).status_code==422
    assert client.get('/api/projects/not-an-id/audio').status_code==404
    assert client.get('/api/projects/'+'0'*32).status_code==404

def test_detector_synthetic():
    p=client.post('/api/demo').json()
    result=analyze(ROOT/p['project_id']/'audio.wav',p['project_id'],'Detector test')
    assert abs(result.estimated_bpm-120)<4
    assert len(result.beat_times_seconds)>100
    # Onsets are estimated at frame resolution; most detected pulses should be close.
    import numpy as np
    expected=np.array(p['beat_times_seconds'])
    errors=[min(abs(expected-t)) for t in result.beat_times_seconds[2:-2]]
    assert np.median(errors)<.06

def test_extensions_persist_and_validate():
    p=client.post('/api/demo').json();pid=p['project_id']
    p['extensions']=[dict(id='extension',time_seconds=17,length=4)]
    assert client.patch('/api/projects/'+pid,json=p).status_code==200
    assert client.get('/api/projects/'+pid+'/export').json()['extensions']==p['extensions']
    p['extensions'].append(dict(id='overlap',time_seconds=17.5,length=4))
    assert client.patch('/api/projects/'+pid,json=p).status_code==422
    p['extensions']=[dict(id='invalid',time_seconds=17.2,length=4)]
    assert client.patch('/api/projects/'+pid,json=p).status_code==422
    p['extensions']=[dict(id='wrong-length',time_seconds=17,length=8)]
    assert client.patch('/api/projects/'+pid,json=p).status_code==422
