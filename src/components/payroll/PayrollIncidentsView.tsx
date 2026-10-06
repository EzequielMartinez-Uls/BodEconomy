import React, { useState } from 'react';
import { PayrollIncident, IncidentType, PayrollEmployee } from '../../types/payroll';
import { getLocalTodayStr } from '../../utils/dateUtils';
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react';

interface Props {
  employees: PayrollEmployee[];
  incidents: PayrollIncident[];
  onAddIncident: (incident: Omit<PayrollIncident, 'id' | 'createdAt'>) => void;
  onDeleteIncident: (id: string) => void;
}

export const PayrollIncidentsView: React.FC<Props> = ({
  employees,
  incidents,
  onAddIncident,
  onDeleteIncident,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [type, setType] = useState<IncidentType>('VAJILLA_PERDIDA');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalTodayStr());
  const [filterEmpId, setFilterEmpId] = useState<string>('ALL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0');
      return;
    }
    const emp = employees.find((e) => e.id === selectedEmpId);
    if (!emp) {
      alert('Seleccione un colaborador');
      return;
    }

    onAddIncident({
      employeeId: emp.id,
      employeeName: emp.name,
      date,
      type,
      concept: concept.trim() || (type === 'VAJILLA_PERDIDA' ? 'Vajilla / Pérdida' : 'Consumo Restaurante'),
      amount: val,
    });

    setConcept('');
    setAmount('');
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filterEmpId === 'ALL') return true;
    return inc.employeeId === filterEmpId;
  });

  const totalIncidents = filteredIncidents.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="space-y-3">
      {/* Formulario rápido para anotar incidencias: Diseño Rectangular Corporativo */}
      <div className="p-3 border border-slate-300 bg-white">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
          <UtensilsCrossed className="w-4 h-4 text-[#1c6856]" />
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Registrar Incidencia Diaria (Vajilla Quebrada o Consumo de Personal)
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-mono border border-slate-300 px-2 py-1.5 outline-none focus:border-[#1c6856] bg-white"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Colaborador
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full text-xs font-bold border border-slate-300 px-2 py-1.5 outline-none focus:border-[#1c6856] bg-white"
              required
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as IncidentType)}
              className="w-full text-xs font-semibold border border-slate-300 px-2 py-1.5 outline-none focus:border-[#1c6856] bg-white"
            >
              <option value="VAJILLA_PERDIDA">Vajilla Quebrada / Pérdida</option>
              <option value="SERVICIO_RESTAURANTE">Servicio de Restaurante</option>
              <option value="OTRO">Otro Descuento</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Monto (C$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-xs font-mono font-bold border border-slate-300 px-2 py-1.5 outline-none focus:border-[#1c6856] bg-white"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-1.5 border border-[#165345] bg-[#1c6856] hover:bg-[#165345] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Anotar</span>
            </button>
          </div>

          <div className="md:col-span-6">
            <input
              type="text"
              placeholder="Concepto o detalle opcional (ej: Plato hondo quebrado, salsero, vaso cervecero, 1 almuerzo extra...)"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full text-xs border border-slate-300 px-2.5 py-1.5 outline-none focus:border-[#1c6856] placeholder:text-slate-400 bg-white"
            />
          </div>
        </form>
      </div>

      {/* Historial de incidencias: Diseño Rectangular Formal */}
      <div className="p-3 border border-slate-300 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Historial de Incidencias Registradas
            </h3>
            <span className="text-[11px] text-slate-500">
              Estas deducciones se aplican en la quincena correspondiente de cada colaborador
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Filtrar por:</label>
            <select
              value={filterEmpId}
              onChange={(e) => setFilterEmpId(e.target.value)}
              className="text-xs border border-slate-300 px-2 py-1 outline-none bg-white font-medium"
            >
              <option value="ALL">Todos los colaboradores</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            No se han registrado incidencias de vajilla rota ni consumos pendientes para este filtro.
          </div>
        ) : (
          <div className="border border-slate-300 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-700 border-b border-slate-300 uppercase tracking-wider">
                  <th className="p-2 w-24 border-r border-slate-300">Fecha</th>
                  <th className="p-2 border-r border-slate-300">Colaborador</th>
                  <th className="p-2 border-r border-slate-300">Tipo</th>
                  <th className="p-2 border-r border-slate-300">Concepto / Detalle</th>
                  <th className="p-2 text-right border-r border-slate-300">Monto (C$)</th>
                  <th className="p-2 text-center w-12">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="p-2 font-mono text-slate-600 border-r border-slate-200">{inc.date}</td>
                    <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{inc.employeeName}</td>
                    <td className="p-2 border-r border-slate-200">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 border ${
                        inc.type === 'VAJILLA_PERDIDA'
                          ? 'border-rose-400 bg-rose-50 text-rose-800'
                          : 'border-amber-400 bg-amber-50 text-amber-900'
                      }`}>
                        {inc.type === 'VAJILLA_PERDIDA' ? 'Vajilla Quebrada' : inc.type === 'SERVICIO_RESTAURANTE' ? 'Servicio Rest.' : 'Otro'}
                      </span>
                    </td>
                    <td className="p-2 text-slate-700 border-r border-slate-200">{inc.concept}</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                      - C$ {inc.amount.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onDeleteIncident(inc.id)}
                        className="text-slate-400 hover:text-rose-700 p-1 transition cursor-pointer"
                        title="Eliminar incidencia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 font-bold border-t-2 border-slate-900 text-white">
                  <td colSpan={4} className="p-2 text-right uppercase tracking-wider">Total en Incidencias Listadas:</td>
                  <td className="p-2 text-right font-mono text-rose-300 font-black">
                    - C$ {totalIncidents.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
