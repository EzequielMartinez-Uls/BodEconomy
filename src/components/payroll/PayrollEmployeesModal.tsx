import React, { useState } from 'react';
import { PayrollEmployee } from '../../types/payroll';
import { Users, Plus, Trash2, Check, ShieldCheck, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: PayrollEmployee[];
  onSaveEmployees: (employees: PayrollEmployee[]) => void;
}

export const PayrollEmployeesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employees,
  onSaveEmployees,
}) => {
  const [list, setList] = useState<PayrollEmployee[]>(employees);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Nuevo empleado form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newIsInsured, setNewIsInsured] = useState(false);
  const [newNSS, setNewNSS] = useState('');

  if (!isOpen) return null;

  const handleToggleInsured = (id: string) => {
    setList((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const nextInsured = !e.isInsuredINSS;
          return {
            ...e,
            isInsuredINSS: nextInsured,
            reportedSalaryINSS: nextInsured ? (e.reportedSalaryINSS || e.baseSalaryBiweekly) : undefined,
          };
        }
        return e;
      })
    );
  };

  const handleSalaryChange = (id: string, salaryStr: string) => {
    const val = parseFloat(salaryStr) || 0;
    setList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, baseSalaryBiweekly: val } : e))
    );
  };

  const handleNSSChange = (id: string, nssStr: string) => {
    setList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, nss: nssStr } : e))
    );
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim()) {
      alert('Nombre y cargo son requeridos');
      return;
    }
    const sal = parseFloat(newSalary) || 0;
    const newEmp: PayrollEmployee = {
      id: `emp-${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim(),
      baseSalaryBiweekly: sal,
      isInsuredINSS: newIsInsured,
      nss: newIsInsured ? newNSS.trim() : undefined,
      reportedSalaryINSS: newIsInsured ? sal : undefined,
      isActive: true,
    };
    setList((prev) => [...prev, newEmp]);
    setNewName('');
    setNewRole('');
    setNewSalary('');
    setNewIsInsured(false);
    setNewNSS('');
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Desea dar de baja o eliminar este colaborador de la nómina?')) {
      setList((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleSaveAndClose = () => {
    onSaveEmployees(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1c6856]/10 text-[#1c6856] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Padrón de Colaboradores & Salarios Base
              </h2>
              <p className="text-[11px] text-slate-500">
                Gestiona cargos, salarios quincenales y habilita quién cotiza en la Planilla Especial del INSS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Formulario para agregar nuevo colaborador */}
          <form onSubmit={handleAddEmployee} className="p-3 bg-emerald-50/30 border border-emerald-200/80 rounded-xl space-y-2.5">
            <span className="text-[10.5px] font-black text-emerald-950 uppercase tracking-wider block">
              + Agregar Nuevo Colaborador a Nómina
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[9.5px] font-bold text-slate-500 uppercase block mb-0.5">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej: David Quintero"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-hidden focus:border-[#1c6856]"
                  required
                />
              </div>

              <div>
                <label className="text-[9.5px] font-bold text-slate-500 uppercase block mb-0.5">Cargo / Puesto</label>
                <input
                  type="text"
                  placeholder="Ej: Cocinero, Mesero..."
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-hidden focus:border-[#1c6856]"
                  required
                />
              </div>

              <div>
                <label className="text-[9.5px] font-bold text-slate-500 uppercase block mb-0.5">Salario Quincenal (C$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="4500.00"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-hidden focus:border-[#1c6856]"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-[#1c6856] hover:bg-[#154f42] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIsInsured}
                  onChange={(e) => setNewIsInsured(e.target.checked)}
                  className="rounded border-slate-300 text-[#1c6856] focus:ring-[#1c6856]"
                />
                <span className="font-semibold text-[11px]">¿Cotiza en Seguro Social (INSS)?</span>
              </label>

              {newIsInsured && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">NSS:</span>
                  <input
                    type="text"
                    placeholder="Ej: 32911303"
                    value={newNSS}
                    onChange={(e) => setNewNSS(e.target.value)}
                    className="text-xs font-mono border border-slate-200 rounded px-2 py-0.5 bg-white w-28"
                  />
                </div>
              )}
            </div>
          </form>

          {/* Lista actual de colaboradores */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold text-[10.5px]">
                  <th className="p-2.5">Colaborador</th>
                  <th className="p-2.5">Cargo</th>
                  <th className="p-2.5 text-right w-28">Salario Quincenal</th>
                  <th className="p-2.5 text-center w-36">Seguro INSS</th>
                  <th className="p-2.5 text-center w-28">NSS</th>
                  <th className="p-2.5 text-center w-12">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2 font-bold text-slate-900">{emp.name}</td>
                    <td className="p-2 text-slate-600">{emp.role}</td>
                    <td className="p-1.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={emp.baseSalaryBiweekly || ''}
                        onChange={(e) => handleSalaryChange(emp.id, e.target.value)}
                        className="w-full text-right font-mono font-bold text-emerald-800 border border-slate-200 rounded px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleInsured(emp.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition ${
                          emp.isInsuredINSS
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{emp.isInsuredINSS ? 'Asegurado INSS' : 'Sin Seguro'}</span>
                      </button>
                    </td>
                    <td className="p-1.5 text-center">
                      {emp.isInsuredINSS ? (
                        <input
                          type="text"
                          value={emp.nss || ''}
                          placeholder="No. NSS"
                          onChange={(e) => handleNSSChange(emp.id, e.target.value)}
                          className="w-full text-center font-mono text-xs border border-slate-200 rounded px-1 py-1"
                        />
                      ) : (
                        <span className="text-slate-300 text-[10px] font-mono">-</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                        title="Eliminar colaborador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[11px] text-slate-500 font-semibold">
            {list.length} colaboradores en nómina ({list.filter((e) => e.isInsuredINSS).length} con INSS)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-4 py-1.5 bg-[#1c6856] hover:bg-[#154f42] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
