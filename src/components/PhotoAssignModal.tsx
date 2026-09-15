import React, { useState, useRef } from 'react';
import { Player } from '../types.ts';
import { matchPlayerByFilename } from '../utils/playerMatch.ts';
import { optimizeImageFile } from '../utils/imageOptimizer.ts';
import { syncPlayersToServer } from '../utils/playerStorage.ts';
import { PlayerPhoto } from './PlayerPhoto.tsx';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Sparkles,
  FileCheck,
  Loader2,
  Cloud,
  Download,
  FolderUp,
} from 'lucide-react';

interface PhotoAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onUpdatePlayers: (updated: Player[]) => void;
}

export const PhotoAssignModal: React.FC<PhotoAssignModalProps> = ({
  isOpen,
  onClose,
  players,
  onUpdatePlayers,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const [lastAssignedCount, setLastAssignedCount] = useState<number | null>(null);
  const [unmatchedFiles, setUnmatchedFiles] = useState<string[]>([]);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSyncServerNow = async () => {
    setCloudSyncStatus('Sincronizzazione in corso...');
    const ok = await syncPlayersToServer(players);
    if (ok) {
      setCloudSyncStatus('Salvate sul server con successo! Ora sono visibili su iPhone.');
      setTimeout(() => setCloudSyncStatus(null), 5000);
    } else {
      setCloudSyncStatus('Errore di connessione al server.');
      setTimeout(() => setCloudSyncStatus(null), 4000);
    }
  };

  const handleExportBackupJson = () => {
    const jsonStr = JSON.stringify(players, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ornavassese_Rosa_Foto_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onUpdatePlayers(parsed);
          await syncPlayersToServer(parsed);
          const count = parsed.filter((p: Player) => p.photoUrl && p.photoUrl.length > 50).length;
          setCloudSyncStatus(`Archivio importato! ${count} foto caricate e salvate sul server per iPhone.`);
          setTimeout(() => setCloudSyncStatus(null), 5000);
        }
      } catch (err) {
        alert('File non valido. Assicurati che sia un file JSON esportato in precedenza.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(`0/${fileList.length}`);
    let matchedCount = 0;
    const unmatched: string[] = [];
    const updatedPlayers = [...players];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setProcessingProgress(`${i + 1}/${fileList.length}`);

      const matched = matchPlayerByFilename(file.name, updatedPlayers);
      if (!matched) {
        unmatched.push(file.name);
        continue;
      }

      try {
        const optimizedDataUrl = await optimizeImageFile(file);
        const playerIndex = updatedPlayers.findIndex((p) => p.id === matched.id);
        if (playerIndex >= 0) {
          updatedPlayers[playerIndex] = {
            ...updatedPlayers[playerIndex],
            photoUrl: optimizedDataUrl,
          };
          matchedCount++;
        }
      } catch (err) {
        console.error(`Errore elaborazione foto per ${file.name}:`, err);
        unmatched.push(`${file.name} (errore elaborazione)`);
      }
    }

    onUpdatePlayers(updatedPlayers);
    setLastAssignedCount(matchedCount);
    setUnmatchedFiles(unmatched);
    setIsProcessing(false);
    setProcessingProgress('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleSinglePhoto = async (playerId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const optimizedDataUrl = await optimizeImageFile(file);
      const updated = players.map((p) => (p.id === playerId ? { ...p, photoUrl: optimizedDataUrl } : p));
      onUpdatePlayers(updated);
    } catch (err) {
      console.error('Errore compressione foto:', err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const assignedCount = players.filter(
    (p) => p.photoUrl && (p.photoUrl.startsWith('data:image/') || p.photoUrl.startsWith('blob:') || p.photoUrl.startsWith('http'))
  ).length;

  return (
    <div
      id="photo-assign-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="photo-assign-modal-container"
        className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Assegna Foto per Cognome
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-extrabold">
                  {assignedCount} / {players.length} Foto
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Seleziona o trascina tutte le immagini dei giocatori nominate per cognome (es. <code>ANGELUCCI.jpeg</code>, <code>VISCOMI.jpeg</code>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            id="btn-close-photo-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone & Quick Upload */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/40">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-amber-400 bg-amber-400/10 scale-[1.01]'
                : 'border-zinc-700 hover:border-amber-400/60 bg-zinc-900/60 hover:bg-zinc-900/90'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Trascina qui o clicca per caricare tutte le 21 foto dei giocatori
              </p>
              <p className="text-xs text-zinc-400 mt-1 max-w-md">
                Il sistema riconosce in automatico il cognome (es. <span className="text-amber-300 font-semibold">ANGELUCCI.jpeg</span>, <span className="text-amber-300 font-semibold">DE GIOVANNINI.jpeg</span>, <span className="text-amber-300 font-semibold">VISCOMI.jpeg</span>) e assegna istantaneamente la foto al rispettivo giocatore!
              </p>
            </div>
            <button
              type="button"
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Sfoglia e Carica Tutte le Foto</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Processing Loading Indicator */}
          {isProcessing && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-xs text-amber-300 animate-pulse">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span>
                <strong>Ottimizzazione e compressione immagini in corso...</strong> ({processingProgress || 'attendere prego'})
              </span>
            </div>
          )}

          {/* Success / Warning Notice */}
          {!isProcessing && lastAssignedCount !== null && (
            <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>{lastAssignedCount}</strong> foto associate con successo ai giocatori per cognome!
                </span>
              </div>
              {unmatchedFiles.length > 0 && (
                <span className="text-amber-400 text-[11px]">
                  ({unmatchedFiles.length} file non riconosciuti)
                </span>
              )}
            </div>
          )}

          {/* Cloud Sync & Backup Action Bar (for iPhone and cross-device usage) */}
          <div className="mt-3 p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Cloud className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-zinc-200">Sincronizzazione iPhone & Cloud</div>
                <div className="text-[10px] text-zinc-400">
                  {cloudSyncStatus || `${assignedCount} foto pronte per essere visualizzate su iPhone e altri dispositivi.`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncServerNow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-all shadow-sm"
                title="Invia tutte le foto presenti al server in modo che appaiano su iPhone"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Salva sul Server</span>
              </button>

              <button
                type="button"
                onClick={handleExportBackupJson}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all"
                title="Scarica un file .json di backup contenente nomi e foto per archivio"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Esporta Backup</span>
              </button>

              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all"
                title="Importa un file di backup .json precedentemente salvato"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Importa Backup</span>
              </button>

              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportBackupJson}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Players Photo Checklist */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-amber-400" />
              Stato Foto Giocatori ({assignedCount}/{players.length})
            </h3>
            <span className="text-[11px] text-zinc-500">
              Ordinati per Ruolo e Cognome A-Z
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {players.map((player) => {
              const hasPhoto = Boolean(
                player.photoUrl &&
                  (player.photoUrl.startsWith('data:image/') ||
                    player.photoUrl.startsWith('blob:') ||
                    player.photoUrl.startsWith('http'))
              );
              const roleBadgeColor =
                player.role === 'POR'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : player.role === 'DIF'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : player.role === 'CEN'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30';

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-2.5 bg-zinc-950/70 border rounded-xl transition-all group ${
                    hasPhoto ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Photo Thumbnail */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-900 shrink-0 shadow">
                    <PlayerPhoto player={player} />
                    <label
                      title={`Cambia foto per ${player.name}`}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSinglePhoto(player.id, e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white uppercase truncate">
                        {player.name}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border shrink-0 ${roleBadgeColor}`}
                      >
                        {player.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      {hasPhoto ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Foto caricata
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                          <AlertCircle className="w-3 h-3 text-zinc-600" />
                          Nessuna foto
                        </span>
                      )}

                      <label
                        className="cursor-pointer text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-zinc-300 transition-colors shrink-0"
                        title={`Carica foto per ${player.name}`}
                      >
                        <span>{hasPhoto ? 'Cambia' : 'Carica'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSinglePhoto(player.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Le foto caricate vengono salvate automaticamente in memoria locale.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl shadow transition-colors"
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  );
};
