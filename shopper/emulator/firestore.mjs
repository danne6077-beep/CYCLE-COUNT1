import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,deleteDoc} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-fuji-shopper',firestore:{rules:await fs.readFile(new URL('../../firestore.rules',import.meta.url),'utf8'),host:'127.0.0.1',port:8080}});
try{
 await env.clearFirestore();
 const alice=env.authenticatedContext('alice').firestore(),bob=env.authenticatedContext('bob').firestore(),guest=env.unauthenticatedContext().firestore();
 const payload={payload:JSON.stringify({schemaVersion:1,cart:[],lists:[],trips:[]}),schemaVersion:1,updatedAt:new Date()};
 await assertSucceeds(setDoc(doc(alice,'shopperUsers/alice/snapshots/current'),payload));
 await assertSucceeds(getDoc(doc(alice,'shopperUsers/alice/snapshots/current')));
 await assertFails(getDoc(doc(bob,'shopperUsers/alice/snapshots/current')));
 await assertFails(setDoc(doc(bob,'shopperUsers/alice/snapshots/current'),payload));
 await assertFails(deleteDoc(doc(bob,'shopperUsers/alice/snapshots/current')));
 await assertFails(getDoc(doc(guest,'shopperUsers/alice/snapshots/current')));
 await assertFails(setDoc(doc(guest,'shopperUsers/alice/snapshots/current'),payload));
 await assertFails(setDoc(doc(alice,'shopperUsers/alice/snapshots/current'),{...payload,payload:'x'.repeat(500001)}));
 await assertFails(setDoc(doc(alice,'shopperUsers/alice/snapshots/other'),payload));
 await assertFails(setDoc(doc(alice,'shopperUsers/alice/snapshots/current'),{...payload,role:'admin'}));
 await assertFails(setDoc(doc(alice,'users/alice'),{role:'admin'}));
 await assertSucceeds(deleteDoc(doc(alice,'shopperUsers/alice/snapshots/current')));
 assert.equal((await getDoc(doc(alice,'shopperUsers/alice/snapshots/current'))).exists(),false);
 console.log('Firestore emulator: ownership, unauthenticated access, shape limits and role escalation checks passed.');
}finally{await env.cleanup();}
