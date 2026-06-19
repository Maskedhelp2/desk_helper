import { useDeviceStore } from "../store/deviceStore";

type ThemeColor = "blue" | "purple" | "green" | "red";

const colors: { name: string; value: ThemeColor }[] = [
  { name: "Blue", value: "blue" },
  { name: "Purple", value: "purple" },
  { name: "Green", value: "green" },
  { name: "Red", value: "red" },
];

export default function Settings() {
  const {
    themeColor,
    setThemeColor,
    autoSave,
    setAutoSave,
    showKeycodes,
    setShowKeycodes,
    confirmOverwrite,
    setConfirmOverwrite,
  } = useDeviceStore();

  return (
    // ✅ FIX 1: FULL HEIGHT + SCROLL
    <div className="h-full overflow-y-auto px-2">

      {/* ✅ FIX 2: ADD BOTTOM SPACE */}
      <div className="space-y-8 max-w-2xl pb-16">

        {/* ================= APPEARANCE ================= */}
        <div className="bg-gray-800 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold">Appearance</h2>

          <div>
            <p className="text-sm text-gray-400 mb-2">Accent Color</p>

            <div className="flex gap-3">
              {colors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setThemeColor(c.value)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    themeColor === c.value
                      ? "border-white scale-110"
                      : "border-transparent"
                  }`}
                  style={{
                    backgroundColor:
                      c.value === "blue"
                        ? "#3b82f6"
                        : c.value === "purple"
                        ? "#8b5cf6"
                        : c.value === "green"
                        ? "#22c55e"
                        : "#ef4444",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ================= KEYMAP ================= */}
        <div className="bg-gray-800 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold">Keymap Behavior</h2>

          <Toggle label="Auto Save Changes" value={autoSave} onChange={setAutoSave} />
          <Toggle label="Show Keycodes (KC_*)" value={showKeycodes} onChange={setShowKeycodes} />
          <Toggle label="Confirm Before Overwriting Key" value={confirmOverwrite} onChange={setConfirmOverwrite} />
        </div>

        {/* ================= DEVICE ================= */}
        <div className="bg-gray-800 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold">Device</h2>

          <div className="flex justify-between text-sm text-gray-300">
            <span>Status</span>
            <span className="text-green-400">Connected</span>
          </div>

          <button className="bg-gray-700 px-3 py-2 rounded hover:bg-gray-600 transition">
            Refresh Device
          </button>
        </div>

        {/* ================= BACKUP ================= */}
        <div className="bg-gray-800 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold">Backup & Data</h2>

          <button className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 transition">
            Export All Profiles
          </button>

          <label className="block">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const data = JSON.parse(reader.result as string);
                    console.log("Import:", data);
                  } catch {
                    alert("Invalid file");
                  }
                };
                reader.readAsText(file);
              }}
            />

            <div className="bg-gray-700 px-4 py-2 rounded cursor-pointer hover:bg-gray-600 transition">
              Import Profiles
            </div>
          </label>

          <button className="bg-red-600 px-4 py-2 rounded hover:bg-red-500 transition">
            Reset All Data
          </button>
        </div>

        {/* ================= ABOUT ================= */}
        <div className="bg-gray-800 p-5 rounded-xl space-y-2 text-sm text-gray-300">
          <h2 className="text-lg font-semibold">About</h2>
          <p>App Version: v1.1.0</p>
          <p>Firmware: v1.0.0</p>
          <p>Developer: You 😄</p>
        </div>

      </div>
    </div>
  );
}


/* ================= TOGGLE ================= */

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-300">{label}</span>

      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all ${
          value ? "bg-green-500" : "bg-gray-600"
        }`}
      >
        <div
          className={`h-6 w-6 bg-white rounded-full transition-all ${
            value ? "translate-x-6" : ""
          }`}
        />
      </button>
    </div>
  );
}