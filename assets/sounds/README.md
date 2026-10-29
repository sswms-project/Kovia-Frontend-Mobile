# Scanner feedback sounds

Rendered from `SSWMS-Frontend/src/lib/scan-feedback.ts` using Edge Web Audio `OfflineAudioContext` at 48 kHz, exported as mono 16-bit PCM WAV. The original `playTones` oscillator/gain scheduling was retained; only the live-context resume checks were omitted for offline rendering.

- Success: square oscillator, 1760 Hz, 90 ms.
- Error: square oscillator, 330 Hz, 140 ms at 0 ms and 200 ms.
- Both: gain starts at 0.08 and exponentially ramps to 0.0001 over each tone. Each WAV has a 20 ms silent tail.

These replace the earlier hand-generated raw square samples and extended/louder success tone. Browser oscillator synthesis handles the harmonics; do not regenerate with an unfiltered sign-of-sine waveform. Native speakers, routing and simultaneous haptics can still affect perceived playback.
