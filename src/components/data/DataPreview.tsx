import { DataPreviewData } from '@/types';
import { Table, FileText } from 'lucide-react';

export interface DataPreviewProps {
  data: DataPreviewData | null;
  loading?: boolean;
  maxRows?: number;
  className?: string;
}

export function DataPreview({ data, loading = false, maxRows = 10, className = '' }: DataPreviewProps) {
  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="animate-spin h-8 w-8 border-2 border-gray-600 border-t-blue-500 rounded-full" />
          <p>Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <FileText className="h-12 w-12" />
          <p>No data to preview</p>
          <p className="text-sm">Upload a file to see a preview</p>
        </div>
      </div>
    );
  }

  const displayRows = data.rows.slice(0, maxRows);

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-gray-100">Data Preview</span>
        </div>
        <span className="text-sm text-gray-400">
          Showing {displayRows.length} of {data.totalRows} rows
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/50">
              <th className="px-4 py-2 text-left text-gray-400 font-medium w-12">#</th>
              {data.headers.map((header, idx) => (
                <th key={idx} className="px-4 py-2 text-left text-gray-400 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {displayRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">{rowIdx + 1}</td>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-2 text-gray-300 max-w-xs truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {data.totalRows > maxRows && (
        <div className="px-4 py-2 border-t border-gray-700 text-center text-sm text-gray-500">
          {data.totalRows - maxRows} more rows not shown
        </div>
      )}
    </div>
  );
}
