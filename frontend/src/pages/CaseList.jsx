import React from 'react';
import { Table, Tag, Button, Space, Typography } from 'antd';
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
      return <Tag color={color}>{status}</Tag>;
    },
    filters: [
      { text: 'Pending', value: 'Pending' },
      { text: 'In Progress', value: 'In Progress' },
      { text: 'Completed', value: 'Completed' },
      { text: 'On Hold', value: 'On Hold' },
      { text: 'Closed', value: 'Closed' },
    ],
    onFilter: (value, record) => record.status === value,
  },
  { 
    title: 'Case Number', 
    dataIndex: 'caseNumber', 
    key: 'caseNumber', 
    width: 180,
    sorter: (a, b) => a.caseNumber.localeCompare(b.caseNumber),
  },
  { 
    title: 'Assigned to', 
    dataIndex: 'assignedStaff', 
    key: 'assignedStaff', 
    width: 200,
    filters: [
      { text: 'Unassigned', value: 'Unassigned' },
    ],
    onFilter: (value, record) => record.assignedStaff === value,
  },
  { 
    title: 'Category', 
    dataIndex: 'category', 
    key: 'category', 
    width: 150,
    render: (category) => category || 'N/A',
  },
  { 
    title: 'Notes', 
    dataIndex: 'notes', 
    key: 'notes',
  },
];

const CaseList = () => {
  const { cases } = useCases();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Filter cases: admin and internal users see all cases, external users only see their assigned cases
  const filteredCases = currentUser?.role === 'admin' || currentUser?.role === 'internal'
    ? cases 
    : cases.filter(c => c.assignedStaff === currentUser?.name);

  return (
  <div>
    <div className="card-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 250px', minWidth: 0 }}>
          <Title level={4} style={{ margin: 0 }}>Cases &gt; Case List</Title>
          <Paragraph type="secondary" style={{ marginTop: 4 }}>
            Review and update safe beneficiary case records with the newly captured survey.
          </Paragraph>
        </div>
        <Button type="primary" shape="round" style={{ flexShrink: 0 }}>Add record</Button>
      </div>
      <div className="filters-bar">
        <Space wrap>
          <Button shape="round">Referral Status</Button>
          <Button shape="round">Assigned Staff</Button>
          <Button shape="round">Follow-Up Date</Button>
        </Space>
        <Space wrap style={{ marginLeft: 'auto' }}>
          <Button shape="round">Group</Button>
          <Button shape="round">Filter</Button>
          <Button shape="round">Sort</Button>
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
