import { useDeviceStore } from "../store/deviceStore";
import { keyCategories } from "../data/keyCategories";

function Encoder() {
  const {
    encoder,
    setEncoder,
    layers,
    currentLayer,
    setLayer,
  } = useDeviceStore();

  const options = Object.values(keyCategories).flat();

  return (
    <div className="w-full max-w-md space-y-6">

      {/* 🔥 Layer Selector */}
      <div className="flex gap-2">
        {layers.map((layer, i) => (
          <button
            key={i}
            onClick={() => setLayer(i)}
            className={`px-3 py-1 rounded ${
              currentLayer === i
                ? "bg-blue-500"
                : "bg-gray-700"
            }`}
          >
            {layer}
          </button>
        ))}
      </div>

      <h2 className="text-lg font-semibold">Encoder Settings</h2>

      {["left", "right", "press"].map((type) => (
        <div key={type}>
          <p className="text-sm text-gray-400 capitalize mb-1">
            {type === "left"
              ? "Rotate Left"
              : type === "right"
              ? "Rotate Right"
              : "Press"}
          </p>

          <select
            className="w-full p-2 bg-gray-700 rounded"
            value={encoder[type as keyof typeof encoder]}
            onChange={(e) =>
              setEncoder(type as any, e.target.value)
            }
          >
            {options.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
      ))}

    </div>
  );
}

export default Encoder;