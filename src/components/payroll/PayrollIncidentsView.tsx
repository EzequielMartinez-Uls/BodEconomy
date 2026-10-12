import React, { useState } from 'react';
import { PayrollIncident, IncidentType, PayrollEmployee } from '../../types/payroll';
import { getLocalTodayStr } from '../../utils/dateUtils';
import { Plus, Trash2, UtensilsCrossed, Edit3, Check, X, Calendar } from 'lucide-react';

interface Props {
  employees: PayrollEmployee[];
  incidents: PayrollIncident[];
  startDate: string;
  endDate: string;
  onAddIncident: (incident: Omit<PayrollIncident, 'id' | 'createdAt'>) => void;
  onUpdateIncident: (incident: PayrollIncident) => void;
  onDeleteIncident: (id: string) => void;
}

export const PayrollIncidentsView: React.FC<Props> = ({
  employees,
  incidents,
  startDate,
  endDate,
  onAddIncident,
  onUpdateIncident,
  onDeleteIncident,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [type, setType] = useState<IncidentType>('VAJILLA_PERDIDA');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalTodayStr());
  const [filterEmpId, setFilterEmpId] = useState<string>('ALL');
  const [filterPeriodMode, setFilterPeriodMode] = useState<'CUTOFF' | 'ALL'>('CUTOFF');

  // Estado de edición en línea
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editEmpId, setEditEmpId] = useState('');
  const [editType, setEditType] = useState<IncidentType>('VAJILLA_PERDIDA');
  const [editConcept, setEditConcept] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const defaultConceptForType = (t: IncidentType) => {
    switch (t) {
      case 'VAJILLA_PERDIDA':
        return 'Vajilla / Pérdida';
      case 'SERVICIO_RESTAURANTE':
        return 'Consumo Restaurante';
      case 'PRESTAMO_ADELANTO':
        return 'Préstamo / Adelanto Quincenal';
      default:
        return 'Otro Descuento';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0');
      return;
    }
    const emp = employees.find((e) => e.id === selectedEmpId) || employees[0];
    if (!emp) {
      alert('Seleccione un colaborador');
      return;
    }

    onAddIncident({
      employeeId: emp.id,
      employeeName: emp.name,
      date,
      type,
      concept: concept.trim() || defaultConceptForType(type),
      amount: val,
    });

    setConcept('');
    setAmount('');
  };

  const handleStartEdit = (inc: PayrollIncident) => {
    setEditingId(inc.id);
    setEditDate(inc.date);
    setEditEmpId(inc.employeeId);
    setEditType(inc.type);
    setEditConcept(inc.concept);
    setEditAmount(String(inc.amount));
  };

  const handleSaveEdit = (inc: PayrollIncident) => {
    const val = parseFloat(editAmount);
    if (!val || val <= 0) {
      alert('Ingrese un monto válido mayor a 0');
      return;
    }
    const emp = employees.find((e) => e.id === editEmpId);
    onUpdateIncident({
      ...inc,
      date: editDate,
      employeeId: emp ? emp.id : inc.employeeId,
      employeeName: emp ? emp.name : inc.employeeName,
      type: editType,
      concept: editConcept.trim() || defaultConceptForType(editType),
      amount: val,
    });
    setEditingId(null);
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filterPeriodMode === 'CUTOFF') {
      if (inc.date < startDate || inc.date > endDate) return false;
    }
    if (filterEmpId !== 'ALL' && inc.employeeId !== filterEmpId) {
      return false;
    }
    return true;
  });

  const totalVajilla = filteredIncidents
    .filter((i) => i.type === 'VAJILLA_PERDIDA' || i.type === 'OTRO')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalRestaurante = filteredIncidents
    .filter((i) => i.type === 'SERVICIO_RESTAURANTE')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalPrestamos = filteredIncidents
    .filter((i) => i.type === 'PRESTAMO_ADELANTO')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalIncidents = filteredIncidents.reduce((sum, i) => sum + (i.amount || 0), 0);

  const renderTypeBadge = (t: IncidentType) => {
    if (t === 'VAJILLA_PERDIDA') {
      return (
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 border border-rose-400 bg-rose-50 text-rose-800">
          Vajilla Quebrada
        </span>
      );
    }
    if (t === 'SERVICIO_RESTAURANTE') {
      return (
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 border border-amber-400 bg-amber-50 text-amber-900">
          Servicio Rest.
        </span>
      );
    }
    if (t === 'PRESTAMO_ADELANTO') {
      return (
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 border border-indigo-400 bg-indigo-50 text-indigo-900">
          Préstamo / Vale
        </span>
      );
    }
    return (
      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 border border-slate-400 bg-slate-100 text-slate-800">
        Otro Descuento
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Resumen de Deducciones del Corte Activo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        <div className="p-2.5 border border-slate-300 bg-white">
          <div className="text-[10px] font-bold uppercase text-slate-500">Vajilla Quebrada / Otros</div>
          <div className="text-base font-black font-mono text-rose-700 mt-0.5">
            C$ {totalVajilla.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">Se aplica en col. Vajilla + Notas</div>
        </div>

        <div className="p-2.5 border border-slate-300 bg-white">
          <div className="text-[10px] font-bold uppercase text-slate-500">Servicio de Restaurante</div>
          <div className="text-base font-black font-mono text-amber-800 mt-0.5">
            C$ {totalRestaurante.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">Se aplica en col. Servicio Rest.</div>
        </div>

        <div className="p-2.5 border border-slate-300 bg-white">
          <div className="text-[10px] font-bold uppercase text-slate-500">Préstamos / Adelantos</div>
          <div className="text-base font-black font-mono text-indigo-800 mt-0.5">
            C$ {totalPrestamos.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">Se aplica en col. Préstamos</div>
        </div>

        <div className="p-2.5 border border-slate-900 bg-slate-900 text-white">
          <div className="text-[10px] font-bold uppercase text-slate-300">Total Deducciones Listadas</div>
          <div className="text-base font-black font-mono text-rose-300 mt-0.5">
            - C$ {totalIncidents.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">Sincronizado con Sábana Quincenal</div>
        </div>
      </div>

      {/* Formulario rápido para anotar incidencias: Diseño Rectangular Corporativo */}
      <div className="p-3 border border-slate-300 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-[#1c6856]" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Registrar Incidencia Diaria (Vajilla Quebrada, Consumo de Restaurante o Préstamo)
            </h3>
          </div>
          <div className="text-[11px] font-mono font-bold text-[#1c6856] bg-emerald-50 border border-emerald-300 px-2 py-0.5">
            Corte Quincenal Activo: {startDate} al {endDate}
          </div>
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
              Columna / Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as IncidentType)}
              className="w-full text-xs font-semibold border border-slate-300 px-2 py-1.5 outline-none focus:border-[#1c6856] bg-white"
            >
              <option value="VAJILLA_PERDIDA">Vajilla Quebrada / Pérdida</option>
              <option value="SERVICIO_RESTAURANTE">Servicio de Restaurante</option>
              <option value="PRESTAMO_ADELANTO">Préstamo / Adelanto</option>
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
              <span>Anotar y Aplicar</span>
            </button>
          </div>

          <div className="md:col-span-6">
            <input
              type="text"
              placeholder="Concepto o detalle (ej: Plato hondo quebrado, copa de vino, 1 almuerzo extra, vale de quincena...)"
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
              Bitácora de Incidencias Registradas ({filteredIncidents.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Cada incidencia dentro del corte ({startDate} al {endDate}) actualiza automáticamente la Sábana Quincenal y se respalda en la nube
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Rango */}
            <div className="flex items-center border border-slate-300 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setFilterPeriodMode('CUTOFF')}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer transition flex items-center gap-1 ${
                  filterPeriodMode === 'CUTOFF'
                    ? 'bg-white text-[#1c6856] border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Corte Activo ({startDate.slice(5)} al {endDate.slice(5)})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterPeriodMode('ALL')}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer transition ${
                  filterPeriodMode === 'ALL'
                    ? 'bg-white text-slate-900 border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todo el Historial ({incidents.length})
              </button>
            </div>

            {/* Filtro por Colaborador */}
            <select
              value={filterEmpId}
              onChange={(e) => setFilterEmpId(e.target.value)}
              className="text-xs border border-slate-300 px-2 py-1 outline-none bg-white font-bold text-slate-800"
            >
              <option value="ALL">Todos los colaboradores</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            No se han registrado incidencias de vajilla rota, consumos ni préstamos para este filtro.
          </div>
        ) : (
          <div className="border border-slate-300 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-700 border-b border-slate-300 uppercase tracking-wider">
                  <th className="p-2 w-28 border-r border-slate-300">Fecha</th>
                  <th className="p-2 border-r border-slate-300">Colaborador</th>
                  <th className="p-2 w-40 border-r border-slate-300">Tipo / Columna</th>
                  <th className="p-2 border-r border-slate-300">Concepto / Detalle</th>
                  <th className="p-2 w-28 text-right border-r border-slate-300">Monto (C$)</th>
                  <th className="p-2 text-center w-20">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredIncidents.map((inc) => {
                  const isEditing = editingId === inc.id;
                  if (isEditing) {
                    return (
                      <tr key={inc.id} className="bg-amber-50/60">
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full text-xs font-mono border border-slate-300 px-1.5 py-1 bg-white"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <select
                            value={editEmpId}
                            onChange={(e) => setEditEmpId(e.target.value)}
                            className="w-full text-xs font-bold border border-slate-300 px-1.5 py-1 bg-white"
                          >
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as IncidentType)}
                            className="w-full text-xs font-semibold border border-slate-300 px-1.5 py-1 bg-white"
                          >
                            <option value="VAJILLA_PERDIDA">Vajilla Quebrada</option>
                            <option value="SERVICIO_RESTAURANTE">Servicio Rest.</option>
                            <option value="PRESTAMO_ADELANTO">Préstamo / Vale</option>
                            <option value="OTRO">Otro Descuento</option>
                          </select>
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={editConcept}
                            onChange={(e) => setEditConcept(e.target.value)}
                            className="w-full text-xs border border-slate-300 px-2 py-1 bg-white"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full text-right text-xs font-mono font-bold border border-slate-300 px-1.5 py-1 bg-white"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(inc)}
                              className="p-1 bg-[#1c6856] text-white hover:bg-[#165345] cursor-pointer"
                              title="Guardar edición"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={inc.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="p-2 font-mono text-slate-600 border-r border-slate-200">{inc.date}</td>
                      <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{inc.employeeName}</td>
                      <td className="p-2 border-r border-slate-200">{renderTypeBadge(inc.type)}</td>
                      <td className="p-2 text-slate-700 border-r border-slate-200">{inc.concept}</td>
                      <td className="p-2 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                        - C$ {inc.amount.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(inc)}
                            className="text-slate-500 hover:text-[#1c6856] p-1 transition cursor-pointer"
                            title="Editar incidencia"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar la incidencia "${inc.concept}" de ${inc.employeeName} por C$ ${inc.amount.toFixed(2)}?`)) {
                                onDeleteIncident(inc.id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-700 p-1 transition cursor-pointer"
                            title="Eliminar incidencia"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 font-bold border-t-2 border-slate-900 text-white">
                  <td colSpan={4} className="p-2 text-right uppercase tracking-wider">
                    Total en Incidencias Listadas:
                  </td>
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
