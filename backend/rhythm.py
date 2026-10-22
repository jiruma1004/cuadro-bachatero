"""Fine-resolution tempo estimation. It does not classify instruments or musical downbeats."""
import numpy as np
import librosa
from scipy.signal import find_peaks

def estimate_tempo(onset, sr, hop, duration):
    fps=sr/hop
    estimates=[]
    # Sample independent sections rather than anchoring the estimate to a free intro.
    starts=np.arange(15,max(16,duration-24),20) if duration>40 else [0]
    for start in starts:
        x=onset[int(start*fps):int(min(duration,start+24)*fps)]
        if len(x)<fps*2 or np.max(x)<1e-6:continue
        ac=librosa.autocorrelate(x,max_size=int(fps*60/65))
        peaks,_=find_peaks(ac)
        # Dance-tempo range for this bachata tool; half/double controls remain necessary.
        peaks=[i for i in peaks if 95<=60*fps/i<=190 and 0<i<len(ac)-1]
        if not peaks:continue
        k=max(peaks,key=lambda i:ac[i])
        denominator=ac[k-1]-2*ac[k]+ac[k+1]
        lag=k+(0.5*(ac[k-1]-ac[k+1])/denominator if denominator else 0)
        estimates.append(60*fps/lag)
    return float(np.median(estimates)) if estimates else 0.0
