// Small procedural sound palette. No remote files or extra dependencies are required.
export function createSoundEngine(getSettings=()=>({})) {
  let context=null;
  const ensureContext=()=>{
    if (context) return context;
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context=new AudioContextClass();
    return context;
  };
  const patterns={
    ui:[{f:520,d:.045,w:'sine',v:.16}],
    trade:[{f:420,d:.07,w:'triangle',v:.18},{f:620,d:.09,w:'triangle',v:.14,delay:.06}],
    success:[{f:520,d:.09,w:'sine',v:.18},{f:660,d:.12,w:'sine',v:.17,delay:.08},{f:790,d:.16,w:'sine',v:.14,delay:.17}],
    danger:[{f:155,d:.18,w:'sawtooth',v:.17},{f:110,d:.22,w:'sawtooth',v:.12,delay:.15}],
    anomaly:[{f:92,d:.34,w:'sine',v:.2},{f:185,d:.28,w:'triangle',v:.12,delay:.12}]
  };
  function play(type='ui') {
    const settings=getSettings()||{};
    if (settings.soundEnabled===false) return;
    const audio=ensureContext(); if(!audio) return;
    if(audio.state==='suspended') audio.resume().catch(()=>{});
    const volume=Math.max(0,Math.min(1,Number(settings.soundVolume??.35)));
    const now=audio.currentTime;
    for (const tone of (patterns[type]||patterns.ui)) {
      const oscillator=audio.createOscillator();
      const gain=audio.createGain();
      oscillator.type=tone.w; oscillator.frequency.setValueAtTime(tone.f,now+(tone.delay||0));
      gain.gain.setValueAtTime(0,now+(tone.delay||0));
      gain.gain.linearRampToValueAtTime(volume*tone.v,now+(tone.delay||0)+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,now+(tone.delay||0)+tone.d);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(now+(tone.delay||0)); oscillator.stop(now+(tone.delay||0)+tone.d+.02);
    }
  }
  return {play};
}
