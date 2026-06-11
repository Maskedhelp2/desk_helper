import { useDeviceStore } from "../store/deviceStore";
import { useState } from "react";

export default function Profiles() {
  const {
    profiles,
    currentProfile,
    createProfile, // ✅ FIXED
    deleteProfile,
    duplicateProfile,
    renameProfile,
    loadProfile,
    exportProfile,
    importProfile,
  } = useDeviceStore();

  const [newName, setNewName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <div className="space-y-6 relative z-50">

      {/* TOP */}
      <div className="flex gap-3 items-center">
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-500 px-3 py-1 rounded"
        >
          New Profile
        </button>

        <input
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
              const json = JSON.parse(reader.result as string);
              importProfile(json);
            };
            reader.readAsText(file);
          }}
        />
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 gap-4">
  {profiles.length === 0 ? (
    <div className="col-span-2 text-center text-gray-400 mt-10">
      <p className="text-lg">No profiles found</p>
      <p className="text-sm mt-2">
        Create a profile to save key layouts
      </p>
    </div>
  ) : (
    profiles.map((p) => (
      <div key={p.id} className="bg-gray-800 p-4 rounded-xl relative">

        {/* NAME */}
        {editingId === p.id ? (
          <input
            autoFocus
            value={p.name}
            onChange={(e) => renameProfile(p.id, e.target.value)}
            onBlur={() => setEditingId(null)}
            className="bg-gray-700 px-2 py-1 rounded w-full"
          />
        ) : (
          <h3 className="text-lg font-semibold">
            {p.name} {currentProfile === p.id && "(Active)"}
          </h3>
        )}

        <p className="text-sm text-gray-400">
          Layers: {p.keymaps?.length || 0}
        </p>

        {/* BUTTONS */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => loadProfile(p.id)}
            className="bg-green-600 px-2 py-1 rounded"
          >
            Load
          </button>

          <button
            onClick={() => deleteProfile(p.id)}
            className="bg-red-600 px-2 py-1 rounded"
          >
            Delete
          </button>
        </div>

        {/* MENU */}
        <button
          onClick={() =>
            setMenuOpen(menuOpen === p.id ? null : p.id)
          }
          className="absolute top-2 right-2"
        >
          ⋮
        </button>

        {menuOpen === p.id && (
          <div className="absolute right-2 top-8 bg-gray-700 p-2 rounded z-10">
            <div onClick={() => setEditingId(p.id)}>Rename</div>
            <div onClick={() => duplicateProfile(p.id)}>Duplicate</div>
            <div onClick={() => exportProfile(p.id)}>Export</div>
            <div onClick={() => deleteProfile(p.id)}>Delete</div>
          </div>
        )}
      </div>
    ))
  )}
</div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
          <div className="bg-gray-800 p-6 rounded-xl w-80">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Profile name"
              className="w-full p-2 rounded bg-gray-700 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button
                onClick={() => {
                  if (!newName) return;
                  createProfile(newName); // ✅ FIXED
                  setNewName("");
                  setShowModal(false);
                }}
                className="bg-blue-500 px-3 py-1 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}