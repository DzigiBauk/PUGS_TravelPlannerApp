import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import TravelPlanForm from './pages/TravelPlanForm'
import TravelPlanDetails from './pages/TravelPlanDetails'
import PrivateRoute from './components/PrivateRoute'
import SharedTravelPlan from './pages/SharedTravelPlan'
import AdminDashboard from './pages/AdminDashboard'
import AdminRoute from './components/AdminRoute'
import './App.css'

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/shared/:token" element={<SharedTravelPlan />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/plans/new" element={<PrivateRoute><TravelPlanForm /></PrivateRoute>} />
          <Route path="/plans/:id" element={<PrivateRoute><TravelPlanDetails /></PrivateRoute>} />
          <Route path="/plans/:id/edit" element={<PrivateRoute><TravelPlanForm /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </main>
    </>
  )
}

export default App
