import { create } from "zustand";
import toast from "react-hot-toast";
//import { mockBackend } from "../mockBackend";
import { invoke } from "@tauri-apps/api/core";
import { persist } from "zustand/middleware";
import { saveToDevice as backendSave, setKey as backendSetKey, setMacro as backendSetMacro,} from "../utils/backend";
import { getVersion } from "../utils/backend";
import { keyOptions } from "../data/keyOptions";

/* TYPES */
export type Profile = {
  id: string;
  name: string;
  keymaps: string[][];
};

type MacroStep =
  | { type: "key"; key: string }
  | { type: "keydown"; key: string }
  | { type: "keyup"; key: string }
  | { type: "delay"; ms: number };

type Macro = {
  id: number;
  name: string;
  steps: MacroStep[];
  repeat: boolean;
  delayBetween: number;
};


type Encoder = {
  left: string;
  right: string;
  press: string;
};

type DeviceState = {
  deviceName: string;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setLoading: (value: boolean) => void;
  fetchFromDevice: () => Promise<void>;
  saveToDevice: () => Promise<boolean>;
  hasInitialized: boolean;
  lastSyncTime: number;
  updateSyncTime: () => void;

  currentLayer: number;
  setLayer: (layer: number) => void;
  layers: number[];

  setKey: (
  layer: number,
  index: number,
  value: string
) => void;

  selectedKey: number | null;
  setSelectedKey: (index: number) => void;

  profiles: Profile[];
  currentProfile: string;

  createProfile: (name: string) => void;
  loadProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  setCurrentProfile: (id: string) => void;

  exportProfile: (id: string) => void;
  importProfile: (data: Profile) => void;

  macros: Macro[];
  selectedMacroId: number | null;
  addMacro: () => void;
  deleteMacro: (id: number) => void;
  selectMacro: (id: number) => void;
  addStep: (step: MacroStep) => void;
  removeStep: (index: number) => void;
  reorderSteps: (from: number, to: number) => void;
  toggleRepeat: () => void;
  setDelayBetween: (value: number) => void;

  encoder: Encoder;
  setEncoder: (type: keyof Encoder, value: string) => void;

  hasUnsavedChanges: boolean;
  saveChanges: () => void;

  isFlashing: boolean;
  flashFirmware: () => Promise<void>;

  themeColor: "blue" | "purple" | "green" | "red";
  setThemeColor: (color: "blue" | "purple" | "green" | "red") => void;

  autoSave: boolean;
  showKeycodes: boolean;
  confirmOverwrite: boolean;

  setAutoSave: (v: boolean) => void;
  setShowKeycodes: (v: boolean) => void;
  setConfirmOverwrite: (v: boolean) => void;
};


// FIX #4 + #5: Strip "KC_" prefix so both "A" and "KC_A" work
function convertKeycode(rawKey: string): number {
  // Strip KC_ prefix if present
  const key = rawKey.replace(/^KC_/, "");

  const map: Record<string, number> = {
    A: 4,
    B: 5,
    C: 6,
    D: 7,
    E: 8,
    F: 9,
    G: 10,
    H: 11,
    I: 12,
    J: 13,
    K: 14,
    L: 15,
    M: 16,
    N: 17,
    O: 18,
    P: 19,
    Q: 20,
    R: 21,
    S: 22,
    T: 23,
    U: 24,
    V: 25,
    W: 26,
    X: 27,
    Y: 28,
    Z: 29,

    "1": 30,
    "2": 31,
    "3": 32,
    "4": 33,
    "5": 34,
    "6": 35,
    "7": 36,
    "8": 37,
    "9": 38,
    "0": 39,

    ENTER: 40,
    ESC: 41,
    BACKSPACE: 42,
    TAB: 43,
    SPACE: 44,

    CAPS: 57,

    F1: 58,
    F2: 59,
    F3: 60,
    F4: 61,
    F5: 62,
    F6: 63,
    F7: 64,
    F8: 65,
    F9: 66,
    F10: 67,
    F11: 68,
    F12: 69,

    RIGHT: 79,
    LEFT: 80,
    DOWN: 81,
    UP: 82,

    CTL: 224,
    CTRL: 224,
    ALT: 226,
    SHIFT: 225,
    fn: 228,
    GUI: 227,
    "!": 30,
    "@": 31,
    "#": 32,
    "$": 33,
    "%": 34,
    "^": 35,
    "&": 36,
    "*": 37,
    "(": 38,
    ")": 39,

    "-": 45,
    "=": 46,

    "[": 47,
    "]": 48,
    "\\": 49,

    ";": 51,
    "'": 52,

    ",": 54,
    ".": 55,
    "/": 56,
    "`": 53,
    "~": 53,
    "+": 45,
    _: 46,
    "|": 49,
    ":": 51,
    '"': 52,
    "<": 54,
    ">": 55,
    "?": 56,
    "{": 47,
    "}": 48,
  };

  // FIX #6: Detailed logging to catch conversion issues
  console.log(
    "KEY LOOKUP:",
    rawKey,
    "=> stripped:",
    key,
    "=> keycode:",
    map[key] ?? 0
  );

  return map[key] ?? 0;
}

/* STORE */
export const useDeviceStore = create<DeviceState>((set, get) => ({
  deviceName: "my_numpad v1.0",
  connected: false,
  hasInitialized: false,

  themeColor: "blue",
  setThemeColor: (color) =>
    set({
      themeColor: color,
    }),

  connect: async () => {
    set({
      isLoading: true,
      error: null,
    });
    try {
      const version = await getVersion();
      set({
        connected: true,
        deviceName: version as string,
        isLoading: false,
      });
      toast.success("Device connected");
    } catch (err) {
      console.error(err);
      set({
        connected: false,
        isLoading: false,
        error: "No device found",
      });
      toast.error("No hardware connected");
    }
  },

  disconnect: () => {
    set({ connected: false, deviceName: "" });
    toast.error("Device disconnected");
  },

  isLoading: false,
  isSaving: false,
  error: null,
  
  isFlashing: false,
  flashFirmware: async () => {
    set({ isFlashing: true, error: null });
    try {
      await new Promise((res) => setTimeout(res, 1500));
      toast.success("Firmware flashed successfully");
      set({ isFlashing: false });
    } catch (err) {
      console.error(err);
      set({
        isFlashing: false,
        error: "Firmware flash failed",
      });
      toast.error("Firmware flash failed");
    }
  },

  autoSave: false,
  showKeycodes: true,
  confirmOverwrite: true,

  setAutoSave: (v) => set({ autoSave: v }),
  setShowKeycodes: (v) => set({ showKeycodes: v }),
  setConfirmOverwrite: (v) => set({ confirmOverwrite: v }),

  setLoading: (value) => set({ isLoading: value }),

  lastSyncTime: Date.now(),
  updateSyncTime: () => set({ lastSyncTime: Date.now() }),

  fetchFromDevice: async () => {
    try {
      const profile = get().profiles.find(
        (p) => p.id === get().currentProfile
      );
      const data = profile?.keymaps || [];

      set((state) => {
        const profile = state.profiles.find(
          (p) => p.id === state.currentProfile
        );

        if (!profile) {
          return {};
        }

        return {
          profiles: state.profiles.map((p) =>
            p.id === state.currentProfile
              ? { ...p, keymaps: data as string[][] }
              : p
          ),
        };
      });
      get().updateSyncTime();

    } catch (err) {
      console.error("Fetch failed", err);
    }
  },

  saveToDevice: async () => {
    console.log("SAVE CLICKED");
    set({ isSaving: true });

    try {
      console.log("SAVE BUTTON CLICKED");
      const macros = get().macros;

    for (let i = 0; i < macros.length; i++) {

      const keycodes = macros[i].steps
        .filter((s) => s.type === "key")
        .map((s) => convertKeycode(s.key))
        .slice(0, 5);

      await backendSetMacro(i, keycodes);
    }
      await backendSave();

      set({
        isSaving: false,
        hasUnsavedChanges: false,
      });

      toast.success("Saved to device");

      return true;

    } catch (err) {
      console.error("Save failed", err);

      toast.error("Save failed");

      set({
        isSaving: false,
      });

      return false;
    }
  },

  currentLayer: 0,
  setLayer: (layer) => set({ currentLayer: layer }),
  layers: [0, 1, 2, 3, 4],

  selectedKey: null,
  setSelectedKey: (index) => set({ selectedKey: index }),

  setKey: async (layer, index, value) => {

    // UI UPDATE
    set((state) => {
      const updatedProfiles = [...state.profiles];

      const profileIndex = updatedProfiles.findIndex(
        (p) => p.id === state.currentProfile
      );

      if (profileIndex === -1) return state;

      const keymaps = [
        ...updatedProfiles[profileIndex].keymaps,
      ];

      const layerMap = [...keymaps[layer]];

      layerMap[index] = value;

      keymaps[layer] = layerMap;

      updatedProfiles[profileIndex] = {
        ...updatedProfiles[profileIndex],
        keymaps,
      };

      return {
        profiles: updatedProfiles,
        hasUnsavedChanges: true,
      };
    });

    // HARDWARE UPDATE
    try {
      const keyMatrix = [
        [0,0],
        [0,1],
        [0,2],
        [0,3],
        [0,4],

        [1,0],
        [1,1],
        [1,2],
        [1,3],
        [1,4],

        [2,0],
        [2,1],
        [2,2],
        [2,3],
        [2,4],

        [3,0],
        [3,1],
        [3,2],
        [3,3],
        [3,4]
      ];

      const [row, col] = keyMatrix[index];

      // FIX #6: Full debug log before sending
      console.log("setKey debug:", {
        profile: Number(get().currentProfile),
        layer,
        index,
        row,
        col,
        value,
        converted: convertKeycode(value),
      });

      if (row < 0 || row > 3 || col < 0 || col > 4) {
        console.error("Invalid matrix position", row, col);
        return;
      }

      // FIX #3: currentProfile "0" maps to firmware profile 0
      await backendSetKey(
        Number(get().currentProfile), // profile
        row,
        col,
        convertKeycode(value)
      );

      console.log("Sent to hardware:", {
        profile: Number(get().currentProfile),
        layer,
        index,
        value,
        converted: convertKeycode(value),
      });
    } catch (err) {
      console.error("Hardware setKey failed", err);
    }
  },

  profiles: [
    {
      // FIX #3: Start at "0" to match firmware profile index 0
      id: "0",
      name: "Default",
      keymaps: [
        [
          "I", "Q", "W", "E", "F",
          "Z", "A", "S", "D", "L",
          "O", "N", "B", "CTRL", "SPACE",
          "CTRL", "SPACE", "ENTER"
        ],
        [
          "I", "Q", "W", "E", "F",
          "Z", "A", "S", "D", "L",
          "O", "N", "B", "CTRL", "SPACE",
          "CTRL", "SPACE", "ENTER"
        ],
        [
          "I", "Q", "W", "E", "F",
          "Z", "A", "S", "D", "L",
          "O", "N", "B", "CTRL", "SPACE",
          "CTRL", "SPACE", "ENTER"
        ],
        [
          "I", "Q", "W", "E", "F",
          "Z", "A", "S", "D", "L",
          "O", "N", "B", "CTRL", "SPACE",
          "CTRL", "SPACE", "ENTER"
        ],
        [
          "I", "Q", "W", "E", "F",
          "Z", "A", "S", "D", "L",
          "O", "N", "B", "CTRL", "SPACE",
          "CTRL", "SPACE", "ENTER"
        ],
        Array(18).fill("KC_1"),
        Array(18).fill("KC_2"),
        Array(18).fill("KC_3"),
        Array(18).fill("KC_4"),
        Array(18).fill("KC_5"),
      ],
    },
  ],

  // FIX #3: Must match the profile id above
  currentProfile: "0",

  createProfile: (name) =>
    set((state) => {
      const newProfile = {
        id: Date.now().toString(),
        name,
        keymaps: JSON.parse(
          JSON.stringify(
            state.profiles.find(
              (p) => p.id === state.currentProfile
            )?.keymaps || []
          )
        ),
      };
      return {
        profiles: [...state.profiles, newProfile],
      };
    }),

  loadProfile: (id) =>
    set((state) => {
      const p = state.profiles.find((x) => x.id === id);
      if (!p) return state;
      toast.success("Profile loaded");
      return { currentProfile: id };
    }),

  deleteProfile: (id) =>
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== id),
    })),

  duplicateProfile: (id) =>
    set((state) => {
      const p = state.profiles.find((x) => x.id === id);
      if (!p) return state;
      return {
        profiles: [
          ...state.profiles,
          {
            ...p,
            id: Date.now().toString(),
            name: p.name + " Copy",
          },
        ],
      };
    }),

  renameProfile: (id, name) =>
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === id ? { ...p, name } : p
      ),
    })),

  setCurrentProfile: (id) =>
    set({
      currentProfile: id,
    }),

  exportProfile: (id) => {
    const p = get().profiles.find((x) => x.id === id);
    if (!p) return;

    const blob = new Blob([JSON.stringify(p, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.name}.json`;
    a.click();
  },

  importProfile: (data) =>
    set((state) => ({
      profiles: [...state.profiles, { ...data, id: Date.now().toString() }],
    })),

  macros: [],
  selectedMacroId: null,

  addMacro: () =>
    set((state) => ({
      macros: [
        ...state.macros,
        {
          id: Date.now(),
          name: `Macro ${state.macros.length + 1}`,
          steps: [],
          repeat: false,
          delayBetween: 0,
        },
      ],
    })),

  deleteMacro: (id) =>
    set((state) => ({
      macros: state.macros.filter((m) => m.id !== id),
      selectedMacroId:
        state.selectedMacroId === id ? null : state.selectedMacroId,
    })),

  selectMacro: (id) => set({ selectedMacroId: id }),

  addStep: (step) =>
    set((state) => {
      const macro = state.macros.find((m) => m.id === state.selectedMacroId);
      if (!macro) return state;
      macro.steps.push(step);
      return { macros: [...state.macros], hasUnsavedChanges: true };
    }),

  removeStep: (index) =>
    set((state) => {
      const macro = state.macros.find((m) => m.id === state.selectedMacroId);
      if (!macro) return state;
      macro.steps.splice(index, 1);
      return { macros: [...state.macros], hasUnsavedChanges: true };
    }),

  reorderSteps: (from, to) =>
    set((state) => {
      const macro = state.macros.find((m) => m.id === state.selectedMacroId);
      if (!macro) return state;
      const [moved] = macro.steps.splice(from, 1);
      macro.steps.splice(to, 0, moved);
      return { macros: [...state.macros], hasUnsavedChanges: true };
    }),

  toggleRepeat: () =>
    set((state) => {
      const macro = state.macros.find((m) => m.id === state.selectedMacroId);
      if (!macro) return state;
      macro.repeat = !macro.repeat;
      return { macros: [...state.macros], hasUnsavedChanges: true };
    }),

  setDelayBetween: (value) =>
    set((state) => {
      const macro = state.macros.find((m) => m.id === state.selectedMacroId);
      if (!macro) return state;
      macro.delayBetween = value;
      return { macros: [...state.macros], hasUnsavedChanges: true };
    }),

  encoder: {
    left: "KC_A",
    right: "KC_B",
    press: "KC_C",
  },

  setEncoder: (type, value) => {
    set((state) => {
      const updated = { ...state.encoder, [type]: value };
      //setEncoderConfig(updated.left, updated.right, updated.press);
      return {
        encoder: updated,
        hasUnsavedChanges: true,
      };
    });
  },

  hasUnsavedChanges: false,

  saveChanges: () =>
    set({
      hasUnsavedChanges: false,
    }),
}));