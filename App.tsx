
import React, { useState, useEffect, useCallback } from 'react';
import { Cabin, Reservation, ViewType } from './types';
import { CalendarIcon, HomeIcon, ChartBarIcon, PlusIcon, CameraIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { analyzeReservations } from './services/geminiService';

const INITIAL_CABINS: Cabin[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Cabaña ${i + 1}`,
  image: null,
}));

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('calendar');
  const [cabins, setCabins] = useState<Cabin[]>(() => {
    const saved = localStorage.getItem('rli_cabins');
    return saved ? JSON.parse(saved) : INITIAL_CABINS;
  });
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem('rli_reservations');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showResModal, setShowResModal] = useState(false);
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('rli_cabins', JSON.stringify(cabins));
  }, [cabins]);

  useEffect(() => {
    localStorage.setItem('rli_reservations', JSON.stringify(reservations));
  }, [reservations]);

  const handleUpdateCabinImage = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCabins(prev => prev.map(c => c.id === id ? { ...c, image: reader.result as string } : c));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOrEditReservation = (res: Reservation) => {
    if (editingRes) {
      setReservations(prev => prev.map(r => r.id === res.id ? res : r));
    } else {
      setReservations(prev => [...prev, res]);
    }
    setShowResModal(false);
    setEditingRes(null);
  };

  const handleDeleteReservation = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta reserva?')) {
      setReservations(prev => prev.filter(r => r.id !== id));
    }
  };

  const fetchAiAnalysis = async () => {
    setLoadingAi(true);
    const result = await analyzeReservations(reservations, cabins);
    setAiAnalysis(result || '');
    setLoadingAi(false);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  return (
    <div className="flex flex-col min-h-screen pb-20 max-w-md mx-auto bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-10">
        <h1 className="text-xl font-bold">Rancho Laguna Ita</h1>
        <p className="text-xs opacity-80 uppercase tracking-widest">Gestión de Reservas</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeView === 'calendar' && (
          <div className="p-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-emerald-900 capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 bg-emerald-100 rounded-full hover:bg-emerald-200">
                  <ChevronLeftIcon className="w-5 h-5 text-emerald-700" />
                </button>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 bg-emerald-100 rounded-full hover:bg-emerald-200">
                  <ChevronRightIcon className="w-5 h-5 text-emerald-700" />
                </button>
              </div>
            </div>

            <div className="calendar-grid gap-1 mb-6">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 pb-2">{d}</div>
              ))}
              {/* Padding for start of month */}
              {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map(day => {
                const dayRes = reservations.filter(r => 
                  isWithinInterval(day, { start: parseISO(r.startDate), end: parseISO(r.endDate) })
                );
                return (
                  <div key={day.toString()} className="h-16 border border-emerald-50 relative flex flex-col items-center justify-center p-1 rounded hover:bg-emerald-50">
                    <span className="text-xs absolute top-1 right-1 text-gray-400">{format(day, 'd')}</span>
                    <div className="flex flex-wrap gap-0.5 justify-center mt-2">
                      {dayRes.slice(0, 4).map(r => (
                        <div key={r.id} className="w-2 h-2 rounded-full bg-emerald-500" title={r.clientName}></div>
                      ))}
                      {dayRes.length > 4 && <span className="text-[8px] text-emerald-600">+{dayRes.length - 4}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Próximas Reservas</h3>
                <button 
                  onClick={() => setShowResModal(true)}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm shadow-sm active:scale-95 transition-all"
                >
                  <PlusIcon className="w-4 h-4" /> Nueva Reserva
                </button>
              </div>
              
              <div className="space-y-2">
                {reservations.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 italic">No hay reservas registradas.</p>
                ) : (
                  reservations
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .map(res => (
                      <div key={res.id} className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
                          {cabins.find(c => c.id === res.cabinId)?.image ? (
                            <img src={cabins.find(c => c.id === res.cabinId)!.image!} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <HomeIcon className="w-6 h-6 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{res.clientName}</h4>
                          <p className="text-xs text-gray-500">
                            {cabins.find(c => c.id === res.cabinId)?.name} • {format(parseISO(res.startDate), 'dd/MM')} al {format(parseISO(res.endDate), 'dd/MM')}
                          </p>
                          <p className="text-xs font-medium text-emerald-600">Seña: ${res.deposit}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingRes(res); setShowResModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                            <PlusIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteReservation(res.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === 'cabins' && (
          <div className="p-4 animate-fadeIn">
            <h2 className="text-lg font-bold mb-4 text-emerald-900">Personalizar Cabañas</h2>
            <div className="grid grid-cols-2 gap-4">
              {cabins.map(cabin => (
                <div key={cabin.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 relative group overflow-hidden border-2 border-emerald-100 mb-3">
                    {cabin.image ? (
                      <img src={cabin.image} alt={cabin.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <HomeIcon className="w-10 h-10 text-emerald-200" />
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <CameraIcon className="w-6 h-6 text-white" />
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpdateCabinImage(cabin.id, e)} />
                    </label>
                  </div>
                  <input 
                    type="text" 
                    value={cabin.name} 
                    onChange={(e) => setCabins(prev => prev.map(c => c.id === cabin.id ? { ...c, name: e.target.value } : c))}
                    className="text-sm font-bold w-full text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none rounded-lg p-2 bg-gray-200 text-gray-900 border-none placeholder-gray-500"
                    placeholder="Nombre de cabaña"
                  />
                  <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-tighter font-semibold">Cabaña ID: {cabin.id}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'insights' && (
          <div className="p-4 animate-fadeIn">
            <h2 className="text-lg font-bold mb-4 text-emerald-900">Análisis Inteligente</h2>
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
              <div className="flex items-center gap-3 mb-4">
                <ChartBarIcon className="w-8 h-8 text-emerald-600" />
                <h3 className="font-bold text-emerald-800">Estadísticas de Rancho</h3>
              </div>
              
              {loadingAi ? (
                <div className="flex flex-col items-center py-10 space-y-3">
                  <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-sm text-emerald-600 italic">Analizando datos con Gemini...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="prose prose-sm text-emerald-900 space-y-4">
                  {aiAnalysis.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                  <button 
                    onClick={fetchAiAnalysis}
                    className="mt-4 text-xs text-emerald-600 underline font-medium"
                  >
                    Actualizar análisis
                  </button>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-500 mb-4">Obtén un resumen inteligente de tu ocupación y finanzas.</p>
                  <button 
                    onClick={fetchAiAnalysis}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-xl shadow-md active:scale-95"
                  >
                    Generar Análisis
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs text-gray-400 block mb-1">Total Reservas</span>
                <span className="text-2xl font-bold text-emerald-700">{reservations.length}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs text-gray-400 block mb-1">Recaudado (Señas)</span>
                <span className="text-2xl font-bold text-emerald-700">${reservations.reduce((acc, curr) => acc + curr.deposit, 0)}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Reservation Modal */}
      {(showResModal || editingRes) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-popIn">
            <h3 className="text-xl font-bold mb-6 text-gray-800">
              {editingRes ? 'Editar Reserva' : 'Nueva Reserva'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddOrEditReservation({
                id: editingRes?.id || Math.random().toString(36).substr(2, 9),
                cabinId: Number(formData.get('cabinId')),
                clientName: String(formData.get('clientName')),
                deposit: Number(formData.get('deposit')),
                startDate: String(formData.get('startDate')),
                endDate: String(formData.get('endDate')),
                notes: String(formData.get('notes')),
              });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Cabaña</label>
                <select name="cabinId" defaultValue={editingRes?.cabinId || cabins[0].id} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500">
                  {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Cliente</label>
                <input name="clientName" defaultValue={editingRes?.clientName} required type="text" placeholder="Ej: Juan Pérez" className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Entrada</label>
                  <input name="startDate" defaultValue={editingRes?.startDate} required type="date" className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Salida</label>
                  <input name="endDate" defaultValue={editingRes?.endDate} required type="date" className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Seña Realizada ($)</label>
                <input name="deposit" defaultValue={editingRes?.deposit} required type="number" placeholder="Ej: 5000" className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Notas</label>
                <textarea name="notes" defaultValue={editingRes?.notes} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500" rows={2} placeholder="Opcional..."></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowResModal(false); setEditingRes(null); }} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold active:scale-95">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold active:scale-95 shadow-lg shadow-emerald-200">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-around p-3 pb-6 z-40">
        <button onClick={() => setActiveView('calendar')} className={`flex flex-col items-center gap-1 transition-colors ${activeView === 'calendar' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <CalendarIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Calendario</span>
        </button>
        <button onClick={() => setActiveView('cabins')} className={`flex flex-col items-center gap-1 transition-colors ${activeView === 'cabins' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <HomeIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Cabañas</span>
        </button>
        <button onClick={() => setActiveView('insights')} className={`flex flex-col items-center gap-1 transition-colors ${activeView === 'insights' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <ChartBarIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">IA Análisis</span>
        </button>
      </nav>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-popIn { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
};

export default App;
