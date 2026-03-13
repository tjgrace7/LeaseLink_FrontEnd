// main.jsx
// Application entry point. Sets up routing, auth context, and Google reCAPTCHA provider.
// All protected routes require an active Supabase session via ProtectedRoute.

import './utilities/logCollector'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';


import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import TenantPage from './pages/TenantPage'
import ChatPage from './pages/ChatPage'
import SignIn from './pages/Sign-In';
import RequestAccess from './pages/Access-Request';
import ContactPage from './pages/Contact';

import PropertyPage from './pages/PropertyPage'
import UnitPage from './pages/UnitPage';
import CreateUnitProperty from './pages/CreateUnit'
import CreatePerson from './pages/CreatePerson'
import ManagingOwner from './pages/ManagingOwner'
import UploadLeases from './pages/UploadLeases'
import UserProfile from './pages/UserProfile';

import Spinner from './components/loadingSpinner'

import {AuthProvider, useAuth} from './components/AuthProvider'
import ThankYou from './pages/thank-you';
import Settings from './pages/settings';
import Roles from './pages/Roles';
import TenantTerms from './pages/tenantTerms';
import LeaseLinkDashboard from './pages/LeaseLinkDashboard';
import CreateCompanies from './pages/createCompany';
import Home from './pages/Home';
import Privacy from './pages/Privacy';
import TermsAndConditions from './pages/Terms';
import LinkedInLanding from './pages/LandingPage';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import LinkedInLanding2 from './pages/LandingPage2';
import InviteComplete from './pages/changePassword';

import { useLocation } from 'react-router-dom';
import IntegrationsResponsePage from './pages/Integrations';
import SpecialAccess from './pages/specialAccess';
import CheckEmail from './pages/checkEmail';
import ForgotPassword from './pages/ForgotPassword';

// Guards a route behind authentication.
// - Shows a spinner while the session is loading (undefined).
// - Allows the page to render if a Supabase ?code= param is present (invite/password-reset flow).
// - Redirects unauthenticated users to /login.
const ProtectedRoute = ({ children}) => {
  const auth = useAuth();
  const location = useLocation();

  // Let the password-reset/invite page load if a supabase code is present.
  const hasCode = new URLSearchParams(location.search).get("code");

  if (auth.session === undefined) return <Spinner />;

  // If no session yet but we have a code, allow the page to render
  // so it can call exchangeCodeForSession on mount.
  if (!auth.session && hasCode) return children;

  return auth.session ? children : <Navigate to="/login" replace />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  // Wrap everything in Google reCAPTCHA v3 so any child can call useGoogleReCaptcha()
  <GoogleReCaptchaProvider
    reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
    scriptProps={{async: true, defer: true}}>
  <React.StrictMode>
    <BrowserRouter>
      {/* AuthProvider supplies session/user context to the entire tree */}
      <AuthProvider>
        <Routes>
          {/* Public routes — accessible without login */}
          <Route path='/' element={<Home/>}/>
          <Route path='/login' element={<SignIn/>}/>
          <Route path="/request" element={<RequestAccess/>}/>
          <Route path='/thank-you' element={<ThankYou/>}/>
          <Route path='/forgot-password' element={<ForgotPassword/>}/>
          <Route path='check-email' element={<CheckEmail/>}/>

          <Route path='/privacy_policy' element={<Privacy/>}/>
          <Route path='/terms' element={<TermsAndConditions/>}/>
          <Route path='/linkedin/1' element={<LinkedInLanding/>}/>
          <Route path='/linkedin/2' element={<LinkedInLanding2/>}/>

          {/* Invite completion — protected but allows Supabase ?code= param */}
          <Route path='/auth/invite-complete' element={<ProtectedRoute><InviteComplete/></ProtectedRoute>}/>

          {/* OAuth integration callback — handled without Layout shell */}
          <Route path='/settings/integrations' element={<IntegrationsResponsePage/>}/>

          {/* Authenticated app shell — all nested routes render inside Layout */}
          <Route path="/" element={<Layout />}>
            <Route path="dashboard" index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

            <Route path='/property/:property_id' element={<ProtectedRoute><PropertyPage /></ProtectedRoute>}/>
            <Route path='/unit/:unit_id' element={<ProtectedRoute><UnitPage /></ProtectedRoute>} />
            <Route path='/tenant/:tenant_id' element={<ProtectedRoute><TenantPage /></ProtectedRoute>}/>
            <Route path='/create_building' element={<ProtectedRoute><CreateUnitProperty/></ProtectedRoute>}/>
            <Route path='/edit_building/:id' element={<ProtectedRoute><CreateUnitProperty/></ProtectedRoute>}/>
            <Route path='/create_person' element={<ProtectedRoute><CreatePerson/></ProtectedRoute>}/>
            <Route path='/edit_person/:id' element={<ProtectedRoute><CreatePerson/></ProtectedRoute>}/>
            <Route path='/owner/:owner_id' element={<ProtectedRoute><ManagingOwner/></ProtectedRoute>}/>
            <Route path='/contact/:contact_id' element={<ProtectedRoute><ContactPage/></ProtectedRoute>}/>
            <Route path='/upload_docs' element={<ProtectedRoute><UploadLeases/></ProtectedRoute>}/>
            <Route path='/profile' element={<ProtectedRoute><UserProfile /></ProtectedRoute>}/>
            <Route path='/settings' element={<ProtectedRoute><Settings/></ProtectedRoute>}/>
            <Route path='/roles' element={<ProtectedRoute><Roles/></ProtectedRoute>}/>
            <Route path='/roles/edit/:roleId' element={<ProtectedRoute><Roles/></ProtectedRoute>}/>
            <Route path='/terms/:tenant_id' element={<ProtectedRoute><TenantTerms/></ProtectedRoute>}/>
            <Route path='/admindashboard' element={<ProtectedRoute><LeaseLinkDashboard/></ProtectedRoute>}/>
            <Route path='/create_company' element={<ProtectedRoute><CreateCompanies/></ProtectedRoute>}/>

            <Route path='/special-access' element={<ProtectedRoute><SpecialAccess/></ProtectedRoute>}/>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
  </GoogleReCaptchaProvider>
);
