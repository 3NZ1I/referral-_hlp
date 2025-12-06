import React, { useState, useRef, useEffect } from 'react';
import { Table, Typography, Tag, Space, message, Divider, Dropdown } from 'antd';
import { Button } from 'antd';
import { useCases } from '../context/CasesContext';
import { useAuth } from '../context/AuthContext';
import { exportCasesToXLSX } from '../utils/export';

const { Title, Paragraph } = Typography;

const caseColumns = [
  {
    title: 'Referral Status',
    dataIndex: 'status',
    key: 'status',
    width: 150,
    render: (status) => {
      let color = 'default';
      if (status?.toLowerCase().includes('complete')) color = 'cyan';
      else if (status?.toLowerCase().includes('progress')) color = 'blue';
      else if (status?.toLowerCase().includes('pending')) color = 'default';
      return <Tag color={color}>{status}</Tag>;
    },
  },
  { title: 'Case Number', dataIndex: 'caseNumber', key: 'caseNumber', width: 200 },
  { title: 'Assigned Staff Name', dataIndex: 'assignedStaff', key: 'assignedStaff', width: 220 },
    { title: 'Age (days)', dataIndex: 'submissionDate', key: 'age', width: 140, render: (submissionDate, record) => {
      // Prefer explicit formFields.today (commonly set by n8n) when present; else fall back to submission timestamp
      const dateVal = (record && record.formFields && record.formFields.today) || submissionDate || (record && record.raw && (record.raw.today || record.raw.formFields && record.raw.formFields.today || record.raw._submission_time || record.raw.submissiontime || record.created_at));
      if (!dateVal) return '—';
      const parsedDate = new Date(dateVal);
      if (isNaN(parsedDate.getTime())) return '—';
      const diffMs = Date.now() - parsedDate.getTime();
      const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      // Simple color mapping for Age indicator — green/orange/red
      let color = '#2ecc71';
      if (days > 5 && days <= 10) color = '#f39c12';
      if (days > 10) color = '#ff4d4f';
      const barStyle = { height: 8, width: '100%', background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginTop: 6 };
      const fillStyle = { height: '100%', width: `${Math.min(days, 100)}%`, background: color };
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>{days}</div>
            <div style={{ fontSize: 12, color: '#888' }}>days</div>
          </div>
          <div style={barStyle}><div style={fillStyle} /></div>
        </div>
      );
    } },
  { title: 'Dataset', dataIndex: 'datasetName', key: 'datasetName', width: 220, render: (datasetName, record) => {
      // If case is server originated, attempt to detect 'n8n' via uploadedBy or raw markers, and show 'n8n' or 'Server'
      try {
        if (record && record.datasetKey && typeof record.datasetKey === 'string' && record.datasetKey.startsWith('server')) {
          const uploader = (record.uploadedBy || record.raw?.uploaded_by || record.raw?.uploadedBy || '') || '';
          if (typeof uploader === 'string' && uploader.toLowerCase().includes('n8n')) {
            return 'n8n (Backend)';
          }
          if (record.source === 'kobo') return 'Kobo (Backend)';
          return 'Backend';
        }
      } catch (e) {
        // ignore
      }
      // Otherwise, present datasetName or the uploading filename
      return datasetName || ((record && record.raw && (record.raw.fileName || record.raw._fileName)) || 'File');
    } },
];

// NOTE: datasetColumns depends on component scope (currentUser and retryFailedRows)
// We'll keep a default, but columns requiring runtime values will be built inside the component
const datasetColumns = [
  { title: 'Record ID', dataIndex: 'recordId', key: 'recordId', width: 160 },
  { title: 'File Name', dataIndex: 'fileName', key: 'fileName' },
  { title: 'Entries', dataIndex: 'entries', key: 'entries', width: 120 },
  { title: 'Uploaded By', dataIndex: 'uploadedBy', key: 'uploadedBy', width: 200 },
  { title: 'Uploaded On', dataIndex: 'uploadedOn', key: 'uploadedOn', width: 160 },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 140,
    render: (status) => <Tag color={status === 'Validated' ? 'cyan' : 'gold'}>{status}</Tag>,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 220,
    render: (_, record) => (
      <Space>
        {record.failedRows && record.failedRows.length > 0 && (
          <Button size="small" type="primary" disabled>
            Retry Failed Rows
          </Button>
        )}
        <Button size="small" onClick={() => exportCasesToXLSX(record.rows || [], `${record.fileName || 'dataset'}.xlsx`)}>
          Download Rows
        </Button>
      </Space>
    ),
  }
];

const Data = () => {
  const { cases, datasets, importDataset, deleteCases, reloadCases, retryFailedRows } = useCases();
  const { currentUser } = useAuth();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const uploadInputRef = useRef(null);

  useEffect(() => {
    // Auto-refresh cases when navigating to the Data page
    reloadCases();
  }, [reloadCases]);

  // Build dataset columns here so we can reference currentUser and retry handler
  const datasetColumnsRuntime = [
    { title: 'Record ID', dataIndex: 'recordId', key: 'recordId', width: 160 },
    { title: 'File Name', dataIndex: 'fileName', key: 'fileName' },
    { title: 'Entries', dataIndex: 'entries', key: 'entries', width: 120 },
    { title: 'Uploaded By', dataIndex: 'uploadedBy', key: 'uploadedBy', width: 200 },
    { title: 'Uploaded On', dataIndex: 'uploadedOn', key: 'uploadedOn', width: 160 },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 140,
      render: (status) => <Tag color={status === 'Validated' ? 'cyan' : 'gold'}>{status}</Tag>
    },
    {
      title: 'Actions', key: 'actions', width: 220,
      render: (_, record) => (
        <Space>
          {record.failedRows && record.failedRows.length > 0 && currentUser && (currentUser.name === record.uploadedBy || currentUser.username === record.uploadedBy || (currentUser.role && currentUser.role.toLowerCase() === 'admin')) && (
            <Button size="small" type="primary" onClick={() => retryFailedRows(record.key)}>
              Retry Failed Rows
            </Button>
          )}
          <Button size="small" onClick={() => exportCasesToXLSX(record.rows || [], `${record.fileName || 'dataset'}.xlsx`)}>
            Download Rows
          </Button>
        </Space>
      ),
    }
  ];

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const results = await importDataset(file);
      // If results are an array or similar, optionally show how many server-created rows vs local rows
      if (Array.isArray(results) && results.length) {
        message.success(`Imported ${results.length} cases.`);
      }
      // Ensure we refresh cases after server import
      // importDataset now ensures refreshing by default
    } finally {
      event.target.value = '';
    }
  };

  const downloadData = (rows, filename = 'cases.json') => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllJSON = () => {
    if (!cases.length) {
      message.warning('No records to download yet.');
      return;
    }
    downloadData(cases, 'all-cases.json');
    message.success('Exported all cases as JSON.');
  };

  const handleDownloadAllXLSX = () => {
    if (!cases.length) {
      message.warning('No records to download yet.');
      return;
    }
    exportCasesToXLSX(cases, 'all-cases.xlsx');
    message.success('Exported all cases as XLSX.');
  };

  const handleDownloadSelectedJSON = () => {
    const rows = cases.filter((row) => selectedRowKeys.includes(row.key));
    if (!rows.length) {
      message.warning('Select at least one case to download.');
      return;
    }
    downloadData(rows, 'selected-cases.json');
    message.success('Exported selected cases as JSON.');
  };

  const handleDownloadSelectedXLSX = () => {
    const rows = cases.filter((row) => selectedRowKeys.includes(row.key));
    if (!rows.length) {
      message.warning('Select at least one case to download.');
      return;
    }
    exportCasesToXLSX(rows, 'selected-cases.xlsx');
    message.success('Exported selected cases as XLSX.');
  };

  const handleDeleteSelected = async () => {
    if (!selectedRowKeys.length) {
      message.warning('Select at least one case to delete.');
      return;
    }
    try {
      await deleteCases(selectedRowKeys);
      setSelectedRowKeys([]);
      message.success('Selected cases deleted.');
    } catch (err) {
      console.error('Failed to delete cases', err);
      message.error('Failed to delete selected cases.');
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  return (
    <>
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <Title level={4} style={{ margin: 0 }}>Data &gt; Uploads</Title>
            <Paragraph type="secondary" style={{ marginTop: 4 }}>
              Overview of XLSX uploads processed into the case workspace. Use this view to confirm row counts and review validation status.
            </Paragraph>
          </div>
          <Space className="panel-actions">
            <Dropdown
              menu={{
                items: [
                  { key: 'all-json', label: 'Download All (JSON)', onClick: handleDownloadAllJSON },
                  { key: 'all-xlsx', label: 'Download All (XLSX)', onClick: handleDownloadAllXLSX },
                ],
              }}
            >
              <button className="ghost-btn">Download All</button>
            </Dropdown>
            <Dropdown
              disabled={!selectedRowKeys.length}
              menu={{
                items: [
                  { key: 'sel-json', label: 'Download Selected (JSON)', onClick: handleDownloadSelectedJSON },
                  { key: 'sel-xlsx', label: 'Download Selected (XLSX)', onClick: handleDownloadSelectedXLSX },
                ],
              }}
            >
              <button className="ghost-btn" disabled={!selectedRowKeys.length}>Download Selected</button>
            </Dropdown>
            <button className="ghost-btn" onClick={handleDeleteSelected} disabled={!selectedRowKeys.length}>
              Delete Selected
            </button>
            <button className="primary-btn" onClick={() => uploadInputRef.current?.click()}>Upload New</button>
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={uploadInputRef}
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
          </Space>
        </div>
        <div className="table-wrapper" style={{ marginTop: 24 }}>
          <Table
            columns={caseColumns}
            dataSource={cases}
            pagination={false}
            rowKey="key"
            rowSelection={rowSelection}
            /* Add horizontal scrolling to prevent layout breaking on narrow viewports */
            scroll={{ x: 1000 }}
          />
        </div>
      </div>

      <Divider style={{ margin: '32px 0' }} />

      <div className="card-panel">
        <Title level={5} style={{ marginTop: 0 }}>Upload History</Title>
        <Paragraph type="secondary" style={{ marginTop: 4 }}>
          Reference log of files added to the workspace with their processed counts.
        </Paragraph>
        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <Table
            columns={datasetColumnsRuntime}
            dataSource={datasets}
            pagination={false}
            rowKey="key"
            /* Add horizontal scroll to dataset table as well */
            scroll={{ x: 900 }}
          />
        </div>
      </div>
    </>
  );
};

export default Data;
