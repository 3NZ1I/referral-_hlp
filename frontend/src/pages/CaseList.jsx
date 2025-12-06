import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Typography, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useCases } from '../context/CasesContext';
import { getOptionLabel } from '../utils/formatters';
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
      // Calculate age in days; prefer formFields.today when present
      let dateVal = (record && record.formFields && record.formFields.today) || submissionDate || (record && record.raw && (record.raw.today || record.raw._submission_time || record.raw.submissiontime || record.created_at)) || record.created_at;
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
    title: 'Last Update',
    dataIndex: 'updated_at',
    key: 'lastUpdate',
    width: 180,
    render: (date, record) => {
      const val = date || (record && record.raw && (record.raw._last_edited || record.raw._submission_time || record.raw.submissiontime || record.created_at)) || record.created_at;
      if (!val) return '—';
      const parsed = new Date(val);
      if (isNaN(parsed.getTime())) return '—';
      return parsed.toISOString().split('T')[0];
    },
  },
];

const CaseList = () => {
  const navigate = useNavigate();
  const { cases, reloadCases, staffDirectory, datasets } = useCases();
  const { currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [valueLang, setValueLang] = useState('en');
  // Follow-up filter was removed in the requested UI changes

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
  // No follow-up filter (removed)

  useEffect(() => { reloadCases(); }, [reloadCases]);

  // Build column definitions with dynamic filters per column based on current cases
  const columnsWithFilters = React.useMemo(() => {
    const buildTextFilters = (key) => {
      const set = new Set();
      (cases || []).forEach((c) => {
        if (key === 'category') {
          try {
            const formFields = (c && c.formFields) || {};
            const categoryFields = [
              { field: 'law_followup5', optionsKey: 'sj0lw93' },
              { field: 'law_followup4', optionsKey: 'sj0lw92' },
              { field: 'law_followup3', optionsKey: 'sj0lw91' },
              { field: 'law_followup1', optionsKey: 'sj0rz88' },
              { field: 'eng_followup1', optionsKey: 'sj0rz77' },
            ];
            let added = false;
            for (const { field, optionsKey } of categoryFields) {
              const val = formFields[field] || (c && c.raw && c.raw[field]);
              if (val && val !== '') {
                set.add(getOptionLabel(optionsKey, val, valueLang));
                added = true;
              }
            }
            if (!added && c.category && typeof c.category === 'string') {
              const p = c.category.split('/');
              set.add(valueLang === 'ar' ? (p[1] || p[0]).trim() : (p[0] || c.category).trim());
            }
            return; // skip default handling
          } catch (e) {
            // fallback to default
          }
        }
        const v = c[key];
        if (v !== undefined && v !== null && v !== '') set.add(String(v));
      });
      return Array.from(set).sort().map(v => ({ text: v, value: v }));
    };

    return columns.map((col) => {
      const newCol = { ...col };
      const key = col.dataIndex || col.key;
      if (key === 'submissionDate') {
        newCol.filters = [ { text: '0-5 days', value: '0-5' }, { text: '6-10 days', value: '6-10' }, { text: '>10 days', value: '>10' } ];
        newCol.onFilter = (value, record) => {
          const dateVal = (record && record.formFields && record.formFields.today) || (record && record.raw && (record.raw.today || record.raw._submission_time || record.raw.submissiontime || record.created_at)) || record.created_at;
          if (!dateVal) return false;
          const parsed = new Date(dateVal);
          if (isNaN(parsed.getTime())) return false;
          const diffMs = Date.now() - parsed.getTime();
          const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          if (value === '0-5') return days <= 5;
          if (value === '6-10') return days > 5 && days <= 10;
          return days > 10;
        };
      } else if (key === 'age' || key === 'lastUpdate') {
        // for readability, we keep build default filters for dataset and category
      } else {
        // For text-like fields, add filters
        if (['status', 'caseNumber', 'assignedStaff', 'category', 'datasetName'].includes(key)) {
          const filters = buildTextFilters(key);
          if (filters && filters.length) {
            newCol.filters = filters;
            newCol.onFilter = (value, rec) => {
              if (key === 'category') {
                try {
                  const formFields = (rec && rec.formFields) || {};
                  const categoryFields = [
                    { field: 'law_followup5', optionsKey: 'sj0lw93' },
                    { field: 'law_followup4', optionsKey: 'sj0lw92' },
                    { field: 'law_followup3', optionsKey: 'sj0lw91' },
                    { field: 'law_followup1', optionsKey: 'sj0rz88' },
                    { field: 'eng_followup1', optionsKey: 'sj0rz77' },
                  ];
                  for (const { field, optionsKey } of categoryFields) {
                    const val = formFields[field] || (rec && rec.raw && rec.raw[field]);
                    if (val && val !== '') return String(getOptionLabel(optionsKey, val, valueLang)).toLowerCase() === String(value).toLowerCase();
                  }
                } catch (e) {
                  // fallback
                }
                if (rec && rec.category && typeof rec.category === 'string') {
                  const p = rec.category.split('/');
                  const lab = valueLang === 'ar' ? (p[1] || p[0]).trim() : (p[0] || rec.category).trim();
                  return String(lab).toLowerCase() === String(value).toLowerCase();
                }
                return false;
              }
              const v = rec[key] || '';
              return String(v).toLowerCase() === String(value).toLowerCase();
            };
          }
        }
      }
      // Add localized value rendering for category values (use selected valueLang)
      if (key === 'category') {
        newCol.render = (category, record) => {
          try {
            const formFields = (record && record.formFields) || {};
            const categoryFields = [
              { field: 'law_followup5', optionsKey: 'sj0lw93' }, // External legal guidance
              { field: 'law_followup4', optionsKey: 'sj0lw92' }, // External legal referral
              { field: 'law_followup3', optionsKey: 'sj0lw91' }, // Internal legal referral
              { field: 'law_followup1', optionsKey: 'sj0rz88' }, // Type of legal case
              { field: 'eng_followup1', optionsKey: 'sj0rz77' }, // Engineering referral type
            ];
            for (const { field, optionsKey } of categoryFields) {
              const value = formFields[field] || (record && record.raw && record.raw[field]);
              if (value && value !== '') {
                return getOptionLabel(optionsKey, value, valueLang) || 'N/A';
              }
            }
          } catch (e) {
            // ignore, fallback to record.category
          }
          if (category && typeof category === 'string') {
            const parts = category.split('/');
            if (valueLang === 'ar') return (parts[1] || parts[0]).trim();
            return (parts[0] || category).trim();
          }
          return 'N/A';
        };
      }
      return newCol;
    });
  }, [cases, valueLang]);

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

            {/* Follow-up filter removed; Last Update replaces submission date and tracks recent activity */}
          </div>

          <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#666', marginRight: 8 }}>Values language</div>
            <Select value={valueLang} onChange={v => setValueLang(v)} style={{ minWidth: 120 }}>
              <Select.Option value="en">English</Select.Option>
              <Select.Option value="ar">Arabic</Select.Option>
            </Select>
          </div>

          <Space style={{ marginLeft: 'auto' }}>
            <Button shape="round" onClick={() => { setStatusFilter(''); setAssignedFilter(''); }}>Clear Filters</Button>
            <Button shape="round" onClick={() => { /* TODO: implement save filters to URL */ }}>Save Filters</Button>
          </Space>
        </div>

        <div className="table-wrapper">
          <Table
            columns={columnsWithFilters}
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
