import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import TenantPage from './pages/TenantPage'
import ChatPage from './pages/ChatPage'
import SignIn from './pages/Sign-In';

import PropertyPage from './pages/PropertyPage'
import UnitPage from './pages/UnitPage';
import CreateUnitProperty from './pages/CreateUnit'
import CreatePerson from './pages/CreatePerson'
import ManagingOwner from './pages/ManagingOwner'
import UploadLeases from './pages/UploadLeases'

import Spinner from './components/loadingSpinner'

import {AuthProvider, useAuth} from './components/AuthProvider'

const ProtectedRoute = ({ children}) => {
  const auth = useAuth();
  if (auth.session === undefined) return <Spinner />; // wait until session loads
  return auth.session ? children : <Navigate to="/login" replace/>;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path='/login' element={<SignIn/>}/>
          <Route path="/" element={<Layout />}>
            <Route path="dashboard" index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

            <Route path='/property/:property_id' element={<ProtectedRoute><PropertyPage /></ProtectedRoute>}/>
            <Route path='/unit/:unit_id' element={<ProtectedRoute><UnitPage /></ProtectedRoute>} />
            <Route path='/tenant/:tenant_id' element={<ProtectedRoute><TenantPage /></ProtectedRoute>}/>
            <Route path='/create_unit' element={<ProtectedRoute><CreateUnitProperty/></ProtectedRoute>}/>
            <Route path='/create_person' element={<ProtectedRoute><CreatePerson/></ProtectedRoute>}/>
            <Route path='/owner/:owner_id' element={<ProtectedRoute><ManagingOwner/></ProtectedRoute>}/>
            <Route path='/upload_docs' element={<ProtectedRoute><UploadLeases/></ProtectedRoute>}/>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

