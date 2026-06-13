import { useCallback, useEffect, useState } from 'react';
import type { ShareToken } from '../models/TravelPlan';
import { useServices } from '../services/ServicesContext';
import { getApiErrorMessage } from '../utils/apiError';
import QrCode from './QrCode';
import SuccessMessage from './SuccessMessage';

interface SharePanelProps {
  planId: number;
}

function getShareUrl(token: string) {
  return `${window.location.origin}/shared/${token}`;
}

export default function SharePanel({ planId }: SharePanelProps) {
  const { travelPlanService } = useServices();
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [accessType, setAccessType] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [renderedAt] = useState(() => Date.now());

  const loadTokens = useCallback(async () => {
    try {
      setTokens(await travelPlanService.getShareTokens(planId));
      setError('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not load share links.'));
    } finally {
      setLoading(false);
    }
  }, [planId, travelPlanService]);

  useEffect(() => {
    let cancelled = false;

    travelPlanService.getShareTokens(planId)
      .then(data => {
        if (!cancelled) {
          setTokens(data);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load share links.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [planId, travelPlanService]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const expiration = expiresAt ? new Date(expiresAt) : null;
    if (expiration && expiration.getTime() <= Date.now()) {
      setError('Expiration must be in the future.');
      return;
    }

    setSubmitting(true);
    try {
      await travelPlanService.createShareToken(planId, {
        accessType,
        expiresAt: expiration?.toISOString(),
      });
      setExpiresAt('');
      await loadTokens();
      setSuccess('Share link created.');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not create the share link.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (token: ShareToken) => {
    try {
      setError('');
      await navigator.clipboard.writeText(getShareUrl(token.token));
      setCopiedTokenId(token.id);
      setSuccess('Share link copied.');
      window.setTimeout(() => setCopiedTokenId(null), 2000);
    } catch {
      setError('Could not copy the share link.');
    }
  };

  const handleRevoke = async (token: ShareToken) => {
    if (!confirm('Revoke this share link? Anyone using it will lose access immediately.')) return;

    try {
      setError('');
      setSuccess('');
      await travelPlanService.revokeShareToken(planId, token.id);
      await loadTokens();
      setSuccess('Share link revoked.');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not revoke the share link.'));
    }
  };

  return (
    <section className="details-section share-panel">
      <h2>Share plan</h2>
      <p className="share-help">Create a view-only or editable link for anyone you want to share this plan with.</p>

      <form className="share-form" onSubmit={handleCreate}>
        <div className="form-group share-access-group">
          <label htmlFor="share-access">Access</label>
          <select
            id="share-access"
            value={accessType}
            onChange={event => setAccessType(event.target.value as 'VIEW' | 'EDIT')}
          >
            <option value="VIEW">View</option>
            <option value="EDIT">Edit</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="share-expiration">Expiration (optional)</label>
          <input
            id="share-expiration"
            type="datetime-local"
            value={expiresAt}
            onChange={event => setExpiresAt(event.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create share link'}
        </button>
      </form>

      <SuccessMessage message={success} onDismiss={() => setSuccess('')} />
      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p className="no-items">Loading share links...</p>
      ) : tokens.length > 0 ? (
        <div className="share-links">
          {tokens.map(token => {
            const shareUrl = getShareUrl(token.token);
            const expired = token.expiresAt ? new Date(token.expiresAt).getTime() <= renderedAt : false;

            return (
              <article key={token.id} className={`share-link-card${expired ? ' expired' : ''}`}>
                <QrCode value={shareUrl} />
                <div className="share-link-content">
                  <div className="share-link-meta">
                    <span className="category-badge">{token.accessType === 'EDIT' ? 'Can edit' : 'View only'}</span>
                    <span>{expired ? 'Expired' : token.expiresAt ? `Expires ${new Date(token.expiresAt).toLocaleString('en-US')}` : 'No expiration'}</span>
                  </div>
                  <a href={shareUrl} target="_blank" rel="noreferrer" className="share-url">{shareUrl}</a>
                  <div className="share-link-actions">
                    <button type="button" className="btn-sm btn-secondary" onClick={() => handleCopy(token)}>
                      {copiedTokenId === token.id ? 'Copied' : 'Copy link'}
                    </button>
                    <button type="button" className="btn-sm btn-danger" onClick={() => handleRevoke(token)}>
                      Revoke
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="no-items">No share links created yet.</p>
      )}
    </section>
  );
}
