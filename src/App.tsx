import React, { useState, useEffect, useMemo } from 'react';
import { TacticalModule, Player, LineupState, TeamConfig } from './types.ts';
import { FORMATIONS } from './data/formations.ts';
import { DEFAULT_PLAYERS, DEFAULT_INITIAL_LINEUP } from './data/defaultPlayers.ts';
import { generateDefaultTeamLogo } from './utils/avatar.ts';
import { DEFAULT_LOGO_PATH } from './data/teamLogo.ts';
import { downloadLineupGraphic } from './utils/exportCanvas.ts';
import { LineupBoard } from './components/LineupBoard.tsx';
import { PlayerSelectModal } from './components/PlayerSelectModal.tsx';
import { RosterManagerModal } from './components/RosterManagerModal.tsx';
import { TeamCustomizerModal } from './components/TeamCustomizerModal.tsx';
import { PhotoAssignModal } from './components/PhotoAssignModal.tsx';
import { matchPlayerByFilename } from './utils/playerMatch.ts';
import { optimizeImageFile } from './utils/imageOptimizer.ts';
import {
  savePlayersToStorage,
  loadPlayersFromStorage,
  getInitialPlayersSync,
  syncPlayersToServer,
} from './utils/playerStorage.ts';
import {
  Download,
  Users,
  Shield,
  RotateCcw,
  Sparkles,
  Check,
  ChevronRight,
  Info,
  Camera,
  Upload,
  Cloud,
  CheckCircle2,
} from 'lucide-react';

const STORAGE_KEY_LINEUP = 'lineup_app_slots_v2';
const STORAGE_KEY_MODULE = 'lineup_app_module_v2';
const STORAGE_KEY_TEAM = 'lineup_app_team_v3';

export default function App() {
  // Current Tactical Module: starts with 442 as requested
  const [currentModuleId, setCurrentModuleId] = useState<TacticalModule>('442');

  // Players database: sync from localStorage first for immediate render, then hydrate from IndexedDB
  const [players, setPlayers] = useState<Player[]>(() => getInitialPlayersSync());

  // Current lineup assignments (slotId 1..11 -> playerId)
  const [lineup, setLineup] = useState<LineupState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LINEUP);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_INITIAL_LINEUP;
  });

  // Team settings: ORNAVASSESE as default title, XI TITOLARI as default caption
  const [teamConfig, setTeamConfig] = useState<TeamConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEAM);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isOldSvg =
          typeof parsed.logoUrl === 'string' &&
          (parsed.logoUrl.includes('image/svg') || parsed.logoUrl.includes('<svg'));
        return {
          ...parsed,
          logoUrl: isOldSvg ? DEFAULT_LOGO_PATH : parsed.logoUrl || DEFAULT_LOGO_PATH,
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      name: 'ORNAVASSESE',
      logoUrl: DEFAULT_LOGO_PATH,
      subtitle: 'XI TITOLARI',
      pitchStyle: 'minimal',
    };
  });

  // Server sync state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('idle');

  // Hydrate all players and photos on startup (Server -> IndexedDB -> localStorage)
  useEffect(() => {
    loadPlayersFromStorage().then((stored) => {
      if (stored && stored.length > 0) {
        setPlayers(stored);
        const hasPhotos = stored.some((p) => p.photoUrl && p.photoUrl.length > 50);
        if (hasPhotos) {
          syncPlayersToServer(stored).then((ok) => {
            if (ok) setSyncStatus('synced');
          });
        }
      }
    });

    // Also hydrate lineup and team from server if available (for cross-device parity)
    fetch('/api/lineup')
      .then((r) => r.json())
      .then((data) => {
        if (data?.lineup) setLineup(data.lineup);
        if (data?.module) setCurrentModuleId(data.module);
      })
      .catch(() => {});

    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => {
        if (data?.team) {
          const isSvg =
            typeof data.team.logoUrl === 'string' &&
            (data.team.logoUrl.includes('image/svg') || data.team.logoUrl.includes('<svg'));
          const safeLogo = isSvg ? DEFAULT_LOGO_PATH : data.team.logoUrl || DEFAULT_LOGO_PATH;
          setTeamConfig((prev) => ({
            ...prev,
            ...data.team,
            logoUrl: safeLogo,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    const ok = await syncPlayersToServer(players);
    try {
      await fetch('/api/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineup, module: currentModuleId }),
      });
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamConfig }),
      });
    } catch {}

    if (ok) {
      setSyncStatus('synced');
      showToast('Sincronizzazione completata! Visibile su iPhone e tutti i dispositivi.');
    } else {
      setSyncStatus('idle');
      showToast('Errore durante la sincronizzazione con il server.', 'info');
    }
  };

  // Modals state
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Global Drag & Drop State
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [toastNotice, setToastNotice] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastNotice({ message, type });
    setTimeout(() => setToastNotice(null), 4500);
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isGlobalDragging) setIsGlobalDragging(true);
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set false if leaving window
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsGlobalDragging(false);
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = (Array.from(files) as File[]).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    showToast(`Elaborazione e ottimizzazione di ${fileList.length} foto in corso...`, 'info');

    let matchedCount = 0;
    const updatedPlayers = [...players];

    for (const file of fileList) {
      const matched = matchPlayerByFilename(file.name, updatedPlayers);
      if (!matched) continue;

      try {
        const optimizedDataUrl = await optimizeImageFile(file);
        const idx = updatedPlayers.findIndex((p) => p.id === matched.id);
        if (idx >= 0) {
          updatedPlayers[idx] = {
            ...updatedPlayers[idx],
            photoUrl: optimizedDataUrl,
          };
          matchedCount++;
        }
      } catch (err) {
        console.error(`Errore ottimizzazione foto ${file.name}:`, err);
      }
    }

    setPlayers(updatedPlayers);
    if (matchedCount > 0) {
      showToast(`${matchedCount} foto associate con successo ai giocatori per cognome!`);
    } else {
      showToast(`Nessun giocatore riconosciuto nei file caricati. Clicca su 'Assegna Foto' per i dettagli.`, 'info');
    }
  };

  // Sync players to durable storage (IndexedDB + safe localStorage fallback)
  useEffect(() => {
    savePlayersToStorage(players);
  }, [players]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LINEUP, JSON.stringify(lineup));
      localStorage.setItem(STORAGE_KEY_MODULE, currentModuleId);
      fetch('/api/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineup, module: currentModuleId }),
      }).catch(() => {});
    } catch (e) {
      console.warn('Could not save lineup to localStorage', e);
    }
  }, [lineup, currentModuleId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(teamConfig));
      fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamConfig }),
      }).catch(() => {});
    } catch (e) {
      console.warn('Could not save teamConfig to localStorage', e);
    }
  }, [teamConfig]);

  const currentModule = FORMATIONS[currentModuleId] || FORMATIONS['442'];

  // Map of slotId to Player object
  const slotsWithPlayers = useMemo(() => {
    const result: { [slotId: number]: Player | null } = {};
    for (let i = 1; i <= 11; i++) {
      const pId = lineup[i];
      result[i] = pId ? players.find((p) => p.id === pId) || null : null;
    }
    return result;
  }, [lineup, players]);

  // Handle player assignment to slot
  const handleAssignPlayer = (slotId: number, playerId: string | null) => {
    setLineup((prev) => {
      const updated = { ...prev };
      // If player already in another slot, swap or remove from previous slot
      if (playerId) {
        Object.entries(updated).forEach(([sId, existingPId]) => {
          if (existingPId === playerId && Number(sId) !== slotId) {
            updated[Number(sId)] = prev[slotId] || null; // Swap!
          }
        });
      }
      updated[slotId] = playerId;
      return updated;
    });
  };

  // Quick auto-fill lineup based on role positions
  const handleAutoFill = () => {
    const newLineup: LineupState = {};
    const usedPlayerIds = new Set<string>();

    currentModule.positions.forEach((pos) => {
      // Find first unused player of this role
      const candidate = players.find(
        (p) => p.role === pos.role && !usedPlayerIds.has(p.id)
      );
      if (candidate) {
        newLineup[pos.slotId] = candidate.id;
        usedPlayerIds.add(candidate.id);
      } else {
        // Fallback to any unused player
        const fallback = players.find((p) => !usedPlayerIds.has(p.id));
        if (fallback) {
          newLineup[pos.slotId] = fallback.id;
          usedPlayerIds.add(fallback.id);
        }
      }
    });

    setLineup(newLineup);
  };

  // Clear all slots
  const handleClearLineup = () => {
    if (confirm('Vuoi svuotare tutti i cerchi della formazione?')) {
      setLineup({});
    }
  };

  // Reset to initial default
  const handleResetDefaults = () => {
    setPlayers(DEFAULT_PLAYERS);
    setLineup(DEFAULT_INITIAL_LINEUP);
    setCurrentModuleId('442');
    setTeamConfig({
      name: 'ORNAVASSESE',
      logoUrl: generateDefaultTeamLogo(),
      subtitle: 'XI TITOLARI',
      pitchStyle: 'minimal',
    });
  };

  // High-Res Export Download (1080x1920)
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      await downloadLineupGraphic({
        module: currentModule,
        slots: slotsWithPlayers,
        teamConfig,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Download error:', err);
      alert('Si è verificato un errore durante la generazione della grafica.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Selected slot position info
  const selectedPosition = selectedSlotId
    ? currentModule.positions.find((p) => p.slotId === selectedSlotId) || null
    : null;

  return (
    <div
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
      className="relative min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-amber-400 selection:text-zinc-950 font-sans"
    >
      {/* Toast Notification */}
      {toastNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-900 border border-amber-400/40 text-white shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-bold">{toastNotice.message}</span>
        </div>
      )}

      {/* Global Drag & Drop Overlay */}
      {isGlobalDragging && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm border-4 border-dashed border-amber-400 flex flex-col items-center justify-center gap-4 text-center pointer-events-none animate-in fade-in duration-150">
          <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-2xl">
            <Upload className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white">Rilascia le Foto qui</h3>
            <p className="text-sm text-zinc-300 max-w-md">
              Verranno abbinate in automatico ai giocatori dell&apos;Ornavassese confrontando il cognome (es. ANGELUCCI, BETTONI, VISCOMI...)
            </p>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-base shadow-sm">
              XI
            </div>
            <div>
              <div className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
                Line Up Formazione
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono font-bold">
                  1080x1920
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Grafica verticale per la formazione della tua squadra
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-zinc-900 text-zinc-300 hover:text-white border-zinc-700/80 hover:bg-zinc-800'
              }`}
              id="btn-cloud-sync"
              title="Salva e sincronizza foto e formazione con il server (visibile su iPhone)"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {syncStatus === 'synced'
                  ? 'iPhone Sync: OK'
                  : syncStatus === 'syncing'
                  ? 'Sincronizzazione...'
                  : 'Sincronizza iPhone'}
              </span>
            </button>

            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-400/20"
              id="btn-open-photo-assign"
              title="Assegna automaticamente le foto dei giocatori per cognome"
            >
              <Camera className="w-4 h-4" />
              <span>Assegna Foto</span>
            </button>

            <button
              onClick={() => setIsRosterModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl transition-colors shadow-sm"
              id="btn-open-roster-manager"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Gestione</span> Rosa
            </button>

            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl transition-colors shadow-sm"
              id="btn-open-team-customizer"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Logo &</span> Squadra
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Column: Graphic Pitch Preview (1080x1920 format) */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[460px]">
            {/* The 11 circles pitch board */}
            <LineupBoard
              module={currentModule}
              slots={slotsWithPlayers}
              selectedSlotId={selectedSlotId}
              onSelectSlot={(slotId) => setSelectedSlotId(slotId)}
              teamConfig={teamConfig}
              onOpenTeamCustomizer={() => setIsTeamModalOpen(true)}
            />

            {/* Helper tip under pitch */}
            <div className="mt-2.5 px-2 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                Clicca su qualsiasi cerchio per assegnare o cambiare il giocatore
              </span>
              <span className="font-mono text-zinc-500">9:16 Verticale</span>
            </div>
          </div>
        </div>

        {/* Right Column: Controls, Module Switcher & Download */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          {/* Tactical Module Selector ("sotto un opzione deve potermi farmi cambiare modulo: 352, 532, 433, 343, 4231") */}
          <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                  Schema Tattico
                </span>
                <h2 className="text-base font-extrabold text-white">Scegli il Modulo</h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg">
                Attuale: {currentModule.label}
              </span>
            </div>

            {/* Module Buttons Grid */}
            <div className="grid grid-cols-3 gap-2">
              {(['442', '352', '532', '433', '343', '4231'] as TacticalModule[]).map(
                (modId) => {
                  const mod = FORMATIONS[modId];
                  const isActive = currentModuleId === modId;
                  return (
                    <button
                      key={modId}
                      onClick={() => {
                        setCurrentModuleId(modId);
                        setSelectedSlotId(null);
                      }}
                      className={`py-3 px-2 rounded-xl text-center transition-all border font-extrabold ${
                        isActive
                          ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-md shadow-amber-500/20 scale-[1.02]'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                      }`}
                      id={`btn-module-${modId}`}
                    >
                      <div className="text-base tracking-tight">{mod.label}</div>
                      <div
                        className={`text-[9px] uppercase tracking-tighter mt-0.5 truncate ${
                          isActive ? 'text-zinc-900' : 'text-zinc-500'
                        }`}
                      >
                        {modId === '442'
                          ? 'Classico'
                          : modId === '352'
                          ? 'Esterni'
                          : modId === '532'
                          ? 'Difesa 5'
                          : modId === '433'
                          ? 'Tridente'
                          : modId === '343'
                          ? 'Offensivo'
                          : 'Trequarti'}
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
              {currentModule.description}
            </p>
          </div>

          {/* Download Action Card ("una volta ultimata la disposizione devo poter scaricare la grafica che deve essere verticale formato 1080x1920 pixel") */}
          <div className="p-5 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl shadow-xl space-y-4">
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                Esportazione Grafica HD
              </span>
              <h2 className="text-base font-extrabold text-white">Scarica Grafica Partita</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Genera istantaneamente il file PNG in alta risoluzione{' '}
                <strong className="text-zinc-200">1080 x 1920 pixel</strong>, ideale per storie
                Instagram, WhatsApp, social o stampa.
              </p>
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`w-full py-4 px-6 rounded-xl font-extrabold text-sm tracking-wide uppercase transition-all shadow-lg flex items-center justify-center gap-2.5 ${
                downloadSuccess
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 hover:shadow-amber-500/25 active:scale-[0.99]'
              }`}
              id="btn-download-lineup-graphic"
            >
              {isDownloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  <span>Elaborazione grafica 1080x1920 in corso...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Grafica Scaricata con Successo!</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Scarica Grafica (1080x1920 PNG)</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Roster and Setup Guide */}
          <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Azioni Rapide Formazione
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAutoFill}
                className="p-2.5 text-left bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
              >
                <div className="text-xs font-bold text-white">Completa in Automatico</div>
                <div className="text-[10px] text-zinc-400">Riempi gli 11 cerchi con la rosa</div>
              </button>

              <button
                onClick={handleClearLineup}
                className="p-2.5 text-left bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
              >
                <div className="text-xs font-bold text-rose-400">Svuota Formazione</div>
                <div className="text-[10px] text-zinc-400">Rimuovi tutti i cerchi</div>
              </button>
            </div>

            {/* Quick Summary of Current 11 */}
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="text-[11px] text-zinc-400 flex items-center justify-between mb-2">
                <span>Giocatori in campo:</span>
                <span className="font-bold text-zinc-200">
                  {Object.values(lineup).filter(Boolean).length} / 11
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentModule.positions.map((pos) => {
                  const p = slotsWithPlayers[pos.slotId];
                  return (
                    <button
                      key={pos.slotId}
                      onClick={() => setSelectedSlotId(pos.slotId)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                        p
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-amber-400'
                          : 'bg-zinc-950 border-dashed border-zinc-700 text-zinc-500 hover:text-amber-400'
                      }`}
                    >
                      {pos.label}: {p ? p.name : '—'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Select Player for a slot */}
      <PlayerSelectModal
        isOpen={selectedSlotId !== null}
        onClose={() => setSelectedSlotId(null)}
        position={selectedPosition}
        currentPlayer={selectedSlotId ? slotsWithPlayers[selectedSlotId] : null}
        allPlayers={players}
        assignedPlayerIds={lineup}
        onSelectPlayer={handleAssignPlayer}
        onAddNewPlayer={(newPlayer) => setPlayers((prev) => [...prev, newPlayer])}
      />

      {/* Modal: Roster & Bulk Photo Manager */}
      <RosterManagerModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        players={players}
        onUpdatePlayers={setPlayers}
        onResetToDefault={handleResetDefaults}
      />

      {/* Modal: Photo Auto-Assign by Surname */}
      <PhotoAssignModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        players={players}
        onUpdatePlayers={setPlayers}
      />

      {/* Modal: Team branding & logo customizer */}
      <TeamCustomizerModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        config={teamConfig}
        onUpdateConfig={setTeamConfig}
      />
    </div>
  );
}
