export function getKeyDescription(key: string | undefined): string {
  if (!key) return "";

  // STANDARD
  if (key === "KC_ENTER") return "Submits input";
  if (key === "KC_ESC") return "Cancels action";
  if (key === "KC_TAB") return "Moves to next field";
  if (key === "KC_SPACE") return "Inserts space";
  if (key === "KC_BSPC") return "Deletes previous character";

  // MEDIA
  if (key === "KC_VOLU") return "Increase volume";
  if (key === "KC_VOLD") return "Decrease volume";
  if (key === "KC_MUTE") return "Mute audio";
  if (key === "KC_MPLY") return "Play / Pause";
  if (key === "KC_MNXT") return "Next track";
  if (key === "KC_MPRV") return "Previous track";

  // LAYER
  if (key.startsWith("MO")) {
    return `Hold to activate ${key}`;
  }

  if (key.startsWith("TO")) {
    return `Switch to ${key}`;
  }

  if (key.startsWith("TG")) {
    return `Toggle ${key}`;
  }

  // MACRO
  if (key.startsWith("M")) {
    return `Runs Macro ${key.replace("M", "")}`;
  }

  return "Custom key action";
}