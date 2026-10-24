// Expone las funciones de impresión para medir cuántas hojas usa cada documento.
import * as termica from '../../src/services/thermalPrint';
import * as planilla from '../../src/services/payrollPrint';
(window as any).TP = termica;
(window as any).PP = planilla;
