import Tts from "react-native-tts";

// Read text aloud with the phone's own voice. Kannada needs a Kannada voice on the phone.
let ready = null;
function init() {
  if (!ready) {
    ready = Tts.getInitStatus().then(() => { Tts.setDefaultRate(0.5); return true; }).catch(() => false);
  }
  return ready;
}

// lang: "kn-IN" or "en-IN". Resolves to { ok, message? }.
export async function speak(text, lang = "en-IN") {
  if (!text) return { ok: false };
  const up = await init();
  if (!up) return { ok: false, message: "This phone has no text-to-speech engine. Install or enable one in the phone settings." };
  try {
    Tts.stop();
    await Tts.setDefaultLanguage(lang);
    Tts.speak(text);
    return { ok: true };
  } catch (e) {
    if (lang.startsWith("kn")) {
      return { ok: false, message: "This phone has no Kannada voice yet. Add one in the phone's text-to-speech settings." };
    }
    return { ok: false, message: "Could not read this aloud." };
  }
}

export function stopSpeaking() {
  try { Tts.stop(); } catch (_) {}
}
