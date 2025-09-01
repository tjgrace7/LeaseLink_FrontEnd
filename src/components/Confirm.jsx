const ConfirmPopUp = ({ title, message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
    <div className="relative w-full max-w-md rounded-2xl bg-white text-black shadow-2xl p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <p className="text-sm text-gray-700 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500"
        >
          Yes, I’m Sure
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmPopUp;