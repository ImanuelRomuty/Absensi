import { useEffect } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

// Vite does not rewrite Leaflet's default icon URLs; fix once at module load.
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type LocationMapProps = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onChange: (coords: { lat: number; lng: number }) => void;
};

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

function MapClickHandler({
  onChange,
}: {
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function LocationMap({
  latitude,
  longitude,
  radiusMeters,
  onChange,
}: LocationMapProps) {
  return (
    <div className="location-map">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom
        className="location-map__canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={latitude} lng={longitude} />
        <MapClickHandler onChange={onChange} />
        <Marker
          position={[latitude, longitude]}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target as L.Marker;
              const { lat, lng } = marker.getLatLng();
              onChange({ lat, lng });
            },
          }}
        />
        <Circle
          center={[latitude, longitude]}
          radius={radiusMeters}
          pathOptions={{
            color: "#1f6f5b",
            fillColor: "#1f6f5b",
            fillOpacity: 0.18,
            weight: 2,
          }}
        />
      </MapContainer>
      <p className="hint location-map__hint">
        Klik peta atau geser pin untuk memindahkan titik absen.
      </p>
    </div>
  );
}
