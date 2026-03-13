// App.jsx
// Root application component. Currently serves as a Tailwind CSS test scaffold.
// GTMPageView is mounted here to fire Google Tag Manager page view events.

import {GTMPageView} from './components/gtag'

function App() {

  return (
    <>
    {/* Fire GTM page view on mount */}
    <GTMPageView/>
    <div className="h-screen bg-red-500 text-white flex items-center justify-center">
      <h1 className="text-4xl font-bold">Tailwind Test</h1>
    </div>
    </>
  );
}
export default App;
