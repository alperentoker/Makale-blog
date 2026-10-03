import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, FileCode } from 'lucide-react';
import { TableData } from '../types';

interface InteractiveTableProps {
  data: TableData;
}

export const InteractiveTable: React.FC<InteractiveTableProps> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedRows = useMemo(() => {
    let result = [...data.rows];

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(row =>
        row.some(cell => String(cell).toLowerCase().includes(q))
      );
    }

    // Sort by column
    if (sortCol !== null) {
      result.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];

        // Parse numeric if applicable
        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[^0-9.-]/g, ''));
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[^0-9.-]/g, ''));

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data.rows, searchQuery, sortCol, sortDirection]);

  const handleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortCol(null);
      }
    } else {
      setSortCol(colIndex);
      setSortDirection('asc');
    }
  };

  const exportCSV = () => {
    const csvContent = [
      data.headers.join(','),
      ...filteredAndSortedRows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${data.id || 'tablo'}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const jsonObjects = filteredAndSortedRows.map(row => {
      const obj: Record<string, string | number> = {};
      data.headers.forEach((h, idx) => {
        obj[h] = row[idx];
      });
      return obj;
    });

    const blob = new Blob([JSON.stringify(jsonObjects, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${data.id || 'tablo'}_export.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="my-8 rounded border border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-850 shadow-paper overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 border-b border-paper-300 dark:border-paper-800 bg-paper-150 dark:bg-paper-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-ink-900 dark:text-paper-100 font-sans">
            {data.title}
          </h4>
          {data.description && (
            <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5 font-sans">
              {data.description}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Tabloda ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 rounded focus:outline-none focus:ring-1 focus:ring-tactical-800 dark:focus:ring-tactical-500 font-mono text-ink-800 dark:text-paper-100 placeholder:text-ink-400 w-36 sm:w-48"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded border border-paper-300 dark:border-paper-700 bg-white dark:bg-paper-800 hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-700 dark:text-paper-200 transition-colors"
            title="CSV Formatında Dışa Aktar"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-tactical-emerald" />
            <span>CSV</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded border border-paper-300 dark:border-paper-700 bg-white dark:bg-paper-800 hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-700 dark:text-paper-200 transition-colors"
            title="JSON Formatında Dışa Aktar"
          >
            <FileCode className="w-3.5 h-3.5 text-tactical-amber" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-paper-300 dark:border-paper-800 bg-paper-200/60 dark:bg-paper-900/60 text-ink-700 dark:text-ink-300 font-mono">
              {data.headers.map((header, idx) => (
                <th
                  key={idx}
                  onClick={() => handleSort(idx)}
                  className="py-2.5 px-3.5 font-medium cursor-pointer hover:bg-paper-200 dark:hover:bg-paper-800 select-none transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span>{header}</span>
                    <span className="text-ink-400">
                      {sortCol === idx ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-tactical-800 dark:text-tactical-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-tactical-800 dark:text-tactical-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-200 dark:divide-paper-800 font-sans">
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.headers.length}
                  className="py-6 text-center text-ink-400 font-mono text-xs"
                >
                  Sonuç bulunamadı.
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-paper-150/70 dark:hover:bg-paper-800/40 transition-colors"
                >
                  {row.map((cell, cIdx) => {
                    const str = String(cell);
                    const isStatus =
                      str.includes('⚠️') || str.includes('🟡') || str.includes('🟢') || str.includes('✅');

                    return (
                      <td
                        key={cIdx}
                        className={`py-2 px-3.5 text-ink-800 dark:text-paper-100 whitespace-nowrap ${
                          cIdx === 0 ? 'font-medium' : 'font-mono text-[11px]'
                        }`}
                      >
                        {isStatus ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono ${
                              str.includes('⚠️')
                                ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50'
                                : str.includes('✅')
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                                : str.includes('🟢')
                                ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-900/50'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
                            }`}
                          >
                            {str}
                          </span>
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-paper-300 dark:border-paper-800 bg-paper-150/50 dark:bg-paper-900/50 flex items-center justify-between text-[11px] font-mono text-ink-500">
        <span>Toplam {filteredAndSortedRows.length} satır gösteriliyor</span>
        <span>Sütun başlığına tıklayarak sıralayın</span>
      </div>
    </div>
  );
};
