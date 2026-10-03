import React, { useState, useEffect, useRef } from 'react';
import { OrderStatus } from '../types';
import {
  Bike,
  MapPin,
  Utensils,
  Navigation,
  Compass,
  Crosshair,
  Maximize2,
  Minimize2,
  Clock,
  ShieldCheck,
  Phone,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Sparkles
} from 'lucide-react';

interface DeliveryTrackerMapProps {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryPartnerVehicle?: string;
  customerAddress?: string;
}

interface Point {
  lat: number;
  lng: number;
  label?: string;
}

// Default Restaurant Coordinates (Central City Hub)
const RESTAURANT_LOCATION: Point = {
  lat: 12.9716,
  lng: 77.5946,
  label: "Hunter's Kitchen Main Hub"
};

// Default Customer Dropoff Coordinates
const DEFAULT_CUSTOMER_LOCATION: Point = {
  lat: 12.985,
  lng: 77.61,
  label: 'Delivery Drop-off Location'
};

export const DeliveryTrackerMap: React.FC<DeliveryTrackerMapProps> = ({
  orderId,
  orderNumber,
  status,
  deliveryPartnerName = 'Ramesh Kumar',
  deliveryPartnerPhone = '+91 98765 43210',
  deliveryPartnerVehicle = 'TVS Apache (KA-01-EQ-4821)',
  customerAddress = '42 Richmond Road, Shanthi Nagar'
}) => {
  // Geolocation state for customer
  const [userCoords, setUserCoords] = useState<Point | null>(null);
  const [isUsingLiveGeo, setIsUsingLiveGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Map view controls
  const [zoomLevel, setZoomLevel] = useState(1); // 0.8 to 1.8
  const [isExpanded, setIsExpanded] = useState(false);
  const [trackingMode, setTrackingMode] = useState<'DRIVER' | 'ROUTE' | 'CUSTOMER'>('DRIVER');

  // Partner position state (0 to 1 along the path)
  const [progress, setProgress] = useState<number>(0.65);
  const [driverSpeed, setDriverSpeed] = useState<number>(28); // km/h
  const [etaMinutes, setEtaMinutes] = useState<number>(8);
  const [distanceKm, setDistanceKm] = useState<number>(1.8);

  // Canvas element ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine current active customer location
  const activeCustomerLoc: Point = userCoords || DEFAULT_CUSTOMER_LOCATION;

  // Generate intermediate waypoint route path
  const routePath: Point[] = [
    RESTAURANT_LOCATION,
    { lat: 12.974, lng: 77.598 },
    { lat: 12.978, lng: 77.602 },
    { lat: 12.981, lng: 77.606 },
    activeCustomerLoc
  ];

  // Request Customer's Geolocation
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPoint: Point = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Your Current Live Location'
        };
        setUserCoords(newPoint);
        setIsUsingLiveGeo(true);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation access error:', err);
        setGeoError('Unable to fetch location. Using address location.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Status to progress mapping
  useEffect(() => {
    if (status === 'ACCEPTED' || status === 'PREPARING') {
      setProgress(0);
      setEtaMinutes(25);
      setDistanceKm(4.2);
    } else if (status === 'READY' || status === 'ASSIGNED') {
      setProgress(0.1);
      setEtaMinutes(18);
      setDistanceKm(3.8);
    } else if (status === 'OUT_FOR_DELIVERY') {
      // Animate progress smoothly
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 0.98) return 0.98;
          const next = prev + 0.005;
          const remainingDist = Math.max(0.2, (1 - next) * 3.5);
          setDistanceKm(parseFloat(remainingDist.toFixed(1)));
          setEtaMinutes(Math.max(1, Math.round(remainingDist * 3.5)));
          setDriverSpeed(Math.floor(22 + Math.random() * 12));
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (status === 'DELIVERED') {
      setProgress(1.0);
      setDistanceKm(0);
      setEtaMinutes(0);
    }
  }, [status]);

  // Interpolate current driver lat/lng along path
  const getDriverCoordinates = (): Point => {
    if (progress <= 0) return RESTAURANT_LOCATION;
    if (progress >= 1) return activeCustomerLoc;

    const totalSegments = routePath.length - 1;
    const scaledProgress = progress * totalSegments;
    const segmentIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
    const segmentProgress = scaledProgress - segmentIndex;

    const p1 = routePath[segmentIndex];
    const p2 = routePath[segmentIndex + 1];

    return {
      lat: p1.lat + (p2.lat - p1.lat) * segmentProgress,
      lng: p1.lng + (p2.lng - p1.lng) * segmentProgress
    };
  };

  const currentDriverPos = getDriverCoordinates();

  // Render Canvas Map Grid & Visual Nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 600;
    const height = isExpanded ? 400 : 260;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Map Background - Modern Dark Navigation Theme
    ctx.fillStyle = '#1c1917'; // stone-900
    ctx.fillRect(0, 0, width, height);

    // Draw Subtle Map Grid Roads Background
    ctx.strokeStyle = '#292524'; // stone-800
    ctx.lineWidth = 1.5;

    // Grid lines
    const gridSize = 40 * zoomLevel;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Convert lat/lng to canvas X/Y projection
    const minLat = Math.min(RESTAURANT_LOCATION.lat, activeCustomerLoc.lat) - 0.005;
    const maxLat = Math.max(RESTAURANT_LOCATION.lat, activeCustomerLoc.lat) + 0.005;
    const minLng = Math.min(RESTAURANT_LOCATION.lng, activeCustomerLoc.lng) - 0.005;
    const maxLng = Math.max(RESTAURANT_LOCATION.lng, activeCustomerLoc.lng) + 0.005;

    const padding = 50;
    const toCanvasX = (lng: number) => {
      const norm = (lng - minLng) / (maxLng - minLng || 1);
      return padding + norm * (width - 2 * padding);
    };

    const toCanvasY = (lat: number) => {
      // Invert Y axis for Lat
      const norm = (maxLat - lat) / (maxLat - minLat || 1);
      return padding + norm * (height - 2 * padding);
    };

    // Draw City Block Blocks / Buildings Decor
    ctx.fillStyle = '#262626';
    const cityBlocks = [
      { x: width * 0.15, y: height * 0.2, w: 80, h: 50 },
      { x: width * 0.55, y: height * 0.15, w: 100, h: 60 },
      { x: width * 0.35, y: height * 0.6, w: 90, h: 55 },
      { x: width * 0.7, y: height * 0.65, w: 75, h: 45 }
    ];
    cityBlocks.forEach((b) => {
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w * zoomLevel, b.h * zoomLevel, 8);
      ctx.fill();
    });

    // Draw Main Route Line (Remaining = Dashed Amber/Red)
    ctx.beginPath();
    routePath.forEach((p, idx) => {
      const cx = toCanvasX(p.lng);
      const cy = toCanvasY(p.lat);
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.strokeStyle = '#f59e0b'; // amber-500
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Draw Completed Path Segment (Solid Green)
    const driverCanvasX = toCanvasX(currentDriverPos.lng);
    const driverCanvasY = toCanvasY(currentDriverPos.lat);

    ctx.beginPath();
    ctx.moveTo(toCanvasX(RESTAURANT_LOCATION.lng), toCanvasY(RESTAURANT_LOCATION.lat));
    ctx.lineTo(driverCanvasX, driverCanvasY);
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 6;
    ctx.stroke();

    // 1. Restaurant Pin Node
    const restX = toCanvasX(RESTAURANT_LOCATION.lng);
    const restY = toCanvasY(RESTAURANT_LOCATION.lat);

    ctx.beginPath();
    ctx.arc(restX, restY, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#b91c1c'; // red-700
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Restaurant Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍳 Hunter Kitchen', restX, restY - 20);

    // 2. Customer Dropoff Pin Node
    const custX = toCanvasX(activeCustomerLoc.lng);
    const custY = toCanvasY(activeCustomerLoc.lat);

    ctx.beginPath();
    ctx.arc(custX, custY, 14, 0, Math.PI * 2);
    ctx.fillStyle = isUsingLiveGeo ? '#2563eb' : '#059669'; // blue-600 or emerald-600
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Customer Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(isUsingLiveGeo ? '📍 Your GPS Position' : '🏡 Drop-off', custX, custY + 28);

    // 3. Delivery Partner Moving Node (Only if assigned or out for delivery)
    if (status !== 'CANCELLED' && status !== 'REJECTED') {
      // Radar pulsing effect ring
      ctx.beginPath();
      ctx.arc(driverCanvasX, driverCanvasY, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.fill();

      // Core Driver Marker
      ctx.beginPath();
      ctx.arc(driverCanvasX, driverCanvasY, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b'; // amber-500
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1c1917';
      ctx.stroke();

      // Driver Name Callout Box
      const boxW = 100;
      const boxH = 22;
      const boxX = driverCanvasX - boxW / 2;
      const boxY = driverCanvasY - 36;

      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.fillStyle = '#1c1917';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🛵 ${deliveryPartnerName.split(' ')[0]}`, driverCanvasX, boxY + 14);
    }
  }, [progress, userCoords, isUsingLiveGeo, zoomLevel, isExpanded, status]);

  return (
    <div className="bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 shadow-xl space-y-0 text-white relative">
      {/* Top Map Action Bar */}
      <div className="p-3 bg-stone-950/80 backdrop-blur-md flex items-center justify-between border-b border-stone-800/80 z-20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5">
              Live Partner Geolocation Map
            </h4>
            <p className="text-[10px] text-stone-400">
              {status === 'OUT_FOR_DELIVERY'
                ? `Moving live • ${driverSpeed} km/h`
                : status === 'DELIVERED'
                ? 'Arrived at destination'
                : 'Preparing at restaurant hub'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Geolocation Button */}
          <button
            onClick={requestGeolocation}
            disabled={isLocating}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition-all ${
              isUsingLiveGeo
                ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
            }`}
            title="Snap destination to your actual live device coordinates"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : isUsingLiveGeo ? 'GPS Active' : 'Use My GPS'}</span>
          </button>

          {/* Zoom controls */}
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Toggle Expand View */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
            title="Toggle Map Height"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Canvas View Area */}
      <div className="relative overflow-hidden w-full bg-stone-900">
        <canvas ref={canvasRef} className="w-full block" />

        {/* Live Overlay Metrics Badge */}
        <div className="absolute bottom-3 left-3 right-3 bg-stone-950/90 backdrop-blur-md border border-stone-800/90 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 font-black shrink-0">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{etaMinutes > 0 ? `${etaMinutes} mins away` : 'Arrived!'}</span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/60">
                  {distanceKm} km left
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                To: {customerAddress}
              </p>
            </div>
          </div>

          <a
            href={`tel:${deliveryPartnerPhone}`}
            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shrink-0 transition-all"
          >
            <Phone className="w-3.5 h-3.5" /> Call Partner
          </a>
        </div>
      </div>

      {/* Geolocation feedback notice */}
      {geoError && (
        <div className="px-3 py-1.5 bg-amber-900/40 text-amber-200 text-[10px] font-medium border-t border-amber-800/50 flex items-center justify-between">
          <span>⚠️ {geoError}</span>
          <button onClick={() => setGeoError(null)} className="underline font-bold">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
