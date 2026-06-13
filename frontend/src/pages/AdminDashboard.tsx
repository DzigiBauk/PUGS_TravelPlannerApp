import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import type { User, UserRole } from '../models/User';
import type { AdminTravelPlan } from '../models/TravelPlan';
import { authService } from '../services/authService';
import { travelPlanService } from '../services/travelPlanService';
import { getApiErrorMessage } from '../utils/apiError';
import SuccessMessage from '../components/SuccessMessage';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<AdminTravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(
    (location.state as { success?: string } | null)?.success ?? '',
  );

  const dismissSuccess = () => {
    setSuccess('');
    navigate('/admin', { replace: true, state: null });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, planData] = await Promise.all([
        authService.getAllUsers(),
        travelPlanService.getAdminTravelPlans(),
      ]);
      setUsers(userData);
      setPlans(planData);
      setError('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not load the admin console.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      authService.getAllUsers(),
      travelPlanService.getAdminTravelPlans(),
    ])
      .then(([userData, planData]) => {
        if (cancelled) return;
        setUsers(userData);
        setPlans(planData);
        setError('');
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not load the admin console.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateRole = async (user: User, role: UserRole) => {
    if (user.role === role) return;
    const action = role === 'Admin' ? 'promote' : 'demote';
    if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) return;

    try {
      setBusyKey(`role-${user.id}`);
      setError('');
      setSuccess('');
      const updatedUser = await authService.updateUserRole(user.id, role);
      setUsers(current => current.map(item => item.id === updatedUser.id ? updatedUser : item));
      setSuccess(`${updatedUser.name} now has the ${updatedUser.role} role.`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not update the user role.'));
    } finally {
      setBusyKey('');
    }
  };

  const deleteUser = async (user: User) => {
    if (!confirm(`Delete ${user.name} and all travel plans owned by this account?`)) return;

    try {
      setBusyKey(`user-${user.id}`);
      setError('');
      setSuccess('');
      await authService.deleteUser(user.id);
      setUsers(current => current.filter(item => item.id !== user.id));
      setPlans(current => current.filter(plan => plan.userId !== user.id));
      setSuccess(`${user.name}'s account and travel plans were deleted.`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not delete the user.'));
    } finally {
      setBusyKey('');
    }
  };

  const deletePlan = async (plan: AdminTravelPlan) => {
    if (!confirm(`Delete the travel plan "${plan.name}"?`)) return;

    try {
      setBusyKey(`plan-${plan.id}`);
      setError('');
      setSuccess('');
      await travelPlanService.deleteAdminTravelPlan(plan.id);
      setPlans(current => current.filter(item => item.id !== plan.id));
      setSuccess(`Travel plan "${plan.name}" was deleted.`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not delete the travel plan.'));
    } finally {
      setBusyKey('');
    }
  };

  if (loading) return <div className="loading">Loading admin console...</div>;

  return (
    <div className="admin-page">
      <div className="dashboard-header">
        <div>
          <h1>Admin console</h1>
          <p className="admin-subtitle">Manage accounts, roles, and travel-plan content.</p>
        </div>
        <button className="btn-secondary" onClick={() => void loadData()}>Refresh</button>
      </div>

      {error && <div className="error-message">{error}</div>}
      <SuccessMessage message={success} onDismiss={dismissSuccess} />

      <div className="admin-stats">
        <div><strong>{users.length}</strong><span>users</span></div>
        <div><strong>{users.filter(user => user.role === 'Admin').length}</strong><span>admins</span></div>
        <div><strong>{plans.length}</strong><span>travel plans</span></div>
      </div>

      <section className="admin-section">
        <div className="section-header">
          <h2>User accounts</h2>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const isCurrentUser = user.id === currentUser?.id;
                const isBusy = busyKey === `role-${user.id}` || busyKey === `user-${user.id}`;
                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      {isCurrentUser && <span className="admin-you">You</span>}
                    </td>
                    <td>{user.email}</td>
                    <td><span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span></td>
                    <td className="actions-cell">
                      <button
                        className="btn-sm btn-secondary"
                        disabled={isBusy || isCurrentUser}
                        onClick={() => void updateRole(user, user.role === 'Admin' ? 'User' : 'Admin')}
                      >
                        {user.role === 'Admin' ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        className="btn-sm btn-danger"
                        disabled={isBusy || isCurrentUser}
                        onClick={() => void deleteUser(user)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-header">
          <h2>Travel-plan content</h2>
        </div>
        {plans.length === 0 ? (
          <div className="empty-state"><p>No travel plans exist.</p></div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Owner ID</th>
                  <th>Dates</th>
                  <th>Budget</th>
                  <th>Expenses</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id}>
                    <td><strong>{plan.name}</strong></td>
                    <td>{plan.userId}</td>
                    <td>{formatDate(plan.startDate)} to {formatDate(plan.endDate)}</td>
                    <td>{formatMoney(plan.budget)}</td>
                    <td>{formatMoney(plan.totalExpenses)}</td>
                    <td className="actions-cell">
                      <button
                        className="btn-sm btn-danger"
                        disabled={busyKey === `plan-${plan.id}`}
                        onClick={() => void deletePlan(plan)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US');
}

function formatMoney(value: number) {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}
