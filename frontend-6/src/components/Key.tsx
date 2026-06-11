import { useDeviceStore } from "../store/deviceStore";

type Props = {
  index: number;
  currentLayer: number;
};

function Key({ index, currentLayer }: Props) {
  const {
    profiles,
    currentProfile,
    selectedKey,
    setSelectedKey,
    macros,
    themeColor,
    showKeycodes,
  } = useDeviceStore();

  const profile = profiles.find(
    (p) => p.id === currentProfile
  );

  const label =
    profile?.keymaps?.[currentLayer]?.[index] ||
    "KC_NO";

  const themeStyles = {
    blue: {
      ring: "ring-blue-500",
    },
    purple: {
      ring: "ring-purple-500",
    },
    green: {
      ring: "ring-green-500",
    },
    red: {
      ring: "ring-red-500",
    },
  };

  const theme =
    themeStyles[
      themeColor as keyof typeof themeStyles
    ];

  // Just select the key — hardware write happens in deviceStore.setKey()
  const handleClick = () => {
    setSelectedKey(index);
  };

  const isSelected =
    selectedKey === index;

  const displayLabel = (() => {
    if (label.startsWith("MACRO_")) {
      const id = label.replace(
        "MACRO_",
        ""
      );

      const macro = macros.find(
        (m: any) =>
          m.id.toString() === id
      );

      return macro
        ? macro.name
        : "Macro";
    }

    return showKeycodes
      ? label
      : label.replace("KC_", "");
  })();

  return (
    <button
      onClick={handleClick}
      className={`
        w-14 h-14 rounded-xl text-sm font-medium
        transition-all duration-200
        flex items-center justify-center

        ${
          isSelected
            ? `ring-2 ${theme.ring} scale-105 shadow-lg`
            : ""
        }

        ${
          label.startsWith("MACRO_")
            ? "bg-gradient-to-br from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400"
            : "bg-gray-800 hover:bg-gray-700"
        }

        active:scale-95
      `}
    >
      {displayLabel}
    </button>
  );
}

export default Key;