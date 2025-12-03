import React, { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Admin = () => {
  const { users, addUser, updateUser, deleteUser, currentUser, ROLES } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  // Redirect non-admin users
  if (currentUser?.role !== 'admin') {
    navigate('/cases');
    return null;
  }

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalOpen(true);
  };

  const handleDelete = (userId) => {
    if (userId === currentUser?.id) {
      message.error('You cannot delete your own account');
      return;
    }
    deleteUser(userId);
    message.success('User deleted successfully');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        updateUser(editingUser.id, values);
        message.success('User updated successfully');
      } else {
        addUser(values);
        message.success('User added successfully');
      }
      
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          {record.avatar ? (
            <img
              src={record.avatar}
              alt="avatar"
              style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;utf8,\
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">\
  <circle cx="16" cy="16" r="16" fill="%23ddd"/>\
  <circle cx="16" cy="12" r="6" fill="%23bbb"/>\
  <path d="M4 28c2.5-6 9-8 12-8s9.5 2 12 8" fill="%23bbb"/>\
</svg>';
              }}
            />
          ) : (
            <UserOutlined />
          )}
          <span>{name}</span>
          {record.id === currentUser?.id && <span style={{ fontSize: 12, color: '#999' }}>(You)</span>}
        </Space>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Organization',
      dataIndex: 'organization',
      key: 'organization',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const roleColors = {
          admin: 'red',
          internal: 'blue',
          external: 'green',
        };
        return (
          <span style={{ 
            padding: '2px 8px', 
            borderRadius: 4, 
            backgroundColor: roleColors[role] + '20',
            color: roleColors[role],
            fontSize: 12,
            fontWeight: 500,
          }}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete user"
            description="Are you sure you want to delete this user?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={record.id === currentUser?.id}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={record.id === currentUser?.id}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 250px', minWidth: 0 }}>
            <Title level={4} style={{ margin: 0 }}>User Management</Title>
            <Paragraph type="secondary" style={{ marginTop: 4 }}>
              Manage system users, roles, and permissions
            </Paragraph>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={{ flexShrink: 0 }}
          >
            Add User
          </Button>
        </div>

        <div style={{ marginTop: 24 }}>
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>
      </div>

      <Modal
        title={editingUser ? 'Edit User' : 'Add New User'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText={editingUser ? 'Update' : 'Add'}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            name="title"
            label="Title"
          >
            <Input placeholder="e.g., Case Worker" />
          </Form.Item>

          <Form.Item
            name="organization"
            label="Organization"
          >
            <Input placeholder="e.g., HLP" />
          </Form.Item>

          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: !editingUser, message: 'Please enter password' }]}
          >
            <Input.Password placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'} />
          </Form.Item>

          <Form.Item
            name="avatar"
            label="Avatar URL"
            tooltip="Optional: link to a profile image"
            rules={[
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    const u = new URL(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('Please enter a valid URL'));
                  }
                },
              },
            ]}
          >
            <Input placeholder="https://example.com/me.jpg" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select user role">
              <Select.Option value={ROLES.ADMIN}>Admin</Select.Option>
              <Select.Option value={ROLES.INTERNAL}>Internal Project User</Select.Option>
              <Select.Option value={ROLES.EXTERNAL}>External Project User</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Admin;
