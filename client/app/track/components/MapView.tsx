'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
const icon = L.icon({
    iconUrl: '/leaflet-icons/marker-icon.png',
    iconRetinaUrl: '/leaflet-icons/marker-icon-2x.png',
    shadowUrl: '/leaflet-icons/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const packageIcon = L.icon({
    iconUrl: '/leaflet-icons/package-marker.png',
    iconRetinaUrl: '/leaflet-icons/package-marker.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: 'animate-bounce-slow' // We can add custom css for smooth bounce
});

interface MapViewProps {
    origin: [number, number];
    destination: [number, number];
    currentLocation: [number, number];
    waypoints?: [number, number][];
}

// Helper component to fit map bounds
function MapAdjuster({ origin, destination, waypoints }: { origin: [number, number], destination: [number, number], waypoints: [number, number][] }) {
    const map = useMap();

    useEffect(() => {
        const bounds = L.latLngBounds([origin, destination]);
        waypoints.forEach(pt => bounds.extend(pt));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true, duration: 1.5 });
    }, [map, origin, destination, waypoints]);

    return null;
}

export default function MapView({
    origin,
    destination,
    currentLocation,
    waypoints = [],
}: MapViewProps) {
    // Determine route path
    const routePath = waypoints.length > 0 ? waypoints : [origin, currentLocation, destination];

    return (
        <MapContainer
            center={currentLocation}
            zoom={10}
            style={{ height: '100%', width: '100%', borderRadius: '16px' }}
            scrollWheelZoom={false}
            zoomControl={false} // We removed default zoom control for cleaner look
            className="z-0"
        >
            <MapAdjuster origin={origin} destination={destination} waypoints={waypoints} />

            {/* Tile Layer - Modern, light, English labels */}
            <TileLayer
                attribution='&copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {/* Background Route (Gray dashed) */}
            <Polyline
                positions={[origin, destination]} // Simple straight connect or use router later
                pathOptions={{
                    color: '#cbd5e1',
                    weight: 2,
                    dashArray: '5, 10',
                    opacity: 0.5,
                }}
            />

            {/* Actual Route Line (Gradient-like Blue) */}
            <Polyline
                positions={routePath}
                pathOptions={{
                    color: '#3b82f6',
                    weight: 4,
                    opacity: 0.8,
                    lineCap: 'round',
                    lineJoin: 'round',
                }}
            />

            {/* Origin Marker */}
            <Marker position={origin} icon={icon}>
                <Popup className="custom-popup">
                    <div className="p-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Origin</span>
                        <span className="text-sm font-semibold text-gray-800">New Delhi</span>
                    </div>
                </Popup>
            </Marker>

            {/* Waypoints (Small dots) */}
            {waypoints.slice(1, -1).map((point, idx) => (
                <Circle
                    key={idx}
                    center={point}
                    radius={200}
                    pathOptions={{
                        color: '#3b82f6',
                        fillColor: '#fff',
                        fillOpacity: 1,
                        weight: 2,
                    }}
                />
            ))}

            {/* Current Location - Prominent Package */}
            <Marker position={currentLocation} icon={packageIcon} zIndexOffset={100}>
                <Popup offset={[0, -30]} className="custom-popup">
                    <div className="p-1 text-center">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">Current Location</span>
                        <span className="text-sm font-bold text-gray-900">Package is Here</span>
                    </div>
                </Popup>
            </Marker>

            {/* Pulsing Effect for Current Location */}
            <Circle
                center={currentLocation}
                radius={800}
                pathOptions={{
                    fillColor: '#3b82f6',
                    fillOpacity: 0.2,
                    color: '#3b82f6',
                    opacity: 0,
                    weight: 0,
                }}
            />

            {/* Destination Marker */}
            <Marker position={destination} icon={icon}>
                <Popup className="custom-popup">
                    <div className="p-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Destination</span>
                        <span className="text-sm font-semibold text-gray-800">Gurgaon</span>
                    </div>
                </Popup>
            </Marker>

        </MapContainer>
    );
}
