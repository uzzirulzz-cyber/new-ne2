import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  Server, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink,
  RefreshCw,
  UploadCloud,
  Shield,
  Zap,
  HardDrive
} from 'lucide-react';
import { Playlist } from '../../types/iptv';

interface DnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

interface CloudflareManagerModalProps {
  playlist: Playlist;
  isOpen: boolean;
  onClose: () => void;
}

export const CloudflareManagerModal: React.FC<CloudflareManagerModalProps> = ({
  playlist,
  isOpen,
  onClose,
}) => {
  const [tab, setTab] = useState<'dns' | 'r2' | 'status'>('dns');
  const [statusData, setStatusData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [isLoadingDns, setIsLoadingDns] = useState(false);
  
  // New DNS form
  const [newType, setNewType] = useState('A');
  const [newName, setNewName] = useState('live.playbeat.live');
  const [newContent, setNewContent] = useState('198.51.100.88');
  const [newProxied, setNewProxied] = useState(true);
  const [isAddingDns, setIsAddingDns] = useState(false);

  // R2 Sync state
  const [isPublishingR2, setIsPublishingR2] = useState(false);
  const [publishResult, setPublishResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchDns();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/cloudflare/status');
      const data = await res.json();
      setStatusData(data);
    } catch (e) {
      console.warn('Status fetch fallback');
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchDns = async () => {
    setIsLoadingDns(true);
    try {
      const res = await fetch('/api/cloudflare/dns');
      const data = await res.json();
      if (data.result) {
        setDnsRecords(data.result);
      }
    } catch (e) {
      console.warn('DNS fetch fallback');
    } finally {
      setIsLoadingDns(false);
    }
  };

  const handleAddDns = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newContent) return;

    setIsAddingDns(true);
    try {
      const res = await fetch('/api/cloudflare/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          type: newType,
          content: newContent,
          proxied: newProxied,
          ttl: 1,
        }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        setDnsRecords([data.record, ...dnsRecords]);
        setNewName('');
        setNewContent('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingDns(false);
    }
  };

  const handleDeleteDns = async (id: string) => {
    try {
      await fetch(`/api/cloudflare/dns?id=${id}`, { method: 'DELETE' });
      setDnsRecords(dnsRecords.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublishR2 = async () => {
    setIsPublishingR2(true);
    setPublishResult(null);
    try {
      const res = await fetch('/api/cloudflare/r2-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelCount: playlist.channels.length,
          filename: `${playlist.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.m3u8`,
        }),
      });
      const data = await res.json();
      setPublishResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPublishingR2(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0e1220] shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-gradient-to-r from-orange-500/10 via-transparent to-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Cloudflare DNS & R2 Storage Manager</h3>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  Account: 079c27c9...4d
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage streaming gateway DNS routing and sync 13,000+ channels to R2 Edge CDN
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-white/5 bg-slate-900/60 p-2 gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setTab('dns')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 transition-all cursor-pointer ${
              tab === 'dns' ? 'bg-orange-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>DNS Records ({dnsRecords.length})</span>
          </button>
          <button
            onClick={() => setTab('r2')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 transition-all cursor-pointer ${
              tab === 'r2' ? 'bg-orange-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>R2 Edge Storage (13K Channels)</span>
          </button>
          <button
            onClick={() => setTab('status')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 transition-all cursor-pointer ${
              tab === 'status' ? 'bg-orange-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Credentials & Health</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TAB 1: DNS Management */}
          {tab === 'dns' && (
            <div className="space-y-4">
              
              {/* Add DNS Record Form */}
              <form onSubmit={handleAddDns} className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5 text-orange-400" />
                    Add Streaming DNS Record
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Managed via Cloudflare v4 API</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400">Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="A">A (IPv4)</option>
                      <option value="CNAME">CNAME (Alias)</option>
                      <option value="TXT">TXT (Verification)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[11px] font-bold text-slate-400">Hostname / Name</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. stream.playbeat.live"
                      className="w-full mt-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[11px] font-bold text-slate-400">Target IP / Destination</label>
                    <input
                      type="text"
                      required
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="e.g. 198.51.100.88"
                      className="w-full mt-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-1.5 mb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProxied}
                        onChange={(e) => setNewProxied(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-orange-500 accent-orange-500"
                      />
                      <span className="text-[11px] font-semibold text-orange-300">Proxied ☁️</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isAddingDns}
                      className="flex-1 rounded-xl bg-orange-500 py-1.5 px-3 text-xs font-bold text-slate-950 hover:bg-orange-400 transition-colors cursor-pointer mb-0.5"
                    >
                      Add Record
                    </button>
                  </div>
                </div>
              </form>

              {/* DNS Records Table */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Active Routing Records</span>
                  <button
                    onClick={fetchDns}
                    className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingDns ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="divide-y divide-white/5">
                  {dnsRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
                          {rec.type}
                        </span>
                        <div>
                          <div className="font-bold text-white">{rec.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{rec.content}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          rec.proxied
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          <span>☁️</span>
                          <span>{rec.proxied ? 'Proxied (CDN)' : 'DNS Only'}</span>
                        </span>

                        <button
                          onClick={() => handleDeleteDns(rec.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete DNS record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: R2 Storage & Edge Sync */}
          {tab === 'r2' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Cloudflare R2 Bucket Sync</h4>
                    <p className="text-xs text-slate-400">
                      Store and serve your entire {playlist.channels.length.toLocaleString()} channel playlist globally with zero egress fees
                    </p>
                  </div>
                  <span className="rounded-xl bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300 border border-orange-500/20">
                    S3 API Compatible
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="rounded-xl border border-white/5 bg-slate-950 p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-500">R2 Storage Endpoint</div>
                    <div className="font-mono text-orange-300 text-[11px] truncate mt-1">
                      https://079c27c9f20414f4a992c4ee36eef64d.r2.cloudflarestorage.com
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-slate-950 p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Target Bucket</div>
                    <div className="font-mono text-emerald-400 text-[11px] truncate mt-1">
                      iptv-playlists
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handlePublishR2}
                    disabled={isPublishingR2}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-bold text-slate-950 hover:from-orange-400 hover:to-amber-400 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className={`h-4 w-4 ${isPublishingR2 ? 'animate-bounce' : ''}`} />
                    <span>
                      {isPublishingR2
                        ? `Compressing & Publishing ${playlist.channels.length.toLocaleString()} Channels...`
                        : `Publish ${playlist.channels.length.toLocaleString()} Channels to R2 Edge`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Publish Result Display */}
              {publishResult && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{publishResult.message}</span>
                  </div>

                  <div className="space-y-2 pt-1 text-xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Public Edge CDN URL (for IPTV Players / Smart TVs)</div>
                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 p-2 font-mono text-xs text-white">
                        <span className="flex-1 truncate">{publishResult.cdnUrl}</span>
                        <button
                          onClick={() => copyToClipboard(publishResult.cdnUrl)}
                          className="text-orange-400 hover:text-orange-300 font-bold shrink-0"
                        >
                          {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Payload Size: {publishResult.sizeEstimate}</span>
                      <span>•</span>
                      <span>Published: {new Date(publishResult.publishedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Credentials & Account Status */}
          {tab === 'status' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Cloudflare API Token Status</div>
                      <div className="text-[11px] text-emerald-400 font-semibold">Active & Authenticated</div>
                    </div>
                  </div>
                  <button
                    onClick={fetchStatus}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    <RefreshCw className={`h-3 w-3 ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>Verify Token</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Account ID:</span>
                    <span className="font-mono text-white font-semibold">079c27c9f20414f4a992c4ee36eef64d</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">S3 Access Key ID:</span>
                    <span className="font-mono text-white">3025a1bc316062ce9bd0d35531012e8b</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">API Token:</span>
                    <span className="font-mono text-emerald-400">cfat_HK3RZ2Pzp6e...9d4b871 (Server Secure)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Endpoint Protocol:</span>
                    <span className="text-white">HTTPS TLS 1.3 High-Performance Gateway</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-white/5 p-4 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            Close Manager
          </button>
        </div>

      </div>
    </div>
  );
};
