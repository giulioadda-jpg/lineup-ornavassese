import React, { useState, useMemo } from 'react';
import { Player, PlayerRole, PitchPosition } from '../types.ts';
import { X, Search, UserPlus, Trash2, Check, ArrowRightLeft } from 'lucide-react';
import { generatePlayerAvatarSvg } from '../utils/avatar.ts';
import { sortPlayersByRoleAndSurname } from '../utils/playerSort.ts';
import { PlayerPhoto } from './PlayerPhoto.tsx';

interface PlayerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: PitchPosition | null;
  currentPlayer: Player | null;
  allPlayers: Player[];
  assignedPlayerIds: { [slotId: number]: string | null };
  onSelectPlayer: (slotId: number, playerId: string | null) => void;
  onAddNewPlayer: (newPlayer: Player) => void;
}

export const PlayerSelectModal: React.FC<PlayerSelectModalProps> = ({
  isOpen,
  onClose,
  position,
  currentPlayer,
  allPlayers,
  assignedPlayerIds,
  onSelectPlayer,
  onAddNewPlayer,
}) => {
  if (!isOpen || !position) return null;

  // Initialize filter with slot's recommended role
  const [selectedRole, setSelectedRole] = useState<PlayerRole | 'ALL'>(position.role);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New player inline form state
  const [newName, setNewName] = useState(''); // Cognome
  const [newFirstName, setNewFirstName] = useState(''); // Nome
  const [newRole, setNewRole] = useState<PlayerRole>(position.role);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>('');

  // Map of which slot each player is assigned to
  const playerSlotMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(assignedPlayerIds).forEach(([slotStr, pId]) => {
      if (typeof pId === 'string' && pId) {
        map[pId] = Number(slotStr);
      }
    });
    return map;
  }, [assignedPlayerIds]);

  // Filter and sort players strictly by Role and Cognome A-Z
  const filteredPlayers = useMemo(() => {
    const matched = allPlayers.filter((p) => {
      const matchesRole = selectedRole === 'ALL' || p.role === selectedRole;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        (p.firstName && p.firstName.toLowerCase().includes(query));
      return matchesRole && matchesSearch;
    });

    return sortPlayersByRoleAndSurname(matched);
  }, [allPlayers, selectedRole, searchQuery]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto fill surname from filename if empty
    if (!newName) {
      const parsedName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/^(DIF|CEN|ATT|POR)[_-]?/i, '')
        .replace(/^\d+[-_]?/, '')
        .trim()
        .toUpperCase();
      setNewName(parsedName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewPhotoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNewPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const finalPhoto = newPhotoUrl || generatePlayerAvatarSvg(newName.trim(), newRole);

    const created: Player = {
      id: `p_custom_${Date.now()}`,
      name: newName.trim().toUpperCase(),
      firstName: newFirstName.trim() || undefined,
      role: newRole,
      photoUrl: finalPhoto,
    };

    onAddNewPlayer(created);
    onSelectPlayer(position.slotId, created.id);
    onClose();
  };

  return (
    <div
      id="player-select-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="player-select-modal-container"
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Posizione #{position.slotId} • {position.label} ({position.role})
            </div>
            <h2 className="text-lg font-bold text-white">Seleziona Giocatore</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            id="btn-close-player-select-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Player summary & Remove button */}
        {currentPlayer && (
          <div className="px-6 py-3 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                <PlayerPhoto player={currentPlayer} />
              </div>
              <div>
                <span className="text-xs text-zinc-400">Attualmente assegnato:</span>
                <div className="text-sm font-bold text-white uppercase">
                  {currentPlayer.name} {currentPlayer.firstName && <span className="text-zinc-400 font-normal capitalize">({currentPlayer.firstName})</span>}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onSelectPlayer(position.slotId, null);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-rose-900/40 transition-colors"
              id="btn-remove-current-player"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Rimuovi
            </button>
          </div>
        )}

        {/* Role Filters & Search */}
        <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-900">
          {/* Role Filter Tabs (POR, DIF, CEN, ATT) */}
          <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            {(['ALL', 'POR', 'DIF', 'CEN', 'ATT'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedRole === role
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                id={`filter-role-tab-${role}`}
              >
                {role === 'ALL' ? 'Tutti' : role}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per cognome o nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              id="input-search-player"
            />
          </div>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-zinc-800/40">
          {filteredPlayers.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 space-y-2">
              <p className="text-sm">Nessun giocatore trovato per questa ricerca.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-xl hover:bg-amber-400/20"
              >
                <UserPlus className="w-4 h-4" />
                Crea subito questo giocatore
              </button>
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const assignedSlot = playerSlotMap[player.id];
              const isCurrentHere = assignedSlot === position.slotId;

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    onSelectPlayer(position.slotId, player.id);
                    onClose();
                  }}
                  className={`pt-2 first:pt-0 flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isCurrentHere
                      ? 'bg-amber-400/15 border border-amber-400/40'
                      : 'hover:bg-zinc-800/70 border border-transparent'
                  }`}
                  id={`player-row-${player.id}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Photo thumbnail */}
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-zinc-700 bg-zinc-950 shrink-0">
                      <PlayerPhoto player={player} />
                    </div>

                    {/* Name and Role */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white tracking-wide uppercase">
                          {player.name}
                        </span>
                        {player.firstName && (
                          <span className="text-xs text-zinc-400 capitalize">
                            {player.firstName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            player.role === 'POR'
                              ? 'bg-amber-500/20 text-amber-300'
                              : player.role === 'DIF'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : player.role === 'CEN'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {player.role}
                        </span>

                        {assignedSlot && (
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            {assignedSlot === position.slotId ? (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Assegnato qui
                              </span>
                            ) : (
                              <span className="text-zinc-500 flex items-center gap-1">
                                <ArrowRightLeft className="w-3 h-3" /> In campo (Slot #{assignedSlot})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-colors ${
                      isCurrentHere
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                    }`}
                  >
                    {isCurrentHere ? 'Selezionato' : 'Inserisci'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Add new player toggle */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300"
            id="btn-toggle-add-player-inline"
          >
            <UserPlus className="w-4 h-4" />
            {showAddForm ? 'Annulla Nuovo Giocatore' : '+ Aggiungi Nuovo Giocatore'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 rounded-xl"
            id="btn-dismiss-modal"
          >
            Chiudi
          </button>
        </div>

        {/* Inline Add Player Form */}
        {showAddForm && (
          <form
            onSubmit={handleSaveNewPlayer}
            className="p-4 border-t border-zinc-800 bg-zinc-900/95 space-y-3 animate-in slide-in-from-bottom duration-200"
            id="form-add-player-inline"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Crea e Inserisci Giocatore
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Cognome *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. ROSSI"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.toUpperCase())}
                  className="w-full mt-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:border-amber-400 focus:outline-none uppercase"
                  id="input-inline-player-surname"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Nome</label>
                <input
                  type="text"
                  placeholder="Es. Mario"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:border-amber-400 focus:outline-none"
                  id="input-inline-player-firstname"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Ruolo</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as PlayerRole)}
                  className="w-full mt-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:border-amber-400 focus:outline-none"
                  id="select-inline-player-role"
                >
                  <option value="POR">POR (Portiere)</option>
                  <option value="DIF">DIF (Difensore)</option>
                  <option value="CEN">CEN (Centrocampista)</option>
                  <option value="ATT">ATT (Attaccante)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Carica Foto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full mt-1 text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                  id="input-inline-player-photo"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-amber-400 text-zinc-950 rounded-lg hover:bg-amber-300"
                id="btn-save-inline-player"
              >
                Crea e Assegna
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
