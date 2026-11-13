import type { DatasetState, LoadedFileMeta } from '../types/dataset';
import { parseCsvContent } from '../lib/parsers/csvParser';

export interface SampleDatasetPreset {
  id: string;
  label: string;
  description: string;
  fileName: string;
  csvContent: string;
}

export const SAMPLE_DATASETS: SampleDatasetPreset[] = [
  {
    id: 'crm-orders',
    label: 'E-Commerce Customer Orders (Dirty Sample)',
    description:
      '28 rows with exact & near duplicates, messy whitespace, inconsistent casing, smart quotes, accents, empty cells, and an empty Legacy Notes column.',
    fileName: 'ecommerce_orders_messy.csv',
    csvContent: `Order ID,Customer Name,Email,Country,Category,Unit Price,Quantity,Legacy Notes,Order Status
ORD-1001,"  alice   johnson ",ALICE.JOHNSON@EXAMPLE.COM,United States,Electronics,129.99,2,,Shipped
ORD-1001,"  alice   johnson ",ALICE.JOHNSON@EXAMPLE.COM,United States,Electronics,129.99,2,,Shipped
ORD-1002,"Bob   Smith",bob.smith@example.com,  canada ,Home & Office,45.5,4,,Delivered
ORD-1003,"Émilie   Dupré",emilie.dupre@example.fr,france,Accessories,24.00,1,,Processing
ORD-1004,"carlos   méndez ",CARLOS.MENDEZ@EXAMPLE.ES,Spain,Electronics,299.95,1,,Shipped
ORD-1005,"  Sophia  Chen",,Singapore,Software,89,3,,Delivered
ORD-1006,"Liam O’Connor",liam.oconnor@example.ie,Ireland,Home & Office,64.25,2,,Pending
,,,,,,,,
ORD-1007,"  noah   williams",noah.w@example.co.uk,united kingdom,Electronics,199.50,1,,Shipped
ORD-1008,"Olivia   Müller",olivia.mueller@example.de,Germany,Accessories,35.00,,,Cancelled
ORD-1009,"Lucas   Silva",lucas.silva@example.br,BRAZIL,Electronics,149.00,2,,Delivered
ORD-1009,"Lucas   Silva",lucas.silva@example.br,BRAZIL,Electronics,149.00,2,,Delivered
ORD-1010,"Emma   Virtanen",emma.virtanen@example.fi,Finland,Software,59.00,5,,Shipped
ORD-1011,"  Mason   Brown ",mason.brown@example.com,united states,Home & Office,,2,,Pending
ORD-1012,"Ava  Lindqvist",ava.lindqvist@example.se,Sweden,Accessories,19.99,6,,Delivered
ORD-1013,"Ethan   Garcia",ethan.garcia@example.mx,Mexico,Electronics,420.00,1,,Shipped
ORD-1014,"Isabella   Rossi",,Italy,Home & Office,78.50,2,,Processing
ORD-1015,"  James   Taylor  ",JAMES.TAYLOR@EXAMPLE.AU,Australia,Software,110.00,1,,Delivered
ORD-1016,"Mia   Kowalski",mia.kowalski@example.pl,Poland,Accessories,29.95,3,,Shipped
ORD-1017,"Benjamin   Lee",ben.lee@example.kr,South Korea,Electronics,549.00,1,,Delivered
ORD-1018,"Charlotte   Dubois",charlotte.dubois@example.be,Belgium,Home & Office,39.50,,,Pending
ORD-1019,"Amelia   Novák",amelia.novak@example.cz,Czechia,Software,89.00,2,,Shipped
ORD-1020,"Harper   Andersson",harper.a@example.no,Norway,Electronics,215.00,2,,Delivered
ORD-1020,"harper andersson",harper.a@example.no,norway,Electronics,215,2,,Delivered
ORD-1021,"Evelyn   Santos",evelyn.santos@example.pt,Portugal,Accessories,16.75,4,,Shipped
ORD-1022,"Alexander   Petrov",,Bulgaria,Home & Office,92.00,1,,Processing
ORD-1023,"Sofia   Korhonen",sofia.korhonen@example.fi,  FINLAND ,Electronics,310.00,3,,Delivered
ORD-1024,"Daniel   Kim",daniel.kim@example.ca,Canada,Software,75.00,2,,Shipped`,
  },
  {
    id: 'hr-directory',
    label: 'Employee Directory (Semicolon CSV)',
    description:
      '16 rows using semicolon delimiters with duplicate records, missing departments, unformatted salaries, and extra spaces.',
    fileName: 'employee_directory_eu.csv',
    csvContent: `Employee ID;First Name;Last Name;Department;Location;Base Salary;Bonus Pct;Unused Column
EMP-01;  hanna ;mäkinen;Engineering;Helsinki;72000;0.12;
EMP-02;johan;  lindström ;Product;Stockholm;68500;0.1;
EMP-02;johan;  lindström ;Product;Stockholm;68500;0.1;
EMP-03;CLARA;SCHMIDT;;Berlin;64000;0.08;
EMP-04;mateo;  garcía  ;Design;Madrid;55000;;
EMP-05;sophie;laurent;Engineering;Paris;71000;0.15;
;;;;;;;
EMP-06;lukas;  novák;Operations;Prague;49000;0.07;
EMP-07;elena;rossi;Marketing;Milan;;0.1;
EMP-08;  liam;o’brien;Sales;Dublin;61000;0.2;
EMP-09;freja;nielsen;Engineering;Copenhagen;76000;0.12;
EMP-10;piotr;  wiśniewski;;Warsaw;58000;0.09;
EMP-11;aino;virtanen;Data Science;Helsinki;79000;0.14;
EMP-12;  lucas ;meyer;Finance;Zurich;94000;0.15;
EMP-12;Lucas;Meyer;Finance;Zurich;94000;0.15;
EMP-13;nora;bakker;Product;Amsterdam;69500;0.11;`,
  },
];

export function loadSampleDataset(presetId?: string): {
  meta: LoadedFileMeta;
  state: DatasetState;
} {
  const preset =
    SAMPLE_DATASETS.find((p) => p.id === presetId) ?? SAMPLE_DATASETS[0]!;

  const parsed = parseCsvContent(preset.csvContent, 'auto');
  const encodedBytes = new TextEncoder().encode(preset.csvContent).byteLength;

  return {
    meta: {
      fileName: preset.fileName,
      fileFormat: 'sample',
      fileSize: encodedBytes,
      importedAt: Date.now(),
      rawCsvText: preset.csvContent,
      detectedDelimiter: parsed.detectedDelimiter,
      selectedDelimiter: 'auto',
    },
    state: parsed.state,
  };
}
