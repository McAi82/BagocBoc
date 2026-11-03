import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, MapPin, Home, Users, X } from 'lucide-react'
import { bagocbocBoundary } from '../../utils/boundaryData'
import HouseholdDetailsPanel from './HouseholdDetailsPanel'

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom household icon
const householdIcon = new L.DivIcon({
  html: `<div class="bg-white p-1 rounded-full shadow-lg border border-slate-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" width="20px" height="20px">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
         </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

// Mock data - replace with API calls
const MOCK_MARKERS = [
  { id: 1, latitude: 8.4198476, longitude: 124.5022159, household: { household_number: 'H001', household_tracking_number: 'TRK-001' }, residents: [{ first_name: 'Juan', last_name: 'Dela Cruz' }] },
  { id: 2, latitude: 8.425, longitude: 124.51, household: { household_number: 'H002', household_tracking_number: 'TRK-002' }, residents: [{ first_name: 'Maria', last_name: 'Santos' }] },
]

function MapViewHandler({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 })
  }, [map, center, zoom])
  return null
}

export default function Map() {
  const [markers, setMarkers] = useState(MOCK_MARKERS)
  const [selectedHousehold, setSelectedHousehold] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([8.4198476, 124.5022159])
  const searchRef = useRef<HTMLDivElement>(null)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    const results = markers.filter((m) => {
      const familyName = m.residents?.[0]?.last_name || ''
      return familyName.toLowerCase().includes(query.toLowerCase()) ||
             m.household?.household_number?.toLowerCase().includes(query.toLowerCase())
    })
    setSearchResults(results)
    setShowDropdown(results.length > 0)
  }

  const handleSelectResult = (marker: any) => {
    setMapCenter([marker.latitude, marker.longitude])
    setSelectedHousehold(marker)
    setShowDropdown(false)
    setSearchQuery('')
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getFamilyName = (marker: any) => {
    if (marker.residents?.length > 0) {
      const head = marker.residents.find((r: any) => r.pivot?.relationship_to_household === 'Head')
      return head?.last_name || marker.residents[0].last_name
    }
    return 'Unknown'
  }

  return (
    <div className="h-full w-full relative z-0">
      {/* Search */}
      <div ref={searchRef} className="absolute top-6 left-6 z-[1000] w-full max-w-sm">
        <div className="relative group shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search Family Name or House..."
            className="w-full pl-11 pr-4 py-3 bg-white/85 backdrop-blur-md border border-white/60 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-semibold"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {showDropdown && (
            <div className="absolute top-full mt-2 w-full bg-white/95 backdrop-blur-md border border-white/60 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-100/50 transition-colors flex items-center gap-3 border-b border-slate-100 last:border-0"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{getFamilyName(result)} Family</p>
                    <p className="text-xs text-slate-500">Household #{result.household?.household_number}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={15}
        zoomControl={false}
        className="h-full w-full"
      >
        <MapViewHandler center={mapCenter} zoom={15} />
        <ZoomControl position="bottomright" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Boundary */}
        <Polygon
          positions={bagocbocBoundary}
          pathOptions={{
            color: 'white',
            fillColor: 'transparent',
            weight: 4,
            dashArray: '10, 10',
          }}
        />

        {/* Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={householdIcon}
            eventHandlers={{
              click: () => setSelectedHousehold(marker),
            }}
          >
            <Popup>
              <div className="min-w-45 p-1">
                <div className="flex items-center gap-2 mb-3">
                  <Home className="w-4 h-4 text-blue-600" />
                  <span className="font-black text-slate-800 text-xs uppercase tracking-tighter">
                    {getFamilyName(marker)} Family
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] border-t border-slate-200/60 pt-3">
                  <p className="text-slate-600 font-bold uppercase tracking-widest">
                    Household: <span className="text-slate-900">{marker.household?.household_number}</span>
                  </p>
                  <p className="text-slate-600 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Users className="w-3 h-3" /> Members: <span className="text-slate-900">{marker.residents?.length || 0}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedHousehold(marker)}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest shadow-xl transition-all"
                >
                  <span className="text-white">View Details</span>
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Household Details Panel */}
      <HouseholdDetailsPanel
        isOpen={!!selectedHousehold}
        householdData={selectedHousehold}
        onClose={() => setSelectedHousehold(null)}
      />
    </div>
  )
}