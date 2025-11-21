export const ShowModal = ({OnClose, selectedSource }) => {
    console.log(selectedSource)
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
          <div className="relative w-full max-w-6xl h-[90vh] my-6 sm:my-10 overflow-hidden rounded-2xl bg-white text-black shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 flex-none">
              <h2 className="text-base sm:text-lg font-semibold truncate pr-4">
                Document Excerpt
              </h2>
              <button
                className="flex-none rounded-md p-1 text-2xl leading-none text-gray-500 hover:text-black hover:bg-gray-100"
                onClick={OnClose}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedSource.highlight_text && (
                <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto max-h-[25%]">
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
                    {selectedSource.highlight_text}
                  </p>
                </div>
              )}
              <div className="flex-1 px-4 sm:px-6 pb-4">
                <div className="w-full h-full overflow-hidden rounded-md border">
                  <iframe
                    src={selectedSource.viewer_url}
                    title="Document Viewer"
                    className="w-full h-full"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
    )
}

export const EmailModal = ({Email, OnClose}) => {
    console.log("Email", Email)
    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
          <div className="relative w-full max-w-6xl h-[90vh] my-6 sm:my-10 overflow-hidden rounded-2xl bg-white text-black shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 flex-none">
              <h2 className="text-base sm:text-lg font-semibold truncate pr-4">
                Document Excerpt
              </h2>
              <button
                className="flex-none rounded-md p-1 text-2xl leading-none text-gray-500 hover:text-black hover:bg-gray-100"
                onClick={OnClose}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto max-h-[25%]">
                    <h2>Sender:</h2>
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
                    {Email.Sender_Name}
                  </p>
                </div>
                <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto max-h-[25%]">
                    <h2>Subject:</h2>
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
                    {Email.subject}
                  </p>
                </div>

                <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto max-h-[25%]">
                    <h2>Body:</h2>
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
                    {Email.body}
                  </p>
                </div>
              
              <div className="flex-1 px-4 sm:px-6 pb-4">
              </div>
            </div>
          </div>
        </div>
    )
}