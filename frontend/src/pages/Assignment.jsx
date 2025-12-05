import React, { useEffect, useMemo, useState } from 'react';
import { Card, Select, Button } from 'antd';
import { useAuth } from '../context/AuthContext';
import request from '../api/http';

const Assignment = () => {
  const { users } = useAuth();
  const [abilityOptions, setAbilityOptions] = useState([]);
  useEffect(() => {
    const fetchAbilities = async () => {
      try {
        const list = await request('/abilities');
        if (Array.isArray(list)) setAbilityOptions(list.map(a => ({ value: a, label: a })));
      } catch (err) {
        console.warn('Failed to fetch abilities', err);
      }
    };
    fetchAbilities();
  }, []);

  const userOptions = useMemo(() => (users || []).map((u) => ({ value: u.username || u.id || u.name, label: u.name })), [users]);

  return (
    <Card title="Assign Case" bordered={false}>
      <Select options={userOptions} placeholder="Select User" style={{ width: 200, marginRight: 16 }} />
      <Select options={abilityOptions} placeholder="Select Ability" style={{ width: 200, marginRight: 16 }} />
      <Button type="primary">Assign</Button>
    </Card>
  );
};

export default Assignment;
