import assert from 'node:assert/strict';

const listeners={};
const root={innerHTML:'',querySelector:()=>null,addEventListener:(type,callback)=>{listeners[type]=callback;}};
const classList={toggle:()=>{},add:()=>{},remove:()=>{}};
const body={classList,appendChild:()=>{}};
const documentElement={style:{setProperty:()=>{}}};
globalThis.document={
  getElementById:(id)=>id==='app'?root:null,
  createElement:()=>({classList:{add:()=>{},remove:()=>{}},dataset:{},style:{},setAttribute:()=>{},appendChild:()=>{}}),
  querySelector:()=>null,
  addEventListener:()=>{},
  body,
  documentElement,
  activeElement:{tagName:'BODY'}
};
globalThis.window={addEventListener:()=>{},confirm:()=>true};
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
globalThis.location={protocol:'file:'};
globalThis.setInterval=()=>0;

await import('../src/main.js');
assert.ok(root.innerHTML.includes('class="main-menu"'),'application should render the main menu on startup');
assert.ok(root.innerHTML.includes('data-action="play"'),'main menu must include a working Play action');
assert.ok(root.innerHTML.includes('data-action="settings"'),'main menu must include a working Settings action');
assert.ok(root.innerHTML.includes('data-action="account"'),'main menu must include a working Account action');
const playButton={disabled:false,dataset:{action:'play',id:'',tab:''}};
listeners.click({target:{closest:()=>playButton}});
assert.ok(root.innerHTML.includes('data-action="create-character"'),'Play action should switch to the character selection screen');
assert.ok(root.innerHTML.includes('Выбор персонажа'),'character selection screen should render after the Play action');
console.log('Startup test passed: main menu renders, Play opens character selection, and no runtime ReferenceError occurs.');
