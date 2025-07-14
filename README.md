LeaseLink App (React + Vite)
LeaseLink is a React-based property management assistant built with Vite. It allows property managers to chat with their lease data using AI, search entities like properties, units, and tenants, and access associated documents through an interactive sidebar and source viewer.

🔧 Tech Stack
Frontend: React + Vite

Backend: Supabase (Database, Auth, Storage, Edge Functions)

AI Integration: OpenAI via custom backend endpoint

Search: Qdrant for vector-based document retrieval

🚀 Features
🔍 Entity Search: Quickly search for properties, tenants, and units

💬 AI Chat Interface: Ask natural language questions about your lease data

📑 Source Viewer: View original document excerpts referenced in chat

💾 Session Persistence: Chats persist across refreshes via localStorage

🔐 Auth & Permissions: Managed via Supabase JWT tokens and RLS

📷 Entity Images: Upload and preview property, tenant, and unit images

🧠 Project Structure
bash
Copy
Edit
src/
│
├── components/          # Reusable UI components (SearchBar, ChatSidebar, etc.)
├── pages/               # Page-level views (ChatPage, Properties, etc.)
├── utilities/           # Helper functions (e.g., get_entity_image, GetMessages)
├── supabaseClient.js    # Supabase client initialization
└── main.jsx             # App entry point with routing
⚙️ Setup
Clone the repo

bash
Copy
Edit
git clone https://github.com/tgraceleaselink/LeaseLink.git
cd LeaseLink
Install dependencies

bash
Copy
Edit
npm install
Set up environment variables

Create a .env file in the root and define:

bash
Copy
Edit
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SERVER_URL=your_backend_server_url
Start the development server

bash
Copy
Edit
npm run dev
🧪 Linting & Formatting
This project uses:

ESLint with React best practices

Prettier for consistent code formatting

You can lint the project with:

bash
Copy
Edit
npm run lint
✅ TODO / Improvements
 Add unit tests for components and utils

 Improve mobile responsiveness

 Add loading state for entity image fetch

 Enable RLS rules for entity_questions table

 Add user-level permissions on entity access

📄 License
MIT

