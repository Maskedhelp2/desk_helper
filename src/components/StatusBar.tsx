import { useEffect, useState } from "react";
import { useDeviceStore } from "../store/deviceStore";

function StatusBar() {
  const { connected, deviceName, lastSyncTime } = useDeviceStore();
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastSyncTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-white/10">

      {/* LEFT */}
      <div className="flex items-center gap-3">

        {/* 🔴🟢 STATUS DOT */}
        <div
          className={`w-3 h-3 rounded-full ${
            connected ? "bg-green-400 animate-pulse" : "bg-red-500"
          }`}
        />

        {/* DEVICE NAME */}
        <span className="text-sm text-gray-200">
          {connected ? deviceName : "No device"}
        </span>

        {/* LAST SYNC */}
        {connected && (
          <span className="text-xs text-gray-400">
            • Last sync: {secondsAgo}s ago
          </span>
        )}
      </div>

    </div>
  );
}

export default StatusBar;