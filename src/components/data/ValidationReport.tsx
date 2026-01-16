import { ValidationReport as ValidationReportType, ValidationIssue } from '@/types';
import { Badge } from '../ui/Badge';
import { CheckCircle, AlertTriangle, XCircle, Info, Lightbulb, ClipboardCheck } from 'lucide-react';

export interface ValidationReportProps {
  report: ValidationReportType | null;
  loading?: boolean;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

function IssueSeverityIcon({ severity }: { severity: ValidationIssue['severity'] }) {
  switch (severity) {
    case 'error':
      return <XCircle className="h-4 w-4 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-400" />;
  }
}

export function ValidationReportComponent({ report, loading = false, className = '' }: ValidationReportProps) {
  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="animate-spin h-8 w-8 border-2 border-gray-600 border-t-blue-500 rounded-full" />
          <p>Running validation...</p>
          <p className="text-sm text-gray-500">Claude is analyzing your data quality</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <ClipboardCheck className="h-12 w-12" />
          <p>No validation report yet</p>
          <p className="text-sm">Upload data to run quality validation</p>
        </div>
      </div>
    );
  }

  const errorCount = report.issues.filter(i => i.severity === 'error').length;
  const warningCount = report.issues.filter(i => i.severity === 'warning').length;
  const infoCount = report.issues.filter(i => i.severity === 'info').length;

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-100">Validation Report</span>
          </div>
          <Badge variant={report.qualityScore >= 70 ? 'success' : 'warning'}>
            {getScoreLabel(report.qualityScore)}
          </Badge>
        </div>
      </div>

      {/* Quality Score */}
      <div className="px-6 py-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400">Quality Score</span>
          <span className={`text-3xl font-bold ${getScoreColor(report.qualityScore)}`}>
            {report.qualityScore}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              report.qualityScore >= 90 ? 'bg-green-500' :
              report.qualityScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${report.qualityScore}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-gray-400">
            {report.validRows} / {report.totalRows} valid rows
          </span>
          <span className="text-gray-500">
            {((report.validRows / report.totalRows) * 100).toFixed(1)}% valid
          </span>
        </div>
      </div>

      {/* Issue Summary */}
      <div className="px-6 py-4 border-b border-gray-700 flex gap-4">
        {errorCount > 0 && (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">{errorCount} errors</span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">{warningCount} warnings</span>
          </div>
        )}
        {infoCount > 0 && (
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-400">{infoCount} info</span>
          </div>
        )}
        {report.issues.length === 0 && (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-400">No issues found</span>
          </div>
        )}
      </div>

      {/* Issues List */}
      {report.issues.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Issues</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {report.issues.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <IssueSeverityIcon severity={issue.severity} />
                <div>
                  <span className="text-gray-300">{issue.message}</span>
                  <span className="text-gray-500 ml-2">
                    (Row {issue.rowIndex}, {issue.field})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <div className="px-6 py-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Suggestions
          </h4>
          <ul className="space-y-2">
            {report.suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-blue-400">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
