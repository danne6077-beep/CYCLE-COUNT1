import test from 'node:test';
import assert from 'node:assert/strict';
import {Scanner} from '../lib/scanner.js';

function setup(t,getUserMedia){
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 class Detector{static async getSupportedFormats(){return ['ean_13'];}async detect(){return [];}}
 Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:true,BarcodeDetector:Detector}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia}}});
 const video={srcObject:null,readyState:0,setAttribute(){},async play(){}},states=[];
 const scanner=new Scanner(video,()=>{},state=>states.push(state));
 t.after(()=>{scanner.stop();if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else delete globalThis.window;Object.defineProperty(globalThis,'navigator',oldNavigator);});
 return {scanner,video,states};
}
function stream(){const track={stopped:false,stop(){this.stopped=true;},getCapabilities(){return {};}};return {track,getTracks:()=>[track],getVideoTracks:()=>[track]};}

test('Scan requests camera before any decoder initialization and prepares inline muted video',async t=>{
 let requested=false;const camera=stream();const {scanner,video,states}=setup(t,()=>{requested=true;return Promise.resolve(camera);});
 const started=scanner.start();assert.equal(requested,true);await started;
 assert.equal(video.srcObject,camera);assert.equal(video.muted,true);assert.equal(video.playsInline,true);assert.equal(states.at(-1),'ready');
 scanner.stop();assert.equal(camera.track.stopped,true);
});
test('Camera permission, busy-device and missing-device errors surface distinct retry states',async t=>{
 const {scanner,states}=setup(t,async()=>{throw Object.assign(new Error(),{name:'NotAllowedError'});});
 for(const [name,state] of [['NotAllowedError','denied'],['NotReadableError','busy'],['NotFoundError','missing']]){
  navigator.mediaDevices.getUserMedia=async()=>{throw Object.assign(new Error(),{name});};await scanner.start();
  assert.equal(states.at(-1),state);assert.equal(scanner.active,false);assert.equal(scanner.starting,false);
 }
});
test('Unsupported camera constraints retry with a basic video request',async t=>{
 const calls=[],camera=stream();const {scanner,states}=setup(t,async options=>{calls.push(options);if(calls.length===1)throw Object.assign(new Error(),{name:'OverconstrainedError'});return camera;});
 await scanner.start();assert.deepEqual(calls[1],{video:true,audio:false});assert.equal(states.at(-1),'ready');
});
test('Closing scan while permission is pending stops a late camera stream',async t=>{
 let resolve;const camera=stream();const {scanner,video}=setup(t,()=>new Promise(done=>{resolve=done;}));
 const pending=scanner.start();scanner.stop();resolve(camera);await pending;
 assert.equal(camera.track.stopped,true);assert.equal(video.srcObject,null);
});
test('A late permission response cannot replace a newer camera session',async t=>{
 let resolve,calls=0;const old=stream(),current=stream();const {scanner,video}=setup(t,()=>++calls===1?new Promise(done=>{resolve=done;}):Promise.resolve(current));
 const pending=scanner.start();await scanner.start();resolve(old);await pending;
 assert.equal(old.track.stopped,true);assert.equal(current.track.stopped,false);assert.equal(video.srcObject,current);
});
test('Preview playback failures release the camera and offer a retry state',async t=>{
 const camera=stream();const {scanner,video,states}=setup(t,async()=>camera);video.play=async()=>{throw new Error('Playback blocked');};
 await scanner.start();assert.equal(states.at(-1),'playback');assert.equal(camera.track.stopped,true);
});
