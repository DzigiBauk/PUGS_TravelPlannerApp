import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Activity } from '../models/TravelPlan';
import type { TravelRoute } from '../models/Route';
import { useServices } from '../services/ServicesContext';
import { getApiErrorMessage } from '../utils/apiError';
import { environment } from '../config/environment';

interface RouteMapProps {
  planId: number;
  activities: Activity[];
  shareToken?: string;
}

interface FitRouteBoundsProps {
  route: TravelRoute;
}

interface RouteMapContentProps {
  planId: number;
  date?: string;
  shareToken?: string;
}

function FitRouteBounds({ route }: FitRouteBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (route.points.length === 1) {
      map.setView([route.points[0].latitude, route.points[0].longitude], 14);
      return;
    }

    if (route.points.length > 1) {
      map.fitBounds(
        route.points.map(point => [point.latitude, point.longitude] as [number, number]),
        { padding: [32, 32] },
      );
    }
  }, [map, route]);

  return null;
}

function createNumberedMarker(order: number) {
  return L.divIcon({
    className: 'route-marker-wrapper',
    html: `<span class="route-marker">${order}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

function RouteMapContent({ planId, date, shareToken }: RouteMapContentProps) {
  const { routeService } = useServices();
  const [route, setRoute] = useState<TravelRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const request = shareToken
      ? routeService.getSharedRoute(shareToken, date)
      : routeService.getRoute(planId, date);

    request
      .then(data => {
        if (!cancelled) setRoute(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not load route data.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, planId, routeService, shareToken]);

  if (loading) {
    return <div className="route-map-state">Loading route...</div>;
  }

  if (error) {
    return <div className="form-error">{error}</div>;
  }

  if (!route || route.points.length === 0) {
    return <div className="route-map-empty">No mapped activities exist for this date.</div>;
  }

  const routePositions = route.points.map(
    point => [point.latitude, point.longitude] as [number, number],
  );

  return (
    <>
      <div className="route-summary" aria-label="Route summary">
        <span><strong>{route.points.length}</strong> stops</span>
        <span><strong>{route.totalDistanceKilometers.toFixed(2)} km</strong> straight-line distance</span>
        <span><strong>{formatDuration(route.estimatedDurationMinutes)}</strong> estimated travel</span>
      </div>
      <MapContainer
        className="route-map"
        center={[route.points[0].latitude, route.points[0].longitude]}
        zoom={13}
        scrollWheelZoom
      >
        <TileLayer
          attribution={environment.mapTileAttribution}
          url={environment.mapTileUrl}
        />
        <FitRouteBounds route={route} />
        {routePositions.length > 1 && (
          <Polyline positions={routePositions} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.8 }} />
        )}
        {route.points.map((point, index) => (
          <Marker
            key={point.activityId}
            position={[point.latitude, point.longitude]}
            icon={createNumberedMarker(index + 1)}
          >
            <Popup>
              <div className="route-popup">
                <strong>{point.name}</strong>
                <span>Route position {index + 1}</span>
                {point.location && <span>{point.location}</span>}
                <span>{new Date(point.date).toLocaleDateString('en-US')}</span>
                <span>{point.time.slice(0, 5)}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <ol className="route-stop-list" aria-label="Ordered route stops">
        {route.points.map((point, index) => (
          <li key={point.activityId}>
            <span className="route-stop-number">{index + 1}</span>
            <span className="route-stop-details">
              <strong>{point.name}</strong>
              <span>
                {new Date(point.date).toLocaleDateString('en-US')}
                {` at ${point.time.slice(0, 5)}`}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function RouteMap({ planId, activities, shareToken }: RouteMapProps) {
  const [selectedDate, setSelectedDate] = useState('');

  const routeActivities = useMemo(
    () => activities.filter(activity => activity.latitude !== undefined && activity.longitude !== undefined),
    [activities],
  );
  const availableDates = useMemo(
    () => [...new Set(routeActivities.map(activity => activity.date.split('T')[0]))].sort(),
    [routeActivities],
  );
  const activitySignature = useMemo(
    () => routeActivities
      .map(activity => [activity.id, activity.date, activity.time, activity.latitude, activity.longitude].join(':'))
      .sort()
      .join('|'),
    [routeActivities],
  );
  const effectiveSelectedDate = availableDates.includes(selectedDate) ? selectedDate : '';

  return (
    <section className="details-section route-map-section">
      <div className="section-header route-map-header">
        <div>
          <h2>Route map</h2>
          <p>Activities with coordinates are connected chronologically by date and time.</p>
        </div>
        <div className="route-date-filter">
          <label htmlFor="route-date">View</label>
          <select
            id="route-date"
            value={effectiveSelectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            disabled={routeActivities.length === 0}
          >
            <option value="">Whole trip</option>
            {availableDates.map(date => (
              <option key={date} value={date}>
                {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {routeActivities.length === 0 ? (
        <div className="route-map-empty">
          Add latitude and longitude to activities to display them on the map.
        </div>
      ) : (
        <RouteMapContent
          key={`${planId}:${shareToken ?? 'owner'}:${effectiveSelectedDate}:${activitySignature}`}
          planId={planId}
          date={effectiveSelectedDate || undefined}
          shareToken={shareToken}
        />
      )}
    </section>
  );
}
