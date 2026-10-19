export class Scanner {
  constructor(video,onRead,onStatus){this.video=video;this.onRead=onRead;this.onStatus=onStatus;this.last='';this.lastAt=0;this.active=false;}
  async start(){
    this.active=true;
    try{
      const formats=['ean_13','ean_8','upc_a','upc_e','code_128','qr_code'];
      if('BarcodeDetector'in window) {
        const supported=await window.BarcodeDetector.getSupportedFormats();
        this.detector=new window.BarcodeDetector({formats:formats.filter(f=>supported.includes(f))});
        this.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
        if(!this.active){this.stream.getTracks().forEach(t=>t.stop());return;}
        this.video.srcObject=this.stream;await this.video.play();this.loop();
      } else {
        const {BrowserMultiFormatReader}=await import('../vendor/scanner.js');
        if(!this.active)return;
        this.reader=new BrowserMultiFormatReader();
        this.controls=await this.reader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}},audio:false},this.video,(result)=>{if(result)this.emit(result.getText());});
        if(!this.active){this.controls.stop();return;}
        this.stream=this.video.srcObject;
      }
      const track=this.stream?.getVideoTracks()[0];
      const caps=track?.getCapabilities?.()||{};
      if(caps.focusMode?.includes('continuous'))try{await track.applyConstraints({advanced:[{focusMode:'continuous'}]});}catch{}
      this.onStatus('ready',!!caps.torch);
    }catch(e){this.stop();this.onStatus(e.name==='NotAllowedError'?'denied':'unavailable',false);}
  }
  async loop(){if(!this.active)return;try{if(this.video.readyState>=2){const results=await this.detector.detect(this.video);for(const result of results)this.emit(result.rawValue);}}catch{}if(this.active)this.timer=setTimeout(()=>this.loop(),100);}
  emit(value){if(!this.active)return;const now=Date.now();if(value===this.last&&now-this.lastAt<1200)return;this.last=value;this.lastAt=now;this.onRead(value);}
  async torch(on){const t=this.stream?.getVideoTracks()[0];if(t)await t.applyConstraints({advanced:[{torch:on}]});}
  async focus(){const t=this.stream?.getVideoTracks()[0];try{await t?.applyConstraints({advanced:[{focusMode:'single-shot'}]});}catch{}}
  stop(){this.active=false;clearTimeout(this.timer);this.controls?.stop();this.stream?.getTracks().forEach(t=>t.stop());this.video.srcObject=null;}
}
export function feedback(){navigator.vibrate?.(60);try{const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();g.gain.value=.035;o.frequency.value=880;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.08);o.onended=()=>c.close();}catch{}}
