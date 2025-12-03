import React from 'react';
import { Card, Select, Button } from 'antd';

const users = [
  { value: 'john', label: 'John Doe' },
  { value: 'jane', label: 'Jane Smith' },
];

const abilities = [
  { value: 'sales', label: 'Sales' },
  { value: 'legal', label: 'Legal' },
];

const Assignment = () => (
  <Card title="Assign Case" bordered={false}>
    <Select options={users} placeholder="Select User" style={{ width: 200, marginRight: 16 }} />
    <Select options={abilities} placeholder="Select Ability" style={{ width: 200, marginRight: 16 }} />
    <Button type="primary">Assign</Button>
  </Card>
);

export default Assignment;
