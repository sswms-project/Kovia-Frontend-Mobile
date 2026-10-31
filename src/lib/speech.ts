import * as Speech from 'expo-speech';

const LANGUAGE = 'vi-VN';
export function speak(text: string) { Speech.stop(); Speech.speak(text, { language: LANGUAGE }); }
export function stopSpeaking() { Speech.stop(); }
