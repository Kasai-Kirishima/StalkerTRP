// Persistent YouTube IFrame API audio host. It is intentionally mounted outside
// #app so navigation between PDA tabs does not destroy the active music player.
export function createMusicEngine(onEnded = () => {}) {
  let player = null;
  let isReady = false;
  let apiRequested = false;
  let pendingTrack = null;
  let failed = false;

  function mountHost() {
    let host = document.getElementById('zone-music-host');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'zone-music-host';
    Object.assign(host.style, {
      position: 'fixed', left: '-230px', top: '0', width: '200px', height: '200px',
      opacity: '0.01', pointerEvents: 'none', overflow: 'hidden', zIndex: '-1'
    });
    const target = document.createElement('div');
    target.id = 'zone-music-player';
    host.appendChild(target);
    document.body.appendChild(host);
    return host;
  }

  function createPlayer() {
    if (player || !window.YT?.Player) return;
    mountHost();
    player = new window.YT.Player('zone-music-player', {
      width: '200', height: '200', videoId: '',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          isReady = true;
          if (pendingTrack) playNow(pendingTrack);
        },
        onStateChange: event => {
          if (event.data === window.YT.PlayerState.ENDED) onEnded();
        },
        onError: () => { failed = true; onEnded(); }
      }
    });
  }

  function ensureApi() {
    if (window.YT?.Player) { createPlayer(); return; }
    if (apiRequested) return;
    apiRequested = true;
    mountHost();
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { previous?.(); } catch { /* ignore unrelated callback errors */ }
      createPlayer();
    };
    if (!document.querySelector('script[data-zone-youtube-api]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.zoneYoutubeApi = '1';
      script.onerror = () => { failed = true; };
      document.head.appendChild(script);
    }
  }

  function playNow(track) {
    if (!player || !isReady || !track?.videoId) return;
    failed = false;
    const options={ videoId:track.videoId, startSeconds:Math.max(0,Number(track.startSeconds)||0) };
    if (Number.isFinite(track.endSeconds) && track.endSeconds>options.startSeconds) options.endSeconds=track.endSeconds;
    player.loadVideoById(options);
    player.setVolume(78);
  }

  return {
    prepare() { ensureApi(); },
    play(track) {
      if (!track?.videoId) return false;
      pendingTrack = track;
      ensureApi();
      if (player && isReady) playNow(track);
      return true;
    },
    pause() { if (player && isReady) player.pauseVideo(); },
    resume(track = null) {
      const sameTrack = track && pendingTrack && track.videoId===pendingTrack.videoId && track.startSeconds===pendingTrack.startSeconds && track.endSeconds===pendingTrack.endSeconds;
      if (player && isReady && sameTrack) player.playVideo();
      else if (track) this.play(track);
      else if (player && isReady && pendingTrack) player.playVideo();
      else if (pendingTrack) this.play(pendingTrack);
    },
    stop() { if (player && isReady) player.stopVideo(); pendingTrack = null; },
    get failed() { return failed; }
  };
}
