import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// 1. Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

let supabaseUrl = '';
let supabaseKey = '';

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.split('=')[1].trim();
  } else if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = trimmed.split('=')[1].trim();
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Exact 14 payroll employees from storage.ts
const DEFAULT_PAYROLL_EMPLOYEES = [
  {
    id: 'emp-1',
    name: 'Julissa Lucero Ramírez Hernández',
    role: 'Asistente de Cocina',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '19915977',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-2',
    name: 'Martha Patricia Meléndez',
    role: 'Asistente de Cocina',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '46236436',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-3',
    name: 'Marlon Joseph Narváez Camacho',
    role: 'Atención al Cliente',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '29694792',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-4',
    name: 'Uriel de Jesús Zamora Salgado',
    role: 'Jefe de Cocina',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '32911303',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-5',
    name: 'Estefani de los Ángeles Padilla Urey',
    role: 'Atención al Cliente',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '35137463',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-6',
    name: 'Nelly Delgado Escoto',
    role: 'Cocinera',
    baseSalaryBiweekly: 6250.00,
    isInsuredINSS: false,
    hireDate: '2026-09-01',
    isActive: true,
  },
  {
    id: 'emp-7',
    name: 'Zenon López',
    role: 'Cocinero',
    baseSalaryBiweekly: 6250.00,
    isInsuredINSS: false,
    hireDate: '2026-09-01',
    isActive: true,
  },
  {
    id: 'emp-8',
    name: 'Eddy Bernardo Martínez Blanco',
    role: 'Admon',
    baseSalaryBiweekly: 6000.00,
    isInsuredINSS: false,
    hireDate: '2024-05-15',
    isActive: true,
  },
  {
    id: 'emp-9',
    name: 'Yhaira de Jesús Rivas',
    role: 'Limpieza',
    baseSalaryBiweekly: 4500.00,
    isInsuredINSS: false,
    hireDate: '2025-05-25',
    isActive: true,
  },
  {
    id: 'emp-10',
    name: 'Oscar Adolfo Vásquez Omeany',
    role: 'Barra',
    baseSalaryBiweekly: 5675.00,
    isInsuredINSS: false,
    hireDate: '2026-02-16',
    isActive: true,
  },
  {
    id: 'emp-11',
    name: 'Xiomara Castillo',
    role: 'Admon',
    baseSalaryBiweekly: 6500.00,
    isInsuredINSS: false,
    hireDate: '2026-07-15',
    isActive: true,
  },
  {
    id: 'emp-12',
    name: 'Carlos Eduardo García',
    role: 'Atención al Cliente',
    baseSalaryBiweekly: 5675.00,
    isInsuredINSS: false,
    hireDate: '2026-09-15',
    isActive: true,
  },
  {
    id: 'emp-13',
    name: 'Yunieth Verónica Carmona Sánchez',
    role: 'Asistente de Cocina',
    baseSalaryBiweekly: 5675.00,
    isInsuredINSS: false,
    hireDate: '2026-04-17',
    isActive: true,
  },
  {
    id: 'emp-14',
    name: 'Melvin Ojeda',
    role: 'Lavandería',
    baseSalaryBiweekly: 4500.00,
    isInsuredINSS: false,
    hireDate: '2026-09-01',
    isActive: true,
  },
];

async function updateSystemCatalogs() {
  console.log('Querying jornadas_diarias where responsable = "SYSTEM_CATALOGS"...');
  const { data: rows, error: selectErr } = await supabase
    .from('jornadas_diarias')
    .select('id, observaciones, updated_at')
    .eq('responsable', 'SYSTEM_CATALOGS');

  if (selectErr) {
    console.error('Error selecting SYSTEM_CATALOGS:', selectErr);
    process.exit(1);
  }

  console.log(`Found ${rows ? rows.length : 0} matching row(s).`);

  let prevParsed = {};
  let targetId = null;

  if (rows && rows.length > 0) {
    targetId = rows[0].id;
    const obs = rows[0].observaciones || '';
    const tag = '[SYSTEM_CATALOGS:';
    const start = obs.indexOf(tag);
    if (start !== -1) {
      const lastBracket = obs.lastIndexOf(']');
      try {
        prevParsed = JSON.parse(obs.substring(start + tag.length, lastBracket));
      } catch (e) {
        console.warn('Could not parse existing observations JSON, resetting structure.', e);
      }
    }
  }

  const updatedPayload = {
    ...prevParsed,
    version: 2,
    updatedAt: new Date().toISOString(),
    payrollEmployees: DEFAULT_PAYROLL_EMPLOYEES,
    payrollHistory: [],
  };

  const obsString = `[SYSTEM_CATALOGS:${JSON.stringify(updatedPayload)}]`;

  if (targetId) {
    console.log(`Updating existing row id=${targetId}...`);
    const { error: updateErr } = await supabase
      .from('jornadas_diarias')
      .update({
        observaciones: obsString,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (updateErr) {
      console.error('Error updating row:', updateErr);
      process.exit(1);
    }
    console.log('✅ Successfully updated SYSTEM_CATALOGS row!');
  } else {
    console.log('Creating new SYSTEM_CATALOGS row...');
    const { error: insertErr } = await supabase
      .from('jornadas_diarias')
      .insert({
        fecha: '1999-01-01',
        turno: 'CONFIG',
        estado: 'CERRADA',
        fondo_inicial: 0,
        total_gastos_efectivo: 0,
        total_gastos_transferencia: 0,
        responsable: 'SYSTEM_CATALOGS',
        observaciones: obsString,
        fecha_cierre: '1999-01-01T00:00:00Z',
      });

    if (insertErr) {
      console.error('Error inserting row:', insertErr);
      process.exit(1);
    }
    console.log('✅ Successfully inserted SYSTEM_CATALOGS row!');
  }

  // Verification step: Read back from Supabase
  console.log('\n--- Verifying from Supabase ---');
  const { data: verifyRows, error: verifyErr } = await supabase
    .from('jornadas_diarias')
    .select('id, responsable, observaciones, updated_at')
    .eq('responsable', 'SYSTEM_CATALOGS');

  if (verifyErr || !verifyRows || verifyRows.length === 0) {
    console.error('Verification failed:', verifyErr);
    process.exit(1);
  }

  const tag = '[SYSTEM_CATALOGS:';
  const obs = verifyRows[0].observaciones || '';
  const start = obs.indexOf(tag);
  const lastBracket = obs.lastIndexOf(']');
  const parsedData = JSON.parse(obs.substring(start + tag.length, lastBracket));

  console.log(`Row ID: ${verifyRows[0].id}`);
  console.log(`Responsable: ${verifyRows[0].responsable}`);
  console.log(`Updated at: ${verifyRows[0].updated_at}`);
  console.log(`Payroll employees count: ${parsedData.payrollEmployees?.length}`);
  console.log(`Payroll employees list:`);
  parsedData.payrollEmployees.forEach((emp, i) => {
    console.log(`  ${i + 1}. [${emp.id}] ${emp.name} (${emp.role}) - C$ ${emp.baseSalaryBiweekly.toFixed(2)} - INSS: ${emp.isInsuredINSS}`);
  });
  console.log(`Payroll history length: ${parsedData.payrollHistory?.length}`);
  console.log('--- Verification Complete ---');
}

updateSystemCatalogs().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
