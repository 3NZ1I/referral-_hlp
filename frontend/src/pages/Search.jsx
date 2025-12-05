import React, { useState, useMemo } from 'react';
import { Card, Input, Radio, Table, Tag, Typography, Space, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCases } from '../context/CasesContext';
import { useAuth } from '../context/AuthContext';

const { Title, Paragraph, Text } = Typography;

const Search = () => {
  const { cases } = useCases();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState('caseId');
  const [caseIdValue, setCaseIdValue] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryLastName, setBeneficiaryLastName] = useState('');
  const [beneficiaryFather, setBeneficiaryFather] = useState('');
  const [beneficiaryMother, setBeneficiaryMother] = useState('');
  const [beneficiaryBirthDate, setBeneficiaryBirthDate] = useState('');

  const searchResults = useMemo(() => {
    const lowerName = (currentUser?.name || '').toLowerCase();
    const currentUserId = (currentUser && (currentUser.id || currentUser.user_id)) || null;
    if (searchType === 'caseId') {
      if (!caseIdValue.trim()) return [];
      const searchTerm = caseIdValue.toLowerCase().trim();
      return cases.filter((c) => 
        c.caseNumber?.toLowerCase().includes(searchTerm) ||
        c.formFields?.case_id?.toLowerCase().includes(searchTerm)
      ).filter((c) => {
        // Role-based visibility similar to CaseList: admin/internal see all; else only assigned/uploader
        const role = (currentUser?.role || '').toLowerCase();
        if (role === 'admin' || role === 'internal') return true;
        if (c.assignedToId && currentUserId && String(c.assignedToId) === String(currentUserId)) return true;
        if (c.assignedStaff && c.assignedStaff.toLowerCase() === lowerName) return true;
        if ((c.raw && (c.raw.uploaded_by === currentUser?.name || c.raw.uploaded_by === currentUser?.username)) || (c.uploadedBy && (c.uploadedBy === currentUser?.name || c.uploadedBy === currentUser?.username))) return true;
        return false;
      });
    } else {
      // Beneficiary search
      const hasAnyInput = beneficiaryName || beneficiaryLastName || beneficiaryFather || beneficiaryMother || beneficiaryBirthDate;
      if (!hasAnyInput) return [];

      return cases.filter((c) => {
        const fields = c.formFields || {};
        const name = fields.benef_name?.toLowerCase() || '';
        const lastName = fields.benef_last_name?.toLowerCase() || '';
        const father = fields.benef_father?.toLowerCase() || '';
        const mother = fields.benef_mother?.toLowerCase() || '';
        const birthDate = fields.benef_birth_date || '';

        let matches = true;
        if (beneficiaryName && !name.includes(beneficiaryName.toLowerCase().trim())) matches = false;
        if (beneficiaryLastName && !lastName.includes(beneficiaryLastName.toLowerCase().trim())) matches = false;
        if (beneficiaryFather && !father.includes(beneficiaryFather.toLowerCase().trim())) matches = false;
        if (beneficiaryMother && !mother.includes(beneficiaryMother.toLowerCase().trim())) matches = false;
        if (beneficiaryBirthDate && !birthDate.includes(beneficiaryBirthDate.trim())) matches = false;

        // Additionally filter by role-based visibility
        const role = (currentUser?.role || '').toLowerCase();
        if (role === 'admin' || role === 'internal') return matches;
        if (c.assignedToId && currentUserId && String(c.assignedToId) === String(currentUserId)) return matches;
        if (c.assignedStaff && c.assignedStaff.toLowerCase() === lowerName) return matches;
        if ((c.raw && (c.raw.uploaded_by === currentUser?.name || c.raw.uploaded_by === currentUser?.username)) || (c.uploadedBy && (c.uploadedBy === currentUser?.name || c.uploadedBy === currentUser?.username))) return matches;
        return false;
      });
    }
  }, [cases, searchType, caseIdValue, beneficiaryName, beneficiaryLastName, beneficiaryFather, beneficiaryMother, beneficiaryBirthDate]);

  const columns = [
    {
      title: 'Case Number',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
      width: 180,
    },
    {
      title: 'Beneficiary Name',
      key: 'beneficiaryName',
      width: 200,
      render: (_, record) => {
        const fields = record.formFields || {};
        const name = fields.benef_name || '';
        const lastName = fields.benef_last_name || '';
        return `${name} ${lastName}`.trim() || 'N/A';
      },
    },
    {
      title: 'Status',
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
    },
    {
      title: 'Assigned to',
      dataIndex: 'assignedStaff',
      key: 'assignedStaff',
      width: 180,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category) => category || 'N/A',
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button type="link" onClick={() => navigate(`/case/${record.key}`)}>
          View Details
        </Button>
      ),
    },
  ];

  const handleClear = () => {
    setCaseIdValue('');
    setBeneficiaryName('');
    setBeneficiaryLastName('');
    setBeneficiaryFather('');
    setBeneficiaryMother('');
    setBeneficiaryBirthDate('');
  };

  return (
    <div>
      <div className="card-panel">
        <Title level={4} style={{ margin: 0 }}>Search Cases</Title>
        <Paragraph type="secondary" style={{ marginTop: 4 }}>
          Search for cases by Case ID or Beneficiary details
        </Paragraph>

        <Card style={{ marginTop: 24 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text strong>Search By:</Text>
              <Radio.Group 
                value={searchType} 
                onChange={(e) => setSearchType(e.target.value)}
                style={{ marginLeft: 16 }}
              >
                <Radio value="caseId">Case ID</Radio>
                <Radio value="beneficiary">Beneficiary Details</Radio>
              </Radio.Group>
            </div>

            {searchType === 'caseId' ? (
              <div>
                <Text strong>Case ID:</Text>
                <Input
                  placeholder="Enter Case ID"
                  prefix={<SearchOutlined />}
                  value={caseIdValue}
                  onChange={(e) => setCaseIdValue(e.target.value)}
                  style={{ marginTop: 8 }}
                  size="large"
                  allowClear
                />
              </div>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Beneficiary Name:</Text>
                  <Input
                    placeholder="Enter first name"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    style={{ marginTop: 8 }}
                    allowClear
                  />
                </div>
                <div>
                  <Text strong>Beneficiary Last Name:</Text>
                  <Input
                    placeholder="Enter last name"
                    value={beneficiaryLastName}
                    onChange={(e) => setBeneficiaryLastName(e.target.value)}
                    style={{ marginTop: 8 }}
                    allowClear
                  />
                </div>
                <div>
                  <Text strong>Father's Name:</Text>
                  <Input
                    placeholder="Enter father's name"
                    value={beneficiaryFather}
                    onChange={(e) => setBeneficiaryFather(e.target.value)}
                    style={{ marginTop: 8 }}
                    allowClear
                  />
                </div>
                <div>
                  <Text strong>Mother's Name:</Text>
                  <Input
                    placeholder="Enter mother's name"
                    value={beneficiaryMother}
                    onChange={(e) => setBeneficiaryMother(e.target.value)}
                    style={{ marginTop: 8 }}
                    allowClear
                  />
                </div>
                <div>
                  <Text strong>Birth Date:</Text>
                  <Input
                    placeholder="Enter birth date (YYYY-MM-DD)"
                    value={beneficiaryBirthDate}
                    onChange={(e) => setBeneficiaryBirthDate(e.target.value)}
                    style={{ marginTop: 8 }}
                    allowClear
                  />
                </div>
              </Space>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={handleClear}>Clear</Button>
            </div>
          </Space>
        </Card>

        {searchResults.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>Search Results ({searchResults.length})</Title>
            <div className="table-wrapper" style={{ marginTop: 16 }}>
              <Table
                columns={columns}
                dataSource={searchResults}
                pagination={{ pageSize: 10 }}
                rowKey="key"
                scroll={{ x: 800 }}
              />
            </div>
          </div>
        )}

        {searchResults.length === 0 && (searchType === 'caseId' ? caseIdValue : (beneficiaryName || beneficiaryLastName || beneficiaryFather || beneficiaryMother || beneficiaryBirthDate)) && (
          <div style={{ marginTop: 24, textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">No results found</Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
