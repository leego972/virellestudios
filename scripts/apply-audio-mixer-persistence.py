from pathlib import Path

path = Path("client/src/pages/AudioMixer.tsx")
text = path.read_text()


def patch(old: str, new: str) -> None:
    global text
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"AudioMixer expected one match for {old[:100]!r}, found {count}")
    text = text.replace(old, new, 1)


patch(
    '''    const { data: scenes = [] } = trpc.scene.listByProject.useQuery({ projectId: pid }, { enabled: !!pid });

    const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);''',
    '''    const utils = trpc.useUtils();
    const { data: scenes = [] } = trpc.scene.listByProject.useQuery({ projectId: pid }, { enabled: !!pid });
    const mixSettingsQuery = trpc.filmPost.getMixSettings.useQuery({ projectId: pid }, { enabled: Number.isInteger(pid) && pid > 0 });

    const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);''',
)

patch(
    '''    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const selectedScene = scenes.find(s => s.id === selectedSceneId);''',
    '''    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hydratedSettingsId = useRef<number | null>(null);

    const selectedScene = scenes.find(s => s.id === selectedSceneId);

    const saveMutation = trpc.filmPost.saveMixSettings.useMutation({
      onSuccess: () => {
        setDirty(false);
        utils.filmPost.getMixSettings.invalidate({ projectId: pid });
        toast.success("Project mix saved.", { description: "These levels and channel settings will be available when the project is reopened." });
      },
      onError: (error) => toast.error(error.message || "The mix could not be saved."),
    });
    const resetMutation = trpc.filmPost.resetMixSettings.useMutation({
      onSuccess: () => {
        setMix(defaultMix());
        setMasterVolume(85);
        setSavedPreset("Balanced");
        setDirty(false);
        hydratedSettingsId.current = null;
        utils.filmPost.getMixSettings.invalidate({ projectId: pid });
        toast.success("Project mix reset to defaults.");
      },
      onError: (error) => toast.error(error.message || "The mix could not be reset."),
    });''',
)

patch(
    '''    useEffect(() => {
      if (scenes.length > 0 && !selectedSceneId) setSelectedSceneId(scenes[0].id);
    }, [scenes, selectedSceneId]);''',
    '''    useEffect(() => {
      if (scenes.length > 0 && !selectedSceneId) setSelectedSceneId(scenes[0].id);
    }, [scenes, selectedSceneId]);

    useEffect(() => {
      const settings = mixSettingsQuery.data;
      if (!settings || hydratedSettingsId.current === settings.id) return;
      let details: any = {};
      try {
        details = settings.notes ? JSON.parse(settings.notes) : {};
      } catch {
        details = {};
      }
      const detailedTracks = details?.tracks && typeof details.tracks === "object" ? details.tracks : {};
      setMix((current) => ({
        ...current,
        dialogue: { ...current.dialogue, ...detailedTracks.dialogue, volume: Math.round(Number(settings.dialogueBus ?? 0.85) * 100) },
        music: { ...current.music, ...detailedTracks.music, volume: Math.round(Number(settings.musicBus ?? 0.6) * 100) },
        sfx: { ...current.sfx, ...detailedTracks.sfx, volume: Math.round(Number(settings.effectsBus ?? 0.7) * 100) },
        ambient: { ...current.ambient, ...detailedTracks.ambient },
        voiceover: { ...current.voiceover, ...detailedTracks.voiceover },
      }));
      setMasterVolume(Math.round(Number(settings.masterVolume ?? 0.85) * 100));
      setSavedPreset(typeof details?.preset === "string" ? details.preset : "Balanced");
      if (Number.isInteger(details?.selectedSceneId)) setSelectedSceneId(details.selectedSceneId);
      hydratedSettingsId.current = settings.id;
      setDirty(false);
    }, [mixSettingsQuery.data]);''',
)

patch(
    '''    const handleSave = () => {
      toast.success("Mix saved — scene audio levels locked in.", { description: "These will apply when you export or preview this scene." });
      setDirty(false);
    };

    const handleReset = () => {
      setMix(defaultMix());
      setDirty(false);
      toast("Mix reset to defaults.");
    };''',
    '''    const handleSave = () => {
      if (!Number.isInteger(pid) || pid <= 0) {
        toast.error("A valid project is required before saving the mix.");
        return;
      }
      saveMutation.mutate({
        projectId: pid,
        dialogueBus: mix.dialogue.volume / 100,
        musicBus: mix.music.volume / 100,
        effectsBus: mix.sfx.volume / 100,
        masterVolume: masterVolume / 100,
        notes: JSON.stringify({
          version: 1,
          preset: savedPreset,
          selectedSceneId,
          tracks: mix,
        }),
      });
    };

    const handleReset = () => {
      if (!Number.isInteger(pid) || pid <= 0) return;
      resetMutation.mutate({ projectId: pid });
    };''',
)

patch(
    '''            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 border-border/40 h-8 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty}''',
    '''            <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMutation.isPending || mixSettingsQuery.isLoading} className="gap-1.5 border-border/40 h-8 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />{resetMutation.isPending ? "Resetting…" : "Reset"}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty || saveMutation.isPending || mixSettingsQuery.isLoading}''',
)

patch(
    '''              <Save className="h-3.5 w-3.5" />Save Mix''',
    '''              <Save className="h-3.5 w-3.5" />{saveMutation.isPending ? "Saving…" : "Save Mix"}''',
)

patch(
    '''                      style={{ height: `${20 + Math.sin(i * 0.8) * 15 + Math.random() * 10}%`, background: isPlaying && Math.floor(elapsed * 10) % 60 === i ? "#D4AF37" : "rgba(212,175,55,0.3)", transition:"background .1s" }} />''',
    '''                      style={{ height: `${28 + Math.sin(i * 0.8) * 14 + Math.sin(i * 2.17) * 8}%`, background: isPlaying && Math.floor(elapsed * 10) % 60 === i ? "#D4AF37" : "rgba(212,175,55,0.3)", transition:"background .1s" }} />''',
)

patch(
    '''                  { label: "Dubbing Studio",href: `/projects/${projectId}/dubbing-studio`  },''',
    '''                  { label: "Dubbing Studio",href: `/projects/${projectId}/dubbing`  },''',
)

path.write_text(text)
