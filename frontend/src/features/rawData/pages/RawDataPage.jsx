import { Database, Menu, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useRawData }            from '../hooks/useRawData';
import RawDataFilters            from '../components/RawDataFilters';
import RawDataTable              from '../components/RawDataTable';
import RawDataKpiCards           from '../components/RawDataKpiCards';
import { exportRawDataToExcel }  from '../utils/rawDataHelpers';

const Skeleton = () => (
  <div className="animate-pulse space-y-0">
    <div className="h-10 bg-slate-200" />
    <div className="h-11 bg-slate-800/80" />
    {[...Array(12)].map((_, i) => (
      <div key={i} className={`h-10 border-b border-slate-100 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`} />
    ))}
  </div>
);

const RawDataPage = ({ onMenuToggle }) => {
  const { data, loading, error, fetchReport, lastParams } = useRawData();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center h-14 px-4 sm:px-6 gap-3 max-w-screen-2xl mx-auto">
          <button onClick={onMenuToggle} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 transition-colors">
            <Menu size={19} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <span>Reports</span><span>/</span>
              <span className="text-slate-600 font-medium">Raw Data</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-800">Raw Data Explorer</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 uppercase tracking-wide">
                PG
              </span>
            </div>
          </div>
          {data?.rows?.length > 0 && (
            <button
              onClick={() => exportRawDataToExcel({
                rows:      data.rows,
                startDate: data.startDate || '',
                endDate:   data.endDate   || '',
              })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-200 shrink-0"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Download Excel</span>
              <span className="sm:hidden">Download</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto w-full">
        <RawDataFilters onFetch={fetchReport} loading={loading} />

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 px-4 py-4">
            <AlertCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Failed to fetch data</p>
              <p className="text-sm text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <Skeleton />
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── KPI Summary Cards ──────────────────────────────────────── */}
            <RawDataKpiCards
              rows={data.rows}
              startDate={data.startDate || ''}
              endDate={data.endDate   || ''}
              fetchParams={lastParams}
            />

            {/* ── Raw Data Table ─────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Database size={15} className="text-blue-500" />
                  <span className="text-sm font-semibold text-slate-700">Query Results</span>
                  <span className="text-[11px] px-1.5 py-0.5 font-bold bg-blue-100 text-blue-700 min-w-[22px] text-center">
                    {data.count}
                  </span>
                  {data.limit > 0 && data.count >= data.limit && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 font-semibold">
                      limit reached — use All or narrow filters
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-slate-400 hidden sm:block">
                  {data.startDate} — {data.endDate}
                </span>
              </div>
              <RawDataTable rows={data.rows} />
            </div>
          </>
        )}

        {!data && !loading && !error && (
          <div className="bg-white border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 flex items-center justify-center">
              <Database size={30} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-700">No data fetched yet</p>
              <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
                Select a period, apply filters and click{' '}
                <span className="font-semibold text-blue-600">Fetch Data</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RawDataPage;
