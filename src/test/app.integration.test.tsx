import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as XLSX from 'xlsx';
import App from '../App';

describe('CSV Cleaner Application Integration', () => {
  it('renders landing view with privacy guarantee, loads sample dataset, cleans duplicates, and supports undo', () => {
    render(<App />);

    // Verify landing hero & privacy notice
    expect(
      screen.getByText(/Clean, Transform & Inspect Spreadsheets Instantly/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Privacy Notice:/i)).toBeInTheDocument();

    // Load the first sample dataset
    const sampleBtn = screen.getByText(/E-Commerce Customer Orders \(Dirty Sample\)/i);
    fireEvent.click(sampleBtn);

    // Dataset loaded: verify filename and initial row count (28 rows x 9 cols)
    expect(screen.getByText('ecommerce_orders_messy.csv')).toBeInTheDocument();
    expect(screen.getByText(/28 rows × 9 cols/i)).toBeInTheDocument();

    // Remove duplicate rows via the Duplicates panel
    const removeDupBtn = screen.getByRole('button', {
      name: /Remove Duplicate Rows \(2\)/i,
    });
    fireEvent.click(removeDupBtn);

    // Row count should drop from 28 to 26
    expect(screen.getByText(/26 rows × 9 cols/i)).toBeInTheDocument();

    // Click Undo in the header -> row count returns to 28
    const undoBtn = screen.getByTitle(/Undo last operation/i);
    fireEvent.click(undoBtn);
    expect(screen.getByText(/28 rows × 9 cols/i)).toBeInTheDocument();

    // Open Export Modal and verify export summary shows row and column counts
    const exportBtn = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportBtn);
    expect(screen.getByText(/Export Cleaned Dataset/i)).toBeInTheDocument();
    expect(screen.getByText(/Export Summary/i)).toBeInTheDocument();
  });

  it('imports a multi-sheet Excel (.xlsx) file locally and allows switching worksheets', async () => {
    render(<App />);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Item', 'Qty'],
        ['Keyboard', 10],
        ['Mouse', 25],
      ]),
      'Q1_Stock'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Office', 'Headcount'],
        ['Helsinki', 42],
      ]),
      'Offices'
    );

    const xlsxBytes = new Uint8Array(
      XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    );
    const file = new File([xlsxBytes], 'company_workbook.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const uploadInput = screen.getByLabelText(/Upload CSV or Excel file/i);
    await act(async () => {
      fireEvent.change(uploadInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('company_workbook.xlsx')).toBeInTheDocument();
    });

    // Both worksheet buttons are displayed
    expect(screen.getByRole('button', { name: 'Q1_Stock' })).toBeInTheDocument();
    const officesSheetBtn = screen.getByRole('button', { name: 'Offices' });
    expect(officesSheetBtn).toBeInTheDocument();
    expect(screen.getByText(/2 rows × 2 cols/i)).toBeInTheDocument();

    // Switch to second worksheet
    fireEvent.click(officesSheetBtn);
    expect(screen.getByText(/1 rows × 2 cols/i)).toBeInTheDocument();
    expect(screen.getByText('Helsinki')).toBeInTheDocument();
  });
});
