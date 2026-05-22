import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Upload, 
  MapPin, 
  Sun, 
  Moon, 
  CloudRain, 
  Wind, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Video,
  ChevronRight,
  Settings
} from "lucide-react";

const LocationRecreation: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState("");
  const [locationName, setLocationName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [view, setView] = useState<"upload" | "gallery">("gallery");
  
  const [envSettings, setEnvSettings] = useState({
    timeOfDay: "afternoon",
    weather: "clear",
    lighting: "natural"
  });
  const [selectedSceneIds, setSelectedSceneIds] = useState<number[]>([]);

  const utils = trpc.useContext();
  const { data: locationsList, isLoading: loadingLocations } = trpc.locationRecreation.list.useQuery({ 
    projectId: parseInt(projectId!) 
  });

  const { data: scenes = [] } = trpc.scene.listByProject.useQuery({
    projectId: parseInt(projectId!)
  });

  const assignMutation = trpc.locationRecreation.assignToScenes.useMutation({
    onSuccess: () => {
      toast.success("Location assigned to selected scenes");
      setSelectedSceneIds([]);
    }
  });

  const analyzeMutation = trpc.locationRecreation.analyzeVideo.useMutation({
    onSuccess: (data) => {
      setSelectedLocationId(data.locationId);
      setUploading(false);
      utils.locationRecreation.list.invalidate();
      setView("upload");
    }
  });

  const applyEnvMutation = trpc.locationRecreation.applyEnvironment.useMutation({
    onSuccess: () => {
      utils.locationRecreation.list.invalidate();
    }
  });

  const deleteMutation = trpc.locationRecreation.delete.useMutation({
    onSuccess: () => {
      utils.locationRecreation.list.invalidate();
      if (selectedLocationId) setSelectedLocationId(null);
    }
  });

  const handleUpload = async () => {
    if (!videoUrl || !locationName) return;
    setUploading(true);
    analyzeMutation.mutate({
      projectId: parseInt(projectId!),
      videoUrl,
      locationName
    });
  };

  const handleApplyEnv = () => {
    if (!selectedLocationId) return;
    applyEnvMutation.mutate({
      locationId: selectedLocationId,
      ...envSettings as any
    });
    
    if (selectedSceneIds.length > 0) {
      assignMutation.mutate({
        locationId: selectedLocationId,
        sceneIds: selectedSceneIds
      });
    }
  };

  const toggleScene = (id: number) => {
    setSelectedSceneIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectLocation = (loc: any) => {
    setSelectedLocationId(loc.id);
    setEnvSettings({
      timeOfDay: loc.bestTimeOfDay || "afternoon",
      weather: loc.weatherPreferences?.[0] || "clear",
      lighting: "natural"
    });
    setView("upload");
  };

  return (
    <div className="max-w-6xl mx-auto p-8 bg-black text-white min-h-screen">
      <div className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter flex items-center gap-3">
            <MapPin className="text-blue-500 w-10 h-10" />
            LOCATION RECREATION
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">Recreate real-world settings with AI-driven environmental controls.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate(`/projects/${projectId}/scenes`)}
            className="px-6 py-2 border border-zinc-700 hover:bg-zinc-900 rounded-full transition-all flex items-center gap-2"
          >
            Back to Scenes
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setView("gallery")}
          className={`px-6 py-2 rounded-full font-bold transition-all ${view === "gallery" ? "bg-blue-600 text-white" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"}`}
        >
          My Locations
        </button>
        <button 
          onClick={() => {
            setView("upload");
            setSelectedLocationId(null);
          }}
          className={`px-6 py-2 rounded-full font-bold transition-all ${view === "upload" && !selectedLocationId ? "bg-blue-600 text-white" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"}`}
        >
          New Recreation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {view === "gallery" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingLocations ? (
                <div className="col-span-2 py-20 text-center text-zinc-500">Loading your locations...</div>
              ) : locationsList?.length === 0 ? (
                <div className="col-span-2 py-20 text-center bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                  <MapPin className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">No locations found. Upload a video to get started.</p>
                </div>
              ) : (
                locationsList?.map((loc) => (
                  <div key={loc.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 hover:border-blue-500/50 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{loc.name}</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{loc.locationType || "Interior"}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${loc.aiRecreationStatus === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {loc.aiRecreationStatus}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                      <button 
                        onClick={() => selectLocation(loc)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        Edit Environment
                      </button>
                      <button 
                        onClick={() => deleteMutation.mutate({ locationId: loc.id })}
                        className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 rounded-xl transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Step 1: Upload Video */}
              <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-sm">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <Video className="text-blue-400" />
                  {selectedLocationId ? "Location Details" : "1. Upload Location Reference"}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-2 uppercase tracking-widest">Location Name</label>
                    <input 
                      type="text"
                      placeholder="e.g., Jerry's Apartment, The Bundy House"
                      value={locationName || (selectedLocationId ? locationsList?.find(l => l.id === selectedLocationId)?.name : "")}
                      readOnly={!!selectedLocationId}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  {!selectedLocationId && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-500 mb-2 uppercase tracking-widest">Video URL (S3 or Reference)</label>
                      <div className="flex gap-3">
                        <input 
                          type="text"
                          placeholder="https://..."
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          className="flex-1 bg-black border border-zinc-800 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <button 
                          onClick={handleUpload}
                          disabled={uploading || !videoUrl}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-8 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                          {uploading ? <Zap className="animate-spin" /> : <Upload />}
                          ANALYZE
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {analyzeMutation.isSuccess && !selectedLocationId && (
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-blue-400">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                      <p className="font-bold">Analysis Underway</p>
                      <p className="text-sm">AI is extracting architectural details from your video.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Environment Controls */}
              <div className={`bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-sm transition-all ${!selectedLocationId ? 'opacity-50 pointer-events-none' : ''}`}>
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <Settings className="text-purple-400" />
                  2. Environmental Controls
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-4 uppercase tracking-widest">Time of Day</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["dawn", "morning", "afternoon", "evening", "night", "golden-hour"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setEnvSettings({...envSettings, timeOfDay: t})}
                          className={`p-3 rounded-xl border transition-all capitalize text-sm ${envSettings.timeOfDay === t ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-zinc-800 hover:border-zinc-600'}`}
                        >
                          {t.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-4 uppercase tracking-widest">Weather</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"].map((w) => (
                        <button
                          key={w}
                          onClick={() => setEnvSettings({...envSettings, weather: w})}
                          className={`p-3 rounded-xl border transition-all capitalize text-sm ${envSettings.weather === w ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 hover:border-zinc-600'}`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-4 uppercase tracking-widest">Lighting</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"].map((l) => (
                        <button
                          key={l}
                          onClick={() => setEnvSettings({...envSettings, lighting: l})}
                          className={`p-3 rounded-xl border transition-all capitalize text-sm ${envSettings.lighting === l ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-zinc-800 hover:border-zinc-600'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-8 border-t border-zinc-800 pt-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="text-green-400" />
                    3. Assign to Scenes
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4">Select the scenes where this recreated location will be used.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[200px] overflow-y-auto p-2 bg-black/40 rounded-xl border border-zinc-800">
                    {scenes.length === 0 ? (
                      <p className="text-zinc-600 text-xs italic p-4">No scenes found in this project.</p>
                    ) : (
                      scenes.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => toggleScene(s.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedSceneIds.includes(s.id) ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-zinc-800 hover:border-zinc-700'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedSceneIds.includes(s.id) ? 'bg-green-500 border-green-500' : 'border-zinc-600'}`}>
                            {selectedSceneIds.includes(s.id) && <CheckCircle className="w-3 h-3 text-black" />}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold truncate">Scene {s.orderIndex + 1}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{s.title || "Untitled"}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleApplyEnv}
                  className="w-full mt-8 bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {(applyEnvMutation.isLoading || assignMutation.isLoading) ? <Zap className="animate-spin" /> : "Update & Assign to Scenes"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-3xl border border-zinc-800">
            <h3 className="text-xl font-bold mb-4">How it works</h3>
            <ul className="space-y-4 text-zinc-400 text-sm">
              <li className="flex gap-3">
                <ChevronRight className="text-blue-500 flex-shrink-0" />
                Upload a 10-30s video walk-through of any real location.
              </li>
              <li className="flex gap-3">
                <ChevronRight className="text-blue-500 flex-shrink-0" />
                AI analyzes geometry, furniture, and lighting characteristics.
              </li>
              <li className="flex gap-3">
                <ChevronRight className="text-blue-500 flex-shrink-0" />
                A digital twin is created for your scenes.
              </li>
              <li className="flex gap-3">
                <ChevronRight className="text-blue-500 flex-shrink-0" />
                Use environmental controls to change weather and time instantly.
              </li>
            </ul>
          </div>

          <div className="bg-blue-600/10 p-8 rounded-3xl border border-blue-500/20">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <AlertCircle className="text-blue-400" />
              Pro Tip
            </h3>
            <p className="text-sm text-blue-300/80 leading-relaxed">
              Steady, slow-panning videos with good lighting yield the most accurate recreations. Avoid fast movements or blurry shots.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationRecreation;
