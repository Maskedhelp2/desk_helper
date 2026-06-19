import { useState } from "react";
import { useDeviceStore } from "../store/deviceStore";
import {
  rebootAndFlash,
} from "../utils/backend";
import { toast } from "react-hot-toast/headless";

const steps = [
  "Sending reset...",
  "Waiting for bootloader...",
  "Copying firmware...",
  "Reconnecting...",
  "Done!",
];

function Firmware() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState("");

  const deviceVersion = "v1.0.0";
  const appVersion = "v1.1.0";

  const startFlash = async () => {
    try {
      setIsFlashing(true);
      setProgress(0);
      setCurrentStep(0);
      setCurrentStep(0);
      setProgress(20);
      const firmwarePath =
        "/path/to/firmware.uf2";
      setCurrentStep(1);
      setProgress(40);
      await rebootAndFlash(firmwarePath);
      setCurrentStep(2);
      setProgress(70);
      setCurrentStep(3);
      setProgress(90);
      setCurrentStep(4);
      setProgress(100);
    } catch (err) {
      console.error(err);
      toast.error("No bootloader device found");
    } finally {
      setIsFlashing(false);
    }
    };

  const handleFactoryReset = () => {
    if (resetInput !== "RESET") return alert("Type RESET correctly");

    alert("Device reset successfully!");
    setShowResetConfirm(false);
    setResetInput("");
  };

  return (
    <div className="space-y-6 max-w-lg">

      {/* 🔹 VERSION INFO */}
      <div className="bg-gray-800 p-4 rounded-xl space-y-2">
        <p>Device Firmware: {deviceVersion}</p>

        <p className="flex items-center gap-2">
          App Firmware: {appVersion}
          {appVersion > deviceVersion && (
            <span className="bg-yellow-500 text-black px-2 py-0.5 text-xs rounded">
              Update Available
            </span>
          )}
        </p>
      </div>

      {/* 🔥 FLASH BUTTON */}
      <button
        onClick={startFlash}
        disabled={isFlashing}
        className="bg-blue-600 px-4 py-2 rounded w-full"
      >
        {isFlashing ? "Flashing..." : "Flash Firmware"}
      </button>

      {/* 📊 PROGRESS */}
      {isFlashing && (
        <div className="space-y-3">
          <div className="w-full bg-gray-700 h-4 rounded">
            <div
              className="bg-green-500 h-4 rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm text-gray-300">
            {steps[currentStep]}
          </p>
        </div>
      )}

      {/* ⚠️ DANGER ZONE */}
      <div className="bg-red-900/40 p-4 rounded-xl space-y-3">
        <h3 className="text-red-400 font-semibold">
          Danger Zone
        </h3>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="bg-red-600 px-3 py-2 rounded"
        >
          Factory Reset
        </button>
      </div>

      {/* 🧨 CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-xl space-y-4">
            <p>
              This will wipe all your settings.<br />
              Type <b>RESET</b> to confirm.
            </p>

            <input
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              className="bg-gray-700 p-2 rounded w-full"
            />

            <div className="flex gap-2">
              <button
                onClick={handleFactoryReset}
                className="bg-red-600 px-3 py-2 rounded"
              >
                Confirm
              </button>

              <button
                onClick={() => setShowResetConfirm(false)}
                className="bg-gray-600 px-3 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Firmware;