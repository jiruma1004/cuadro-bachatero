import {analyzeSamples} from './analyze';
self.onmessage=({data})=>self.postMessage(analyzeSamples(data.samples,data.sampleRate));
