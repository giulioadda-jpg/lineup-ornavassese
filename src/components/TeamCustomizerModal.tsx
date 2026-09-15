import React, { useState, useRef } from 'react';
import { TeamConfig } from '../types.ts';
import { X, Shield, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { DEFAULT_LOGO_PATH } from '../data/teamLogo.ts';

interface TeamCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TeamConfig;
  onUpdateConfig: (updated: TeamConfig) => void;
}

export const TeamCustomizerModal: React.FC<TeamCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  const [teamName, setTeamName] = useState(config.name || 'ORNAVASSESE');
  const [subtitle, setSubtitle] = useState(config.subtitle || 'XI TITOLARI');
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || DEFAULT_LOGO_PATH);
  const [pitchStyle, setPitchStyle] = useState(config.pitchStyle);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setLogoUrl(dataUrl);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);

        // Permanently persist file on server
        try {
          await fetch('/api/team/logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl }),
          });
        } catch (err) {
          console.error('Errore salvataggio logo sul server:', err);
        }
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      name: teamName.trim() || 'ORNAVASSESE',
      subtitle: subtitle.trim() || 'XI TITOLARI',
      logoUrl: logoUrl.trim() || DEFAULT_LOGO_PATH,
      pitchStyle,
    });
    onClose();
  };

  return (
    <div
      id="team-customizer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="team-customizer-modal-container"
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Logo & Grafica Squadra
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Carica la tua immagine originale e personalizza i testi
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
          {/* Logo Section - Real Image Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Immagine Logo Squadra
              </label>
              {uploadSuccess && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  <Check className="w-3 h-3" /> Immagine caricata con successo!
                </span>
              )}
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="p-4 bg-zinc-950 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 transition-colors flex flex-col sm:flex-row items-center gap-4"
            >
              {/* Image Preview */}
              <div className="w-20 h-24 shrink-0 flex items-center justify-center bg-zinc-900/60 rounded-lg p-2 border border-zinc-800">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo Squadra"
                    className="w-full h-full object-contain drop-shadow-md"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      // Fallback if path doesn't load yet
                    }}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-600" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">
                    Trascina qui il file oppure clicca per selezionarlo
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Seleziona il file originale (es. <span className="text-zinc-200 font-mono">LOGO SQUADRA.png</span>). Verrà inserita l'immagine esatta senza rielaborazioni vettoriali.
                  </div>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold border border-zinc-600 transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    {isUploading ? 'Caricamento in corso...' : 'Carica Immagine Logo'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Team Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Titolo Principale (es. ORNAVASSESE)
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value.toUpperCase())}
              placeholder="Es. ORNAVASSESE"
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-white uppercase tracking-wide font-bold"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Didascalia / Titolo Superiore (es. XI TITOLARI)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value.toUpperCase())}
              placeholder="Es. XI TITOLARI"
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-white uppercase tracking-wide"
            />
          </div>

          {/* Pitch Style */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Stile Campo di Gioco
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPitchStyle('minimal')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  pitchStyle === 'minimal'
                    ? 'border-white bg-zinc-800 text-white shadow'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs font-bold">Linee Campo Eleganti</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Linee bianche sottili e discrete
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPitchStyle('pure-black')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  pitchStyle === 'pure-black'
                    ? 'border-white bg-zinc-800 text-white shadow'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs font-bold">Sfondo Nero Puro</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Grafica minimalista senza linee
                </div>
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl shadow-md transition-all"
            >
              Salva Modifiche
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
