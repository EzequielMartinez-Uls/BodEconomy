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
  const [isDirty, setIsDirty] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setList(employees);
      setIsDirty(false);
    }
  }, [isOpen]);

  // Nuevo empleado form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newIsInsured, setNewIsInsured] = useState(false);
  const [newNSS, setNewNSS] = useState('');

  if (!isOpen) return null;

  const handleAttemptClose = () => {
    if (isDirty || newName.trim() || newSalary.trim()) {
      const proceed = window.confirm(
        '⚠️ Tienes cambios sin guardar en el Padrón de Personal.\n\n¿Seguro que deseas salir sin presionar "Confirmar Cambios"?'
      );
      if (!proceed) return;
    }
    setIsDirty(false);
    onClose();
  };

  const handleFieldChange = (id: string, field: keyof PayrollEmployee, value: any) => {
    setIsDirty(true);
    setList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleToggleInsured = (id: string) => {
    setIsDirty(true);
    setList((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const nextInsured = !e.isInsuredINSS;
          return {
            ...e,
            isInsuredINSS: nextInsured,
            reportedSalaryINSS: nextInsured ? (e.reportedSalaryINSS || e.baseSalaryBiweekly || 5675.04) : undefined,
            hireDate: nextInsured ? (e.hireDate || '2025-11-01') : e.hireDate,
          };
        }
        return e;
      })
    );
  };

  const handleSalaryChange = (id: string, salaryStr: string) => {
    setIsDirty(true);
    const val = parseFloat(salaryStr) || 0;
    setList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, baseSalaryBiweekly: val } : e))
    );
  };

  const handleReportedSalaryChange = (id: string, salaryStr: string) => {
    setIsDirty(true);
    const val = parseFloat(salaryStr) || 0;
    setList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, reportedSalaryINSS: val } : e))
    );
  };

  const handleNSSChange = (id: string, nssStr: string) => {
    setIsDirty(true);
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
      hireDate: newIsInsured ? new Date().toISOString().slice(0, 10) : undefined,
      isActive: true,
    };
    setIsDirty(true);
    setList((prev) => [...prev, newEmp]);
    setNewName('');
    setNewRole('');
    setNewSalary('');
    setNewIsInsured(false);
    setNewNSS('');
  };

  const handleDelete = (id: string) => {
    const emp = list.find((e) => e.id === id);
    if (confirm(`¿Desea eliminar permanentemente a "${emp?.name || 'este colaborador'}" del padrón y de la nómina?`)) {
      setIsDirty(true);
      setList((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleSaveAndClose = () => {
    setIsDirty(false);
    onSaveEmployees(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60">
      <div className="bg-white border border-stone-300 shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Rectangular */}
        <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 border border-bodegon bg-bodegon text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-stone-900 uppercase tracking-tight">
                Padrón Oficial de Colaboradores & Salarios Base (100% Editable)
              </h2>
              <p className="text-[11px] text-stone-500">
                Edita nombres, cargos, salarios quincenales, seguro INSS o elimina colaboradores. Al confirmar se guarda en la nube.
              </p>
            </div>
          </div>
          <button
            onClick={handleAttemptClose}
            className="text-stone-400 hover:text-stone-700 p-1 border border-transparent hover:border-stone-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 flex-1 overflow-y-auto space-y-3.5">
          {/* Formulario para agregar nuevo colaborador: Rectangular */}
          <form onSubmit={handleAddEmployee} className="p-3 bg-bodegon/2 border border-bodegon/35 space-y-2.5">
            <span className="text-[10px] font-black text-bodegon-noche uppercase tracking-wider block">
              + Agregar Nuevo Colaborador al Catálogo
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[9.5px] font-bold text-stone-600 uppercase block mb-0.5">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej: David Quintero"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs border border-stone-300 px-2 py-1.5 bg-white outline-none focus:border-bodegon"
                  required
                />
              </div>

              <div>
                <label className="text-[9.5px] font-bold text-stone-600 uppercase block mb-0.5">Cargo / Puesto</label>
                <input
                  type="text"
                  placeholder="Ej: Cocinero, Mesero..."
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full text-xs border border-stone-300 px-2 py-1.5 bg-white outline-none focus:border-bodegon"
                  required
                />
              </div>

              <div>
                <label className="text-[9.5px] font-bold text-stone-600 uppercase block mb-0.5">Salario Quincenal (C$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="4500.00"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  className="w-full text-xs font-mono font-bold border border-stone-300 px-2 py-1.5 bg-white outline-none focus:border-bodegon"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 border border-bodegon-noche bg-bodegon hover:bg-bodegon-noche text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-bodegon/20">
              <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIsInsured}
                  onChange={(e) => setNewIsInsured(e.target.checked)}
                  className="border-stone-300 text-bodegon"
                />
                <span className="font-semibold text-[11px]">¿Cotiza en Seguro Social (INSS)?</span>
              </label>

              {newIsInsured && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-stone-600 font-bold uppercase">NSS:</span>
                  <input
                    type="text"
                    placeholder="Ej: 32911303"
                    value={newNSS}
                    onChange={(e) => setNewNSS(e.target.value)}
                    className="text-xs font-mono border border-stone-300 px-2 py-0.5 bg-white w-28 outline-none"
                  />
                </div>
              )}
            </div>
          </form>

          {/* Tabla de Colaboradores: 100% Editable y Rectangular */}
          <div className="border border-stone-300 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-100 text-stone-800 font-extrabold text-[10.5px] uppercase tracking-wider border-b border-stone-300">
                  <th className="p-2 border-r border-stone-300 min-w-[200px]">Nombre Colaborador</th>
                  <th className="p-2 border-r border-stone-300 min-w-[140px]">Cargo / Puesto</th>
                  <th className="p-2 text-right w-32 border-r border-stone-300">Salario Quincenal</th>
                  <th className="p-2 text-center w-36 border-r border-stone-300">Seguro INSS</th>
                  <th className="p-2 text-center w-28 border-r border-stone-300">No. NSS</th>
                  <th className="p-2 text-right w-32 border-r border-stone-300">Salario Decl. INSS</th>
                  <th className="p-2 text-center w-28 border-r border-stone-300">Fecha Ingreso</th>
                  <th className="p-2 text-center w-14">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {list.map((emp) => (
                  <tr key={emp.id} className="hover:bg-stone-50/90 transition-colors">
                    {/* Nombre Editable */}
                    <td className="p-1 border-r border-stone-200">
                      <input
                        type="text"
                        value={emp.name}
                        onChange={(e) => handleFieldChange(emp.id, 'name', e.target.value)}
                        className="w-full font-bold text-stone-900 border border-stone-200 hover:border-stone-300 focus:border-bodegon px-2 py-1 bg-white outline-none text-xs"
                        placeholder="Nombre completo..."
                      />
                    </td>

                    {/* Cargo Editable */}
                    <td className="p-1 border-r border-stone-200">
                      <input
                        type="text"
                        value={emp.role}
                        onChange={(e) => handleFieldChange(emp.id, 'role', e.target.value)}
                        className="w-full text-stone-700 font-medium border border-stone-200 hover:border-stone-300 focus:border-bodegon px-2 py-1 bg-white outline-none text-xs"
                        placeholder="Cargo..."
                      />
                    </td>

                    {/* Salario Quincenal Editable */}
                    <td className="p-1 border-r border-stone-200">
                      <div className="flex items-center justify-end border border-stone-300 px-1.5 py-0.5 bg-white focus-within:border-bodegon">
                        <span className="text-[9px] font-bold text-bodegon mr-1">C$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={emp.baseSalaryBiweekly || ''}
                          onChange={(e) => handleSalaryChange(emp.id, e.target.value)}
                          className="w-20 text-right font-mono font-bold text-bodegon-noche bg-transparent outline-none text-xs"
                        />
                      </div>
                    </td>

                    {/* Toggle INSS */}
                    <td className="p-1.5 text-center border-r border-stone-200">
                      <button
                        type="button"
                        onClick={() => handleToggleInsured(emp.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-[9.5px] font-bold uppercase cursor-pointer border transition ${
                          emp.isInsuredINSS
                            ? 'bg-stone-100 text-stone-950 border-stone-300'
                            : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{emp.isInsuredINSS ? 'Asegurado INSS' : 'Sin Seguro'}</span>
                      </button>
                    </td>

                    {/* NSS Editable */}
                    <td className="p-1 text-center border-r border-stone-200">
                      {emp.isInsuredINSS ? (
                        <input
                          type="text"
                          value={emp.nss || ''}
                          placeholder="No. NSS"
                          onChange={(e) => handleNSSChange(emp.id, e.target.value)}
                          className="w-full text-center font-mono text-xs border border-stone-300 px-1 py-0.5 bg-white outline-none focus:border-stone-600"
                        />
                      ) : (
                        <span className="text-stone-400 text-[10px] font-mono">-</span>
                      )}
                    </td>

                    {/* Salario Declarado INSS Editable */}
                    <td className="p-1 text-right border-r border-stone-200">
                      {emp.isInsuredINSS ? (
                        <div className="flex items-center justify-end border border-stone-300 px-1.5 py-0.5 bg-white focus-within:border-stone-600">
                          <span className="text-[9px] font-bold text-stone-800 mr-1">C$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={emp.reportedSalaryINSS ?? emp.baseSalaryBiweekly ?? ''}
                            onChange={(e) => handleReportedSalaryChange(emp.id, e.target.value)}
                            className="w-20 text-right font-mono font-bold text-stone-950 bg-transparent outline-none text-xs"
                          />
                        </div>
                      ) : (
                        <span className="text-stone-400 text-[10px] font-mono block text-center">-</span>
                      )}
                    </td>

                    {/* Fecha Ingreso Editable */}
                    <td className="p-1 text-center border-r border-stone-200">
                      <input
                        type="text"
                        value={emp.hireDate || ''}
                        placeholder="YYYY-MM-DD"
                        onChange={(e) => handleFieldChange(emp.id, 'hireDate', e.target.value)}
                        className="w-full text-center font-mono text-xs border border-stone-200 hover:border-stone-300 focus:border-bodegon px-1 py-0.5 bg-white outline-none"
                      />
                    </td>

                    {/* Eliminar */}
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(emp.id)}
                        className="text-barro hover:text-barro hover:bg-barro/5 border border-transparent hover:border-barro/25 p-1.5 transition cursor-pointer"
                        title="Eliminar colaborador permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Rectangular */}
        <div className="p-3 border-t border-stone-200 flex items-center justify-between bg-stone-50">
          <span className="text-[11px] text-stone-600 font-semibold uppercase tracking-wider">
            {list.length} colaboradores en nómina ({list.filter((e) => e.isInsuredINSS).length} con INSS)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-3 py-1.5 border border-stone-300 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className={`px-4 py-1.5 border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider shadow-xs ${
                isDirty
                  ? 'border-dorado bg-dorado-vivo hover:bg-dorado text-stone-950 ring-2 ring-dorado/60'
                  : 'border-bodegon-noche bg-bodegon hover:bg-bodegon-noche text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isDirty ? 'Confirmar Cambios ●' : 'Confirmar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
