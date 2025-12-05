import React, { useState, useRef } from 'react';
import { Table, Typography, Tag, Space, message, Divider, Dropdown } from 'antd';
import { useCases } from '../context/CasesContext';
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
  { title: 'Follow-Up Date', dataIndex: 'followUpDate', key: 'followUpDate', width: 180 },
  { title: 'Notes', dataIndex: 'notes', key: 'notes' },
  { title: 'Dataset', dataIndex: 'datasetName', key: 'datasetName', width: 220 },
];

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
];

const Data = () => {
  const { cases, datasets, importDataset, deleteCases } = useCases();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const uploadInputRef = useRef(null);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importDataset(file);
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

  const handleDeleteSelected = () => {
    if (!selectedRowKeys.length) {
      message.warning('Select at least one case to delete.');
      return;
    }
    deleteCases(selectedRowKeys);
    setSelectedRowKeys([]);
    message.success('Selected cases deleted.');
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
            <Title level={4} style={{ margin: 0, whiteSpace: 'nowrap' }}>Data &gt; Uploads</Title>
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
        <Title level={5} style={{ marginTop: 0, whiteSpace: 'nowrap' }}>Upload History</Title>
        <Paragraph type="secondary" style={{ marginTop: 4 }}>
          Reference log of files added to the workspace with their processed counts.
        </Paragraph>
        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <Table
            columns={datasetColumns}
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
