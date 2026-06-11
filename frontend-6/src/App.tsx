import { useDeviceStore } from "./store/deviceStore";
import { Routes, Route, useLocation } from "react-router-dom";
import { keyCategories } from "./data/keyCategories";
import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import StatusBar from "./components/StatusBar";

import Keymap from "./screens/Keymap";
import Encoder from "./screens/Encoder";
import Macros from "./screens/Macros";
import Profiles from "./screens/Profiles";
import Firmware from "./screens/Firmware";
import Settings from "./screens/Settings";

function App() {
  const location = useLocation();

  const {
    currentLayer,
    selectedKey,
    setKey,
    setLayer,
    connected,
    currentProfile,
    profiles,
    macros,
    connect,
    deviceName,
    isLoading,
    setLoading,
    hasUnsavedChanges,
    saveToDevice,
    isSaving,
    error,
  } = useDeviceStore();

  const profileObj = profiles.find((p) => p.id === currentProfile);
  const profileName = profileObj?.name || currentProfile;

  const { fetchFromDevice } = useDeviceStore();

  const { themeColor } = useDeviceStore();

  const themeStyles = {
  blue: {
    bg: "bg-blue-500",
    hover: "hover:bg-blue-600",
    border: "border-blue-500",
    ring: "focus:ring-blue-500",
    text: "text-blue-400",
  },
  purple: {
    bg: "bg-purple-500",
    hover: "hover:bg-purple-600",
    border: "border-purple-500",
    ring: "focus:ring-purple-500",
    text: "text-purple-400",
  },
  green: {
    bg: "bg-green-500",
    hover: "hover:bg-green-600",
    border: "border-green-500",
    ring: "focus:ring-green-500",
    text: "text-green-400",
  },
  red: {
    bg: "bg-red-500",
    hover: "hover:bg-red-600",
    border: "border-red-500",
    ring: "focus:ring-red-500",
    text: "text-red-400",
  },
};

const theme = themeStyles[themeColor];

const keymap =
  profiles.find((p) => p.id === currentProfile)
    ?.keymaps[currentLayer] || [];

  const selectedValue =
    selectedKey !== null ? keymap[selectedKey] || "KC_NO" : "";

  const [activeTab, setActiveTab] =
    useState<keyof typeof keyCategories>("standard");

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const menuItems = [
    { name: "Keymap", path: "/" },
    { name: "Encoder", path: "/encoder" },
    { name: "Macros", path: "/macros" },
    { name: "Profiles", path: "/profiles" },
    { name: "Firmware", path: "/firmware" },
    { name: "Settings", path: "/settings" },
  ];

  // 🔥 HANDLE NAVIGATION (NEW)
  const handleNavigation = (path: string) => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
      setPendingNavigation(path);
    } else {
      navigate(path);
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
  fetchFromDevice();
}, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [setLoading]);

  // ERROR TOAST
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // BEFORE UNLOAD WARNING
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;

      e.preventDefault();
      (e as any).returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // CTRL + S
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }
      // 💾 SAVE (Ctrl + S)
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        if (!isSaving) {
          await saveToDevice();
        }
      }
      // 💾 FORCE SAVE (Ctrl + Shift + S)
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && e.shiftKey) {
        e.preventDefault();
        await saveToDevice();
      }
      // ❌ ESC — close modals
      if (e.key === "Escape") {
        setShowUnsavedModal(false);
        setShowResetConfirm(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [saveToDevice, isSaving]);

  const getDescription = () => {
    if (!selectedValue || selectedValue === "KC_NO") {
      return "No action assigned";
    }

    if (selectedValue.startsWith("KC_")) {
      return "Standard key input";
    }

    if (selectedValue.startsWith("MACRO_")) {
      const id = selectedValue.replace("MACRO_", "");
      const macro = macros?.find((m: any) => m.id.toString() === id);
      return macro ? `Runs ${macro.name}` : "Runs macro";
    }

    if (selectedValue.startsWith("MO_") || selectedValue.startsWith("TO_")) {
      return "Layer switching action";
    }

    return "Custom action";
  };
  const layers = [0, 1, 2, 3, 4];

  return (
  <>
    <Toaster position="top-right" />
    <StatusBar />

    {hasUnsavedChanges && (
      <div className="bg-yellow-500 text-black px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-medium">
          ⚠ You have unsaved changes
        </span>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              await saveToDevice();
            }}
            className="bg-black text-white px-3 py-1 rounded"
          >
            Save
          </button>

          <button
            onClick={() => window.location.reload()}
            className="bg-gray-800 text-white px-3 py-1 rounded"
          >
            Discard
          </button>
        </div>
      </div>
    )}

    <div className="flex h-screen bg-gray-900 text-white">

      {/* SIDEBAR */}
      <div className="w-64 bg-gray-800 p-5 flex flex-col justify-between">
        <div>
          <h1 className="text-lg font-bold mb-6">Numpad Configurator</h1>

          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <li key={item.name}>
                  <div
                    onClick={() => handleNavigation(item.path)}
                    className={`px-3 py-2 rounded-lg cursor-pointer ${
                      isActive
                        ? `${theme.bg} text-white`
                        : "hover:bg-gray-700 text-gray-300"
                    }`}
                  >
                    {item.name}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="bg-gray-700 p-3 rounded-lg text-sm">
          <p className={connected ? "text-green-400" : "text-red-400"}>
            ● {connected ? "Connected" : "Disconnected"}
          </p>
          <p className="text-gray-400 mt-1">Firmware v1.0</p>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}
        <div className="h-14 flex items-center justify-between px-4 bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                connected ? "bg-green-400 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-sm">
              {connected ? deviceName : "No device found"}
            </span>

            {!connected && (
              <button
                onClick={connect}
                className="ml-3 px-3 py-1 text-sm bg-blue-500 rounded"
              >
                Reconnect
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm">Profile: {profileName}</span>
            <span className="text-sm">Layer: {currentLayer}</span>

            <button
              onClick={async () => {
                await saveToDevice();
              }}
              disabled={!hasUnsavedChanges || isSaving}
              className={`px-6 py-2 rounded-xl font-semibold transition-all
                ${
                  hasUnsavedChanges
                    ? "bg-yellow-500 text-black animate-pulse"
                    : `${theme.bg} ${theme.hover} text-white`
                }
                ${isSaving ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* LAYERS */}
        <div className="flex gap-3 p-4">
          {layers.map((layer) => (
            <button
              key={layer}
              onClick={() => setLayer(layer)}
              className={`px-4 py-1 rounded ${
                currentLayer === layer
                  ? `${theme.bg} text-white`
                  : "bg-gray-700"
              }`}
            >
              Layer {layer}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex flex-1 gap-6 p-6 overflow-hidden">

          {/* LEFT SCREEN */}
          <div className="flex-1 bg-white/5 rounded-2xl p-6 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Keymap />} />
              <Route path="/encoder" element={<Encoder />} />
              <Route path="/profiles" element={<Profiles />} />
              <Route path="/macros" element={<Macros />} />
              <Route path="/firmware" element={<Firmware />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>

          {/* RIGHT PANEL (ONLY FOR KEYMAP) */}
          {location.pathname === "/" && (
            <div className="w-80 bg-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Key Settings</h2>

              {selectedKey !== null && (
                <>
                  <div className="flex gap-2 mb-4">
                    {["standard", "media", "macro", "layer"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-3 py-1 rounded text-sm ${
                          activeTab === tab
                            ? `${theme.bg} text-white`
                            : "bg-gray-700"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <select
                    className={`w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 ${theme.ring}`}
                    value={selectedValue}
                    onChange={(e) =>
                      setKey(currentLayer, selectedKey, e.target.value)
                    }
                  >
                    {activeTab === "macro"
  ? macros.map((m: any, index: number) => (
      <option
        key={m.id}
        value={`MACRO_${m.id}`}
      >
        M{index + 1}
      </option>
    ))
  : (keyCategories[activeTab] || []).map((k) => (
      <option key={k} value={k}>
        {k}
      </option>
    ))}
                  </select>

                  <p className="text-sm text-gray-400 mt-3">
                    {getDescription()}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* UNSAVED MODAL */}
    {showUnsavedModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-6 rounded-xl w-[320px]">
          <h2 className="text-lg font-semibold mb-2">
            Unsaved Changes
          </h2>

          <p className="text-sm text-gray-400 mb-4">
            You have unsaved changes.
          </p>

          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 bg-gray-700 rounded"
              onClick={() => {
                setShowUnsavedModal(false);
                if (pendingNavigation) {
                  navigate(pendingNavigation);
                }
              }}
            >
              Discard
            </button>

            <button
              onClick={async () => {
                await saveToDevice();
                setShowUnsavedModal(false);
                if (pendingNavigation) {
                  navigate(pendingNavigation);
                  setPendingNavigation(null);
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}
export default App;
