import * as XLSX from 'xlsx';

const COLUMNS = [
  { key: 'ch_date_added',        label: 'Date / Time'        },
  { key: 'ch_call_id',           label: 'Call ID'            },
  { key: 'udh_user_id',          label: 'Agent ID'           },
  { key: 'username',             label: 'Username'           },
  { key: 'campaign_name',        label: 'Campaign'           },
  { key: 'ch_campaign_id',       label: 'Campaign ID'        },
  { key: 'ch_system_disposition',label: 'Sys Disposition'    },
  { key: 'udh_disposition_code', label: 'Disp Code'          },
  { key: 'udh_talk_time',        label: 'Talk Time (ms)'     },
  { key: 'uch_talk_time',        label: 'UCH Talk Time (ms)' },
  { key: 'ch_phone',             label: 'Phone'              },
  { key: 'ch_hangup_details',    label: 'Hangup Details'     },
  { key: 'queue_name',           label: 'Queue'              },
];

export const RAW_COLUMNS = COLUMNS;

export const exportRawDataToExcel = ({ rows, startDate, endDate }) => {
  const headers = COLUMNS.map((c) => c.label);
  const body    = rows.map((r) => COLUMNS.map((c) => r[c.key] ?? ''));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  ws['!cols'] = COLUMNS.map((c) => {
    const maxLen = Math.max(
      c.label.length,
      ...rows.slice(0, 200).map((r) => String(r[c.key] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Raw Data');
  XLSX.writeFile(wb, `Raw_Data_${startDate}_to_${endDate}.xlsx`);
};
