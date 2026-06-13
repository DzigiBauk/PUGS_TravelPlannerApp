import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import type { Activity } from '../models/TravelPlan';
import { environment } from '../config/environment';

interface ActivityLocationPickerProps {
  activities: Activity[];
  activityId?: number;
  date: string;
  time: string;
  latitude?: number;
  longitude?: number;
  onChange: (latitude: number, longitude: number) => void;
  onClear: () => void;
}

interface MapInteractionProps {
  positions: Array<[number, number]>;
  selectedPosition?: [number, number];
  onChange: (latitude: number, longitude: number) => void;
}

function MapInteraction({ positions, selectedPosition, onChange }: MapInteractionProps) {
  const map = useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });

  useEffect(() => {
    const visiblePositions = selectedPosition ? [...positions, selectedPosition] : positions;
    if (visiblePositions.length === 1) {
      map.setView(visiblePositions[0], 14);
    } else if (visiblePositions.length > 1) {
      map.fitBounds(visiblePositions, { padding: [28, 28], maxZoom: 15 });
    }
  }, [map, positions, selectedPosition]);

  return null;
}

function createPickerMarker(label: string, selected = false) {
  return L.divIcon({
    className: 'route-marker-wrapper',
    html: `<span class="route-marker${selected ? ' selected' : ''}">${label}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export default function ActivityLocationPicker({
  activities,
  activityId,
  date,
  time,
  latitude,
  longitude,
  onChange,
  onClear,
}: ActivityLocationPickerProps) {
  const selectedPosition = useMemo(
    () => latitude !== undefined && longitude !== undefined
      ? [latitude, longitude] as [number, number]
      : undefined,
    [latitude, longitude],
  );

  const orderedActivities = useMemo(
    () => activities
      .filter(activity =>
        activity.id !== activityId
        && activity.date.split('T')[0] === date
        && activity.latitude !== undefined
        && activity.longitude !== undefined)
      .sort((first, second) =>
        first.time.localeCompare(second.time)
        || first.id - second.id),
    [activities, activityId, date],
  );

  const orderedPoints = useMemo(() => {
    const points = orderedActivities.map(activity => ({
      id: activity.id,
      name: activity.name,
      time: activity.time,
      position: [activity.latitude!, activity.longitude!] as [number, number],
      selected: false,
    }));

    if (selectedPosition) {
      points.push({
        id: activityId ?? -1,
        name: 'Selected activity',
        time,
        position: selectedPosition,
        selected: true,
      });
    }

    return points.sort((first, second) =>
      (first.time || '99:99').localeCompare(second.time || '99:99')
      || first.id - second.id);
  }, [activityId, orderedActivities, selectedPosition, time]);

  const existingPositions = useMemo(
    () => orderedActivities.map(activity => [activity.latitude!, activity.longitude!] as [number, number]),
    [orderedActivities],
  );
  const positions = useMemo(() => orderedPoints.map(point => point.position), [orderedPoints]);
  const initialCenter = selectedPosition ?? positions[0] ?? [20, 0] as [number, number];
  const initialZoom = selectedPosition || positions.length ? 13 : 2;

  return (
    <div className="activity-location-picker">
      <div className="activity-location-picker-header">
        <div>
          <strong>Pick location on map</strong>
          <span>Click anywhere to place or move this activity.</span>
        </div>
        {selectedPosition && <div className="activity-location-picker-value">
          <span className="activity-coordinate-preview">
            {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
          </span>
          <button type="button" className="btn-sm btn-secondary" onClick={onClear}>Clear</button>
        </div>}
      </div>
      <MapContainer
        className="activity-picker-map"
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom
      >
        <TileLayer
          attribution={environment.mapTileAttribution}
          url={environment.mapTileUrl}
        />
        <MapInteraction
          positions={existingPositions}
          selectedPosition={selectedPosition}
          onChange={onChange}
        />
        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.7 }} />
        )}
        {orderedPoints.map((point, index) => (
          <Marker
            key={`${point.selected ? 'selected' : 'activity'}-${point.id}`}
            position={point.position}
            icon={createPickerMarker(String(index + 1), point.selected)}
          >
            <Popup>
              <strong>{point.name}</strong>
              <br />Route position {index + 1}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
