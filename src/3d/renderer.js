import { LOCATIONS, ITEMS } from '../data/catalog.js';

/*
 * Offline first-person WebGL renderer for the Cordon prototype.
 * All meshes are generated locally; no CDN, remote model, or external runtime is required.
 * The art direction is deliberately grounded: muted materials, worn surfaces, fog,
 * clutter, believable silhouettes and low-poly geometry tuned for mobile GPUs.
 */

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute vec2 aUv;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform mat3 uNormal;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying vec2 vUv;
varying vec3 vViewPosition;
varying float vFogDepth;
void main(){
  vec4 world=uModel*vec4(aPosition,1.0);
  vec4 view=uView*world;
  vWorld=world.xyz;
  vNormal=normalize(uNormal*aNormal);
  vColor=aColor;
  vUv=aUv;
  vViewPosition=-view.xyz;
  vFogDepth=max(0.0,-view.z);
  gl_Position=uProjection*view;
}`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying vec2 vUv;
varying vec3 vViewPosition;
varying float vFogDepth;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTime;
uniform sampler2D uAlbedo;
uniform sampler2D uCharacterAtlas;
uniform float uTextureReady;
uniform float uSpritePass;
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float hash21(vec2 p){return hash31(vec3(p.x,p.y,17.17));}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i),b=hash21(i+vec2(1.,0.)),c=hash21(i+vec2(0.,1.)),d=hash21(i+vec2(1.,1.));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=.5;for(int i=0;i<4;i++){v+=noise2(p)*a;p*=2.03;a*=.5;}return v;}
void main(){
  if(uSpritePass>.5){
    vec4 character=texture2D(uCharacterAtlas,vUv);
    if(character.a<.12)discard;
    gl_FragColor=vec4(character.rgb,character.a);
    return;
  }
  vec3 n=normalize(vNormal);
  float diffuse=max(0.0,dot(n,normalize(-uSunDirection)));
  float fill=.40+.18*max(0.0,n.y);
  float grit=(hash31(floor(vWorld*vec3(37.0,48.0,37.0))-.5))*.045;
  float broad=(sin(vWorld.x*.73+sin(vWorld.z*.41))*cos(vWorld.z*.57+vWorld.y*.18))*.025;
  float damp=sin(vWorld.x*.14+vWorld.z*.11)*.018;
  vec3 albedo=vColor;
  if(uTextureReady>.5){
    vec3 texel=texture2D(uAlbedo,vUv).rgb;
    float texLuma=dot(texel,vec3(.30,.59,.11));
    float textureDetail=clamp(texLuma*2.15,.72,1.28);
    float warmOrganic=step(.075,vColor.r-vColor.g)*step(.035,vColor.g-vColor.b)*step(.29,vColor.r);
    albedo*=mix(1.0,textureDetail,.30*(1.0-warmOrganic));
  }
  float groundMask=smoothstep(.66,.92,n.y)*(1.0-smoothstep(.20,.38,vWorld.y));
  float soil=fbm(vWorld.xz*.38),soilFine=fbm(vWorld.xz*2.8);
  float groundVariation=mix(.74,1.20,soil*.68+soilFine*.32);
  albedo*=mix(1.0,groundVariation,groundMask);
  float foliageMask=step(vColor.r+.065,vColor.g)*step(vColor.b+.075,vColor.g);
  float leafNoise=fbm(vWorld.xz*4.2+vWorld.yy*1.7);
  albedo*=mix(1.0,.72+leafNoise*.48,foliageMask*.90);
  float rustNoise=fbm(vec2(vWorld.x*.45+vWorld.y*.12,vWorld.z*.55));
  float metalMask=step(.30,abs(vColor.r-vColor.g)+abs(vColor.g-vColor.b))*(1.0-foliageMask);
  albedo=mix(albedo,albedo*(.82+rustNoise*.42),metalMask*.22);
  float light=fill+diffuse*.72;
  vec3 base=max(vec3(0.0),albedo*(light+grit+broad+damp)*uSunColor);
  vec3 viewDir=normalize(vViewPosition);
  float spec=pow(max(dot(reflect(-normalize(-uSunDirection),n),viewDir),0.0),24.0)*.10;
  base+=uSunColor*spec;
  float hemi=pow(max(0.0,n.y),3.0)*.075;
  base+=vec3(.20,.22,.16)*hemi;
  float fog=clamp((vFogDepth-uFogNear)/(uFogFar-uFogNear),0.0,1.0);
  fog=fog*fog*(3.0-2.0*fog);
  vec3 color=mix(base,uFogColor,fog);
  color=color/(color+vec3(.78));
  color=pow(color,vec3(.94));
  gl_FragColor=vec4(color,1.0);
}`

const color = (hex) => {
  if (Array.isArray(hex)) return hex;
  const s=hex.replace('#','');
  return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255];
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const hash=(s)=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

class MeshBuilder {
  constructor(){this.vertices=[];this.normals=[];this.colors=[];this.uvs=[];}
  tri(a,b,c,col,na=null,nb=null,nc=null){
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
    const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const cc=color(col);const avgY=(a[1]+b[1]+c[1])/3;let tileU=0,tileV=0,repeat=.22;
    // 4x2 offline atlas: soil, timber, foliage, asphalt / concrete, oxidised metal, olive canvas, glass.
    const horizontal=Math.abs(ny)>.68;
    if(horizontal&&avgY<.36&&cc[0]<.24){tileU=0;tileV=0;repeat=.10;}
    else if(horizontal&&avgY<.14&&cc[0]>.24){tileU=3;tileV=0;repeat=.17;}
    else if(cc[1]-cc[0]>.065&&cc[1]-cc[2]>.075){tileU=2;tileV=0;repeat=.34;}
    else if(cc[1]-cc[0]>.018&&cc[1]-cc[2]>.012){tileU=2;tileV=.5;repeat=.33;}
    else if(cc[0]>cc[1]*1.10&&cc[1]>cc[2]*1.06){tileU=1;tileV=0;repeat=.32;}
    else if(cc[2]>cc[0]*1.15&&cc[2]>cc[1]*1.06){tileU=3;tileV=.5;repeat=.30;}
    else if(Math.abs(cc[0]-cc[1])<.07&&Math.abs(cc[1]-cc[2])<.08){tileU=0;tileV=.5;repeat=.34;}
    else{tileU=1;tileV=.5;repeat=.34;}
    const uvFor=(point)=>{let u,v;if(Math.abs(ny)>=Math.abs(nx)&&Math.abs(ny)>=Math.abs(nz)){u=point[0];v=point[2];}else if(Math.abs(nz)>=Math.abs(nx)){u=point[0];v=point[1];}else{u=point[2];v=point[1];}const fu=((u*repeat)%1+1)%1,fv=((v*repeat)%1+1)%1;return [tileU/4+.003+fu*.244,tileV+.006+fv*.488];};
    for(const [p,n] of [[a,na],[b,nb],[c,nc]]){this.vertices.push(...p);this.normals.push(...(n||[nx,ny,nz]));this.colors.push(...cc);this.uvs.push(...uvFor(p));}
  }
  quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col);}
  box(x,y,z,sx,sy,sz,col,yaw=0){
    const hx=sx/2,hy=sy/2,hz=sz/2,cs=Math.cos(yaw),sn=Math.sin(yaw);
    const tr=(p)=>[x+p[0]*cs+p[2]*sn,y+p[1],z-p[0]*sn+p[2]*cs];
    const p=[tr([-hx,-hy,-hz]),tr([hx,-hy,-hz]),tr([hx,hy,-hz]),tr([-hx,hy,-hz]),tr([-hx,-hy,hz]),tr([hx,-hy,hz]),tr([hx,hy,hz]),tr([-hx,hy,hz])];
    this.quad(p[0],p[3],p[2],p[1],col);this.quad(p[5],p[6],p[7],p[4],col);
    this.quad(p[4],p[7],p[3],p[0],col);this.quad(p[1],p[2],p[6],p[5],col);
    this.quad(p[3],p[7],p[6],p[2],col);this.quad(p[4],p[0],p[1],p[5],col);
  }
  sphere(x,y,z,rx,ry,rz,col,lat=12,lon=18){
    // Ellipsoids use interpolated normals: cloth folds, heads and joints read as rounded surfaces
    // while the silhouette remains intentionally low-poly and inexpensive to draw.
    const point=(a,b)=>[x+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(a)*ry,z+Math.cos(a)*Math.sin(b)*rz];
    const normal=(a,b)=>{let nx=Math.cos(a)*Math.cos(b)/Math.max(.001,rx),ny=Math.sin(a)/Math.max(.001,ry),nz=Math.cos(a)*Math.sin(b)/Math.max(.001,rz),l=Math.hypot(nx,ny,nz)||1;return [nx/l,ny/l,nz/l];};
    for(let i=0;i<lat;i++){const a0=-Math.PI/2+i*Math.PI/lat,a1=-Math.PI/2+(i+1)*Math.PI/lat;
      for(let j=0;j<lon;j++){const b0=j*2*Math.PI/lon,b1=(j+1)*2*Math.PI/lon;
        const A=point(a0,b0),B=point(a1,b0),C=point(a1,b1),D=point(a0,b1);
        this.tri(A,B,C,col,normal(a0,b0),normal(a1,b0),normal(a1,b1));
        this.tri(A,C,D,col,normal(a0,b0),normal(a1,b1),normal(a0,b1));
      }
    }
  }
  cylinder(x,y,z,r,h,col,segments=12,rTop=r){
    const y0=y,y1=y+h;
    for(let i=0;i<segments;i++){const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
      const p0=[x+Math.cos(a)*r,y0,z+Math.sin(a)*r],p1=[x+Math.cos(b)*r,y0,z+Math.sin(b)*r];
      const q0=[x+Math.cos(a)*rTop,y1,z+Math.sin(a)*rTop],q1=[x+Math.cos(b)*rTop,y1,z+Math.sin(b)*rTop];
      this.quad(p0,q0,q1,p1,col);this.tri([x,y0,z],p0,p1,col);this.tri([x,y1,z],q1,q0,col);
    }
  }
  beam(a,b,r,col,segments=8,r2=r){
    const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz)||1;
    const ux=dx/len,uy=dy/len,uz=dz/len;
    let ax=Math.abs(uy)<.92?0:1,ay=Math.abs(uy)<.92?1:0,az=0;
    let vx=uy*az-uz*ay,vy=uz*ax-ux*az,vz=ux*ay-uy*ax;let vl=Math.hypot(vx,vy,vz)||1;vx/=vl;vy/=vl;vz/=vl;
    const wx=uy*vz-uz*vy,wy=uz*vx-ux*vz,wz=ux*vy-uy*vx;
    for(let i=0;i<segments;i++){const t0=i*2*Math.PI/segments,t1=(i+1)*2*Math.PI/segments;
      const pt=(t,radius,base)=>[base[0]+(vx*Math.cos(t)+wx*Math.sin(t))*radius,base[1]+(vy*Math.cos(t)+wy*Math.sin(t))*radius,base[2]+(vz*Math.cos(t)+wz*Math.sin(t))*radius];
      const p0=pt(t0,r,a),p1=pt(t1,r,a),q0=pt(t0,r2,b),q1=pt(t1,r2,b);this.quad(p0,p1,q1,q0,col);
    }
  }
  cone(x,y,z,r,h,col,segments=10){this.cylinder(x,y,z,r,h,col,segments,.015);}
  toRaw(){return {vertices:this.vertices.slice(),normals:this.normals.slice(),colors:this.colors.slice(),uvs:this.uvs.slice()};}
  toMesh(gl){
    const data=new Float32Array(this.vertices.length/3*11);
    for(let i=0,j=0,k=0;i<this.vertices.length;i+=3,j+=11,k+=2){data[j]=this.vertices[i];data[j+1]=this.vertices[i+1];data[j+2]=this.vertices[i+2];data[j+3]=this.normals[i];data[j+4]=this.normals[i+1];data[j+5]=this.normals[i+2];data[j+6]=this.colors[i];data[j+7]=this.colors[i+1];data[j+8]=this.colors[i+2];data[j+9]=this.uvs[k];data[j+10]=this.uvs[k+1];}
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    return {buffer,count:this.vertices.length/3};
  }
}

export function sampleTerrainHeight(x,z){
  const hillA=.72*Math.exp(-(((x-22)**2)/190+((z+17)**2)/240));
  const hillB=.58*Math.exp(-(((x+24)**2)/170+((z-19)**2)/210));
  const ditch=-.42*Math.exp(-(((x-10)**2)/110+((z-24)**2)/145));
  const ridge=.22*Math.sin(x*.105)*Math.cos(z*.12)+.13*Math.sin(x*.22+z*.16)+.085*Math.cos(z*.29-x*.20);
  const rolling=.045*Math.sin(x*.57+z*.43)+.025*Math.cos(z*.71-x*.53);
  return ridge+rolling+hillA+hillB+ditch;
}
function addGround(b,rng){
  const size=76,steps=78,half=size/2;
  const height=sampleTerrainHeight;
  for(let iz=0;iz<steps;iz++)for(let ix=0;ix<steps;ix++){
    const x0=-half+size*ix/steps,x1=-half+size*(ix+1)/steps,z0=-half+size*iz/steps,z1=-half+size*(iz+1)/steps;
    const h00=height(x0,z0),h10=height(x1,z0),h11=height(x1,z1),h01=height(x0,z1);
    const broad=Math.sin((x0+x1)*.035+Math.cos((z0+z1)*.04))*.012;
    const variation=(rng()-.5)*.009;const base=[.19+broad+variation,.205+broad+variation,.145+broad+variation];
    b.quad([x0,h00,z0],[x0,h01,z1],[x1,h11,z1],[x1,h10,z0],base);
  }
  return height;
}
function addRoad(b,points,width=5){
  for(let i=0;i<points.length-1;i++){
    const a=points[i],d=points[i+1],dx=d[0]-a[0],dz=d[1]-a[1],l=Math.hypot(dx,dz)||1,nx=-dz/l*width/2,nz=dx/l*width/2;
    const h=(x,z)=>sampleTerrainHeight(x,z)+.035;const c1=[a[0]+nx,h(a[0]+nx,a[1]+nz),a[1]+nz],c2=[a[0]-nx,h(a[0]-nx,a[1]-nz),a[1]-nz],c3=[d[0]-nx,h(d[0]-nx,d[1]-nz),d[1]-nz],c4=[d[0]+nx,h(d[0]+nx,d[1]+nz),d[1]+nz];
    b.quad(c2,c1,c4,c3,[.27,.265,.225]);
    // two worn tyre lanes, embedded gravel and soft shoulders
    for(const off of [-.92,.92]){const tx=nx*(off/(width/2)),tz=nz*(off/(width/2)),rx=-dz/l*.24,rz=dx/l*.24;b.quad([a[0]+tx+rx,h(a[0]+tx+rx,a[1]+tz+rz)+.012,a[1]+tz+rz],[a[0]+tx-rx,h(a[0]+tx-rx,a[1]+tz-rz)+.012,a[1]+tz-rz],[d[0]+tx-rx,h(d[0]+tx-rx,d[1]+tz-rz)+.012,d[1]+tz-rz],[d[0]+tx+rx,h(d[0]+tx+rx,d[1]+tz+rz)+.012,d[1]+tz+rz],[.245,.235,.198]);}
    b.quad([a[0]+nx,h(a[0]+nx,a[1]+nz)+.02,a[1]+nz],[a[0]+nx*1.28,h(a[0]+nx*1.28,a[1]+nz*1.28)+.015,a[1]+nz*1.28],[d[0]+nx*1.28,h(d[0]+nx*1.28,d[1]+nz*1.28)+.015,d[1]+nz*1.28],[d[0]+nx,h(d[0]+nx,d[1]+nz)+.02,d[1]+nz],[.17,.175,.145]);
  }
}
function addTree(b,x,z,s=1,rng=Math.random){
  const base=sampleTerrainHeight(x,z);
  const lean=(rng()-.5)*.20;b.cylinder(x,base+.03,z,.20*s,2.9*s,[.20,.16,.115],9,.115*s);
  b.beam([x,base+.8*s,z],[x+lean*3*s,base+3.8*s,z+.1*s],.11*s,[.23,.18,.12],7,.035*s);
  for(let k=0;k<4;k++){const ang=k*Math.PI/2+rng()*.6;const end=[x+Math.cos(ang)*(.95+rng()*.4)*s,2.2*s+rng()*1.2*s,z+Math.sin(ang)*(.95+rng()*.4)*s];b.beam([x,base+1.5*s,z],[end[0],end[1]+base,end[2]],.06*s,[.24,.18,.12],6,.025*s);}
  const greens=[[.20,.255,.17],[.24,.29,.18],[.18,.235,.16],[.28,.31,.20]];
  for(let j=0;j<11;j++){const a=rng()*Math.PI*2,rr=rng()*1.18*s,cy=base+2.75*s+rng()*1.38*s,rx=.48*s+rng()*.34*s,rz=.46*s+rng()*.34*s;b.sphere(x+Math.cos(a)*rr,cy,z+Math.sin(a)*rr,rx,.48*s+rng()*.34*s,rz,greens[Math.floor(rng()*greens.length)],7,9);}
}
function addBush(b,x,z,s=1,rng=Math.random){
  const base=sampleTerrainHeight(x,z);
  const palette=[[.18,.25,.14],[.22,.28,.16],[.29,.31,.18]];
  for(let i=0;i<6;i++)b.sphere(x+(rng()-.5)*1.35*s, base+.28*s+rng()*.38*s,z+(rng()-.5)*1.25*s,.30*s+rng()*.19*s,.30*s+rng()*.18*s,.34*s+rng()*.16*s,palette[Math.floor(rng()*3)],6,8);
}
function addRock(b,x,z,s=1,rng=Math.random){
  b.sphere(x,sampleTerrainHeight(x,z)+.22*s,z,.48*s,.28*s,.38*s,rng()>.5?[.36,.35,.30]:[.29,.30,.27],5,8);
}
function addBarrel(b,x,z,rust=0){
  const base=sampleTerrainHeight(x,z);
  b.cylinder(x,base+.05,z,.42,.95,rust?[.35,.20,.14]:[.28,.34,.31],14,.39);
  for(let y of [.25,.67])b.cylinder(x,y,z,.425,.035,[.12,.15,.14],14,.425);
  b.cylinder(x,base+1.01,z,.34,.035,[.16,.17,.15],14,.34);
}
function addFence(b,x1,z1,x2,z2,posts=5){
  for(let i=0;i<posts;i++){const t=i/(posts-1),x=mix(x1,x2,t),z=mix(z1,z2,t);b.box(x,.85,z,.13,1.7,.13,[.25,.22,.16]);}
  for(let y of [.5,1.25])b.beam([x1,y,z1],[x2,y,z2],.055,[.28,.24,.17],6,.055);
  // weathered wire strand
  b.beam([x1,1.56,z1],[x2,1.56,z2],.018,[.36,.36,.31],5,.018);
}
function addUtilityPole(b,x,z,height=7){
  b.cylinder(x,.08,z,.18,height,[.20,.16,.11],10,.12);
  b.beam([x-.9,height-.45,z],[x+.9,height-.45,z],.10,[.24,.20,.14],8,.07);
  for(let dx of [-.72,0,.72]){b.cylinder(x+dx,height-.42,z,.075,.26,[.42,.40,.31],8,.06);b.sphere(x+dx,height-.25,z,.095,.08,.095,[.48,.46,.36],7,8);}
  b.beam([x-.72,height-.25,z],[x+.72,height-.25,z],.018,[.08,.09,.08],5,.018);
}
function addCable(b,a,d,sag=1.1){
  const mid=[(a[0]+d[0])*.5,Math.min(a[1],d[1])-sag,(a[2]+d[2])*.5];
  b.beam(a,mid,.018,[.055,.065,.06],5,.014);b.beam(mid,d,.018,[.055,.065,.06],5,.014);
}
function addRubble(b,x,z,seed=1){
  const r=seeded(seed);for(let i=0;i<9;i++){const px=x+(r()-.5)*2.2,pz=z+(r()-.5)*2.0,scale=.15+r()*.34;b.box(px,.07+scale*.2,pz,scale*1.8,scale*.55,scale,[.29+r()*.08,.29+r()*.07,.25+r()*.05],r()*Math.PI);}
  for(let i=0;i<3;i++)b.beam([x+(r()-.5)*1.5,.18,z+(r()-.5)*1.5],[x+(r()-.5)*1.8,.24,z+(r()-.5)*1.8],.035,[.22,.20,.16],5,.025);
}
function addPuddle(b,x,z,s=1){
  b.sphere(x,.035,z,1.2*s,.025,.72*s,[.12,.16,.15],7,12);
  b.sphere(x-.22*s,.052,z+.08*s,.48*s,.012,.20*s,[.18,.21,.18],6,9);
}
function addHouse(b,x,z,s=1,variant=0){
  const wall=variant===1?[.32,.31,.25]:[.38,.34,.27],roof=variant===1?[.19,.20,.18]:[.24,.18,.14];
  b.box(x,.22*s,z,6.8*s,.44*s,5.2*s,[.25,.24,.19]);
  b.box(x,1.75*s,z,6.3*s,3.2*s,4.8*s,wall);
  // Front/back wall boards and aged siding strips
  for(let i=0;i<10;i++){const yy=.45*s+i*.29*s;b.box(x,yy,z-2.42*s,6.25*s,.025*s,.035*s,i%2?[.42,.36,.27]:[.30,.28,.23]);}
  // roof two pitched planes and ridge cap
  const e=.03*s,top=3.5*s,peak=5.05*s;
  b.quad([x-3.55*s,top,z-2.85*s],[x,peak,z-2.85*s],[x,peak,z+2.85*s],[x-3.55*s,top,z+2.85*s],roof);
  b.quad([x,peak,z-2.85*s],[x+3.55*s,top,z-2.85*s],[x+3.55*s,top,z+2.85*s],[x,peak,z+2.85*s],[roof[0]*.82,roof[1]*.84,roof[2]*.85]);
  b.box(x,peak,z, .16*s,.14*s,5.9*s,[.15,.15,.14]);
  // roof sheet seams
  for(let side of [-1,1])for(let k=0;k<5;k++){const xx=x+side*(.65+k*.55)*s;b.beam([xx,top+.04*s,z-2.8*s],[x+(xx-x)*.02,peak+.03*s,z-2.8*s],.018*s,[.36,.31,.23],5,.018*s);}
  // windows, shutters, frames
  for(let wz of [-1,1]){const zz=z-2.47*s*wz;b.box(x-1.7*s,2.05*s,zz,.95*s,.86*s,.10*s,[.09,.13,.13]);b.box(x-1.7*s,2.05*s,zz-wz*.07*s,.13*s,1.02*s,.11*s,[.48,.40,.28]);b.box(x-1.7*s,2.05*s,zz-wz*.07*s,1.08*s,.12*s,.11*s,[.48,.40,.28]);b.box(x-2.24*s,2.05*s,zz-wz*.12*s,.22*s,.94*s,.08*s,[.28,.26,.20]);b.box(x-1.16*s,2.05*s,zz-wz*.12*s,.22*s,.94*s,.08*s,[.28,.26,.20]);}
  // entry door and porch
  b.box(x+.85*s,1.18*s,z-2.48*s,1.1*s,2.2*s,.15*s,[.19,.17,.13]);b.box(x+.85*s,1.18*s,z-2.57*s,.08*s,.1*s,.04*s,[.65,.51,.28]);
  // worn door frame, hinges, handle and lintel
  for(const hx of [.28,1.42])b.box(x+hx*s,1.18*s,z-2.59*s,.10*s,2.30*s,.10*s,[.46,.39,.27]);
  b.box(x+.85*s,2.30*s,z-2.60*s,1.30*s,.12*s,.10*s,[.45,.39,.27]);
  for(const hy of [.42,1.88])b.box(x+.38*s,hy*s,z-2.66*s,.055*s,.18*s,.035*s,[.13,.14,.12]);
  b.sphere(x+1.25*s,1.15*s,z-2.67*s,.045*s,.045*s,.035*s,[.66,.54,.30],6,8);
  b.box(x+.85*s,.13*s,z-3.15*s,1.6*s,.25*s,1.1*s,[.31,.29,.23]);
  for(let i=0;i<3;i++)b.beam([x+1.4*s+i*.45*s,2.75*s,z-2.4*s],[x+1.4*s+i*.45*s,3.45*s,z-2.4*s],.035*s,[.26,.23,.18]);
  for(const sx of [-1,1]){b.box(x+sx*3.05*s,1.68*s,z-2.49*s,.17*s,3.24*s,.15*s,[.25,.23,.19]);b.box(x+sx*3.05*s,.28*s,z-2.52*s,.34*s,.30*s,.20*s,[.21,.20,.17]);}
  // exterior meter, cable, faded patch and rain downpipe
  b.box(x-2.66*s,1.34*s,z-2.58*s,.48*s,.62*s,.13*s,[.18,.20,.17]);b.box(x-2.66*s,1.34*s,z-2.67*s,.32*s,.32*s,.035*s,[.12,.16,.15]);
  b.beam([x-2.66*s,1.65*s,z-2.67*s],[x-2.25*s,2.25*s,z-2.55*s],.025*s,[.08,.09,.08],5,.018*s);
  b.box(x+2.05*s,2.35*s,z-2.50*s,.62*s,.26*s,.035*s,[.26,.29,.25]);
  b.box(x-2.1*s,4.1*s,z+1.1*s,.55*s,1.35*s,.55*s,[.29,.27,.22]);b.box(x-2.1*s,4.82*s,z+1.1*s,.7*s,.12*s,.7*s,[.19,.18,.16]);
  b.box(x+3.18*s,.8*s,z+.7*s,.12*s,1.55*s,.75*s,[.29,.22,.15],-.22);
  b.beam([x-2.95*s,3.4*s,z-2.34*s],[x-2.95*s,.2*s,z-2.45*s],.055*s,[.24,.25,.22],7,.045*s);
  b.beam([x-2.95*s,.2*s,z-2.45*s],[x-2.45*s,.12*s,z-2.45*s],.05*s,[.24,.25,.22],7,.05*s);
}
function addShed(b,x,z,s=1){
  b.box(x,.18*s,z,5.2*s,.36*s,4.4*s,[.20,.20,.17]);b.box(x,1.5*s,z,4.9*s,2.65*s,4.1*s,[.30,.29,.23]);
  b.quad([x-2.8*s,2.8*s,z-2.4*s],[x,3.65*s,z-2.4*s],[x,3.65*s,z+2.4*s],[x-2.8*s,2.8*s,z+2.4*s],[.21,.22,.20]);
  b.quad([x,3.65*s,z-2.4*s],[x+2.8*s,2.8*s,z-2.4*s],[x+2.8*s,2.8*s,z+2.4*s],[x,3.65*s,z+2.4*s],[.17,.18,.17]);
  b.box(x,1.25*s,z-2.08*s,1.55*s,2.1*s,.12*s,[.12,.15,.14]);
}
function addWarehouse(b,x,z,s=1){
  b.box(x,.28,z,13*s,.55*s,9*s,[.22,.23,.21]);
  b.box(x,3.5*s,z,12*s,6.4*s,8*s,[.33,.34,.31]);
  // metal roof with long ribs
  b.box(x,6.8*s,z,13*s,.22*s,8.8*s,[.19,.22,.20]);
  for(let i=-6;i<=6;i++)b.box(x+i*s,6.95*s,z,.045*s,.05*s,8.6*s,[.38,.39,.34]);
  // corrugated wall ribs, loading bays and recessed roll-up doors
  for(let side of [-1,1])for(let i=-5;i<=5;i++)b.box(x+i*s,3.45*s,z+side*4.06*s,.055*s,5.7*s,.07*s,[.42,.43,.37]);
  for(let i of [-3.5,0,3.5]){b.box(x+i*s,2.1*s,z-4.08*s,2.7*s,3.9*s,.12*s,[.15,.18,.17]);for(let k=0;k<7;k++)b.box(x+i*s,0.50*s+k*.49*s,z-4.16*s,2.45*s,.045*s,.045*s,k%2?[.35,.34,.29]:[.42,.39,.32]);for(let px of [-1.23,1.23])b.box(x+i*s+px*s,2.05*s,z-4.19*s,.09*s,4.0*s,.10*s,[.38,.36,.30]);}
  for(let xw of [-5,5])for(let y of [4.6,5.4])b.box(x+xw*s,y*s,z-4.1*s,1.25*s,.42*s,.08*s,[.08,.13,.14]);
  b.beam([x-6.2*s,6.65*s,z-4.2*s],[x+6.2*s,6.65*s,z-4.2*s],.07*s,[.31,.31,.27],8,.07*s);
  b.box(x+5.2*s,1.22*s,z-4.16*s,1.15*s,2.25*s,.12*s,[.17,.19,.17]);
  for(let xx of [-5.3,5.3]){b.box(x+xx*s,5.75*s,z-4.18*s,.28*s,.16*s,.06*s,[.62,.42,.16]);b.box(x+xx*s,5.45*s,z-4.18*s,.28*s,.14*s,.06*s,[.40,.20,.12]);}
}
function addWatchTower(b,x,z){
  for(let dx of [-1.25,1.25])for(let dz of [-1.25,1.25])b.beam([x+dx,.1,z+dz],[x+dx*.62,5.1,z+dz*.62],.12,[.27,.24,.18],7,.09);
  b.box(x,4.55,z,3.3,.35,3.3,[.27,.27,.23]);b.box(x,5.55,z,3.0,1.8,3.0,[.27,.29,.26]);
  b.box(x,6.53,z,3.7,.22,3.7,[.17,.19,.18]);
  for(let d of [-1,1]){b.box(x+d*1.47,5.55,z,.07,1.45,.07,[.10,.14,.14]);b.box(x,5.55,z+d*1.47,3.0,1.45,.07,[.10,.14,.14]);}
  b.beam([x-2,.1,z],[x+2,.1,z],.05,[.45,.38,.27]);
}
function addCar(b,x,z,yaw=0,broken=false){
  const body=broken?[.29,.23,.17]:[.26,.31,.28];
  b.box(x,.76,z,4.5,1.05,2.1,body,yaw);b.box(x-.25,1.48,z+.05,2.35,.72,1.84,[.18,.23,.23],yaw);
  // windows
  b.box(x-.25,1.5,z-.89,2.05,.52,.035,[.08,.14,.16],yaw);b.box(x-.25,1.5,z+.89,2.05,.52,.035,[.08,.14,.16],yaw);
  b.box(x-1.34,1.48,z,.04,.54,1.65,[.12,.15,.15],yaw);b.box(x+.84,1.48,z,.04,.54,1.65,[.12,.15,.15],yaw);
  for(let xx of [-1.48,1.48])for(let zz of [-1,1]){const wx=x+xx*Math.cos(yaw)+zz*Math.sin(yaw),wz=z-xx*Math.sin(yaw)+zz*Math.cos(yaw);b.cylinder(wx,.42,wz,.47,.22,[.07,.075,.07],14,.47);b.cylinder(wx,.42,wz,.18,.23,[.33,.31,.26],12,.18);}
  b.box(x-2.26,.85,z-.62,.12,.28,.18,[.72,.65,.42],yaw);b.box(x-2.26,.85,z+.62,.12,.28,.18,[.72,.65,.42],yaw);
  // bumpers, grille, mirrors, door seams, wipers and faded plate
  b.box(x-2.28,.55,z,.18,.16,1.92,[.16,.17,.15],yaw);b.box(x+2.27,.55,z,.16,.14,1.92,[.17,.17,.15],yaw);
  for(let i=-3;i<=3;i++)b.box(x-2.31,.79,z+i*.18,.035,.34,.09,[.075,.085,.08],yaw);
  b.box(x-.28,1.73,z-.91,.60,.035,.025,[.12,.14,.13],yaw);b.box(x-.28,1.73,z+.91,.60,.035,.025,[.12,.14,.13],yaw);
  for(let side of [-1,1]){b.beam([x+side*1.02,1.56,z-side*.85],[x+side*1.25,1.73,z-side*1.14],.045,[.20,.21,.19],7,.035);b.box(x+side*1.26,1.72,z-side*1.15,.22,.12,.20,[.14,.16,.15],yaw);}
  b.box(x-2.34,.52,z,.16,.14,.55,[.36,.34,.27],yaw);
  if(broken){b.box(x+.2,1.98,z+.08,1.2,.04,1.5,[.11,.12,.11],yaw);b.sphere(x-.5,1.25,z,.35,.18,.34,[.16,.14,.12]);b.box(x-1.8,1.3,z+.55,.35,.06,.12,[.29,.25,.18],yaw);}
}
function addTire(b,x,z,yaw=0){b.cylinder(x,.08,z,.54,.28,[.07,.075,.07],16,.54);b.cylinder(x,.08,z,.25,.3,[.32,.31,.27],12,.25);}
function addUtilityTruck(b,x,z,variant='military'){
  const paint=variant==='military'?[.20,.25,.18]:[.28,.27,.21],dark=[.075,.082,.074],metal=[.28,.29,.25];
  // Long ladder frame, engine bay and separate cab / cargo bed.
  b.box(x,.58,z,6.9,.34,2.15,[.095,.105,.095]);
  b.box(x-2.35,1.02,z,1.75,.68,2.42,paint);
  b.box(x-1.55,1.58,z,2.18,1.30,2.42,paint);
  b.box(x-1.58,1.69,z-1.235,1.48,.76,.045,[.075,.12,.13]);
  b.box(x-1.58,1.69,z+1.235,1.48,.76,.045,[.075,.12,.13]);
  b.box(x-1.58,1.70,z,2.02,.76,.045,[.075,.12,.13]);
  b.box(x-2.72,.77,z,1.28,.22,2.50,[.14,.16,.14]);
  // Cargo platform, side boards, hinges and tied-down stores.
  b.box(x+1.30,1.02,z,3.65,.52,2.38,paint);
  for(const side of [-1,1]){
    b.box(x+1.30,1.60,z+side*1.18,3.75,.62,.10,[.17,.20,.16]);
    for(let i=0;i<5;i++){const xx=x-.34+i*.78;b.box(xx,1.62,z+side*1.25,.045,.55,.055,metal);}
    b.beam([x-.54,1.91,z+side*1.15],[x+3.05,1.91,z+side*1.15],.025,[.39,.36,.28],6,.025);
  }
  for(let i=0;i<3;i++){b.box(x+.35+i*.83,1.42,z,.72,.58,1.10,[.27+i*.012,.25+i*.01,.19]);b.beam([x+.12+i*.83,1.72,z-.53],[x+.55+i*.83,1.72,z+.53],.028,[.44,.38,.26],6,.028);}
  // Front bumper, grille, lamps, mirrors and exhaust stack.
  b.box(x-3.30,.66,z, .20,.25,2.70,metal);
  for(let i=-4;i<=4;i++)b.box(x-3.37,1.0,z+i*.16,.035,.28,.07,dark);
  for(const side of [-1,1]){b.sphere(x-3.36,1.12,z+side*.92,.14,.14,.14,[.72,.62,.39],8,10);b.beam([x-1.85,2.08,z+side*1.18],[x-2.0,2.26,z+side*1.53],.055,metal,7,.045);b.box(x-2.0,2.26,z+side*1.53,.20,.12,.16,dark);}
  b.cylinder(x-.92,1.18,z+1.02,.075,.70,dark,10,.06);
  // Six rubber wheels with metal hubs and raised lugs.
  for(const wx of [x-2.10,x+.55,x+2.30])for(const side of [-1,1]){
    const wz=z+side*1.30;b.beam([wx,.48,wz-.19],[wx,.48,wz+.19],.48,dark,16,.48);b.beam([wx,.48,wz-side*.205],[wx,.48,wz-side*.235],.22,metal,12,.22);
    for(let k=0;k<8;k++){const a=k*Math.PI/4;b.box(wx+Math.cos(a)*.39,.48+Math.sin(a)*.39,wz+side*.20,.085,.055,.055,dark);}
  }
  // Weathered door seams, steps and a faded unit marking.
  b.beam([x-2.30,.78,z-1.25],[x-.78,.78,z-1.25],.018,[.45,.40,.29],5,.018);
  b.box(x-1.72,.79,z-1.34,.60,.09,.18,metal);
  b.box(x-1.20,1.12,z-1.266,.055,.20,.025,[.55,.47,.31]);
  b.box(x-1.58,1.70,z-1.263,.52,.22,.018,[.28,.34,.23]);
}
function addSandbags(b,x,z,rows=2){for(let r=0;r<rows;r++)for(let i=0;i<5-r%2;i++)b.sphere(x+(i-(4-r%2)/2)*.77,.28+r*.40,z+(r%2)*.35,.47,.28,.32,[.47,.43,.32],6,9);}
function addTent(b,x,z){
  b.quad([x-2,.15,z-1.6],[x,2.6,z-1.6],[x,2.6,z+1.6],[x-2,.15,z+1.6],[.35,.33,.23]);
  b.quad([x,2.6,z-1.6],[x+2,.15,z-1.6],[x+2,.15,z+1.6],[x,2.6,z+1.6],[.28,.31,.22]);
  b.box(x,.16,z,4,.18,3.4,[.16,.19,.14]);
}
function addCampfire(b,x,z){b.sphere(x,.16,z,.75,.16,.7,[.16,.14,.11],6,12);for(let i=0;i<4;i++){const a=i*Math.PI/2;b.beam([x+Math.cos(a)*.52,.18,z+Math.sin(a)*.52],[x-Math.cos(a)*.42,.21,z-Math.sin(a)*.42],.09,[.29,.22,.15]);}b.cone(x,.28,z,.25,.8,[.92,.33,.08],8);b.cone(x,.3,z,.12,.55,[1,.66,.16],8);}
function addGrass(b,x,z,s=1){
  for(let i=0;i<3;i++){const a=i*2.1;b.beam([x,.05,z],[x+Math.cos(a)*.17*s,.42*s,z+Math.sin(a)*.17*s],.025*s,[.30,.34,.20],4,.008*s);}
}
function addCrates(b,x,z,count=3){for(let i=0;i<count;i++){const xx=x+(i%2)*.92,zz=z+Math.floor(i/2)*.85;b.box(xx,.42,zz,.82,.84,.82,[.34,.28,.19]);for(let k=0;k<4;k++)b.box(xx-.38+k*.25,.42,zz-.42,.035,.8,.04,[.45,.36,.23]);b.box(xx,.87,zz,.86,.07,.86,[.25,.23,.17]);}}
function addLocationSet(b,locId,rng){
  const treeLine=()=>{for(let i=0;i<30;i++){const side=i%2?1:-1,z=-35+i*2.35;addTree(b,side*(25+rng()*8),z,.62+rng()*.48,rng);}for(let i=0;i<18;i++){const side=i%2?1:-1,z=-31+i*3.5;addTree(b,side*(32+rng()*5),z,.52+rng()*.38,rng);}}
  treeLine();
  // scattered shrubs, stones, weeds and scrub create scale and break up repeated geometry
  for(let i=0;i<96;i++){const x=(rng()-.5)*68,z=(rng()-.5)*68;if(Math.abs(x)<8&&Math.abs(z)<8)continue;if(i%3===0)addRock(b,x,z,.4+rng()*.85,rng);else if(i%2===0)addBush(b,x,z,.45+rng()*.85,rng);else addGrass(b,x,z,.7+rng()*.8);}
  if(locId==='rookie-village'){
    addRoad(b,[[-32,14],[-15,8],[0,5],[18,8],[34,4]],5.6);
    addHouse(b,-14,-7,1.05,0);addHouse(b,11,-13,.82,1);addShed(b,0,15,.9);addShed(b,22,16,.75);
    addFence(b,-25,-18,-7,-18,8);addFence(b,5,21,25,21,7);addFence(b,-22,19,-22,-6,6);
    addCampfire(b,-1,2);addWatchTower(b,28,-19);addCar(b,18,5,-.3,true);addCrates(b,-18,9,4);addBarrel(b,5,-3,1);addBarrel(b,6,-4,0);addUtilityPole(b,-29,-23,7.2);addUtilityPole(b,24,-27,6.8);for(let dz of [-.45,0,.45])addCable(b,[-29,7.0,-23+dz],[24,6.6,-27+dz],1.35);addPuddle(b,-8,12,.9);addRubble(b,-20,-10,hash(locId));
  } else if(locId==='sidorovich-bunker'){
    addWarehouse(b,0,0,.65);addCrates(b,-9,7,6);addBarrel(b,7,6,1);addBarrel(b,9,7,0);for(let x=-18;x<19;x+=3)addBoxWall(b,x,-14,2.5);
  } else if(['north-checkpoint','south-checkpoint','bridge-checkpoint'].includes(locId)){
    addRoad(b,[[-36,0],[-16,0],[0,2],[19,0],[36,-3]],6.5);addWatchTower(b,-16,-9);addWatchTower(b,18,-9);
    addShed(b,-2,-13,.95);addSandbags(b,-10,2,3);addSandbags(b,10,-2,2);addFence(b,-30,13,30,13,16);addCar(b,6,7,.3,true);addCrates(b,-21,-4,4);addBarrel(b,20,8,1);
    addBoxWall(b,-28,-21,2.0);addBoxWall(b,28,-21,2.0);addUtilityTruck(b,18,8,'military');addUtilityPole(b,-33,-10,6.6);addCable(b,[-33,6.3,-10],[29,6.1,-10],1.5);addPuddle(b,15,10,1.1);addRubble(b,-22,5,hash(locId));
  } else if(locId==='farmstead'||locId==='pig-farm'){
    addRoad(b,[[-34,17],[-18,8],[0,3],[18,-4],[34,-12]],5.4);addHouse(b,-13,-8,1.12,1);addShed(b,12,-11,1.08);addShed(b,12,8,.74);
    addFence(b,3,17,25,17,10);addFence(b,3,17,3,-2,8);addFence(b,25,17,25,-2,8);
    for(let i=0;i<10;i++)b.beam([-24+i*1.1,.12,8],[-23.6+i*1.1,.2,7.2],.06,[.39,.34,.24]);
    addCar(b,-4,15,.2,true);addBarrel(b,20,-1,1);addCrates(b,-21,-2,4);for(let i=0;i<8;i++)addBush(b,15+(rng()-.5)*12,19+(rng()-.5)*12,.65,rng);
  } else if(locId==='atp'){
    addRoad(b,[[-35,15],[-16,8],[0,4],[18,6],[35,8]],6.2);addWarehouse(b,-9,-12,1.02);addWarehouse(b,15,-8,.72);addWatchTower(b,-23,-18);
    addCar(b,-19,10,.3,true);addCar(b,1,11,-.5,true);addCar(b,19,16,.1,true);addUtilityTruck(b,-26,16,'civil');addTire(b,8,1);addTire(b,10,1);addBarrel(b,-24,3,1);addBarrel(b,-22,4,1);addCrates(b,20,-18,7);addFence(b,-33,20,32,20,18);addUtilityPole(b,-31,-25,7.4);addRubble(b,8,-16,hash(locId));addPuddle(b,-2,17,1.4);
  } else if(locId==='forest-camp'||locId==='anomaly-dump'){
    addRoad(b,[[-32,23],[-12,13],[0,1],[14,-9],[32,-20]],3.8);for(let i=0;i<22;i++)addTree(b,(rng()-.5)*48,(rng()-.5)*48,.8+rng()*.7,rng);
    addTent(b,-5,3);addTent(b,7,6);addCampfire(b,1,0);addCrates(b,-12,8,3);addBarrel(b,11,-1,1);
    if(locId==='anomaly-dump'){for(let i=0;i<3;i++)addRock(b,-1+i*2,.15,0.8,rng);}
  } else if(locId==='elevator'){
    addRoad(b,[[-34,19],[-14,12],[0,8],[17,5],[35,2]],5.5);addWarehouse(b,0,-9,1.65);addWarehouse(b,-22,5,.72);addCrates(b,20,5,6);addBarrel(b,-20,-9,1);addCar(b,24,15,.3,true);
  } else if(locId==='locomotive'||locId==='rail-tunnel'||locId==='underpass'||locId==='under-embankment'){
    addRoad(b,[[-34,16],[-12,5],[0,0],[15,-4],[35,-9]],5.2);addWarehouse(b,0,-18,.52);addCar(b,-8,2,.35,true);addCar(b,4,1,.35,true);addCrates(b,-18,-3,4);addBarrel(b,17,6,1);
    if(locId==='locomotive'){for(let x=-19;x<=19;x+=3)b.beam([x,.08,-14],[x,.08,10],.08,[.12,.13,.12]);for(let z=-14;z<=10;z+=4)b.box(0,.16,z,40,.12,.13,[.30,.27,.22]);}
  } else {
    addRoad(b,[[-35,14],[-16,8],[0,0],[18,-5],[35,-12]],5);addHouse(b,-12,-8,.9,1);addShed(b,13,7,.75);addCar(b,3,14,.6,true);addCrates(b,-22,-4,4);
  }
}
function addBoxWall(b,x,z,h=2.5){b.box(x,h/2,z,3.1,h,.9,[.37,.37,.32]);b.box(x,h+.08,z,3.2,.14,1,[.22,.23,.21]);}

function addHeldWeapon(b,weaponId='aksu',faction='loner'){
  const metal=[.12,.14,.13],dark=[.065,.075,.07],wood=faction==='military'?[.22,.25,.18]:[.25,.19,.13],gun=[.58,1.14,-.46];
  if(weaponId==='knife'){
    b.box(gun[0],gun[1]-.02,gun[2]+.05,.13,.11,.30,dark);
    b.beam([gun[0],gun[1],gun[2]-.06],[gun[0],gun[1]+.035,gun[2]-.62],.075,[.48,.49,.43],5,.008);
    b.box(gun[0],gun[1]+.08,gun[2]+.17,.16,.035,.035,[.39,.34,.24]);return;
  }
  if(weaponId==='pm'){
    b.box(gun[0],gun[1]+.05,gun[2]-.11,.17,.14,.50,metal);
    b.beam([gun[0],gun[1]+.06,gun[2]-.34],[gun[0],gun[1]+.06,gun[2]-.78],.045,dark,8,.035);
    b.box(gun[0],gun[1]-.12,gun[2]+.13,.13,.32,.19,[.10,.12,.11]);
    b.beam([gun[0]-.13,gun[1]-.01,gun[2]+.02],[gun[0]+.13,gun[1]-.01,gun[2]+.02],.018,dark,6,.018);
    b.box(gun[0],gun[1]+.14,gun[2]-.07,.12,.045,.13,[.31,.32,.28]);return;
  }
  const shotgun=['sawedoff','vm17'].includes(weaponId),smg=weaponId==='gaduka';
  const length=shotgun?.86:smg?.70:.78;
  // receiver, upper rail and handguard
  b.box(gun[0],gun[1],gun[2],.20,.20,.55,metal);
  b.box(gun[0],gun[1]+.13,gun[2]-.02,.14,.055,.58,[.19,.20,.18]);
  b.box(gun[0],gun[1]-.005,gun[2]-.42,.22,.16,.38,shotgun?wood:[.20,.21,.18]);
  // barrel, muzzle and front sight
  b.beam([gun[0],gun[1]+.035,gun[2]-.38],[gun[0],gun[1]+.035,gun[2]-length-0.28],.045,metal,9,.030);
  b.cylinder(gun[0],gun[1]+.035,gun[2]-length-.29,.045,.08,dark,10,.045);
  b.box(gun[0],gun[1]+.16,gun[2]-length-.20,.07,.12,.07,dark);
  // stock and cheek rest
  b.box(gun[0],gun[1]-.02,gun[2]+.36,.17,.17,.42,shotgun?wood:dark);
  b.box(gun[0],gun[1]+.10,gun[2]+.37,.18,.055,.28,wood);
  // pistol grip and trigger guard
  b.beam([gun[0],gun[1]-.08,gun[2]+.12],[gun[0],gun[1]-.34,gun[2]+.22],.075,dark,8,.055);
  b.beam([gun[0]-.10,gun[1]-.08,gun[2]+.06],[gun[0]+.10,gun[1]-.08,gun[2]+.06],.018,[.35,.35,.30],6,.018);
  // magazine / pump and small hardware
  if(shotgun){b.box(gun[0],gun[1]-.19,gun[2]-.23,.15,.25,.18,wood);b.box(gun[0],gun[1]-.15,gun[2]-.31,.18,.06,.12,[.28,.23,.17]);}
  else {b.box(gun[0],gun[1]-.24,gun[2]-.04,.15,.40,.18,dark);b.box(gun[0],gun[1]-.43,gun[2]-.01,.13,.07,.13,[.22,.23,.20]);}
  b.box(gun[0]-.10,gun[1]+.12,gun[2]-.09,.035,.035,.34,[.38,.36,.28]);
  b.box(gun[0]+.10,gun[1]+.12,gun[2]-.09,.035,.035,.34,[.38,.36,.28]);
  // sling visible below receiver
  b.beam([gun[0]-.12,gun[1]-.13,gun[2]+.32],[gun[0]+.12,gun[1]-.25,gun[2]-.40],.024,[.34,.29,.20],6,.024);
}

function itemModelClass(itemId){
  const item=ITEMS.find(entry=>entry.id===itemId);if(!item)return 'supply';
  if(item.weapon==='pistol'||item.weapon==='rifle'||item.weapon==='shotgun'||item.weapon==='smg'||item.weapon==='melee'||item.weapon==='grenade')return 'weapon';
  if(item.cat==='Броня'||item.cat==='Защита')return 'armor';
  if(item.cat==='Артефакты'||['gravi','medusa','stone-flower','meat_chunk'].includes(itemId))return 'artifact';
  if(item.cat==='Медицина')return 'medicine';
  if(item.cat==='Боеприпасы')return 'ammo';
  if(item.cat==='Еда')return 'food';
  return 'supply';
}
function addGasMask(b,itemId){
  const rubber=itemId==='mask-bandit-basic'?[.13,.14,.12]:[.19,.22,.20];
  const glass=[.08,.17,.19];
  b.sphere(0,.52,0,.42,.34,.23,rubber,10,14);
  for(const side of [-1,1]){
    b.cylinder(side*.17,.69,-.15,.115,.075,[.12,.13,.12],12,.115);
    b.sphere(side*.17,.73,-.19,.082,.082,.035,glass,9,12);
    b.beam([side*.16,.70,-.20],[side*.16,.76,-.20],.018,[.48,.49,.39],5,.018);
  }
  b.sphere(0,.39,-.20,.16,.14,.07,[.10,.12,.11],8,10);
  b.cylinder(0,.30,-.26,.105,.24,[.26,.29,.25],12,.085);
  b.cylinder(0,.18,-.26,.09,.055,[.10,.12,.11],12,.09);
  b.beam([-.37,.49,.08],[-.43,.72,.14],.045,[.30,.29,.23],7,.035);
  b.beam([.37,.49,.08],[.43,.72,.14],.045,[.30,.29,.23],7,.035);
  b.beam([-.43,.72,.14],[.43,.72,.14],.035,[.33,.31,.25],7,.025);
  if(itemId==='mask-military-basic'||itemId==='pa10')b.box(0,.88,.015,.24,.10,.06,[.36,.39,.29]);
}
function addDetector(b,itemId){
  const caseColor=itemId==='medved'?[.26,.32,.23]:[.22,.24,.20];
  b.box(0,.43,0,.54,.82,.20,caseColor);
  b.box(0,.68,-.115,.40,.27,.03,[.08,.15,.13]);
  b.box(0,.70,-.137,.29,.16,.018,[.25,.39,.30]);
  b.box(-.08,.68,-.151,.045,.02,.012,[.72,.63,.29]);
  b.cylinder(.15,.37,-.13,.055,.08,[.56,.48,.27],10,.05);
  b.sphere(-.15,.37,-.14,.045,.045,.02,[.58,.25,.12],6,8);
  b.beam([.16,.81,.02],[.23,1.06,.08],.025,[.34,.35,.29],7,.018);
  b.box(0,.12,.03,.35,.08,.25,[.12,.14,.12]);
  for(let i=-1;i<=1;i++)b.box(i*.11,.91,.03,.035,.10,.045,[.39,.38,.29]);
}
function buildItemModel(itemId,seed=1){
  const b=new MeshBuilder(),item=ITEMS.find(entry=>entry.id===itemId),kind=itemModelClass(itemId),r=seeded(seed),name=(item?.name||'').toLowerCase();
  const isMask=itemId.startsWith('mask-')||itemId.startsWith('pa')&&['pa8','pa10'].includes(itemId)||name.includes('противогаз');
  if(isMask){addGasMask(b,itemId);}
  else if(['otklik','medved','pripyat-dosimeter'].includes(itemId)||name.includes('детектор')||name.includes('счётчик')){addDetector(b,itemId);}
  else if(itemId==='rgd5'){
    b.sphere(0,.55,0,.27,.36,.27,[.31,.34,.26],10,14);b.cylinder(0,.86,0,.105,.12,[.22,.24,.19],10,.10);b.beam([0,.93,0],[.22,1.10,.12],.035,[.54,.51,.39],6,.03);b.box(.23,1.10,.12,.18,.035,.08,[.46,.42,.31]);
  }
  else if(itemId==='binoculars'){
    for(const side of [-1,1]){b.cylinder(side*.24,.50,0,.17,.59,[.12,.15,.15],12,.15);b.cylinder(side*.24,.50,-.30,.18,.08,[.075,.13,.15],12,.18);b.sphere(side*.24,.80,0,.17,.12,.17,[.21,.23,.20],8,10);b.cylinder(side*.24,.80,-.09,.10,.08,[.10,.19,.20],10,.10);}
    b.box(0,.53,-.01,.24,.18,.26,[.18,.20,.17]);b.beam([-.28,.34,.02],[.28,.34,.02],.055,[.12,.13,.12],7,.045);
  }
  else if(itemId==='boltpack'){
    for(let i=0;i<3;i++){const x=(i-1)*.17;b.beam([x,.12,-.12],[x+.02,.95,.22],.025,[.45,.46,.40],7,.022);b.cone(x+.02,.93,.22,.055,.14,[.52,.49,.39],7);b.cylinder(x,.16,-.10,.045,.09,[.22,.23,.20],8,.045);}
  }
  else if(itemId==='flash'){
    b.box(0,.27,0,.62,.17,.30,[.13,.15,.14]);b.box(0,.36,-.08,.40,.035,.18,[.39,.39,.34]);b.box(0,.30,-.19,.12,.04,.05,[.55,.53,.43]);b.box(0,.19,.16,.25,.04,.12,[.10,.11,.10]);
  }
  else if(itemId==='wrapped-present'){
    b.box(0,.42,0,.88,.72,.78,[.43,.37,.25]);b.box(0,.79,0,.94,.12,.83,[.50,.43,.29]);b.box(0,.82,-.405,.14,.80,.035,[.65,.16,.12]);b.box(0,.82,.405,.14,.80,.035,[.65,.16,.12]);b.box(0,.83,0,.94,.12,.13,[.67,.18,.13]);
    b.beam([-.20,1.0,-.05],[0,1.22,-.05],.035,[.69,.53,.31],7,.025);b.beam([.20,1.0,-.05],[0,1.22,-.05],.035,[.69,.53,.31],7,.025);b.sphere(0,1.21,-.05,.10,.06,.08,[.70,.57,.36],7,8);
  }
  else if(itemId==='supply-bundle'){
    b.box(0,.36,0,.95,.56,.72,[.32,.29,.20]);b.box(0,.69,0,1.0,.12,.78,[.39,.34,.24]);b.beam([-.34,.72,-.36],[-.20,1.0,.28],.045,[.38,.31,.20],6,.035);b.beam([.34,.72,-.36],[.20,1.0,.28],.045,[.38,.31,.20],6,.035);b.box(0,.93,-.08,.40,.18,.26,[.30,.29,.22]);
  }
  else if(itemId==='tail'){
    const points=[[0,.10,.45],[.10,.34,.18],[.18,.58,-.08],[.12,.78,-.36],[.28,.95,-.62]];for(let i=0;i<points.length-1;i++)b.beam(points[i],points[i+1],.16-i*.025,[.37,.29,.22],8,.13-i*.02);b.sphere(.28,.95,-.62,.15,.12,.16,[.28,.22,.17],7,9);
  }
  else if(itemId==='flesh-eye'){
    b.sphere(0,.50,0,.34,.30,.28,[.39,.29,.21],10,14);b.sphere(0,.53,-.23,.18,.18,.08,[.67,.56,.39],10,12);b.sphere(0,.53,-.30,.09,.10,.045,[.10,.13,.12],9,10);b.sphere(.02,.55,-.34,.035,.04,.022,[.64,.43,.18],7,8);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;b.beam([Math.cos(a)*.22,.45,Math.sin(a)*.16],[Math.cos(a)*.36,.60,Math.sin(a)*.28],.025,[.36,.27,.20],6,.012);}
  }
  else if(kind==='weapon')addHeldWeapon(b,itemId,'loner');
  else if(kind==='armor'){
    if(itemId==='stalnoishlem'){
      b.sphere(0,.68,0,.50,.42,.46,[.24,.27,.23],11,14);b.box(0,.48,-.40,.72,.16,.10,[.13,.15,.14]);b.box(0,.39,-.39,.40,.12,.07,[.20,.22,.18]);b.box(0,.86,.0,.58,.08,.30,[.38,.37,.29]);b.box(-.53,.58,0,.06,.26,.24,[.18,.19,.17]);b.box(.53,.58,0,.06,.26,.24,[.18,.19,.17]);
    }else{
      b.sphere(0,.70,0,.55,.58,.30,[.23,.25,.20],8,12);b.box(0,.78,-.21,.92,.75,.18,[.28,.30,.23]);
      b.cylinder(0,.40,-.28,.31,.40,[.18,.20,.17],10,.25);
      for(const side of [-1,1]){b.beam([side*.25,1.0,-.24],[side*.40,.26,-.12],.11,[.18,.20,.17],7,.08);b.box(side*.36,.68,-.31,.24,.34,.14,[.34,.32,.25]);b.box(side*.37,.70,-.39,.16,.20,.05,[.43,.38,.28]);}
      for(let i=-1;i<=1;i++)b.box(i*.25,.76,-.34,.18,.22,.08,[.31,.31,.24]);b.box(0,.28,0,.78,.12,.50,[.15,.17,.15]);b.box(0,1.18,.31,.58,.60,.34,[.27,.28,.22]);
    }
  }
  else if(kind==='artifact'){
    const hue=seed%3===0?[.34,.62,.52]:seed%3===1?[.65,.48,.23]:[.46,.54,.69];
    if(itemId==='medusa'){
      b.sphere(0,.47,0,.33,.16,.29,hue,10,14);b.sphere(0,.48,0,.21,.10,.18,[.12,.15,.13],9,12);b.cone(0,.65,0,.14,.30,hue,8);
    }else if(itemId==='stone-flower'){
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7;b.cone(Math.cos(a)*.12,.22,Math.sin(a)*.12,.15,.75,hue,6);b.sphere(Math.cos(a)*.12,.84,Math.sin(a)*.12,.09,.11,.09,[hue[0]*.75,hue[1]*.82,hue[2]*.9],7,8);}b.sphere(0,.35,0,.19,.18,.18,[.24,.27,.24],8,10);
    }else if(itemId==='meat_chunk'){
      b.sphere(0,.48,0,.37,.33,.34,[.38,.25,.20],9,13);for(let i=0;i<5;i++)b.sphere((r()-.5)*.42,.35+r()*.36,(r()-.5)*.40,.08,.10,.08,[.47,.30,.22],6,8);
    }else if(itemId==='gravi'){
      for(let i=0;i<5;i++){const a=i*1.26;b.cone(Math.cos(a)*.12,.22,Math.sin(a)*.12,.13,.92,hue,6);}
      b.sphere(0,.55,0,.24,.22,.24,[.24,.26,.24],8,10);
    }else{
      b.sphere(0,.48,0,.30,.33,.28,hue,8,10);b.cone(0,.60,0,.24,.85,hue,7);b.cone(-.18,.30,.08,.12,.52,[hue[0]*.7,hue[1]*.8,hue[2]],6);
    }
  }
  else if(kind==='medicine'){
    if(itemId==='bandage'){
      b.cylinder(0,.36,0,.22,.56,[.72,.66,.48],12,.22);b.cylinder(0,.37,0,.105,.57,[.38,.34,.25],10,.105);b.box(0,.66,-.15,.25,.11,.10,[.82,.76,.57]);
    }else if(itemId==='antirad'){
      b.cylinder(0,.09,0,.14,.55,[.64,.59,.37],12,.13);b.cylinder(0,.64,0,.10,.13,[.36,.39,.27],10,.10);b.box(0,.38,-.13,.17,.20,.035,[.20,.35,.23]);
    }else{
      b.box(0,.30,0,.74,.56,.55,itemId==='milmed'?[.26,.31,.24]:[.33,.35,.27]);b.box(0,.59,-.285,.34,.055,.025,[.64,.61,.46]);b.box(0,.31,-.30,.13,.39,.035,[.65,.19,.15]);b.box(0,.31,-.30,.36,.12,.035,[.65,.19,.15]);
    }
  }
  else if(kind==='ammo'){
    b.box(0,.25,0,.78,.44,.56,[.24,.27,.22]);b.box(0,.49,0,.81,.06,.59,[.36,.32,.22]);const count=itemId==='shells'?5:7;for(let i=0;i<count;i++){const x=(i-(count-1)/2)*.12;b.cylinder(x,.54,-.06,.04,.35,itemId==='shells'?[.56,.38,.17]:[.54,.42,.22],7,.027);b.sphere(x,.90,-.06,.04,.055,.04,[.67,.58,.40],6,7);}
  }
  else if(kind==='food'){
    if(itemId==='bread'){b.sphere(0,.26,0,.52,.24,.33,[.57,.37,.20],8,12);for(let i=0;i<3;i++)b.beam([-.22+i*.20,.46,-.12],[.24-i*.14,.42,.11],.018,[.74,.59,.34],5,.012);}
    else if(['water','energy','vodka'].includes(itemId)){b.cylinder(0,.08,0,itemId==='energy'?.22:.20,.72,itemId==='vodka'?[.56,.52,.30]:[.33,.51,.60],12,.18);b.cylinder(0,.80,0,.11,.10,[.19,.20,.18],10,.11);b.box(0,.46,-.18,.28,.24,.025,itemId==='energy'?[.62,.50,.18]:[.38,.51,.55]);}
    else if(itemId==='sausage'){b.beam([-.43,.37,0],[.43,.37,0],.17,[.55,.28,.18],12,.15);b.sphere(-.44,.37,0,.09,.13,.13,[.40,.24,.16],8,9);b.sphere(.44,.37,0,.09,.13,.13,[.40,.24,.16],8,9);}
    else {b.cylinder(0,.07,0,.32,.60,[.48,.39,.27],12,.32);b.cylinder(0,.68,0,.31,.06,[.65,.61,.48],12,.31);b.box(0,.39,-.30,.30,.28,.025,[.62,.52,.33]);}
  }
  else {b.box(0,.27,0,.62,.44,.48,[.32,.29,.21]);b.box(0,.51,0,.66,.05,.52,[.21,.22,.18]);}
  return b;
}

function buildHumanoid(faction='loner',kind='person',seed=1,weapon=true,gait=0){
  // Soft, layered human silhouettes. Large rectangular torso/limb blocks are
  // deliberately avoided; rounded fabric forms do most of the silhouette work.
  const b=new MeshBuilder(),r=seeded(seed);
  const palettes={
    loner:{jacket:[[.34,.29,.21],[.29,.30,.23],[.39,.33,.25],[.31,.28,.22]],pants:[.16,.19,.19],vest:[.25,.25,.20],trim:[.43,.36,.25],boot:[.085,.079,.066],hood:[.19,.19,.16]},
    bandit:{jacket:[[.075,.080,.075],[.105,.095,.078],[.13,.12,.10],[.085,.095,.09]],pants:[.18,.20,.22],vest:[.075,.08,.075],trim:[.29,.23,.17],boot:[.045,.049,.046],hood:[.055,.060,.055]},
    military:{jacket:[[.18,.23,.14],[.20,.25,.15],[.15,.20,.13],[.22,.25,.16]],pants:[.16,.20,.13],vest:[.13,.17,.12],trim:[.35,.34,.24],boot:[.065,.075,.061],hood:[.14,.18,.13]}
  };
  const base=palettes[faction]||palettes.loner;
  const outfit=base.jacket[Math.floor(r()*base.jacket.length)];
  const jitter=(r()-.5)*.025;
  const tone=c=>c.map(v=>clamp(v+jitter,.025,.8));
  const jacket=tone(outfit),pants=tone(base.pants),vest=tone(base.vest),trim=tone(base.trim),boot=tone(base.boot),hood=tone(base.hood);
  const skinOptions=[[.44,.31,.23],[.55,.40,.30],[.34,.25,.20],[.61,.46,.34],[.38,.30,.25],[.49,.37,.29]];
  const skin=skinOptions[Math.floor(r()*skinOptions.length)];
  const dark=[.065,.068,.061],glove=[.105,.112,.098],seam=[.48,.42,.32];
  const headCover=faction==='military'?(r()<.46?'mask':r()<.74?'balaclava':'face'):
    faction==='bandit'?(r()<.28?'mask':r()<.58?'balaclava':'face'):(r()<.14?'mask':r()<.30?'balaclava':'face');
  const variant=Math.floor(r()*4);

  // Boots, shaped trousers, knee pads and articulated calves.
  for(const side of [-1,1]){
    const step=gait*side*.18,hipX=side*.205,kneeX=side*.22+step*.22,ankleX=side*.22+step*.34;
    b.sphere(hipX,.79,0,.19,.26,.19,pants,11,14);
    b.beam([hipX,.78,0],[kneeX,.49,step*.12],.155,pants,11,.135);
    b.sphere(kneeX,.48,-.015+step*.12,.15,.15,.15,pants,10,12);
    b.sphere(kneeX,.48,-.12+step*.12,.135,.13,.075,faction==='military'?[.20,.24,.16]:[.19,.18,.15],9,12);
    b.beam([kneeX,.43,step*.12],[ankleX,.17,step*.28],.125,pants,10,.095);
    b.sphere(ankleX,.16,step*.28,.13,.13,.13,pants,9,11);
    b.sphere(ankleX,.13,-.105+step*.28,.205,.125,.31,boot,11,14);
    b.sphere(ankleX,.075,-.14+step*.28,.19,.045,.29,[.035,.038,.034],8,12);
    // A couple of low-profile folds and stitched pocket flaps.
    b.beam([side*.36,.35,.01+step*.28],[side*.34,.74,0],.010,trim,5,.009);
    b.sphere(side*.31,.68,-.155,.095,.13,.06,tone([.20,.21,.18]),8,10);
    b.beam([side*.25,.58,-.202],[side*.37,.58,-.202],.012,seam,5,.01);
  }

  // Pelvis and jacket: two overlapping ellipsoids give a natural waist-to-chest transition.
  b.sphere(0,1.00,.005,.34,.22,.235,pants,12,16);
  b.sphere(0,1.20,0,.345,.34,.23,jacket,13,18);
  b.sphere(0,1.48,.005,.39,.29,.255,jacket,13,18);
  b.sphere(0,1.64,.015,.33,.16,.22,jacket,12,16);
  b.sphere(0,1.04,-.015,.37,.095,.24,dark,10,14); // belt under the jacket hem
  b.box(0,1.035,-.251,.105,.075,.025,trim);

  // Neck, shoulders and arms. The elbows are visible, rounded joints rather than square blocks.
  b.cylinder(0,1.69,.005,.115,.20,skin,12,.13);
  for(const side of [-1,1]){
    const shoulder=[side*.37,1.57,.015],elbow=[side*.49,1.22,-.005+gait*side*.035],wrist=[side*.43,.94,-.115+gait*side*.055];
    b.sphere(shoulder[0],shoulder[1],shoulder[2],.205,.205,.205,jacket,11,14);
    b.beam([side*.36,1.57,.01],elbow,.145,jacket,11,.125);
    b.sphere(elbow[0],elbow[1],elbow[2],.128,.135,.13,jacket,10,13);
    b.sphere(elbow[0],elbow[1],elbow[2]-.105,.112,.115,.055,vest,9,11);
    b.beam(elbow,wrist,.112,jacket,10,.085);
    b.sphere(wrist[0],wrist[1],wrist[2],.095,.10,.095,glove,9,12);
    b.sphere(wrist[0],wrist[1]-.075,wrist[2]-.075,.095,.08,.105,glove,9,12);
    for(let finger=0;finger<4;finger++){
      const fx=wrist[0]+(finger-1.5)*.043;
      b.beam([fx,wrist[1]-.105,wrist[2]-.105],[fx+side*.006,wrist[1]-.16,wrist[2]-.18],.018,glove,6,.014);
    }
    b.beam([wrist[0]+side*.07,wrist[1]-.035,wrist[2]-.055],[wrist[0]+side*.13,wrist[1]-.10,wrist[2]-.13],.027,glove,7,.019);
    // Small shoulder and upper-arm details; no oversized slab-like armor.
    b.sphere(side*.49,1.56,-.13,.115,.13,.045,vest,8,11);
    b.box(side*.50,1.57,-.176,.09,.075,.018,faction==='bandit'?[.30,.12,.075]:faction==='military'?[.32,.36,.23]:[.28,.27,.21]);
  }

  // Stitched collar, front opening and restrained fabric seams.
  b.sphere(0,1.72,-.12,.20,.12,.14,trim,10,13);
  b.beam([-.25,1.63,-.205],[0,1.11,-.245],.022,seam,6,.018);
  b.beam([.25,1.63,-.205],[0,1.11,-.245],.022,seam,6,.018);
  b.beam([0,1.12,-.248],[0,1.53,-.264],.010,dark,5,.009);

  // Chest rig varies by faction but uses compact, rounded pouches and straps.
  if(faction==='military'){
    b.sphere(0,1.40,-.205,.30,.28,.095,vest,12,16);
    b.beam([-.27,1.64,-.25],[.26,1.13,-.27],.035,trim,7,.032);
    b.beam([.27,1.64,-.25],[-.26,1.13,-.27],.035,trim,7,.032);
    for(let i=0;i<4;i++){
      const x=-.24+i*.16;b.sphere(x,1.20,-.284,.065,.095,.052,tone([.21,.25,.17]),8,10);
      b.beam([x-.04,1.26,-.32],[x+.04,1.26,-.32],.008,seam,5,.008);
    }
    b.sphere(0,1.47,-.288,.17,.19,.055,tone([.19,.23,.16]),9,12);
  }else if(faction==='bandit'){
    b.beam([-.25,1.65,-.23],[.24,1.12,-.26],.026,trim,7,.024);
    b.beam([.25,1.65,-.23],[-.24,1.12,-.26],.026,dark,7,.024);
    for(const side of [-1,1]){
      b.sphere(side*.25,1.22,-.255,.09,.13,.07,dark,8,11);
      b.sphere(side*.25,1.22,-.30,.064,.09,.035,trim,8,10);
    }
  }else{
    b.beam([-.25,1.64,-.23],[.24,1.12,-.24],.028,trim,7,.026);
    b.beam([.25,1.64,-.23],[-.24,1.12,-.24],.028,trim,7,.026);
    b.sphere(-.25,1.23,-.25,.075,.105,.06,tone([.29,.26,.20]),8,10);
    b.sphere(.25,1.23,-.25,.075,.105,.06,tone([.29,.26,.20]),8,10);
  }

  // Distinct outer layers alter silhouette: long dark bandit coat, field jacket, or military rig.
  if(faction==='bandit'){
    const coat=tone(variant%2?[.09,.09,.08]:[.14,.12,.10]);
    b.sphere(-.16,.82,.025,.17,.34,.20,coat,10,13);
    b.sphere(.16,.82,.025,.17,.34,.20,coat,10,13);
    b.sphere(0,1.02,.10,.30,.22,.20,coat,10,13);
    // Hood sits behind the head and frames the face instead of covering it with a block.
    b.sphere(0,2.04,.105,.32,.37,.25,hood,11,14);
    b.beam([-.25,2.18,-.10],[-.23,1.83,-.13],.065,hood,8,.045);
    b.beam([.25,2.18,-.10],[.23,1.83,-.13],.065,hood,8,.045);
    b.sphere(0,1.80,-.16,.22,.085,.085,trim,9,12);
  }else if(faction==='military'){
    b.sphere(0,1.39,-.30,.32,.30,.075,vest,11,15);
    for(const side of [-1,1]){
      b.sphere(side*.30,1.35,-.30,.09,.15,.06,tone([.12,.16,.11]),8,10);
      b.sphere(side*.39,1.57,-.09,.10,.14,.10,tone([.22,.27,.17]),8,10);
    }
    b.sphere(0,.88,.26,.28,.28,.18,tone([.15,.19,.13]),10,13);
  }else{
    b.sphere(0,1.77,-.12,.21,.08,.12,trim,9,12); // worn scarf
    b.sphere(0,.88,.25,.26,.26,.18,tone([.25,.24,.19]),10,13);
  }

  // Pack is rounded and strapped to the back, keeping the human silhouette readable.
  b.sphere(0,1.31,.285,.265,.38,.17,tone(faction==='military'?[.15,.19,.13]:faction==='bandit'?[.075,.08,.07]:[.22,.22,.17]),11,14);
  b.beam([-.26,1.60,.18],[.26,1.60,.18],.022,trim,6,.02);
  b.beam([-.24,1.11,.20],[.24,1.11,.20],.022,trim,6,.02);
  for(const side of [-1,1])b.beam([side*.25,1.61,-.15],[side*.20,1.04,.27],.024,trim,6,.02);

  // Head and face: ears, brow, eyes, nose and mouth remain visible when headgear permits.
  b.sphere(0,2.02,-.005,.245,.31,.22,skin,14,18);
  b.sphere(0,1.91,-.055,.185,.17,.18,skin,11,14);
  for(const side of [-1,1]){
    b.sphere(side*.245,2.02,-.015,.065,.105,.07,skin,9,11);
    if(headCover==='face'){
      b.sphere(side*.092,2.075,-.195,.034,.026,.023,[.075,.080,.073],8,10);
      b.sphere(side*.092,2.077,-.214,.013,.014,.008,[.58,.50,.35],7,8);
      b.beam([side*.055,2.12,-.19],[side*.14,2.13,-.18],.018,[.20,.16,.13],6,.014);
    }
  }
  if(headCover==='face'){
    b.sphere(0,2.015,-.218,.038,.055,.035,skin,8,10);
    b.beam([-.065,1.93,-.215],[.065,1.93,-.215],.012,[.18,.12,.10],6,.01);
    b.sphere(0,1.875,-.185,.09,.036,.035,[.26,.18,.15],8,10);
  }else if(headCover==='balaclava'){
    b.sphere(0,1.97,-.17,.19,.20,.10,dark,11,14);
    b.sphere(0,2.08,-.19,.18,.045,.035,[.16,.17,.15],8,12);
    for(const side of [-1,1])b.sphere(side*.09,2.08,-.23,.03,.022,.015,[.13,.15,.13],7,8);
  }else{
    b.sphere(0,1.94,-.205,.16,.13,.065,[.16,.18,.16],10,12);
    b.sphere(0,1.94,-.265,.075,.085,.045,[.23,.26,.22],9,11);
    b.cylinder(0,1.85,-.29,.075,.09,[.26,.29,.25],10,.07);
  }

  // Headwear uses rounded caps/helmets with a small brim, not a cuboid lid.
  if(faction==='military'){
    b.sphere(0,2.27,.005,.285,.18,.255,tone([.16,.21,.14]),12,16);
    b.sphere(0,2.19,-.17,.24,.055,.10,tone([.12,.16,.11]),9,12);
    b.beam([-.27,2.22,-.02],[.27,2.22,-.02],.024,trim,7,.022);
    b.sphere(0,2.26,.18,.16,.09,.12,tone([.13,.17,.12]),8,10);
  }else if(faction==='bandit'){
    b.sphere(0,2.29,.035,.255,.105,.235,tone([.045,.05,.045]),11,14);
    b.beam([-.25,2.22,-.08],[.25,2.22,-.08],.025,tone([.17,.15,.12]),7,.023);
  }else{
    if(variant===0||r()>.42){
      b.sphere(0,2.28,.01,.255,.11,.235,tone([.18,.18,.15]),11,14);
      b.beam([-.25,2.23,-.08],[.25,2.23,-.08],.022,trim,7,.02);
    }else{
      b.sphere(0,2.16,.12,.28,.25,.23,hood,10,13);
      b.beam([-.25,2.18,-.08],[.25,2.18,-.08],.03,trim,7,.027);
    }
  }

  // Faction-specific camouflage patches: subtle, rounded fabric patches rather than flat plates.
  if(faction==='military'){
    const camo=[[.24,.28,.17],[.12,.17,.11],[.31,.32,.20],[.27,.24,.14]];
    for(let i=0;i<12;i++){
      const x=(r()-.5)*.46,y=1.20+r()*.50,z=-.245-r()*.018;
      b.sphere(x,y,z,.035+r()*.025,.045+r()*.035,.016,camo[i%4],7,9);
    }
    for(const side of [-1,1]){
      b.sphere(side*.48,1.44,-.12,.07,.10,.035,camo[Math.floor(r()*camo.length)],7,9);
      b.sphere(side*.22,.75,-.16,.055,.09,.025,camo[Math.floor(r()*camo.length)],7,9);
    }
  }

  // Small readable fabric details: cuffs, seam piping, pouch flaps and stitching.
  for(const side of [-1,1]){
    b.beam([side*.40,1.00,-.15],[side*.46,.98,-.16],.025,trim,6,.022);
    b.beam([side*.15,.92,-.20],[side*.27,.90,-.20],.010,seam,5,.008);
  }
  if(weapon)addHeldWeapon(b,typeof weapon==='string'?weapon:'aksu',faction);
  return b;
}
function buildFirstPersonView(faction='loner',weaponId='aksu'){
  const b=new MeshBuilder();
  const palette={loner:[.25,.29,.25],bandit:[.14,.15,.14],military:[.22,.28,.21]};
  const sleeve=palette[faction]||palette.loner,glove=[.105,.12,.10],metal=[.13,.15,.14],dark=[.055,.065,.06],wood=faction==='military'?[.20,.24,.18]:[.24,.18,.12];
  // Both forearms enter the frame from below; articulated cuffs and gloves remain visible.
  b.beam([-.72,-.82,-.24],[-.20,-.42,-.92],.155,sleeve,10,.12);
  b.beam([.72,-.80,-.20],[.42,-.39,-.82],.16,sleeve,10,.12);
  b.cylinder(-.20,-.45,-.88,.125,.13,glove,10,.12);
  b.cylinder(.42,-.42,-.78,.13,.13,glove,10,.12);
  b.sphere(-.16,-.39,-1.02,.14,.115,.16,glove,9,11);
  b.sphere(.39,-.36,-.91,.15,.12,.16,glove,9,11);
  for(let i=0;i<4;i++){
    const x=-.25+i*.055;b.beam([x,-.43,-1.10],[x+.02,-.51,-1.18],.025,glove,6,.019);
  }
  if(weaponId==='knife'){
    b.box(.27,-.39,-.70,.13,.12,.28,dark);
    b.beam([.27,-.35,-.82],[.27,-.30,-1.42],.07,[.49,.50,.43],7,.008);
  }else if(weaponId==='pm'){
    b.box(.26,-.31,-.83,.19,.15,.42,metal);b.box(.26,-.45,-.72,.14,.28,.18,dark);
    b.beam([.26,-.28,-1.02],[.26,-.28,-1.43],.04,dark,8,.03);b.box(.26,-.20,-.83,.12,.04,.11,[.32,.34,.29]);
  }else{
    const shotgun=['sawedoff','vm17'].includes(weaponId),length=shotgun?.86:1.0;
    b.box(.25,-.30,-.88,.24,.16,.57,metal);
    b.box(.25,-.19,-.89,.16,.045,.61,[.20,.22,.19]);
    b.box(.25,-.32,-.54,.22,.15,.34,shotgun?wood:[.20,.22,.19]);
    b.beam([.25,-.275,-1.12],[.25,-.275,-1.75],.042,metal,9,.029);
    b.cylinder(.25,-.275,-1.76,.04,.07,dark,10,.04);
    b.box(.25,-.49,-.83,.15,.31,.19,dark);
    b.box(.25,-.33,-.43,.19,.16,.40,shotgun?wood:dark);
    b.beam([.15,-.42,-.55],[.35,-.52,-1.05],.018,[.35,.31,.23],6,.018);
    b.box(.25,-.17,-.85,.07,.08,.08,dark);
    // Support hand wraps around the forward handguard.
    b.sphere(-.05,-.40,-1.04,.12,.095,.15,glove,9,10);
  }
  return b;
}

function buildMutant(kind='blind-dog',seed=1){
  const b=new MeshBuilder(),r=seeded(seed);
  if(kind==='flesh'||kind==='boar'){
    b.sphere(0,.82,0,.92,.66,1.35,[.35,.30,.22],11,16);b.sphere(0,.83,-1.02,.57,.48,.62,[.39,.32,.24],9,12);b.sphere(0,.64,-1.47,.42,.27,.43,[.28,.23,.18],8,12);
    for(let s of [-1,1]){b.cone(s*.42,.84,-1.48,.13,.38,[.74,.69,.51],10);b.sphere(s*.48,1.02,-1.17,.11,.11,.09,[.10,.07,.05],6,8);for(let z of [-.75,.72]){b.beam([s*.55,.65,z],[s*.63,.18,z-.1],.17,[.32,.27,.20],7,.13);b.sphere(s*.64,.16,z-.12,.19,.12,.25,[.19,.17,.13],6,8);}}
    b.beam([0,1.08,1.0],[.04,1.32,1.65],.10,[.31,.25,.19],6,.025);
  }else{
    b.sphere(0,.82,.05,.45,.42,.95,[.30,.28,.22],9,14);b.sphere(0,.80,-.82,.37,.34,.47,[.33,.30,.23],9,12);b.sphere(0,.62,-1.16,.28,.17,.30,[.18,.18,.16],8,10);
    for(let s of [-1,1]){b.sphere(s*.24,.89,-.86,.12,.21,.12,[.24,.21,.17],7,8);b.cone(s*.20,1.12,-.84,.12,.30,[.22,.18,.15],8);for(let z of [-.58,.63]){b.beam([s*.28,.68,z],[s*.32,.12,z-.1],.12,[.24,.22,.18],7,.10);b.sphere(s*.34,.12,z-.12,.15,.10,.20,[.10,.11,.10],6,8);}}
    b.beam([0,.92,.86],[.16,1.02,1.42],.09,[.25,.21,.16],7,.025);
  }
  return b;
}

function addExitLayout(builder,neighbors){
  const exits=[];const dirs=[[0,-34],[34,0],[0,34],[-34,0]];
  neighbors.forEach((id,index)=>{const base=dirs[index%4];const spread=Math.floor(index/4)*5;const x=base[0]+(base[0]===0?(index%2?1:-1)*spread:0),z=base[1]+(base[1]===0?(index%2?1:-1)*spread:0);
    exits.push({id,x,z});
    // worn concrete route marker and small lamps; intentionally no floating location labels
    builder.box(x,.08,z,2.2,.16,2.2,[.34,.34,.29]);builder.cylinder(x,.18,z,.12,.38,[.31,.40,.24],8,.10);
    builder.sphere(x,.56,z,.13,.13,.13,[.55,.66,.35],7,9);
    builder.box(x,.42,z,1.4,.05,.24,[.20,.21,.18]);
  });
  return exits;
}
export function createSceneLayout(locationId='rookie-village',neighbors=[]){
  const location=LOCATIONS.find(entry=>entry.id===locationId)||LOCATIONS.find(entry=>entry.id==='rookie-village');
  return {id:location.id,name:location.name,neighbors:[...neighbors],profile:['rookie-village','sidorovich-bunker'].includes(locationId)?'village':['north-checkpoint','south-checkpoint','bridge-checkpoint'].includes(locationId)?'checkpoint':['farmstead','pig-farm'].includes(locationId)?'farm':locationId==='atp'?'industrial':['forest-camp','anomaly-dump'].includes(locationId)?'forest':['elevator'].includes(locationId)?'industrial':'roadside'};
}

// Shared geometry export used by offline visual QA and screenshot generation.
export function buildPreviewGeometry(locationId='rookie-village'){
  const loc=LOCATIONS.find(entry=>entry.id===locationId)||LOCATIONS[0],rng=seeded(hash(loc.id));
  const world=new MeshBuilder();addGround(world,rng);addLocationSet(world,loc.id,rng);addExitLayout(world,loc.neighbors||[]);
  const sampleNpcs=[{id:'preview-loner',faction:'loner'},{id:'preview-bandit',faction:'bandit'},{id:'preview-military',faction:'military'}].map((npc,index)=>({id:npc.id,faction:npc.faction,pos:{x:-7+index*7,z:-6-(index%2)*3},mesh:buildHumanoid(npc.faction,'npc',hash(npc.id),false).toRaw()}));
  const player=buildHumanoid('loner','player',hash('preview-player'),false).toRaw();
  const firstPerson=buildFirstPersonView('loner','aksu').toRaw();
  const groundSamples=[[-28,-20],[-10,-10],[0,0],[18,12],[25,-18],[9,25]].map(([x,z])=>({x,z,height:sampleTerrainHeight(x,z)}));
  const loot=(loc.loot||[]).slice(0,4).map((id,index)=>({id,pos:{x:-6+index*4,z:5+index%2*1.6},mesh:buildItemModel(id,hash(id)).toRaw()}));
  return {layout:createSceneLayout(loc.id,loc.neighbors||[]),world:world.toRaw(),player,firstPerson,groundSamples,playerPosition:{x:-8,z:26,yaw:0},npcs:sampleNpcs,loot};
}

export function selectAimedTarget(entries,position,yaw,maxDistance=18.5,minAlignment=.86){
  const fx=Math.sin(yaw),fz=-Math.cos(yaw);let best=null,bestDistance=maxDistance;
  for(const entry of entries){const dx=entry.pos.x-position.x,dz=entry.pos.z-position.z,distance=Math.hypot(dx,dz);if(distance<.5||distance>bestDistance)continue;
    const alignment=(dx*fx+dz*fz)/distance;if(alignment<minAlignment)continue;best=entry;bestDistance=distance;}
  return best;
}

export function classifyItemModel(itemId){return itemModelClass(itemId);}
export function buildItemPreviewGeometry(itemId){
  const item=ITEMS.find(entry=>entry.id===itemId);
  if(!item)return null;
  return {id:item.id,name:item.name||item.title||item.id,kind:itemModelClass(itemId),mesh:buildItemModel(itemId,hash(itemId)).toRaw()};
}

function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader compile error');return shader;}
function program(gl){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VERTEX_SHADER));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,FRAGMENT_SHADER));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Shader link error');return p;}
function createAlbedoTexture(gl){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([220,220,220,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);const image=new Image();const state={texture,ready:false};image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);state.ready=true;};image.onerror=()=>{state.ready=false;};image.src=new URL('../../assets/textures/cordon-materials.png',import.meta.url).href;return state;}
const NPC_APPEARANCE_TILES={loner:[0,1,2,3,4,14,15],bandit:[5,6,7,8,9],military:[10,11,12,13]};
function npcAppearanceTile(npc){const faction=NPC_APPEARANCE_TILES[npc?.faction]?npc.faction:'loner';const variants=NPC_APPEARANCE_TILES[faction];return variants[hash(npc?.id||npc?.name||faction)%variants.length];}
export function npcFacingYaw(npcPos,playerPos){return Math.atan2(npcPos.x-playerPos.x,npcPos.z-playerPos.z);}
function createNpcAtlasTexture(gl){
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  const state={texture,ready:false};const image=new Image();
  image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);state.ready=true;};
  image.onerror=()=>{state.ready=false;};image.src=new URL('../../assets/textures/npc-appearance-atlas.png',import.meta.url).href;return state;
}
function buildNpcGroundShadow(){
  const shadow=new MeshBuilder();shadow.sphere(0,.015,0,.31,.014,.38,[.055,.061,.052],9,14);return shadow;
}
function buildNpcBillboard(gl,tileIndex){
  const col=tileIndex%4,row=Math.floor(tileIndex/4),pad=.006;
  const u0=col*.25+pad,u1=(col+1)*.25-pad;
  const v0=1-(row+1)*.25+pad,v1=1-row*.25-pad;
  const points=[
    [-.46,0,0,u0,v0],[.46,0,0,u1,v0],[.46,1.96,0,u1,v1],
    [-.46,0,0,u0,v0],[.46,1.96,0,u1,v1],[-.46,1.96,0,u0,v1]
  ];
  const data=new Float32Array(points.length*11);
  points.forEach((point,index)=>{const at=index*11;data[at]=point[0];data[at+1]=point[1];data[at+2]=point[2];data[at+3]=0;data[at+4]=0;data[at+5]=-1;data[at+6]=1;data[at+7]=1;data[at+8]=1;data[at+9]=point[3];data[at+10]=point[4];});
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {buffer,count:points.length};
}

function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,center,up=[0,1,0]){let zx=eye[0]-center[0],zy=eye[1]-center[1],zz=eye[2]-center[2],l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]);}
function modelMatrix(x,y,z,yaw=0,scale=1){const c=Math.cos(yaw)*scale,s=Math.sin(yaw)*scale;return new Float32Array([c,0,-s,0,0,scale,0,0,s,0,c,0,x,y,z,1]);}
function normalMatrix(model){return new Float32Array([model[0],model[1],model[2],model[4],model[5],model[6],model[8],model[9],model[10]]);}

let activeRenderer=null;
export function disposeStalker3D(){if(activeRenderer){activeRenderer.destroy();activeRenderer=null;}}

export function mountStalker3D(canvas,{game,npcs=[],onInteract=()=>{},onTravel=()=>{},onFire=()=>{},onPickup=()=>false,onNotify=()=>{},onCheckpoint=()=>{},reducedMotion=false,controlsMode='auto'}={}){
  disposeStalker3D();
  if(!canvas||!game) return null;
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false,depth:true,stencil:false,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');
  if(!gl){onNotify('WebGL не поддерживается этим браузером. Используется обычный фон локации.');return null;}
  canvas.parentElement?.classList.add('has-3d-world');
  let p;
  try{p=program(gl);}catch(error){canvas.parentElement?.classList.remove('has-3d-world');onNotify(`Не удалось запустить 3D: ${error.message}`);return null;}
  const attrib={pos:gl.getAttribLocation(p,'aPosition'),normal:gl.getAttribLocation(p,'aNormal'),color:gl.getAttribLocation(p,'aColor'),uv:gl.getAttribLocation(p,'aUv')};
  const uniforms={projection:gl.getUniformLocation(p,'uProjection'),view:gl.getUniformLocation(p,'uView'),model:gl.getUniformLocation(p,'uModel'),normal:gl.getUniformLocation(p,'uNormal'),sun:gl.getUniformLocation(p,'uSunDirection'),sunColor:gl.getUniformLocation(p,'uSunColor'),fog:gl.getUniformLocation(p,'uFogColor'),fogNear:gl.getUniformLocation(p,'uFogNear'),fogFar:gl.getUniformLocation(p,'uFogFar'),time:gl.getUniformLocation(p,'uTime'),albedo:gl.getUniformLocation(p,'uAlbedo'),characterAtlas:gl.getUniformLocation(p,'uCharacterAtlas'),textureReady:gl.getUniformLocation(p,'uTextureReady'),spritePass:gl.getUniformLocation(p,'uSpritePass')};
  const albedoTexture=createAlbedoTexture(gl),npcAtlas=createNpcAtlasTexture(gl);const npcShadowMesh=buildNpcGroundShadow().toMesh(gl);gl.useProgram(p);gl.uniform1i(uniforms.albedo,0);gl.uniform1i(uniforms.characterAtlas,1);
  const loc=LOCATIONS.find(entry=>entry.id===game.locationId)||LOCATIONS[0];const layout=createSceneLayout(loc.id,loc.neighbors||[]);const rng=seeded(hash(loc.id));
  const staticBuilder=new MeshBuilder();addGround(staticBuilder,rng);addLocationSet(staticBuilder,loc.id,rng);const exits=addExitLayout(staticBuilder,loc.neighbors||[]);const worldMesh=staticBuilder.toMesh(gl);
  const playerFaction=game.player?.faction||'loner';
  const equippedId=game.equippedWeaponId||game.equipmentSlots?.pistol||game.equipmentSlots?.primary1||game.equipmentSlots?.primary2||'aksu';
  const firstPersonMesh=buildFirstPersonView(playerFaction,equippedId).toMesh(gl);
  const npcMeshes=npcs.filter(n=>!n.captured||game.currentAreaId==='atp-first-floor-prisoners').map((npc,index)=>{
    const rr=seeded(hash(npc.id));const angle=(index*2.399+rr()*.5),radius=7+(index%4)*3.6;const pos={x:Math.cos(angle)*radius,z:Math.sin(angle)*radius-5};
    const faction=npc.faction||'loner';
    return {npc,pos,mesh:buildHumanoid(faction,'npc',hash(npc.id),false,0).toMesh(gl),spriteMesh:buildNpcBillboard(gl,npcAppearanceTile(npc)),yaw:npcFacingYaw(pos,{x:0,z:0}),phase:rr()*6.28};
  });
  const collected=game.player.worldLootCollected ||= {};
  const collectedHere=new Set(collected[loc.id]||[]);
  const lootMeshes=(loc.loot||[]).slice(0,7).map((id,index)=>({id,key:`${id}:${index}`,pos:{x:-7+(index%4)*4.6,z:5+Math.floor(index/4)*3.2},mesh:buildItemModel(id,hash(id)+index).toMesh(gl)})).filter(entry=>!collectedHere.has(entry.key));
  let enemyModel=null;
  if(game.activeEncounter){const e=game.activeEncounter;const isMutant=['blind-dog','flesh','boar'].includes(e.type);enemyModel={mesh:isMutant?buildMutant(e.type,hash(e.name)).toMesh(gl):buildHumanoid(e.faction||'bandit','enemy',hash(e.name),false,0).toMesh(gl),spriteMesh:isMutant?null:buildNpcBillboard(gl,npcAppearanceTile({id:e.npcId||e.name,faction:e.faction||'bandit'})),faction:e.faction||'bandit',type:e.type};}
  game.player.worldPositions ||= {};
  let pos=game.player.worldPositions[loc.id]||{x:loc.id==='rookie-village'?-8:0,z:26,yaw:0};
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.z))pos={x:loc.id==='rookie-village'?-8:0,z:26,yaw:0};
  // Migrate the previous central spawn, which could start inside the village obstacle.
  if(loc.id==='rookie-village'&&Math.abs(pos.x)<.01&&pos.z>23&&Math.abs(Number(pos.yaw)||0)<.01){pos={x:-8,z:26,yaw:0};game.player.worldPositions[loc.id]=pos;}
  let yaw=Number.isFinite(pos.yaw)?pos.yaw:0,pitch=.10;
  const combatNpcId=game.activeEncounter?.npcId||game.combatTargetNpcId||null;
  const enemyEntry=npcMeshes.find(entry=>entry.npc.id===combatNpcId)||null;
  let shotMesh=null,shotAt=Number(game.player.last3dShotAt)||0,recoilAt=0;
  const shotTargetId=game.player.last3dShotTargetId||combatNpcId;
  const shotTarget=npcMeshes.find(entry=>entry.npc.id===shotTargetId);
  if(shotTarget&&game.player.last3dShotLoc===loc.id&&shotAt>0){
    const fx=new MeshBuilder();
    const start=[pos.x+Math.sin(yaw)*.48,sampleTerrainHeight(pos.x,pos.z)+1.38,pos.z-Math.cos(yaw)*.48];
    const end=[shotTarget.pos.x,1.42,shotTarget.pos.z];
    fx.beam(start,end,.035,[.92,.58,.18],7,.006);fx.sphere(start[0],start[1],start[2],.11,.07,.11,[1,.72,.27],7,9);
    shotMesh=fx.toMesh(gl);
  }
  let width=0,height=0,dpr=1,raf=0,last=performance.now(),saveElapsed=0,fireCooldown=0;
  let keyState={},touchMove={x:0,y:0},lookPointer=null,isPointerLocked=false,mouseDown=false,destroyed=false;
  const obstacles=[];
  const addObstacle=(x,z,r)=>obstacles.push({x,z,r});
  if(layout.profile==='village'){[[-14,-7,4.4],[11,-13,3.8],[0,15,3.2],[22,16,2.8],[28,-19,2.4]].forEach(v=>addObstacle(...v));}
  else if(layout.profile==='industrial'){[[-9,-12,9],[15,-8,7],[-22,5,5]].forEach(v=>addObstacle(...v));}
  else if(layout.profile==='farm'){[[-13,-8,4.3],[12,-11,3.8],[12,8,3]].forEach(v=>addObstacle(...v));}
  else {[[-2,-13,4],[-16,-9,3.2],[17,12,3.5]].forEach(v=>addObstacle(...v));}
  const aimReticle=document.createElement('div');aimReticle.className='three-crosshair';aimReticle.setAttribute('aria-hidden','true');aimReticle.innerHTML='<i></i>';canvas.parentElement.appendChild(aimReticle);
  let resolvedControls=controlsMode;
  if(!['pc','mobile'].includes(resolvedControls)){let coarse=false;try{coarse=window.matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;}catch{}resolvedControls=coarse?'mobile':'pc';}
  const touch=document.createElement('div');touch.className=`three-touch-controls is-${resolvedControls}`;touch.innerHTML='<div class="three-joystick" aria-label="Движение"><i></i></div><div class="three-action-buttons"><button type="button" data-3d="interact">ДЕЙСТВИЕ</button><button type="button" data-3d="sprint">БЕГ</button><button type="button" data-3d="fire">ОГОНЬ</button></div><div class="three-help">WASD — движение · Shift — бег · мышь — обзор · E — действие · ЛКМ / F — огонь</div><div class="three-mobile-help">Левый стик — движение · правой частью экрана — обзор · удерживай БЕГ для ускорения</div>';
  canvas.parentElement.appendChild(touch);
  const joy=touch.querySelector('.three-joystick'),knob=joy.querySelector('i');let joyPointer=null,joyRect=null,sprintPointer=null,touchSprint=false;
  function resize(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;width=rect.width;height=rect.height;dpr=Math.min(window.devicePixelRatio||1,1.6);canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));gl.viewport(0,0,canvas.width,canvas.height);}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);resize();
  function nearestNpc(){let best=null,bd=1e9;for(const entry of npcMeshes){const d=Math.hypot(entry.pos.x-pos.x,entry.pos.z-pos.z);if(d<bd){best=entry;bd=d;}}return best&&bd<4.5?best:null;}
  function nearestLoot(){let best=null,bd=1e9;for(const entry of lootMeshes){const d=Math.hypot(entry.pos.x-pos.x,entry.pos.z-pos.z);if(d<bd){best=entry;bd=d;}}return best&&bd<3.4?best:null;}
  function nearestExit(){let best=null,bd=1e9;for(const exit of exits){const d=Math.hypot(exit.x-pos.x,exit.z-pos.z);if(d<bd){best=exit;bd=d;}}return best&&bd<5.5?best:null;}
  function interact(){const target=nearestNpc();if(target){onInteract(target.npc.id);return;}const loot=nearestLoot();if(loot){const ok=onPickup(loot.id);if(ok){game.player.worldLootCollected[loc.id] ||= [];game.player.worldLootCollected[loc.id].push(loot.key);gl.deleteBuffer(loot.mesh.buffer);lootMeshes.splice(lootMeshes.indexOf(loot),1);onCheckpoint();}return;}const exit=nearestExit();if(exit){onTravel(exit.id);return;}onNotify('Рядом никого нет. Подойди ближе к сталкеру, предмету или выходу.');}
  function fire(){
    if(performance.now()-fireCooldown<340)return;
    fireCooldown=performance.now();recoilAt=fireCooldown;
    const target=selectAimedTarget(npcMeshes,pos,yaw);
    if(target||game.activeEncounter){
      game.player.last3dShotAt=fireCooldown;
      game.player.last3dShotTargetId=game.activeEncounter?.npcId||target?.npc.id||null;
      game.player.last3dShotLoc=loc.id;
      if(shotMesh)gl.deleteBuffer(shotMesh.buffer);
      const tracer=new MeshBuilder(),start=[pos.x+Math.sin(yaw)*.54,sampleTerrainHeight(pos.x,pos.z)+1.34,pos.z-Math.cos(yaw)*.54];
      const end=target?[target.pos.x,1.42,target.pos.z]:[start[0]+Math.sin(yaw)*11,1.42,start[2]-Math.cos(yaw)*11];
      tracer.beam(start,end,.027,[.92,.58,.18],7,.004);tracer.sphere(start[0],start[1],start[2],.09,.065,.09,[1,.72,.27],7,9);
      shotMesh=tracer.toMesh(gl);shotAt=fireCooldown;
    }
    onFire(target?.npc||null);
  }
  function keydown(e){if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','f','e','shift'].includes(k))e.preventDefault();keyState[k]=true;if(k==='e'&&!e.repeat)interact();if(k==='f'&&!e.repeat)fire();}
  function keyup(e){keyState[e.key.toLowerCase()]=false;}
  function pointerdown(e){if(e.pointerType==='touch'){if(e.clientX<window.innerWidth*.48){joyPointer=e.pointerId;joyRect=joy.getBoundingClientRect();updateJoy(e);}else{lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};}return;}
    mouseDown=true;if(canvas.requestPointerLock&&!isPointerLocked)canvas.requestPointerLock();}
  function updateJoy(e){if(!joyRect)return;const cx=joyRect.left+joyRect.width/2,cy=joyRect.top+joyRect.height/2,dx=e.clientX-cx,dy=e.clientY-cy,limit=joyRect.width*.34,l=Math.hypot(dx,dy)||1;const nx=dx/Math.max(limit,l),ny=dy/Math.max(limit,l);touchMove={x:nx,y:ny};knob.style.transform=`translate(${nx*limit}px,${ny*limit}px)`;}
  function pointermove(e){if(joyPointer===e.pointerId){updateJoy(e);return;}if(lookPointer?.id===e.pointerId){yaw-= (e.clientX-lookPointer.x)*.007;pitch=clamp(pitch+(e.clientY-lookPointer.y)*.004,-.12,.58);lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};return;}}
  function pointerup(e){if(joyPointer===e.pointerId){joyPointer=null;touchMove={x:0,y:0};knob.style.transform='translate(0,0)';}if(lookPointer?.id===e.pointerId)lookPointer=null;if(sprintPointer===e.pointerId){sprintPointer=null;touchSprint=false;}mouseDown=false;}
  function pointerlock(){isPointerLocked=document.pointerLockElement===canvas;}
  function mousemove(e){if(isPointerLocked){yaw-=e.movementX*.0022;pitch=clamp(pitch+e.movementY*.0018,-.12,.58);}}
  function click(e){if(e.target.closest('.three-touch-controls'))return;if(e.pointerType==='mouse'&&!isPointerLocked)return;fire();}
  const onTouchAction=e=>{const btn=e.target.closest('[data-3d]');if(!btn)return;e.preventDefault();const action=btn.dataset['3d'];if(action==='sprint'){sprintPointer=e.pointerId;touchSprint=true;btn.setPointerCapture?.(e.pointerId);return;}action==='fire'?fire():interact();};
  function joystickDown(e){e.preventDefault();joyPointer=e.pointerId;joyRect=joy.getBoundingClientRect();joy.setPointerCapture?.(e.pointerId);updateJoy(e);}
  joy.addEventListener('pointerdown',joystickDown);canvas.addEventListener('pointerdown',pointerdown);window.addEventListener('pointermove',pointermove);window.addEventListener('pointerup',pointerup);window.addEventListener('pointercancel',pointerup);window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);document.addEventListener('pointerlockchange',pointerlock);window.addEventListener('mousemove',mousemove);canvas.addEventListener('click',click);touch.addEventListener('pointerdown',onTouchAction);

  function draw(mesh,model,sprite=false){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);const stride=11*4;gl.enableVertexAttribArray(attrib.pos);gl.vertexAttribPointer(attrib.pos,3,gl.FLOAT,false,stride,0);gl.enableVertexAttribArray(attrib.normal);gl.vertexAttribPointer(attrib.normal,3,gl.FLOAT,false,stride,12);gl.enableVertexAttribArray(attrib.color);gl.vertexAttribPointer(attrib.color,3,gl.FLOAT,false,stride,24);gl.enableVertexAttribArray(attrib.uv);gl.vertexAttribPointer(attrib.uv,2,gl.FLOAT,false,stride,36);gl.uniformMatrix4fv(uniforms.model,false,model);gl.uniformMatrix3fv(uniforms.normal,false,normalMatrix(model));gl.uniform1f(uniforms.spritePass,sprite?1:0);if(sprite){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,npcAtlas.texture);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);}else{gl.disable(gl.BLEND);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,albedoTexture.texture);}gl.drawArrays(gl.TRIANGLES,0,mesh.count);if(sprite)gl.disable(gl.BLEND);gl.activeTexture(gl.TEXTURE0);}
  function frame(now){if(destroyed)return;raf=requestAnimationFrame(frame);const dt=Math.min(.04,(now-last)/1000||.016);last=now;
    const forward=(keyState.w||keyState.arrowup?1:0)-(keyState.s||keyState.arrowdown?1:0)-touchMove.y;
    const strafe=(keyState.d||keyState.arrowright?1:0)-(keyState.a||keyState.arrowleft?1:0)+touchMove.x;
    const speed=(keyState.shift||touchSprint?8.2:4.2)*dt;const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed,dz=(-Math.cos(yaw)*forward+Math.sin(yaw)*strafe)*speed;
    if(Math.abs(forward)+Math.abs(strafe)>.01){let nx=clamp(pos.x+dx,-35.5,35.5),nz=clamp(pos.z+dz,-35.5,35.5);let blocked=false;for(const ob of obstacles)if(Math.hypot(nx-ob.x,nz-ob.z)<ob.r){blocked=true;break;}if(!blocked){pos.x=nx;pos.z=nz;pos.yaw=yaw;game.player.worldPositions[loc.id]={x:pos.x,z:pos.z,yaw};game.distanceTravelled=(game.distanceTravelled||0)+Math.hypot(dx,dz)*.001;}}
    const terrainY=sampleTerrainHeight(pos.x,pos.z);const eyeY=terrainY+1.66;const camera=[pos.x,eyeY,pos.z];const cameraPitch=clamp(pitch, -.18, .62);const target=[pos.x+Math.sin(yaw)*Math.cos(cameraPitch)*10,eyeY+Math.sin(cameraPitch)*10,pos.z-Math.cos(yaw)*Math.cos(cameraPitch)*10];const view=lookAt(camera,target);const proj=perspective(.91,width/Math.max(1,height),.08,140);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.17,.20,.17,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,albedoTexture.texture);gl.uniform1f(uniforms.textureReady,albedoTexture.ready?1:0);gl.uniformMatrix4fv(uniforms.projection,false,proj);gl.uniformMatrix4fv(uniforms.view,false,view);gl.uniform3f(uniforms.sun,.45,-1,.28);gl.uniform3f(uniforms.sunColor,1,.91,.75);const hour=Number(String(game.clock?.time||'14:00').split(':')[0])||14;const night=hour<6||hour>20;gl.uniform3f(uniforms.fog,night?.09:.34,night?.12:.36,night?.10:.31);gl.uniform1f(uniforms.fogNear,20);gl.uniform1f(uniforms.fogFar,78);gl.uniform1f(uniforms.time,now/1000);
    draw(worldMesh,modelMatrix(0,0,0,0));
    for(const entry of lootMeshes){const bob=Math.sin(now*.002+entry.pos.x)*.045;draw(entry.mesh,modelMatrix(entry.pos.x,sampleTerrainHeight(entry.pos.x,entry.pos.z)+.04+bob,entry.pos.z,now*.00018));}
    // NPCs idle with subtle breathing and look toward the player.
    for(const entry of npcMeshes){if(enemyModel&&enemyEntry&&entry.npc.id===enemyEntry.npc.id)continue;const angle=npcFacingYaw(entry.pos,pos)+Math.sin(now*.00055+entry.phase)*.012;const idle=Math.sin(now*.0014+entry.phase)*.012;const npcY=sampleTerrainHeight(entry.pos.x,entry.pos.z)+idle;draw(npcShadowMesh,modelMatrix(entry.pos.x,sampleTerrainHeight(entry.pos.x,entry.pos.z),entry.pos.z,0));if(npcAtlas.ready)draw(entry.spriteMesh,modelMatrix(entry.pos.x,npcY,entry.pos.z,angle),true);else draw(entry.mesh,modelMatrix(entry.pos.x,npcY,entry.pos.z,angle));}
    if(enemyModel){const ex=enemyEntry?.pos.x??(pos.x+Math.sin(yaw)*4.5),ez=enemyEntry?.pos.z??(pos.z-Math.cos(yaw)*4.5);const enemyYaw=npcFacingYaw({x:ex,z:ez},pos);draw(npcShadowMesh,modelMatrix(ex,sampleTerrainHeight(ex,ez),ez,0));if(enemyModel.spriteMesh&&npcAtlas.ready)draw(enemyModel.spriteMesh,modelMatrix(ex,sampleTerrainHeight(ex,ez),ez,enemyYaw),true);else draw(enemyModel.mesh,modelMatrix(ex,sampleTerrainHeight(ex,ez)+Math.sin(now*.003)*.012,ez,enemyYaw));}
    const shotElapsed=now-shotAt;if(shotMesh&&shotElapsed>=0&&shotElapsed<165)draw(shotMesh,modelMatrix(0,0,0,0));
    const moving=Math.abs(forward)+Math.abs(strafe)>.02;const walkPhase=(now*((keyState.shift||touchSprint)?.014:.010))%(Math.PI*2);const bob=moving?Math.abs(Math.sin(walkPhase*2))*.052:Math.sin(now*.0018)*.012;const sway=moving?Math.sin(walkPhase)*.045:Math.sin(now*.0012)*.009;const recoil=Math.max(0,1-(now-recoilAt)/190);
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(cameraPitch),sp=Math.sin(cameraPitch);const right=[cy,0,sy],up=[-sy*sp,cp,cy*sp],back=[-sy*cp,-sp,cy*cp];const handOrigin=[camera[0]+right[0]*(.045+sway)+up[0]*(-.12+bob)+back[0]*(-.35+recoil*.12),camera[1]+right[1]*(.045+sway)+up[1]*(-.12+bob)+back[1]*(-.35+recoil*.12),camera[2]+right[2]*(.045+sway)+up[2]*(-.12+bob)+back[2]*(-.35+recoil*.12)];const viewScale=.50;const handsMatrix=new Float32Array([right[0]*viewScale,right[1]*viewScale,right[2]*viewScale,0,up[0]*viewScale,up[1]*viewScale,up[2]*viewScale,0,back[0]*viewScale,back[1]*viewScale,back[2]*viewScale,0,handOrigin[0],handOrigin[1],handOrigin[2],1]);draw(firstPersonMesh,handsMatrix);
    saveElapsed+=dt;if(saveElapsed>8){saveElapsed=0;game.player.worldPositions[loc.id]={x:pos.x,z:pos.z,yaw};onCheckpoint();}
  }
  raf=requestAnimationFrame(frame);
  function destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();canvas.removeEventListener('pointerdown',pointerdown);window.removeEventListener('pointermove',pointermove);window.removeEventListener('pointerup',pointerup);window.removeEventListener('pointercancel',pointerup);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);document.removeEventListener('pointerlockchange',pointerlock);window.removeEventListener('mousemove',mousemove);canvas.removeEventListener('click',click);touch.removeEventListener('pointerdown',onTouchAction);joy.removeEventListener('pointerdown',joystickDown);touch.remove();canvas.parentElement?.classList.remove('has-3d-world');aimReticle.remove();for(const mesh of [worldMesh,firstPersonMesh,npcShadowMesh,...npcMeshes.flatMap(e=>[e.mesh,e.spriteMesh]),...lootMeshes.map(e=>e.mesh),enemyModel?.mesh,enemyModel?.spriteMesh,shotMesh].filter(Boolean))gl.deleteBuffer(mesh.buffer);gl.deleteTexture(albedoTexture.texture);gl.deleteTexture(npcAtlas.texture);gl.deleteProgram(p);if(document.pointerLockElement===canvas)document.exitPointerLock();}
  activeRenderer={destroy,layout};return activeRenderer;
}
