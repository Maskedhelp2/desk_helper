import { useDeviceStore } from "../store/deviceStore";
import Key from "../components/Key";
import KeySettings from "../components/KeySettings";

function Keymap() {
  const {
    currentLayer,
    profiles,
    currentProfile,
    setLayer,
  } = useDeviceStore();

  const profile = profiles.find(
    (p) => p.id === currentProfile
  );

  if (!profile) {
    return <div>No profile found</div>;
  }

  return (
    <div className="flex gap-6">

      {/* LEFT SIDE */}
      <div className="flex-1 bg-gray-900 rounded-2xl p-6 min-h-[700px]">

        {/* LAYERS */}
        <div className="flex gap-3 mb-8">
          {[0, 1, 2, 3, 4].map((layer) => (
            <button
              key={layer}
              onClick={() => setLayer(layer)}
              className={`px-5 py-2 rounded-lg font-medium transition-all ${
                currentLayer === layer
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Layer {layer}
            </button>
          ))}
        </div>

        {/* HARDWARE LAYOUT */}
        <div className="relative w-[760px] h-[560px] mx-auto">

          {/* ENCODER */}
          <div className="absolute left-[170px] top-[20px]">
            <div className="w-16 h-16 rounded-full bg-red-500 border-4 border-red-400 shadow-lg" />
          </div>
          
          {/* PROFILE SELECT */}
<div className="absolute right-[170px] top-[20px]">
  <select
    value={currentProfile}
    onChange={(e) =>
      useDeviceStore
        .getState()
        .setCurrentProfile(e.target.value)
    }
    className="
      w-16 h-16
      rounded-2xl
      bg-purple-600
      border-4 border-purple-400
      text-white
      font-bold
      text-sm
      text-center
      shadow-lg
      cursor-pointer
      outline-none
    "
  >
    {profiles.map((profile) => (
      <option
        key={profile.id}
        value={profile.id}
      >
        {profile.name}
      </option>
    ))}
  </select>
</div>

          {/* TOP ROW */}
          <div className="absolute left-[210px] top-[120px] grid grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Key
                key={i}
                index={i}
                currentLayer={currentLayer}
              />
            ))}
          </div>

          {/* SECOND ROW */}
          <div className="absolute left-[210px] top-[200px] grid grid-cols-5 gap-3">
            {[5, 6, 7, 8, 9].map((i) => (
              <Key
                key={i}
                index={i}
                currentLayer={currentLayer}
              />
            ))}
          </div>

          {/* CENTER PINK ROW */}
          <div className="absolute left-[290px] top-[300px] grid grid-cols-3 gap-3">
            {[10, 11, 12].map((i) => (
              <Key
                key={i}
                index={i}
                currentLayer={currentLayer}
              />
            ))}
          </div>

          {/* LEFT WING */}
          <div className="absolute left-[150px] top-[360px] flex flex-col gap-4 rotate-[25deg]">
            {[13, 14].map((i) => (
              <Key
                key={i}
                index={i}
                currentLayer={currentLayer}
              />
            ))}
          </div>

          {/* RIGHT WING */}
          <div className="absolute right-[150px] top-[360px] flex flex-col gap-4 rotate-[-25deg]">
            {[15, 16].map((i) => (
              <Key
                key={i}
                index={i}
                currentLayer={currentLayer}
              />
            ))}
          </div>

        </div>
      </div>

      {/* RIGHT SETTINGS PANEL */}
      <div className="w-[320px] bg-gray-900 rounded-2xl p-6">
        <KeySettings />
      </div>

    </div>
  );
}

export default Keymap;