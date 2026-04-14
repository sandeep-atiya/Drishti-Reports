import { RAW_COLUMNS } from '../utils/rawDataHelpers';

const fmt = (val) => {
  if (val === null || val === undefined) return <span className="text-slate-300">—</span>;
  return String(val);
};

const RawDataTable = ({ rows }) => {
  if (!rows?.length) {
    return (
      <div className="py-14 flex flex-col items-center gap-3 text-slate-400">
        <p className="text-sm font-semibold">No rows returned</p>
        <p className="text-xs">Try expanding the date range or removing some filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[600px]">
      <table className="min-w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-800 text-white">
            <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide whitespace-nowrap border-r border-slate-700 w-8 shrink-0">
              #
            </th>
            {RAW_COLUMNS.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide whitespace-nowrap border-r border-slate-700 last:border-r-0"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
            >
              <td className="px-3 py-2 text-slate-400 font-mono border-r border-slate-100 text-right">
                {i + 1}
              </td>
              {RAW_COLUMNS.map((col) => {
                const val = row[col.key];
                let display = fmt(val);

                // Highlight connected/non-connected dispositions
                if (col.key === 'ch_system_disposition') {
                  const upper = String(val || '').toUpperCase();
                  if (upper === 'CONNECTED') {
                    display = <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700">CONNECTED</span>;
                  } else if (val) {
                    display = <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500">{val}</span>;
                  }
                }

                // Highlight CALL_DROP
                if (col.key === 'udh_disposition_code') {
                  const upper = String(val || '').toUpperCase();
                  if (upper === 'CALL_DROP' || upper === 'CALL DROP') {
                    display = <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600">{val}</span>;
                  } else if (String(val || '').toLowerCase() === 'failed.association') {
                    display = <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-600">{val}</span>;
                  }
                }

                // Talk time: show seconds
                if ((col.key === 'udh_talk_time' || col.key === 'uch_talk_time') && val != null) {
                  const ms  = Number(val);
                  const sec = (ms / 1000).toFixed(1);
                  display = <span title={`${val} ms`}>{sec}s</span>;
                }

                return (
                  <td
                    key={col.key}
                    className="px-3 py-2 text-slate-700 whitespace-nowrap border-r border-slate-100 last:border-r-0 font-mono"
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RawDataTable;
