import { useState } from "react";

type Props = {
  onAccept: () => void;
};

export default function TermsModal({
  onAccept,
}: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white w-[700px] max-w-[90vw] rounded-xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">
          Terms & Conditions
        </h2>

        <div className="h-64 overflow-y-auto bg-gray-800 p-4 rounded">
          <p className="mb-3">
            By using this software, you acknowledge and agree to the following:
          </p>

          <ul className="list-disc pl-5 space-y-2">
            <li>
              This software is provided as-is without any warranty.
            </li>

            <li>
              The user is responsible for any configuration changes made to connected hardware.
            </li>

            <li>
              Incorrect firmware flashing or configuration may cause device malfunction.
            </li>

            <li>
              The developers are not liable for any loss of data, damage, or misuse.
            </li>

            <li>
              Usage of this software constitutes acceptance of these terms.
            </li>
          </ul>
        </div>

        <label className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) =>
              setChecked(e.target.checked)
            }
          />

          I have read and agree to the Terms & Conditions.
        </label>

        <div className="flex justify-end mt-4">
          <button
            disabled={!checked}
            onClick={onAccept}
            className={`px-4 py-2 rounded ${
              checked
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}