import { useState } from "react";
import { useDeviceStore } from "../store/deviceStore";

function KeySettings() {
  const {
    selectedKey,
    currentLayer,
    profiles,
    currentProfile,
    setKey,
    macros,
  } = useDeviceStore();

  const [tab, setTab] = useState<"standard" | "macro">(
    "standard"
  );

  if (selectedKey === null) {
    return (
      <div className="text-gray-400 text-sm">
        Select a key
      </div>
    );
  }

  const profile = profiles.find(
    (p) => p.id === currentProfile
  );

  if (!profile) {
    return (
      <div className="text-gray-400 text-sm">
        No profile found
      </div>
    );
  }

  // ✅ LIVE CURRENT LAYER VALUE
  const currentValue =
    profile.keymaps[currentLayer]?.[selectedKey] ||
    "KC_NO";

  // ✅ USE KC_ FORMAT
  const standardKeys = [
    "KC_A",
    "KC_B",
    "KC_C",
    "KC_D",
    "KC_E",
    "KC_F",
    "KC_G",
    "KC_H",
    "KC_I",
    "KC_J",
    "KC_K",
    "KC_L",
    "KC_M",
    "KC_N",
    "KC_O",
    "KC_P",
    "KC_Q",
    "KC_R",
    "KC_S",
    "KC_T",
    "KC_U",
    "KC_V",
    "KC_W",
    "KC_X",
    "KC_Y",
    "KC_Z",

    "KC_1",
    "KC_2",
    "KC_3",
    "KC_4",
    "KC_5",
    "KC_6",
    "KC_7",
    "KC_8",
    "KC_9",
    "KC_0",

    "KC_ESC",
    "KC_ENTER",
    "KC_SPACE",
    "KC_TAB",

    "KC_UP",
    "KC_DOWN",
    "KC_LEFT",
    "KC_RIGHT",

    "KC_VOLU",
    "KC_VOLD",
    "KC_MUTE",
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Key Settings
      </h2>

      {/* TABS */}
      <div className="flex gap-2">
        {["standard", "macro"].map((t) => (
          <button
            key={t}
            onClick={() =>
              setTab(t as "standard" | "macro")
            }
            className={`px-3 py-1 rounded transition-all ${
              tab === t
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* STANDARD */}
      {tab === "standard" && (
        <select
          value={currentValue}
          onChange={(e) => {
            setKey(
              currentLayer,
              selectedKey,
              e.target.value
            );
          }}
          className="w-full p-2 bg-gray-700 rounded text-white"
        >
          {standardKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      )}

      {/* MACRO */}
      {tab === "macro" && (
        <select
          value={currentValue.startsWith("MACRO_")
            ? currentValue
            : ""}
          onChange={(e) => {
            setKey(
              currentLayer,
              selectedKey,
              e.target.value
            );
          }}
          className="w-full p-2 bg-gray-700 rounded text-white"
        >
          <option value="">None</option>

          {macros.map((m: any, index: number) => (
            <option
              key={m.id}
              value={`MACRO_${m.id}`}
            >
              M{index + 1}
            </option>
          ))}
        </select>
      )}

      {/* DESCRIPTION */}
<div className="text-sm text-gray-400">
  {currentValue.startsWith("MACRO_")
    ? `Runs ${
        (() => {
          const macroIndex = macros.findIndex(
            (m: any) =>
              `MACRO_${m.id}` === currentValue
          );

          return macroIndex >= 0
            ? `Macro ${macroIndex + 1}`
            : "Macro";
        })()
      }`
    : "Standard key input"}
</div>
    </div>
  );
}

export default KeySettings;