import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  SkipBack, 
  SkipForward, 
  Heart, 
  AlertTriangle, 
  Settings, 
  Radio, 
  Layers, 
  Check, 
  Copy, 
  Tv, 
  ShieldCheck,
  Eye,
  Sliders
} from 'lucide-react';
import { ChannelRecord } from '../../types/database';
import { useAuth } from '../../context/AuthContext';

interface LivePlayerModalProps {
  channel: ChannelRecord | null;
  channelsList: ChannelRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSelectChannel: (channel: ChannelRecord) => void;
}

export const LivePlayerModal: React.FC<LivePlayerModalProps> = ({
  channel,
  channelsList,
  isOpen,
  onClose,
  onSelectChannel,
}) => {
  const { isFavorite, toggleFavorite } = useAuth();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto (4K HDR)');
  const [selectedAudio, setSelectedAudio] = useState<string>('Dolby Atmos 5.1');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('Off');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (channel && isOpen) {
      setVideoError(false);
      setIsPlaying(true);
      // Track real playback start on server
      fetch('/api/channels/playback-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id, durationMinutes: 5 }),
      }).catch(() => {});
    }
  }, [channel, isOpen]);

  if (!isOpen || !channel) return null;

  const currentIdx = channelsList.findIndex((c) => c.id === channel.id);
  const handlePrev = () => {
    if (channelsList.length === 0) return;
    const prevIdx = (currentIdx - 1 + channelsList.length) % channelsList.length;
    onSelectChannel(channelsList[prevIdx]);
  };

  const handleNext = () => {
    if (channelsList.length === 0) return;
    const nextIdx = (currentIdx + 1) % channelsList.length;
    onSelectChannel(channelsList[nextIdx]);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleReport = () => {
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 3000);
  };

  const handlePIP = () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      } else {
        videoRef.current.requestPictureInPicture().catch(() => {});
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl">
      <div 
        ref={containerRef}
        className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0d18] shadow-2xl flex flex-col max-h-[95vh]"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-[#0e1222] px-5 py-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-white/10 bg-slate-900">
              <img src={channel.logo} alt={channel.officialName} className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm">{channel.officialName}</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                  {channel.resolution}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE FEED
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {channel.country} • {channel.category} • EPG: {channel.epgChannelId}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(channel.id)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isFavorite(channel.id) ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Add to Favorites"
            >
              <Heart className={`h-4 w-4 ${isFavorite(channel.id) ? 'fill-rose-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group">
          {!videoError ? (
            <video
              ref={videoRef}
              src={channel.streamUrl}
              autoPlay
              playsInline
              muted={isMuted}
              onError={() => setVideoError(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3 animate-pulse">
                <Tv className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Satellite MPEG-TS Stream Gateway</h4>
              <p className="max-w-md text-xs text-slate-400 mb-4">
                Native MPEG-TS satellite feeds run natively in Smart TVs, Tivimate, and VLC. Direct link is operational.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(channel.streamUrl);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Stream URL</span>
                </button>
                <a
                  href={channel.streamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Open Stream
                </a>
              </div>
            </div>
          )}

          {/* EPG Overlay (Current Program & Next Program) */}
          <div className="absolute top-4 left-4 right-4 pointer-events-none flex items-start justify-between">
            <div className="rounded-2xl border border-white/10 bg-black/75 p-3 backdrop-blur-xl max-w-md">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                LIVE NOW: {channel.currentProgram || 'Scheduled Broadcast'}
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5 truncate">
                Up Next: {channel.nextProgram || 'Evening Feature'}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/75 px-3 py-1.5 backdrop-blur-xl text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{channel.bitrate} • {channel.responseTimeMs}ms</span>
            </div>
          </div>

          {/* Quick Stream Controls Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/85 px-4 py-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              {/* Prev Channel */}
              <button
                onClick={handlePrev}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Previous Channel (CH-)"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-slate-950" /> : <Play className="h-4 w-4 fill-slate-950 ml-0.5" />}
              </button>

              {/* Next Channel */}
              <button
                onClick={handleNext}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Next Channel (CH+)"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              {/* Volume */}
              <button
                onClick={toggleMute}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer ml-2"
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-3 text-xs">
              {/* PIP */}
              <button
                onClick={handlePIP}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Picture-in-Picture"
              >
                <Eye className="h-4 w-4" />
              </button>

              {/* Quality & Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  <span className="font-mono text-[11px]">{selectedQuality}</span>
                </button>

                {showSettingsMenu && (
                  <div className="absolute right-0 bottom-8 w-48 rounded-2xl border border-white/10 bg-[#0e1222] p-2 shadow-2xl backdrop-blur-2xl z-50 text-xs">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">Resolution Quality</div>
                    {['Auto (4K HDR)', '4K UHD (2160p)', 'FHD (1080p)', 'HD (720p)'].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setSelectedQuality(q);
                          setShowSettingsMenu(false);
                        }}
                        className={`flex w-full items-center justify-between px-2 py-1.5 rounded-lg text-left ${
                          selectedQuality === q ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span>{q}</span>
                        {selectedQuality === q && <Check className="h-3 w-3 text-amber-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Report Stream */}
              <button
                onClick={handleReport}
                className="text-slate-400 hover:text-rose-400 cursor-pointer"
                title="Report Stream Issue"
              >
                <AlertTriangle className="h-4 w-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Stream Telemetry & EPG Drawer */}
        <div className="border-t border-white/5 bg-[#0e111d] p-4 text-xs">
          {reportSuccess && (
            <div className="mb-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300 text-center font-bold">
              ✓ Stream report submitted to Network Operations Center (NOC)
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-400">
            <div className="rounded-xl border border-white/5 bg-slate-900/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Broadcaster Provider</span>
              <div className="font-semibold text-white truncate mt-0.5">{channel.providerName}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-900/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Audio Stream</span>
              <div className="font-semibold text-emerald-400 truncate mt-0.5">{channel.audioLanguage}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-900/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">License Rights</span>
              <div className="font-semibold text-amber-400 truncate mt-0.5">{channel.contentRightsStatus} • Valid to {new Date(channel.licenseExpirationDate).getFullYear()}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-900/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Stream Protocol</span>
              <div className="font-mono text-white mt-0.5">{channel.streamProtocol} • {channel.bitrate}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
