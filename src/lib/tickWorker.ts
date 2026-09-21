/** Once-a-second heartbeat that runs off the main thread. Browsers throttle
 * page timers in background tabs (down to once a minute after a few
 * minutes), which would make a finished Pomodoro go unnoticed; dedicated
 * workers aren't throttled that way. */
setInterval(() => {
  (self as unknown as Worker).postMessage(0);
}, 1000);
