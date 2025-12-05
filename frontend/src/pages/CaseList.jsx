import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Typography, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useCases } from '../context/CasesContext';
import { useAuth } from '../context/AuthContext';

const { Title, Paragraph } = Typography;

const columns = [
  {
    title: 'Referral Status',
    dataIndex: 'status',
    key: 'status',
    width: 150,
    render: (status) => {
      let color = 'blue';
      if (status === 'Completed') color = 'cyan';
      if (status === 'In Progress') color = 'blue';
      if (status === 'Pending') color = 'default';
      return <Tag color={color}>{status || 'Unspecified'}</Tag>;
    },
  },
  {
    title: 'Case Number',
    dataIndex: 'caseNumber',
    key: 'caseNumber',
    width: 180,
    sorter: (a, b) => (a.caseNumber || '').localeCompare(b.caseNumber || ''),
  },
  {
    title: 'Assigned to',
    dataIndex: 'assignedStaff',
    key: 'assignedStaff',
    width: 200,
    render: (text) => text || 'Unassigned',
  },
  {
    title: 'Category',
    dataIndex: 'category',
    key: 'category',
    width: 150,
    render: (category) => category || 'N/A',
  },
  {
    title: 'Age (days)',
    dataIndex: 'submissionDate',
    key: 'age',
    width: 140,
    render: (submissionDate, record) => {
      // Calculate age in days
      let dateVal = submissionDate || (record && record.raw && (record.raw._submission_time || record.raw.submissiontime || record.created_at));
      if (!dateVal) return '—';
      const parsedDate = new Date(dateVal);
      if (isNaN(parsedDate.getTime())) return '—';
      const diffMs = Date.now() - parsedDate.getTime();
      const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      // Determine SLA bar fraction and color range
      let fraction = 0;
      let fromColor = '#2ecc71'; // green
      let toColor = '#f39c12'; // orange
      if (days <= 5) {
        fraction = days / 5;
        fromColor = '#2ecc71';
        toColor = '#f39c12';
      } else if (days <= 10) {
        fraction = (days - 5) / 5;
        fromColor = '#f39c12';
        toColor = '#ff4d4f';
      } else {
        fraction = Math.min((days - 10) / 10, 1);
        fromColor = '#ff4d4f';
        toColor = '#000000';
      }

      const pct = Math.round(fraction * 100);

      const barStyle = {
        height: 8,
        width: '100%',
        background: '#f0f0f0',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 6,
      };
      const fillStyle = {
        height: '100%',
        width: `${pct}%`,
        background: `linear-gradient(90deg, ${fromColor}, ${toColor})`,
      };

      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>{days}</div>
            <div style={{ fontSize: 12, color: '#888' }}>days</div>
          </div>
          <div style={barStyle}>
            <div style={fillStyle} />
          </div>
        </div>
      );
    },
  },
  { title: 'Dataset', dataIndex: 'datasetName', key: 'datasetName', width: 220 },
  {
    title: 'Submission Date',
    dataIndex: 'submissionDate',
    key: 'submissionDate',
    width: 180,
    render: (date) => date || 'N/A',
  },
];
  const navigate = useNavigate();
  const { cases, reloadCases, staffDirectory, datasets } = useCases();
  const { currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState('');

  // Filter cases: admin and internal users see all cases, external users only see their assigned cases
  const lowerName = (currentUser?.name || '').toLowerCase();
  const currentUserId = (currentUser && (currentUser.id || currentUser.user_id)) || null;
  let filteredCases = (currentUser?.role || '').toLowerCase() === 'admin' || (currentUser?.role || '').toLowerCase() === 'internal'
    ? cases
    : cases.filter(c => {
      // Allow match by assignedToId or by name (case-insensitive)
      if (c.assignedToId && currentUserId && String(c.assignedToId) === String(currentUserId)) return true;
      if (c.assignedStaff && c.assignedStaff.toLowerCase() === lowerName) return true;
      // If server imported case has an uploader, allow the uploader to see it
      if ((c.raw && (c.raw.uploaded_by === currentUser?.name || c.raw.uploaded_by === currentUser?.username)) || (c.uploadedBy && (c.uploadedBy === currentUser?.name || c.uploadedBy === currentUser?.username))) return true;
      // Allow uploader to see cases they uploaded locally (dataset.uploadedBy === currentUser.name)
      if (c.datasetKey && datasets && datasets.some(d => d.key === c.datasetKey && d.uploadedBy === (currentUser?.name || currentUser?.username || 'You'))) {
        return true;
      }
      return false;
    });

  if (statusFilter) {
    filteredCases = filteredCases.filter(c => (c.status || '').toLowerCase().includes(statusFilter.toLowerCase()));
  }
  if (assignedFilter) {
    if (assignedFilter === 'Unassigned') {
      filteredCases = filteredCases.filter(c => !c.assignedStaff || c.assignedStaff === 'Unassigned');
    } else {
      filteredCases = filteredCases.filter(c => c.assignedStaff === assignedFilter);
    }
  }
  if (followUpFilter) {
    if (followUpFilter === 'has') filteredCases = filteredCases.filter(c => !!c.followUpDate);
    if (followUpFilter === 'none') filteredCases = filteredCases.filter(c => !c.followUpDate);
  }

  useEffect(() => { reloadCases(); }, [reloadCases]);

  return (
    <div>
      <div className="card-panel">
        <div className="panel-header">
          <div style={{ flex: '1 1 250px', minWidth: 0 }}>
            <Title level={4} style={{ margin: 0 }}>Cases</Title>
            <Paragraph type="secondary" style={{ marginTop: 4 }}>
              Review and update safe beneficiary case records.
            </Paragraph>
          </div>
          <div className="panel-actions">
            {/* New Case intentionally hidden per UX request */}
          </div>
        </div>

        <div className="filters-bar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select placeholder="Status" style={{ minWidth: 160 }} onChange={v => setStatusFilter(v)} value={statusFilter} allowClear>
              <Select.Option value="Pending">Pending</Select.Option>
              <Select.Option value="In Progress">In Progress</Select.Option>
              <Select.Option value="Completed">Completed</Select.Option>
              <Select.Option value="On Hold">On Hold</Select.Option>
              <Select.Option value="Closed">Closed</Select.Option>
            </Select>

            <Select placeholder="Assigned" style={{ minWidth: 220 }} onChange={v => setAssignedFilter(v)} value={assignedFilter} allowClear>
              <Select.Option value="Unassigned">Unassigned</Select.Option>
              {staffDirectory && staffDirectory.map(s => (
                <Select.Option value={s.name} key={s.id}>{s.name}</Select.Option>
              ))}
            </Select>

            <Select placeholder="Follow Up" style={{ minWidth: 140 }} onChange={v => setFollowUpFilter(v)} value={followUpFilter} allowClear>
              <Select.Option value="has">Has Follow-up</Select.Option>
              <Select.Option value="none">No Follow-up</Select.Option>
            </Select>
          </div>

          <Space style={{ marginLeft: 'auto' }}>
            <Button shape="round" onClick={() => { setStatusFilter(''); setAssignedFilter(''); setFollowUpFilter(''); }}>Clear Filters</Button>
            <Button shape="round" onClick={() => { /* TODO: implement save filters to URL */ }}>Save Filters</Button>
          </Space>
        </div>

        <div className="table-wrapper">
          <Table
            columns={columns}
            dataSource={filteredCases}
            pagination={false}
            rowKey="key"
            scroll={{ x: 800 }}
            onRow={(record) => ({
              onClick: () => navigate(`/case/${record.key}`),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      </div>
    </div>
  );
};

export default CaseList;
