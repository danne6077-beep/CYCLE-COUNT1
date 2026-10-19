const FORMATS=['ean_13','ean_8','upc_a','upc_e','code_128','qr_code'];
export const CAMERA_MESSAGES={
  opening:'Opening camera… Tap Allow when your browser asks.',
  waiting:'Still waiting for camera access. Check the permission prompt, or try Take barcode photo below.',
  preparing:'Camera is open. Preparing barcode reader…',
  ready:'Keep the barcode inside the frame. Tap video to refocus.',
  denied:'Camera permission is blocked. Allow Camera in this browser’s site settings, then tap Retry camera. You can also take a barcode photo below.',
  busy:'Your camera is busy. Close other camera apps or browser tabs, then tap Retry camera.',
  missing:'No camera was found. Try Take barcode photo or enter the barcode below.',
  unsupported:'Live camera is unavailable in this browser. Open this link in Chrome or Safari, or try Take barcode photo below.',
  insecure:'Camera access requires HTTPS. Open https://fuji-grocery-tracker.vercel.app/ in Chrome or Safari.',
  playback:'Camera preview could not play. Tap Retry camera, or use Take barcode photo below.',
  decoder:'The barcode reader could not load. Reconnect and tap Retry camera, or enter the barcode below.',
  unavailable:'Camera could not start. Tap Retry camera, take a barcode photo, or enter the barcode below.'
};
async function nativeDetector(){
  try{
    if(typeof window.BarcodeDetector!=='function')return null;
    const supported=await window.BarcodeDetector.getSupportedFormats();
    const formats=FORMATS.filter(format=>supported.includes(format));
    return formats.length?new window.BarcodeDetector({formats}):null;
  }catch{return null;}
}
export class Scanner {
  constructor(video,onRead,onStatus){this.video=video;this.onRead=onRead;this.onStatus=onStatus;this.last='';this.lastAt=0;this.active=false;this.session=0;}
  async start(){
    this.stop();this.active=true;this.starting=true;const session=this.session;
    const current=()=>this.active&&session===this.session;
    this.onStatus('opening',false);
    if(window.isSecureContext===false){this.fail('insecure');return;}
    if(!navigator.mediaDevices?.getUserMedia){this.fail('unsupported');return;}
    this.waitTimer=setTimeout(()=>{if(current()&&this.starting)this.onStatus('waiting',false);},12000);
    try{
      // Request permission directly from the tap, before loading any decoder.
      let stream;
      try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});}
      catch(error){
        if(!current())return;
        if(!['OverconstrainedError','ConstraintNotSatisfiedError'].includes(error.name))throw error;
        stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      }
      if(!current()){stream.getTracks().forEach(track=>track.stop());return;}
      this.stream=stream;
      this.video.muted=true;this.video.autoplay=true;this.video.playsInline=true;
      this.video.setAttribute('playsinline','');this.video.setAttribute('webkit-playsinline','');
      this.video.srcObject=stream;
      try{await this.video.play();}catch(error){error.cameraPlayback=true;throw error;}
      if(!current())return;
      this.onStatus('preparing',false);
      this.detector=await nativeDetector();
      if(!current())return;
      if(this.detector)this.loop(session);else await this.startFallback(session);
      if(!current())return;
      const track=stream.getVideoTracks()[0],caps=track?.getCapabilities?.()||{};
      if(caps.focusMode?.includes('continuous'))try{await track.applyConstraints({advanced:[{focusMode:'continuous'}]});}catch{}
      if(current())this.onStatus('ready',!!caps.torch);
    }catch(error){
      if(!current())return;
      const state=error.cameraPlayback?'playback':error.cameraDecoder?'decoder':
        ['NotAllowedError','PermissionDeniedError','SecurityError'].includes(error.name)?'denied':
        ['NotReadableError','TrackStartError','AbortError'].includes(error.name)?'busy':
        ['NotFoundError','DevicesNotFoundError'].includes(error.name)?'missing':'unavailable';
      this.fail(state);
    }finally{if(session===this.session){clearTimeout(this.waitTimer);this.starting=false;}}
  }
  fail(state){this.stop();this.onStatus(state,false);}
  async startFallback(session){
    try{
      const {BrowserMultiFormatReader}=await import('../vendor/scanner.js');
      if(!this.active||session!==this.session)return;
      this.reader=new BrowserMultiFormatReader();
      // Reuse the already-authorized stream. Never request a second camera.
      const controls=await this.reader.decodeFromVideoElement(this.video,result=>{if(result)this.emit(result.getText());});
      if(!this.active||session!==this.session){controls.stop();return;}
      this.controls=controls;
    }catch(error){error.cameraDecoder=true;throw error;}
  }
  async loop(session){
    if(!this.active||session!==this.session)return;
    try{if(this.video.readyState>=2){const results=await this.detector.detect(this.video);if(!this.active||session!==this.session)return;for(const result of results)this.emit(result.rawValue);}}
    catch{
      if(!this.active||session!==this.session)return;
      try{await this.startFallback(session);}catch{if(this.active&&session===this.session)this.fail('decoder');}
      return;
    }
    if(this.active&&session===this.session)this.timer=setTimeout(()=>this.loop(session),100);
  }
  emit(value){if(!this.active)return;const now=Date.now();if(value===this.last&&now-this.lastAt<1200)return;this.last=value;this.lastAt=now;this.onRead(value);}
  async torch(on){const track=this.stream?.getVideoTracks()[0];if(track)await track.applyConstraints({advanced:[{torch:on}]});}
  async focus(){const track=this.stream?.getVideoTracks()[0];try{await track?.applyConstraints({advanced:[{focusMode:'single-shot'}]});}catch{}}
  stop(){
    this.active=false;this.starting=false;this.session++;clearTimeout(this.timer);clearTimeout(this.waitTimer);
    this.controls?.stop();this.controls=null;this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;
    this.video.srcObject=null;
  }
}
export async function decodePhoto(file){
  if(!file||!file.type.startsWith('image/'))throw new Error('Choose a photo of the barcode.');
  if(file.size>12*1024*1024)throw new Error('Use a photo smaller than 12 MB.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    if(image.naturalWidth>20000||image.naturalHeight>20000)throw new Error('This photo is too large. Take a closer barcode photo.');
    const detector=await nativeDetector();
    if(detector)try{const results=await detector.detect(image);if(results[0]?.rawValue)return results[0].rawValue;}catch{}
    const {BrowserMultiFormatReader}=await import('../vendor/scanner.js');
    try{return (await new BrowserMultiFormatReader().decodeFromImageElement(image)).getText();}
    catch{throw new Error('No readable barcode found. Take a sharp, close photo with the whole barcode visible, or type the code below.');}
  }finally{URL.revokeObjectURL(url);}
}
export function feedback({haptics=false,sound=false}={}){if(haptics)navigator.vibrate?.(60);if(!sound)return;try{const context=new (window.AudioContext||window.webkitAudioContext)(),oscillator=context.createOscillator(),gain=context.createGain();gain.gain.value=.035;oscillator.frequency.value=880;oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.08);oscillator.onended=()=>context.close();}catch{}}
